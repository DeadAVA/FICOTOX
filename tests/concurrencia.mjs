/*
 * Fase 12 · folios y bitacora con DOS procesos sobre la misma base SQLite.
 *
 * Dentro de un proceso las sesiones SQLite van en serie; entre procesos no: dos
 * servidores standalone (scripts/start-ficotox.mjs) sobre la misma copia de la
 * base de prueba (instance/test/concurrencia/, nunca la real) reciben altas
 * simultaneas. Asi se ejercita el camino real de los reintentos (SQLITE_BUSY*,
 * folio duplicado): ningun 500, folios unicos y consecutivos, y la cadena de la
 * bitacora integra (cada entrada encadena a la anterior aunque la escriba el otro proceso).
 * Requiere el build (npm run build); sin build se omite.
 */
import "./lib/reauth-auto.mjs";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Sqlite = require("better-sqlite3");
const { evaluarCadena, resolverClaveSello } = await import("../src/lib/shared/audit-chain.mjs");
if (!fs.existsSync(path.join(root, ".next/standalone/server.js"))) {
  console.log("(sin build standalone: prueba omitida; ejecuta npm run build)");
  process.exit(0);
}
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const DIR = path.join(root, "instance/test/concurrencia");
const DB = path.join(DIR, "ficotox-concurrencia.sqlite3");
fs.rmSync(DIR, { recursive: true, force: true });
process.env.TEST_DB = DB;
const { resetTestDb, CREDENCIALES, QA_USER } = await import("./reset-test-db.mjs");
resetTestDb();
const credenciales = JSON.parse(fs.readFileSync(CREDENCIALES, "utf8"));
// Misma llave con que se sello la base de prueba: la SECRET_KEY del .env del proyecto (como en npm test)
// o, sin ella, la auditoria.key que reset-test-db copio junto a la base. Los dos servidores la reciben explicita.
const SECRET = (() => {
  try {
    const linea = fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/).find((l) => /^\s*SECRET_KEY\s*=/.test(l));
    const valor = linea ? linea.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
    if (valor && valor !== "ficotox-dev-secret") return valor;
  } catch {
    /* sin .env */
  }
  try {
    return fs.readFileSync(path.join(DIR, "auditoria.key"), "utf8").trim();
  } catch {
    return "";
  }
})();
const JWT = randomBytes(32).toString("hex");
const puertoLibre = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });

