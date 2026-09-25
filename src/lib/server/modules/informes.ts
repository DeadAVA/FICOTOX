import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireUser, userIdFromClaims, type CurrentUser } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { getConfig } from "../config";
import { isIntegrityError, isSqlite, type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { renderInformePdf, type InformeAnalisis, type InformeRender } from "../informe-pdf";
import { cargoActuante, requirePermission } from "../rbac";
import { exigirReauth } from "../seguridad";
import { crearSolicitud, exigirSinSolicitudPendiente, pendientesDe, respuestaSolicitud, serializarSolicitud } from "../solicitudes";
import { detalleExcepcion, elaboradoresDe, ensureExcepcionesColumn, excepcionesDe, exigirSegregacion } from "../segregacion";
import { evaluarInforme, excepcionPara, type Violacion } from "../../shared/segregacion";
import { hoyLocal } from "../../shared/fechas";
import { aplicarSupervision, exigirSinSupervisionPendiente, filtroSupervision, marcaSupervision } from "../supervision";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../schema";
import { advanceState, ensureAnulacionColumns, nextFolioNum, readMotivo } from "../samples-flow";
import { ANALYSIS_METHODS, ANALYSIS_TYPES, REPORT_DEFAULT_STATEMENTS, REPORT_DELIVERY_MEDIA } from "../../shared/sgc";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "./helpers";
import { approvedAnalysesForReception, serializeAnalysis } from "./samples/analisis";
import { ensureSupervisionColumns } from "../supervision";

/*
 * Informe de resultados (ISO/IEC 17025 7.8; FX-TCP-IR / FX-TCF-IR).
 *
 * Ciclo: borrador -> en_revision -> autorizado -> entregado. Al autorizar se
 * congela el contenido (resultados y muestras quedan copiados en el informe),
 * se genera el PDF con su huella SHA-256 y la recepcion pasa a "informada".
 * Un informe autorizado no se edita: se anula con motivo o se emite una
 * enmienda (nuevo informe, version +1, que declara al que sustituye; 7.8.8).
 */

const TABLE = "informes";
const DELIVERY = new Set(REPORT_DELIVERY_MEDIA.map((item) => item.value));

export async function ensureInformesSchema(s: Session): Promise<void> {
  if (schemaReady("informes")) return;
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS informes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio_num INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-IR',
        recepcion_id INTEGER NOT NULL,
        sustituye_a INTEGER DEFAULT NULL,
        motivo_enmienda TEXT,
        cliente_json TEXT,
        muestras_json TEXT,
        analisis_ids_json TEXT,
        resultados_json TEXT,
        declaraciones_json TEXT,
        fecha_emision DATE DEFAULT NULL,
        elaborado_por INTEGER DEFAULT NULL,
        elaborado_nombre VARCHAR(180) DEFAULT NULL,
        elaborado_cargo VARCHAR(120) DEFAULT NULL,
        elaborado_firma TEXT,
        revisado_por INTEGER DEFAULT NULL,
        revisado_nombre VARCHAR(180) DEFAULT NULL,
        revisado_cargo VARCHAR(120) DEFAULT NULL,
        revisado_en VARCHAR(40) DEFAULT NULL,
        revisado_firma TEXT,
        autorizado_por INTEGER DEFAULT NULL,
        autorizado_nombre VARCHAR(180) DEFAULT NULL,
        autorizado_cargo VARCHAR(120) DEFAULT NULL,
        autorizado_en VARCHAR(40) DEFAULT NULL,
        autorizado_firma TEXT,
        entrega_json TEXT,
        archivo_pdf VARCHAR(255) DEFAULT NULL,
        pdf_sha256 VARCHAR(64) DEFAULT NULL,
        observaciones TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'borrador',
        creado_por INTEGER DEFAULT NULL,
        actualizado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (folio_num, version)
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS informes (
        id INT NOT NULL AUTO_INCREMENT,
        folio_num INT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-IR',
        recepcion_id INT NOT NULL,
        sustituye_a INT DEFAULT NULL,
        motivo_enmienda TEXT,
        cliente_json LONGTEXT,
        muestras_json LONGTEXT,
        analisis_ids_json LONGTEXT,
        resultados_json LONGTEXT,
        declaraciones_json LONGTEXT,
        fecha_emision DATE DEFAULT NULL,
        elaborado_por INT DEFAULT NULL,
        elaborado_nombre VARCHAR(180) DEFAULT NULL,
        elaborado_cargo VARCHAR(120) DEFAULT NULL,
        elaborado_firma LONGTEXT,
        revisado_por INT DEFAULT NULL,
        revisado_nombre VARCHAR(180) DEFAULT NULL,
        revisado_cargo VARCHAR(120) DEFAULT NULL,
        revisado_en VARCHAR(40) DEFAULT NULL,
        revisado_firma LONGTEXT,
        autorizado_por INT DEFAULT NULL,
        autorizado_nombre VARCHAR(180) DEFAULT NULL,
        autorizado_cargo VARCHAR(120) DEFAULT NULL,
        autorizado_en VARCHAR(40) DEFAULT NULL,
        autorizado_firma LONGTEXT,
        entrega_json LONGTEXT,
        archivo_pdf VARCHAR(255) DEFAULT NULL,
        pdf_sha256 VARCHAR(64) DEFAULT NULL,
        observaciones TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'borrador',
        creado_por INT DEFAULT NULL,
        actualizado_por INT DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_informes_folio_version (folio_num, version),
        KEY idx_informes_recepcion (recepcion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, TABLE, "pdf_sha256", "VARCHAR(64) DEFAULT NULL");
  // Fase 1: rol con el que actuo cada firmante (el cargo se guarda en *_cargo).
  await addColumnIfMissing(s, TABLE, "elaborado_rol_id", "INT DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "revisado_rol_id", "INT DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "autorizado_rol_id", "INT DEFAULT NULL");
  await ensureAnulacionColumns(s, TABLE);
  await ensureSupervisionColumns(s, "informes");
  await ensureExcepcionesColumn(s, "informes");
  markSchemaReady("informes");
}

function informesDir(): string {
  const folder = path.join(getConfig().INSTANCE_DIR, "informes");
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export function informeFolio(row: Row | null | undefined): string {
  return `IR ${String(row?.folio_num || 0).padStart(7, "0")}`;
}

export function serializeInforme(row: Row): Row {
  const item: Row = { ...row };
  item.excepciones = excepcionesDe(row);
  delete item.excepciones_json;
  for (const [key, fallback] of [
    ["cliente", {}],
    ["muestras", []],
    ["analisis_ids", []],
    ["resultados", []],
    ["declaraciones", {}],
    ["entrega", null],
  ] as Array<[string, unknown]>) {
    item[key] = safeJsonLoad(item[`${key}_json`], fallback);
    delete item[`${key}_json`];
  }
  item.folio = informeFolio(row);
  return item;
}

function normalizeCliente(raw: unknown, recepcion: Row | null) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const solicitante = recepcion ? safeJsonLoad<Record<string, unknown>>(String(recepcion.datos_solicitante_json || "{}"), {}) : {};
  return {
    nombre: strippedOrNull(value.nombre, 180) || strippedOrNull(recepcion?.solicitante, 180),
    contacto: strippedOrNull(value.contacto, 180) || strippedOrNull(solicitante.nombre_entrega, 180),
    direccion: strippedOrNull(value.direccion, 240),
  };
}

function normalizeDeclaraciones(raw: unknown) {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  return {
    alcance: strippedOrNull(value.alcance) || REPORT_DEFAULT_STATEMENTS.alcance,
    regla_decision: strippedOrNull(value.regla_decision) || REPORT_DEFAULT_STATEMENTS.regla_decision,
    desviaciones: strippedOrNull(value.desviaciones),
    descargo: strippedOrNull(value.descargo),
    opiniones: strippedOrNull(value.opiniones),
  };
}

/* Muestras del informe a partir de la recepcion (unica o lote). */
function muestrasFromRecepcion(recepcion: Row): Array<Record<string, unknown>> {
  const lote = safeJsonLoad<Array<Record<string, unknown>>>(String(recepcion.lote_muestras_json || "[]"), []);
  const inspeccion = safeJsonLoad<{ checklist?: Array<{ requisito?: string; estado?: string }> }>(String(recepcion.inspeccion_json || "{}"), {});
  const nc = (inspeccion.checklist || []).filter((row) => String(row.estado || "").toUpperCase() === "NC").length;
  const condicion = String(recepcion.decision_aceptacion || "") === "aceptada_con_desviacion" ? `Aceptada con desviación (${nc} requisito(s) NC)` : String(recepcion.decision_aceptacion || "") === "aceptada" ? "Conforme" : null;
  if (recepcion.muestra_unica || !lote.length) {
    return [{ id_interno: recepcion.id_interno || null, organismo: recepcion.especificaciones || null, sitio: null, fecha_muestra: recepcion.fecha_muestra || null, cantidad: null, condicion }];
  }
  return lote
    .filter((row) => row.trabajar !== false)
    .map((row) => ({ id_interno: row.id_interno || null, organismo: row.nombre_organismo || null, sitio: row.sitio_muestreo || null, fecha_muestra: row.fecha_muestra || null, cantidad: row.cantidad_volumen || null, condicion }));
}

function analysisLabel(value: string): string {
  const meta = ANALYSIS_TYPES.find((item) => item.value === value);
  return meta ? meta.label : value;
}

function methodLabel(value: string, otro?: string | null): string {
  if (value === "otro" && otro) return otro;
  const meta = ANALYSIS_METHODS.find((item) => item.value === value);
  return meta ? meta.label : value;
}

/* Copia congelada de los analisis aprobados que el informe reporta. */
function snapshotAnalyses(rows: Row[]): InformeAnalisis[] {
  return rows.map((a) => ({
    folio: `A ${String(a.folio_num || 0).padStart(7, "0")}`,
    tipo: analysisLabel(String(a.tipo_analisis || "")),
    metodo: methodLabel(String(a.metodo || ""), a.metodo_otro as string | null),
    metodo_referencia: (a.metodo_referencia as string | null) || null,
    fecha_analisis: (a.fecha_analisis as string | null) || null,
    equipo: (a.equipo_nombre as string | null) || null,
    analista: (a.analista_nombre as string | null) || null,
    aprobado_por: (a.aprobado_nombre as string | null) || null,
    resultados: (Array.isArray(a.resultados) ? a.resultados : []).map((r: Record<string, unknown>) => ({
      id_muestra: String(r.id_muestra || ""),
      resultado: typeof r.resultado === "number" ? r.resultado : null,
      resultado_texto: (r.resultado_texto as string | null) || null,
      unidad: (r.unidad as string | null) || null,
      limite_regulatorio: typeof r.limite_regulatorio === "number" ? r.limite_regulatorio : null,
      limite_deteccion: typeof r.limite_deteccion === "number" ? r.limite_deteccion : null,
      incertidumbre: typeof r.incertidumbre === "number" ? r.incertidumbre : null,
      cumple: (r.cumple as string | null) || null,
      observacion: (r.observacion as string | null) || null,
    })),
  }));
}

async function loadRecepcion(s: Session, id: number | null): Promise<Row> {
  if (!id) throw new HttpError(400, { message: "El informe debe vincularse a una recepcion de muestra" });
  const row = await snapshotRow(s, "muestras_recepcion", id);
  if (!row) throw new HttpError(404, { message: "Recepcion no encontrada" });
  if (["anulada", "rechazada"].includes(String(row.estado || ""))) throw new HttpError(409, { message: "La recepcion esta anulada o rechazada; no se puede informar" });
  exigirSinSupervisionPendiente(row, `La recepcion R ${String(row.folio_num || 0).padStart(7, "0")}`, "informar a partir de ella");
  return row;
}

/*
 * Fase 3: un analisis con una solicitud pendiente (p. ej. su anulacion) no se
 * incluye, revisa ni autoriza en un informe hasta que la solicitud se resuelva.
 */
async function exigirAnalisisSinSolicitud(s: Session, ids: number[], que: string): Promise<void> {
  for (const analisisId of ids) {
    const fila = await s.queryOne<Row>("SELECT folio_num FROM muestras_analisis WHERE id = :id", { id: analisisId });
    await exigirSinSolicitudPendiente(s, "muestras_analisis", analisisId, `El analisis A ${String(fila?.folio_num || 0).padStart(7, "0")}`, que);
  }
}

async function loadAnalyses(s: Session, ids: number[]): Promise<Row[]> {
  if (!ids.length) return [];
  const placeholders = ids.map((_, i) => `:id${i}`).join(", ");
  const params: Record<string, unknown> = {};
  ids.forEach((id, i) => (params[`id${i}`] = id));
  const rows = await s.query(`SELECT * FROM muestras_analisis WHERE id IN (${placeholders}) ORDER BY folio_num`, params);
  return rows.map(serializeAnalysis);
}

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  const ids = Array.isArray(payload.analisis_ids) ? payload.analisis_ids.map((v) => toIntOrNull(v)).filter((v): v is number => v !== null) : [];
  return {
    folio_num: toIntOrNull(payload.folio_num),
    recepcion_id: toIntOrNull(payload.recepcion_id),
    analisis_ids: Array.from(new Set(ids)),
    cliente: payload.cliente,
    declaraciones: payload.declaraciones,
    fecha_emision: strippedOrNull(payload.fecha_emision, 10),
    elaborado_nombre: strippedOrNull(payload.elaborado_nombre, 180),
    elaborado_firma: strippedOrNull(payload.elaborado_firma),
    observaciones: strippedOrNull(payload.observaciones),
  };
}

function assertDraft(row: Row | null): Row {
  if (!row) throw new HttpError(404, { message: "Informe no encontrado" });
  const estado = String(row.estado || "");
  // E solo mientras el informe no ha pasado a revision (Fase 1); despues se corrige por enmienda o anulacion.
  if (estado !== "borrador") {
    throw new HttpError(409, { message: `El informe ${informeFolio(row)} esta ${estado}; ya no se edita. Emite una enmienda o anúlalo si necesita cambios` });
  }
  return row;
}

export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "V");
  await ensureInformesSchema(s);
  return json({ next_folio: await nextFolioNum(s, TABLE) });
}

