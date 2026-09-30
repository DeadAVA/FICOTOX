/*
 * Control documental del SGC (Fase 7, seccion 6 de la especificacion):
 * revisiones, devolucion, publicacion con distribucion y acuse de lectura, y
 * propuestas de documento o de cambio. El registro de cada revision y la lista
 * maestra estan en documentos-sgc.ts.
 *
 * Permisos (por permiso, no por rol): revision de calidad documentos:G;
 * revision tecnica documentos:R; aprobar documentos:A; publicar documentos:G.
 * Segregacion: quien elaboro no revisa ni aprueba; quien hizo la revision de
 * calidad no aprueba. Aprobar y publicar piden reautenticacion.
 */

import { requireUser, userIdFromClaims, type CurrentUser } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { permisoDe, requirePermission, type Autorizacion } from "../rbac";

import { elaboradoresDe, exigirSegregacion, detalleExcepcion } from "../segregacion";
import { exigirReauth } from "../seguridad";
import { evaluarDocumento } from "../../shared/segregacion";
import { hoyLocal } from "../../shared/fechas";
import { DOCUMENT_KEY_RE, DOCUMENT_REVIEW_YEARS, parseDocumentKey } from "../../shared/sgc";
import { serializeDocumento } from "./documentos-sgc";

const TABLE = "documentos_sgc";
const DISTRIBUCION = "distribucion_documento";
const PROPUESTAS = "propuestas_documento";

const docRef = (row: Row | null | undefined) => (row ? `${row.clave}-${row.revision}` : "");
const persona = (user: { nombre?: unknown; email?: unknown }, yo: number, extra: Record<string, unknown> = {}) => ({ nombre: String(user.nombre || user.email || ""), fecha: hoyLocal(), usuario_id: yo, ...extra });

async function documentoEn(s: Session, id: number, estados: string[], que: string): Promise<Row> {
  const row = await snapshotRow(s, TABLE, id);
  if (!row) throw new HttpError(404, { message: "Documento no encontrado" });
  if (!estados.includes(String(row.estado))) throw new HttpError(409, { message: `No se puede ${que}: el documento está ${row.estado}` });
  return row;
}

/* Elaboradores del documento: quien lo creo, a quien se asigno y quien edito su contenido. */
const elaboradores = (s: Session, row: Row) => elaboradoresDe(s, TABLE, Number(row.id), row.creado_por, row.asignado_a);

/* ---------- Revision ---------- */

/* revision_calidad -> revision_tecnica (si la requiere) o por_aprobar. documentos:G. */
export async function revisarCalidad({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "G");
  const antes = await documentoEn(s, intParam(params.id), ["revision_calidad"], "hacer la revisión de calidad");
  const yo = userIdFromClaims(user) as number;
  const excepcion = exigirSegregacion(evaluarDocumento(yo, await elaboradores(s, antes), null, "revisar"), antes, yo, "revisar");
  const payload = await readJson(request);
  const siguiente = Number(antes.requiere_revision_tecnica || 0) ? "revision_tecnica" : "por_aprobar";
  await s.execute(`UPDATE ${TABLE} SET estado = :estado, reviso_json = :reviso, actualizado_por = :yo WHERE id = :id`, { estado: siguiente, reviso: JSON.stringify(persona(user, yo, { observaciones: payload.observaciones || null })), yo, id: antes.id });
  const despues = await snapshotRow(s, TABLE, Number(antes.id));
  await registrarAuditoria(s, user, { accion: "revisar", entidad: TABLE, entidadId: Number(antes.id), referencia: docRef(antes), antes, despues, motivo: (payload.observaciones as string) || null, detalle: { revision: "calidad", siguiente, ...detalleExcepcion(excepcion) } });
  await s.commit();
  return json({ message: siguiente === "revision_tecnica" ? "Revisión de calidad hecha; pasa a revisión técnica" : "Revisión de calidad hecha; pasa a aprobación", item: serializeDocumento(despues!) });
}

