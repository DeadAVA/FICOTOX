import { requireUser, userIdFromClaims, type CurrentUser } from "../../auth";
import { registrarAuditoria, snapshotRow } from "../../audit";
import { isSqlite, type Row, type Session } from "../../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../../http";
import { restoreInventoryUsage } from "../../inventory-usage";
import { requirePermission } from "../../rbac";
import { recordBitacoraFolios } from "../inventory";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../../schema";
import { advanceState, anularRegistro, applyStageInventory, assertEditable, assertOrigin, deletionNotAllowed, ensureAnulacionColumns, folioLabel, insumosDeclarados, isFolioConflict, nextFolioNum, readMotivo, restaurarRegistro } from "../../samples-flow";
import { TWO_PERSON_RULE } from "../../../shared/features";
import { ANALYSIS_METHODS, ANALYSIS_TYPES, CONFORMITY_OPTIONS } from "../../../shared/sgc";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toFloatOrNull, toIntOrNull } from "../helpers";

/*
 * Etapa de analisis (ISO/IEC 17025 7.5, 7.7 y 7.8; diagrama de flujo del
 * laboratorio): registro del ensayo con metodo, equipo, controles de calidad
 * y resultados por muestra; revision y aprobacion con firma antes de poder
 * incluirse en un informe.
 *
 * La clave del formato oficial de registro de analisis (FX-TCI-[ID]) aun no
 * la entrega el laboratorio; el campo metodo_referencia guarda la clave y
 * revision del protocolo aplicado.
 */

const TABLE = "muestras_analisis";
const TYPES = new Set(ANALYSIS_TYPES.map((item) => item.value));
const METHODS = new Set(ANALYSIS_METHODS.map((item) => item.value));
const CONFORMITY = new Set(CONFORMITY_OPTIONS.map((item) => item.value));

