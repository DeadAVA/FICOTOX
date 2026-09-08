import { requireUser, userIdFromClaims } from "../../auth";
import { isIntegrityError, isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { requirePermission } from "../../rbac";
import { addColumnIfMissing } from "../../schema";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";

/* Portado de modules/samples/recepcion.py del backend Flask original. */

export async function ensureSamplesRecepcionSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS muestras_recepcion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folio_num INTEGER NOT NULL UNIQUE,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',
        fecha_emision DATE DEFAULT NULL,
        fecha_recepcion DATE DEFAULT NULL,
        hora_recepcion VARCHAR(20) DEFAULT NULL,
        recibido_por VARCHAR(150) DEFAULT NULL,
        medio_recepcion VARCHAR(50) DEFAULT NULL,
        solicitante VARCHAR(180) DEFAULT NULL,
        muestra_unica INTEGER DEFAULT 0,
        fecha_muestra DATE DEFAULT NULL,
        id_interno VARCHAR(100) DEFAULT NULL,
        especificaciones TEXT,
        lote_muestras_json TEXT,
        analisis_json TEXT,
        inspeccion_json TEXT,
        datos_solicitante_json TEXT,
        datos_custodio_json TEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
        creado_por INTEGER DEFAULT NULL,
        actualizado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS muestras_recepcion (
        id INT NOT NULL AUTO_INCREMENT,
        folio_num INT NOT NULL,
        tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',
        clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',
        fecha_emision DATE DEFAULT NULL,
        fecha_recepcion DATE DEFAULT NULL,
        hora_recepcion VARCHAR(20) DEFAULT NULL,
        recibido_por VARCHAR(150) DEFAULT NULL,
        medio_recepcion VARCHAR(50) DEFAULT NULL,
        solicitante VARCHAR(180) DEFAULT NULL,
        muestra_unica TINYINT(1) DEFAULT 0,
        fecha_muestra DATE DEFAULT NULL,
        id_interno VARCHAR(100) DEFAULT NULL,
        especificaciones TEXT,
        lote_muestras_json LONGTEXT,
        analisis_json LONGTEXT,
        inspeccion_json LONGTEXT,
        datos_solicitante_json LONGTEXT,
        datos_custodio_json LONGTEXT,
        estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
        creado_por INT DEFAULT NULL,
        actualizado_por INT DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_muestras_recepcion_folio_num (folio_num),
        KEY idx_muestras_recepcion_creado_por (creado_por),
        KEY idx_muestras_recepcion_actualizado_por (actualizado_por),
        CONSTRAINT fk_muestras_recepcion_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_muestras_recepcion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await addColumnIfMissing(s, "muestras_recepcion", "recibido_por", "VARCHAR(150) DEFAULT NULL");
  await addColumnIfMissing(s, "muestras_recepcion", "medio_recepcion", "VARCHAR(50) DEFAULT NULL");
  await s.commit();
}

async function nextFolioNum(s: Session): Promise<number> {
  const row = await s.queryOne<{ next_folio: number }>("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_recepcion");
  return Number.parseInt(String(row?.next_folio ?? 1), 10) || 1;
}

function serializeRow(row: Row): Row {
  const item: Row = { ...row };
  item.lote_muestras = safeJsonLoad(item.lote_muestras_json, []);
  delete item.lote_muestras_json;
  item.analisis = safeJsonLoad(item.analisis_json, {});
  delete item.analisis_json;
  item.inspeccion = safeJsonLoad(item.inspeccion_json, {});
  delete item.inspeccion_json;
  item.datos_solicitante = safeJsonLoad(item.datos_solicitante_json, {});
  delete item.datos_solicitante_json;
  item.datos_custodio = safeJsonLoad(item.datos_custodio_json, {});
  delete item.datos_custodio_json;
  return item;
}

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  return {
    folio_num: toIntOrNull(payload.folio_num),
    tipo_registro: String(payload.tipo_registro || "R").trim().slice(0, 2),
    clave_revision: String(payload.clave_revision || "FX-TCF-GMR").trim().slice(0, 50),
    fecha_emision: payload.fecha_emision || null,
    fecha_recepcion: payload.fecha_recepcion || null,
    hora_recepcion: strippedOrNull(payload.hora_recepcion, 20),
    recibido_por: strippedOrNull(payload.recibido_por, 150),
    medio_recepcion: strippedOrNull(payload.medio_recepcion, 50),
    solicitante: strippedOrNull(payload.solicitante, 180),
    muestra_unica: payload.muestra_unica ? 1 : 0,
    fecha_muestra: payload.fecha_muestra || null,
    id_interno: strippedOrNull(payload.id_interno, 100),
    especificaciones: strippedOrNull(payload.especificaciones),
    lote_muestras_json: jsonText(payload.lote_muestras || []),
    analisis_json: jsonText(payload.analisis || {}),
    inspeccion_json: jsonText(payload.inspeccion || {}),
    datos_solicitante_json: jsonText(payload.datos_solicitante || {}),
    datos_custodio_json: jsonText(payload.datos_custodio || {}),
    estado: String(payload.estado || "registrada").trim().slice(0, 30) || "registrada",
  };
}

