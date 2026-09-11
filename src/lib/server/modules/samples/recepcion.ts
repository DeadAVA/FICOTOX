import { requireUser, userIdFromClaims } from "../../auth";
import { registrarAuditoria, snapshotRow } from "../../audit";
import { isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { requirePermission } from "../../rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../../schema";
import { anularRegistro, assertEditable, deletionNotAllowed, ensureAnulacionColumns, folioLabel, isFolioConflict, nextFolioNum, readMotivo, restaurarRegistro } from "../../samples-flow";
import { ACCEPTANCE_DECISIONS, DISPOSAL_TYPES } from "../../../shared/sgc";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";

/*
 * Portado de modules/samples/recepcion.py del backend Flask original.
 *
 * Agregados (FX-MC 7.4.3 y 7.4.4): decision de aceptacion de la muestra con
 * comunicacion al cliente, disposicion final de remanentes (cierra la
 * muestra), anulacion con motivo en lugar de borrado y bitacora de auditoria.
 */

const TABLE = "muestras_recepcion";

export async function ensureSamplesRecepcionSchema(s: Session): Promise<void> {
  if (schemaReady("muestras_recepcion")) return;
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
        decision_aceptacion VARCHAR(30) DEFAULT NULL,
        aceptacion_json TEXT,
        disposicion_json TEXT,
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
        decision_aceptacion VARCHAR(30) DEFAULT NULL,
        aceptacion_json LONGTEXT,
        disposicion_json LONGTEXT,
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
  await addColumnIfMissing(s, TABLE, "recibido_por", "VARCHAR(150) DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "medio_recepcion", "VARCHAR(50) DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "decision_aceptacion", "VARCHAR(30) DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "aceptacion_json", "LONGTEXT");
  await addColumnIfMissing(s, TABLE, "disposicion_json", "LONGTEXT");
  await ensureAnulacionColumns(s, TABLE);
  markSchemaReady("muestras_recepcion");
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
  item.aceptacion = safeJsonLoad(item.aceptacion_json, {});
  delete item.aceptacion_json;
  item.disposicion = safeJsonLoad(item.disposicion_json, null);
  delete item.disposicion_json;
  return item;
}

const DECISIONS = new Set(ACCEPTANCE_DECISIONS.map((item) => item.value));

function normalizeAceptacion(raw: unknown): Record<string, unknown> {
  const value = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const comunicacion = (value.comunicacion_cliente && typeof value.comunicacion_cliente === "object" ? value.comunicacion_cliente : {}) as Record<string, unknown>;
  return {
    fecha: strippedOrNull(value.fecha, 10),
    responsable: strippedOrNull(value.responsable, 180),
    temperatura_llegada: strippedOrNull(value.temperatura_llegada, 20),
    observaciones: strippedOrNull(value.observaciones),
    comunicacion_cliente: {
      requerida: !!comunicacion.requerida,
      fecha: strippedOrNull(comunicacion.fecha, 10),
      medio: strippedOrNull(comunicacion.medio, 60),
      persona: strippedOrNull(comunicacion.persona, 180),
      respuesta: strippedOrNull(comunicacion.respuesta),
    },
  };
}

function normalizePayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  const decision = String(payload.decision_aceptacion || "").trim();
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
    decision_aceptacion: DECISIONS.has(decision) ? decision : null,
    aceptacion_json: jsonText(normalizeAceptacion(payload.aceptacion)),
    estado: String(payload.estado || "registrada").trim().slice(0, 30) || "registrada",
  };
}

type ReceptionData = ReturnType<typeof normalizePayload>;

/*
 * Reglas de aceptacion (FX-MC 7.4.3): para decidir hay que haber completado
 * la inspeccion visual; con algun requisito "NC" la muestra no puede quedar
 * como aceptada sin desviacion.
 */
function validateAcceptance(data: ReceptionData): string | null {
  if (!data.decision_aceptacion) return null;
  const inspeccion = safeJsonLoad<{ checklist?: Array<{ estado?: string }> }>(data.inspeccion_json, {});
  const checklist = Array.isArray(inspeccion.checklist) ? inspeccion.checklist : [];
  if (!checklist.length || checklist.some((row) => !row || !String(row.estado || "").trim())) {
    return "Para registrar la decision de aceptacion completa toda la inspeccion visual (C, NC o NA en cada requisito)";
  }
  const hasNc = checklist.some((row) => String(row.estado || "").toUpperCase() === "NC");
  if (hasNc && data.decision_aceptacion === "aceptada") {
    return "Hay requisitos que no cumplen (NC): la muestra solo puede aceptarse con desviacion o rechazarse";
  }
  const aceptacion = safeJsonLoad<{ comunicacion_cliente?: { fecha?: string; medio?: string } }>(data.aceptacion_json, {});
  if (data.decision_aceptacion !== "aceptada") {
    const comunicacion = aceptacion.comunicacion_cliente || {};
    if (!comunicacion.fecha || !comunicacion.medio) {
      return "Registra la comunicacion al cliente (fecha y medio) de la desviacion o el rechazo";
    }
  }
  return null;
}