export async function ensureAnalysisSchema(s: Session): Promise<void> {
  if (schemaReady("muestras_analisis")) return;
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS muestras_analisis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio_num INTEGER NOT NULL UNIQUE,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'A',
        tipo_analisis VARCHAR(40) NOT NULL,
        metodo VARCHAR(40) NOT NULL,
        metodo_otro VARCHAR(160) DEFAULT NULL,
        metodo_referencia VARCHAR(160) DEFAULT NULL,
        metodo_documento_id INTEGER DEFAULT NULL,
        recepcion_id INTEGER DEFAULT NULL,
        procesamiento_id INTEGER DEFAULT NULL,
        extraccion_id INTEGER DEFAULT NULL,
        fecha_analisis DATE DEFAULT NULL,
        hora_inicio VARCHAR(20) DEFAULT NULL,
        hora_fin VARCHAR(20) DEFAULT NULL,
        equipo_id INTEGER DEFAULT NULL,
        equipo_nombre VARCHAR(150) DEFAULT NULL,
        equipo_clave_bitacora VARCHAR(60) DEFAULT NULL,
        equipo_folio_bitacora VARCHAR(60) DEFAULT NULL,
        condiciones_json TEXT,
        resultados_json TEXT,
        controles_json TEXT,
        uso_inventario_json TEXT,
        observaciones TEXT,
        analista_nombre VARCHAR(180) DEFAULT NULL,
        analista_firma TEXT,
        revisado_por INTEGER DEFAULT NULL,
        revisado_nombre VARCHAR(180) DEFAULT NULL,
        revisado_en VARCHAR(40) DEFAULT NULL,
        revisado_firma TEXT,
        revision_observaciones TEXT,
        aprobado_por INTEGER DEFAULT NULL,
        aprobado_nombre VARCHAR(180) DEFAULT NULL,
        aprobado_en VARCHAR(40) DEFAULT NULL,
        aprobado_firma TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrado',
        creado_por INTEGER DEFAULT NULL,
        actualizado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS muestras_analisis (
        id INT NOT NULL AUTO_INCREMENT,
        folio_num INT NOT NULL,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'A',
        tipo_analisis VARCHAR(40) NOT NULL,
        metodo VARCHAR(40) NOT NULL,
        metodo_otro VARCHAR(160) DEFAULT NULL,
        metodo_referencia VARCHAR(160) DEFAULT NULL,
        metodo_documento_id INT DEFAULT NULL,
        recepcion_id INT DEFAULT NULL,
        procesamiento_id INT DEFAULT NULL,
        extraccion_id INT DEFAULT NULL,
        fecha_analisis DATE DEFAULT NULL,
        hora_inicio VARCHAR(20) DEFAULT NULL,
        hora_fin VARCHAR(20) DEFAULT NULL,
        equipo_id INT DEFAULT NULL,
        equipo_nombre VARCHAR(150) DEFAULT NULL,
        equipo_clave_bitacora VARCHAR(60) DEFAULT NULL,
        equipo_folio_bitacora VARCHAR(60) DEFAULT NULL,
        condiciones_json LONGTEXT,
        resultados_json LONGTEXT,
        controles_json LONGTEXT,
        uso_inventario_json LONGTEXT,
        observaciones TEXT,
        analista_nombre VARCHAR(180) DEFAULT NULL,
        analista_firma LONGTEXT,
        revisado_por INT DEFAULT NULL,
        revisado_nombre VARCHAR(180) DEFAULT NULL,
        revisado_en VARCHAR(40) DEFAULT NULL,
        revisado_firma LONGTEXT,
        revision_observaciones TEXT,
        aprobado_por INT DEFAULT NULL,
        aprobado_nombre VARCHAR(180) DEFAULT NULL,
        aprobado_en VARCHAR(40) DEFAULT NULL,
        aprobado_firma LONGTEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrado',
        creado_por INT DEFAULT NULL,
        actualizado_por INT DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_muestras_analisis_folio_num (folio_num),
        KEY idx_muestras_analisis_recepcion (recepcion_id),
        KEY idx_muestras_analisis_extraccion (extraccion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, TABLE, "metodo_documento_id", "INT DEFAULT NULL");
  await ensureAnulacionColumns(s, TABLE);
  markSchemaReady("muestras_analisis");
}


export function serializeAnalysis(row: Row): Row {
  const item: Row = { ...row };
  for (const key of ["condiciones", "resultados", "controles", "uso_inventario"]) {
    item[key] = safeJsonLoad(item[`${key}_json`], key === "resultados" || key === "uso_inventario" ? [] : {});
    delete item[`${key}_json`];
  }
  return item;
}

interface ResultadoRow {
  id_muestra: string | null;
  resultado: number | null;
  resultado_texto: string | null;
  unidad: string | null;
  limite_deteccion: number | null;
  limite_cuantificacion: number | null;
  limite_regulatorio: number | null;
  incertidumbre: number | null;
  cumple: string | null;
  observacion: string | null;
}

function normalizeResultados(raw: unknown): ResultadoRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: ResultadoRow[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const idMuestra = strippedOrNull(item.id_muestra, 100);
    if (!idMuestra) continue;
    const cumple = String(item.cumple || "").trim();
    rows.push({
      id_muestra: idMuestra,
      resultado: toFloatOrNull(item.resultado),
      resultado_texto: strippedOrNull(item.resultado_texto, 160),
      unidad: strippedOrNull(item.unidad, 30),
      limite_deteccion: toFloatOrNull(item.limite_deteccion),
      limite_cuantificacion: toFloatOrNull(item.limite_cuantificacion),
      limite_regulatorio: toFloatOrNull(item.limite_regulatorio),
      incertidumbre: toFloatOrNull(item.incertidumbre),
      cumple: CONFORMITY.has(cumple) ? cumple : null,
      observacion: strippedOrNull(item.observacion),
    });
  }
  return rows;
}

