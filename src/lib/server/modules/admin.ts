import { requireUser } from "../auth";
import { getConfig } from "../config";
import { isIntegrityError, isOperationalError, type Session } from "../db";
import { intParam, json, readJson, type RouteContext } from "../http";
import { ensureRbacSchema, requirePermission, toBit } from "../rbac";
import { ensureUsuariosSchema, normalizeUserPayload } from "../users";
import { hashPassword, validatePasswordStrength } from "../password";

/* Portado de modules/admin/endpoints.py del backend Flask original. */

async function saveRolePermissions(s: Session, roleId: number, permissions: unknown[]): Promise<void> {
  await s.execute("DELETE FROM rol_permisos WHERE id_rol = :role_id", { role_id: roleId });

  for (const item of permissions) {
    const permission = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const permissionId = permission.permiso_id;
    if (!permissionId) continue;

    await s.execute(
      `
      INSERT INTO rol_permisos (
        id_rol, id_permiso, can_read, can_create, can_update, can_delete
      )
      VALUES (
        :role_id, :permiso_id, :can_read, :can_create, :can_update, :can_delete
      )
      `,
      {
        role_id: roleId,
        permiso_id: permissionId,
        can_read: toBit(permission.can_read),
        can_create: toBit(permission.can_create),
        can_update: toBit(permission.can_update),
        can_delete: toBit(permission.can_delete),
      },
    );
  }
}

function emailDomainAllowed(email: string): boolean {
  const allowedDomain = getConfig().MICROSOFT_ALLOWED_DOMAIN.toLowerCase();
  return !!email && email.endsWith(`@${allowedDomain}`);
}

function domainErrorMessage(): string {
  return `Solo puedes dar de alta correos @${getConfig().MICROSOFT_ALLOWED_DOMAIN}`;
}

