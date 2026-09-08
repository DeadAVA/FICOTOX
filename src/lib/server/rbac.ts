import { isSqlite, type Row, type Session } from "./db";
import { HttpError } from "./http";
import type { CurrentUser } from "./auth";

/* Portado de utils/rbac.py del backend Flask original. */

export const DEFAULT_PERMISSIONS: Array<[string, string, string]> = [
  ["dashboard", "Dashboard", "Acceso al panel principal"],
  ["reactivos", "Reactivos", "Gestion de catalogo de reactivos"],
  ["consumibles", "Consumibles", "Gestion de consumibles"],
  ["equipos", "Equipos", "Gestion de equipos"],
  ["muestras", "Muestras", "Gestion de muestras"],
  ["movimientos", "Movimientos", "Gestion de movimientos de inventario"],
  ["mantenimiento", "Mantenimiento", "Gestion de mantenimientos"],
  ["documentos", "Documentos SGC", "Gestion documental"],
  ["roles", "Roles", "Administracion de roles y permisos"],
  ["usuarios", "Usuarios", "Administracion de usuarios"],
];

export type PermissionFlags = { read: boolean; create: boolean; update: boolean; delete: boolean };
export type PermissionsMap = Record<string, PermissionFlags>;

export function toBit(value: unknown): number {
  return value ? 1 : 0;
}

