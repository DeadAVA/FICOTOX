/*
 * Biblioteca de documentos (reemplaza el flujo de Documentos SGC):
 * - subir PDF, imagen, docx y xlsx: se guardan con SHA-256 y se leen (modo ver, con Range);
 * - html, svg, exe y PDF falso rechazados con mensaje claro; mayor al limite -> 413;
 * - nueva version: la anterior se conserva y se puede abrir;
 * - archivar y restaurar con motivo y reautenticacion; archivado oculto salvo archivados=1;
 * - visibilidad por roles: el Estudiante ("autorizados") no ve ni descarga un restringido (tambien por URL directa);
 * - sin documentos:C no se sube (403); editar solo lo propio con E, o con G;
 * - archivo alterado en disco: aviso (integridad), alerta_integridad e incidencia automatica;
 * - bitacora: subir, version, editar, descargar, archivar, restaurar, categorias; abrir (ver) no se registra;
 * - Inicio y campana sin avisos del flujo anterior; endpoints del flujo anterior retirados (410).
 */
import "./lib/reauth-auto.mjs";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { api, BASE, crearCheck, fila, filas, sesiones } from "./lib/calidad.mjs";
import { docxSimple, pdfConTexto, pngSimple, xlsxDosHojas } from "./lib/archivos.mjs";

const { check, terminar } = crearCheck();
const { t, id } = await sesiones();
const sha = (b) => createHash("sha256").update(b).digest("hex");
const instancia = path.dirname(process.env.TEST_DB_PATH);
const stamp = Date.now().toString(36).slice(-5);

function subir(token, bytes, nombre, campos = {}, headers = {}) {
  const fd = new FormData();
  fd.append("archivo", new Blob([bytes]), nombre);
  for (const [k, v] of Object.entries({ titulo: nombre.replace(/\.[^.]+$/, ""), ...campos })) fd.append(k, String(v));
  return api("POST", "/biblioteca", fd, token, headers);
}
async function bytesDe(versionId, token, modo = "ver", headers = {}) {
  const r = await fetch(`${BASE}/biblioteca/versiones/${versionId}/archivo?modo=${modo}`, { headers: { Authorization: `Bearer ${token}`, ...headers } });
  return { status: r.status, headers: r.headers, bytes: Buffer.from(await r.arrayBuffer()) };
}
const doc = async (docId, token = t.qa) => api("GET", `/biblioteca/${docId}`, undefined, token);
const roles = (await api("GET", "/admin/roles", undefined, t.qa)).data?.items || [];
const rolId = (nombre) => roles.find((r) => r.nombre === nombre)?.id;

/* ---------- 1. Subir y leer ---------- */
const pdf = await pdfConTexto(4, `Procedimiento ${stamp}`);
const archivos = [
  ["pdf", pdf, `procedimiento-${stamp}.pdf`],
  ["png", pngSimple(), `foto-${stamp}.png`],
  ["docx", docxSimple(), `instructivo-${stamp}.docx`],
  ["xlsx", xlsxDosHojas(), `resultados-${stamp}.xlsx`],
];
const subidos = {};
for (const [ext, bytes, nombre] of archivos) {
  const r = await subir(t.ana, bytes, nombre, { categoria_id: 2, clave: `FX-PR-${ext}-${stamp}`, etiquetas: "prueba, biblioteca", texto: ext === "pdf" ? "saxitoxina fitoplancton" : "" });
  const docId = r.data?.item?.id;
  const d = docId ? (await doc(docId)).data : null;
  const v = d?.versiones?.[0];
  const leido = v ? await bytesDe(v.id, t.qa) : null;
  subidos[ext] = { docId, versionId: v?.id, bytes };
  check(`subir ${ext}: 201, SHA-256 guardado y se abre con los mismos bytes`, r.status === 201 && v?.sha256 === sha(bytes) && leido?.status === 200 && sha(leido.bytes) === sha(bytes) && d?.item?.integridad === "ok", `${r.status} ${r.data?.message || ""} ${leido?.status}`);
}
const enDisco = fila("SELECT nombre_almacenado FROM biblioteca_versiones WHERE id = ?", subidos.pdf.versionId);
check("el archivo queda en instance/biblioteca/<documento_id>/<uuid>.<ext>", /^\d+\/[0-9a-f-]{36}\.pdf$/.test(String(enDisco?.nombre_almacenado)) && fs.existsSync(path.join(instancia, "biblioteca", String(enDisco.nombre_almacenado))), String(enDisco?.nombre_almacenado));
const rango = await bytesDe(subidos.pdf.versionId, t.qa, "ver", { Range: "bytes=0-4" });
check("lectura progresiva: Range responde 206 con el trozo pedido", rango.status === 206 && rango.bytes.toString() === "%PDF-" && /bytes 0-4\//.test(rango.headers.get("content-range") || ""), `${rango.status}`);
const busca = await api("GET", "/biblioteca?search=fitoplancton", undefined, t.qa);
check("buscar dentro del texto del PDF", (busca.data?.items || []).some((i) => i.id === subidos.pdf.docId));
const porEtiqueta = await api("GET", `/biblioteca?search=FX-PR-docx-${stamp}`, undefined, t.qa);
check("buscar por clave", (porEtiqueta.data?.items || []).length === 1);

/* ---------- 2. Rechazos ---------- */
const malos = [
  ["html", Buffer.from("<!doctype html><html><body><script>alert(1)</script></body></html>"), "pagina.html", /Formato no permitido/],
  ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "dibujo.svg", /Formato no permitido/],
  ["html renombrado .pdf", Buffer.from("<html><script>alert(1)</script></html>"), "falso.pdf", /HTML o SVG/],
  ["exe renombrado .pdf", Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(200)]), "programa.pdf", /ejecutable/],
  ["PDF falso", Buffer.from("esto no es un pdf, solo texto"), "documento.pdf", /no corresponde a un archivo \.pdf/],
];
for (const [que, bytes, nombre, mensaje] of malos) {
  const r = await subir(t.ana, bytes, nombre);
  check(`${que}: rechazado con mensaje claro`, r.status === 400 && mensaje.test(String(r.data?.message || "")), `${r.status} ${r.data?.message}`);
}
const enorme = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(50 * 1024 * 1024 + 1)]);
const grande = await subir(t.ana, enorme, "enorme.pdf");
check("archivo mayor al límite (50 MB): 413", grande.status === 413, `${grande.status} ${grande.data?.message || ""}`);

