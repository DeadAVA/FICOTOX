import { isSqlite, type Session } from "./db";

/* Portado de utils/schema.py del backend Flask original (migraciones ligeras). */

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export { isSqlite };

function quote(identifier: string): string {
  if (!IDENTIFIER_RE.test(identifier || "")) {
    throw new Error(`Identificador SQL invalido: ${JSON.stringify(identifier)}`);
  }
  return isSqlite() ? `"${identifier}"` : `\`${identifier}\``;
}

function sqliteColumnDefinition(columnDefinition: string): string {
  let definition = columnDefinition || "TEXT";
  definition = definition.replace(/\s+AFTER\s+`?[\w_]+`?/gi, "");
  definition = definition.replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, "");
  definition = definition.replace(/\bLONGTEXT\b/gi, "TEXT");
  definition = definition.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, "INTEGER");
  definition = definition.replace(/\bDECIMAL\s*\([^)]+\)/gi, "REAL");
  definition = definition.replace(/\bENUM\s*\([^)]+\)/gi, "TEXT");
  definition = definition.replace(/`/g, "");
  return definition.trim();
}

export async function getTableColumns(s: Session, tableName: string): Promise<Set<string>> {
  const name = quote(tableName).replace(/^["`]|["`]$/g, "");
  if (isSqlite()) {
    const rows = await s.query<{ name: string }>(`PRAGMA table_info("${name}")`);
    return new Set(rows.map((row) => row.name));
  }
  const rows = await s.query<{ COLUMN_NAME: string }>(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table_name
    `,
    { table_name: name },
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

export async function addColumnIfMissing(s: Session, tableName: string, columnName: string, columnDefinition: string): Promise<void> {
  /*
   * Pseudocodigo:
   * 1. Validar nombre de tabla/columna contra patron seguro.
   * 2. Revisar columnas actuales.
   * 3. Adaptar definicion si el motor es SQLite.
   * 4. Ejecutar ALTER TABLE con identificadores escapados.
   */
  const columns = await getTableColumns(s, tableName);
  if (columns.has(columnName)) return;

  const definition = isSqlite() ? sqliteColumnDefinition(columnDefinition) : columnDefinition;
  await s.execute(`ALTER TABLE ${quote(tableName)} ADD COLUMN ${quote(columnName)} ${definition}`);
}

export async function dropColumnIfExists(s: Session, tableName: string, columnName: string): Promise<void> {
  const columns = await getTableColumns(s, tableName);
  if (!columns.has(columnName)) return;
  await s.execute(`ALTER TABLE ${quote(tableName)} DROP COLUMN ${quote(columnName)}`);
}