export async function listInformes({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "informes", "V");
  const supFiltro = filtroSupervision(request, "i", permiso.auth.userId);
  await ensureInformesSchema(s);
  const search = searchParam(request, "search");
  const estado = searchParam(request, "estado");
  const recepcionId = toIntOrNull(searchParam(request, "recepcion_id")) || 0;
  const includeAnulados = searchParam(request, "anulados") === "1";
  const rows = await s.query(
    `
    SELECT i.id, i.folio_num, i.version, i.recepcion_id, i.sustituye_a, i.fecha_emision, i.estado,
           i.elaborado_nombre, i.autorizado_nombre, i.autorizado_en, i.entrega_json, i.archivo_pdf, i.motivo_anulacion, i.creado_en,
           i.cliente_json, i.analisis_ids_json, i.supervision_estado, i.supervisor_id,
           r.folio_num AS folio_recepcion_num, r.solicitante, r.id_interno AS recepcion_id_interno
    FROM ${TABLE} i
    LEFT JOIN muestras_recepcion r ON r.id = i.recepcion_id
    WHERE (:incluir_anulados = 1 OR i.estado <> 'anulado')
      AND (:estado = '' OR i.estado = :estado OR (:estado = 'pendiente' AND i.estado IN ('borrador', 'en_revision')))
      AND (:recepcion_id = 0 OR i.recepcion_id = :recepcion_id)
      ${supFiltro.sql}
      AND (:search = '' OR CAST(i.folio_num AS CHAR) LIKE :search_like OR r.solicitante LIKE :search_like OR i.cliente_json LIKE :search_like OR r.id_interno LIKE :search_like)
    ORDER BY i.folio_num DESC, i.version DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%`, estado, recepcion_id: recepcionId, incluir_anulados: includeAnulados ? 1 : 0, ...supFiltro.params },
  );
  const pendientes = await pendientesDe(s, TABLE, rows.map((r) => Number(r.id)));
  return json({
    items: rows.map((row) => {
      const item: Row = { ...row, folio: informeFolio(row), solicitud_pendiente: pendientes.has(String(row.id)) ? serializarSolicitud(pendientes.get(String(row.id))!) : null, cliente: safeJsonLoad(row.cliente_json, {}), analisis: safeJsonLoad<number[]>(row.analisis_ids_json, []).length, entrega: safeJsonLoad(row.entrega_json, null) };
      delete item.cliente_json;
      delete item.analisis_ids_json;
      delete item.entrega_json;
      return item;
    }),
    total: rows.length,
  });
}