/* ---------- 3. Nueva version ---------- */
const v2bytes = await pdfConTexto(2, `Procedimiento ${stamp} rev 2`);
const fd = new FormData();
fd.append("archivo", new Blob([v2bytes]), `procedimiento-${stamp}-v2.pdf`);
fd.append("nota_version", "Se actualizó el alcance");
const nueva = await api("POST", `/biblioteca/${subidos.pdf.docId}/versiones`, fd, t.ana);
const tras = (await doc(subidos.pdf.docId)).data;
const v1 = tras?.versiones?.find((v) => v.numero === 1);
const v1bytes = v1 ? await bytesDe(v1.id, t.qa) : null;
check("nueva versión: 201, la versión 2 es la vigente y la 1 se conserva y se abre", nueva.status === 201 && tras?.versiones?.length === 2 && tras?.versiones?.[0]?.numero === 2 && Number(tras?.item?.version_actual_id) === Number(tras?.versiones?.[0]?.id) && sha(v1bytes?.bytes || Buffer.alloc(0)) === sha(pdf), `${nueva.status} ${tras?.versiones?.length}`);

/* ---------- 4. Editar ---------- */
const edit = await api("PUT", `/biblioteca/${subidos.docx.docId}`, { titulo: `Instructivo editado ${stamp}`, categoria_id: 3, etiquetas: ["campo", "muestreo"], visibilidad: "todos" }, t.ana);
const ajeno = await api("PUT", `/biblioteca/${subidos.docx.docId}`, { titulo: "Intento" }, t.ricardo);
const propio = await subir(t.ricardo, pngSimple(), `propia-${stamp}.png`);
const editaPropio = await api("PUT", `/biblioteca/${propio.data?.item?.id}`, { titulo: `Propia editada ${stamp}`, visibilidad: "todos" }, t.ricardo);
check("editar datos: documentos:G edita cualquiera; E solo el propio (ajeno 403, propio 200)", edit.status === 200 && ajeno.status === 403 && propio.status === 201 && editaPropio.status === 200, `${edit.status} ${ajeno.status} ${propio.status} ${editaPropio.status}`);
const sinTitulo = await api("PUT", `/biblioteca/${subidos.docx.docId}`, { titulo: "  " }, t.ana);
check("título obligatorio: 400 'Indica el título' con el campo", sinTitulo.status === 400 && sinTitulo.data?.campo === "titulo", `${sinTitulo.status}`);

