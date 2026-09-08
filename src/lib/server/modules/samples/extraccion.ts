import { requireUser, userIdFromClaims } from "../../auth";
import { isIntegrityError, isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { consumeConsumible, consumeReactivo, restoreInventoryUsage } from "../../inventory-usage";
import { requirePermission } from "../../rbac";
import { addColumnIfMissing } from "../../schema";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";

/* Portado de modules/samples/extraccion.py del backend Flask original. */

export async function ensureSamplesExtraccionSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS muestras_extraccion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          folio_num INTEGER NOT NULL UNIQUE,
          tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',
          clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',
          fecha_emision DATE DEFAULT NULL,
          fecha_extraccion DATE DEFAULT NULL,
          hora_extraccion VARCHAR(20) DEFAULT NULL,
          procesamiento_id INTEGER DEFAULT NULL,
          folio_procesamiento_num INTEGER DEFAULT NULL,
          muestra_tipo VARCHAR(20) DEFAULT NULL,
          id_interno VARCHAR(100) DEFAULT NULL,
          tipo_molienda VARCHAR(20) DEFAULT NULL,
          pasos_json TEXT,
          registro_pesos_json TEXT,
          observaciones_generales TEXT,
          nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,
          nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,
          nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
          firma_quien_extrajo TEXT,
          firma_quien_limpieza TEXT,
          firma_quien_superviso TEXT,
          estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
          creado_por INTEGER DEFAULT NULL,
          actualizado_por INTEGER DEFAULT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS muestras_extraccion (
          id INT NOT NULL AUTO_INCREMENT,
          folio_num INT NOT NULL,
          tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',
          clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',
          fecha_emision DATE DEFAULT NULL,
          fecha_extraccion DATE DEFAULT NULL,
          hora_extraccion VARCHAR(20) DEFAULT NULL,
          procesamiento_id INT DEFAULT NULL,
          folio_procesamiento_num INT DEFAULT NULL,
          muestra_tipo VARCHAR(20) DEFAULT NULL,
          id_interno VARCHAR(100) DEFAULT NULL,
          tipo_molienda VARCHAR(20) DEFAULT NULL,
          pasos_json LONGTEXT,
          registro_pesos_json LONGTEXT,
          observaciones_generales TEXT,
          nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,
          nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,
          nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
          firma_quien_extrajo LONGTEXT,
          firma_quien_limpieza LONGTEXT,
          firma_quien_superviso LONGTEXT,
          estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
          creado_por INT DEFAULT NULL,
          actualizado_por INT DEFAULT NULL,
          creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_muestras_extraccion_folio_num (folio_num),
          KEY idx_muestras_extraccion_procesamiento_id (procesamiento_id),
          KEY idx_muestras_extraccion_creado_por (creado_por),
          KEY idx_muestras_extraccion_actualizado_por (actualizado_por),
          CONSTRAINT fk_muestras_extraccion_procesamiento FOREIGN KEY (procesamiento_id) REFERENCES muestras_procesamiento(id) ON DELETE SET NULL,
          CONSTRAINT fk_muestras_extraccion_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
          CONSTRAINT fk_muestras_extraccion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, "muestras_extraccion", "nombre_quien_limpieza", "VARCHAR(180) DEFAULT NULL AFTER `nombre_quien_extrajo`");
  await addColumnIfMissing(s, "muestras_extraccion", "firma_quien_extrajo", "LONGTEXT AFTER `nombre_quien_superviso`");
  await addColumnIfMissing(s, "muestras_extraccion", "firma_quien_limpieza", "LONGTEXT AFTER `firma_quien_extrajo`");
  await addColumnIfMissing(s, "muestras_extraccion", "firma_quien_superviso", "LONGTEXT AFTER `firma_quien_limpieza`");
  await addColumnIfMissing(s, "muestras_extraccion", "uso_inventario_json", "TEXT DEFAULT NULL");
  await s.commit();
}

async function nextFolioNum(s: Session): Promise<number> {
  const row = await s.queryOne<{ next_folio: number }>("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_extraccion");
  return Number.parseInt(String(row?.next_folio ?? 1), 10) || 1;
}