export async function getInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "V");
  await ensureInformesSchema(s);
  const row = await snapshotRow(s, TABLE, id);
  if (!row) return json({ message: "Informe no encontrado" }, 404);
  const item = serializeInforme(row);
  // Fase 3: solicitud pendiente y, para la persona que consulta, si la segregacion le impide revisar o autorizar.
  const pendiente = (await pendientesDe(s, TABLE, [id])).get(String(id));
  item.solicitud_pendiente = pendiente ? serializarSolicitud(pendiente) : null;
  const yo = userIdFromClaims(user) as number;
  const idsInc = safeJsonLoad<number[]>(String(row.analisis_ids_json || "[]"), []);
  const bloqueo = async (accion: "revisar" | "autorizar") => {
    const v = await violacionInforme(s, yo, row, idsInc, accion);
    return v && !excepcionPara(excepcionesDe(row), yo, accion) ? v.mensaje : null;
  };
  item.segregacion = { revisar: await bloqueo("revisar"), autorizar: await bloqueo("autorizar") };
  // En borrador los analisis se leen en vivo; autorizado, del congelado.
  if (["borrador", "en_revision"].includes(String(row.estado))) {
    const analyses = await loadAnalyses(s, item.analisis_ids as number[]);
    item.analisis_detalle = analyses;
    item.disponibles = await approvedAnalysesForReception(s, Number(row.recepcion_id));
  }
  const recepcion = await snapshotRow(s, "muestras_recepcion", Number(row.recepcion_id));
  item.recepcion = recepcion ? { id: recepcion.id, folio_num: recepcion.folio_num, solicitante: recepcion.solicitante, fecha_recepcion: recepcion.fecha_recepcion, estado: recepcion.estado, decision_aceptacion: recepcion.decision_aceptacion } : null;
  return json({ item });
}

