/*
 * Fase 9 (cierre), contra el servidor de prueba:
 * - el Estudiante recibe 403 al descargar el archivo de un documento no distribuido;
 * - la campana muestra a Luis su muestra asignada y a Patricia un informe por autorizar;
 *   a Mariana no le muestra el informe;
 * - exportar la bitacora devuelve CSV con los filtros aplicados (y queda en la bitacora).
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
async function api(method, ruta, body, token) {
  const res = await fetch(`${BASE}${ruta}`, { method, headers: { ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, type, data: type.includes("json") ? await res.json().catch(() => null) : await res.text() };
}
const login = async (email) => (await api("POST", "/auth/login", { email, password: credenciales[email] })).data?.token;
const QA = (await api("POST", "/auth/login", { email: "qa@ficotox.local", password: "QaFicotox2026!" })).data?.token;
const tR = await login("ricardo.medina@ficotox.local");
const tL = await login("luis.castro@ficotox.local");
const tP = await login("patricia.luna@ficotox.local");
const tM = await login("mariana.delgado@ficotox.local");
const tD = await login("diego.salinas@ficotox.local");
const usuarios = (await api("GET", "/admin/usuarios", undefined, QA)).data?.items || [];
const idDe = (email) => usuarios.find((u) => u.email === email)?.id;
const sufijo = Date.now().toString(36).toUpperCase().slice(-5);

/* ---------- Documento no distribuido: el Estudiante no descarga su archivo ---------- */
{
  const form = new FormData();
  form.set("clave", `FX-GCP-Z${sufijo}`);
  form.set("titulo", "Documento no distribuido");
  form.set("archivo", new Blob(["%PDF-1.4\n% no distribuido\n"], { type: "application/pdf" }), "no-distribuido.pdf");
  const doc = await api("POST", "/documentos-sgc", form, QA);
  const qa = await api("GET", `/documentos-sgc/${doc.data?.id}/archivo`, undefined, QA);
  const est = await api("GET", `/documentos-sgc/${doc.data?.id}/archivo`, undefined, tD);
  check("el Estudiante recibe 403 al descargar un documento no distribuido (QA si lo descarga)", doc.status === 201 && qa.status === 200 && est.status === 403, `${doc.status} ${qa.status} ${est.status}`);
  const propuestas = await api("GET", "/documentos-sgc/propuestas", undefined, tD);
  check("el Estudiante no ve la lista de propuestas (403)", propuestas.status === 403, `${propuestas.status}`);
}

/* ---------- Campana de notificaciones ---------- */
{
  const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
  const id = `CAMP-${sufijo}`;
  const R = (await api("POST", "/samples/reception", { fecha_recepcion: "2026-09-20", hora_recepcion: "09:00", recibido_por: "QA", medio_recepcion: "directa", solicitante: "Cliente campana", muestra_unica: true, id_interno: id, fecha_muestra: "2026-09-19", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-20", responsable: "QA" } }, QA)).data?.id;
  await api("POST", `/samples/reception/${R}/asignaciones`, { usuario_id: idDe("luis.castro@ficotox.local"), motivo: "Prueba de campana" }, tR);
  const P = (await api("POST", "/samples/processing", { recepcion_id: R, muestra_tipo: "unica", id_interno: id, fecha_procesamiento: "2026-09-20", tipo_organismo: ["bivalvos"], nombre_quien_proceso: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const E = (await api("POST", "/samples/extraction", { tipo_registro: "E-D", procesamiento_id: P, tipo_molienda: "fresca", id_interno: id, fecha_extraccion: "2026-09-20", registro_pesos: [{ id_muestra: id, replica: `${id}_R1`, peso_muestra: 2.01 }], nombre_quien_extrajo: "Persona A", nombre_quien_superviso: "Persona B" }, QA)).data?.id;
  const A = (await api("POST", "/samples/analysis", { tipo_analisis: "toxinas_lipofilicas", metodo: "hplc_ms_ms", extraccion_id: E, fecha_analisis: "2026-09-20", analista_nombre: "QA", resultados: [{ id_muestra: id, resultado: 50, unidad: "µg/kg", limite_regulatorio: 160, cumple: "cumple" }] }, QA)).data?.id;
  await api("POST", `/samples/analysis/${A}/enviar-revision`, {}, QA);
  await api("POST", `/samples/analysis/${A}/revisar`, {}, tR);
  await api("POST", `/samples/analysis/${A}/aprobar`, {}, tR);
  const inf = (await api("POST", "/informes", { recepcion_id: R, analisis_ids: [A], cliente: { nombre: "Cliente campana" } }, QA)).data?.id;
  await api("POST", `/informes/${inf}/revisar`, {}, tR);

  const luis = (await api("GET", "/notificaciones", undefined, tL)).data?.items || [];
  check("la campana muestra a Luis su muestra asignada", luis.some((n) => n.tipo === "muestra_asignada" && n.href === `/muestras/recepcion/${R}`), JSON.stringify(luis.map((n) => n.titulo).slice(0, 4)));
  const patricia = (await api("GET", "/notificaciones", undefined, tP)).data?.items || [];
  check("la campana muestra a Patricia el informe por autorizar", patricia.some((n) => n.tipo === "informe" && n.href === `/informes/${inf}` && /Autorizar/.test(n.titulo)), JSON.stringify(patricia.map((n) => n.titulo).slice(0, 6)));
  const mariana = (await api("GET", "/notificaciones", undefined, tM)).data?.items || [];
  check("a Mariana no le muestra el informe", !mariana.some((n) => n.href === `/informes/${inf}`), JSON.stringify(mariana.map((n) => n.titulo).slice(0, 6)));
}

/* ---------- Exportar la bitacora con filtros ---------- */
{
  const csv = await api("GET", `/audit?formato=csv&accion=aprobar&usuario=${encodeURIComponent("ricardo.medina")}`, undefined, QA);
  const lineas = String(csv.data).replace(/^﻿/, "").trim().split(/\r?\n/);
  const filas = lineas.slice(1);
  check("exportar la bitacora devuelve CSV con los filtros aplicados (solo 'aprobar' de Ricardo)", csv.status === 200 && csv.type.includes("text/csv") && lineas[0].includes("Acción") && filas.length > 0 && filas.every((l) => l.includes("Aprobó") && l.includes("ricardo.medina@ficotox.local")), `${csv.status} ${filas.length} ${filas[0]?.slice(0, 120)}`);
  const hist = await api("GET", `/audit?formato=csv&entidad=informes&entidad_id=1`, undefined, QA);
  const exportado = (await api("GET", "/audit?accion=exportar&limit=5", undefined, QA)).data?.items || [];
  check("el historial de un registro tambien se exporta y la exportacion queda en la bitacora", hist.status === 200 && exportado.length >= 2, `${hist.status} ${exportado.length}`);
  const sinPermiso = await api("GET", "/audit?formato=csv", undefined, tM);
  check("exportar la bitacora completa respeta permisos (sin calidad:V -> 403)", sinPermiso.status === 403, `${sinPermiso.status}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
