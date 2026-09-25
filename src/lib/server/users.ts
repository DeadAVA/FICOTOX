import { isSqlite, type Session } from "./db";
import { ensureRbacSchema, toBit } from "./rbac";
import { isAvatarKey } from "../shared/avatars";
import { addColumnIfMissing, dropColumnIfExists, getTableColumns, markSchemaReady, schemaReady } from "./schema";

/* Portado de utils/users.py del backend Flask original. */

export async function ensureUsuariosSchema(s: Session): Promise<void> {
  if (schemaReady("usuarios")) return;
  /*
   * Pseudocodigo:
   * 1. Asegurar primero RBAC porque usuarios depende de roles.
   * 2. Crear tabla si no existe.
   * 3. Agregar columnas nuevas sin borrar datos existentes (incluida la
   *    contrasena local password_hash).
   */
  await ensureRbacSchema(s);
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1,
        id_rol INTEGER NOT NULL,
        departamento VARCHAR(100) DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP DEFAULT NULL
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        activo TINYINT(1) DEFAULT 1,
        id_rol INT NOT NULL,
        departamento VARCHAR(100) DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY email (email),
        KEY id_rol (id_rol),
        CONSTRAINT usuarios_ibfk_1 FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  for (const [columnName, columnDefinition] of [
    ["departamento", "VARCHAR(100) DEFAULT NULL"],
    ["activo", "TINYINT(1) DEFAULT 1"],
    ["creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"],
    ["ultimo_acceso", "TIMESTAMP NULL DEFAULT NULL"],
    ["password_hash", "VARCHAR(255) DEFAULT NULL"],
    /* Avatar elegido por la persona (clave del catalogo compartido); NULL = se deriva del correo. */
    ["avatar", "VARCHAR(40) DEFAULT NULL"],
    /* Fase 2: vigencia de la cuenta, cuentas temporales con supervisor. */
    ["tipo_cuenta", "VARCHAR(20) NOT NULL DEFAULT 'permanente'"],
    ["vigente_desde", "VARCHAR(10) DEFAULT NULL"],
    ["vigente_hasta", "VARCHAR(10) DEFAULT NULL"],
    ["supervisor_id", "INT DEFAULT NULL"],
    ["motivo_ultimo_cambio", "TEXT"],
    /* Fase 2: sesiones y contrasenas. token_version invalida los tokens emitidos antes. */
    ["token_version", "INT NOT NULL DEFAULT 0"],
    ["debe_cambiar_password", "INT NOT NULL DEFAULT 0"],
    ["bloqueado_hasta", "VARCHAR(40) DEFAULT NULL"],
    /* Desde cuando cuentan los intentos fallidos (se mueve al entrar bien o al desbloquear). */
    ["intentos_desde", "VARCHAR(40) DEFAULT NULL"],
    /* Rol con el que actua por omision cuando varios roles vigentes permiten la accion. */
    ["cargo_predeterminado", "INT DEFAULT NULL"],
  ] as Array<[string, string]>) {
    await addColumnIfMissing(s, "usuarios", columnName, columnDefinition);
  }
  await retirarColumnasProveedorExterno(s);
  markSchemaReady("usuarios");
}

/*
 * Fase 3: se retiro el acceso con un proveedor externo de identidad. Sus
 * columnas se eliminan solo si nunca se usaron (todas vacias y auth_provider
 * NULL o 'local'); si tienen datos se conservan sin uso y se avisa en el log.
 */
const COLUMNAS_PROVEEDOR = ["auth_provider", "microsoft_oid", "microsoft_tid", "microsoft_preferred_username"];
export async function retirarColumnasProveedorExterno(s: Session): Promise<{ eliminadas: string[]; conservadas: string[] }> {
  const columnas = await getTableColumns(s, "usuarios");
  const presentes = COLUMNAS_PROVEEDOR.filter((c) => columnas.has(c));
  if (!presentes.length) return { eliminadas: [], conservadas: [] };
  const condiciones = presentes.map((c) => (c === "auth_provider" ? "(auth_provider IS NOT NULL AND auth_provider <> '' AND auth_provider <> 'local')" : `(${c} IS NOT NULL AND ${c} <> '')`));
  const conDatos = Number((await s.scalar(`SELECT COUNT(*) FROM usuarios WHERE ${condiciones.join(" OR ")}`)) || 0);
  if (conDatos > 0) {
    console.warn(`[usuarios] ${conDatos} cuenta(s) tienen datos del proveedor externo retirado; las columnas ${presentes.join(", ")} se conservan sin uso.`);
    return { eliminadas: [], conservadas: presentes };
  }
  for (const columna of presentes) await dropColumnIfExists(s, "usuarios", columna);
  return { eliminadas: presentes, conservadas: [] };
}

export interface UserPayload {
  nombre: string;
  email: string;
  id_rol: number;
  departamento: string | null;
  activo: number;
  /* undefined = no cambiar; null = volver al avatar por omision. */
  avatar?: string | null;
}

export function normalizeUserPayload(payload: Record<string, unknown>): UserPayload {
  const email = String(payload.email || "").trim().toLowerCase().slice(0, 100);
  let name = String(payload.nombre || "").trim().slice(0, 100);
  if (!name && email) {
    name = email.split("@", 1)[0].slice(0, 100);
  }
  return {
    nombre: name,
    email,
    id_rol: Number.parseInt(String(payload.id_rol || 0), 10) || 0,
    departamento: String(payload.departamento || "").trim().slice(0, 100) || null,
    activo: toBit(payload.activo === undefined ? true : payload.activo),
    avatar: payload.avatar === undefined ? undefined : isAvatarKey(payload.avatar) ? payload.avatar : null,
  };
}
