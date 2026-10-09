/*
 * Informes de la Fase 6, contra el servidor de prueba:
 * - liberar exige la autorizacion FX-THF-AP liberacion_informe (403 sin ella);
 * - envio SMTP con el transporte de prueba (SMTP_HOST=prueba, sin red) guarda el Message-ID;
 * - la enmienda de un analisis incluido marca el informe "requiere enmienda" y bloquea su envio;
 * - revisar un analisis en "registrado" -> 409 (el analista debe enviarlo);
 * - pendientes de la Fase 5: informe_elaborado condicionado, firmante analista sin nombre, vN en la lista.
 *
 *   node tests/api-informes.mjs              # servidor con SMTP de prueba
 *   node tests/api-informes.mjs --sin-smtp   # tras reiniciar sin SMTP_*: la opcion no esta disponible
 */
import "./lib/reauth-auto.mjs";
import { readFileSync } from "node:fs";
import { autorizarTodo } from "./lib/autorizar.mjs";
import { liberar, registrarEnvio } from "./lib/envio.mjs";

const BASE = process.env.BASE || "http://localhost:3100/api";
const SIN_SMTP = process.argv.includes("--sin-smtp");
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
const tR = await login(RICARDO, credenciales[RICARDO]);
const tP = await login(PATRICIA, credenciales[PATRICIA]);
const usuarios = (await api("GET", "/admin/usuarios", undefined, QA)).data?.items || [];
const idDe = (email) => usuarios.find((u) => u.email === email)?.id;

