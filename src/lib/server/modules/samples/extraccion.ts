import fs from "node:fs";
import path from "node:path";
import { requireUser, userIdFromClaims } from "../../auth";
import { registrarAuditoria, snapshotRow } from "../../audit";
import { getConfig } from "../../config";
import { isSqlite, type Row, type Session } from "../../db";
import { intParam, json, readJson, type RouteContext } from "../../http";
import { restoreInventoryUsage } from "../../inventory-usage";
import { requirePermission } from "../../rbac";
import { recordBitacoraFolios } from "../inventory";
import { addColumnIfMissing, getTableColumns, markSchemaReady, schemaReady } from "../../schema";
import { advanceState, anularRegistro, applyStageInventory, assertEditable, assertOrigin, deletionNotAllowed, ensureAnulacionColumns, folioLabel, insumosDeclarados, isFolioConflict, nextFolioNum, readMotivo, restaurarRegistro } from "../../samples-flow";
import { EXTRACTION_TYPES, claveForType, normalizeExtractionType, parseExtractionFolioSearch, type ExtractionType } from "../../../shared/extraction";
import { jsonText, safeJsonLoad, searchParam, strippedOrNull, toIntOrNull } from "../helpers";
import { ensureEquiposSchema } from "../inventory";

/*
 * Portado de modules/samples/extraccion.py del backend Flask original.
 *
 * Cambios respecto al original:
 * - Cada tipo de extraccion (E-A ASP, E-D DSP) lleva su propia serie de
 *   folios: la restriccion de unicidad es (tipo_registro, folio_num).
 *   Las bases existentes se migran en caliente la primera vez (SQLite:
 *   reconstruccion de la tabla con respaldo previo del archivo; MySQL:
 *   reemplazo del indice unico).
 * - `equipos_json`: equipos utilizados durante la extraccion con su clave
 *   y folio de bitacora (seccion "Equipos utilizados" del formato).
 */

const TABLE = "muestras_extraccion";
const REBUILD_TABLE = "muestras_extraccion__nuevo";
const UNIQUE_PER_TYPE = "uq_muestras_extraccion_tipo_folio";

/* Columnas finales, en orden. Se usan para crear la tabla y para copiarla al reconstruirla. */
const COLUMN_NAMES = [
  "id",
  "folio_num",
  "tipo_registro",
  "clave_revision",
  "fecha_emision",
  "fecha_extraccion",
  "hora_extraccion",
  "procesamiento_id",
  "folio_procesamiento_num",
  "muestra_tipo",
  "id_interno",
  "tipo_molienda",
  "pasos_json",
  "registro_pesos_json",
  "equipos_json",
  "uso_inventario_json",
  "observaciones_generales",
  "nombre_quien_extrajo",
  "nombre_quien_limpieza",
  "nombre_quien_superviso",
  "firma_quien_extrajo",
  "firma_quien_limpieza",
  "firma_quien_superviso",
  "estado",
  "creado_por",
  "actualizado_por",
  "creado_en",
  "actualizado_en",
  "anulado_en",
  "anulado_por",
  "motivo_anulacion",
  "estado_previo",
] as const;

const SQLITE_COLUMNS = `
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio_num INTEGER NOT NULL,
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
  equipos_json TEXT,
  uso_inventario_json TEXT DEFAULT NULL,
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
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  anulado_en VARCHAR(40) DEFAULT NULL,
  anulado_por INTEGER DEFAULT NULL,
  motivo_anulacion TEXT,
  estado_previo VARCHAR(30) DEFAULT NULL,
  UNIQUE (tipo_registro, folio_num)
`;

