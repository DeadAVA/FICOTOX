import { requireUser, userIdFromClaims } from "../../auth";
import { registrarAuditoria, snapshotRow } from "../../audit";
import { isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { restoreInventoryUsage } from "../../inventory-usage";
import { requirePermission } from "../../rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../../schema";
import { advanceState, anularRegistro, applyStageInventory, assertEditable, assertOrigin, deletionNotAllowed, ensureAnulacionColumns, folioLabel, insumosDeclarados, isFolioConflict, nextFolioNum, readMotivo, restaurarRegistro } from "../../samples-flow";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";

/*
 * Portado de modules/samples/procesamiento.py del backend Flask original.
 * Agregados: reglas de flujo (solo desde recepciones aceptadas y vigentes),
 * anulacion con motivo, auditoria y avance automatico del estado de la recepcion.
 */

const TABLE = "muestras_procesamiento";

export async function ensureSamplesProcesamientoSchema(s: Session): Promise<void> {
  if (schemaReady("muestras_procesamiento")) return;
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS muestras_procesamiento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio_num INTEGER NOT NULL UNIQUE,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'P',
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMP',
        fecha_emision DATE DEFAULT NULL,
        fecha_procesamiento DATE DEFAULT NULL,
        hora_procesamiento VARCHAR(20) DEFAULT NULL,
        recepcion_id INTEGER DEFAULT NULL,
        folio_recepcion_num INTEGER DEFAULT NULL,
        muestra_tipo VARCHAR(20) DEFAULT NULL,
        id_interno VARCHAR(100) DEFAULT NULL,
        lote_seleccion_json TEXT,
        tipo_organismo_json TEXT,
        parte_organismo_json TEXT,
        bivalvos_steps_json TEXT,
        sardinas_steps_json TEXT,
        otro_procesamiento TEXT,
        resguardo_json TEXT,
        observaciones_generales TEXT,
        nombre_quien_proceso VARCHAR(180) DEFAULT NULL,
        nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
        firma_quien_proceso TEXT,
        firma_quien_superviso TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
        creado_por INTEGER DEFAULT NULL,
        actualizado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS muestras_procesamiento (
        id INT NOT NULL AUTO_INCREMENT,
        folio_num INT NOT NULL,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'P',
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMP',
        fecha_emision DATE DEFAULT NULL,
        fecha_procesamiento DATE DEFAULT NULL,
        hora_procesamiento VARCHAR(20) DEFAULT NULL,
        recepcion_id INT DEFAULT NULL,
        folio_recepcion_num INT DEFAULT NULL,
        muestra_tipo VARCHAR(20) DEFAULT NULL,
        id_interno VARCHAR(100) DEFAULT NULL,
        lote_seleccion_json LONGTEXT,
        tipo_organismo_json LONGTEXT,
        parte_organismo_json LONGTEXT,
        bivalvos_steps_json LONGTEXT,
        sardinas_steps_json LONGTEXT,
        otro_procesamiento TEXT,
        resguardo_json LONGTEXT,
        observaciones_generales TEXT,
        nombre_quien_proceso VARCHAR(180) DEFAULT NULL,
        nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
        firma_quien_proceso LONGTEXT,
        firma_quien_superviso LONGTEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
        creado_por INT DEFAULT NULL,
        actualizado_por INT DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_muestras_procesamiento_folio_num (folio_num),
        KEY idx_muestras_procesamiento_recepcion_id (recepcion_id),
        KEY idx_muestras_procesamiento_creado_por (creado_por),
        KEY idx_muestras_procesamiento_actualizado_por (actualizado_por),
        CONSTRAINT fk_muestras_procesamiento_recepcion FOREIGN KEY (recepcion_id) REFERENCES muestras_recepcion(id) ON DELETE SET NULL,
        CONSTRAINT fk_muestras_procesamiento_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_muestras_procesamiento_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, "muestras_procesamiento", "lote_seleccion_json", "LONGTEXT AFTER `id_interno`");
  await addColumnIfMissing(s, "muestras_procesamiento", "firma_quien_proceso", "LONGTEXT AFTER `nombre_quien_superviso`");
  await addColumnIfMissing(s, "muestras_procesamiento", "firma_quien_superviso", "LONGTEXT AFTER `firma_quien_proceso`");
  await addColumnIfMissing(s, "muestras_procesamiento", "uso_inventario_json", "TEXT DEFAULT NULL");
  /* "Otro" del formato: tipo de organismo y parte del organismo escritos a mano. */
  await addColumnIfMissing(s, "muestras_procesamiento", "tipo_organismo_otro", "VARCHAR(180) DEFAULT NULL");
  await addColumnIfMissing(s, "muestras_procesamiento", "parte_organismo_otro", "VARCHAR(180) DEFAULT NULL");
  await ensureAnulacionColumns(s, TABLE);
  markSchemaReady("muestras_procesamiento");
}


type ProcessingData = ReturnType<typeof normalizePayload>;

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  return {
    folio_num: toIntOrNull(payload.folio_num),
    tipo_registro: String(payload.tipo_registro || "P").trim().slice(0, 2),
    clave_revision: String(payload.clave_revision || "FX-TCF-GMP").trim().slice(0, 50),
    fecha_emision: payload.fecha_emision || null,
    fecha_procesamiento: payload.fecha_procesamiento || null,
    hora_procesamiento: strippedOrNull(payload.hora_procesamiento, 20),
    recepcion_id: toIntOrNull(payload.recepcion_id),
    folio_recepcion_num: toIntOrNull(payload.folio_recepcion_num),
    muestra_tipo: strippedOrNull(payload.muestra_tipo, 20),
    id_interno: strippedOrNull(payload.id_interno, 100),
    lote_seleccion_json: jsonText(payload.lote_seleccion || []),
    tipo_organismo_json: jsonText(payload.tipo_organismo || []),
    parte_organismo_json: jsonText(payload.parte_organismo || []),
    tipo_organismo_otro: strippedOrNull(payload.tipo_organismo_otro, 180),
    parte_organismo_otro: strippedOrNull(payload.parte_organismo_otro, 180),
    bivalvos_steps_json: jsonText(payload.bivalvos_steps || []),
    sardinas_steps_json: jsonText(payload.sardinas_steps || []),
    otro_procesamiento: strippedOrNull(payload.otro_procesamiento),
    resguardo_json: jsonText(payload.resguardo || {}),
    observaciones_generales: strippedOrNull(payload.observaciones_generales),
    nombre_quien_proceso: strippedOrNull(payload.nombre_quien_proceso, 180),
    nombre_quien_superviso: strippedOrNull(payload.nombre_quien_superviso, 180),
    firma_quien_proceso: strippedOrNull(payload.firma_quien_proceso),
    firma_quien_superviso: strippedOrNull(payload.firma_quien_superviso),
    estado: String(payload.estado || "registrada").trim().slice(0, 30) || "registrada",
    uso_inventario_json: jsonText(payload.uso_inventario || []),
  };
}