function normalizeControles(raw: unknown): Record<string, unknown> {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const blanco = (value.blanco && typeof value.blanco === "object" ? value.blanco : {}) as Record<string, unknown>;
  const mr = (value.material_referencia && typeof value.material_referencia === "object" ? value.material_referencia : {}) as Record<string, unknown>;
  const dup = (value.duplicado && typeof value.duplicado === "object" ? value.duplicado : {}) as Record<string, unknown>;
  return {
    blanco: { resultado: strippedOrNull(blanco.resultado, 60), aceptable: strippedOrNull(blanco.aceptable, 10) },
    material_referencia: {
      ref: strippedOrNull(mr.ref, 60),
      nombre: strippedOrNull(mr.nombre, 180),
      lote: strippedOrNull(mr.lote, 80),
      caducidad: strippedOrNull(mr.caducidad, 10),
      valor_esperado: strippedOrNull(mr.valor_esperado, 60),
      valor_obtenido: strippedOrNull(mr.valor_obtenido, 60),
      aceptable: strippedOrNull(mr.aceptable, 10),
    },
    duplicado: { id_muestra: strippedOrNull(dup.id_muestra, 100), diferencia: strippedOrNull(dup.diferencia, 60), aceptable: strippedOrNull(dup.aceptable, 10) },
  };
}

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  const tipo = String(payload.tipo_analisis || "").trim();
  const metodo = String(payload.metodo || "").trim();
  const condiciones = (payload.condiciones && typeof payload.condiciones === "object" ? payload.condiciones : {}) as Record<string, unknown>;
  return {
    folio_num: toIntOrNull(payload.folio_num),
    tipo_analisis: TYPES.has(tipo) ? tipo : "",
    metodo: METHODS.has(metodo) ? metodo : "",
    metodo_otro: strippedOrNull(payload.metodo_otro, 160),
    metodo_referencia: strippedOrNull(payload.metodo_referencia, 160),
    metodo_documento_id: toIntOrNull(payload.metodo_documento_id),
    recepcion_id: toIntOrNull(payload.recepcion_id),
    procesamiento_id: toIntOrNull(payload.procesamiento_id),
    extraccion_id: toIntOrNull(payload.extraccion_id),
    fecha_analisis: strippedOrNull(payload.fecha_analisis, 10),
    hora_inicio: strippedOrNull(payload.hora_inicio, 20),
    hora_fin: strippedOrNull(payload.hora_fin, 20),
    equipo_id: toIntOrNull(payload.equipo_id),
    equipo_nombre: strippedOrNull(payload.equipo_nombre, 150),
    equipo_clave_bitacora: strippedOrNull(payload.equipo_clave_bitacora, 60),
    equipo_folio_bitacora: strippedOrNull(payload.equipo_folio_bitacora, 60),
    condiciones_json: jsonText({ temperatura_ambiente: strippedOrNull(condiciones.temperatura_ambiente, 20), humedad: strippedOrNull(condiciones.humedad, 20), observaciones: strippedOrNull(condiciones.observaciones) }),
    resultados_json: jsonText(normalizeResultados(payload.resultados)),
    controles_json: jsonText(normalizeControles(payload.controles)),
    uso_inventario_json: jsonText(Array.isArray(payload.uso_inventario) ? payload.uso_inventario : []),
    observaciones: strippedOrNull(payload.observaciones),
    analista_nombre: strippedOrNull(payload.analista_nombre, 180),
    analista_firma: strippedOrNull(payload.analista_firma),
  };
}

type AnalysisData = ReturnType<typeof normalizePayload>;

function validate(data: AnalysisData): string | null {
  if (!data.tipo_analisis) return "Selecciona el tipo de analisis";
  if (!data.metodo) return "Selecciona el metodo de analisis";
  if (data.metodo === "otro" && !data.metodo_otro) return "Especifica el metodo de analisis";
  if (!data.fecha_analisis) return "La fecha del analisis es obligatoria";
  const meta = ANALYSIS_TYPES.find((item) => item.value === data.tipo_analisis);
  if (meta?.requiere_extraccion && !data.extraccion_id) return `El analisis de ${meta.label} requiere una extraccion vinculada`;
  if (!data.analista_nombre) return "Indica el nombre del analista";
  const resultados = safeJsonLoad<ResultadoRow[]>(data.resultados_json, []);
  if (!resultados.length) return "Captura al menos un resultado por muestra";
  for (const row of resultados) {
    if (row.resultado === null && !row.resultado_texto) return `Captura el resultado de la muestra ${row.id_muestra}`;
  }
  return null;
}