type ExtractionData = ReturnType<typeof normalizePayload>;

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  return {
    folio_num: toIntOrNull(payload.folio_num),
    tipo_registro: String(payload.tipo_registro || "E-A").trim().slice(0, 4),
    clave_revision: String(payload.clave_revision || "FX-TCF-GME-A").trim().slice(0, 50),
    fecha_emision: payload.fecha_emision || null,
    fecha_extraccion: payload.fecha_extraccion || null,
    hora_extraccion: strippedOrNull(payload.hora_extraccion, 20),
    procesamiento_id: toIntOrNull(payload.procesamiento_id),
    folio_procesamiento_num: toIntOrNull(payload.folio_procesamiento_num),
    muestra_tipo: strippedOrNull(payload.muestra_tipo, 20),
    id_interno: strippedOrNull(payload.id_interno, 100),
    tipo_molienda: strippedOrNull(payload.tipo_molienda, 20),
    pasos_json: jsonText(payload.pasos || {}),
    registro_pesos_json: jsonText(payload.registro_pesos || []),
    observaciones_generales: strippedOrNull(payload.observaciones_generales),
    nombre_quien_extrajo: strippedOrNull(payload.nombre_quien_extrajo, 180),
    nombre_quien_limpieza: strippedOrNull(payload.nombre_quien_limpieza, 180),
    nombre_quien_superviso: strippedOrNull(payload.nombre_quien_superviso, 180),
    firma_quien_extrajo: strippedOrNull(payload.firma_quien_extrajo),
    firma_quien_limpieza: strippedOrNull(payload.firma_quien_limpieza),
    firma_quien_superviso: strippedOrNull(payload.firma_quien_superviso),
    estado: String(payload.estado || "registrada").trim().slice(0, 30) || "registrada",
    uso_inventario_json: jsonText(payload.uso_inventario || []),
  };
}

async function applyInventoryUsage(s: Session, extractionId: number, data: ExtractionData, userId: number | null): Promise<void> {
  // Lista principal de insumos declarados en el formulario.
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
    const referenciaMov = `EXT-${extractionId}-INS-${idx}`;
    const options = { userId, motivo: `Extraccion de muestra folio ${data.folio_num}`, referencia: referenciaMov };
    if (tipo === "reactivo") {
      await consumeReactivo(s, ref, cantidad, options);
    } else if (tipo === "consumible") {
      await consumeConsumible(s, ref, cantidad, options);
    }
  }
}

async function replaceInventoryUsage(s: Session, extractionId: number, data: ExtractionData, userId: number | null): Promise<void> {
  await restoreInventoryUsage(s, `EXT-${extractionId}-INS-`);
  await applyInventoryUsage(s, extractionId, data, userId);
}

function serializeRow(row: Row): Row {
  const item: Row = { ...row };
  item.pasos = safeJsonLoad(item.pasos_json, {});
  delete item.pasos_json;
  item.registro_pesos = safeJsonLoad(item.registro_pesos_json, []);
  delete item.registro_pesos_json;
  item.uso_inventario = safeJsonLoad(item.uso_inventario_json, []);
  delete item.uso_inventario_json;
  return item;
}

function isFolioConflict(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || "");
  return message.includes("uq_muestras_extraccion_folio_num") || (isIntegrityError(error) && message.includes("folio_num"));
}

export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesExtraccionSchema(s);
  return json({ next_folio: await nextFolioNum(s) });
}

export async function listExtractionSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesExtraccionSchema(s);

  const search = searchParam(request, "search");
  const rows = await s.query(
    `
    SELECT e.id, e.folio_num, e.tipo_registro, e.fecha_extraccion,
           e.hora_extraccion, e.folio_procesamiento_num, e.id_interno,
           e.estado, e.creado_en
    FROM muestras_extraccion e
    WHERE :search = ''
       OR e.id_interno LIKE :search_like
       OR CAST(e.folio_num AS CHAR) LIKE :search_like
       OR CAST(COALESCE(e.folio_procesamiento_num, 0) AS CHAR) LIKE :search_like
    ORDER BY e.folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%` },
  );
  return json({ items: rows, total: rows.length });
}