export async function listRoles({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "read");
  await ensureRbacSchema(s);

  const rows = await s.query(
    `
    SELECT r.id, r.nombre, r.descripcion, r.es_sistemico, r.activo,
           COALESCE(u.total_usuarios, 0) AS total_usuarios
    FROM roles r
    LEFT JOIN (
      SELECT id_rol, COUNT(*) AS total_usuarios
      FROM usuarios
      GROUP BY id_rol
    ) u ON u.id_rol = r.id
    ORDER BY id ASC
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function listPermissions({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "read");
  await ensureRbacSchema(s);

  const rows = await s.query(
    `
    SELECT id, clave, nombre, descripcion, activo
    FROM permisos
    WHERE activo = 1
    ORDER BY id ASC
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function getRoleDetail({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "read");
  await ensureRbacSchema(s);

  const role = await s.queryOne(
    `
    SELECT id, nombre, descripcion, es_sistemico, activo
    FROM roles
    WHERE id = :role_id
    LIMIT 1
    `,
    { role_id: roleId },
  );
  if (!role) {
    return json({ message: "Rol no encontrado" }, 404);
  }

  const permissions = await s.query(
    `
    SELECT p.id AS permiso_id, p.clave, p.nombre, p.descripcion,
           COALESCE(rp.can_read, 0) AS can_read,
           COALESCE(rp.can_create, 0) AS can_create,
           COALESCE(rp.can_update, 0) AS can_update,
           COALESCE(rp.can_delete, 0) AS can_delete
    FROM permisos p
    LEFT JOIN rol_permisos rp
      ON rp.id_permiso = p.id AND rp.id_rol = :role_id
    WHERE p.activo = 1
    ORDER BY p.id ASC
    `,
    { role_id: roleId },
  );
  return json({ role, permissions });
}

export async function createRole({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "create");
  await ensureRbacSchema(s);

  const payload = await readJson(request);
  const nombre = String(payload.nombre || "").trim();
  const descripcion = String(payload.descripcion || "").trim();
  const activo = toBit(payload.activo === undefined ? true : payload.activo);
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

  if (!nombre) {
    return json({ message: "El nombre del rol es obligatorio" }, 400);
  }

  const duplicate = await s.scalar("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(:nombre) LIMIT 1", { nombre });
  if (duplicate) {
    return json({ message: "Ya existe un rol con ese nombre" }, 409);
  }

  let roleId: number | null;
  try {
    const result = await s.execute(
      `
      INSERT INTO roles (nombre, descripcion, es_sistemico, activo)
      VALUES (:nombre, :descripcion, 0, :activo)
      `,
      { nombre, descripcion: descripcion || null, activo },
    );
    roleId = result.lastrowid;
    await saveRolePermissions(s, roleId as number, permissions);
    await s.commit();
  } catch (error) {
    if (isOperationalError(error)) {
      await s.rollback();
      return json({ message: "No se pudo crear el rol" }, 500);
    }
    throw error;
  }

  return json({ message: "Rol creado", id: roleId }, 201);
}

export async function updateRole({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "update");
  await ensureRbacSchema(s);

  const role = await s.queryOne("SELECT id, es_sistemico FROM roles WHERE id = :role_id LIMIT 1", { role_id: roleId });
  if (!role) {
    return json({ message: "Rol no encontrado" }, 404);
  }

  const payload = await readJson(request);
  const nombre = String(payload.nombre || "").trim();
  const descripcion = String(payload.descripcion || "").trim();
  const activo = toBit(payload.activo === undefined ? true : payload.activo);
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

  if (!nombre) {
    return json({ message: "El nombre del rol es obligatorio" }, 400);
  }

  const duplicate = await s.scalar(
    `
    SELECT id FROM roles
    WHERE LOWER(nombre) = LOWER(:nombre)
      AND id <> :role_id
    LIMIT 1
    `,
    { nombre, role_id: roleId },
  );
  if (duplicate) {
    return json({ message: "Ya existe un rol con ese nombre" }, 409);
  }

  await s.execute(
    `
    UPDATE roles
    SET nombre = :nombre,
        descripcion = :descripcion,
        activo = :activo
    WHERE id = :role_id
    `,
    { nombre, descripcion: descripcion || null, activo, role_id: roleId },
  );
  await saveRolePermissions(s, roleId, permissions);
  await s.commit();

  return json({ message: "Rol actualizado" });
}

export async function deleteRole({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "roles", "delete");
  await ensureRbacSchema(s);

  const role = await s.queryOne(
    `
    SELECT id, es_sistemico
    FROM roles
    WHERE id = :role_id
    LIMIT 1
    `,
    { role_id: roleId },
  );
  if (!role) {
    return json({ message: "Rol no encontrado" }, 404);
  }
  if (role.es_sistemico) {
    return json({ message: "No se puede eliminar un rol sistemico" }, 403);
  }

  const usedByUsers = Number((await s.scalar("SELECT COUNT(*) FROM usuarios WHERE id_rol = :role_id", { role_id: roleId })) || 0);
  if (usedByUsers > 0) {
    return json({ message: "No se puede eliminar el rol porque tiene usuarios asignados" }, 409);
  }

  await s.execute("DELETE FROM rol_permisos WHERE id_rol = :role_id", { role_id: roleId });
  await s.execute("DELETE FROM roles WHERE id = :role_id", { role_id: roleId });
  await s.commit();

  return json({ message: "Rol eliminado" });
}

const USUARIO_SELECT = `
  SELECT u.id, u.nombre, u.email, u.activo, u.id_rol, r.nombre AS rol,
         u.departamento, u.auth_provider, u.microsoft_oid,
         u.creado_en, u.ultimo_acceso,
         CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END AS tiene_password
  FROM usuarios u
  LEFT JOIN roles r ON r.id = u.id_rol
`;

export async function listUsuarios({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "read");
  await ensureUsuariosSchema(s);

  const rows = await s.query(`${USUARIO_SELECT} ORDER BY u.id DESC LIMIT 200`);
  return json({ items: rows, total: rows.length });
}

export async function getUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "read");
  await ensureUsuariosSchema(s);

  const row = await s.queryOne(`${USUARIO_SELECT} WHERE u.id = :user_id LIMIT 1`, { user_id: userId });
  if (!row) {
    return json({ message: "Usuario no encontrado" }, 404);
  }
  return json({ item: row });
}

