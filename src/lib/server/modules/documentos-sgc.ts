import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireUser, userIdFromClaims, type CurrentUser } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { getConfig } from "../config";
import { isIntegrityError, type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { requirePermission } from "../rbac";
import { exigirReauth } from "../seguridad";
import { crearSolicitud, detalleSolicitud, respuestaSolicitud, type ContextoEjecucion } from "../solicitudes";
import { detalleExcepcion, elaboradoresDe, excepcionesDe, exigirSegregacion } from "../segregacion";
import { evaluarDocumento, type Violacion } from "../../shared/segregacion";
import { formatearFecha, hoyLocal } from "../../shared/fechas";
import { distribucionDe, documentosDistribuidosA, soloAutorizados } from "./documentos-flujo";

import { readMotivo } from "../samples-flow";
import { DOCUMENT_AREAS, DOCUMENT_KEY_RE, DOCUMENT_REVIEW_YEARS, DOCUMENT_TYPES, parseDocumentKey } from "../../shared/sgc";
import { secureFilename } from "./documents";
import { searchParam, strippedOrNull, toIntOrNull } from "./helpers";

/*
 * Control de documentos del SGC (ISO/IEC 17025 8.3; FX-GCP-CD, FX-GCL-MD).
 *
 * Cada fila es una revision de un documento (clave + revision). Ciclo (Fase 7):
 * borrador -> revision_calidad -> revision_tecnica (si la requiere) ->
 * por_aprobar -> aprobado -> vigente -> obsoleto (o cancelado). Cada revisor
 * puede devolver a borrador. Solo hay una revision vigente por clave: al
 * publicar una nueva, la anterior pasa a obsoleto y se conserva. La lista
 * maestra es la vista de las revisiones vigentes. Revision, publicacion,
 * propuestas y distribucion viven en documentos-flujo.ts.
 */

const TABLE = "documentos_sgc";
const TYPES = new Set(DOCUMENT_TYPES.map((item) => item.value));
const AREAS = new Set(DOCUMENT_AREAS.map((item) => item.value));

function filesDir(): string {
  const folder = path.join(getConfig().INSTANCE_DIR, "documentos_sgc");
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

const ALLOWED_EXT = new Set([".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".txt"]);

export function serializeDocumento(row: Row): Row {
  row = { ...row, excepciones: excepcionesDe(row), excepciones_json: undefined };
  const item: Row = { ...row };
  for (const key of ["elaboro", "reviso", "aprobo", "revision_tecnica", "publico"]) {
    item[key] = safeParse(item[`${key}_json`]);
    delete item[`${key}_json`];
  }
  item.referencia = `${row.clave} rev. ${row.revision}`;
  item.archivo_url = row.archivo_nombre ? `/api/documentos-sgc/${row.id}/archivo` : null;
  return item;
}

function safeParse(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function persona(raw: unknown, fallback: { nombre?: string | null } = {}) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  return {
    nombre: strippedOrNull(value.nombre, 180) || fallback.nombre || null,
    cargo: strippedOrNull(value.cargo, 120),
    fecha: strippedOrNull(value.fecha, 10),
    firma: strippedOrNull(value.firma),
  };
}

function addYears(date: string | null, years: number): string | null {
  if (!date) return null;
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${Number(match[1]) + years}-${match[2]}-${match[3]}`;
}

/* Metadatos desde JSON o multipart (el archivo solo viene por multipart). */
async function readPayload(request: Request): Promise<{ data: Record<string, unknown>; file: File | null }> {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (contentType.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (value instanceof File) continue;
      if (key.endsWith("_json") || key === "elaboro" || key === "reviso" || key === "aprobo") {
        try {
          data[key.replace(/_json$/, "")] = JSON.parse(String(value));
        } catch {
          data[key.replace(/_json$/, "")] = null;
        }
      } else {
        data[key] = value;
      }
    }
    const file = form.get("archivo");
    return { data, file: file instanceof File && file.name ? file : null };
  }
  return { data: await readJson(request), file: null };
}

function normalize(data: Record<string, unknown>, existing: Row | null) {
  const clave = String(data.clave ?? existing?.clave ?? "").trim().toUpperCase();
  // La clave manda: tipo y area se derivan de ella; el cuerpo solo cuenta si la clave no los codifica (FX-MC).
  const parsed = parseDocumentKey(clave);
  const tipo = String(parsed?.tipo || data.tipo || existing?.tipo || "").trim().toUpperCase();
  const area = String(parsed?.area || data.area || existing?.area || "").trim().toUpperCase();
  const fechaEmision = strippedOrNull(data.fecha_emision, 10) ?? (existing?.fecha_emision as string | null) ?? null;
  return {
    clave,
    titulo: strippedOrNull(data.titulo, 220) ?? (existing?.titulo as string | null) ?? null,
    tipo: TYPES.has(tipo) ? tipo : "",
    area: AREAS.has(area) ? area : "",
    es_externo: data.es_externo === true || String(data.es_externo) === "1" || String(data.es_externo) === "true" ? 1 : tipo === "E" ? 1 : 0,
    origen_externo: strippedOrNull(data.origen_externo, 180),
    descripcion: strippedOrNull(data.descripcion),
    cambios: strippedOrNull(data.cambios),
    fecha_emision: fechaEmision,
    fecha_vigencia: strippedOrNull(data.fecha_vigencia, 10) ?? (existing?.fecha_vigencia as string | null) ?? null,
    fecha_proxima_revision: strippedOrNull(data.fecha_proxima_revision, 10) ?? (existing?.fecha_proxima_revision as string | null) ?? addYears(fechaEmision, DOCUMENT_REVIEW_YEARS),
    elaboro_json: JSON.stringify(persona(data.elaboro ?? safeParse(existing?.elaboro_json))),
    reviso_json: JSON.stringify(persona(data.reviso ?? safeParse(existing?.reviso_json))),
    distribucion: strippedOrNull(data.distribucion),
    requiere_revision_tecnica: data.requiere_revision_tecnica === undefined ? Number(existing?.requiere_revision_tecnica || 0) : data.requiere_revision_tecnica === true || ["1", "true"].includes(String(data.requiere_revision_tecnica)) ? 1 : 0,
  };
}

function validate(data: ReturnType<typeof normalize>): string | null {
  if (!data.clave) return "La clave del documento es obligatoria";
  if (!DOCUMENT_KEY_RE.test(data.clave) && data.clave !== "FX-MC") return "La clave debe seguir el formato FX-<area><tipo>-<siglas> (ej. FX-GCP-CD, FX-TCF-GMR)";
  if (!data.titulo) return "El titulo es obligatorio";
  if (!data.tipo) return "Selecciona el tipo de documento";
  if (!data.area) return "Selecciona el area del documento";
  return null;
}

async function storeFile(file: File): Promise<{ archivo_nombre: string; archivo_original: string; archivo_sha256: string }> {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw new HttpError(400, { message: "Formato de archivo no permitido (PDF, Word, Excel, PowerPoint o texto)" });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new HttpError(400, { message: "El archivo esta vacio" });
  const original = secureFilename(file.name) || `documento${ext}`;
  const stored = `${randomUUID().replace(/-/g, "")}_${original}`;
  await fs.promises.writeFile(path.join(filesDir(), stored), buffer);
  return { archivo_nombre: stored, archivo_original: original, archivo_sha256: createHash("sha256").update(buffer).digest("hex") };
}

function docRef(row: Row | null | undefined): string {
  return row ? `${row.clave}-${row.revision}` : "";
}

export async function listDocumentos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  // Fase 7: con alcance "autorizados" solo los documentos vigentes distribuidos a la persona.
  const autorizados = soloAutorizados(permiso.auth) ? await documentosDistribuidosA(s, permiso.auth.userId) : null;
  const search = searchParam(request, "search");
  const estado = searchParam(request, "estado");
  const tipo = searchParam(request, "tipo").toUpperCase();
  const area = searchParam(request, "area").toUpperCase();
  const clave = searchParam(request, "clave").toUpperCase();
  const rows = await s.query(
    `
    SELECT id, clave, revision, titulo, tipo, area, es_externo, fecha_emision, fecha_vigencia, fecha_proxima_revision,
           estado, archivo_nombre, archivo_original, reemplaza_id, aprobo_json, creado_en, actualizado_en
    FROM ${TABLE}
    WHERE (:estado = '' OR estado = :estado)
      AND (:tipo = '' OR tipo = :tipo)
      AND (:area = '' OR area = :area)
      AND (:clave = '' OR clave = :clave)
      AND (:search = '' OR clave LIKE :search_like OR titulo LIKE :search_like OR descripcion LIKE :search_like)
      ${autorizados ? `AND estado = 'vigente' AND id IN (${autorizados.join(", ") || "0"})` : ""}
    ORDER BY clave ASC, revision DESC
    LIMIT 800
    `,
    { search, search_like: `%${search}%`, estado, tipo, area, clave },
  );
  return json({ items: rows.map(serializeDocumento), total: rows.length });
}

/* Lista maestra (FX-GCL-MD): revision vigente de cada clave, con proxima revision. */
export async function listaMaestra({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  const autorizados = soloAutorizados(permiso.auth) ? await documentosDistribuidosA(s, permiso.auth.userId) : null;
  const rows = await s.query(
    `
    SELECT d.id, d.clave, d.revision, d.titulo, d.tipo, d.area, d.es_externo, d.fecha_emision, d.fecha_vigencia, d.fecha_proxima_revision,
           d.estado, d.archivo_nombre, d.archivo_original, d.aprobo_json, d.elaboro_json, d.distribucion,
           (SELECT COUNT(*) FROM ${TABLE} o WHERE o.clave = d.clave AND o.estado = 'obsoleto') AS revisiones_obsoletas,
           (SELECT COUNT(*) FROM ${TABLE} b WHERE b.clave = d.clave AND b.estado IN ('borrador', 'revision_calidad', 'revision_tecnica', 'por_aprobar', 'aprobado')) AS revisiones_en_curso
    FROM ${TABLE} d
    WHERE d.estado = 'vigente' ${autorizados ? `AND d.id IN (${autorizados.join(", ") || "0"})` : ""}
    ORDER BY d.area, d.tipo, d.clave
    `,
  );
  const today = hoyLocal();
  // Fase 7: exportable a CSV (clave, version, estado, vigencia, responsable y ubicacion).
  if (searchParam(request, "formato") === "csv") {
    // Una celda que empieza con =, +, -, @, tab o retorno se neutraliza con ' (inyeccion de formulas en hojas de calculo).
    const celda = (v: unknown) => {
      const texto = String(v ?? "");
      return `"${(/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto).replace(/"/g, '""')}"`;
    };
    const lineas = [["Clave", "Revisión", "Título", "Estado", "Fecha de vigencia", "Próxima revisión", "Responsable (elaboró)", "Aprobó", "Ubicación"].map(celda).join(",")];
    for (const row of rows) {
      const elaboro = safeParse(row.elaboro_json);
      const aprobo = safeParse(row.aprobo_json);
      lineas.push([row.clave, row.revision, row.titulo, row.estado, row.fecha_vigencia ? formatearFecha(row.fecha_vigencia) : "", row.fecha_proxima_revision ? formatearFecha(row.fecha_proxima_revision) : "", elaboro?.nombre, aprobo?.nombre, row.distribucion || (row.archivo_original ? `Plataforma: ${row.archivo_original}` : "")].map(celda).join(","));
    }
    return new Response(`\uFEFF${lineas.join("\r\n")}\r\n`, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lista-maestra-${today}.csv"` } });
  }
  return json({
    items: rows.map((row) => ({ ...serializeDocumento(row), revision_vencida: !!row.fecha_proxima_revision && String(row.fecha_proxima_revision) < today })),
    total: rows.length,
    generada_en: new Date().toISOString(),
  });
}

export async function documentosSummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  const today = hoyLocal();
  // Fase 9: estados del flujo de la Fase 7; con alcance "autorizados", solo los vigentes distribuidos.
  if (soloAutorizados(permiso.auth)) {
    const ids = await documentosDistribuidosA(s, permiso.auth.userId);
    const vigentes = ids.length ? Number((await s.scalar(`SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'vigente' AND id IN (${ids.join(", ")})`)) || 0) : 0;
    return json({ vigentes, borrador: 0, en_revision: 0, por_aprobar: 0, aprobado: 0, obsoletos: 0, revision_vencida: 0 });
  }
  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'vigente') AS vigentes,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'borrador') AS borrador,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado IN ('revision_calidad', 'revision_tecnica')) AS en_revision,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'por_aprobar') AS por_aprobar,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'aprobado') AS aprobado,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'obsoleto') AS obsoletos,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'vigente' AND fecha_proxima_revision IS NOT NULL AND fecha_proxima_revision < :today) AS revision_vencida
    `,
    { today },
  );
  return json(summary || {});
}

export async function getDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  const row = await snapshotRow(s, TABLE, id);
  if (!row) return json({ message: "Documento no encontrado" }, 404);
  // Fase 7: con alcance "autorizados" solo un vigente distribuido a la persona, sin versiones anteriores.
  const autorizados = soloAutorizados(permiso.auth);
  if (autorizados && (String(row.estado) !== "vigente" || !(await documentosDistribuidosA(s, permiso.auth.userId)).includes(id))) return json({ message: "Documento no encontrado" }, 404);
  const revisiones = autorizados ? [] : await s.query(`SELECT id, revision, estado, fecha_emision, fecha_vigencia, cambios FROM ${TABLE} WHERE clave = :clave ORDER BY revision DESC`, { clave: row.clave });
  const distribucion = await distribucionDe(s, id);
  const mia = distribucion.find((d) => Number(d.usuario_id) === permiso.auth.userId) || null;
  return json({ item: { ...serializeDocumento(row), revisiones, distribucion_lectura: autorizados ? [] : distribucion, mi_distribucion: mia } });
}

export async function createDocumento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "C", { objeto: "documento", borrador: true });
  const { data, file } = await readPayload(request);
  const normalized = normalize(data, null);
  const invalid = validate(normalized);
  if (invalid) return json({ message: invalid }, 400);
  // La revision la asigna el servidor: solo el primer registro de una clave puede declarar
  // la revision con la que llega (documentos ya existentes en papel); despues, +1 y sin
  // dos revisiones en curso.
  const previas = Number((await s.scalar(`SELECT COUNT(*) FROM ${TABLE} WHERE clave = :clave`, { clave: normalized.clave })) || 0);
  let revision = 1;
  if (previas === 0) {
    revision = toIntOrNull(data.revision) || 1;
  } else {
    const enCurso = await s.queryOne<{ revision: number }>(`SELECT revision FROM ${TABLE} WHERE clave = :clave AND estado IN ('borrador', 'revision_calidad', 'revision_tecnica', 'por_aprobar', 'aprobado')`, { clave: normalized.clave });
    if (enCurso) return json({ message: `Ya existe la revision ${enCurso.revision} de ${normalized.clave} en curso` }, 409);
    revision = Number((await s.scalar(`SELECT COALESCE(MAX(revision), 0) + 1 FROM ${TABLE} WHERE clave = :clave`, { clave: normalized.clave })) || 1);
  }
  const stored = file ? await storeFile(file) : { archivo_nombre: null, archivo_original: null, archivo_sha256: null };
  const userId = userIdFromClaims(user);
  try {
    const result = await s.execute(
      `
      INSERT INTO ${TABLE} (clave, revision, titulo, tipo, area, es_externo, origen_externo, descripcion, cambios, fecha_emision, fecha_vigencia, fecha_proxima_revision,
        elaboro_json, reviso_json, distribucion, requiere_revision_tecnica, archivo_nombre, archivo_original, archivo_sha256, estado, creado_por, actualizado_por)
      VALUES (:clave, :revision, :titulo, :tipo, :area, :es_externo, :origen_externo, :descripcion, :cambios, :fecha_emision, :fecha_vigencia, :fecha_proxima_revision,
        :elaboro_json, :reviso_json, :distribucion, :requiere_revision_tecnica, :archivo_nombre, :archivo_original, :archivo_sha256, 'borrador', :creado_por, :actualizado_por)
      `,
      { ...normalized, ...stored, revision, creado_por: userId, actualizado_por: userId },
    );
    const id = result.lastrowid as number;
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: docRef(despues), despues });
    await s.commit();
    return json({ message: "Documento registrado en borrador", id, revision }, 201);
  } catch (error) {
    await s.rollback();
    if (isIntegrityError(error)) return json({ message: `Ya existe la revision ${revision} de ${normalized.clave}` }, 409);
    throw error;
  }
}

export async function updateDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "E", { objeto: "documento", borrador: true });
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "borrador") return json({ message: "Solo se editan documentos en borrador (un revisor puede devolverlo); para cambiar uno vigente crea una nueva revision" }, 409);
  const { data, file } = await readPayload(request);
  const normalized = normalize(data, antes);
  const invalid = validate(normalized);
  if (invalid) return json({ message: invalid }, 400);
  const stored = file ? await storeFile(file) : null;
  await s.execute(
    `
    UPDATE ${TABLE} SET titulo = :titulo, tipo = :tipo, area = :area, es_externo = :es_externo, origen_externo = :origen_externo, descripcion = :descripcion, cambios = :cambios,
      fecha_emision = :fecha_emision, fecha_vigencia = :fecha_vigencia, fecha_proxima_revision = :fecha_proxima_revision, elaboro_json = :elaboro_json, reviso_json = :reviso_json,
      distribucion = :distribucion, requiere_revision_tecnica = :requiere_revision_tecnica, estado = 'borrador', actualizado_por = :actualizado_por
      ${stored ? ", archivo_nombre = :archivo_nombre, archivo_original = :archivo_original, archivo_sha256 = :archivo_sha256" : ""}
    WHERE id = :id
    `,
    { ...normalized, ...(stored || {}), id, actualizado_por: userIdFromClaims(user) },
  );
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues });
  await s.commit();
  return json({ message: "Documento actualizado" });
}

export async function deleteDocumento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "AN");
  throw new HttpError(405, { message: "Los documentos controlados no se eliminan: cancele el borrador o declare obsoleta la revision" });
}

export async function enviarRevision({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "E", { objeto: "documento", borrador: true });
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "borrador") return json({ message: "Solo los borradores se envian a revision" }, 409);
  if (!antes.archivo_nombre && !antes.es_externo) return json({ message: "Adjunta el archivo del documento antes de enviarlo a revision" }, 400);
  // Fase 7: quien elabora lo envia a la revision de calidad (enviar no es revisar).
  const yo = userIdFromClaims(user) as number;
  await s.execute(`UPDATE ${TABLE} SET estado = 'revision_calidad', devolucion_observaciones = NULL, actualizado_por = :usuario WHERE id = :id`, { usuario: yo, id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "enviar_revision", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues });
  await s.commit();
  return json({ message: "Documento enviado a revisión de calidad", item: serializeDocumento(despues!) });
}

/*
 * Excepcion de segregacion (Fase 3): solo la pide quien podria revisar (enviar a
 * revision) o aprobar el documento (permiso y estado) y la segregacion se lo impide.
 */
export async function violacionParaExcepcionDocumento(s: Session, user: CurrentUser, id: number, accion: string): Promise<{ violacion: Violacion | null; row: Row }> {
  if (accion !== "revisar" && accion !== "aprobar") throw new HttpError(400, { message: "En un documento la excepción aplica a revisar o aprobar" });
  if (accion === "revisar") await requirePermission(s, user, "documentos", "G");
  else await requirePermission(s, user, "documentos", "A");
  const row = await snapshotRow(s, TABLE, id);
  if (!row) throw new HttpError(404, { message: "Documento no encontrado" });
  const estado = accion === "revisar" ? "revision_calidad" : "por_aprobar";
  if (String(row.estado) !== estado) throw new HttpError(409, { message: `El documento no está ${accion === "revisar" ? "en revisión de calidad" : "por aprobar"}; no hay nada que ${accion}` });
  const revisorId = accion === "aprobar" ? Number((safeParse(row.reviso_json) as { usuario_id?: unknown } | null)?.usuario_id) || null : null;
  return { violacion: evaluarDocumento(userIdFromClaims(user) as number, await elaboradoresDe(s, TABLE, id, row.creado_por), revisorId, accion), row };
}

/*
 * Fase 7: aprobacion (por_aprobar -> aprobado) con documentos:A y reautenticacion.
 * Ni quien elaboro ni quien hizo la revision de calidad aprueban. La revision
 * queda vigente al publicarla (documentos-flujo.ts).
 */
export async function aprobarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "A");
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "por_aprobar") return json({ message: "Solo se aprueban documentos por aprobar (con sus revisiones terminadas)" }, 409);
  if (!antes.archivo_nombre && !Number(antes.es_externo)) return json({ message: "El documento no tiene archivo adjunto; no puede aprobarse sin el" }, 409);
  const payload = await readJson(request);
  // Segregacion (regla 5): ni quien elaboro ni quien hizo la revision de calidad aprueban el documento.
  const yo = userIdFromClaims(user) as number;
  const revisorId = Number((safeParse(antes.reviso_json) as { usuario_id?: unknown } | null)?.usuario_id) || null;
  const excepcion = exigirSegregacion(evaluarDocumento(yo, await elaboradoresDe(s, TABLE, id, antes.creado_por, antes.asignado_a), revisorId, "aprobar"), antes, yo, "aprobar");
  await exigirReauth(s, request, user, "documentos:A");
  const aprobo = { ...persona(payload.aprobo, { nombre: String(user.nombre || user.email || "") }), fecha: hoyLocal(), usuario_id: yo };
  await s.execute(`UPDATE ${TABLE} SET estado = 'aprobado', aprobo_json = :aprobo, actualizado_por = :usuario WHERE id = :id`, { aprobo: JSON.stringify(aprobo), usuario: yo, id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "aprobar", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues, detalle: detalleExcepcion(excepcion) });
  await s.commit();
  return json({ message: "Documento aprobado; falta publicarlo", item: serializeDocumento(despues!) });
}

/* Fase 7: declarar obsoleto sin reemplazo: documentos:G pide y aprueba alguien con documentos:A (solicitud). */
export async function obsoletarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "G");
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "vigente") return json({ message: "Solo un documento vigente se declara obsoleto" }, 409);
  await exigirReauth(s, request, user, "documentos:G");
  const solicitud = await crearSolicitud(s, user, { tipo: "obsoletar_documento", entidad: TABLE, entidadId: id, referencia: docRef(antes), accion: "obsoletar", motivo });
  await s.commit();
  return respuestaSolicitud(solicitud, `declarar obsoleto ${docRef(antes)}`);
}

/* Ejecutor de la solicitud aprobada: el documento vigente pasa a obsoleto (se conserva). */
export async function ejecutarObsoletarDocumento(ctx: ContextoEjecucion): Promise<Record<string, unknown>> {
  const id = Number(ctx.solicitud.entidad_id);
  const antes = await snapshotRow(ctx.s, TABLE, id);
  if (!antes || String(antes.estado) !== "vigente") throw new HttpError(409, { message: "El documento ya no está vigente" });
  await ctx.s.execute(`UPDATE ${TABLE} SET estado = 'obsoleto', motivo_estado = :motivo, actualizado_por = :usuario WHERE id = :id`, { motivo: ctx.solicitud.motivo, usuario: userIdFromClaims(ctx.user), id });
  const despues = await snapshotRow(ctx.s, TABLE, id);
  await registrarAuditoria(ctx.s, ctx.user, { accion: "baja", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues, motivo: ctx.solicitud.motivo, detalle: detalleSolicitud(ctx.solicitud) });
  return { item: serializeDocumento(despues!) };
}

export async function cancelarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "AN");
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (!["borrador", "revision_calidad", "revision_tecnica", "por_aprobar", "aprobado"].includes(String(antes.estado))) return json({ message: "Solo se cancelan borradores o revisiones en curso" }, 409);
  await exigirReauth(s, request, user, "documentos:AN");
  await s.execute(`UPDATE ${TABLE} SET estado = 'cancelado', motivo_estado = :motivo, actualizado_por = :usuario WHERE id = :id`, { motivo, usuario: userIdFromClaims(user), id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "anular", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues, motivo });
  await s.commit();
  return json({ message: "Borrador cancelado", item: serializeDocumento(despues!) });
}

/* Nueva revision de un documento vigente u obsoleto: copia en borrador con revision +1. */
export async function nuevaRevision({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "C", { objeto: "documento", borrador: true });
  const original = await snapshotRow(s, TABLE, id);
  if (!original) return json({ message: "Documento no encontrado" }, 404);
  // Una revision nueva parte de una que llego a estar vigente (FX-MC 8.3): un
  // borrador cancelado no genera descendencia.
  if (!["vigente", "obsoleto"].includes(String(original.estado))) {
    return json({ message: "Solo se crean revisiones a partir de un documento vigente u obsoleto" }, 409);
  }
  const enCurso = await s.queryOne(`SELECT id, revision FROM ${TABLE} WHERE clave = :clave AND estado IN ('borrador', 'revision_calidad', 'revision_tecnica', 'por_aprobar', 'aprobado')`, { clave: original.clave });
  if (enCurso) return json({ message: `Ya existe la revision ${enCurso.revision} de ${original.clave} en curso` }, 409);
  const payload = await readJson(request);
  const revision = Number((await s.scalar(`SELECT COALESCE(MAX(revision), 0) + 1 FROM ${TABLE} WHERE clave = :clave`, { clave: original.clave })) || 1);
  const userId = userIdFromClaims(user);
  const result = await s.execute(
    `
    INSERT INTO ${TABLE} (clave, revision, titulo, tipo, area, es_externo, origen_externo, descripcion, cambios, fecha_emision, distribucion, elaboro_json, reemplaza_id, estado, creado_por, actualizado_por)
    VALUES (:clave, :revision, :titulo, :tipo, :area, :es_externo, :origen_externo, :descripcion, :cambios, NULL, :distribucion, :elaboro_json, :reemplaza_id, 'borrador', :usuario, :usuario)
    `,
    {
      clave: original.clave,
      revision,
      titulo: original.titulo,
      tipo: original.tipo,
      area: original.area,
      es_externo: original.es_externo,
      origen_externo: original.origen_externo,
      descripcion: original.descripcion,
      cambios: strippedOrNull(payload.cambios) || null,
      distribucion: original.distribucion,
      elaboro_json: JSON.stringify(persona(payload.elaboro, { nombre: String(user.nombre || "") })),
      reemplaza_id: id,
      usuario: userId,
    },
  );
  const nuevoId = result.lastrowid as number;
  const despues = await snapshotRow(s, TABLE, nuevoId);
  await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: nuevoId, referencia: docRef(despues), despues, detalle: { nueva_revision_de: id } });
  await s.commit();
  return json({ message: `Revision ${revision} creada en borrador`, id: nuevoId, revision }, 201);
}

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
};

export async function getDocumentoArchivo({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "documentos", "V");
  const row = await snapshotRow(s, TABLE, id);
  if (!row || !row.archivo_nombre) return json({ message: "Archivo no encontrado" }, 404);
  // Fase 9: con alcance "autorizados" solo se descargan documentos vigentes distribuidos a la persona.
  if (soloAutorizados(permiso.auth) && (String(row.estado) !== "vigente" || !(await documentosDistribuidosA(s, permiso.auth.userId)).includes(id))) return json({ message: "Este documento no te fue distribuido" }, 403);
  const target = path.resolve(filesDir(), String(row.archivo_nombre));
  if (!target.startsWith(filesDir() + path.sep) || !fs.existsSync(target)) return json({ message: "Archivo no encontrado" }, 404);
  const data = await fs.promises.readFile(target);
  await registrarAuditoria(s, user, { accion: "descargar", entidad: TABLE, entidadId: id, referencia: docRef(row) });
  await s.commit();
  const ext = path.extname(target).toLowerCase();
  const marca = String(row.estado) === "vigente" ? "" : `${String(row.estado).toUpperCase()}_`;
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": String(data.length), "Content-Disposition": `inline; filename="${marca}${row.clave}-${row.revision}${ext}"` },
  });
}