function isFolioConflict(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || "");
  return message.includes("uq_muestras_recepcion_folio_num") || (isIntegrityError(error) && message.includes("folio_num"));
}

export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);
  return json({ next_folio: await nextFolioNum(s) });
}

export async function listReceptionSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);

  const search = searchParam(request, "search");
  const rows = await s.query(
    `
    SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
           fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
           solicitante, id_interno, estado, creado_en
    FROM muestras_recepcion
    WHERE :search = ''
       OR solicitante LIKE :search_like
       OR recibido_por LIKE :search_like
       OR id_interno LIKE :search_like
    ORDER BY folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%` },
  );
  return json({ items: rows, total: rows.length });
}

export async function getReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);

  const row = await s.queryOne(
    `
    SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
           fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
           solicitante, muestra_unica,
           fecha_muestra, id_interno, especificaciones,
           lote_muestras_json, analisis_json, inspeccion_json,
           datos_solicitante_json, datos_custodio_json,
           estado, creado_en, actualizado_en
    FROM muestras_recepcion
    WHERE id = :id
    `,
    { id: sampleId },
  );
  if (!row) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ item: serializeRow(row) });
}

export async function createReceptionSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "create");
  await ensureSamplesRecepcionSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    data.folio_num = await nextFolioNum(s);
  }
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      INSERT INTO muestras_recepcion (
        folio_num, tipo_registro, clave_revision, fecha_emision,
          fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
          solicitante, muestra_unica,
        fecha_muestra, id_interno, especificaciones,
        lote_muestras_json, analisis_json, inspeccion_json,
        datos_solicitante_json, datos_custodio_json, estado,
        creado_por, actualizado_por
      ) VALUES (
        :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
          :fecha_recepcion, :hora_recepcion, :recibido_por, :medio_recepcion,
          :solicitante, :muestra_unica,
        :fecha_muestra, :id_interno, :especificaciones,
        :lote_muestras_json, :analisis_json, :inspeccion_json,
        :datos_solicitante_json, :datos_custodio_json, :estado,
        :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    await s.commit();
    return json({ message: "Recepcion de muestra creada", id: result.lastrowid }, 201);
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio ya existe" }, 409);
    }
    throw error;
  }
}

export async function updateReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureSamplesRecepcionSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    return json({ message: "El folio es obligatorio" }, 400);
  }
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      UPDATE muestras_recepcion
      SET folio_num = :folio_num,
        tipo_registro = :tipo_registro,
        clave_revision = :clave_revision,
        fecha_emision = :fecha_emision,
        fecha_recepcion = :fecha_recepcion,
        hora_recepcion = :hora_recepcion,
        recibido_por = :recibido_por,
        medio_recepcion = :medio_recepcion,
        solicitante = :solicitante,
        muestra_unica = :muestra_unica,
        fecha_muestra = :fecha_muestra,
        id_interno = :id_interno,
        especificaciones = :especificaciones,
        lote_muestras_json = :lote_muestras_json,
        analisis_json = :analisis_json,
        inspeccion_json = :inspeccion_json,
        datos_solicitante_json = :datos_solicitante_json,
        datos_custodio_json = :datos_custodio_json,
        estado = :estado,
        actualizado_por = :actualizado_por
      WHERE id = :id
      `,
      { ...data, id: sampleId, actualizado_por: userId },
    );
    await s.commit();
    if (result.rowcount === 0) {
      return json({ message: "Registro no encontrado" }, 404);
    }
    return json({ message: "Recepcion de muestra actualizada" });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio ya existe" }, 409);
    }
    throw error;
  }
}

export async function deleteReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesRecepcionSchema(s);

  const result = await s.execute("DELETE FROM muestras_recepcion WHERE id = :id", { id: sampleId });
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  return json({ message: "Recepcion de muestra eliminada" });
}