/* Analisis aprobados listos para informar de una recepcion (para armar el borrador). */
export async function reportableForReception({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "V");
  await ensureInformesSchema(s);
  const recepcionId = intParam(params.id);
  const recepcion = await snapshotRow(s, "muestras_recepcion", recepcionId);
  if (!recepcion) return json({ message: "Recepcion no encontrada" }, 404);
  const analyses = await approvedAnalysesForReception(s, recepcionId);
  return json({
    recepcion: { id: recepcion.id, folio_num: recepcion.folio_num, solicitante: recepcion.solicitante, fecha_recepcion: recepcion.fecha_recepcion, decision_aceptacion: recepcion.decision_aceptacion, estado: recepcion.estado },
    cliente: normalizeCliente(null, recepcion),
    muestras: muestrasFromRecepcion(recepcion),
    analisis: analyses,
    descargo_sugerido: String(recepcion.decision_aceptacion || "") === "aceptada_con_desviacion" ? "La muestra se recibió con desviaciones respecto a las condiciones especificadas (ver inspección visual de la recepción); a solicitud del cliente se realizó el análisis. Los resultados pueden verse afectados por dicha desviación." : null,
  });
}

export async function createInforme({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "informes", "C", { objeto: "informe", borrador: true });
  const actuo = cargoActuante(request, permiso);
  await ensureInformesSchema(s);
  const data = normalizePayload(await readJson(request));
  const recepcion = await loadRecepcion(s, data.recepcion_id);
  const analyses = await loadAnalyses(s, data.analisis_ids);
  if (analyses.some((a) => Number(a.recepcion_id) !== Number(recepcion.id))) return json({ message: "Todos los analisis deben pertenecer a la recepcion del informe" }, 400);
  await exigirAnalisisSinSolicitud(s, data.analisis_ids, "incluir en un informe");
  const folio = data.folio_num || (await nextFolioNum(s, TABLE));
  const userId = userIdFromClaims(user);
  const supervision = marcaSupervision(permiso);
  try {
    const result = await s.execute(
      `
      INSERT INTO ${TABLE} (folio_num, version, recepcion_id, cliente_json, muestras_json, analisis_ids_json, resultados_json, declaraciones_json,
        fecha_emision, elaborado_por, elaborado_nombre, elaborado_cargo, elaborado_rol_id, elaborado_firma, observaciones, estado, creado_por, actualizado_por)
      VALUES (:folio_num, 1, :recepcion_id, :cliente_json, :muestras_json, :analisis_ids_json, :resultados_json, :declaraciones_json,
        :fecha_emision, :elaborado_por, :elaborado_nombre, :elaborado_cargo, :elaborado_rol_id, :elaborado_firma, :observaciones, 'borrador', :creado_por, :actualizado_por)
      `,
      {
        folio_num: folio,
        recepcion_id: recepcion.id,
        cliente_json: jsonText(normalizeCliente(data.cliente, recepcion)),
        muestras_json: jsonText(muestrasFromRecepcion(recepcion)),
        analisis_ids_json: jsonText(data.analisis_ids),
        resultados_json: jsonText(snapshotAnalyses(analyses)),
        declaraciones_json: jsonText(normalizeDeclaraciones(data.declaraciones)),
        fecha_emision: data.fecha_emision,
        elaborado_por: userId,
        elaborado_nombre: data.elaborado_nombre || String(user.nombre || ""),
        elaborado_cargo: actuo.cargo,
        elaborado_rol_id: actuo.rol_id,
        elaborado_firma: data.elaborado_firma,
        observaciones: data.observaciones,
        creado_por: userId,
        actualizado_por: userId,
      },
    );
    const id = result.lastrowid as number;
    await aplicarSupervision(s, TABLE, id, supervision, userId);
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), despues, detalle: { actuo_como: actuo } });
    await s.commit();
    return json({ message: "Informe creado en borrador", id, folio_num: folio }, 201);
  } catch (error) {
    await s.rollback();
    if (isIntegrityError(error)) return json({ message: "El folio de informe ya existe" }, 409);
    throw error;
  }
}