/* revision_tecnica -> por_aprobar. documentos:R. */
export async function revisarTecnica({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "R");
  const antes = await documentoEn(s, intParam(params.id), ["revision_tecnica"], "hacer la revisión técnica");
  const yo = userIdFromClaims(user) as number;
  const excepcion = exigirSegregacion(evaluarDocumento(yo, await elaboradores(s, antes), null, "revisar"), antes, yo, "revisar");
  const payload = await readJson(request);
  await s.execute(`UPDATE ${TABLE} SET estado = 'por_aprobar', revision_tecnica_json = :rt, actualizado_por = :yo WHERE id = :id`, { rt: JSON.stringify(persona(user, yo, { observaciones: payload.observaciones || null })), yo, id: antes.id });
  const despues = await snapshotRow(s, TABLE, Number(antes.id));
  await registrarAuditoria(s, user, { accion: "revisar", entidad: TABLE, entidadId: Number(antes.id), referencia: docRef(antes), antes, despues, motivo: (payload.observaciones as string) || null, detalle: { revision: "tecnica", ...detalleExcepcion(excepcion) } });
  await s.commit();
  return json({ message: "Revisión técnica hecha; pasa a aprobación", item: serializeDocumento(despues!) });
}

/* Cada revisor devuelve con observaciones a borrador (calidad: G; tecnica: R). */
export async function devolverDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const antes = await documentoEn(s, intParam(params.id), ["revision_calidad", "revision_tecnica"], "devolver");
  await requirePermission(s, user, "documentos", String(antes.estado) === "revision_calidad" ? "G" : "R");
  const payload = await readJson(request);
  const motivo = String(payload.motivo || payload.observaciones || "").trim();
  if (motivo.length < 5) throw new HttpError(400, { message: "Escribe las observaciones (al menos 5 caracteres)" });
  await s.execute(`UPDATE ${TABLE} SET estado = 'borrador', devolucion_observaciones = :motivo, actualizado_por = :yo WHERE id = :id`, { motivo, yo: userIdFromClaims(user), id: antes.id });
  const despues = await snapshotRow(s, TABLE, Number(antes.id));
  await registrarAuditoria(s, user, { accion: "devolver", entidad: TABLE, entidadId: Number(antes.id), referencia: docRef(antes), antes, despues, motivo, detalle: { desde: antes.estado } });
  await s.commit();
  return json({ message: "Documento devuelto a borrador con observaciones", item: serializeDocumento(despues!) });
}

/* ---------- Publicacion y distribucion ---------- */

async function usuariosDeRoles(s: Session, roles: number[]): Promise<number[]> {
  if (!roles.length) return [];
  const filas = await s.query<{ usuario_id: number }>(
    `SELECT DISTINCT ur.usuario_id FROM usuario_roles ur INNER JOIN usuarios u ON u.id = ur.usuario_id
     WHERE ur.revocado_en IS NULL AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy) AND COALESCE(u.activo, 1) = 1 AND ur.rol_id IN (${roles.map((_, i) => `:r${i}`).join(", ")})`,
    { hoy: hoyLocal(), ...Object.fromEntries(roles.map((r, i) => [`r${i}`, r])) },
  );
  return filas.map((f) => Number(f.usuario_id));
}

/*
 * aprobado -> vigente (entra a la lista maestra). documentos:G y reautenticacion.
 * La revision vigente anterior pasa a obsoleta. Se distribuye a usuarios y roles.
 */
