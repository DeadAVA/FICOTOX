import { randomAvatar } from "../../shared/avatars";
import { evaluarCombinacion } from "../../shared/combinaciones-roles";
import { ACCIONES, ALCANCES, MODULOS, firmaFilas } from "../../shared/permisos";
import { requireUser, userIdFromClaims, type CurrentUser } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { getConfig } from "../config";
import { isIntegrityError, type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import {
  afectadosPorCambioDeRol,
  assertAdministratorRemains,
  countActiveAdministrators,
  ensureRbacSchema,
  filasDeRoles,
  guardarFilasRol,
  hoy,
  mensajeViolaciones,
  normalizarFilas,
  requirePermission,
  rolesComprometidos,
  toBit,
  type Permiso,
} from "../rbac";
import { ensureUsuariosSchema, normalizeUserPayload } from "../users";
import { hashPassword, validatePasswordStrength } from "../password";

/*
 * Usuarios y roles (modulo "usuarios", Fase 1):
 * - usuarios:V ve cuentas y roles (alcance "propio": solo su cuenta).
 * - usuarios:G da de alta, edita y da de baja cuentas, configura roles y asigna
 *   o revoca roles.
 * Toda asignacion, revocacion y cambio de permisos queda en la bitacora con motivo.
 */

const MOTIVO_MIN = 5;

function emailDomainAllowed(email: string): boolean {
  const allowedDomain = getConfig().MICROSOFT_ALLOWED_DOMAIN.toLowerCase();
  return !!email && email.endsWith(`@${allowedDomain}`);
}

function domainErrorMessage(): string {
  return `Solo puedes dar de alta correos @${getConfig().MICROSOFT_ALLOWED_DOMAIN}`;
}

function motivoDe(payload: Record<string, unknown>, campo = "motivo"): string {
  return String(payload[campo] || "").trim();
}

function exigirMotivo(motivo: string, que: string): void {
  if (motivo.length < MOTIVO_MIN) throw new HttpError(400, { message: `Indica el motivo ${que} (al menos ${MOTIVO_MIN} caracteres)` });
}

/* usuarios:V con alcance "propio" solo ve su propia cuenta (ni otras cuentas ni el catalogo de roles). */
function soloPropio(permiso: Permiso): boolean {
  return !permiso.total && permiso.alcances.every((a) => a === "propio");
}

function fechaValida(value: unknown): string | null {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

/* ---------- Catalogo ---------- */

export async function listPermissions({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "V");
  await ensureRbacSchema(s);
  return json({ modulos: MODULOS, acciones: ACCIONES, alcances: ALCANCES, items: MODULOS.map((m) => ({ clave: m.clave, nombre: m.nombre, descripcion: m.descripcion })) });
}

/* ---------- Roles ---------- */

async function rolesConConteo(s: Session): Promise<Row[]> {
  return s.query(
    `
    SELECT r.id, r.nombre, r.descripcion, r.clave, r.es_sistemico, r.activo,
           (SELECT COUNT(DISTINCT ur.usuario_id) FROM usuario_roles ur
             WHERE ur.rol_id = r.id AND ur.revocado_en IS NULL AND ur.vigente_desde <= :hoy AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy)) AS total_usuarios
    FROM roles r
    ORDER BY r.id ASC
    `,
    { hoy: hoy() },
  );
}

export async function listRoles({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "usuarios", "V");
  if (soloPropio(permiso)) throw new HttpError(403, { message: "Tu alcance en usuarios es solo tu propia cuenta" });
  await ensureRbacSchema(s);
  const rows = await rolesConConteo(s);
  const filas = await filasDeRoles(s, rows.map((r) => Number(r.id)));
  const items = rows.map((row) => ({ ...row, permisos: filas.get(Number(row.id)) || [] }));
  return json({ items, total: items.length });
}

export async function getRoleDetail({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "usuarios", "V");
  if (soloPropio(permiso)) throw new HttpError(403, { message: "Tu alcance en usuarios es solo tu propia cuenta" });
  await ensureRbacSchema(s);
  const role = await s.queryOne("SELECT id, nombre, descripcion, clave, es_sistemico, activo FROM roles WHERE id = :id", { id: roleId });
  if (!role) return json({ message: "Rol no encontrado" }, 404);
  const permisos = (await filasDeRoles(s, [roleId])).get(roleId) || [];
  const usuarios = await s.query(
    `
    SELECT u.id, u.nombre, u.email, ur.vigente_desde, ur.vigente_hasta
    FROM usuario_roles ur INNER JOIN usuarios u ON u.id = ur.usuario_id
    WHERE ur.rol_id = :id AND ur.revocado_en IS NULL AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy)
    ORDER BY u.nombre
    `,
    { id: roleId, hoy: hoy() },
  );
  return json({ role, permisos, usuarios });
}

function datosRol(payload: Record<string, unknown>) {
  return {
    nombre: String(payload.nombre || "").trim().slice(0, 100),
    descripcion: String(payload.descripcion || "").trim() || null,
    activo: toBit(payload.activo === undefined ? true : payload.activo),
    permisos: normalizarFilas(payload.permisos),
  };
}

export async function createRole({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureRbacSchema(s);
  const payload = await readJson(request);
  const data = datosRol(payload);
  if (!data.nombre) return json({ message: "El nombre del rol es obligatorio" }, 400);
  const motivo = motivoDe(payload) || "Alta de rol";
  if (await s.scalar("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(:nombre) LIMIT 1", { nombre: data.nombre })) {
    return json({ message: "Ya existe un rol con ese nombre" }, 409);
  }
  const result = await s.execute("INSERT INTO roles (nombre, descripcion, es_sistemico, activo) VALUES (:nombre, :descripcion, 0, :activo)", {
    nombre: data.nombre,
    descripcion: data.descripcion,
    activo: data.activo,
  });
  const roleId = result.lastrowid as number;
  await guardarFilasRol(s, roleId, data.permisos);
  await registrarAuditoria(s, user, { accion: "crear", entidad: "roles", entidadId: roleId, referencia: data.nombre, motivo, despues: await snapshotRow(s, "roles", roleId), detalle: { permisos: data.permisos } });
  await s.commit();
  return json({ message: "Rol creado", id: roleId }, 201);
}

export async function updateRole({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureRbacSchema(s);
  const antes = await snapshotRow(s, "roles", roleId);
  if (!antes) return json({ message: "Rol no encontrado" }, 404);
  const payload = await readJson(request);
  const data = datosRol(payload);
  if (!data.nombre) return json({ message: "El nombre del rol es obligatorio" }, 400);
  if (await s.scalar("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(:nombre) AND id <> :id LIMIT 1", { nombre: data.nombre, id: roleId })) {
    return json({ message: "Ya existe un rol con ese nombre" }, 409);
  }
  const permisosAntes = (await filasDeRoles(s, [roleId])).get(roleId) || [];
  const cambiaPermisos = firmaFilas(permisosAntes) !== firmaFilas(data.permisos) || Number(antes.activo) !== data.activo;
  const motivo = motivoDe(payload);
  if (cambiaPermisos) exigirMotivo(motivo, "del cambio de permisos");

  // Combinaciones prohibidas: una edicion de permisos que las provoque en alguien se rechaza.
  const afectados = await afectadosPorCambioDeRol(s, roleId, data.permisos, !!data.activo, (antes.clave as string | null) || null, data.nombre);
  if (afectados.length) {
    return json(
      {
        message: `El cambio provocaría combinaciones de roles prohibidas en: ${afectados.map((a) => a.email).join(", ")}. ${mensajeViolaciones(afectados[0].violaciones)}`,
        codigo: "COMBINACION_PROHIBIDA",
        afectados,
      },
      409,
    );
  }

  const adminsAntes = await countActiveAdministrators(s);
  await s.execute("UPDATE roles SET nombre = :nombre, descripcion = :descripcion, activo = :activo WHERE id = :id", { nombre: data.nombre, descripcion: data.descripcion, activo: data.activo, id: roleId });
  await guardarFilasRol(s, roleId, data.permisos);
  await assertAdministratorRemains(s, adminsAntes);
  await registrarAuditoria(s, user, {
    accion: "editar",
    entidad: "roles",
    entidadId: roleId,
    referencia: data.nombre,
    motivo: motivo || null,
    antes: { ...antes, permisos: permisosAntes },
    despues: { ...(await snapshotRow(s, "roles", roleId)), permisos: data.permisos },
  });
  await s.commit();
  return json({ message: "Rol actualizado" });
}

export async function deleteRole({ request, s, params }: RouteContext): Promise<Response> {
  const roleId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureRbacSchema(s);
  const role = await s.queryOne<{ id: number; es_sistemico: number }>("SELECT id, es_sistemico FROM roles WHERE id = :id", { id: roleId });
  if (!role) return json({ message: "Rol no encontrado" }, 404);
  if (role.es_sistemico) return json({ message: "No se puede eliminar un rol sistemico" }, 403);
  // Un rol que alguna vez se asigno queda por su historial; solo se elimina uno que nunca se uso.
  const usos = Number((await s.scalar("SELECT COUNT(*) FROM usuario_roles WHERE rol_id = :id", { id: roleId })) || 0) + Number((await s.scalar("SELECT COUNT(*) FROM usuarios WHERE id_rol = :id", { id: roleId })) || 0);
  if (usos > 0) return json({ message: "No se puede eliminar un rol que se ha asignado a alguien; desactívalo" }, 409);
  const antes = await snapshotRow(s, "roles", roleId);
  const permisos = (await filasDeRoles(s, [roleId])).get(roleId) || [];
  await s.execute("DELETE FROM rol_acciones WHERE id_rol = :id", { id: roleId });
  await s.execute("DELETE FROM rol_permisos WHERE id_rol = :id", { id: roleId });
  await s.execute("DELETE FROM roles WHERE id = :id", { id: roleId });
  await registrarAuditoria(s, user, { accion: "eliminar", entidad: "roles", entidadId: roleId, referencia: String(antes?.nombre || roleId), antes: { ...antes, permisos } });
  await s.commit();
  return json({ message: "Rol eliminado" });
}

/* ---------- Usuarios ---------- */

const USUARIO_SELECT = `
  SELECT u.id, u.nombre, u.email, u.activo, u.departamento, u.auth_provider, u.microsoft_oid, u.avatar,
         u.creado_en, u.ultimo_acceso,
         CASE WHEN u.password_hash IS NULL THEN 0 ELSE 1 END AS tiene_password
  FROM usuarios u
`;

/* Asignaciones de rol de varias personas, con su estado a hoy. */
async function asignacionesDe(s: Session, userIds: number[]): Promise<Map<number, Row[]>> {
  const out = new Map<number, Row[]>();
  if (!userIds.length) return out;
  const placeholders = userIds.map((_, i) => `:u${i}`).join(", ");
  const rows = await s.query<Row>(
    `
    SELECT ur.id, ur.usuario_id, ur.rol_id, r.nombre AS rol, r.activo AS rol_activo, ur.vigente_desde, ur.vigente_hasta, ur.motivo,
           ur.asignado_por, ua.nombre AS asignado_por_nombre, ur.asignado_en, ur.revocado_en, ur.revocado_por, ur2.nombre AS revocado_por_nombre, ur.motivo_revocacion
    FROM usuario_roles ur
    LEFT JOIN roles r ON r.id = ur.rol_id
    LEFT JOIN usuarios ua ON ua.id = ur.asignado_por
    LEFT JOIN usuarios ur2 ON ur2.id = ur.revocado_por
    WHERE ur.usuario_id IN (${placeholders})
    ORDER BY ur.asignado_en DESC, ur.id DESC
    `,
    Object.fromEntries(userIds.map((id, i) => [`u${i}`, id])),
  );
  const fecha = hoy();
  for (const row of rows) {
    const estado = row.revocado_en ? "revocado" : String(row.vigente_desde) > fecha ? "futuro" : row.vigente_hasta && String(row.vigente_hasta) < fecha ? "vencido" : "vigente";
    const lista = out.get(Number(row.usuario_id)) || [];
    lista.push({ ...row, estado });
    out.set(Number(row.usuario_id), lista);
  }
  return out;
}

function conRoles(row: Row, asignaciones: Row[]): Row {
  const vigentes = asignaciones.filter((a) => a.estado === "vigente" && Number(a.rol_activo) === 1);
  return { ...row, roles: vigentes.map((a) => ({ id: Number(a.rol_id), nombre: a.rol, vigente_hasta: a.vigente_hasta ?? null })), rol: vigentes.map((a) => a.rol).join(", ") || null };
}

export async function listUsuarios({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "usuarios", "V");
  await ensureUsuariosSchema(s);
  const rows = soloPropio(permiso)
    ? await s.query(`${USUARIO_SELECT} WHERE u.id = :id`, { id: permiso.auth.userId })
    : await s.query(`${USUARIO_SELECT} ORDER BY u.id DESC LIMIT 200`);
  const asignaciones = await asignacionesDe(s, rows.map((r) => Number(r.id)));
  const items = rows.map((row) => conRoles(row, asignaciones.get(Number(row.id)) || []));
  return json({ items, total: items.length });
}

export async function getUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "usuarios", "V");
  if (soloPropio(permiso) && userId !== permiso.auth.userId) throw new HttpError(403, { message: "Tu alcance en usuarios es solo tu propia cuenta" });
  await ensureUsuariosSchema(s);
  const row = await s.queryOne(`${USUARIO_SELECT} WHERE u.id = :id LIMIT 1`, { id: userId });
  if (!row) return json({ message: "Usuario no encontrado" }, 404);
  const asignaciones = (await asignacionesDe(s, [userId])).get(userId) || [];
  return json({ item: { ...conRoles(row, asignaciones), asignaciones } });
}

function validateUsuarioPayload(payload: Record<string, unknown>, options: { passwordRequired: boolean; currentEmail?: string | null }) {
  const data = normalizeUserPayload(payload);
  const password = String(payload.password || "");
  if (!data.nombre) return { error: json({ message: "El nombre es obligatorio" }, 400) };
  if (!data.email) return { error: json({ message: "El email es obligatorio" }, 400) };
  // El dominio se exige al dar de alta o cambiar el correo; una cuenta existente
  // (p. ej. las locales @ficotox.local creadas por el script de roles) se puede editar.
  const emailSinCambio = !!options.currentEmail && String(options.currentEmail).toLowerCase() === String(data.email).toLowerCase();
  if (!emailSinCambio && !emailDomainAllowed(data.email)) return { error: json({ message: domainErrorMessage() }, 400) };
  if (options.passwordRequired && !password) return { error: json({ message: "La contraseña es obligatoria" }, 400) };
  if (password) {
    const weak = validatePasswordStrength(password);
    if (weak) return { error: json({ message: weak }, 400) };
  }
  return { data, passwordHash: password ? hashPassword(password) : null };
}

/* Alta de una asignacion de rol (con reglas de combinacion y bitacora). */
async function asignarRol(s: Session, actor: CurrentUser, usuario: Row, payload: Record<string, unknown>, motivoPorOmision?: string): Promise<number> {
  const rolId = Number.parseInt(String(payload.rol_id ?? payload.id_rol ?? ""), 10);
  const rol = Number.isFinite(rolId) ? await s.queryOne<{ id: number; nombre: string; clave: string | null; activo: number }>("SELECT id, nombre, clave, activo FROM roles WHERE id = :id", { id: rolId }) : null;
  if (!rol) throw new HttpError(400, { message: "Selecciona un rol que exista" });
  if (!Number(rol.activo)) throw new HttpError(409, { message: `El rol "${rol.nombre}" esta inactivo` });
  const desde = fechaValida(payload.vigente_desde) || hoy();
  const hasta = payload.vigente_hasta ? fechaValida(payload.vigente_hasta) : null;
  if (payload.vigente_hasta && !hasta) throw new HttpError(400, { message: "La fecha de fin de vigencia no es valida" });
  if (hasta && hasta < desde) throw new HttpError(400, { message: "La vigencia termina antes de empezar" });
  if (hasta && hasta < hoy()) throw new HttpError(400, { message: "La vigencia de la asignación ya terminó; indica una fecha de fin de hoy en adelante" });
  const motivo = motivoDe(payload) || motivoPorOmision || "";
  exigirMotivo(motivo, "de la asignación");

  const actuales = await rolesComprometidos(s, Number(usuario.id));
  if (actuales.some((r) => r.id === rol.id)) throw new HttpError(409, { message: `${usuario.email} ya tiene el rol "${rol.nombre}" (vigente o por comenzar); revócalo antes de volver a asignarlo` });
  const filas = (await filasDeRoles(s, [rol.id])).get(rol.id) || [];
  const violaciones = evaluarCombinacion([...actuales, { id: rol.id, nombre: rol.nombre, clave: rol.clave, filas }]);
  if (violaciones.length) throw new HttpError(409, { message: mensajeViolaciones(violaciones), codigo: "COMBINACION_PROHIBIDA", violaciones });

  const result = await s.execute(
    "INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, vigente_hasta, motivo, asignado_por, asignado_en) VALUES (:usuario_id, :rol_id, :desde, :hasta, :motivo, :por, :en)",
    { usuario_id: usuario.id, rol_id: rol.id, desde, hasta, motivo, por: userIdFromClaims(actor), en: new Date().toISOString() },
  );
  await registrarAuditoria(s, actor, {
    accion: "asignar_rol",
    entidad: "usuarios",
    entidadId: Number(usuario.id),
    referencia: String(usuario.email),
    motivo,
    detalle: { rol: rol.nombre, rol_id: rol.id, asignacion_id: result.lastrowid, vigente_desde: desde, vigente_hasta: hasta },
  });
  return result.lastrowid as number;
}

export async function createUsuario({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureUsuariosSchema(s);
  const payload = await readJson(request);
  const validated = validateUsuarioPayload(payload, { passwordRequired: true });
  if (validated.error) return validated.error;
  const data = validated.data;
  // Toda cuenta nace con un rol inicial (usuarios.id_rol lo conserva como dato historico).
  const rolInicial = Number.parseInt(String(payload.rol_id ?? payload.id_rol ?? ""), 10);
  if (!Number.isFinite(rolInicial) || !(await s.scalar("SELECT id FROM roles WHERE id = :id", { id: rolInicial }))) return json({ message: "Selecciona el rol inicial de la cuenta" }, 400);

  let insertedId: number;
  try {
    const result = await s.execute(
      "INSERT INTO usuarios (nombre, email, activo, id_rol, departamento, auth_provider, password_hash, avatar) VALUES (:nombre, :email, :activo, :id_rol, :departamento, 'local', :password_hash, :avatar)",
      // Cada cuenta nace con un avatar al azar del catalogo; la persona puede cambiarlo en "Mi cuenta".
      { ...data, id_rol: rolInicial, password_hash: validated.passwordHash, avatar: data.avatar ?? randomAvatar() },
    );
    insertedId = result.lastrowid as number;
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un usuario con ese email" }, 409);
    }
    throw error;
  }
  const nuevo = (await snapshotRow(s, "usuarios", insertedId))!;
  await registrarAuditoria(s, user, { accion: "crear", entidad: "usuarios", entidadId: insertedId, referencia: String(data.email), despues: nuevo });
  await asignarRol(s, user, nuevo, { ...payload, rol_id: rolInicial }, "Alta de usuario");
  await s.commit();
  return json({ message: "Usuario creado", id: insertedId }, 201);
}

export async function updateUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureUsuariosSchema(s);
  const antesUsuario = await snapshotRow(s, "usuarios", userId);
  if (!antesUsuario) return json({ message: "Usuario no encontrado" }, 404);
  const payload = await readJson(request);
  const validated = validateUsuarioPayload(payload, { passwordRequired: false, currentEmail: String(antesUsuario.email || "") });
  if (validated.error) return validated.error;
  const data = validated.data;
  const adminsAntes = await countActiveAdministrators(s);
  try {
    // Los roles no se cambian aqui: se asignan y revocan con motivo (asignarRolUsuario / revocarRolUsuario).
    await s.execute(
      `
      UPDATE usuarios
      SET nombre = :nombre, email = :email, activo = :activo, departamento = :departamento,
          password_hash = COALESCE(:password_hash, password_hash),
          avatar = CASE WHEN :avatar_set = 1 THEN :avatar ELSE avatar END
      WHERE id = :user_id
      `,
      { ...data, avatar: data.avatar ?? null, avatar_set: data.avatar === undefined ? 0 : 1, password_hash: validated.passwordHash, user_id: userId },
    );
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un usuario con ese email" }, 409);
    }
    throw error;
  }
  await assertAdministratorRemains(s, adminsAntes);
  await registrarAuditoria(s, user, { accion: "editar", entidad: "usuarios", entidadId: userId, referencia: String(data.email), antes: antesUsuario, despues: await snapshotRow(s, "usuarios", userId), detalle: validated.passwordHash ? { contrasena: "cambiada" } : null });
  await s.commit();
  return json({ message: "Usuario actualizado" });
}