export async function getExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesExtraccionSchema(s);

  const row = await s.queryOne(
    `
    SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
           fecha_extraccion, hora_extraccion, procesamiento_id,
           folio_procesamiento_num, muestra_tipo, id_interno,
           tipo_molienda, pasos_json, registro_pesos_json,
           observaciones_generales, nombre_quien_extrajo,
           nombre_quien_limpieza, nombre_quien_superviso,
           firma_quien_extrajo, firma_quien_limpieza,
           firma_quien_superviso, uso_inventario_json,
           estado, creado_en, actualizado_en
    FROM muestras_extraccion
    WHERE id = :id
    `,
    { id: extractionId },
  );
  if (!row) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ item: serializeRow(row) });
}

export async function createExtractionSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "create");
  await ensureSamplesExtraccionSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    data.folio_num = await nextFolioNum(s);
  }
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      INSERT INTO muestras_extraccion (
          folio_num, tipo_registro, clave_revision, fecha_emision,
          fecha_extraccion, hora_extraccion, procesamiento_id,
          folio_procesamiento_num, muestra_tipo, id_interno,
          tipo_molienda, pasos_json, registro_pesos_json,
          observaciones_generales, nombre_quien_extrajo,
          nombre_quien_limpieza, nombre_quien_superviso,
          firma_quien_extrajo, firma_quien_limpieza,
          firma_quien_superviso, uso_inventario_json,
          estado, creado_por, actualizado_por
      ) VALUES (
          :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
          :fecha_extraccion, :hora_extraccion, :procesamiento_id,
          :folio_procesamiento_num, :muestra_tipo, :id_interno,
          :tipo_molienda, :pasos_json, :registro_pesos_json,
          :observaciones_generales, :nombre_quien_extrajo,
          :nombre_quien_limpieza, :nombre_quien_superviso,
          :firma_quien_extrajo, :firma_quien_limpieza,
          :firma_quien_superviso, :uso_inventario_json,
          :estado, :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    await applyInventoryUsage(s, result.lastrowid as number, data, userId);
    await s.commit();
    return json({ message: "Extraccion creada", id: result.lastrowid }, 201);
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio de extraccion ya existe" }, 409);
    }
    throw error;
  }
}

export async function updateExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureSamplesExtraccionSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    return json({ message: "El folio de extraccion es obligatorio" }, 400);
  }
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      UPDATE muestras_extraccion
      SET folio_num = :folio_num,
          tipo_registro = :tipo_registro,
          clave_revision = :clave_revision,
          fecha_emision = :fecha_emision,
          fecha_extraccion = :fecha_extraccion,
          hora_extraccion = :hora_extraccion,
          procesamiento_id = :procesamiento_id,
          folio_procesamiento_num = :folio_procesamiento_num,
          muestra_tipo = :muestra_tipo,
          id_interno = :id_interno,
          tipo_molienda = :tipo_molienda,
          pasos_json = :pasos_json,
          registro_pesos_json = :registro_pesos_json,
          observaciones_generales = :observaciones_generales,
          nombre_quien_extrajo = :nombre_quien_extrajo,
          nombre_quien_limpieza = :nombre_quien_limpieza,
          nombre_quien_superviso = :nombre_quien_superviso,
          firma_quien_extrajo = :firma_quien_extrajo,
          firma_quien_limpieza = :firma_quien_limpieza,
          firma_quien_superviso = :firma_quien_superviso,
          uso_inventario_json = :uso_inventario_json,
          estado = :estado,
          actualizado_por = :actualizado_por
      WHERE id = :id
      `,
      { ...data, id: extractionId, actualizado_por: userId },
    );
    if (result.rowcount === 0) {
      await s.rollback();
      return json({ message: "Registro no encontrado" }, 404);
    }
    await replaceInventoryUsage(s, extractionId, data, userId);
    await s.commit();
    return json({ message: "Extraccion actualizada" });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio de extraccion ya existe" }, 409);
    }
    throw error;
  }
}

export async function deleteExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesExtraccionSchema(s);

  const result = await s.execute("DELETE FROM muestras_extraccion WHERE id = :id", { id: extractionId });
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ message: "Extraccion eliminada" });
}
