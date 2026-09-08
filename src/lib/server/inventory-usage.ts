import { isSqlite, type Session } from "./db";
import { ensureConsumiblesSchema } from "./modules/consumables";
import { ensureReactivosSchema } from "./modules/inventory";

/* Portado de utils/inventory_usage.py del backend Flask original. */

const SUPPORTED_INVENTORY_TABLES = new Set(["reactivos", "consumibles"]);

export async function ensureMovimientosSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS movimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo VARCHAR(20) NOT NULL,
          tabla_origen VARCHAR(40) NOT NULL,
          id_item INTEGER NOT NULL,
          cantidad REAL NOT NULL DEFAULT 0,
          motivo TEXT,
          referencia VARCHAR(120) UNIQUE,
          id_usuario INTEGER DEFAULT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS movimientos (
          id INT NOT NULL AUTO_INCREMENT,
          tipo VARCHAR(20) NOT NULL,
          tabla_origen VARCHAR(40) NOT NULL,
          id_item INT NOT NULL,
          cantidad DECIMAL(12,4) NOT NULL DEFAULT 0,
          motivo TEXT,
          referencia VARCHAR(120) UNIQUE,
          id_usuario INT DEFAULT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
}

function toPositiveFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return amount > 0 ? amount : null;
}

async function resolveItemId(s: Session, tableName: string, value: unknown): Promise<number | null> {
  if (!SUPPORTED_INVENTORY_TABLES.has(tableName)) {
    throw new Error(`Tabla de inventario no soportada: ${tableName}`);
  }
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const row = await s.queryOne<{ id: number }>(`SELECT id FROM ${tableName} WHERE id = :id LIMIT 1`, { id: Number.parseInt(text, 10) });
    if (row) return Number(row.id);
  }

  const query =
    tableName === "reactivos"
      ? `
      SELECT id FROM reactivos
      WHERE id_interno = :value
         OR catalogo_parte_cas_lote = :value
         OR catalogo = :value
         OR lot_number = :value
         OR numero_cas = :value
         OR cas_number = :value
         OR producto = :value
         OR nombre = :value
      LIMIT 1
      `
      : `
      SELECT id FROM consumibles
      WHERE catalogo_parte_cas = :value
         OR producto = :value
      LIMIT 1
      `;
  const row = await s.queryOne<{ id: number }>(query, { value: text });
  return row ? Number(row.id) : null;
}

async function movementExists(s: Session, reference: string): Promise<boolean> {
  if (!reference) return false;
  const existing = await s.scalar("SELECT id FROM movimientos WHERE referencia = :referencia LIMIT 1", { referencia: reference });
  return !!existing;
}

/* Revierte salidas de inventario registradas bajo un prefijo de referencia. */
export async function restoreInventoryUsage(s: Session, referencePrefix: string): Promise<number> {
  if (!referencePrefix) return 0;
  await ensureMovimientosSchema(s);
  const rows = await s.query<{ id: number; tabla_origen: string; id_item: number; cantidad: number | string | null }>(
    `
    SELECT id, tabla_origen, id_item, cantidad
    FROM movimientos
    WHERE tipo = 'salida'
      AND referencia LIKE :reference_like
      AND tabla_origen IN ('reactivos', 'consumibles')
    `,
    { reference_like: `${referencePrefix}%` },
  );

  for (const row of rows) {
    const amount = Number(row.cantidad || 0);
    if (row.tabla_origen === "reactivos") {
      await s.execute(
        `
        UPDATE reactivos
        SET cantidad_actual = COALESCE(cantidad_actual, 0) + :cantidad,
            amount_in_stock = CASE
                WHEN amount_in_stock IS NULL THEN amount_in_stock
                ELSE amount_in_stock + :cantidad
            END
        WHERE id = :id
        `,
        { id: row.id_item, cantidad: amount },
      );
    } else if (row.tabla_origen === "consumibles") {
      await s.execute(
        `
        UPDATE consumibles
        SET piezas = COALESCE(piezas, 0) + :cantidad
        WHERE id = :id
        `,
        { id: row.id_item, cantidad: amount },
      );
    }
  }

  await s.execute(
    `
    DELETE FROM movimientos
    WHERE tipo = 'salida'
      AND referencia LIKE :reference_like
      AND tabla_origen IN ('reactivos', 'consumibles')
    `,
    { reference_like: `${referencePrefix}%` },
  );
  return rows.length;
}

interface ConsumeOptions {
  userId: number | null;
  motivo: string;
  referencia: string;
}

/*
 * Descuenta un reactivo y registra el movimiento de salida.
 * 1. Resolver el reactivo por id, codigo, catalogo, lote, CAS o nombre.
 * 2. Validar cantidad positiva y referencia no usada.
 * 3. Restar cantidad del inventario disponible.
 * 4. Insertar movimiento para trazabilidad.
 */
export async function consumeReactivo(s: Session, referenceValue: unknown, cantidad: unknown, options: ConsumeOptions): Promise<boolean> {
  await ensureReactivosSchema(s);
  await ensureMovimientosSchema(s);
  const itemId = await resolveItemId(s, "reactivos", referenceValue);
  const amount = toPositiveFloat(cantidad);
  if (!itemId || !amount || (await movementExists(s, options.referencia))) return false;

  await s.execute(
    `
    UPDATE reactivos
    SET cantidad_actual = COALESCE(cantidad_actual, 0) - :cantidad,
        amount_in_stock = CASE
            WHEN amount_in_stock IS NULL THEN amount_in_stock
            ELSE amount_in_stock - :cantidad
        END
    WHERE id = :id
    `,
    { id: itemId, cantidad: amount },
  );
  await insertMovement(s, "reactivos", itemId, amount, options);
  return true;
}

export async function consumeConsumible(s: Session, referenceValue: unknown, cantidad: unknown, options: ConsumeOptions): Promise<boolean> {
  await ensureConsumiblesSchema(s);
  await ensureMovimientosSchema(s);
  const itemId = await resolveItemId(s, "consumibles", referenceValue);
  const amount = toPositiveFloat(cantidad);
  if (!itemId || !amount || (await movementExists(s, options.referencia))) return false;

  await s.execute(
    `
    UPDATE consumibles
    SET piezas = COALESCE(piezas, 0) - :cantidad
    WHERE id = :id
    `,
    { id: itemId, cantidad: amount },
  );
  await insertMovement(s, "consumibles", itemId, amount, options);
  return true;
}

async function insertMovement(s: Session, tableName: string, itemId: number, cantidad: number, options: ConsumeOptions): Promise<void> {
  await s.execute(
    `
    INSERT INTO movimientos (
        tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario
    )
    VALUES (
        'salida', :tabla_origen, :id_item, :cantidad, :motivo, :referencia, :id_usuario
    )
    `,
    {
      tabla_origen: tableName,
      id_item: itemId,
      cantidad,
      motivo: options.motivo,
      referencia: options.referencia,
      id_usuario: options.userId,
    },
  );
}