export async function deleteUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureUsuariosSchema(s);
  if (String(user.sub) === String(userId)) return json({ message: "No puedes dar de baja tu propio usuario activo" }, 403);
  // Las cuentas no se eliminan: la bitacora y los registros firmados siguen apuntando a ellas.
  const payload = await readJson(request);
  const motivo = motivoDe(payload);
  if (motivo.length < MOTIVO_MIN) return json({ message: "Indica el motivo de la baja del usuario (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, "usuarios", userId);
  if (!antes) return json({ message: "Usuario no encontrado" }, 404);
  const adminsAntes = await countActiveAdministrators(s);
  await s.execute("UPDATE usuarios SET activo = 0 WHERE id = :user_id", { user_id: userId });
  await assertAdministratorRemains(s, adminsAntes);
  await registrarAuditoria(s, user, { accion: "baja", entidad: "usuarios", entidadId: userId, referencia: String(antes.email || userId), motivo, antes, despues: await snapshotRow(s, "usuarios", userId) });
  await s.commit();
  return json({ message: "Usuario dado de baja (inactivo); su historial se conserva" });
}

/* ---------- Asignacion y revocacion de roles ---------- */

function noASiMismo(actor: CurrentUser, userId: number): void {
  if (String(actor.sub) === String(userId)) throw new HttpError(403, { message: "Nadie puede asignarse ni revocarse roles a sí mismo" });
}

export async function asignarRolUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureUsuariosSchema(s);
  noASiMismo(user, userId);
  const usuario = await snapshotRow(s, "usuarios", userId);
  if (!usuario) return json({ message: "Usuario no encontrado" }, 404);
  const id = await asignarRol(s, user, usuario, await readJson(request));
  await s.commit();
  return json({ message: "Rol asignado", id }, 201);
}

