import { isSqlite, type Session } from "./db";
import { ensureRbacSchema, toBit } from "./rbac";
import { isAvatarKey } from "../shared/avatars";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "./schema";

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
        auth_provider VARCHAR(30) DEFAULT NULL,
        microsoft_oid VARCHAR(80) DEFAULT NULL,
        microsoft_tid VARCHAR(80) DEFAULT NULL,
        microsoft_preferred_username VARCHAR(150) DEFAULT NULL,
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
        auth_provider VARCHAR(30) DEFAULT NULL,
        microsoft_oid VARCHAR(80) DEFAULT NULL,
        microsoft_tid VARCHAR(80) DEFAULT NULL,
        microsoft_preferred_username VARCHAR(150) DEFAULT NULL,
        creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY email (email),
        KEY id_rol (id_rol),
        KEY idx_usuarios_microsoft_oid (microsoft_oid),
        CONSTRAINT usuarios_ibfk_1 FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  for (const [columnName, columnDefinition] of [
    ["departamento", "VARCHAR(100) DEFAULT NULL"],
    ["activo", "TINYINT(1) DEFAULT 1"],
    ["auth_provider", "VARCHAR(30) DEFAULT NULL"],
    ["microsoft_oid", "VARCHAR(80) DEFAULT NULL"],
    ["microsoft_tid", "VARCHAR(80) DEFAULT NULL"],
    ["microsoft_preferred_username", "VARCHAR(150) DEFAULT NULL"],
    ["creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"],
    ["ultimo_acceso", "TIMESTAMP NULL DEFAULT NULL"],
    ["password_hash", "VARCHAR(255) DEFAULT NULL"],
    /* Avatar elegido por la persona (clave del catalogo compartido); NULL = se deriva del correo. */
    ["avatar", "VARCHAR(40) DEFAULT NULL"],
  ] as Array<[string, string]>) {
    await addColumnIfMissing(s, "usuarios", columnName, columnDefinition);
  }
  markSchemaReady("usuarios");
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