async function validateUsuarioPayload(s: Session, request: Request, options: { passwordRequired: boolean }) {
  const payload = await readJson(request);
  const data = normalizeUserPayload(payload);
  const password = String(payload.password || "");
  if (!data.nombre) return { error: json({ message: "El nombre es obligatorio" }, 400) };
  if (!data.email) return { error: json({ message: "El email es obligatorio" }, 400) };
  if (!emailDomainAllowed(data.email)) return { error: json({ message: domainErrorMessage() }, 400) };
  if (!data.id_rol) return { error: json({ message: "Selecciona un rol" }, 400) };

  const roleExists = await s.scalar("SELECT id FROM roles WHERE id = :id_rol LIMIT 1", { id_rol: data.id_rol });
  if (!roleExists) return { error: json({ message: "El rol seleccionado no existe" }, 400) };
  if (options.passwordRequired && !password) return { error: json({ message: "La contraseña es obligatoria" }, 400) };
  if (password) {
    const weak = validatePasswordStrength(password);
    if (weak) return { error: json({ message: weak }, 400) };
  }
  return { data, passwordHash: password ? hashPassword(password) : null };
}

export async function createUsuario({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "create");
  await ensureUsuariosSchema(s);

  const validated = await validateUsuarioPayload(s, request, { passwordRequired: true });
  if (validated.error) return validated.error;
  const data = validated.data;

  let insertedId: number | null;
  try {
    const result = await s.execute(
      `
      INSERT INTO usuarios (nombre, email, activo, id_rol, departamento, auth_provider, password_hash)
      VALUES (:nombre, :email, :activo, :id_rol, :departamento, 'local', :password_hash)
      `,
      { ...data, password_hash: validated.passwordHash },
    );
    insertedId = result.lastrowid;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un usuario con ese email" }, 409);
    }
    throw error;
  }

  return json({ message: "Usuario creado", id: insertedId }, 201);
}

export async function updateUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "update");
  await ensureUsuariosSchema(s);

  const validated = await validateUsuarioPayload(s, request, { passwordRequired: false });
  if (validated.error) return validated.error;
  const data = validated.data;

  let rowcount: number;
  try {
    const result = await s.execute(
      `
      UPDATE usuarios
      SET nombre = :nombre,
          email = :email,
          activo = :activo,
          id_rol = :id_rol,
          departamento = :departamento,
          password_hash = COALESCE(:password_hash, password_hash)
      WHERE id = :user_id
      `,
      { ...data, password_hash: validated.passwordHash, user_id: userId },
    );
    rowcount = result.rowcount;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un usuario con ese email" }, 409);
    }
    throw error;
  }

  if (rowcount === 0) {
    return json({ message: "Usuario no encontrado" }, 404);
  }
  return json({ message: "Usuario actualizado" });
}

export async function deleteUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "delete");
  await ensureUsuariosSchema(s);

  if (String(user.sub) === String(userId)) {
    return json({ message: "No puedes eliminar tu propio usuario activo" }, 403);
  }

  let rowcount: number;
  try {
    const result = await s.execute("DELETE FROM usuarios WHERE id = :user_id", { user_id: userId });
    rowcount = result.rowcount;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "No se puede eliminar porque el usuario tiene registros relacionados" }, 409);
    }
    throw error;
  }

  if (rowcount === 0) {
    return json({ message: "Usuario no encontrado" }, 404);
  }
  return json({ message: "Usuario eliminado" });
}
