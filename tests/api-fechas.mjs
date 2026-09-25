/*
 * Fechas de extremo a extremo (Fase 3). El corredor ejecuta esta suite dos
 * veces: --fase=1 con el servidor en TZ=America/Tijuana (crea los registros) y
 * --fase=2 tras reiniciarlo en TZ=UTC (vuelve a leer los mismos registros).
 * La misma fecha debe verse igual en la lista, la ficha, el PDF, la bitacora y
 * el CSV, sin el corrimiento de un dia de `new Date("AAAA-MM-DD")`.
 */
import "./lib/reauth-auto.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const BASE = process.env.BASE || "http://localhost:3100/api";
const FASE = (process.argv.find((a) => a.startsWith("--fase=")) || "--fase=1").slice(7);
const credenciales = JSON.parse(readFileSync(process.env.CREDENCIALES_ROLES, "utf8"));
const IDS_FILE = path.join(path.dirname(process.env.TEST_DB_PATH), "fechas-ids.json");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  [fase ${FASE}] ${name}${detail ? ` — ${String(detail).slice(0, 300)}` : ""}`);
};
async function api(method, ruta, body, token) {
  const res = await fetch(`${BASE}${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json().catch(() => null) : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data };
}
const login = async (email, password) => (await api("POST", "/auth/login", { email, password })).data?.token;
function textoPdf(buffer) {
  if (!Buffer.isBuffer(buffer)) return "";
  const raw = buffer.toString("latin1");
  let out = "";
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    try {
      const contenido = zlib.inflateSync(buffer.subarray(start, end)).toString("latin1");
      for (const hex of contenido.matchAll(/<([0-9a-fA-F]+)>/g)) out += Buffer.from(hex[1], "hex").toString("latin1");
    } catch {
      /* stream no comprimido */
    }
  }
  return out;
}

const QA = await login("qa@ficotox.local", "QaFicotox2026!");
const tR = await login("ricardo.medina@ficotox.local", credenciales["ricardo.medina@ficotox.local"]);

/* Fechas de prueba: justo en el borde donde UTC y Ensenada caen en dias distintos. */
const RECIBIDA = "2026-09-07";
const EMITIDO = "2026-09-10";
const ENTREGADO = "2026-09-09";

