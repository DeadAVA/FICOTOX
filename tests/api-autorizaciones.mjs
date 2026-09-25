/*
 * Autorizaciones del personal (FX-THF-AP, Fase 4), contra el servidor de prueba:
 * - el Tecnico Analista extrae DSP con su autorizacion; sin el metodo, 403;
 * - equipo del inventario no autorizado en una extraccion, 403;
 * - autorizacion vencida o revocada, 403;
 * - autorizar un informe sin autorizacion_informe, 403; la Responsable General si;
 * - nadie se otorga una autorizacion a si mismo (409); el Administrador tecnico no otorga (403).
 * Las autorizaciones de ejemplo las crea el seed (scripts/seed-roles-usuarios.mjs).
 */
import "./lib/reauth-auto.mjs";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100/api";
const credenciales = JSON.parse(readFileSync(process.env.CREDENCIALES_ROLES, "utf8"));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
async function api(method, ruta, body, token, headers = {}) {
  const res = await fetch(`${BASE}${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const login = async (email, password) => (await api("POST", "/auth/login", { email, password })).data?.token;
const QA = await login("qa@ficotox.local", "QaFicotox2026!");
const RICARDO = "ricardo.medina@ficotox.local";
const PATRICIA = "patricia.luna@ficotox.local";
const LUIS = "luis.castro@ficotox.local";
const MARIANA = "mariana.delgado@ficotox.local";
const JORGE = "jorge.ramirez@ficotox.local";
const tR = await login(RICARDO, credenciales[RICARDO]);
const tP = await login(PATRICIA, credenciales[PATRICIA]);
const tL = await login(LUIS, credenciales[LUIS]);
const tM = await login(MARIANA, credenciales[MARIANA]);
const tJ = await login(JORGE, credenciales[JORGE]);
const usuarios = (await api("GET", "/admin/usuarios", undefined, QA)).data?.items || [];
const idDe = (email) => usuarios.find((u) => u.email === email)?.id;
const autorizacion = async (email, tipo, clave) => ((await api("GET", `/admin/usuarios/${idDe(email)}/autorizaciones`, undefined, QA)).data?.items || []).find((a) => a.tipo === tipo && a.clave === clave && a.estado === "vigente");
const otorgar = (email, cuerpo, token) => api("POST", `/admin/usuarios/${idDe(email)}/autorizaciones`, { folio_fx_thf_ap: "FX-THF-AP-PRUEBA", motivo: "Autorizacion de prueba", ...cuerpo }, token);
const revocar = async (email, tipo, clave, token) => api("POST", `/admin/usuarios/${idDe(email)}/autorizaciones/${(await autorizacion(email, tipo, clave))?.id}/revocar`, { motivo: "Revocacion de prueba" }, token);

const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
let n = 0;
const cadenaHastaProcesamiento = async (prefijo) => {
  const id = `${prefijo}-${Date.now()}-${(n += 1)}`;
  const R = (await api("POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "09:00", recibido_por: "QA", medio_recepcion: "directa", solicitante: "Cliente autorizaciones", muestra_unica: true, id_interno: id, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-20", responsable: "QA" } }, QA)).data?.id;
  const P = (await api("POST", "/samples/processing", { recepcion_id: R, muestra_tipo: "unica", id_interno: id, fecha_procesamiento: "2026-09-20", tipo_organismo: ["bivalvos"], nombre_quien_proceso: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  return { id, R, P };
};
const extraccion = (c, extra = {}) => ({ tipo_registro: "E-D", procesamiento_id: c.P, tipo_molienda: "fresca", id_interno: c.id, fecha_extraccion: "2026-09-20", registro_pesos: [{ id_muestra: c.id, replica: `${c.id}_R1`, peso_muestra: 2.01 }], nombre_quien_extrajo: "Luis", nombre_quien_superviso: "Ricardo", ...extra });

/* ---------- Extraccion DSP ---------- */
{
  const c1 = await cadenaHastaProcesamiento("AUT1");
  const conAut = await api("POST", "/samples/extraction", extraccion(c1), tL);
  check("el Analista extrae DSP con su autorizacion (actividad extraccion + metodo DSP)", conAut.status === 201 || conAut.status === 200, `${conAut.status} ${conAut.data?.message}`);

  const quitar = await revocar(LUIS, "metodo", "DSP", tR);
  const c2 = await cadenaHastaProcesamiento("AUT2");
  const sinMetodo = await api("POST", "/samples/extraction", extraccion(c2), tL);
  check("sin el metodo DSP (revocado) la extraccion DSP da 403 no_autorizado con lo que falta", quitar.status === 200 && sinMetodo.status === 403 && sinMetodo.data?.codigo === "no_autorizado" && /extracción DSP/.test(sinMetodo.data?.message || ""), `${quitar.status} ${sinMetodo.status} ${sinMetodo.data?.message}`);
  const devolver = await otorgar(LUIS, { tipo: "metodo", clave: "DSP" }, tR);
  check("se vuelve a otorgar el metodo DSP (201) y la revocada se conserva", devolver.status === 201, `${devolver.status} ${devolver.data?.message}`);

  // Equipo del inventario sin autorizacion.
  const equipo = (await api("POST", "/inventory/equipos", { nombre: `Equipo sin autorizar ${Date.now()}`, estado: "operativo", clave_bitacora: "FX-TCB-ZZ9-01/1" }, QA)).data;
  const c3 = await cadenaHastaProcesamiento("AUT3");
  const sinEquipo = await api("POST", "/samples/extraction", extraccion(c3, { equipos: [{ equipo_id: equipo?.id, uso: "Equipo sin autorizar" }] }), tL);
  check("equipo del inventario no autorizado en una extraccion: 403 (…para el equipo …)", sinEquipo.status === 403 && /el equipo/.test(sinEquipo.data?.message || ""), `${sinEquipo.status} ${sinEquipo.data?.message}`);
  const conEquipo = await otorgar(LUIS, { tipo: "equipo", clave: String(equipo?.id) }, tR);
  const yaConEquipo = await api("POST", "/samples/extraction", extraccion(c3, { equipos: [{ equipo_id: equipo?.id, uso: "Equipo sin autorizar" }] }), tL);
  check("con el equipo autorizado la extraccion se guarda", conEquipo.status === 201 && (yaConEquipo.status === 201 || yaConEquipo.status === 200), `${conEquipo.status} ${yaConEquipo.status} ${yaConEquipo.data?.message}`);

  // Autorizacion vencida: la Tecnico Auxiliar solo conserva una recepcion vencida.
  await revocar(MARIANA, "actividad", "recepcion", tR);
  const vencida = await otorgar(MARIANA, { tipo: "actividad", clave: "recepcion", vigente_desde: "2026-01-01", vigente_hasta: "2026-01-31" }, tR);
  const c4 = await cadenaHastaProcesamiento("AUT4");
  const conVencida = await api("POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "10:00", recibido_por: "Mariana", medio_recepcion: "directa", solicitante: "Cliente vencida", muestra_unica: true, id_interno: `${c4.id}-M`, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] } }, tM);
  check("autorizacion vencida: 403 no_autorizado", vencida.status === 201 && vencida.data?.item?.estado === "vencida" && conVencida.status === 403 && conVencida.data?.codigo === "no_autorizado", `${vencida.status} ${vencida.data?.item?.estado} ${conVencida.status} ${conVencida.data?.message}`);
  await otorgar(MARIANA, { tipo: "actividad", clave: "recepcion" }, tR);
}

/* ---------- Informe ---------- */
{
  const c = await cadenaHastaProcesamiento("AUTI");
  const E = (await api("POST", "/samples/extraction", extraccion(c, { nombre_quien_extrajo: "QA", nombre_quien_superviso: "Supervisor QA" }), QA)).data?.id;
  const A = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: E, fecha_analisis: "2026-09-20", analista_nombre: "QA", resultados: [{ id_muestra: c.id, resultado: 50, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }] }, QA)).data?.id;
  const rev = await api("POST", `/samples/analysis/${A}/revisar`, {}, tR);
  const apr = await api("POST", `/samples/analysis/${A}/aprobar`, {}, tR);
  const inf = await api("POST", "/informes", { recepcion_id: c.R, analisis_ids: [A], cliente: { nombre: "Cliente autorizaciones" } }, QA);
  const revInf = await api("POST", `/informes/${inf.data?.id}/revisar`, {}, tR);
  check("flujo normal: el Coord. Tecnico revisa y aprueba resultados y revisa el informe con sus autorizaciones", rev.status === 200 && apr.status === 200 && revInf.status === 200, `${rev.status} ${apr.status} ${inf.status} ${revInf.status} ${revInf.data?.message}`);
  const quitar = await revocar(RICARDO, "actividad", "autorizacion_informe", tP);
  const sinAut = await api("POST", `/informes/${inf.data?.id}/autorizar`, {}, tR);
  check("autorizar un informe sin autorizacion_informe: 403", quitar.status === 200 && sinAut.status === 403 && sinAut.data?.codigo === "no_autorizado", `${quitar.status} ${sinAut.status} ${sinAut.data?.message}`);
  const conAut = await api("POST", `/informes/${inf.data?.id}/autorizar`, {}, tP);
  check("la Responsable General autoriza el informe con su autorizacion_informe: 200", conAut.status === 200, `${conAut.status} ${conAut.data?.message}`);
  await otorgar(RICARDO, { tipo: "actividad", clave: "autorizacion_informe" }, tP);
}

/* ---------- Quien administra ---------- */
{
  const propia = await otorgar(RICARDO, { tipo: "metodo", clave: "PSP" }, tR);
  check("nadie se otorga una autorizacion a si mismo: 409 segregacion", propia.status === 409 && propia.data?.codigo === "segregacion", `${propia.status} ${propia.data?.message}`);
  const admin = await otorgar(LUIS, { tipo: "metodo", clave: "PSP" }, tJ);
  check("el Administrador tecnico no otorga autorizaciones: 403", admin.status === 403, `${admin.status} ${admin.data?.message}`);
  const mias = await api("GET", "/autorizaciones/mias", undefined, tL);
  check("Mis autorizaciones: el Analista ve las suyas (folio FX-THF-AP-DEMO del seed)", mias.status === 200 && (mias.data?.items || []).some((a) => a.clave === "extraccion" && a.folio_fx_thf_ap === "FX-THF-AP-DEMO"), `${mias.status} ${(mias.data?.items || []).length}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
