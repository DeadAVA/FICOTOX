import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireUser, userIdFromClaims } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { getConfig } from "../config";
import { isIntegrityError, isSqlite, type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { requirePermission } from "../rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../schema";
import { readMotivo } from "../samples-flow";
import { DOCUMENT_AREAS, DOCUMENT_KEY_RE, DOCUMENT_REVIEW_YEARS, DOCUMENT_TYPES, parseDocumentKey } from "../../shared/sgc";
import { secureFilename } from "./documents";
import { searchParam, strippedOrNull, toIntOrNull } from "./helpers";

/*
 * Control de documentos del SGC (ISO/IEC 17025 8.3; FX-GCP-CD, FX-GCL-MD).
 *
 * Cada fila es una revision de un documento (clave + revision). Ciclo:
 * borrador -> en_revision -> vigente -> obsoleto (o cancelado). Solo hay una
 * revision vigente por clave: al aprobar una nueva, la anterior pasa a
 * obsoleto automaticamente y se conserva. La lista maestra es la vista de
 * las revisiones vigentes.
 */

const TABLE = "documentos_sgc";
const TYPES = new Set(DOCUMENT_TYPES.map((item) => item.value));
const AREAS = new Set(DOCUMENT_AREAS.map((item) => item.value));

export async function ensureDocumentosSgcSchema(s: Session): Promise<void> {
  if (schemaReady("documentos_sgc")) return;
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS documentos_sgc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave VARCHAR(40) NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        titulo VARCHAR(220) NOT NULL,
        tipo VARCHAR(2) NOT NULL,
        area VARCHAR(4) NOT NULL,
        es_externo INTEGER NOT NULL DEFAULT 0,
        origen_externo VARCHAR(180) DEFAULT NULL,
        descripcion TEXT,
        cambios TEXT,
        fecha_emision DATE DEFAULT NULL,
        fecha_vigencia DATE DEFAULT NULL,
        fecha_proxima_revision DATE DEFAULT NULL,
        elaboro_json TEXT,
        reviso_json TEXT,
        aprobo_json TEXT,
        distribucion TEXT,
        archivo_nombre VARCHAR(255) DEFAULT NULL,
        archivo_original VARCHAR(255) DEFAULT NULL,
        archivo_sha256 VARCHAR(64) DEFAULT NULL,
        reemplaza_id INTEGER DEFAULT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        motivo_estado TEXT,
        creado_por INTEGER DEFAULT NULL,
        actualizado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (clave, revision)
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS documentos_sgc (
        id INT NOT NULL AUTO_INCREMENT,
        clave VARCHAR(40) NOT NULL,
        revision INT NOT NULL DEFAULT 1,
        titulo VARCHAR(220) NOT NULL,
        tipo VARCHAR(2) NOT NULL,
        area VARCHAR(4) NOT NULL,
        es_externo TINYINT(1) NOT NULL DEFAULT 0,
        origen_externo VARCHAR(180) DEFAULT NULL,
        descripcion TEXT,
        cambios TEXT,
        fecha_emision DATE DEFAULT NULL,
        fecha_vigencia DATE DEFAULT NULL,
        fecha_proxima_revision DATE DEFAULT NULL,
        elaboro_json LONGTEXT,
        reviso_json LONGTEXT,
        aprobo_json LONGTEXT,
        distribucion TEXT,
        archivo_nombre VARCHAR(255) DEFAULT NULL,
        archivo_original VARCHAR(255) DEFAULT NULL,
        archivo_sha256 VARCHAR(64) DEFAULT NULL,
        reemplaza_id INT DEFAULT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        motivo_estado TEXT,
        creado_por INT DEFAULT NULL,
        actualizado_por INT DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_documentos_sgc_clave_revision (clave, revision),
        KEY idx_documentos_sgc_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, TABLE, "archivo_sha256", "VARCHAR(64) DEFAULT NULL");
  markSchemaReady("documentos_sgc");
}

function filesDir(): string {
  const folder = path.join(getConfig().INSTANCE_DIR, "documentos_sgc");
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

const ALLOWED_EXT = new Set([".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".txt"]);

export function serializeDocumento(row: Row): Row {
  const item: Row = { ...row };
  for (const key of ["elaboro", "reviso", "aprobo"]) {
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
  await requirePermission(s, user, "documentos", "read");
  await ensureDocumentosSgcSchema(s);
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
  await requirePermission(s, user, "documentos", "read");
  await ensureDocumentosSgcSchema(s);
  const rows = await s.query(
    `
    SELECT d.id, d.clave, d.revision, d.titulo, d.tipo, d.area, d.es_externo, d.fecha_emision, d.fecha_vigencia, d.fecha_proxima_revision,
           d.estado, d.archivo_nombre, d.archivo_original, d.aprobo_json, d.distribucion,
           (SELECT COUNT(*) FROM ${TABLE} o WHERE o.clave = d.clave AND o.estado = 'obsoleto') AS revisiones_obsoletas,
           (SELECT COUNT(*) FROM ${TABLE} b WHERE b.clave = d.clave AND b.estado IN ('borrador', 'en_revision')) AS revisiones_en_curso
    FROM ${TABLE} d
    WHERE d.estado = 'vigente'
    ORDER BY d.area, d.tipo, d.clave
    `,
  );
  const today = new Date().toISOString().slice(0, 10);
  return json({
    items: rows.map((row) => ({ ...serializeDocumento(row), revision_vencida: !!row.fecha_proxima_revision && String(row.fecha_proxima_revision) < today })),
    total: rows.length,
    generada_en: new Date().toISOString(),
  });
}

export async function documentosSummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "read");
  await ensureDocumentosSgcSchema(s);
  const today = new Date().toISOString().slice(0, 10);
  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'vigente') AS vigentes,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'borrador') AS borrador,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'en_revision') AS en_revision,
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
  await requirePermission(s, user, "documentos", "read");
  await ensureDocumentosSgcSchema(s);
  const row = await snapshotRow(s, TABLE, id);
  if (!row) return json({ message: "Documento no encontrado" }, 404);
  const revisiones = await s.query(`SELECT id, revision, estado, fecha_emision, fecha_vigencia, cambios FROM ${TABLE} WHERE clave = :clave ORDER BY revision DESC`, { clave: row.clave });
  return json({ item: { ...serializeDocumento(row), revisiones } });
}