/* Deriva y verifica la cadena recepcion -> procesamiento -> extraccion. */
async function resolveChain(s: Session, data: AnalysisData): Promise<void> {
  if (data.extraccion_id) {
    const extraccion = await assertOrigin(s, "muestras_extraccion", data.extraccion_id);
    const procesamientoId = toIntOrNull(extraccion?.procesamiento_id);
    if (procesamientoId) {
      const procesamiento = await assertOrigin(s, "muestras_procesamiento", procesamientoId);
      data.procesamiento_id = procesamientoId;
      const recepcionId = toIntOrNull(procesamiento?.recepcion_id);
      if (recepcionId) data.recepcion_id = recepcionId;
    }
  } else if (data.procesamiento_id) {
    const procesamiento = await assertOrigin(s, "muestras_procesamiento", data.procesamiento_id);
    const recepcionId = toIntOrNull(procesamiento?.recepcion_id);
    if (recepcionId) data.recepcion_id = recepcionId;
  }
  if (!data.recepcion_id) throw new HttpError(400, { message: "El analisis debe vincularse a una recepcion de muestra (directamente o a traves de la extraccion)" });
  await assertOrigin(s, "muestras_recepcion", data.recepcion_id, { requireAccepted: true });
}


async function snapshotEquipo(s: Session, data: AnalysisData): Promise<void> {
  if (!data.equipo_id) return;
  const row = await s.queryOne<{ nombre: string; clave_bitacora: string | null }>("SELECT nombre, clave_bitacora FROM equipos WHERE id = :id", { id: data.equipo_id });
  if (row) {
    data.equipo_nombre = row.nombre;
    data.equipo_clave_bitacora = data.equipo_clave_bitacora || row.clave_bitacora || null;
  }
}


export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureAnalysisSchema(s);
  return json({ next_folio: await nextFolioNum(s, TABLE) });
}

export async function listAnalyses({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureAnalysisSchema(s);
  const search = searchParam(request, "search");
  const estado = searchParam(request, "estado");
  const recepcionId = toIntOrNull(searchParam(request, "recepcion_id")) || 0;
  const extraccionId = toIntOrNull(searchParam(request, "extraccion_id")) || 0;
  const includeAnulados = searchParam(request, "anulados") === "1";
  const rows = await s.query(
    `
    SELECT a.id, a.folio_num, a.tipo_analisis, a.metodo, a.metodo_otro, a.metodo_referencia,
           a.recepcion_id, a.procesamiento_id, a.extraccion_id, a.fecha_analisis, a.equipo_nombre,
           a.analista_nombre, a.revisado_nombre, a.aprobado_nombre, a.estado, a.motivo_anulacion,
           a.resultados_json, a.creado_en,
           r.folio_num AS folio_recepcion_num, r.solicitante, r.id_interno AS recepcion_id_interno,
           e.folio_num AS folio_extraccion_num, e.tipo_registro AS tipo_extraccion
    FROM ${TABLE} a
    LEFT JOIN muestras_recepcion r ON r.id = a.recepcion_id
    LEFT JOIN muestras_extraccion e ON e.id = a.extraccion_id
    WHERE (:incluir_anulados = 1 OR a.estado <> 'anulado')
      AND (:estado = '' OR a.estado = :estado OR (:estado = 'pendiente' AND a.estado IN ('registrado', 'revisado')))
      AND (:recepcion_id = 0 OR a.recepcion_id = :recepcion_id)
      AND (:extraccion_id = 0 OR a.extraccion_id = :extraccion_id)
      AND (:search = ''
        OR CAST(a.folio_num AS CHAR) LIKE :search_like
        OR r.solicitante LIKE :search_like
        OR r.id_interno LIKE :search_like
        OR a.analista_nombre LIKE :search_like
        OR a.resultados_json LIKE :search_like)
    ORDER BY a.folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%`, estado, recepcion_id: recepcionId, extraccion_id: extraccionId, incluir_anulados: includeAnulados ? 1 : 0 },
  );
  return json({
    items: rows.map((row) => {
      const resultados = safeJsonLoad<ResultadoRow[]>(row.resultados_json, []);
      const item: Row = { ...row, muestras: resultados.length, no_conformes: resultados.filter((entry) => entry.cumple === "no_cumple").length };
      delete item.resultados_json;
      return item;
    }),
    total: rows.length,
  });
}