export async function updateInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "informes", "E", { objeto: "informe", borrador: true });
  const actuo = cargoActuante(request, permiso);
  await ensureInformesSchema(s);
  const antes = assertDraft(await snapshotRow(s, TABLE, id));
  await exigirSinSolicitudPendiente(s, TABLE, id, `El informe ${informeFolio(antes)}`, "editar");
  const data = normalizePayload(await readJson(request));
  const recepcion = await loadRecepcion(s, data.recepcion_id || Number(antes.recepcion_id));
  const analyses = await loadAnalyses(s, data.analisis_ids);
  if (analyses.some((a) => Number(a.recepcion_id) !== Number(recepcion.id))) return json({ message: "Todos los analisis deben pertenecer a la recepcion del informe" }, 400);
  await exigirAnalisisSinSolicitud(s, data.analisis_ids, "incluir en un informe");
  await s.execute(
    `
    UPDATE ${TABLE} SET recepcion_id = :recepcion_id, cliente_json = :cliente_json, muestras_json = :muestras_json, analisis_ids_json = :analisis_ids_json,
      resultados_json = :resultados_json, declaraciones_json = :declaraciones_json, fecha_emision = :fecha_emision,
      elaborado_nombre = :elaborado_nombre, elaborado_firma = :elaborado_firma,
      observaciones = :observaciones, estado = 'borrador', revisado_por = NULL, revisado_nombre = NULL, revisado_cargo = NULL, revisado_en = NULL, revisado_firma = NULL,
      actualizado_por = :actualizado_por
    WHERE id = :id
    `,
    {
      id,
      recepcion_id: recepcion.id,
      cliente_json: jsonText(normalizeCliente(data.cliente, recepcion)),
      muestras_json: jsonText(muestrasFromRecepcion(recepcion)),
      analisis_ids_json: jsonText(data.analisis_ids),
      resultados_json: jsonText(snapshotAnalyses(analyses)),
      declaraciones_json: jsonText(normalizeDeclaraciones(data.declaraciones)),
      fecha_emision: data.fecha_emision,
      elaborado_nombre: data.elaborado_nombre || antes.elaborado_nombre,
      elaborado_firma: data.elaborado_firma,
      observaciones: data.observaciones,
      actualizado_por: userIdFromClaims(user),
    },
  );
  await aplicarSupervision(s, TABLE, id, marcaSupervision(permiso), userIdFromClaims(user));
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), antes, despues, detalle: { actuo_como: actuo } });
  await s.commit();
  return json({ message: "Informe actualizado" });
}

export async function deleteInforme({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "AN");
  throw new HttpError(405, { message: "Los informes no se eliminan: anule el informe indicando el motivo" });
}

/* borrador -> en_revision (quien revisa deja nombre, fecha y firma). */
export async function reviewInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const actuo = cargoActuante(request, await requirePermission(s, user, "informes", "R"));
  await ensureInformesSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Informe no encontrado" }, 404);
  if (String(antes.estado) !== "borrador") return json({ message: "Solo se revisan informes en borrador" }, 409);
  exigirSinSupervisionPendiente(antes, `El informe ${informeFolio(antes)}`, "revisar");
  await exigirSinSolicitudPendiente(s, TABLE, id, `El informe ${informeFolio(antes)}`, "revisar");
  const ids = safeJsonLoad<number[]>(String(antes.analisis_ids_json || "[]"), []);
  if (!ids.length) return json({ message: "El informe no incluye analisis" }, 400);
  await exigirAnalisisSinSolicitud(s, ids, "revisar en un informe");
  const payload = await readJson(request);
  // Segregacion (regla 2): quien elaboro el informe, o alguno de sus analisis, no lo revisa.
  const yo = userIdFromClaims(user) as number;
  const excepcion = exigirSegregacion(await violacionInforme(s, yo, antes, ids, "revisar"), antes, yo, "revisar");
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'en_revision', revisado_por = :usuario, revisado_nombre = :nombre, revisado_cargo = :cargo, revisado_rol_id = :rol_id, revisado_en = :fecha, revisado_firma = :firma, actualizado_por = :usuario WHERE id = :id`,
    { usuario: userIdFromClaims(user), nombre: String(user.nombre || user.email || "").slice(0, 180), cargo: actuo.cargo, rol_id: actuo.rol_id, fecha: new Date().toISOString(), firma: strippedOrNull(payload.firma), id },
  );
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "revisar", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), antes, despues, motivo: strippedOrNull(payload.observaciones), detalle: { actuo_como: actuo, ...detalleExcepcion(excepcion) } });
  await s.commit();
  return json({ message: "Informe revisado; listo para autorizar", item: serializeInforme(despues!) });
}

async function buildRender(s: Session, row: Row, analyses: Row[]): Promise<InformeRender> {
  const recepcion = await snapshotRow(s, "muestras_recepcion", Number(row.recepcion_id));
  const sustituye = row.sustituye_a ? await snapshotRow(s, TABLE, Number(row.sustituye_a)) : null;
  const sustituidoPor = String(row.estado) === "sustituido" ? await s.queryOne<Row>(`SELECT folio_num, version FROM ${TABLE} WHERE sustituye_a = :id AND estado IN ('autorizado', 'entregado') ORDER BY version DESC LIMIT 1`, { id: row.id }) : null;
  const cliente = safeJsonLoad<{ nombre: string | null; contacto: string | null; direccion: string | null }>(String(row.cliente_json || "{}"), { nombre: null, contacto: null, direccion: null });
  const declaraciones = normalizeDeclaraciones(safeJsonLoad(String(row.declaraciones_json || "{}"), {}));
  return {
    folio: informeFolio(row),
    version: Number(row.version || 1),
    sustituye: sustituye ? `${informeFolio(sustituye)} v${sustituye.version}` : null,
    motivo_enmienda: (row.motivo_enmienda as string | null) || null,
    fecha_emision: String(row.fecha_emision || hoyLocal()),
    cliente,
    recepcion: { folio: `R ${String(recepcion?.folio_num || 0).padStart(7, "0")}`, fecha_recepcion: (recepcion?.fecha_recepcion as string | null) || null, fecha_muestra: (recepcion?.fecha_muestra as string | null) || null, medio: (recepcion?.medio_recepcion as string | null) || null },
    muestras: safeJsonLoad(String(row.muestras_json || "[]"), []),
    analisis: analyses.length ? snapshotAnalyses(analyses) : safeJsonLoad(String(row.resultados_json || "[]"), []),
    declaraciones,
    firmas: {
      elaborado: { nombre: (row.elaborado_nombre as string | null) || null, cargo: (row.elaborado_cargo as string | null) || null, fecha: (row.creado_en as string | null) || null, firma: (row.elaborado_firma as string | null) || null },
      revisado: { nombre: (row.revisado_nombre as string | null) || null, cargo: (row.revisado_cargo as string | null) || null, fecha: (row.revisado_en as string | null) || null, firma: (row.revisado_firma as string | null) || null },
      autorizado: { nombre: (row.autorizado_nombre as string | null) || null, cargo: (row.autorizado_cargo as string | null) || null, fecha: (row.autorizado_en as string | null) || null, firma: (row.autorizado_firma as string | null) || null },
    },
    anulado: String(row.estado) === "anulado",
    // Fase 3: revision o autorizacion hechas por excepcion de segregacion aprobada por un segundo usuario.
    excepciones: excepcionesDe(row).map((e) => `${e.accion === "revisar" ? "Revisión" : "Autorización"} autorizada por excepción, solicitud #${e.solicitud_id}`),
    sustituido_por: sustituidoPor ? `${informeFolio(sustituidoPor)} v${sustituidoPor.version}` : null,
  };
}