/* El estado lo maneja el flujo; el cliente solo puede pedir estados manuales validos. */
function resolveState(stored: Row | null, data: ReceptionData): string {
  const current = stored ? String(stored.estado || "registrada") : "registrada";
  if (current === "anulada") return current;
  if (data.decision_aceptacion === "rechazada") return "rechazada";
  if (stored?.disposicion_json && current === "cerrada") return "cerrada";
  // Estados avanzados por el sistema (en_proceso, informada, cerrada) no se retroceden desde el formato.
  if (["en_proceso", "completada", "analizada", "informada", "cerrada"].includes(current)) return current;
  if (data.decision_aceptacion) return "aceptada";
  return "registrada";
}


export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);
  return json({ next_folio: await nextFolioNum(s, TABLE) });
}

export async function listReceptionSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);

  const search = searchParam(request, "search");
  const includeAnuladas = searchParam(request, "anuladas") === "1";
  const rows = await s.query(
    `
    SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
           fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
           solicitante, id_interno, muestra_unica, analisis_json, decision_aceptacion,
           estado, motivo_anulacion, anulado_en, creado_en
    FROM muestras_recepcion
    WHERE (:incluir_anuladas = 1 OR estado <> 'anulada')
      AND (:search = ''
       OR solicitante LIKE :search_like
       OR recibido_por LIKE :search_like
       OR id_interno LIKE :search_like
       OR CAST(folio_num AS CHAR) LIKE :search_like)
    ORDER BY folio_num DESC
    LIMIT 400
    `,
    { search, search_like: `%${search}%`, incluir_anuladas: includeAnuladas ? 1 : 0 },
  );
  return json({
    items: rows.map((row) => {
      const item: Row = { ...row, analisis: safeJsonLoad(row.analisis_json, {}) };
      delete item.analisis_json;
      return item;
    }),
    total: rows.length,
  });
}

export async function getReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);

  const row = await s.queryOne(`SELECT * FROM ${TABLE} WHERE id = :id`, { id: sampleId });
  if (!row) {
    return json({ message: "Registro no encontrado" }, 404);
  }
  // Etapas derivadas, para mostrar la cadena completa desde la recepcion.
  const procesamientos = await s.query("SELECT id, folio_num, estado FROM muestras_procesamiento WHERE recepcion_id = :id ORDER BY folio_num", { id: sampleId });
  return json({ item: { ...serializeRow(row), procesamientos } });
}