async function replaceInventoryUsage(s: Session, processingId: number, data: ProcessingData, userId: number | null, declaradosAntes: Map<string, number>): Promise<void> {
  await restoreInventoryUsage(s, `PROC-${processingId}-INS-`);
  await applyStageInventory(s, "PROC", processingId, data.uso_inventario_json, `Procesamiento de muestra folio ${data.folio_num}`, userId, declaradosAntes);
}

function serializeRow(row: Row): Row {
  const item: Row = { ...row };
  item.tipo_organismo = safeJsonLoad(item.tipo_organismo_json, []);
  delete item.tipo_organismo_json;
  item.parte_organismo = safeJsonLoad(item.parte_organismo_json, []);
  delete item.parte_organismo_json;
  item.lote_seleccion = safeJsonLoad(item.lote_seleccion_json, []);
  delete item.lote_seleccion_json;
  item.bivalvos_steps = safeJsonLoad(item.bivalvos_steps_json, []);
  delete item.bivalvos_steps_json;
  item.sardinas_steps = safeJsonLoad(item.sardinas_steps_json, []);
  delete item.sardinas_steps_json;
  item.resguardo = safeJsonLoad(item.resguardo_json, {});
  delete item.resguardo_json;
  item.uso_inventario = safeJsonLoad(item.uso_inventario_json, []);
  delete item.uso_inventario_json;
  return item;
}


export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesProcesamientoSchema(s);
  return json({ next_folio: await nextFolioNum(s, TABLE) });
}

