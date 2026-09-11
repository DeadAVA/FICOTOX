import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CurrentUser } from "./auth";
import { getConfig } from "./config";
import { isSqlite, type Row, type Session } from "./db";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "./schema";

/*
 * Bitacora de auditoria (ISO/IEC 17025 7.5.2 y 7.11): cada alta, cambio,
 * anulacion, revision o aprobacion queda con usuario, fecha y hora, dato
 * anterior, dato nuevo, motivo y referencia al folio o documento.
 *
 * - Solo se inserta: triggers en la base impiden UPDATE y DELETE.
 * - Cada entrada lleva un sello HMAC-SHA256 de su contenido encadenado al sello
 *   de la entrada anterior. La llave vive fuera de la base (SECRET_KEY o, si no
 *   se configuro una, `<instance>/auditoria.key`, generada al azar la primera
 *   vez), asi que quien solo tenga el archivo de la base no puede recalcular la
 *   cadena tras alterarla. Si la llave cambia o se pierde, la verificacion de lo
 *   ya escrito falla: hay que respaldarla junto con la base.
 * - Las imagenes de firma no se copian al detalle (solo se marca que cambio).
 */

export type AuditAction =
  | "crear"
  | "editar"
  | "anular"
  | "restaurar"
  | "baja"
  | "reactivar"
  | "revisar"
  | "aprobar"
  | "autorizar"
  | "entregar"
  | "rechazar"
  | "aceptar"
  | "cerrar"
  | "importar"
  | "eliminar"
  | "reponer"
  | "login"
  | "login_fallido"
  | "descargar";

export interface AuditEntry {
  accion: AuditAction;
  entidad: string;
  entidadId?: number | string | null;
  referencia?: string | null;
  motivo?: string | null;
  antes?: Row | null;
  despues?: Row | null;
  detalle?: Record<string, unknown> | null;
}

/* Campos que cambian solos en cada guardado y no aportan al historial. */
const VOLATILE = new Set(["actualizado_en", "actualizado_por", "creado_en", "creado_por", "password_hash"]);

export async function ensureAuditSchema(s: Session): Promise<void> {
  if (schemaReady("auditoria")) {
    // La tabla ya existe; los triggers se comprueban en cada llamada (son baratos)
    // para que no puedan quedar retirados sin que el sistema los vuelva a poner.
    await ensureAuditTriggers(s);
    return;
  }
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha_hora TEXT NOT NULL,
        usuario_id INTEGER DEFAULT NULL,
        usuario_nombre VARCHAR(150) DEFAULT NULL,
        usuario_email VARCHAR(150) DEFAULT NULL,
        accion VARCHAR(30) NOT NULL,
        entidad VARCHAR(60) NOT NULL,
        entidad_id VARCHAR(60) DEFAULT NULL,
        referencia VARCHAR(160) DEFAULT NULL,
        motivo TEXT,
        cambios_json TEXT,
        datos_anteriores_json TEXT,
        datos_nuevos_json TEXT,
        hash_anterior VARCHAR(64) DEFAULT NULL,
        hash VARCHAR(64) NOT NULL
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT NOT NULL AUTO_INCREMENT,
        fecha_hora VARCHAR(40) NOT NULL,
        usuario_id INT DEFAULT NULL,
        usuario_nombre VARCHAR(150) DEFAULT NULL,
        usuario_email VARCHAR(150) DEFAULT NULL,
        accion VARCHAR(30) NOT NULL,
        entidad VARCHAR(60) NOT NULL,
        entidad_id VARCHAR(60) DEFAULT NULL,
        referencia VARCHAR(160) DEFAULT NULL,
        motivo TEXT,
        cambios_json LONGTEXT,
        datos_anteriores_json LONGTEXT,
        datos_nuevos_json LONGTEXT,
        hash_anterior VARCHAR(64) DEFAULT NULL,
        hash VARCHAR(64) NOT NULL,
        PRIMARY KEY (id),
        KEY idx_auditoria_entidad (entidad, entidad_id),
        KEY idx_auditoria_fecha (fecha_hora),
        KEY idx_auditoria_usuario (usuario_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  await addColumnIfMissing(s, "auditoria", "hash_anterior", "VARCHAR(64) DEFAULT NULL");
  if (isSqlite()) {
    await s.execute(`CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria (entidad, entidad_id)`);
    await s.execute(`CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria (fecha_hora)`);
  }
  await ensureAuditTriggers(s);
  markSchemaReady("auditoria");
}

/* La bitacora es de solo insercion: triggers que abortan UPDATE y DELETE. */
async function ensureAuditTriggers(s: Session): Promise<void> {
  if (isSqlite()) {
    await s.execute(`CREATE TRIGGER IF NOT EXISTS auditoria_sin_update BEFORE UPDATE ON auditoria BEGIN SELECT RAISE(ABORT, 'La bitacora de auditoria no se modifica'); END`);
    await s.execute(`CREATE TRIGGER IF NOT EXISTS auditoria_sin_delete BEFORE DELETE ON auditoria BEGIN SELECT RAISE(ABORT, 'La bitacora de auditoria no se elimina'); END`);
  } else {
    await ensureMysqlTrigger(s, "auditoria_sin_update", "BEFORE UPDATE");
    await ensureMysqlTrigger(s, "auditoria_sin_delete", "BEFORE DELETE");
  }
}

/* Numero de triggers de proteccion presentes (2 = completo). */
async function countAuditTriggers(s: Session): Promise<number> {
  const count = isSqlite()
    ? await s.scalar("SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'auditoria' AND name IN ('auditoria_sin_update', 'auditoria_sin_delete')")
    : await s.scalar("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'auditoria' AND TRIGGER_NAME IN ('auditoria_sin_update', 'auditoria_sin_delete')");
  return Number(count || 0);
}

/*
 * Ultimo id asignado por el motor. Si es mayor que el MAX(id) presente, se
 * borraron las ultimas filas (la cadena de hashes por si sola no lo notaria).
 */
async function lastAssignedId(s: Session): Promise<number | null> {
  const value = isSqlite()
    ? await s.scalar("SELECT seq FROM sqlite_sequence WHERE name = 'auditoria'")
    : await s.scalar("SELECT AUTO_INCREMENT - 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria'");
  return value === null || value === undefined ? null : Number(value);
}

async function ensureMysqlTrigger(s: Session, name: string, timing: string): Promise<void> {
  const exists = await s.scalar(
    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = :name",
    { name },
  );
  if (Number(exists || 0) > 0) return;
  await s.execute(`CREATE TRIGGER ${name} ${timing} ON auditoria FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bitacora de auditoria es inmutable'`);
}

/* Representacion estable (claves ordenadas) para comparar y para el hash. */
export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

function isSignature(value: unknown): boolean {
  return typeof value === "string" && value.length > 200 && value.startsWith("data:image");
}

/* Normaliza un registro para el historial: JSON de texto -> objeto, firmas -> marcador. */
export function auditSnapshot(row: Row | null | undefined): Row | null {
  if (!row) return null;
  const out: Row = {};
  for (const [key, raw] of Object.entries(row)) {
    if (VOLATILE.has(key)) continue;
    let value: unknown = raw;
    if (typeof raw === "bigint") value = Number(raw);
    if (key.endsWith("_json") && typeof raw === "string") {
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    }
    out[key] = scrubSignatures(value);
  }
  return out;
}

function scrubSignatures(value: unknown): unknown {
  if (isSignature(value)) return "[firma]";
  if (Array.isArray(value)) return value.map(scrubSignatures);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) out[key] = scrubSignatures(entry);
    return out;
  }
  return value;
}

