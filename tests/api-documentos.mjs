/*
 * Documentos SGC (Fase 7), contra el servidor de prueba, con los usuarios de ejemplo:
 * - flujo principal: Luis propone -> Ana (Mejora Continua) acepta -> Ricardo elabora ->
 *   Ana revisa calidad -> Gabriela revisa tecnica -> Patricia aprueba -> Ana publica y
 *   distribuye -> Luis confirma lectura; lista maestra y CSV;
 * - negativo: quien elaboro intenta aprobar -> 409;
 * - negativo: el Estudiante no ve un documento que no le fue distribuido.
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
  const res = await fetch(`${BASE}${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, data: type.includes("json") ? await res.json().catch(() => null) : await res.text() };
}
/* PUT multipart con el archivo del documento (como el formulario). */
async function subir(id, campos, token) {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) form.set(k, String(v));
  form.set("archivo", new Blob(["%PDF-1.4\n% procedimiento de prueba\n"], { type: "application/pdf" }), "procedimiento.pdf");
  const res = await fetch(`${BASE}/documentos-sgc/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const login = async (email) => (await api("POST", "/auth/login", { email, password: credenciales[email] })).data?.token;
const QA = (await api("POST", "/auth/login", { email: "qa@ficotox.local", password: "QaFicotox2026!" })).data?.token;
const tL = await login("luis.castro@ficotox.local");
const tA = await login("ana.torres@ficotox.local");
const tR = await login("ricardo.medina@ficotox.local");
const tG = await login("gabriela.ortiz@ficotox.local");
const tP = await login("patricia.luna@ficotox.local");
const tD = await login("diego.salinas@ficotox.local");
const usuarios = (await api("GET", "/admin/usuarios", undefined, QA)).data?.items || [];
const idDe = (email) => usuarios.find((u) => u.email === email)?.id;
const estado = async (id) => (await api("GET", `/documentos-sgc/${id}`, undefined, QA)).data?.item?.estado;
const sufijo = Date.now().toString(36).toUpperCase().slice(-5);

/* ---------- Flujo principal ---------- */
let docId = null;
{
  const prop = await api("POST", "/documentos-sgc/propuestas", { tipo: "nuevo", titulo: `Procedimiento de prueba ${sufijo}`, motivo: "Falta un procedimiento para la limpieza del material" }, tL);
  const acepta = await api("POST", `/documentos-sgc/propuestas/${prop.data?.id}/aceptar`, { asignado_a: idDe("ricardo.medina@ficotox.local"), clave: `FX-TCP-P${sufijo}`, requiere_revision_tecnica: true }, tA);
  docId = acepta.data?.documento_id;
  check("Luis propone (201) y Ana (Mejora Continua) acepta: borrador asignado a Ricardo", prop.status === 201 && acepta.status === 201 && (await estado(docId)) === "borrador", `${prop.status} ${acepta.status} ${acepta.data?.message}`);
  const elabora = await subir(docId, { titulo: `Procedimiento de prueba ${sufijo}`, descripcion: "Limpieza del material de vidrio", requiere_revision_tecnica: 1 }, tR);
  const enviar = await api("POST", `/documentos-sgc/${docId}/enviar-revision`, {}, tR);
  check("Ricardo elabora (sube el archivo) y lo envía a revisión de calidad", elabora.status === 200 && enviar.status === 200 && (await estado(docId)) === "revision_calidad", `${elabora.status} ${elabora.data?.message} ${enviar.status} ${enviar.data?.message}`);
  const calidad = await api("POST", `/documentos-sgc/${docId}/revisar-calidad`, { observaciones: "Formato correcto" }, tA);
  check("Ana hace la revisión de calidad: pasa a revisión técnica (la requiere)", calidad.status === 200 && (await estado(docId)) === "revision_tecnica", `${calidad.status} ${calidad.data?.message}`);
  const tecnica = await api("POST", `/documentos-sgc/${docId}/revisar-tecnica`, { observaciones: "Técnicamente correcto" }, tG);
  check("Gabriela hace la revisión técnica: pasa a por aprobar", tecnica.status === 200 && (await estado(docId)) === "por_aprobar", `${tecnica.status} ${tecnica.data?.message}`);
  const aprobarCalidad = await api("POST", `/documentos-sgc/${docId}/aprobar`, {}, tA);
  const aprueba = await api("POST", `/documentos-sgc/${docId}/aprobar`, {}, tP);
  check("quien hizo la revisión de calidad no aprueba (409); Patricia aprueba", aprobarCalidad.status === 409 && aprueba.status === 200 && (await estado(docId)) === "aprobado", `${aprobarCalidad.status} ${aprueba.status} ${aprueba.data?.message}`);
  const publica = await api("POST", `/documentos-sgc/${docId}/publicar`, { usuarios: [idDe("luis.castro@ficotox.local")] }, tA);
  check("Ana publica (vigente) y distribuye a Luis", publica.status === 200 && (await estado(docId)) === "vigente" && publica.data?.distribuido_a === 1, `${publica.status} ${publica.data?.message}`);
  const porLeer = (await api("GET", "/documentos-sgc/por-leer", undefined, tL)).data?.items || [];
  const avisos = (await api("GET", "/inicio/avisos", undefined, tL)).data;
  const leido = await api("POST", `/documentos-sgc/${docId}/leido`, {}, tL);
  const ficha = (await api("GET", `/documentos-sgc/${docId}`, undefined, tA)).data?.item;
  check("Luis ve 'Documentos por leer' y confirma 'Leí y comprendí'; la ficha muestra quién confirmó", porLeer.some((d) => d.id === docId) && JSON.stringify(avisos || {}).includes("documentos_por_leer") && leido.status === 200 && ficha?.distribucion_lectura?.some((d) => d.email === "luis.castro@ficotox.local" && d.leido_en), `${porLeer.length} ${leido.status}`);
  const maestra = (await api("GET", "/documentos-sgc/lista-maestra", undefined, tL)).data?.items || [];
  const csv = await api("GET", "/documentos-sgc/lista-maestra?formato=csv", undefined, tL);
  check("lista maestra y exportación CSV con el documento vigente", maestra.some((d) => d.id === docId) && csv.status === 200 && String(csv.data).includes(`FX-TCP-P${sufijo}`) && String(csv.data).includes("Responsable"), `${maestra.length} ${csv.status}`);
}

/* ---------- Negativos ---------- */
{
  // Quien elaboro intenta aprobar -> 409 (QA elabora; Ana revisa calidad; QA intenta aprobar).
  const crear = await api("POST", "/documentos-sgc", { clave: `FX-GCP-N${sufijo}`, titulo: "Documento elaborado por QA", tipo: "P", area: "GC" }, QA);
  await subir(crear.data?.id, { titulo: "Documento elaborado por QA" }, QA);
  await api("POST", `/documentos-sgc/${crear.data?.id}/enviar-revision`, {}, QA);
  await api("POST", `/documentos-sgc/${crear.data?.id}/revisar-calidad`, {}, tA);
  const propio = await api("POST", `/documentos-sgc/${crear.data?.id}/aprobar`, {}, QA);
  check("quien elaboró intenta aprobar -> 409 (segregación)", propio.status === 409 && propio.data?.codigo === "segregacion", `${crear.status} ${propio.status} ${propio.data?.message}`);
  // El Estudiante (alcance "autorizados") no ve un documento que no le fue distribuido.
  const lista = (await api("GET", "/documentos-sgc", undefined, tD)).data?.items || [];
  const ficha = await api("GET", `/documentos-sgc/${docId}`, undefined, tD);
  check("el Estudiante no ve un documento que no le fue distribuido (lista y ficha 404)", !lista.some((d) => d.id === docId) && ficha.status === 404, `${lista.length} ${ficha.status}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