export async function getAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureAnalysisSchema(s);
  const row = await s.queryOne(`SELECT * FROM ${TABLE} WHERE id = :id`, { id });
  if (!row) return json({ message: "Registro no encontrado" }, 404);
  // Informes que reportan este analisis (el LIKE acota; la lista JSON decide).
  const candidatos = await s.query<Row>("SELECT id, folio_num, version, estado, analisis_ids_json FROM informes WHERE analisis_ids_json LIKE :like", { like: `%${id}%` }).catch(() => [] as Row[]);
  const informes = candidatos
    .filter((inf) => safeJsonLoad<number[]>(String(inf.analisis_ids_json || "[]"), []).includes(id))
    .map((inf) => ({ id: inf.id, folio_num: inf.folio_num, version: inf.version, estado: inf.estado }));
  return json({ item: { ...serializeAnalysis(row), informes } });
}

export async function createAnalysis({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "create");
  await ensureAnalysisSchema(s);
  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) data.folio_num = await nextFolioNum(s, TABLE);
  const invalid = validate(data);
  if (invalid) return json({ message: invalid }, 400);
  await resolveChain(s, data);
  await snapshotEquipo(s, data);
  const userId = userIdFromClaims(user);
  try {
    const result = await s.execute(
      `
      INSERT INTO ${TABLE} (
        folio_num, tipo_analisis, metodo, metodo_otro, metodo_referencia, metodo_documento_id,
        recepcion_id, procesamiento_id, extraccion_id, fecha_analisis, hora_inicio, hora_fin,
        equipo_id, equipo_nombre, equipo_clave_bitacora, equipo_folio_bitacora,
        condiciones_json, resultados_json, controles_json, uso_inventario_json, observaciones,
        analista_nombre, analista_firma, estado, creado_por, actualizado_por
      ) VALUES (
        :folio_num, :tipo_analisis, :metodo, :metodo_otro, :metodo_referencia, :metodo_documento_id,
        :recepcion_id, :procesamiento_id, :extraccion_id, :fecha_analisis, :hora_inicio, :hora_fin,
        :equipo_id, :equipo_nombre, :equipo_clave_bitacora, :equipo_folio_bitacora,
        :condiciones_json, :resultados_json, :controles_json, :uso_inventario_json, :observaciones,
        :analista_nombre, :analista_firma, 'registrado', :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    const id = result.lastrowid as number;
    await applyStageInventory(s, "ANA", id, data.uso_inventario_json, `Analisis folio ${data.folio_num}`, userId);
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), despues });
    await recordBitacoraFolios(s, [{ equipoId: data.equipo_id, folio: data.equipo_folio_bitacora }]);
    await s.commit();
    return json({ message: "Analisis registrado", id, folio_num: data.folio_num }, 201);
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) return json({ message: "El folio de analisis ya existe" }, 409);
    throw error;
  }
}

export async function updateAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureAnalysisSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  if (String(antes?.estado) === "aprobado") {
    return json({ message: "Un analisis aprobado no se edita; anulalo con motivo y registra uno nuevo" }, 409);
  }
  assertEditable(antes, TABLE);
  const payload = await readJson(request);
  const data = normalizePayload(payload);
  if (!data.folio_num) return json({ message: "El folio es obligatorio" }, 400);
  const invalid = validate(data);
  if (invalid) return json({ message: invalid }, 400);
  await resolveChain(s, data);
  await snapshotEquipo(s, data);
  const userId = userIdFromClaims(user);
  // Editar un analisis ya revisado lo regresa a "registrado": la revision debe repetirse.
  const wasReviewed = String(antes?.estado) === "revisado";
  const motivo = String(payload.motivo_cambio || "").trim();
  if (wasReviewed && motivo.length < 5) return json({ message: "El analisis ya fue revisado: indica el motivo del cambio (al menos 5 caracteres)" }, 400);
  try {
    await s.execute(
      `
      UPDATE ${TABLE} SET
        folio_num = :folio_num, tipo_analisis = :tipo_analisis, metodo = :metodo, metodo_otro = :metodo_otro,
        metodo_referencia = :metodo_referencia, metodo_documento_id = :metodo_documento_id,
        recepcion_id = :recepcion_id, procesamiento_id = :procesamiento_id, extraccion_id = :extraccion_id,
        fecha_analisis = :fecha_analisis, hora_inicio = :hora_inicio, hora_fin = :hora_fin,
        equipo_id = :equipo_id, equipo_nombre = :equipo_nombre, equipo_clave_bitacora = :equipo_clave_bitacora,
        equipo_folio_bitacora = :equipo_folio_bitacora, condiciones_json = :condiciones_json,
        resultados_json = :resultados_json, controles_json = :controles_json, uso_inventario_json = :uso_inventario_json,
        observaciones = :observaciones, analista_nombre = :analista_nombre, analista_firma = :analista_firma,
        estado = 'registrado', revisado_por = NULL, revisado_nombre = NULL, revisado_en = NULL, revisado_firma = NULL, revision_observaciones = NULL,
        actualizado_por = :actualizado_por
      WHERE id = :id
      `,
      { ...data, id, actualizado_por: userId },
    );
    await restoreInventoryUsage(s, `ANA-${id}-INS-`);
    await applyStageInventory(s, "ANA", id, data.uso_inventario_json, `Analisis folio ${data.folio_num}`, userId, insumosDeclarados(antes?.uso_inventario_json));
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), antes, despues, motivo: motivo || null });
    await recordBitacoraFolios(s, [{ equipoId: data.equipo_id, folio: data.equipo_folio_bitacora }]);
    await s.commit();
    return json({ message: wasReviewed ? "Analisis actualizado; requiere revision de nuevo" : "Analisis actualizado" });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) return json({ message: "El folio de analisis ya existe" }, 409);
    throw error;
  }
}

export async function deleteAnalysis({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  return deletionNotAllowed();
}

/*
 * Regla de dos personas (7.8.2.1 y FX-MC): si quien actua es la misma persona
 * que hizo el paso previo, solo se permite con `permitir_misma_persona` y un
 * motivo (>= 5 caracteres) que queda en la bitacora. Regresa el motivo, null si
 * no aplica, o la respuesta 409/400 que corresponde.
 */
export async function samePersonException(previousUserId: unknown, user: CurrentUser, payload: Record<string, unknown>, message: string): Promise<string | null | Response> {
  // Con la regla apagada, quien tiene el permiso puede hacer todos los pasos.
  if (!TWO_PERSON_RULE) return null;
  if (!previousUserId || Number(previousUserId) !== userIdFromClaims(user)) return null;
  if (!payload.permitir_misma_persona) return json({ message: `${message} (envia permitir_misma_persona=true y el motivo para registrar la excepcion)` }, 409);
  const motivo = String(payload.motivo || "").trim();
  if (motivo.length < 5) return json({ message: "Indica el motivo de la excepcion (al menos 5 caracteres)" }, 400);
  return motivo;
}

/* Revision tecnica (segunda persona): deja nombre, fecha y firma. */
export async function reviewAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "aprobaciones", "update");
  await ensureAnalysisSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  assertEditable(antes, TABLE);
  if (String(antes?.estado) !== "registrado") return json({ message: "Solo se revisan analisis en estado registrado" }, 409);
  const payload = await readJson(request);
  // Independencia de la revision: quien capturo el analisis no lo revisa, salvo excepcion con motivo.
  const excepcion = await samePersonException(antes?.creado_por, user, payload, "La revision debe hacerla una persona distinta de quien registro el analisis");
  if (excepcion instanceof Response) return excepcion;
  const now = new Date().toISOString();
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'revisado', revisado_por = :usuario, revisado_nombre = :nombre, revisado_en = :fecha, revisado_firma = :firma, revision_observaciones = :obs WHERE id = :id`,
    { usuario: userIdFromClaims(user), nombre: String(user.nombre || user.email || "").slice(0, 180), fecha: now, firma: strippedOrNull(payload.firma), obs: strippedOrNull(payload.observaciones), id },
  );
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "revisar", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), antes, despues, motivo: excepcion || strippedOrNull(payload.observaciones), detalle: excepcion ? { excepcion: "misma persona registro y reviso" } : null });
  await s.commit();
  return json({ message: "Analisis revisado", item: serializeAnalysis(despues!) });
}