export async function ensureRbacSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        es_sistemico INTEGER NOT NULL DEFAULT 0,
        activo INTEGER NOT NULL DEFAULT 1
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS roles (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        es_sistemico TINYINT(1) NOT NULL DEFAULT 0,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uk_roles_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS permisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave VARCHAR(80) NOT NULL UNIQUE,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT,
        activo INTEGER NOT NULL DEFAULT 1
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS permisos (
        id INT NOT NULL AUTO_INCREMENT,
        clave VARCHAR(80) NOT NULL,
        nombre VARCHAR(120) NOT NULL,
        descripcion TEXT,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uk_permisos_clave (clave)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS rol_permisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rol INTEGER NOT NULL,
        id_permiso INTEGER NOT NULL,
        can_read INTEGER NOT NULL DEFAULT 0,
        can_create INTEGER NOT NULL DEFAULT 0,
        can_update INTEGER NOT NULL DEFAULT 0,
        can_delete INTEGER NOT NULL DEFAULT 0,
        UNIQUE (id_rol, id_permiso)
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS rol_permisos (
        id INT NOT NULL AUTO_INCREMENT,
        id_rol INT NOT NULL,
        id_permiso INT NOT NULL,
        can_read TINYINT(1) NOT NULL DEFAULT 0,
        can_create TINYINT(1) NOT NULL DEFAULT 0,
        can_update TINYINT(1) NOT NULL DEFAULT 0,
        can_delete TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uk_rol_permiso (id_rol, id_permiso),
        CONSTRAINT fk_rol_permisos_rol
          FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_rol_permisos_permiso
          FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );

  for (const [nombre, descripcion, esSistemico] of [["Super Admin", "Acceso total al sistema", 1]] as Array<[string, string, number]>) {
    const existing = await s.scalar("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(:nombre) LIMIT 1", { nombre });
    if (!existing) {
      await s.execute(
        "INSERT INTO roles (nombre, descripcion, es_sistemico, activo) VALUES (:nombre, :descripcion, :es_sistemico, 1)",
        { nombre, descripcion, es_sistemico: esSistemico },
      );
    }
  }

  for (const [clave, nombre, descripcion] of DEFAULT_PERMISSIONS) {
    if (isSqlite()) {
      await s.execute(
        `
        INSERT INTO permisos (clave, nombre, descripcion, activo)
        VALUES (:clave, :nombre, :descripcion, 1)
        ON CONFLICT(clave) DO UPDATE SET
          nombre = excluded.nombre,
          descripcion = excluded.descripcion
        `,
        { clave, nombre, descripcion },
      );
    } else {
      await s.execute(
        `
        INSERT INTO permisos (clave, nombre, descripcion, activo)
        VALUES (:clave, :nombre, :descripcion, 1)
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          descripcion = VALUES(descripcion)
        `,
        { clave, nombre, descripcion },
      );
    }
  }

  const permissionRows = await s.query<{ id: number; clave: string }>("SELECT id, clave FROM permisos WHERE activo = 1");
  const permissionIds = permissionRows.map((row) => row.id);

  const roles = await s.query<{ id: number; nombre: string; es_sistemico: number }>("SELECT id, nombre, es_sistemico FROM roles");

  for (const role of roles) {
    const hasPermissions = Number((await s.scalar("SELECT COUNT(*) FROM rol_permisos WHERE id_rol = :role_id", { role_id: role.id })) || 0);
    if (hasPermissions > 0) continue;

    const roleName = String(role.nombre || "").trim().toLowerCase();
    const isAdminLike = ["superadmin", "admin", "administrador", "direccion"].includes(roleName) || !!role.es_sistemico;

    for (const permissionId of permissionIds) {
      await s.execute(
        `
        INSERT INTO rol_permisos (
          id_rol, id_permiso, can_read, can_create, can_update, can_delete
        )
        VALUES (
          :id_rol, :id_permiso, :can_read, :can_create, :can_update, :can_delete
        )
        `,
        {
          id_rol: role.id,
          id_permiso: permissionId,
          can_read: 1,
          can_create: toBit(isAdminLike),
          can_update: toBit(isAdminLike),
          can_delete: toBit(isAdminLike),
        },
      );
    }
  }

  await s.commit();
}

export async function resolveRoleId(s: Session, user: CurrentUser): Promise<number | null> {
  const roleId = user.role_id;
  if (roleId !== null && roleId !== undefined) {
    return Number.parseInt(String(roleId), 10);
  }
  const roleName = String(user.rol || "").trim();
  if (!roleName) return null;
  const row = await s.queryOne<{ id: number }>("SELECT id FROM roles WHERE nombre = :nombre LIMIT 1", { nombre: roleName });
  if (!row) return null;
  user.role_id = row.id;
  return Number(row.id);
}

export async function getRolePermissionsMap(s: Session, roleId: number | null): Promise<PermissionsMap> {
  if (roleId === null || roleId === undefined) return {};
  const rows = await s.query<Row>(
    `
    SELECT p.clave,
           rp.can_read,
           rp.can_create,
           rp.can_update,
           rp.can_delete
    FROM rol_permisos rp
    INNER JOIN permisos p ON p.id = rp.id_permiso
    WHERE rp.id_rol = :role_id
      AND p.activo = 1
    `,
    { role_id: roleId },
  );
  const result: PermissionsMap = {};
  for (const row of rows) {
    result[row.clave] = {
      read: !!row.can_read,
      create: !!row.can_create,
      update: !!row.can_update,
      delete: !!row.can_delete,
    };
  }
  return result;
}

export async function getPermissionsForUser(s: Session, user: CurrentUser | null): Promise<PermissionsMap> {
  if (!user) return {};
  const roleId = await resolveRoleId(s, user);
  return getRolePermissionsMap(s, roleId);
}

/* Equivalente del decorador permission_required(module, action). */
export async function requirePermission(s: Session, user: CurrentUser | null, moduleKey: string, action = "read"): Promise<PermissionsMap> {
  if (!user) {
    throw new HttpError(401, { message: "Token requerido" });
  }
  await ensureRbacSchema(s);
  const roleId = await resolveRoleId(s, user);
  const permissionsMap = await getRolePermissionsMap(s, roleId);
  const modulePermissions = permissionsMap[moduleKey] || ({} as Partial<PermissionFlags>);
  const allowed = !!modulePermissions[action as keyof PermissionFlags];
  if (!allowed) {
    throw new HttpError(403, {
      message: `Permiso denegado para ${moduleKey}:${action}`,
      required: { module: moduleKey, action },
    });
  }
  return permissionsMap;
}