export async function listProcessingSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesProcesamientoSchema(s);

  const search = searchParam(request, "search");
  const includeAnuladas = searchParam(request, "anuladas") === "1";
  const rows = await s.query(
    `
    SELECT p.id, p.folio_num, p.tipo_registro, p.fecha_procesamiento,
           p.hora_procesamiento, p.recepcion_id, p.folio_recepcion_num, p.id_interno,
           p.muestra_tipo, p.tipo_organismo_json, p.estado, p.motivo_anulacion, p.anulado_en,
           p.nombre_quien_proceso, p.creado_en
    FROM muestras_procesamiento p
    WHERE (:incluir_anuladas = 1 OR p.estado <> 'anulada')
      AND (:search = ''
       OR p.id_interno LIKE :search_like
       OR CAST(p.folio_num AS CHAR) LIKE :search_like
       OR CAST(COALESCE(p.folio_recepcion_num, 0) AS CHAR) LIKE :search_like)
    ORDER BY p.folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%`, incluir_anuladas: includeAnuladas ? 1 : 0 },
  );
  return json({
    items: rows.map((row) => {
      const item: Row = { ...row, tipo_organismo: safeJsonLoad(row.tipo_organismo_json, []) };
      delete item.tipo_organismo_json;
      return item;
    }),
    total: rows.length,
  });
}

export async function getProcessingSample({ request, s, params }: RouteContext): Promise<Response> {
  const processingId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesProcesamientoSchema(s);

  const row = await s.queryOne(
    `
    SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
           fecha_procesamiento, hora_procesamiento, recepcion_id,
           folio_recepcion_num, muestra_tipo, id_interno,
           lote_seleccion_json,
           tipo_organismo_json, parte_organismo_json,
           bivalvos_steps_json, sardinas_steps_json,
           otro_procesamiento, resguardo_json,
           observaciones_generales, nombre_quien_proceso,
           nombre_quien_superviso, firma_quien_proceso,
           firma_quien_superviso, uso_inventario_json,
           estado, creado_en, actualizado_en
    FROM muestras_procesamiento
    WHERE id = :id
    `,
    { id: processingId },
  );
  if (!row) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ item: serializeRow(row) });
}

export async function createProcessingSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "create");
  await ensureSamplesProcesamientoSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    data.folio_num = await nextFolioNum(s, TABLE);
  }
  // Solo se procesa una muestra recibida, aceptada y vigente.
  await assertOrigin(s, "muestras_recepcion", data.recepcion_id, { requireAccepted: true });
  if (data.estado === "anulada") data.estado = "registrada";
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      INSERT INTO muestras_procesamiento (
        folio_num, tipo_registro, clave_revision, fecha_emision,
        fecha_procesamiento, hora_procesamiento, recepcion_id,
        folio_recepcion_num, muestra_tipo, id_interno,
        lote_seleccion_json,
        tipo_organismo_json, parte_organismo_json,
        tipo_organismo_otro, parte_organismo_otro,
        bivalvos_steps_json, sardinas_steps_json,
        otro_procesamiento, resguardo_json,
        observaciones_generales, nombre_quien_proceso,
        nombre_quien_superviso, firma_quien_proceso,
        firma_quien_superviso, uso_inventario_json,
        estado, creado_por, actualizado_por
      ) VALUES (
        :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
        :fecha_procesamiento, :hora_procesamiento, :recepcion_id,
        :folio_recepcion_num, :muestra_tipo, :id_interno,
        :lote_seleccion_json,
        :tipo_organismo_json, :parte_organismo_json,
        :tipo_organismo_otro, :parte_organismo_otro,
        :bivalvos_steps_json, :sardinas_steps_json,
        :otro_procesamiento, :resguardo_json,
        :observaciones_generales, :nombre_quien_proceso,
        :nombre_quien_superviso, :firma_quien_proceso,
        :firma_quien_superviso, :uso_inventario_json,
        :estado, :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    const id = result.lastrowid as number;
    await applyStageInventory(s, "PROC", id, data.uso_inventario_json, `Procesamiento de muestra folio ${data.folio_num}`, userId);
    await advanceState(s, "muestras_recepcion", data.recepcion_id, "en_proceso");
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), despues });
    await s.commit();
    return json({ message: "Procesamiento creado", id }, 201);
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio de procesamiento ya existe" }, 409);
    }
    throw error;
  }
}