const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
let n = 0;
/* Cadena completa hasta un analisis aprobado y un informe autorizado (QA elabora; Ricardo revisa y aprueba; Patricia autoriza). */
const cadena = async (prefijo, { autorizar = true, informe = true, aprobar = true } = {}) => {
  const id = `${prefijo}-${Date.now()}-${(n += 1)}`;
  const R = (await api("POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "09:00", recibido_por: "QA", medio_recepcion: "directa", solicitante: "Cliente informes F6", muestra_unica: true, id_interno: id, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-20", responsable: "QA" } }, QA)).data?.id;
  const P = (await api("POST", "/samples/processing", { recepcion_id: R, muestra_tipo: "unica", id_interno: id, fecha_procesamiento: "2026-09-20", tipo_organismo: ["bivalvos"], nombre_quien_proceso: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const E = (await api("POST", "/samples/extraction", { tipo_registro: "E-D", procesamiento_id: P, tipo_molienda: "fresca", id_interno: id, fecha_extraccion: "2026-09-20", registro_pesos: [{ id_muestra: id, replica: `${id}_R1`, peso_muestra: 2.01 }], nombre_quien_extrajo: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const A = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: E, fecha_analisis: "2026-09-20", analista_nombre: "QA", resultados: [{ id_muestra: id, resultado: 50, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }] }, QA)).data?.id;
  if (!aprobar) return { id, R, P, E, A };
  await api("POST", `/samples/analysis/${A}/enviar-revision`, {}, QA);
  await api("POST", `/samples/analysis/${A}/revisar`, {}, tR);
  await api("POST", `/samples/analysis/${A}/aprobar`, {}, tR);
  if (!informe) return { id, R, P, E, A };
  const inf = (await api("POST", "/informes", { recepcion_id: R, analisis_ids: [A], cliente: { nombre: "Cliente informes F6", correo: "contacto@cliente.mx" } }, QA)).data?.id;
  if (autorizar) {
    await api("POST", `/informes/${inf}/revisar`, {}, tR);
    await api("POST", `/informes/${inf}/autorizar`, {}, tP);
  }
  return { id, R, P, E, A, inf };
};

if (SIN_SMTP) {
  // Tras reiniciar sin SMTP_*: la opcion "Enviar desde la plataforma" no esta disponible.
  const c = await cadena("F6S");
  await liberar(BASE, tP, c.inf);
  const envios = await api("GET", `/informes/${c.inf}/envios`, undefined, QA);
  const smtp = await api("POST", `/informes/${c.inf}/envios/smtp`, { destinatario_nombre: "Cliente", destinatario_correo: "cliente@ejemplo.mx" }, tP);
  check("sin SMTP_* la opcion no esta disponible (smtp_disponible=false y 404)", envios.status === 200 && envios.data?.smtp_disponible === false && smtp.status === 404, `${envios.data?.smtp_disponible} ${smtp.status}`);
} else {
  /* ---------- Liberar exige liberacion_informe ---------- */
  {
    const c = await cadena("F6L");
    const lib = (await api("GET", `/admin/usuarios/${idDe(PATRICIA)}/autorizaciones`, undefined, QA)).data?.items?.filter((a) => a.clave === "liberacion_informe" && a.estado === "vigente") || [];
    for (const a of lib) await api("POST", `/admin/usuarios/${idDe(PATRICIA)}/autorizaciones/${a.id}/revocar`, { motivo: "Prueba de liberación" }, tR);
    const sin = await liberar(BASE, tP, c.inf);
    await api("POST", `/admin/usuarios/${idDe(PATRICIA)}/autorizaciones`, { tipo: "actividad", clave: "liberacion_informe", folio_fx_thf_ap: "FX-THF-AP-DEMO", motivo: "Fin de la prueba" }, tR);
    const con = await liberar(BASE, tP, c.inf);
    check("liberar sin liberacion_informe -> 403; con ella -> 200 (puede ser quien autorizo)", lib.length > 0 && sin.status === 403 && sin.data?.codigo === "no_autorizado" && con.status === 200 && con.data?.item?.estado === "liberado", `${lib.length} ${sin.status} ${con.status} ${con.data?.message}`);

    /* ---------- Envio SMTP (transporte de prueba) ---------- */
    const envios = await api("GET", `/informes/${c.inf}/envios`, undefined, QA);
    const smtp = await api("POST", `/informes/${c.inf}/envios/smtp`, { destinatario_nombre: "Cliente SMTP", destinatario_correo: "cliente.smtp@ejemplo.mx" }, tP);
    const tras = (await api("GET", `/informes/${c.inf}`, undefined, QA)).data?.item;
    check("con SMTP_* definidas se envia desde la plataforma (Message-ID) y el informe queda enviado", envios.data?.smtp_disponible === true && smtp.status === 200 && !!smtp.data?.message_id && tras?.estado === "enviado" && smtp.data?.items?.[0]?.medio === "smtp", `${envios.data?.smtp_disponible} ${smtp.status} ${smtp.data?.message_id} ${tras?.estado}`);
    const confirmar = await api("POST", `/informes/${c.inf}/envios/${smtp.data?.envio_id}/confirmar`, { confirmacion_en: "2026-09-21", confirmacion_nota: "El cliente acusó recibo" }, tP);
    const segundo = await registrarEnvio(BASE, tP, c.inf, { nombre: "Otro destinatario", correo: "otro@ejemplo.mx" });
    const bit = (await api("GET", `/audit?entidad=informes&entidad_id=${c.inf}`, undefined, QA)).data?.items || [];
    const enviar = bit.filter((e) => e.accion === "enviar");
    check("confirmacion de recepcion y reenvio a otro destinatario; la bitacora oculta el correo", confirmar.status === 200 && segundo.status === 200 && JSON.stringify(enviar || {}).includes("c***@ejemplo.mx") && !JSON.stringify(bit).includes("cliente.smtp@ejemplo.mx"), `${confirmar.status} ${segundo.status}`);
  }

  /* ---------- Analisis enmendado despues del informe ---------- */
  {
    const c = await cadena("F6E");
    await liberar(BASE, tP, c.inf);
    await autorizarTodo(BASE, QA, idDe(LUIS));
    const enm = await api("POST", `/samples/analysis/${c.A}/enmendar`, { motivo: "Error de transcripción" }, QA);
    await api("POST", `/samples/analysis/${enm.data?.id}/enviar-revision`, {}, QA);
    await api("POST", `/samples/analysis/${enm.data?.id}/revisar`, {}, tR);
    await api("POST", `/samples/analysis/${enm.data?.id}/aprobar`, {}, tR);
    const inf = (await api("GET", `/informes/${c.inf}`, undefined, QA)).data?.item;
    const envio = await registrarEnvio(BASE, tP, c.inf);
    check("la enmienda de un analisis incluido marca el informe 'requiere enmienda' y bloquea su envio (409)", Number(inf?.requiere_enmienda) === 1 && envio.status === 409 && envio.data?.codigo === "requiere_enmienda", `${inf?.requiere_enmienda} ${envio.status} ${envio.data?.message}`);
    const lista = (await api("GET", "/informes?estado=requiere_enmienda", undefined, QA)).data?.items || [];
    const enmInf = await api("POST", `/informes/${c.inf}/enmienda`, { motivo: "Resultado enmendado" }, QA);
    const v2 = (await api("GET", `/informes/${enmInf.data?.id}`, undefined, QA)).data?.item;
    check("la lista filtra 'requiere enmienda' y la enmienda del informe toma la version vigente del analisis", lista.some((i) => i.id === c.inf) && enmInf.status === 201 && (v2?.analisis_ids || []).includes(enm.data?.id), `${lista.length} ${enmInf.status} ${JSON.stringify(v2?.analisis_ids)}`);
  }

  /* ---------- Pendientes de la Fase 5 ---------- */
  {
    const c = await cadena("F6P", { autorizar: false });
    const A2 = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: c.E, fecha_analisis: "2026-09-20", resultados: [{ id_muestra: c.id, resultado: 40, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }], firmantes: { analista: { usuario_id: usuarios.find((u) => u.email === "qa@ficotox.local")?.id } } }, QA));
    check("con firmantes.analista basta (sin analista_nombre): 201 y el nombre lo pone la cuenta", A2.status === 201, `${A2.status} ${A2.data?.message}`);
    const revReg = await api("POST", `/samples/analysis/${A2.data?.id}/revisar`, {}, tR);
    check("revisar un analisis en registrado -> 409 (el analista debe enviarlo)", revReg.status === 409, `${revReg.status} ${revReg.data?.message}`);
    // Informe sin analisis aprobados sobre una recepcion no validada: no la mueve a informe_elaborado.
    const otra = await cadena("F6Q", { aprobar: false });
    const estadoAntes = "en_analisis";
    const A3 = otra.A;
    const estadoConPendiente = (await api("GET", `/samples/reception/${otra.R}`, undefined, QA)).data?.item?.estado;
    const infSin = await api("POST", "/informes", { recepcion_id: otra.R, analisis_ids: [A3], cliente: { nombre: "Sin aprobar" } }, QA);
    const estadoDespues = (await api("GET", `/samples/reception/${otra.R}`, undefined, QA)).data?.item?.estado;
    check("crear un informe sin analisis aprobados no mueve una recepcion no validada a informe_elaborado", infSin.status === 201 && estadoDespues === estadoConPendiente && estadoDespues !== "informe_elaborado", `${estadoAntes} → ${estadoConPendiente} → ${estadoDespues}`);
    const listaA = (await api("GET", `/samples/analysis?recepcion_id=${c.R}`, undefined, QA)).data?.items || [];
    check("la lista de analisis trae la version del folio", listaA.length > 0 && listaA.every((a) => Number(a.version) >= 1), JSON.stringify(listaA.map((a) => a.version)));
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