/* Aprobacion: a partir de aqui el resultado puede reportarse. */
export async function approveAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "aprobaciones", "update");
  await ensureAnalysisSchema(s);
  const antes = await snapshotRow(s, TABLE, id);
  assertEditable(antes, TABLE);
  if (String(antes?.estado) !== "revisado") return json({ message: "El analisis debe estar revisado antes de aprobarse" }, 409);
  const payload = await readJson(request);
  // Independencia de la aprobacion: quien reviso no aprueba, salvo excepcion con motivo.
  const excepcion = await samePersonException(antes?.revisado_por, user, payload, "La aprobacion debe hacerla una persona distinta de quien reviso");
  if (excepcion instanceof Response) return excepcion;
  const now = new Date().toISOString();
  await s.execute(
    `UPDATE ${TABLE} SET estado = 'aprobado', aprobado_por = :usuario, aprobado_nombre = :nombre, aprobado_en = :fecha, aprobado_firma = :firma WHERE id = :id`,
    { usuario: userIdFromClaims(user), nombre: String(user.nombre || user.email || "").slice(0, 180), fecha: now, firma: strippedOrNull(payload.firma), id },
  );
  await advanceState(s, "muestras_extraccion", toIntOrNull(antes?.extraccion_id), "analizada");
  await advanceState(s, "muestras_procesamiento", toIntOrNull(antes?.procesamiento_id), "completada");
  await advanceState(s, "muestras_recepcion", toIntOrNull(antes?.recepcion_id), "analizada");
  const despues = await snapshotRow(s, TABLE, id);
  await registrarAuditoria(s, user, { accion: "aprobar", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), antes, despues, motivo: excepcion, detalle: excepcion ? { excepcion: "misma persona reviso y aprobo" } : null });
  await s.commit();
  return json({ message: "Analisis aprobado", item: serializeAnalysis(despues!) });
}