let ids;
if (FASE === "1") {
  const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
  const idInterno = `FECHAS-${Date.now()}`;
  const R = (await api("POST", "/samples/reception", { fecha_recepcion: RECIBIDA, hora_recepcion: "23:30", recibido_por: "QA", medio_recepcion: "directa", solicitante: "Cliente fechas", muestra_unica: true, id_interno: idInterno, fecha_muestra: "2026-09-06", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: RECIBIDA, responsable: "QA" } }, QA)).data?.id;
  const P = (await api("POST", "/samples/processing", { recepcion_id: R, muestra_tipo: "unica", id_interno: idInterno, fecha_procesamiento: RECIBIDA, tipo_organismo: ["bivalvos"], nombre_quien_proceso: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const E = (await api("POST", "/samples/extraction", { tipo_registro: "E-D", procesamiento_id: P, tipo_molienda: "fresca", id_interno: idInterno, fecha_extraccion: RECIBIDA, registro_pesos: [{ id_muestra: idInterno, replica: `${idInterno}_R1`, peso_muestra: 2.01 }], nombre_quien_extrajo: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const A = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: E, fecha_analisis: "2026-09-08", analista_nombre: "QA", resultados: [{ id_muestra: idInterno, resultado: 50, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }] }, QA)).data?.id;
  await api("POST", `/samples/analysis/${A}/revisar`, {}, tR);
  await api("POST", `/samples/analysis/${A}/aprobar`, {}, tR);
  const inf = (await api("POST", "/informes", { recepcion_id: R, analisis_ids: [A], fecha_emision: EMITIDO, cliente: { nombre: "Cliente fechas" } }, QA)).data?.id;
  await api("POST", `/informes/${inf}/revisar`, {}, tR);
  const aut = await api("POST", `/informes/${inf}/autorizar`, { fecha_emision: EMITIDO }, tR);
  const ent = await api("POST", `/informes/${inf}/entregar`, { fecha: ENTREGADO, medio: "correo", a_quien: "Cliente fechas" }, tR);
  // Un borrador aparte: su PDF (vista previa) se genera al vuelo, tambien en la fase 2.
  const borrador = (await api("POST", "/informes", { recepcion_id: R, analisis_ids: [A], fecha_emision: EMITIDO, cliente: { nombre: "Cliente fechas" } }, QA)).data?.id;
  ids = { R, A, inf, borrador, idInterno };
  writeFileSync(IDS_FILE, JSON.stringify(ids));
  check("datos: recepcion, analisis, informe autorizado y entregado, borrador", !!(R && A && inf && borrador) && aut.status === 200 && ent.status === 200, `${aut.status} ${aut.data?.message} ${ent.status} ${ent.data?.message}`);
} else {
  ids = existsSync(IDS_FILE) ? JSON.parse(readFileSync(IDS_FILE, "utf8")) : {};
  check("se leen los registros creados con el servidor en otra zona horaria", !!ids.R);
}

const lista = (await api("GET", `/samples/reception?search=${encodeURIComponent(ids.idInterno)}`, undefined, QA)).data?.items || [];
const ficha = (await api("GET", `/samples/reception/${ids.R}`, undefined, QA)).data?.item;
check("recepcion: lista y ficha dan la misma fecha (2026-09-07)", lista[0]?.fecha_recepcion === RECIBIDA && ficha?.fecha_recepcion === RECIBIDA, `${lista[0]?.fecha_recepcion} ${ficha?.fecha_recepcion}`);
const informes = (await api("GET", `/informes?recepcion_id=${ids.R}`, undefined, QA)).data?.items || [];
const informe = informes.find((i) => i.id === ids.inf);
check("informe: la lista trae emitido 2026-09-10 y entregado 2026-09-09", informe?.fecha_emision === EMITIDO && informe?.entrega?.fecha === ENTREGADO, `${informe?.fecha_emision} ${informe?.entrega?.fecha}`);
const pdf = textoPdf((await api("GET", `/informes/${ids.inf}/pdf`, undefined, QA)).data);
check("PDF autorizado: recepcion 07/09/2026 y emision 10/09/2026", pdf.includes("07/09/2026") && pdf.includes("10/09/2026"), pdf.slice(0, 160));
const preview = textoPdf((await api("GET", `/informes/${ids.borrador}/pdf`, undefined, QA)).data);
check("PDF generado ahora (vista previa del borrador): mismas fechas", preview.includes("07/09/2026") && preview.includes("10/09/2026"), preview.slice(0, 160));
const bitacora = (await api("GET", `/audit?entidad=muestras_recepcion&entidad_id=${ids.R}`, undefined, QA)).data?.items || [];
const crear = bitacora.find((e) => e.accion === "crear");
const entrada = (await api("GET", `/audit/${crear?.id}`, undefined, QA)).data?.item;
check("bitacora: los datos guardados conservan 2026-09-07", entrada?.datos_nuevos?.fecha_recepcion === RECIBIDA, `${entrada?.datos_nuevos?.fecha_recepcion}`);
const csv = await (await fetch(`${BASE}/admin/accesos?formato=csv&seccion=cuentas`, { headers: { Authorization: `Bearer ${QA}` } })).text();
const dbHasta = (() => {
  const Database = createRequire(import.meta.url)(process.env.BETTER_SQLITE3 || "better-sqlite3");
  const d = new Database(process.env.TEST_DB_PATH);
  try {
    return d.prepare("SELECT vigente_hasta FROM usuarios WHERE email = 'diego.salinas@ficotox.local'").get()?.vigente_hasta;
  } finally {
    d.close();
  }
})();
const esperadoCsv = dbHasta ? `${dbHasta.slice(8, 10)}/${dbHasta.slice(5, 7)}/${dbHasta.slice(0, 4)}` : "";
check("CSV de revision de accesos: la vigencia sale dd/mm/aaaa, el mismo dia que en la base", !!esperadoCsv && csv.split("\n").some((l) => l.includes("diego.salinas") && l.includes(esperadoCsv)), `${dbHasta} ${csv.split("\n").find((l) => l.includes("diego.salinas"))?.slice(0, 160)}`);

const fallidas = results.filter((r) => !r.ok);
console.log(`\n${results.length - fallidas.length}/${results.length} pruebas de fechas (servidor) pasaron`);
process.exit(fallidas.length ? 1 : 0);