export async function updateProcessingSample({ request, s, params }: RouteContext): Promise<Response> {
  const processingId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureSamplesProcesamientoSchema(s);

  const antes = await snapshotRow(s, TABLE, processingId);
  assertEditable(antes, TABLE);
  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    return json({ message: "El folio de procesamiento es obligatorio" }, 400);
  }
  if (data.recepcion_id !== toIntOrNull(antes?.recepcion_id)) {
    await assertOrigin(s, "muestras_recepcion", data.recepcion_id, { requireAccepted: true });
  }
  // El estado lo maneja el flujo: no se anula ni se retrocede desde el formato.
  if (data.estado === "anulada" || ["en_proceso", "completada"].includes(String(antes?.estado || ""))) data.estado = String(antes?.estado || "registrada");
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      UPDATE muestras_procesamiento
      SET folio_num = :folio_num,
        tipo_registro = :tipo_registro,
        clave_revision = :clave_revision,
        fecha_emision = :fecha_emision,
        fecha_procesamiento = :fecha_procesamiento,
        hora_procesamiento = :hora_procesamiento,
        recepcion_id = :recepcion_id,
        folio_recepcion_num = :folio_recepcion_num,
        muestra_tipo = :muestra_tipo,
        id_interno = :id_interno,
        lote_seleccion_json = :lote_seleccion_json,
        tipo_organismo_json = :tipo_organismo_json,
        parte_organismo_json = :parte_organismo_json,
        tipo_organismo_otro = :tipo_organismo_otro,
        parte_organismo_otro = :parte_organismo_otro,
        bivalvos_steps_json = :bivalvos_steps_json,
        sardinas_steps_json = :sardinas_steps_json,
        otro_procesamiento = :otro_procesamiento,
        resguardo_json = :resguardo_json,
        observaciones_generales = :observaciones_generales,
        nombre_quien_proceso = :nombre_quien_proceso,
        nombre_quien_superviso = :nombre_quien_superviso,
        firma_quien_proceso = :firma_quien_proceso,
        firma_quien_superviso = :firma_quien_superviso,
        uso_inventario_json = :uso_inventario_json,
        estado = :estado,
        actualizado_por = :actualizado_por
      WHERE id = :id
      `,
      { ...data, id: processingId, actualizado_por: userId },
    );
    if (result.rowcount === 0) {
      await s.rollback();
      return json({ message: "Registro no encontrado" }, 404);
    }
    await replaceInventoryUsage(s, processingId, data, userId, insumosDeclarados(antes?.uso_inventario_json));
    await advanceState(s, "muestras_recepcion", data.recepcion_id, "en_proceso");
    const despues = await snapshotRow(s, TABLE, processingId);
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: processingId, referencia: folioLabel(TABLE, despues), antes, despues });
    await s.commit();
    return json({ message: "Procesamiento actualizado" });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio de procesamiento ya existe" }, 409);
    }
    throw error;
  }
}

/* Los registros tecnicos no se eliminan; se anulan con motivo. */
export async function deleteProcessingSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  return deletionNotAllowed();
}

export async function anularProcessingSample({ request, s, params }: RouteContext): Promise<Response> {
  const processingId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesProcesamientoSchema(s);
  const motivo = await readMotivo(request);
  const row = await anularRegistro(s, user, TABLE, processingId, motivo, {
    movimientosPrefix: `PROC-${processingId}-INS-`,
    bloqueaSi: async () => {
      const activas = Number((await s.scalar("SELECT COUNT(*) FROM muestras_extraccion WHERE procesamiento_id = :id AND estado <> 'anulada'", { id: processingId })) || 0);
      return activas ? `El procesamiento tiene ${activas} extraccion(es) vigente(s); anulalas primero` : null;
    },
  });
  await s.commit();
  return json({ message: "Procesamiento anulado; el inventario descontado fue repuesto", item: serializeRow(row) });
}

export async function restaurarProcessingSample({ request, s, params }: RouteContext): Promise<Response> {
  const processingId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesProcesamientoSchema(s);
  const row = await restaurarRegistro(s, user, TABLE, processingId, await readMotivo(request));
  await s.commit();
  return json({ message: "Procesamiento restaurado. El inventario no se vuelve a descontar: revisa los insumos y guarda de nuevo si aplica", item: serializeRow(row) });
}