export async function anularAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureAnalysisSchema(s);
  const motivo = await readMotivo(request);
  const row = await anularRegistro(s, user, TABLE, id, motivo, {
    movimientosPrefix: `ANA-${id}-INS-`,
    bloqueaSi: async () => {
      const informes = await s.query<{ folio_num: number; analisis_ids_json: string }>("SELECT folio_num, analisis_ids_json FROM informes WHERE estado IN ('autorizado', 'entregado')").catch(() => []);
      const usado = informes.find((inf) => safeJsonLoad<number[]>(inf.analisis_ids_json, []).includes(id));
      return usado ? `El analisis esta incluido en el informe IR ${String(usado.folio_num).padStart(7, "0")} autorizado; anula o enmienda el informe primero` : null;
    },
  });
  await s.commit();
  return json({ message: "Analisis anulado", item: serializeAnalysis(row) });
}

export async function restaurarAnalysis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureAnalysisSchema(s);
  const row = await restaurarRegistro(s, user, TABLE, id, await readMotivo(request));
  await s.commit();
  return json({ message: "Analisis restaurado", item: serializeAnalysis(row) });
}

/* Usado por informes: analisis aprobados de una recepcion. */
export async function approvedAnalysesForReception(s: Session, recepcionId: number): Promise<Row[]> {
  await ensureAnalysisSchema(s);
  const rows = await s.query(`SELECT * FROM ${TABLE} WHERE recepcion_id = :id AND estado = 'aprobado' ORDER BY folio_num`, { id: recepcionId });
  return rows.map(serializeAnalysis);
}

