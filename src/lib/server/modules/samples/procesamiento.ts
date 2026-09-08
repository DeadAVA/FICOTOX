import { requireUser, userIdFromClaims } from "../../auth";
import { isIntegrityError, isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { consumeConsumible, consumeReactivo, restoreInventoryUsage } from "../../inventory-usage";
import { requirePermission } from "../../rbac";
import { addColumnIfMissing } from "../../schema";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";

/* Portado de modules/samples/procesamiento.py del backend Flask original. */

export async function ensureSamplesProcesamientoSchema(s: Session): Promise<void> {
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
  await s.commit();
}

async function nextFolioNum(s: Session): Promise<number> {
  const row = await s.queryOne<{ next_folio: number }>("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_procesamiento");
  return Number.parseInt(String(row?.next_folio ?? 1), 10) || 1;
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

async function applyInventoryUsage(s: Session, processingId: number, data: ProcessingData, userId: number | null): Promise<void> {
  const insumos = safeJsonLoad<unknown[]>(data.uso_inventario_json, []);
  if (!Array.isArray(insumos)) return;
  for (let idx = 0; idx < insumos.length; idx += 1) {
    const insumo = insumos[idx];
    if (!insumo || typeof insumo !== "object" || Array.isArray(insumo)) continue;
    const item = insumo as Record<string, unknown>;
    const tipo = String(item.tipo || "").trim().toLowerCase();
    const ref = item.ref || item.nombre || "";
    const cantidad = item.cantidad || 1;
    if (!ref) continue;
    const referenciaMov = `PROC-${processingId}-INS-${idx}`;
    const options = { userId, motivo: `Procesamiento de muestra folio ${data.folio_num}`, referencia: referenciaMov };
    if (tipo === "reactivo") {
      await consumeReactivo(s, ref, cantidad, options);
    } else if (tipo === "consumible") {
      await consumeConsumible(s, ref, cantidad, options);
    }
  }
}

async function replaceInventoryUsage(s: Session, processingId: number, data: ProcessingData, userId: number | null): Promise<void> {
  await restoreInventoryUsage(s, `PROC-${processingId}-INS-`);
  await applyInventoryUsage(s, processingId, data, userId);
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

function isFolioConflict(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || "");
  return message.includes("uq_muestras_procesamiento_folio_num") || (isIntegrityError(error) && message.includes("folio_num"));
}

export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesProcesamientoSchema(s);
  return json({ next_folio: await nextFolioNum(s) });
}

export async function listProcessingSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesProcesamientoSchema(s);

  const search = searchParam(request, "search");
  const rows = await s.query(
    `
    SELECT p.id, p.folio_num, p.tipo_registro, p.fecha_procesamiento,
           p.hora_procesamiento, p.folio_recepcion_num, p.id_interno,
           p.muestra_tipo, p.estado, p.nombre_quien_proceso, p.creado_en
    FROM muestras_procesamiento p
    WHERE :search = ''
       OR p.id_interno LIKE :search_like
       OR CAST(p.folio_num AS CHAR) LIKE :search_like
       OR CAST(COALESCE(p.folio_recepcion_num, 0) AS CHAR) LIKE :search_like
    ORDER BY p.folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%` },
  );
  return json({ items: rows, total: rows.length });
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
    data.folio_num = await nextFolioNum(s);
  }
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
    await applyInventoryUsage(s, result.lastrowid as number, data, userId);
    await s.commit();
    return json({ message: "Procesamiento creado", id: result.lastrowid }, 201);
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

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    return json({ message: "El folio de procesamiento es obligatorio" }, 400);
  }
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
    await replaceInventoryUsage(s, processingId, data, userId);
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

export async function deleteProcessingSample({ request, s, params }: RouteContext): Promise<Response> {
  const processingId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesProcesamientoSchema(s);

  const result = await s.execute("DELETE FROM muestras_procesamiento WHERE id = :id", { id: processingId });
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ message: "Procesamiento eliminado" });
}