export async function publicarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "G");
  const antes = await documentoEn(s, intParam(params.id), ["aprobado"], "publicar");
  const payload = await readJson(request);
  await exigirReauth(s, request, user, "documentos:G");
  const yo = userIdFromClaims(user) as number;
  const hoy = hoyLocal();
  const previas = await s.query<{ id: number; revision: number }>(`SELECT id, revision FROM ${TABLE} WHERE clave = :clave AND estado = 'vigente' AND id <> :id`, { clave: antes.clave, id: antes.id });
  for (const previa of previas) {
    const prevAntes = await snapshotRow(s, TABLE, previa.id);
    await s.execute(`UPDATE ${TABLE} SET estado = 'obsoleto', motivo_estado = :motivo, actualizado_por = :yo WHERE id = :id`, { motivo: `Sustituido por la revision ${antes.revision}`, yo, id: previa.id });
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: previa.id, referencia: docRef(prevAntes), antes: prevAntes, despues: await snapshotRow(s, TABLE, previa.id), motivo: `Obsoleto: sustituido por la revision ${antes.revision}` });
  }
  const vigencia = String(payload.fecha_vigencia || "").slice(0, 10) || hoy;
  const [y, m, d] = vigencia.split("-");
  const proxima = `${Number(y) + DOCUMENT_REVIEW_YEARS}-${m}-${d}`;
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'vigente', publico_json = :publico, fecha_vigencia = :vigencia, fecha_proxima_revision = COALESCE(fecha_proxima_revision, :proxima), motivo_estado = NULL, actualizado_por = :yo WHERE id = :id`,
    { publico: JSON.stringify(persona(user, yo)), vigencia, proxima, yo, id: antes.id },
  );
  // Distribucion: usuarios elegidos y los de los roles elegidos (sin repetir).
  const usuarios = Array.isArray(payload.usuarios) ? payload.usuarios.map(Number).filter(Boolean) : [];
  const roles = Array.isArray(payload.roles) ? payload.roles.map(Number).filter(Boolean) : [];
  const destinatarios = [...new Set([...usuarios, ...(await usuariosDeRoles(s, roles))])];
  const en = new Date().toISOString();
  for (const usuarioId of destinatarios) {
    await s.execute(`INSERT INTO ${DISTRIBUCION} (documento_id, usuario_id, distribuido_por, distribuido_en) VALUES (:doc, :u, :yo, :en)`, { doc: antes.id, u: usuarioId, yo, en });
  }
  const despues = await snapshotRow(s, TABLE, Number(antes.id));
  await registrarAuditoria(s, user, { accion: "publicar", entidad: TABLE, entidadId: Number(antes.id), referencia: docRef(antes), antes, despues, detalle: { revisiones_obsoletas: previas.map((p) => p.revision), distribuido_a: destinatarios.length, roles } });
  await s.commit();
  return json({ message: `Documento publicado y vigente${destinatarios.length ? `; distribuido a ${destinatarios.length} persona(s)` : ""}`, item: serializeDocumento(despues!), distribuido_a: destinatarios.length });
}

/* El destinatario confirma "Leí y comprendí". */
export async function confirmarLectura({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "V");
  const id = intParam(params.id);
  const yo = userIdFromClaims(user) as number;
  const fila = await s.queryOne<Row>(`SELECT * FROM ${DISTRIBUCION} WHERE documento_id = :doc AND usuario_id = :yo ORDER BY id DESC LIMIT 1`, { doc: id, yo });
  if (!fila) throw new HttpError(404, { message: "Este documento no te fue distribuido" });
  if (fila.leido_en) throw new HttpError(409, { message: "Ya confirmaste la lectura de este documento" });
  const en = new Date().toISOString();
  await s.execute(`UPDATE ${DISTRIBUCION} SET leido_en = :en WHERE id = :id`, { en, id: fila.id });
  const doc = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "confirmar_lectura", entidad: TABLE, entidadId: id, referencia: docRef(doc), detalle: { leido_en: en } });
  await s.commit();
  return json({ message: "Lectura confirmada: leí y comprendí", leido_en: en });
}

/* Documentos vigentes distribuidos a la persona que aun no confirma (Inicio "Documentos por leer"). */
export async function documentosPorLeer(s: Session, usuarioId: number): Promise<Row[]> {
  return s.query<Row>(
    `SELECT d.id, d.clave, d.revision, d.titulo, x.distribuido_en FROM ${DISTRIBUCION} x INNER JOIN ${TABLE} d ON d.id = x.documento_id
     WHERE x.usuario_id = :u AND x.leido_en IS NULL AND d.estado = 'vigente' ORDER BY x.distribuido_en`,
    { u: usuarioId },
  );
}

export async function porLeer({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  return json({ items: await documentosPorLeer(s, userIdFromClaims(user) as number) });
}

/* Distribucion de un documento (quien ya confirmo), para la ficha. */
export async function distribucionDe(s: Session, documentoId: number): Promise<Row[]> {
  return s.query<Row>(`SELECT x.usuario_id, u.nombre, u.email, x.distribuido_en, x.leido_en FROM ${DISTRIBUCION} x LEFT JOIN usuarios u ON u.id = x.usuario_id WHERE x.documento_id = :doc ORDER BY u.nombre`, { doc: documentoId });
}

/* ---------- Alcance "autorizados" ---------- */

/* Con alcance "autorizados" (Estudiante) solo se ven los documentos vigentes distribuidos a la persona. */
export function soloAutorizados(auth: Autorizacion): boolean {
  const permiso = permisoDe(auth, "documentos", "V");
  return !!permiso && permiso.alcances.length > 0 && permiso.alcances.every((a) => a === "autorizados");
}

export async function documentosDistribuidosA(s: Session, usuarioId: number): Promise<number[]> {
  return (await s.query<{ documento_id: number }>(`SELECT DISTINCT documento_id FROM ${DISTRIBUCION} WHERE usuario_id = :u`, { u: usuarioId })).map((f) => Number(f.documento_id));
}

/* ---------- Propuestas ---------- */

/* POST /api/documentos-sgc/propuestas { tipo: nuevo|cambio, documento_id?, titulo, motivo } — documentos:V. */
export async function proponerDocumento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "V");
  const payload = await readJson(request);
  const tipo = String(payload.tipo || "nuevo") === "cambio" ? "cambio" : "nuevo";
  const motivo = String(payload.motivo || "").trim();
  if (motivo.length < 5) throw new HttpError(400, { message: "Indica el motivo de la propuesta (al menos 5 caracteres)" });
  let documentoId: number | null = null;
  let titulo = String(payload.titulo || "").trim().slice(0, 220);
  if (tipo === "cambio") {
    const doc = await snapshotRow(s, TABLE, Number(payload.documento_id) || 0);
    if (!doc || String(doc.estado) !== "vigente") throw new HttpError(409, { message: "Solo se solicitan cambios de un documento vigente" });
    documentoId = Number(doc.id);
    titulo = titulo || `Cambio a ${doc.clave}: ${doc.titulo}`;
  }
  if (!titulo) throw new HttpError(400, { message: "Indica el título del documento propuesto" });
  const id = await insertarPropuesta(s, user, { tipo, documentoId, titulo, motivo });
  await s.commit();
  return json({ message: tipo === "cambio" ? "Solicitud de cambio registrada" : "Propuesta de documento registrada", id }, 201);
}

/*
 * Inserta la propuesta y la deja en la bitacora. Fase 11: una NC puede crear su
 * propuesta de cambio documental (nc_id liga ambos sentidos).
 */
export async function insertarPropuesta(s: Session, user: CurrentUser, datos: { tipo: "nuevo" | "cambio"; documentoId: number | null; titulo: string; motivo: string; ncId?: number | null; ncFolio?: string | null }): Promise<number> {
  const r = await s.execute(`INSERT INTO ${PROPUESTAS} (tipo, documento_id, titulo, motivo, propuesto_por, propuesto_en, nc_id) VALUES (:tipo, :doc, :titulo, :motivo, :yo, :en, :nc)`, { tipo: datos.tipo, doc: datos.documentoId, titulo: datos.titulo, motivo: datos.motivo, yo: userIdFromClaims(user), en: new Date().toISOString(), nc: datos.ncId ?? null });
  await registrarAuditoria(s, user, { accion: "proponer", entidad: PROPUESTAS, entidadId: Number(r.lastrowid), referencia: datos.titulo, motivo: datos.motivo, detalle: { tipo: datos.tipo, documento_id: datos.documentoId, ...(datos.ncFolio ? { nc: datos.ncFolio } : {}) } });
  return Number(r.lastrowid);
}

/* GET /api/documentos-sgc/propuestas */
export async function listarPropuestas({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  // Fase 9: quien solo ve documentos distribuidos ("autorizados") no ve las propuestas.
  if (soloAutorizados(permiso.auth)) throw new HttpError(403, { message: "Las propuestas no están disponibles con tu alcance de documentos" });
  const filas = await s.query<Row>(
    `SELECT p.*, u.nombre AS propuesto_por_nombre, a.nombre AS asignado_nombre, d.clave AS documento_clave, n.folio_num AS nc_folio FROM ${PROPUESTAS} p
     LEFT JOIN usuarios u ON u.id = p.propuesto_por LEFT JOIN usuarios a ON a.id = p.asignado_a LEFT JOIN ${TABLE} d ON d.id = p.documento_id
     LEFT JOIN no_conformidades n ON n.id = p.nc_id
     ORDER BY p.estado = 'pendiente' DESC, p.id DESC LIMIT 300`,
  );
  return json({ items: filas });
}

/*
 * POST /api/documentos-sgc/propuestas/:id/aceptar { asignado_a, clave?, tipo?, area?, requiere_revision_tecnica? } — documentos:G.
 * Crea el borrador (nuevo) o la nueva revision (cambio) y lo asigna a quien elabora.
 */
export async function aceptarPropuesta({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "G");
  const propuesta = await s.queryOne<Row>(`SELECT * FROM ${PROPUESTAS} WHERE id = :id`, { id: intParam(params.id) });
  if (!propuesta) throw new HttpError(404, { message: "Propuesta no encontrada" });
  if (String(propuesta.estado) !== "pendiente") throw new HttpError(409, { message: `La propuesta ya está ${propuesta.estado}` });
  const payload = await readJson(request);
  const asignado = Number(payload.asignado_a) || 0;
  const persona = await s.queryOne<Row>("SELECT id, nombre FROM usuarios WHERE id = :id AND COALESCE(activo, 1) = 1", { id: asignado });
  if (!persona) throw new HttpError(400, { message: "Elige a quien elaborará el documento (cuenta activa)" });
  const yo = userIdFromClaims(user) as number;
  const requiere = payload.requiere_revision_tecnica === true || String(payload.requiere_revision_tecnica) === "1" ? 1 : 0;
  let base: Row;
  if (String(propuesta.tipo) === "cambio") {
    const original = await snapshotRow(s, TABLE, Number(propuesta.documento_id));
    if (!original) throw new HttpError(404, { message: "El documento de la propuesta ya no existe" });
    const enCurso = await s.scalar(`SELECT id FROM ${TABLE} WHERE clave = :clave AND estado IN ('borrador', 'revision_calidad', 'revision_tecnica', 'por_aprobar', 'aprobado')`, { clave: original.clave });
    if (enCurso) throw new HttpError(409, { message: `Ya hay una revisión de ${original.clave} en curso` });
    const revision = Number((await s.scalar(`SELECT COALESCE(MAX(revision), 0) + 1 FROM ${TABLE} WHERE clave = :clave`, { clave: original.clave })) || 1);
    base = { clave: original.clave, revision, titulo: original.titulo, tipo: original.tipo, area: original.area, es_externo: original.es_externo, descripcion: original.descripcion, distribucion: original.distribucion, reemplaza_id: original.id, requiere: requiere || Number(original.requiere_revision_tecnica || 0) };
  } else {
    const clave = String(payload.clave || "").trim().toUpperCase();
    const deClave = parseDocumentKey(clave);
    const tipo = String(deClave?.tipo || payload.tipo || "").trim().toUpperCase();
    const area = String(deClave?.area || payload.area || "").trim().toUpperCase();
    if (!DOCUMENT_KEY_RE.test(clave) || !tipo || !area) throw new HttpError(400, { message: "Para un documento nuevo indica una clave válida (FX-<área><tipo>-<siglas>, p. ej. FX-TCP-EJ)" });
    if (await s.scalar(`SELECT id FROM ${TABLE} WHERE clave = :clave LIMIT 1`, { clave })) throw new HttpError(409, { message: `La clave ${clave} ya existe; usa "Solicitar cambio" sobre ese documento` });
    base = { clave, revision: 1, titulo: propuesta.titulo, tipo, area, es_externo: tipo === "E" ? 1 : 0, descripcion: propuesta.motivo, distribucion: null, reemplaza_id: null, requiere };
  }
  // El borrador queda a nombre de quien elabora (creado_por = asignado_a), para que la segregacion lo trate como elaborador.
  const r = await s.execute(
    `INSERT INTO ${TABLE} (clave, revision, titulo, tipo, area, es_externo, descripcion, cambios, distribucion, reemplaza_id, requiere_revision_tecnica, asignado_a, elaboro_json, estado, creado_por, actualizado_por)
     VALUES (:clave, :revision, :titulo, :tipo, :area, :es_externo, :descripcion, :cambios, :distribucion, :reemplaza_id, :requiere, :asignado, :elaboro, 'borrador', :asignado, :asignado)`,
    { ...base, cambios: propuesta.motivo, asignado, elaboro: JSON.stringify({ nombre: persona.nombre, usuario_id: asignado }) },
  );
  const docId = Number(r.lastrowid);
  await s.execute(`UPDATE ${PROPUESTAS} SET estado = 'aceptada', resuelto_por = :yo, resuelto_en = :en, motivo_resolucion = :motivo, asignado_a = :asignado, documento_creado_id = :doc WHERE id = :id`, { yo, en: new Date().toISOString(), motivo: String(payload.motivo || "").trim() || null, asignado, doc: docId, id: propuesta.id });
  const despues = await snapshotRow(s, TABLE, docId);
  await registrarAuditoria(s, user, { accion: "aceptar", entidad: TABLE, entidadId: docId, referencia: docRef(despues), despues, detalle: { propuesta_id: propuesta.id, asignado_a: asignado, elabora: persona.nombre } });
  await s.commit();
  return json({ message: `Propuesta aceptada: ${docRef(despues)} en borrador, asignado a ${persona.nombre}`, documento_id: docId }, 201);
}

/* POST /api/documentos-sgc/propuestas/:id/rechazar { motivo } — documentos:G. */
export async function rechazarPropuesta({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "G");
  const propuesta = await s.queryOne<Row>(`SELECT * FROM ${PROPUESTAS} WHERE id = :id`, { id: intParam(params.id) });
  if (!propuesta) throw new HttpError(404, { message: "Propuesta no encontrada" });
  if (String(propuesta.estado) !== "pendiente") throw new HttpError(409, { message: `La propuesta ya está ${propuesta.estado}` });
  const motivo = String((await readJson(request)).motivo || "").trim();
  if (motivo.length < 5) throw new HttpError(400, { message: "Indica el motivo del rechazo (al menos 5 caracteres)" });
  await s.execute(`UPDATE ${PROPUESTAS} SET estado = 'rechazada', resuelto_por = :yo, resuelto_en = :en, motivo_resolucion = :motivo WHERE id = :id`, { yo: userIdFromClaims(user), en: new Date().toISOString(), motivo, id: propuesta.id });
  await registrarAuditoria(s, user, { accion: "rechazar", entidad: PROPUESTAS, entidadId: Number(propuesta.id), referencia: String(propuesta.titulo), motivo });
  await s.commit();
  return json({ message: "Propuesta rechazada" });
}