/* El original de una enmienda autorizada queda "sustituido" y su PDF se regenera con la leyenda. */
async function marcarSustituido(s: Session, user: CurrentUser, originalId: number, enmienda: Row): Promise<void> {
  const antes = await snapshotRow(s, TABLE, originalId);
  if (!antes || !["autorizado", "entregado"].includes(String(antes.estado))) return;
  await s.execute(`UPDATE ${TABLE} SET estado_previo = :previo, estado = 'sustituido', actualizado_por = :usuario WHERE id = :id`, { previo: String(antes.estado), usuario: userIdFromClaims(user), id: originalId });
  const despues = (await snapshotRow(s, TABLE, originalId))!;
  if (despues.archivo_pdf) {
    const pdf = await renderInformePdf(await buildRender(s, despues, []));
    await fs.promises.writeFile(path.join(informesDir(), String(despues.archivo_pdf)), pdf);
    await s.execute(`UPDATE ${TABLE} SET pdf_sha256 = :sha WHERE id = :id`, { sha: createHash("sha256").update(pdf).digest("hex"), id: originalId });
  }
  await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: originalId, referencia: informeFolio(antes), antes, despues: await snapshotRow(s, TABLE, originalId), motivo: `Sustituido por la enmienda ${informeFolio(enmienda)} v${enmienda.version}` });
}