/* Diferencias campo por campo: { campo: { antes, despues } }. */
export function auditDiff(antes: Row | null, despues: Row | null): Record<string, { antes: unknown; despues: unknown }> {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
  const keys = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const key of keys) {
    const a = antes ? antes[key] : undefined;
    const d = despues ? despues[key] : undefined;
    if (stableJson(a ?? null) !== stableJson(d ?? null)) cambios[key] = { antes: a ?? null, despues: d ?? null };
  }
  return cambios;
}

export async function registrarAuditoria(s: Session, user: CurrentUser | null | undefined, entry: AuditEntry): Promise<void> {
  await ensureAuditSchema(s);
  const antes = auditSnapshot(entry.antes);
  const despues = auditSnapshot(entry.despues);
  const cambios = entry.accion === "editar" || (antes && despues) ? auditDiff(antes, despues) : {};
  if (entry.accion === "editar" && antes && despues && !Object.keys(cambios).length && !entry.detalle) {
    // Guardar sin cambios no deja rastro distinto de un guardado igual: no se registra.
    return;
  }
  // En MySQL se bloquea la ultima fila para que dos escrituras concurrentes no
  // encadenen al mismo hash anterior (en SQLite la sesion ya es exclusiva).
  const previous = await s.queryOne<{ hash: string }>(`SELECT hash FROM auditoria ORDER BY id DESC LIMIT 1${isSqlite() ? "" : " FOR UPDATE"}`);
  const fechaHora = new Date().toISOString();
  const record = {
    fecha_hora: fechaHora,
    usuario_id: user?.sub ? Number.parseInt(String(user.sub), 10) || null : null,
    usuario_nombre: user?.nombre ? String(user.nombre).slice(0, 150) : null,
    usuario_email: user?.email ? String(user.email).slice(0, 150) : null,
    accion: entry.accion,
    entidad: entry.entidad,
    entidad_id: entry.entidadId === undefined || entry.entidadId === null ? null : String(entry.entidadId),
    referencia: entry.referencia ? String(entry.referencia).slice(0, 160) : null,
    motivo: entry.motivo ? String(entry.motivo) : null,
    cambios_json: stableJson({ ...cambios, ...(entry.detalle ? { _detalle: entry.detalle } : {}) }),
    datos_anteriores_json: antes ? stableJson(antes) : null,
    datos_nuevos_json: despues ? stableJson(despues) : null,
    hash_anterior: previous?.hash || null,
  };
  const hash = sellar(record);
  await s.execute(
    `
    INSERT INTO auditoria (
      fecha_hora, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id,
      referencia, motivo, cambios_json, datos_anteriores_json, datos_nuevos_json, hash_anterior, hash
    ) VALUES (
      :fecha_hora, :usuario_id, :usuario_nombre, :usuario_email, :accion, :entidad, :entidad_id,
      :referencia, :motivo, :cambios_json, :datos_anteriores_json, :datos_nuevos_json, :hash_anterior, :hash
    )
    `,
    { ...record, hash },
  );
}