/* ---------- 5. Archivar y restaurar ---------- */
const sinMotivo = await api("POST", `/biblioteca/${subidos.png.docId}/archivar`, { motivo: "" }, t.ana);
const sinReauth = await api("POST", `/biblioteca/${subidos.png.docId}/archivar`, { motivo: "Duplicado de otra foto" }, t.ana, { "X-Sin-Reauth-Auto": "1" });
const archiva = await api("POST", `/biblioteca/${subidos.png.docId}/archivar`, { motivo: "Duplicado de otra foto" }, t.ana);
const lista = (await api("GET", "/biblioteca", undefined, t.ana)).data?.items || [];
const conArch = (await api("GET", "/biblioteca?archivados=1", undefined, t.ana)).data?.items || [];
check("archivar exige motivo (400) y reautenticación (401); con ambos, 200", sinMotivo.status === 400 && sinReauth.status === 401 && archiva.status === 200, `${sinMotivo.status} ${sinReauth.status} ${archiva.status}`);
check("un archivado no aparece salvo con «Mostrar archivados»", !lista.some((i) => i.id === subidos.png.docId) && conArch.some((i) => i.id === subidos.png.docId && i.archivado_en));
const versionArchivado = await api("POST", `/biblioteca/${subidos.png.docId}/versiones`, new FormData(), t.ana);
check("no se suben versiones a un archivado (409)", versionArchivado.status === 409, `${versionArchivado.status}`);
const restaura = await api("POST", `/biblioteca/${subidos.png.docId}/restaurar`, { motivo: "Se archivó por error" }, t.ana);
check("restaurar con motivo: vuelve a la lista", restaura.status === 200 && ((await api("GET", "/biblioteca", undefined, t.ana)).data?.items || []).some((i) => i.id === subidos.png.docId), `${restaura.status}`);
const sinAN = await api("POST", `/biblioteca/${subidos.png.docId}/archivar`, { motivo: "Sin permiso de anular" }, t.luis);
check("sin documentos:AN ni G no se archiva (403)", sinAN.status === 403, `${sinAN.status}`);

/* ---------- 6. Visibilidad por roles ---------- */
const restringido = await subir(t.ana, await pdfConTexto(1, "Solo Mejora Continua"), `restringido-${stamp}.pdf`, { visibilidad: "roles", roles: String(rolId("Coordinador/a de Mejora Continua")) });
const rid = restringido.data?.item?.id;
const rv = (await doc(rid)).data?.versiones?.[0]?.id;
const listaEst = (await api("GET", "/biblioteca", undefined, t.diego)).data?.items || [];
const fichaEst = await doc(rid, t.diego);
const archivoEst = await bytesDe(rv, t.diego, "descargar");
const historialEst = await api("GET", `/audit?entidad=biblioteca_documentos&entidad_id=${rid}`, undefined, t.diego);
check("el Estudiante («autorizados») no ve un documento restringido a otro rol: lista, ficha y descarga por URL directa (404)", restringido.status === 201 && !listaEst.some((i) => i.id === rid) && fichaEst.status === 404 && archivoEst.status === 404 && [403, 404].includes(historialEst.status), `${restringido.status} ${fichaEst.status} ${archivoEst.status} ${historialEst.status}`);
check("  … pero sí los visibles para todos", listaEst.some((i) => i.id === subidos.pdf.docId));
check("  … y quien tiene documentos:V total (Responsable General) lo ve", (await doc(rid, t.patricia)).status === 200);

/* ---------- 7. Sin documentos:C ---------- */
const auxiliar = await subir(t.mariana, pngSimple(), "intento.png");
const listaAux = await api("GET", "/biblioteca", undefined, t.mariana);
check("sin documentos:C no se sube (403) y la lista dice que no puede subir", auxiliar.status === 403 && listaAux.data?.puede?.subir === false, `${auxiliar.status} ${JSON.stringify(listaAux.data?.puede)}`);
const sinV = await api("GET", "/biblioteca", undefined, t.jorge);
check("el Administrador técnico (documentos:V técnico) ve la biblioteca pero no sube", sinV.status === 200 && sinV.data?.puede?.subir === false, `${sinV.status}`);