export async function createReceptionSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "create");
  await ensureSamplesRecepcionSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    data.folio_num = await nextFolioNum(s, TABLE);
  }
  const invalid = validateAcceptance(data);
  if (invalid) return json({ message: invalid }, 400);
  data.estado = resolveState(null, data);
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
        datos_solicitante_json, datos_custodio_json,
        decision_aceptacion, aceptacion_json, estado,
        creado_por, actualizado_por
      ) VALUES (
        :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
          :fecha_recepcion, :hora_recepcion, :recibido_por, :medio_recepcion,
          :solicitante, :muestra_unica,
        :fecha_muestra, :id_interno, :especificaciones,
        :lote_muestras_json, :analisis_json, :inspeccion_json,
        :datos_solicitante_json, :datos_custodio_json,
        :decision_aceptacion, :aceptacion_json, :estado,
        :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    const id = result.lastrowid as number;
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), despues });
    if (data.decision_aceptacion) {
      await registrarAuditoria(s, user, { accion: data.decision_aceptacion === "rechazada" ? "rechazar" : "aceptar", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), detalle: { decision: data.decision_aceptacion } });
    }
    await s.commit();
    return json({ message: "Recepcion de muestra creada", id, estado: data.estado }, 201);
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

  const antes = await snapshotRow(s, TABLE, sampleId);
  assertEditable(antes, TABLE);
  const data = normalizePayload(await readJson(request));
  if (!data.folio_num) {
    return json({ message: "El folio es obligatorio" }, 400);
  }
  const invalid = validateAcceptance(data);
  if (invalid) return json({ message: invalid }, 400);
  data.estado = resolveState(antes, data);
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
        decision_aceptacion = :decision_aceptacion,
        aceptacion_json = :aceptacion_json,
        estado = :estado,
        actualizado_por = :actualizado_por
      WHERE id = :id
      `,
      { ...data, id: sampleId, actualizado_por: userId },
    );
    if (result.rowcount === 0) {
      await s.rollback();
      return json({ message: "Registro no encontrado" }, 404);
    }
    const despues = await snapshotRow(s, TABLE, sampleId);
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: sampleId, referencia: folioLabel(TABLE, despues), antes, despues });
    if (data.decision_aceptacion && data.decision_aceptacion !== String(antes?.decision_aceptacion || "")) {
      await registrarAuditoria(s, user, { accion: data.decision_aceptacion === "rechazada" ? "rechazar" : "aceptar", entidad: TABLE, entidadId: sampleId, referencia: folioLabel(TABLE, despues), detalle: { decision: data.decision_aceptacion } });
    }
    await s.commit();
    return json({ message: "Recepcion de muestra actualizada", estado: data.estado });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: "El folio ya existe" }, 409);
    }
    throw error;
  }
}

/* Los registros tecnicos no se eliminan; el endpoint se conserva para responder 405 con la regla. */
export async function deleteReceptionSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  return deletionNotAllowed();
}

export async function anularReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesRecepcionSchema(s);
  const motivo = await readMotivo(request);
  const row = await anularRegistro(s, user, TABLE, sampleId, motivo, {
    bloqueaSi: async () => {
      const activos = Number((await s.scalar("SELECT COUNT(*) FROM muestras_procesamiento WHERE recepcion_id = :id AND estado <> 'anulada'", { id: sampleId })) || 0);
      return activos ? `La recepcion tiene ${activos} procesamiento(s) vigente(s); anulalos primero` : null;
    },
  });
  await s.commit();
  return json({ message: "Recepcion anulada", item: serializeRow(row) });
}

export async function restaurarReceptionSample({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesRecepcionSchema(s);
  const row = await restaurarRegistro(s, user, TABLE, sampleId, await readMotivo(request));
  await s.commit();
  return json({ message: "Recepcion restaurada", item: serializeRow(row) });
}

const DISPOSALS = new Set(DISPOSAL_TYPES.map((item) => item.value));

/* Disposicion final de remanentes: cierra la muestra (FX-MC 7.4.4). */
export async function registrarDisposicion({ request, s, params }: RouteContext): Promise<Response> {
  const sampleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureSamplesRecepcionSchema(s);

  const antes = await snapshotRow(s, TABLE, sampleId);
  if (!antes) return json({ message: "Recepcion no encontrada" }, 404);
  // Una muestra rechazada tambien se dispone (p. ej. se devuelve al cliente); una cerrada o anulada ya no.
  if (["cerrada", "anulada"].includes(String(antes.estado))) return json({ message: `La recepcion ${folioLabel(TABLE, antes)} ya esta ${antes.estado}; no admite otra disposicion` }, 409);
  const payload = await readJson(request);
  const tipo = String(payload.tipo || "").trim();
  if (!DISPOSALS.has(tipo)) return json({ message: "Selecciona el tipo de disposicion final" }, 400);
  const fecha = strippedOrNull(payload.fecha, 10);
  const responsable = strippedOrNull(payload.responsable, 180);
  if (!fecha || !responsable) return json({ message: "La fecha y el responsable de la disposicion son obligatorios" }, 400);
  const disposicion = {
    tipo,
    tipo_otro: tipo === "otro" ? strippedOrNull(payload.tipo_otro, 120) : null,
    fecha,
    responsable,
    firma: strippedOrNull(payload.firma),
    remanentes: strippedOrNull(payload.remanentes),
    observaciones: strippedOrNull(payload.observaciones),
    registrado_por: userIdFromClaims(user),
    registrado_en: new Date().toISOString(),
  };
  await s.execute(`UPDATE ${TABLE} SET disposicion_json = :disposicion, estado = 'cerrada', actualizado_por = :usuario WHERE id = :id`, { disposicion: jsonText(disposicion), usuario: userIdFromClaims(user), id: sampleId });
  const despues = await snapshotRow(s, TABLE, sampleId);
  await registrarAuditoria(s, user, { accion: "cerrar", entidad: TABLE, entidadId: sampleId, referencia: folioLabel(TABLE, despues), antes, despues, detalle: { disposicion: tipo } });
  await s.commit();
  return json({ message: "Disposicion final registrada; la muestra queda cerrada", item: serializeRow(despues || antes!) });
}

