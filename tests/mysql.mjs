/*
 * Fase 12 · prueba contra MySQL/MariaDB (no forma parte de `npm test`):
 *
 *   npm run test:mysql                                    (con Docker: levanta mariadb:11 temporal)
 *   MYSQL_TEST_URL=mysql://root:clave@127.0.0.1:3306 npm run test:mysql   (servidor propio)
 *
 * Sobre bases temporales `ficotox_prueba_<aleatorio>` (se crean y se eliminan al final;
 * el usuario necesita CREATE/DROP DATABASE; nunca toca otra base):
 * 1. base vacia: se aplican todas las migraciones; tablas, columnas y triggers iguales al esquema esperado;
 * 2. volver a migrar no hace nada; el checksum y el bloqueo quedan registrados;
 * 3. bitacora: entradas selladas por "sistema", cadena integra, triggers que impiden UPDATE/DELETE;
 * 4. dos procesos migrando a la vez: solo uno aplica;
 * 5. sqlite-a-mysql de una base con migraciones;
 * 6. el servidor standalone arranca con DATABASE_URL y responde /api/health/db (si hay build);
 * 7. concurrencia por la API sobre MySQL (base de prueba pasada con sqlite-a-mysql): 30 incidencias
 *    y 10 cadenas de muestra simultaneas (folios unicos y consecutivos, sin 500), suspensiones
 *    simultaneas y la bitacora integra. Las suites de API completas leen la base SQLite
 *    directamente para verificar, por eso no se corren contra MySQL.
 * Sin Docker ni MYSQL_TEST_URL sale con codigo 2 y lo dice: NO se probo.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");
const Sqlite = require("better-sqlite3");
const M = await import("../src/lib/server/migraciones/motor.mjs");
const { evaluarCadena } = await import("../src/lib/shared/audit-chain.mjs");

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${String(detail).slice(0, 220)}` : ""}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const puertoLibre = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });

/* ---------- Servidor MySQL ---------- */
let url = process.env.MYSQL_TEST_URL || "";
let contenedor = null;
if (!url) {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
    console.error("NO SE PROBÓ MySQL/MariaDB: no hay Docker disponible ni MYSQL_TEST_URL.\nDefine MYSQL_TEST_URL=mysql://usuario:clave@host:3306 (usuario con CREATE/DROP DATABASE) o instala Docker y repite.");
    process.exit(2);
  }
  const puerto = await puertoLibre();
  const clave = randomBytes(12).toString("hex");
  const imagen = process.env.MYSQL_TEST_IMAGEN || "mariadb:11";
  const r = spawnSync("docker", ["run", "-d", "--rm", "-e", `MARIADB_ROOT_PASSWORD=${clave}`, "-e", `MYSQL_ROOT_PASSWORD=${clave}`, "-p", `127.0.0.1:${puerto}:3306`, imagen], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`No se pudo levantar ${imagen}: ${r.stderr}`);
    process.exit(2);
  }
  contenedor = r.stdout.trim();
  url = `mysql://root:${clave}@127.0.0.1:${puerto}`;
  console.log(`(Docker: ${imagen} en 127.0.0.1:${puerto})`);
}
const destino = new URL(url.replace(/^mariadb:/, "mysql:"));
const conectar = (database) => mysql.createConnection({ host: destino.hostname, port: Number(destino.port || 3306), user: decodeURIComponent(destino.username), password: decodeURIComponent(destino.password), database, charset: "utf8mb4", timezone: "Z", multipleStatements: false });
let admin = null;
for (let i = 0; i < 60 && !admin; i += 1) {
  try {
    admin = await conectar(undefined);
  } catch {
    await esperar(1000);
  }
}
if (!admin) {
  console.error("No se pudo conectar al servidor MySQL/MariaDB.");
  process.exit(2);
}
const [[{ v: versionServidor }]] = await admin.query("SELECT VERSION() AS v");
console.log(`Servidor: ${versionServidor}`);
const bases = [];
const baseNueva = async () => {
  const nombre = `ficotox_prueba_${randomBytes(4).toString("hex")}`;
  await admin.query(`CREATE DATABASE \`${nombre}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  bases.push(nombre);
  return nombre;
};
const CLAVE = "clave-de-prueba-mysql-0123456789abcdef0123456789";

try {
  /* 1-2. Migraciones en base vacia */
  const b1 = await baseNueva();
  const c1 = await conectar(b1);
  await c1.query("SET time_zone = '+00:00'");
  const db1 = M.adaptadorMysql(c1);
  const r1 = await M.aplicarMigraciones(db1, { Sqlite, clave: CLAVE, appCommit: "prueba" });
  const actual = await M.esquemaDe(db1);
  const esperado = await M.esquemaEsperado(Sqlite, M.VERSION_ACTUAL, "mysql");
  const dif = M.diferencias(esperado, actual);
  check("base MySQL vacía: se aplican todas las migraciones y el esquema coincide (tablas, columnas, triggers)", r1.aplicadas.map((m) => m.version).join() === M.MIGRACIONES.map((m) => m.version).join() && dif.length === 0, dif.slice(0, 5).join("; ") || r1.aplicadas.map((m) => m.version).join(","));
  const r2 = await M.aplicarMigraciones(db1, { Sqlite, clave: CLAVE, appCommit: "prueba" });
  const registradas = await db1.all("SELECT version, checksum FROM schema_migraciones ORDER BY version");
  check("volver a migrar no hace nada; cada migración queda con su checksum", r2.aplicadas.length === 0 && registradas.every((x) => x.checksum === M.checksumDe(M.MIGRACIONES.find((m) => m.version === Number(x.version)))), JSON.stringify(registradas.map((x) => x.version)));

  /* 3. Bitacora */
  const filas = await db1.all("SELECT * FROM auditoria ORDER BY id");
  const ultimo = (await db1.get("SELECT AUTO_INCREMENT - 1 AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria'"))?.n;
  const triggers = (await db1.get("SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'auditoria'")).n;
  // Las filas de MySQL traen fechas como texto (se guardan como VARCHAR): el sello se verifica igual que en SQLite.
  const cadena = evaluarCadena(filas, CLAVE, ultimo === null || ultimo === undefined ? null : Number(ultimo), Number(triggers));
  check("bitácora: una entrada por migración, por «sistema», con la cadena íntegra", cadena.ok && filas.length === M.MIGRACIONES.length && filas.every((f) => f.usuario_nombre === "sistema"), JSON.stringify(cadena));
  let update = null;
  let borrar = null;
  try {
    await c1.query("UPDATE auditoria SET motivo = 'x' WHERE id = 1");
  } catch (error) {
    update = error.message;
  }
  try {
    await c1.query("DELETE FROM auditoria WHERE id = 1");
  } catch (error) {
    borrar = error.message;
  }
  check("los triggers impiden UPDATE y DELETE en la bitácora", /inmutable/i.test(update || "") && /inmutable/i.test(borrar || ""), `${update} | ${borrar}`);
  await c1.end();

  /* 4. Dos procesos a la vez */
  const b2 = await baseNueva();
  const script = `
    const M = await import(${JSON.stringify(path.join(root, "src/lib/server/migraciones/motor.mjs"))});
    const mysql = (await import("mysql2/promise")).default;
    const Sqlite = (await import("better-sqlite3")).default;
    const c = await mysql.createConnection({ host: ${JSON.stringify(destino.hostname)}, port: ${Number(destino.port || 3306)}, user: ${JSON.stringify(decodeURIComponent(destino.username))}, password: ${JSON.stringify(decodeURIComponent(destino.password))}, database: ${JSON.stringify(b2)}, timezone: "Z" });
    const r = await M.aplicarMigraciones(M.adaptadorMysql(c), { Sqlite, clave: ${JSON.stringify(CLAVE)}, appCommit: "prueba", esperaMs: 60000 });
    console.log("APLICADAS=" + r.aplicadas.length);
    await c.end();`;
  const correr = () =>
    new Promise((resolve) => {
      const h = spawn(process.execPath, ["--input-type=module", "-e", script], { cwd: root });
      let out = "";
      h.stdout.on("data", (d) => (out += d));
      h.stderr.on("data", (d) => (out += d));
      h.on("exit", (code) => resolve({ code, out }));
    });
  const [p1, p2] = await Promise.all([correr(), correr()]);
  const n = [p1, p2].map((p) => Number((p.out.match(/APLICADAS=(\d+)/) || [])[1] ?? -1));
  const c2 = await conectar(b2);
  const [[{ total }]] = await c2.query("SELECT COUNT(*) AS total FROM schema_migraciones");
  await c2.end();
  check("dos procesos migrando la misma base MySQL a la vez: solo uno aplica, el otro la encuentra al día", p1.code === 0 && p2.code === 0 && n.sort().join() === `0,${M.MIGRACIONES.length}` && Number(total) === M.MIGRACIONES.length, `${n.join(",")} ${p1.out.slice(-120)} ${p2.out.slice(-120)}`);

  /* 5. Paso de una base SQLite a MySQL (npm run sqlite-a-mysql) */
  {
    const dir = path.join(root, "instance/test/mysql-paso");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const archivo = path.join(dir, "ficotox.sqlite3");
    const conexion = new Sqlite(archivo);
    await M.aplicarMigraciones(M.adaptadorSqlite(conexion), { Sqlite, clave: CLAVE, appCommit: "prueba" });
    conexion.close();
    const b4 = await baseNueva();
    const env = { ...process.env, FICOTOX_ENV_FILE: path.join(dir, "no-existe.env"), SQLITE_PATH: archivo, FICOTOX_INSTANCE_DIR: dir, SECRET_KEY: CLAVE, DATABASE_URL: "" };
    const r = spawnSync(process.execPath, [path.join(root, "scripts/sqlite-a-mysql.mjs"), "--destino", `${url.replace(/\/$/, "")}/${b4}`, "--confirmar"], { cwd: root, encoding: "utf8", env });
    const c4 = await conectar(b4);
    const [[{ n }]] = await c4.query("SELECT COUNT(*) AS n FROM auditoria");
    await c4.end();
    check("sqlite-a-mysql: copia una base SQLite a MySQL con conteos iguales y la bitácora íntegra (+1 entrada de constancia)", r.status === 0 && Number(n) === M.MIGRACIONES.length + 1, `${r.status} ${(r.stdout + r.stderr).trim().split("\n").slice(-2).join(" ")}`);
  }

  /* 6. Servidor con DATABASE_URL */
  if (!fs.existsSync(path.join(root, ".next/standalone/server.js"))) console.log("(sin build standalone: se omite el arranque del servidor con MySQL)");
  else {
    const b3 = await baseNueva();
    const puerto = await puertoLibre();
    const dir = path.join(root, "instance/test/mysql");
    fs.mkdirSync(dir, { recursive: true });
    const hijo = spawn(process.execPath, [path.join(root, "scripts/start-ficotox.mjs")], { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, FICOTOX_ENV_FILE: path.join(dir, "no-existe.env"), DATABASE_URL: `${url.replace(/\/$/, "")}/${b3}`, SQLITE_PATH: "", FICOTOX_INSTANCE_DIR: dir, PORT: String(puerto), HOST: "127.0.0.1", JWT_SECRET: randomBytes(32).toString("hex"), SECRET_KEY: CLAVE, FICOTOX_OPEN_BROWSER: "false", MIGRAR_MYSQL_RESPALDO_HECHO: "true" } });
    let salida = "";
    hijo.stdout.on("data", (d) => (salida += d));
    hijo.stderr.on("data", (d) => (salida += d));
    let salud = null;
    for (let i = 0; i < 120 && !salud; i += 1) {
      try {
        const r = await fetch(`http://127.0.0.1:${puerto}/api/health/db`);
        if (r.ok) salud = await r.json();
      } catch {
        await esperar(500);
      }
    }
    try {
      process.kill(-hijo.pid, "SIGTERM");
    } catch {
      /* ya termino */
    }
    check("el servidor standalone arranca sobre MySQL (migra al arrancar) y responde /api/health/db", salud?.ok === true && salud.archivo === "mysql", salud ? JSON.stringify(salud) : salida.slice(-300));
  }
  /* 7. Concurrencia por la API sobre MySQL: la base de prueba pasada a MySQL y altas simultaneas */
  if (fs.existsSync(path.join(root, ".next/standalone/server.js"))) {
    const dir = path.join(root, "instance/test/mysql-api");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    process.env.TEST_DB = path.join(dir, "ficotox-mysql-api.sqlite3");
    const { resetTestDb, QA_USER, FIXTURE } = await import("./reset-test-db.mjs");
    if (!fs.existsSync(FIXTURE)) await (await import("./build-fixture.mjs")).buildFixture();
    resetTestDb();
    // Llave con que se sello la base de prueba: SECRET_KEY del .env del proyecto o la auditoria.key copiada junto a ella.
    const llaveEnv = (() => {
      try {
        const l = fs.readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/).find((x) => /^\s*SECRET_KEY\s*=/.test(x));
        const v = l ? l.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : "";
        return v && v !== "ficotox-dev-secret" ? v : "";
      } catch {
        return "";
      }
    })();
    const llave = llaveEnv || fs.readFileSync(path.join(dir, "auditoria.key"), "utf8").trim();
    const b5 = await baseNueva();
    const destinoApi = `${url.replace(/\/$/, "")}/${b5}`;
    const paso = spawnSync(process.execPath, [path.join(root, "scripts/sqlite-a-mysql.mjs"), "--destino", destinoApi, "--confirmar"], { cwd: root, encoding: "utf8", env: { ...process.env, FICOTOX_ENV_FILE: path.join(dir, "no-existe.env"), SQLITE_PATH: process.env.TEST_DB, FICOTOX_INSTANCE_DIR: dir, SECRET_KEY: llave, DATABASE_URL: "" } });
    const puerto = await puertoLibre();
    const hijo = spawn(process.execPath, [path.join(root, "scripts/start-ficotox.mjs")], { cwd: root, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, FICOTOX_ENV_FILE: path.join(dir, "no-existe.env"), DATABASE_URL: destinoApi, SQLITE_PATH: "", FICOTOX_INSTANCE_DIR: path.join(dir, "instancia"), PORT: String(puerto), HOST: "127.0.0.1", JWT_SECRET: randomBytes(32).toString("hex"), SECRET_KEY: llave, FICOTOX_OPEN_BROWSER: "false", MIGRAR_MYSQL_RESPALDO_HECHO: "true", AUTORIZACIONES_OBLIGATORIAS: "false", EVIDENCIA_OBLIGATORIA_ANALISIS: "false" } });
    let salida = "";
    hijo.stdout.on("data", (d) => (salida += d));
    hijo.stderr.on("data", (d) => (salida += d));
    const base = `http://127.0.0.1:${puerto}/api`;
    const api = async (method, ruta, body, token) => {
      try {
        const r = await fetch(`${base}${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: r.status, data: await r.json().catch(() => null) };
      } catch (error) {
        return { status: 599, data: { message: error.message } };
      }
    };
    for (let i = 0; i < 120; i += 1) {
      if ((await api("GET", "/health/db")).status === 200) break;
      await esperar(500);
    }
    try {
      const qa = (await api("POST", "/auth/login", QA_USER)).data?.token;
      check("sqlite-a-mysql de la base de prueba y servidor sobre MySQL con sesión de QA", paso.status === 0 && !!qa, `${paso.status} ${(paso.stdout + paso.stderr).trim().split("\n").pop()}`);
      const c = await conectar(b5);
      const maxFolio = async (tabla, where = "") => Number((await c.query(`SELECT COALESCE(MAX(folio_num), 0) AS n FROM ${tabla}${where}`))[0][0].n);
      const folios = async (tabla, desde, where = "") => (await c.query(`SELECT folio_num AS f FROM ${tabla} WHERE folio_num > ?${where} ORDER BY folio_num`, [desde]))[0].map((x) => Number(x.f));
      const consecutivos = (lista, desde) => lista.every((f, i) => f === desde + i + 1);

      const antesInc = await maxFolio("incidencias");
      const inc = await Promise.all(Array.from({ length: 30 }, (_, i) => api("POST", "/calidad/incidencias", { tipo: "otro", fecha_hora_ocurrencia: new Date().toISOString(), descripcion: `Alta simultánea en MySQL número ${i}`, impacto_resultados: "no", accion_inmediata: "Ninguna" }, qa)));
      const fInc = await folios("incidencias", antesInc);
      check("MySQL: 30 incidencias simultáneas: sin 500, folios únicos y consecutivos (reintento por folio duplicado)", !inc.some((r) => r.status >= 500) && fInc.length === inc.filter((r) => r.status === 201).length && fInc.length >= 25 && consecutivos(fInc, antesInc), `${[...new Set(inc.map((r) => r.status))].join(",")} ${fInc.length}`);

      const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
      const antesR = await maxFolio("muestras_recepcion");
      const antesE = await maxFolio("muestras_extraccion", " WHERE tipo_registro = 'E-D'");
      const cadenas = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const idInt = `MYSQL-${i}-${Date.now().toString(36)}`;
          const R = await api("POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "09:00", recibido_por: "QA", medio_recepcion: "directa", solicitante: `Cliente ${i}`, muestra_unica: true, id_interno: idInt, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-20", responsable: "QA", comunicacion_cliente: { medio: "correo", fecha: "2026-09-20", persona: "Cliente", respuesta: "Continuar" } } }, qa);
          const P = await api("POST", "/samples/processing", { recepcion_id: R.data?.id, muestra_tipo: "unica", id_interno: idInt, fecha_procesamiento: "2026-09-20", tipo_organismo: ["bivalvos"], nombre_quien_proceso: "Persona A", nombre_quien_superviso: "Persona B" }, qa);
          const E = await api("POST", "/samples/extraction", { tipo_registro: "E-D", procesamiento_id: P.data?.id, tipo_molienda: "fresca", id_interno: idInt, fecha_extraccion: "2026-09-20", registro_pesos: [{ id_muestra: idInt, replica: `${idInt}_R1`, peso_muestra: 2.01 }], nombre_quien_extrajo: "Persona A", nombre_quien_superviso: "Persona B" }, qa);
          return [R.status, P.status, E.status];
        }),
      );
      const fR = await folios("muestras_recepcion", antesR);
      const fE = await folios("muestras_extraccion", antesE, " AND tipo_registro = 'E-D'");
      check("MySQL: 10 cadenas simultáneas (recepción, procesamiento, extracción E-D): sin 500 ni 409 de folio; folios consecutivos", cadenas.flat().every((st) => st === 201) && fR.length === 10 && consecutivos(fR, antesR) && fE.length === 10 && consecutivos(fE, antesE), JSON.stringify(cadenas));

      const ricardo = (await c.query("SELECT id FROM usuarios WHERE email = 'ricardo.medina@ficotox.local'"))[0][0]?.id;
      const [n1, n2] = await Promise.all([1, 2].map((n) => api("POST", "/calidad/nc", { origen: "otro", descripcion: `NC ${n} de la prueba de suspensiones en MySQL`, clasificacion: "mayor", responsable_id: ricardo }, qa)));
      const susp = await Promise.all([n1, n2, n1].map((n, i) => api("POST", `/calidad/nc/${n.data?.id}/suspensiones`, { tipo: "metodo", clave: "PSP", motivo: `Suspensión simultánea ${i}` }, qa)));
      const activas = Number((await c.query("SELECT COUNT(*) AS n FROM suspensiones WHERE tipo = 'metodo' AND clave = 'PSP' AND reanudada_en IS NULL"))[0][0].n);
      check("MySQL: suspensiones simultáneas del mismo método (dos NC y la misma dos veces): 201, 201, 409; sin 500 (orden de bloqueo y reintento por interbloqueo)", susp.map((r) => r.status).sort().join() === "201,201,409" && activas === 2, susp.map((r) => r.status).join(","));
      const verif = (await api("GET", "/audit/verify", undefined, qa)).data;
      check("MySQL: bitácora íntegra tras la concurrencia", verif?.ok === true, JSON.stringify(verif || {}).slice(0, 160));
      await c.end();
    } finally {
      try {
        process.kill(-hijo.pid, "SIGTERM");
      } catch {
        /* ya termino */
      }
      if (/Error interno|\[api\][^\n]*Error/.test(salida)) console.log(salida.slice(-1500));
    }
  }
} catch (error) {
  check("prueba de MySQL sin excepciones", false, error.stack || error.message);
} finally {
  for (const b of bases) await admin.query(`DROP DATABASE IF EXISTS \`${b}\``).catch(() => {});
  await admin.end().catch(() => {});
  if (contenedor) spawnSync("docker", ["stop", contenedor], { stdio: "ignore" });
}
const ok = results.filter(Boolean).length;
console.log(`\n${ok}/${results.length} pasos OK (MySQL/MariaDB ${versionServidor})`);
process.exit(ok === results.length ? 0 : 1);