const MYSQL_CREATE = `
  CREATE TABLE IF NOT EXISTS ${TABLE} (
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
      equipos_json LONGTEXT,
      uso_inventario_json TEXT DEFAULT NULL,
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
      UNIQUE KEY ${UNIQUE_PER_TYPE} (tipo_registro, folio_num),
      KEY idx_muestras_extraccion_procesamiento_id (procesamiento_id),
      KEY idx_muestras_extraccion_creado_por (creado_por),
      KEY idx_muestras_extraccion_actualizado_por (actualizado_por),
      CONSTRAINT fk_muestras_extraccion_procesamiento FOREIGN KEY (procesamiento_id) REFERENCES muestras_procesamiento(id) ON DELETE SET NULL,
      CONSTRAINT fk_muestras_extraccion_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
      CONSTRAINT fk_muestras_extraccion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
`;

let folioPerTypeVerified = false;

export async function ensureSamplesExtraccionSchema(s: Session): Promise<void> {
  if (schemaReady("muestras_extraccion")) return;
  await s.execute(isSqlite() ? `CREATE TABLE IF NOT EXISTS ${TABLE} (${SQLITE_COLUMNS})` : MYSQL_CREATE);
  await addColumnIfMissing(s, TABLE, "nombre_quien_limpieza", "VARCHAR(180) DEFAULT NULL AFTER `nombre_quien_extrajo`");
  await addColumnIfMissing(s, TABLE, "firma_quien_extrajo", "LONGTEXT AFTER `nombre_quien_superviso`");
  await addColumnIfMissing(s, TABLE, "firma_quien_limpieza", "LONGTEXT AFTER `firma_quien_extrajo`");
  await addColumnIfMissing(s, TABLE, "firma_quien_superviso", "LONGTEXT AFTER `firma_quien_limpieza`");
  await addColumnIfMissing(s, TABLE, "uso_inventario_json", "TEXT DEFAULT NULL");
  await addColumnIfMissing(s, TABLE, "equipos_json", "LONGTEXT AFTER `registro_pesos_json`");
  await ensureAnulacionColumns(s, TABLE);
  if (!folioPerTypeVerified) {
    await ensureFolioPerType(s);
  }
  markSchemaReady("muestras_extraccion");
  // Solo se marca como verificada cuando la migracion ya quedo confirmada.
  folioPerTypeVerified = true;
}

/*
 * Migracion de la unicidad del folio: de UNIQUE(folio_num) a
 * UNIQUE(tipo_registro, folio_num). Idempotente: si la tabla ya esta
 * en la forma nueva no hace nada.
 */
async function ensureFolioPerType(s: Session): Promise<void> {
  if (isSqlite()) {
    if (await sqliteHasOldFolioIndex(s)) {
      backupSqliteFile("pre-folio-por-tipo");
      await rebuildSqliteTable(s);
    }
    return;
  }

  const rows = await s.query<{ INDEX_NAME: string; COLUMN_NAME: string }>(
    `
    SELECT INDEX_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table_name
      AND NON_UNIQUE = 0
      AND INDEX_NAME <> 'PRIMARY'
    ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `,
    { table_name: TABLE },
  );
  const byIndex = new Map<string, string[]>();
  for (const row of rows) {
    const list = byIndex.get(row.INDEX_NAME) || [];
    list.push(row.COLUMN_NAME);
    byIndex.set(row.INDEX_NAME, list);
  }
  const hasNew = byIndex.has(UNIQUE_PER_TYPE);
  for (const [name, columns] of byIndex) {
    if (columns.length === 1 && columns[0] === "folio_num") {
      await s.execute(`ALTER TABLE ${TABLE} DROP INDEX \`${name}\``);
    }
  }
  if (!hasNew) {
    await s.execute(`ALTER TABLE ${TABLE} ADD UNIQUE KEY ${UNIQUE_PER_TYPE} (tipo_registro, folio_num)`);
  }
}

async function sqliteHasOldFolioIndex(s: Session): Promise<boolean> {
  const indexes = await s.query<{ name: string; unique: number }>(`PRAGMA index_list("${TABLE}")`);
  for (const index of indexes) {
    if (!index.unique) continue;
    const columns = await s.query<{ name: string }>(`PRAGMA index_info("${index.name}")`);
    const names = columns.map((column) => column.name);
    if (names.length === 1 && names[0] === "folio_num") return true;
  }
  return false;
}