/* ---------- 8. Integridad ---------- */
const xv = fila("SELECT * FROM biblioteca_versiones WHERE id = ?", subidos.xlsx.versionId);
fs.appendFileSync(path.join(instancia, "biblioteca", String(xv.nombre_almacenado)), Buffer.from("alterado"));
const alterado = await doc(subidos.xlsx.docId);
const alerta = filas("SELECT * FROM auditoria WHERE accion = 'alerta_integridad' AND entidad = 'biblioteca_documentos' AND entidad_id = ?", String(subidos.xlsx.docId));
const incidencia = filas("SELECT i.* FROM incidencias i JOIN incidencia_registros r ON r.incidencia_id = i.id WHERE r.entidad = 'biblioteca_documentos' AND r.entidad_id = ? AND i.origen_automatico = 'alerta_integridad'", subidos.xlsx.docId);
const descargaAlterado = await bytesDe(subidos.xlsx.versionId, t.qa, "descargar");
check("archivo alterado en disco: la ficha avisa (integridad alterado), alerta_integridad e incidencia automática", alterado.data?.item?.integridad === "alterado" && alerta.length >= 1 && incidencia.length === 1 && descargaAlterado.headers.get("x-integridad-archivo") === "alterado", `${alterado.data?.item?.integridad} ${alerta.length} ${incidencia.length}`);
fs.rmSync(path.join(instancia, "biblioteca", String(fila("SELECT nombre_almacenado FROM biblioteca_versiones WHERE id = ?", subidos.docx.versionId).nombre_almacenado)));
const faltante = await bytesDe(subidos.docx.versionId, t.qa, "descargar");
check("archivo faltante: 404 con alerta", faltante.status === 404 && faltante.headers.get("x-integridad-archivo") === "faltante", `${faltante.status}`);
// Se devuelven los archivos originales: las suites siguientes (respaldo y restauración) verifican todas las huellas.
fs.writeFileSync(path.join(instancia, "biblioteca", String(xv.nombre_almacenado)), subidos.xlsx.bytes);
fs.writeFileSync(path.join(instancia, "biblioteca", String(fila("SELECT nombre_almacenado FROM biblioteca_versiones WHERE id = ?", subidos.docx.versionId).nombre_almacenado)), subidos.docx.bytes);
check("  … al reponer los archivos originales, la integridad vuelve a ok", (await doc(subidos.xlsx.docId)).data?.item?.integridad === "ok");

/* ---------- 9. Bitacora ---------- */
const desc0 = filas("SELECT id FROM auditoria WHERE accion = 'descargar' AND entidad = 'biblioteca_documentos'").length;
await bytesDe(subidos.pdf.versionId, t.qa, "ver");
const desc1 = filas("SELECT id FROM auditoria WHERE accion = 'descargar' AND entidad = 'biblioteca_documentos'").length;
await bytesDe(subidos.pdf.versionId, t.qa, "descargar");
const desc2 = filas("SELECT id FROM auditoria WHERE accion = 'descargar' AND entidad = 'biblioteca_documentos'").length;
check("abrir o leer (modo ver) no se registra; descargar sí", desc1 === desc0 && desc2 === desc0 + 1, `${desc0} ${desc1} ${desc2}`);
const acciones = new Set(filas("SELECT accion FROM auditoria WHERE entidad = 'biblioteca_documentos'").map((r) => r.accion));
check("bitácora: subir, subir_version, editar, archivar, restaurar, descargar y alerta_integridad", ["subir", "subir_version", "editar", "archivar", "restaurar", "descargar", "alerta_integridad"].every((a) => acciones.has(a)), [...acciones].join(","));
const editada = fila("SELECT datos_anteriores_json AS antes_json, datos_nuevos_json AS despues_json FROM auditoria WHERE entidad = 'biblioteca_documentos' AND accion = 'editar' AND entidad_id = ? ORDER BY id DESC LIMIT 1", String(subidos.docx.docId));
check("  … editar guarda antes y después", !!editada && String(editada.antes_json).includes("instructivo") && String(editada.despues_json).includes("Instructivo editado"));

/* ---------- 10. Categorias ---------- */
const cat = await api("POST", "/biblioteca/categorias", { nombre: `Categoría ${stamp}` }, t.ana);
const catAjena = await api("POST", "/biblioteca/categorias", { nombre: `Otra ${stamp}` }, t.ricardo);
const desactiva = await api("PUT", `/biblioteca/categorias/${cat.data?.id}`, { activa: false }, t.ana);
check("categorías: solo documentos:G crea y desactiva (201/403/200), con bitácora", cat.status === 201 && catAjena.status === 403 && desactiva.status === 200 && filas("SELECT id FROM auditoria WHERE accion = 'categoria'").length >= 2, `${cat.status} ${catAjena.status} ${desactiva.status}`);

/* ---------- 11. Flujo anterior retirado ---------- */
const avisos = JSON.stringify((await api("GET", "/inicio/avisos", undefined, t.ana)).data || {});
const campana = JSON.stringify((await api("GET", "/notificaciones", undefined, t.diego)).data || {});
check("Inicio y campana sin avisos del flujo anterior (por leer, por revisar o aprobar documentos)", !/por leer|Documentos por|documentos-sgc|documentos_sgc/i.test(avisos + campana));
const viejo = await api("POST", "/documentos-sgc", new FormData(), t.ana);
const maestra = await api("GET", "/documentos-sgc/lista-maestra", undefined, t.ana);
check("endpoints del flujo anterior: escrituras y lista maestra responden 410 (funcionalidad retirada)", viejo.status === 410 && maestra.status === 410, `${viejo.status} ${maestra.status}`);
void id;

terminar();