const servidores = [];
const arrancar = async (n) => {
  const puerto = await puertoLibre();
  const dir = path.join(DIR, `servidor-${n}`);
  fs.mkdirSync(dir, { recursive: true });
  const hijo = spawn(process.execPath, [path.join(root, "scripts/start-ficotox.mjs")], {
    cwd: root,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    // Cada servidor con su carpeta de instancia (servidor.lock, logs) y la MISMA base.
    env: { ...process.env, FICOTOX_ENV_FILE: path.join(DIR, "no-existe.env"), SQLITE_PATH: DB, FICOTOX_INSTANCE_DIR: dir, FICOTOX_BACKUP_DIR: path.join(DIR, "backups"), PORT: String(puerto), HOST: "127.0.0.1", JWT_SECRET: JWT, SECRET_KEY: SECRET, FICOTOX_OPEN_BROWSER: "false", AUTORIZACIONES_OBLIGATORIAS: "false" },
  });
  let salida = "";
  hijo.stdout.on("data", (d) => (salida += d));
  hijo.stderr.on("data", (d) => (salida += d));
  const base = `http://127.0.0.1:${puerto}/api`;
  for (let i = 0; i < 240; i += 1) {
    try {
      if ((await fetch(`${base}/health/db`)).ok) break;
    } catch {
      /* arrancando */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  servidores.push({ hijo, base, salida: () => salida });
  return base;
};
const detener = () => {
  for (const s of servidores) {
    try {
      process.kill(-s.hijo.pid, "SIGTERM");
    } catch {
      /* ya termino */
    }
  }
};
process.on("exit", detener);

try {
  const A = await arrancar(1);
  const B = await arrancar(2);
  const api = async (base, method, ruta, body, token) => {
    try {
      const res = await fetch(`${base}${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: res.status, data: await res.json().catch(() => null) };
    } catch (error) {
      return { status: 599, data: { message: error.message } };
    }
  };
  const token = async (base, email, password) => (await api(base, "POST", "/auth/login", { email, password })).data?.token;
  const personas = ["luis.castro@ficotox.local", "mariana.delgado@ficotox.local", "ricardo.medina@ficotox.local", "diego.salinas@ficotox.local"];
  // El mismo JWT sirve en ambos servidores (mismo JWT_SECRET, misma base).
  const tokens = [await token(A, QA_USER.email, QA_USER.password), ...(await Promise.all(personas.map((e) => token(B, e, credenciales[e]))))];
  check("dos servidores standalone sobre la misma base responden y aceptan sesiones", tokens.every(Boolean), `${A} ${B}`);

  const db = () => new Sqlite(DB, { readonly: true });
  const maxFolio = (tabla) => {
    const c = db();
    try {
      return Number(c.prepare(`SELECT COALESCE(MAX(folio_num), 0) AS n FROM ${tabla}`).get().n);
    } finally {
      c.close();
    }
  };
  const antesInc = maxFolio("incidencias");
  const t0 = performance.now();
  const altas = await Promise.all(
    Array.from({ length: 60 }, (_, i) =>
      api(i % 2 ? B : A, "POST", "/calidad/incidencias", { tipo: "otro", fecha_hora_ocurrencia: new Date().toISOString(), descripcion: `Alta simultánea entre procesos ${i}`, impacto_resultados: "no", accion_inmediata: "Ninguna" }, tokens[i % tokens.length]),
    ),
  );
  const ms = Math.round(performance.now() - t0);
  const estados = altas.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
  const c = db();
  const folios = c.prepare("SELECT folio_num FROM incidencias WHERE folio_num > ? ORDER BY folio_num").all(antesInc).map((f) => Number(f.folio_num));
  c.close();
  const creadas = altas.filter((r) => r.status === 201).length;
  const conflictos = altas.filter((r) => r.data?.codigo === "conflicto_concurrencia").length;
  check(
    "60 incidencias simultáneas repartidas en DOS procesos: ningún 500; las creadas tienen folios únicos y consecutivos (los conflictos agotados son 409 limpios)",
    !altas.some((r) => r.status >= 500) && creadas + conflictos === 60 && folios.length === creadas && new Set(folios).size === folios.length && folios.every((f, i) => f === antesInc + i + 1) && creadas >= 50,
    `${JSON.stringify(estados)} en ${ms} ms; folios ${folios[0]}…${folios.at(-1)}; 409 conflicto: ${conflictos}`,
  );

  const antesRec = maxFolio("muestras_recepcion");
  const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
  const recs = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      api(i % 2 ? B : A, "POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "09:00", recibido_por: "QA", medio_recepcion: "directa", solicitante: `Cliente ${i}`, muestra_unica: true, id_interno: `CONC-${i}-${Date.now().toString(36)}`, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-20", responsable: "QA", comunicacion_cliente: { medio: "correo", fecha: "2026-09-20", persona: "Cliente", respuesta: "Continuar" } } }, tokens[0]),
    ),
  );
  const c2 = db();
  const recFolios = c2.prepare("SELECT folio_num FROM muestras_recepcion WHERE folio_num > ? ORDER BY folio_num").all(antesRec).map((f) => Number(f.folio_num));
  c2.close();
  check("16 recepciones simultáneas en dos procesos: ningún 500; folios únicos y consecutivos", !recs.some((r) => r.status >= 500) && recFolios.length === recs.filter((r) => r.status === 201).length && recFolios.every((f, i) => f === antesRec + i + 1), `${recs.map((r) => r.status).join(",")} folios ${recFolios.join(",")}`);

  // Bitacora: una sola cadena aunque escriban los dos procesos.
  const c3 = new Sqlite(DB, { readonly: true });
  const clave = SECRET || resolverClaveSello("", DIR);
  const filas = c3.prepare("SELECT * FROM auditoria ORDER BY id").all();
  const seq = c3.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'auditoria'").get();
  const cadena = evaluarCadena(filas, clave, seq ? Number(seq.seq) : null, 2);
  c3.close();
  check("la bitácora sigue íntegra (cada entrada encadena a la anterior, sin huecos) con dos procesos escribiendo", cadena.ok, JSON.stringify(cadena));
  const quinientos = servidores.map((s) => (s.salida().match(/Error interno|\[api\][^\n]*Error/g) || []).length);
  const reintentos = servidores.map((s) => (s.salida().match(/\[api\] reintento/g) || []).length);
  check("los registros de ambos servidores no tienen errores internos", quinientos.every((n) => n === 0), `errores ${quinientos.join(",")}; reintentos por concurrencia ${reintentos.join(",")}`);
} finally {
  detener();
}
const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} pasos OK`);
process.exit(ok === results.length ? 0 : 1);