/* Copia del archivo SQLite antes de reconstruir la tabla (instance/backups/). */
function backupSqliteFile(reason: string): void {
  const config = getConfig();
  const source = config.SQLITE_PATH;
  if (!source || !fs.existsSync(source)) return;
  const folder = path.join(config.INSTANCE_DIR, "backups");
  fs.mkdirSync(folder, { recursive: true });
  // Marca de tiempo local (misma convencion que scripts/backup_ficotox.py).
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  fs.copyFileSync(source, path.join(folder, `ficotox-${stamp}-${reason}.sqlite3`));
}

async function rebuildSqliteTable(s: Session): Promise<void> {
  const existing = await getTableColumns(s, TABLE);
  const columns = COLUMN_NAMES.filter((name) => existing.has(name)).map((name) => `"${name}"`);
  const list = columns.join(", ");
  await s.execute(`DROP TABLE IF EXISTS ${REBUILD_TABLE}`);
  await s.execute(`CREATE TABLE ${REBUILD_TABLE} (${SQLITE_COLUMNS})`);
  await s.execute(`INSERT INTO ${REBUILD_TABLE} (${list}) SELECT ${list} FROM ${TABLE}`);
  await s.execute(`DROP TABLE ${TABLE}`);
  await s.execute(`ALTER TABLE ${REBUILD_TABLE} RENAME TO ${TABLE}`);
}


export interface EquipoUtilizado {
  equipo_id: number | null;
  nombre: string | null;
  uso: string | null;
  clave_bitacora: string | null;
  folio_bitacora: string | null;
}

function normalizeEquipos(value: unknown): EquipoUtilizado[] {
  if (!Array.isArray(value)) return [];
  const result: EquipoUtilizado[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const equipoId = toIntOrNull(item.equipo_id);
    const nombre = strippedOrNull(item.nombre, 150);
    if (!equipoId && !nombre) continue;
    result.push({
      equipo_id: equipoId,
      nombre,
      uso: strippedOrNull(item.uso, 160),
      clave_bitacora: strippedOrNull(item.clave_bitacora, 60),
      folio_bitacora: strippedOrNull(item.folio_bitacora, 60),
    });
  }
  return result;
}

/* Guarda el nombre vigente del equipo junto al id, para que el registro sea legible aunque el catalogo cambie. */
async function snapshotEquipos(s: Session, equipos: EquipoUtilizado[]): Promise<EquipoUtilizado[]> {
  if (!equipos.some((item) => item.equipo_id)) return equipos;
  await ensureEquiposSchema(s);
  const result: EquipoUtilizado[] = [];
  for (const item of equipos) {
    if (!item.equipo_id) {
      result.push(item);
      continue;
    }
    const row = await s.queryOne<{ nombre: string; clave_bitacora: string | null }>("SELECT nombre, clave_bitacora FROM equipos WHERE id = :id LIMIT 1", { id: item.equipo_id });
    result.push({
      ...item,
      nombre: row?.nombre || item.nombre,
      clave_bitacora: item.clave_bitacora || row?.clave_bitacora || null,
    });
  }
  return result;
}

type ExtractionData = ReturnType<typeof normalizePayload>;