/* en_revision -> autorizado: congela contenido, genera PDF y marca la recepcion como informada. */
export async function authorizeInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const actuo = cargoActuante(request, await requirePermission(s, user, "informes", "A"));
  await ensureInformesSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Informe no encontrado" }, 404);
  if (String(antes.estado) !== "en_revision") return json({ message: "El informe debe estar revisado antes de autorizarse" }, 409);
  exigirSinSupervisionPendiente(antes, `El informe ${informeFolio(antes)}`, "autorizar");
  await exigirSinSolicitudPendiente(s, TABLE, id, `El informe ${informeFolio(antes)}`, "autorizar");
  const payload = await readJson(request);
  const ids = safeJsonLoad<number[]>(String(antes.analisis_ids_json || "[]"), []);
  // Segregacion (regla 2): quien elaboro el informe, o alguno de sus analisis, no lo autoriza.
  const yo = userIdFromClaims(user) as number;
  const excepcion = exigirSegregacion(await violacionInforme(s, yo, antes, ids, "autorizar"), antes, yo, "autorizar");
  await exigirReauth(s, request, user, "informes:A");
  const analyses = await loadAnalyses(s, ids);
  if (!analyses.length) return json({ message: "El informe no incluye analisis" }, 400);
  await exigirAnalisisSinSolicitud(s, ids, "autorizar en un informe");
  const noAprobados = analyses.filter((a) => String(a.estado) !== "aprobado");
  if (noAprobados.length) return json({ message: `Hay analisis sin aprobar: ${noAprobados.map((a) => `A ${String(a.folio_num).padStart(7, "0")}`).join(", ")}` }, 409);

  const now = new Date().toISOString();
  const fechaEmision = strippedOrNull(payload.fecha_emision, 10) || String(antes.fecha_emision || hoyLocal());
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'autorizado', resultados_json = :resultados_json, fecha_emision = :fecha_emision, autorizado_por = :usuario, autorizado_nombre = :nombre, autorizado_cargo = :cargo, autorizado_rol_id = :rol_id, autorizado_en = :fecha, autorizado_firma = :firma, actualizado_por = :usuario WHERE id = :id`,
    { resultados_json: jsonText(snapshotAnalyses(analyses)), fecha_emision: fechaEmision, usuario: userIdFromClaims(user), nombre: String(user.nombre || user.email || "").slice(0, 180), cargo: actuo.cargo, rol_id: actuo.rol_id, fecha: now, firma: strippedOrNull(payload.firma), id },
  );
  const row = (await snapshotRow(s, TABLE, id))!;
  const pdf = await renderInformePdf(await buildRender(s, row, analyses));
  const filename = `${informeFolio(row).replace(/\s+/g, "-")}-v${row.version}.pdf`;
  await fs.promises.writeFile(path.join(informesDir(), filename), pdf);
  const sha = createHash("sha256").update(pdf).digest("hex");
  await s.execute(`UPDATE ${TABLE} SET archivo_pdf = :archivo, pdf_sha256 = :sha WHERE id = :id`, { archivo: filename, sha, id });
  await advanceState(s, "muestras_recepcion", Number(row.recepcion_id), "informada");
  // 7.8.8: el informe enmendado deja de ser valido y su PDF lo declara.
  if (row.sustituye_a) await marcarSustituido(s, user, Number(row.sustituye_a), row);
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "autorizar", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), antes, despues, detalle: { pdf: filename, sha256: sha, actuo_como: actuo, ...detalleExcepcion(excepcion) } });
  await s.commit();
  return json({ message: "Informe autorizado; PDF generado", item: serializeInforme(despues!) });
}

/* autorizado -> entregado (a quien, cuando, por que medio). */
export async function deliverInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const actuo = cargoActuante(request, await requirePermission(s, user, "informes", "A"));
  await ensureInformesSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Informe no encontrado" }, 404);
  if (String(antes.estado) !== "autorizado") return json({ message: "Solo se entregan informes autorizados" }, 409);
  await exigirSinSolicitudPendiente(s, TABLE, id, `El informe ${informeFolio(antes)}`, "entregar");
  const payload = await readJson(request);
  const medio = String(payload.medio || "").trim();
  const fecha = strippedOrNull(payload.fecha, 10);
  const aQuien = strippedOrNull(payload.a_quien, 180);
  if (!DELIVERY.has(medio) || !fecha || !aQuien) return json({ message: "Indica fecha, medio y a quien se entrego el informe" }, 400);
  await exigirReauth(s, request, user, "informes:A");
  const entrega = { fecha, medio, a_quien: aQuien, observaciones: strippedOrNull(payload.observaciones), entregado_por: userIdFromClaims(user), entregado_rol_id: actuo.rol_id, entregado_cargo: actuo.cargo, entregado_en: new Date().toISOString() };
  await s.execute(`UPDATE ${TABLE} SET estado = 'entregado', entrega_json = :entrega, actualizado_por = :usuario WHERE id = :id`, { entrega: jsonText(entrega), usuario: userIdFromClaims(user), id });
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "entregar", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), antes, despues, detalle: entrega });
  await s.commit();
  return json({ message: "Entrega registrada", item: serializeInforme(despues!) });
}

/* Anulacion con motivo (un informe autorizado anulado conserva su PDF marcado). */
export async function anularInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const actuo = cargoActuante(request, await requirePermission(s, user, "informes", "AN"));
  await ensureInformesSchema(s);
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo de la anulacion (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) return json({ message: "Informe no encontrado" }, 404);
  if (String(antes.estado) === "anulado") return json({ message: "El informe ya esta anulado" }, 409);
  await exigirReauth(s, request, user, "informes:AN");
  // Fase 3: anular un informe autorizado o entregado requiere la aprobacion de un segundo usuario.
  if (["autorizado", "entregado", "sustituido"].includes(String(antes.estado))) {
    const solicitud = await crearSolicitud(s, user, { tipo: "anular_informe", entidad: TABLE, entidadId: id, referencia: informeFolio(antes), accion: "anular", datos: { estado: antes.estado }, motivo, cargo: actuo.cargo });
    await s.commit();
    return respuestaSolicitud(solicitud, `la anulación del informe ${informeFolio(antes)}`);
  }
  const despues = await ejecutarAnulacionInforme(s, user, id, motivo, actuo);
  await s.commit();
  return json({ message: "Informe anulado", item: serializeInforme(despues) });
}

/* Anula el informe (directo desde borrador/revision, o al aprobarse la solicitud). */
export async function ejecutarAnulacionInforme(s: Session, user: CurrentUser, id: number, motivo: string, actuo: { rol_id: number; cargo: string }, detalle: Record<string, unknown> = {}): Promise<Row> {
  await ensureInformesSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (!antes) throw new HttpError(404, { message: "Informe no encontrado" });
  if (String(antes.estado) === "anulado") throw new HttpError(409, { message: "El informe ya esta anulado" });
  await s.execute(`UPDATE ${TABLE} SET estado_previo = :previo, estado = 'anulado', anulado_en = :fecha, anulado_por = :usuario, anulado_rol_id = :rol_id, anulado_cargo = :cargo, motivo_anulacion = :motivo WHERE id = :id`, { previo: String(antes.estado), fecha: new Date().toISOString(), usuario: userIdFromClaims(user), rol_id: actuo.rol_id, cargo: actuo.cargo, motivo, id });
  const despues = (await snapshotRow(s, TABLE, id))!;
  if (despues.archivo_pdf) {
    // Se regenera el PDF con la marca de anulado; el original queda en auditoria por su huella.
    const pdf = await renderInformePdf(await buildRender(s, despues, []));
    await fs.promises.writeFile(path.join(informesDir(), String(despues.archivo_pdf)), pdf);
    await s.execute(`UPDATE ${TABLE} SET pdf_sha256 = :sha WHERE id = :id`, { sha: createHash("sha256").update(pdf).digest("hex"), id });
  }
  await registrarAuditoria(s, user, { accion: "anular", entidad: TABLE, entidadId: id, referencia: informeFolio(despues), motivo, antes, despues, detalle: { actuo_como: actuo, ...detalle } });
  return (await snapshotRow(s, TABLE, id))!;
}

/*
 * Excepcion de segregacion (Fase 3): solo la pide quien podria revisar o
 * autorizar el informe (permiso y estado) y la segregacion se lo impide de verdad.
 */
export async function violacionParaExcepcionInforme(s: Session, user: CurrentUser, id: number, accion: string): Promise<{ violacion: Violacion | null; row: Row }> {
  if (accion !== "revisar" && accion !== "autorizar") throw new HttpError(400, { message: "En un informe la excepción aplica a revisar o autorizar" });
  await requirePermission(s, user, "informes", accion === "revisar" ? "R" : "A");
  await ensureInformesSchema(s);
  const row = await snapshotRow(s, TABLE, id);
  if (!row) throw new HttpError(404, { message: "Informe no encontrado" });
  const estado = accion === "revisar" ? "borrador" : "en_revision";
  if (String(row.estado) !== estado) throw new HttpError(409, { message: `El informe ${informeFolio(row)} no está ${accion === "revisar" ? "en borrador" : "en revisión"}; no hay nada que ${accion}` });
  const ids = safeJsonLoad<number[]>(String(row.analisis_ids_json || "[]"), []);
  return { violacion: await violacionInforme(s, userIdFromClaims(user) as number, row, ids, accion), row };
}

/*
 * Regla 2 de segregacion: elaboradores del informe (creador, elaborado_por y
 * quien lo edito) y de cada analisis incluido, segun la bitacora.
 */
async function violacionInforme(s: Session, usuarioId: number, informe: Row, analisisIds: number[], accion: "revisar" | "autorizar") {
  const elaboradores = await elaboradoresDe(s, TABLE, Number(informe.id), informe.creado_por, informe.elaborado_por);
  const porAnalisis: Array<{ folio: string; elaboradores: Set<number> }> = [];
  for (const analisisId of analisisIds) {
    const fila = await s.queryOne<Row>("SELECT id, folio_num, creado_por FROM muestras_analisis WHERE id = :id", { id: analisisId });
    if (!fila) continue;
    porAnalisis.push({ folio: `A ${String(fila.folio_num || 0).padStart(7, "0")}`, elaboradores: await elaboradoresDe(s, "muestras_analisis", analisisId, fila.creado_por) });
  }
  return evaluarInforme(usuarioId, elaboradores, porAnalisis, accion);
}

/* Enmienda (7.8.8): nuevo informe en borrador, misma numeracion, version +1, que declara al que sustituye. */
export async function amendInforme({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const permisoC = await requirePermission(s, user, "informes", "C", { objeto: "informe", borrador: true });
  const actuo = cargoActuante(request, permisoC);
  await ensureInformesSchema(s);
  const original = await snapshotRow(s, TABLE, id);
  if (!original) return json({ message: "Informe no encontrado" }, 404);
  if (!["autorizado", "entregado", "anulado"].includes(String(original.estado))) return json({ message: "Solo se enmiendan informes autorizados, entregados o anulados; los borradores se editan" }, 409);
  await exigirSinSolicitudPendiente(s, TABLE, id, `El informe ${informeFolio(original)}`, "enmendar");
  const motivo = await readMotivo(request);
  if (motivo.length < 5) return json({ message: "Indica el motivo de la enmienda (al menos 5 caracteres)" }, 400);
  const existente = await s.queryOne(`SELECT id FROM ${TABLE} WHERE sustituye_a = :id AND estado <> 'anulado'`, { id });
  if (existente) return json({ message: "Este informe ya tiene una enmienda vigente" }, 409);
  const maxVersion = Number((await s.scalar(`SELECT MAX(version) FROM ${TABLE} WHERE folio_num = :folio`, { folio: original.folio_num })) || 1);
  const userId = userIdFromClaims(user);
  const result = await s.execute(
    `
    INSERT INTO ${TABLE} (folio_num, version, recepcion_id, sustituye_a, motivo_enmienda, cliente_json, muestras_json, analisis_ids_json, resultados_json, declaraciones_json,
      fecha_emision, elaborado_por, elaborado_nombre, elaborado_cargo, elaborado_rol_id, observaciones, estado, creado_por, actualizado_por)
    VALUES (:folio_num, :version, :recepcion_id, :sustituye_a, :motivo, :cliente_json, :muestras_json, :analisis_ids_json, :resultados_json, :declaraciones_json,
      NULL, :usuario, :nombre, :cargo, :rol_id, :observaciones, 'borrador', :usuario, :usuario)
    `,
    {
      folio_num: original.folio_num,
      version: maxVersion + 1,
      recepcion_id: original.recepcion_id,
      sustituye_a: id,
      motivo,
      cliente_json: original.cliente_json,
      muestras_json: original.muestras_json,
      analisis_ids_json: original.analisis_ids_json,
      resultados_json: original.resultados_json,
      declaraciones_json: original.declaraciones_json,
      usuario: userId,
      nombre: String(user.nombre || ""),
      cargo: actuo.cargo,
      rol_id: actuo.rol_id,
      observaciones: original.observaciones,
    },
  );
  const nuevoId = result.lastrowid as number;
  await aplicarSupervision(s, TABLE, nuevoId, marcaSupervision(permisoC), userId);
  const despues = await snapshotRow(s, TABLE, nuevoId);
  await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: nuevoId, referencia: `${informeFolio(despues)} v${maxVersion + 1}`, motivo, despues, detalle: { enmienda_de: id, actuo_como: actuo } });
  await s.commit();
  return json({ message: "Enmienda creada en borrador", id: nuevoId, version: maxVersion + 1 }, 201);
}

export async function getInformePdf({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "V");
  await ensureInformesSchema(s);
  const row = await snapshotRow(s, TABLE, id);
  if (!row) return json({ message: "Informe no encontrado" }, 404);
  let pdf: Buffer;
  if (row.archivo_pdf && fs.existsSync(path.join(informesDir(), String(row.archivo_pdf)))) {
    pdf = await fs.promises.readFile(path.join(informesDir(), String(row.archivo_pdf)));
  } else {
    // Borrador: vista previa generada al vuelo, marcada como tal.
    const analyses = await loadAnalyses(s, safeJsonLoad<number[]>(String(row.analisis_ids_json || "[]"), []));
    const render = await buildRender(s, row, analyses);
    render.declaraciones = { ...render.declaraciones, opiniones: [render.declaraciones.opiniones, "VISTA PREVIA — informe no autorizado"].filter(Boolean).join("\n") };
    pdf = await renderInformePdf(render);
  }
  await registrarAuditoria(s, user, { accion: "descargar", entidad: TABLE, entidadId: id, referencia: informeFolio(row) });
  await s.commit();
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": `inline; filename="${informeFolio(row).replace(/\s+/g, "-")}-v${row.version}.pdf"` },
  });
}

export async function informesSummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "informes", "V");
  await ensureInformesSchema(s);
  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'borrador') AS borrador,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'en_revision') AS en_revision,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'autorizado') AS autorizados,
      (SELECT COUNT(*) FROM ${TABLE} WHERE estado = 'entregado') AS entregados,
      (SELECT COUNT(*) FROM muestras_analisis WHERE estado = 'aprobado') AS analisis_aprobados
    `,
  );
  return json(summary || {});
}