export async function createDocumento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "create");
  await ensureDocumentosSgcSchema(s);
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
    const enCurso = await s.queryOne<{ revision: number }>(`SELECT revision FROM ${TABLE} WHERE clave = :clave AND estado IN ('borrador', 'en_revision')`, { clave: normalized.clave });
    if (enCurso) return json({ message: `Ya existe la revision ${enCurso.revision} de ${normalized.clave} en curso` }, 409);
    revision = Number((await s.scalar(`SELECT COALESCE(MAX(revision), 0) + 1 FROM ${TABLE} WHERE clave = :clave`, { clave: normalized.clave })) || 1);
  }
  const stored = file ? await storeFile(file) : { archivo_nombre: null, archivo_original: null, archivo_sha256: null };
  const userId = userIdFromClaims(user);
  try {
    const result = await s.execute(
      `
      INSERT INTO ${TABLE} (clave, revision, titulo, tipo, area, es_externo, origen_externo, descripcion, cambios, fecha_emision, fecha_vigencia, fecha_proxima_revision,
        elaboro_json, reviso_json, distribucion, archivo_nombre, archivo_original, archivo_sha256, estado, creado_por, actualizado_por)
      VALUES (:clave, :revision, :titulo, :tipo, :area, :es_externo, :origen_externo, :descripcion, :cambios, :fecha_emision, :fecha_vigencia, :fecha_proxima_revision,
        :elaboro_json, :reviso_json, :distribucion, :archivo_nombre, :archivo_original, :archivo_sha256, 'borrador', :creado_por, :actualizado_por)
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
  await requirePermission(s, user, "documentos", "update");
  await ensureDocumentosSgcSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (!["borrador", "en_revision"].includes(String(antes.estado))) return json({ message: "Solo se editan documentos en borrador o en revision; para cambiar uno vigente crea una nueva revision" }, 409);
  const { data, file } = await readPayload(request);
  const normalized = normalize(data, antes);
  const invalid = validate(normalized);
  if (invalid) return json({ message: invalid }, 400);
  const stored = file ? await storeFile(file) : null;
  await s.execute(
    `
    UPDATE ${TABLE} SET titulo = :titulo, tipo = :tipo, area = :area, es_externo = :es_externo, origen_externo = :origen_externo, descripcion = :descripcion, cambios = :cambios,
      fecha_emision = :fecha_emision, fecha_vigencia = :fecha_vigencia, fecha_proxima_revision = :fecha_proxima_revision, elaboro_json = :elaboro_json, reviso_json = :reviso_json,
      distribucion = :distribucion, estado = 'borrador', actualizado_por = :actualizado_por
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
  await requirePermission(s, user, "documentos", "delete");
  throw new HttpError(405, { message: "Los documentos controlados no se eliminan: cancele el borrador o declare obsoleta la revision" });
}

export async function enviarRevision({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "update");
  await ensureDocumentosSgcSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "borrador") return json({ message: "Solo los borradores se envian a revision" }, 409);
  if (!antes.archivo_nombre && !antes.es_externo) return json({ message: "Adjunta el archivo del documento antes de enviarlo a revision" }, 400);
  const payload = await readJson(request);
  const reviso = persona(payload.reviso ?? safeParse(antes.reviso_json), { nombre: String(user.nombre || "") });
  await s.execute(`UPDATE ${TABLE} SET estado = 'en_revision', reviso_json = :reviso, actualizado_por = :usuario WHERE id = :id`, { reviso: JSON.stringify({ ...reviso, fecha: reviso.fecha || new Date().toISOString().slice(0, 10) }), usuario: userIdFromClaims(user), id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "revisar", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues });
  await s.commit();
  return json({ message: "Documento enviado a revision", item: serializeDocumento(despues!) });
}