function normalizePayload(raw: Record<string, unknown>, tipo: ExtractionType) {
  const payload = raw || {};
  return {
    folio_num: toIntOrNull(payload.folio_num),
    tipo_registro: tipo,
    // La clave debe ser la del formato del tipo (admite revisiones: FX-TCF-GME-D/2).
    clave_revision: claveForType(tipo, payload.clave_revision),
    fecha_emision: payload.fecha_emision || null,
    fecha_extraccion: payload.fecha_extraccion || null,
    hora_extraccion: strippedOrNull(payload.hora_extraccion, 20),
    procesamiento_id: toIntOrNull(payload.procesamiento_id),
    folio_procesamiento_num: toIntOrNull(payload.folio_procesamiento_num),
    muestra_tipo: strippedOrNull(payload.muestra_tipo, 20),
    id_interno: strippedOrNull(payload.id_interno, 100),
    tipo_molienda: strippedOrNull(payload.tipo_molienda, 20),
    pasos_json: jsonText(payload.pasos || {}),
    registro_pesos_json: jsonText(Array.isArray(payload.registro_pesos) ? payload.registro_pesos : []),
    equipos_json: jsonText(normalizeEquipos(payload.equipos)),
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

/*
 * El tipo viene en el cuerpo. Si falta: al crear se asume ASP (comportamiento
 * historico); al editar se conserva el tipo almacenado, para que un cliente
 * que omita el campo no convierta una DSP en ASP.
 */
async function resolveType(s: Session, payload: Record<string, unknown>, extractionId: number | null): Promise<ExtractionType | null> {
  const raw = payload?.tipo_registro;
  if (raw !== undefined && raw !== null && raw !== "") return normalizeExtractionType(raw);
  if (extractionId === null) return "E-A";
  const stored = await s.scalar<string>(`SELECT tipo_registro FROM ${TABLE} WHERE id = :id`, { id: extractionId });
  return normalizeExtractionType(stored) || "E-A";
}


async function replaceInventoryUsage(s: Session, extractionId: number, data: ExtractionData, userId: number | null, declaradosAntes: Map<string, number>): Promise<void> {
  await restoreInventoryUsage(s, `EXT-${extractionId}-INS-`);
  await applyStageInventory(s, "EXT", extractionId, data.uso_inventario_json, `Extraccion ${data.tipo_registro} folio ${data.folio_num}`, userId, declaradosAntes);
}

function serializeRow(row: Row): Row {
  const item: Row = { ...row };
  item.pasos = safeJsonLoad(item.pasos_json, {});
  delete item.pasos_json;
  item.registro_pesos = safeJsonLoad(item.registro_pesos_json, []);
  delete item.registro_pesos_json;
  item.equipos = safeJsonLoad(item.equipos_json, []);
  delete item.equipos_json;
  item.uso_inventario = safeJsonLoad(item.uso_inventario_json, []);
  delete item.uso_inventario_json;
  return item;
}


export async function getNextFolio({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesExtraccionSchema(s);
  const tipoParam = searchParam(request, "tipo");
  const tipo = tipoParam ? normalizeExtractionType(tipoParam) : "E-A";
  if (!tipo) {
    return json({ message: "Tipo de extraccion no valido" }, 400);
  }
  return json({ next_folio: await nextFolioNum(s, TABLE, "tipo_registro = :tipo", { tipo }), tipo_registro: tipo, clave_revision: EXTRACTION_TYPES[tipo].clave });
}

export async function listExtractionSamples({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesExtraccionSchema(s);

  const search = searchParam(request, "search");
  const tipoParam = searchParam(request, "tipo");
  const tipo = tipoParam ? normalizeExtractionType(tipoParam) : null;
  if (tipoParam && !tipo) {
    return json({ message: "Tipo de extraccion no valido" }, 400);
  }
  // "E-D 12" busca exactamente el folio 12 entre las DSP; "12" busca por coincidencia en ambas series.
  const folioSearch = parseExtractionFolioSearch(search);
  const exactFolio = folioSearch.tipo && folioSearch.folio ? Number.parseInt(folioSearch.folio, 10) : null;
  const rows = await s.query(
    `
    SELECT e.id, e.folio_num, e.tipo_registro, e.clave_revision, e.fecha_extraccion,
           e.hora_extraccion, e.procesamiento_id, e.folio_procesamiento_num, e.id_interno,
           e.muestra_tipo, e.tipo_molienda, e.estado, e.motivo_anulacion, e.anulado_en, e.creado_en
    FROM ${TABLE} e
    WHERE (:tipo = '' OR e.tipo_registro = :tipo)
      AND (:incluir_anuladas = 1 OR e.estado <> 'anulada')
      AND (
        :search = ''
        OR (:exact_tipo <> '' AND e.tipo_registro = :exact_tipo AND e.folio_num = :exact_folio)
        OR (
          :exact_tipo = ''
          AND (
            e.id_interno LIKE :search_like
            OR CAST(e.folio_num AS CHAR) LIKE :search_like
            OR CAST(COALESCE(e.folio_procesamiento_num, 0) AS CHAR) LIKE :search_like
          )
        )
      )
    ORDER BY COALESCE(e.fecha_extraccion, e.creado_en) DESC, e.id DESC
    LIMIT 400
    `,
    {
      tipo: tipo || "",
      search,
      search_like: `%${search}%`,
      exact_tipo: exactFolio !== null ? folioSearch.tipo : "",
      exact_folio: exactFolio ?? 0,
      incluir_anuladas: searchParam(request, "anuladas") === "1" ? 1 : 0,
    },
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
           tipo_molienda, pasos_json, registro_pesos_json, equipos_json,
           observaciones_generales, nombre_quien_extrajo,
           nombre_quien_limpieza, nombre_quien_superviso,
           firma_quien_extrajo, firma_quien_limpieza,
           firma_quien_superviso, uso_inventario_json,
           estado, creado_en, actualizado_en
    FROM ${TABLE}
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

  const payload = await readJson(request);
  const tipo = await resolveType(s, payload, null);
  if (!tipo) {
    return json({ message: "Tipo de extraccion no valido" }, 400);
  }
  const data = normalizePayload(payload, tipo);
  if (!data.folio_num) {
    data.folio_num = await nextFolioNum(s, TABLE, "tipo_registro = :tipo", { tipo });
  }
  // Solo se extrae a partir de un procesamiento vigente.
  await assertOrigin(s, "muestras_procesamiento", data.procesamiento_id);
  if (data.estado === "anulada") data.estado = "registrada";
  data.equipos_json = jsonText(await snapshotEquipos(s, normalizeEquipos(payload.equipos)));
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      INSERT INTO ${TABLE} (
          folio_num, tipo_registro, clave_revision, fecha_emision,
          fecha_extraccion, hora_extraccion, procesamiento_id,
          folio_procesamiento_num, muestra_tipo, id_interno,
          tipo_molienda, pasos_json, registro_pesos_json, equipos_json,
          observaciones_generales, nombre_quien_extrajo,
          nombre_quien_limpieza, nombre_quien_superviso,
          firma_quien_extrajo, firma_quien_limpieza,
          firma_quien_superviso, uso_inventario_json,
          estado, creado_por, actualizado_por
      ) VALUES (
          :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
          :fecha_extraccion, :hora_extraccion, :procesamiento_id,
          :folio_procesamiento_num, :muestra_tipo, :id_interno,
          :tipo_molienda, :pasos_json, :registro_pesos_json, :equipos_json,
          :observaciones_generales, :nombre_quien_extrajo,
          :nombre_quien_limpieza, :nombre_quien_superviso,
          :firma_quien_extrajo, :firma_quien_limpieza,
          :firma_quien_superviso, :uso_inventario_json,
          :estado, :creado_por, :actualizado_por
      )
      `,
      { ...data, creado_por: userId, actualizado_por: userId },
    );
    const id = result.lastrowid as number;
    await applyStageInventory(s, "EXT", id, data.uso_inventario_json, `Extraccion ${data.tipo_registro} folio ${data.folio_num}`, userId);
    await advanceState(s, "muestras_procesamiento", data.procesamiento_id, "en_proceso");
    const despues = await snapshotRow(s, TABLE, id);
    await registrarAuditoria(s, user, { accion: "crear", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, despues), despues });
    await recordBitacoraFolios(s, (safeJsonLoad(data.equipos_json, []) as Array<{ equipo_id?: unknown; folio_bitacora?: unknown }>).map((e) => ({ equipoId: e.equipo_id, folio: e.folio_bitacora })));
    await s.commit();
    return json({ message: "Extraccion creada", id, tipo_registro: tipo, folio_num: data.folio_num }, 201);
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: `El folio ${tipo} ${String(data.folio_num).padStart(7, "0")} ya existe` }, 409);
    }
    throw error;
  }
}

export async function updateExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "update");
  await ensureSamplesExtraccionSchema(s);

  const antes = await snapshotRow(s, TABLE, extractionId);
  assertEditable(antes, TABLE);
  const payload = await readJson(request);
  const tipo = await resolveType(s, payload, extractionId);
  if (!tipo) {
    return json({ message: "Tipo de extraccion no valido" }, 400);
  }
  const data = normalizePayload(payload, tipo);
  if (!data.folio_num) {
    return json({ message: "El folio de extraccion es obligatorio" }, 400);
  }
  if (data.procesamiento_id !== toIntOrNull(antes?.procesamiento_id)) {
    await assertOrigin(s, "muestras_procesamiento", data.procesamiento_id);
  }
  if (data.estado === "anulada" || ["completada", "analizada"].includes(String(antes?.estado || ""))) data.estado = String(antes?.estado || "registrada");
  data.equipos_json = jsonText(await snapshotEquipos(s, normalizeEquipos(payload.equipos)));
  const userId = userIdFromClaims(user);

  try {
    const result = await s.execute(
      `
      UPDATE ${TABLE}
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
          equipos_json = :equipos_json,
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
    await replaceInventoryUsage(s, extractionId, data, userId, insumosDeclarados(antes?.uso_inventario_json));
    await advanceState(s, "muestras_procesamiento", data.procesamiento_id, "en_proceso");
    const despues = await snapshotRow(s, TABLE, extractionId);
    await registrarAuditoria(s, user, { accion: "editar", entidad: TABLE, entidadId: extractionId, referencia: folioLabel(TABLE, despues), antes, despues });
    await recordBitacoraFolios(s, (safeJsonLoad(data.equipos_json, []) as Array<{ equipo_id?: unknown; folio_bitacora?: unknown }>).map((e) => ({ equipoId: e.equipo_id, folio: e.folio_bitacora })));
    await s.commit();
    return json({ message: "Extraccion actualizada" });
  } catch (error) {
    await s.rollback();
    if (isFolioConflict(error)) {
      return json({ message: `El folio ${tipo} ${String(data.folio_num).padStart(7, "0")} ya existe` }, 409);
    }
    throw error;
  }
}

/* Los registros tecnicos no se eliminan; se anulan con motivo. */
export async function deleteExtractionSample({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  return deletionNotAllowed();
}

export async function anularExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesExtraccionSchema(s);
  const motivo = await readMotivo(request);
  const row = await anularRegistro(s, user, TABLE, extractionId, motivo, {
    movimientosPrefix: `EXT-${extractionId}-INS-`,
    bloqueaSi: async () => {
      const activos = Number((await s.scalar("SELECT COUNT(*) FROM muestras_analisis WHERE extraccion_id = :id AND estado <> 'anulado'", { id: extractionId })) || 0);
      return activos ? `La extraccion tiene ${activos} analisis vigente(s); anulalos primero` : null;
    },
  });
  await s.commit();
  return json({ message: "Extraccion anulada; el inventario descontado fue repuesto", item: serializeRow(row) });
}

export async function restaurarExtractionSample({ request, s, params }: RouteContext): Promise<Response> {
  const extractionId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "delete");
  await ensureSamplesExtraccionSchema(s);
  const row = await restaurarRegistro(s, user, TABLE, extractionId, await readMotivo(request));
  await s.commit();
  return json({ message: "Extraccion restaurada. El inventario no se vuelve a descontar: revisa los insumos y guarda de nuevo si aplica", item: serializeRow(row) });
}