let claveCache: string | null = null;

/*
 * Llave del sello. Se prefiere SECRET_KEY cuando esta configurada de verdad; si
 * quedo el valor por omision, se usa (y se crea) una llave aleatoria propia de
 * la bitacora guardada junto a la base, para que la proteccion no dependa de
 * recordar configurar el entorno.
 */
export function claveSello(): string {
  if (claveCache) return claveCache;
  const configurada = (process.env.SECRET_KEY || "").trim();
  if (configurada && configurada !== "ficotox-dev-secret") {
    claveCache = configurada;
    return claveCache;
  }
  const archivo = path.join(getConfig().INSTANCE_DIR, "auditoria.key");
  try {
    claveCache = fs.readFileSync(archivo, "utf8").trim();
  } catch {
    claveCache = "";
  }
  if (!claveCache) {
    claveCache = randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, `${claveCache}\n`, { mode: 0o600 });
  }
  return claveCache;
}

/* Sello encadenado de una entrada (HMAC con la llave del servidor). */
function sellar(record: Record<string, unknown>): string {
  return createHmac("sha256", claveSello()).update(stableJson(record)).digest("hex");
}

/* Lee un registro completo para tomar la foto antes/despues de un cambio. */
export async function snapshotRow(s: Session, table: string, id: number | null | undefined): Promise<Row | null> {
  if (!id || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) return null;
  return s.queryOne(`SELECT * FROM ${table} WHERE id = :id`, { id });
}

export interface AuditVerification {
  ok: boolean;
  total: number;
  primer_error: number | null;
  /* Filas borradas al final de la bitacora (ultimo id asignado vs. presente). */
  filas_faltantes_al_final: number;
  /* Huecos de id: entradas borradas en medio de la bitacora. */
  filas_faltantes_intermedias: number;
  triggers_ok: boolean;
}

/*
 * Recalcula la cadena de sellos (primer id alterado o null) y comprueba que no
 * falten filas (ni al final ni en medio) y que los triggers sigan presentes.
 */
export async function verifyAuditChain(s: Session): Promise<AuditVerification> {
  await ensureAuditSchema(s);
  const rows = await s.query<Row>("SELECT * FROM auditoria ORDER BY id ASC");
  const triggersOk = (await countAuditTriggers(s)) === 2;
  const lastId = await lastAssignedId(s);
  const maxId = rows.length ? Number(rows[rows.length - 1].id) : 0;
  const minId = rows.length ? Number(rows[0].id) : 0;
  const faltantes = lastId !== null && lastId > maxId ? lastId - maxId : 0;
  // Los ids son consecutivos: cualquier hueco significa que se borro una entrada.
  const huecos = rows.length ? maxId - minId + 1 - rows.length : 0;
  const result = (primerError: number | null): AuditVerification => ({
    ok: primerError === null && faltantes === 0 && huecos === 0 && triggersOk,
    total: rows.length,
    primer_error: primerError,
    filas_faltantes_al_final: faltantes,
    filas_faltantes_intermedias: huecos,
    triggers_ok: triggersOk,
  });
  let previous: string | null = null;
  for (const row of rows) {
    const record = {
      fecha_hora: row.fecha_hora,
      usuario_id: row.usuario_id === null || row.usuario_id === undefined ? null : Number(row.usuario_id),
      usuario_nombre: row.usuario_nombre ?? null,
      usuario_email: row.usuario_email ?? null,
      accion: row.accion,
      entidad: row.entidad,
      entidad_id: row.entidad_id ?? null,
      referencia: row.referencia ?? null,
      motivo: row.motivo ?? null,
      cambios_json: row.cambios_json ?? null,
      datos_anteriores_json: row.datos_anteriores_json ?? null,
      datos_nuevos_json: row.datos_nuevos_json ?? null,
      hash_anterior: row.hash_anterior ?? null,
    };
    const expected = sellar(record);
    if (expected !== row.hash || (row.hash_anterior ?? null) !== previous) {
      return result(Number(row.id));
    }
    previous = String(row.hash);
  }
  return result(null);
}