/* Aprobacion: la revision queda vigente y la anterior vigente pasa a obsoleta. */
export async function aprobarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "aprobaciones", "update");
  await ensureDocumentosSgcSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "en_revision") return json({ message: "Solo se aprueban documentos en revision; envialo a revision primero" }, 409);
  if (!antes.archivo_nombre && !Number(antes.es_externo)) return json({ message: "El documento no tiene archivo adjunto; no puede quedar vigente sin el" }, 409);
  const payload = await readJson(request);
  const today = new Date().toISOString().slice(0, 10);
  const vigencia = strippedOrNull(payload.fecha_vigencia, 10) || (antes.fecha_vigencia as string | null) || today;
  const aprobo = { ...persona(payload.aprobo, { nombre: String(user.nombre || user.email || "") }), fecha: strippedOrNull((payload.aprobo as Record<string, unknown> | undefined)?.fecha, 10) || today, usuario_id: userIdFromClaims(user) };
  const previas = await s.query<{ id: number; revision: number }>(`SELECT id, revision FROM ${TABLE} WHERE clave = :clave AND estado = 'vigente' AND id <> :id`, { clave: antes.clave, id });
  for (const previa of previas) {
    const prevAntes = await snapshotRow(s, TABLE, previa.id);
    await s.execute(`UPDATE ${TABLE} SET estado = 'obsoleto', motivo_estado = :motivo, actualizado_por = :usuario WHERE id = :id`, { motivo: `Sustituido por la revision ${antes.revision}`, usuario: userIdFromClaims(user), id: previa.id });
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: previa.id, referencia: docRef(prevAntes), antes: prevAntes, despues: await snapshotRow(s, TABLE, previa.id), motivo: `Obsoleto: sustituido por la revision ${antes.revision}` });
  }
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'vigente', aprobo_json = :aprobo, fecha_vigencia = :vigencia, fecha_proxima_revision = COALESCE(fecha_proxima_revision, :proxima), motivo_estado = NULL, actualizado_por = :usuario WHERE id = :id`,
    { aprobo: JSON.stringify(aprobo), vigencia, proxima: addYears(vigencia, DOCUMENT_REVIEW_YEARS), usuario: userIdFromClaims(user), id },
  );
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "aprobar", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues, detalle: { revisiones_obsoletas: previas.map((p) => p.revision) } });
  await s.commit();
  return json({ message: previas.length ? `Documento aprobado y vigente; la revision anterior queda obsoleta` : "Documento aprobado y vigente", item: serializeDocumento(despues!) });
}

export async function obsoletarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "aprobaciones", "update");
  await ensureDocumentosSgcSchema(s);
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (String(antes.estado) !== "vigente") return json({ message: "Solo un documento vigente se declara obsoleto" }, 409);
  await s.execute(`UPDATE ${TABLE} SET estado = 'obsoleto', motivo_estado = :motivo, actualizado_por = :usuario WHERE id = :id`, { motivo, usuario: userIdFromClaims(user), id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "baja", entidad: TABLE, entidadId: id, referencia: docRef(despues), antes, despues, motivo });
  await s.commit();
  return json({ message: "Documento declarado obsoleto", item: serializeDocumento(despues!) });
}

export async function cancelarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "delete");
  await ensureDocumentosSgcSchema(s);
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Documento no encontrado" }, 404);
  if (!["borrador", "en_revision"].includes(String(antes.estado))) return json({ message: "Solo se cancelan borradores o revisiones en curso" }, 409);
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
  await requirePermission(s, user, "documentos", "create");
  await ensureDocumentosSgcSchema(s);
  const original = await snapshotRow(s, TABLE, id);
  if (!original) return json({ message: "Documento no encontrado" }, 404);
  // Una revision nueva parte de una que llego a estar vigente (FX-MC 8.3): un
  // borrador cancelado no genera descendencia.
  if (!["vigente", "obsoleto"].includes(String(original.estado))) {
    return json({ message: "Solo se crean revisiones a partir de un documento vigente u obsoleto" }, 409);
  }
  const enCurso = await s.queryOne(`SELECT id, revision FROM ${TABLE} WHERE clave = :clave AND estado IN ('borrador', 'en_revision')`, { clave: original.clave });
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
  await requirePermission(s, user, "documentos", "read");
  await ensureDocumentosSgcSchema(s);
  const row = await snapshotRow(s, TABLE, id);
  if (!row || !row.archivo_nombre) return json({ message: "Archivo no encontrado" }, 404);
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