export async function revocarRolUsuario({ request, s, params }: RouteContext): Promise<Response> {
  const userId = intParam(params.id);
  const asignacionId = intParam(params.asignacion);
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await ensureUsuariosSchema(s);
  noASiMismo(user, userId);
  const asignacion = await s.queryOne<Row>(
    "SELECT ur.*, r.nombre AS rol, u.email FROM usuario_roles ur LEFT JOIN roles r ON r.id = ur.rol_id LEFT JOIN usuarios u ON u.id = ur.usuario_id WHERE ur.id = :id AND ur.usuario_id = :usuario_id",
    { id: asignacionId, usuario_id: userId },
  );
  if (!asignacion) return json({ message: "Asignación no encontrada" }, 404);
  if (asignacion.revocado_en) return json({ message: "La asignación ya estaba revocada" }, 409);
  const payload = await readJson(request);
  const motivo = motivoDe(payload);
  exigirMotivo(motivo, "de la revocación");
  const adminsAntes = await countActiveAdministrators(s);
  await s.execute("UPDATE usuario_roles SET revocado_en = :en, revocado_por = :por, motivo_revocacion = :motivo WHERE id = :id", { en: new Date().toISOString(), por: userIdFromClaims(user), motivo, id: asignacionId });
  await assertAdministratorRemains(s, adminsAntes);
  await registrarAuditoria(s, user, {
    accion: "revocar_rol",
    entidad: "usuarios",
    entidadId: userId,
    referencia: String(asignacion.email || userId),
    motivo,
    detalle: { rol: asignacion.rol, rol_id: asignacion.rol_id, asignacion_id: asignacionId, vigente_desde: asignacion.vigente_desde, vigente_hasta: asignacion.vigente_hasta ?? null },
  });
  await s.commit();
  return json({ message: "Rol revocado" });
}
