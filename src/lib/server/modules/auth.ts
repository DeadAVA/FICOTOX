import { createRemoteJWKSet, jwtVerify, errors as joseErrors, type JWTPayload } from "jose";
import { isAvatarKey } from "../../shared/avatars";
import { createAccessToken, requireUser } from "../auth";
import { registrarAuditoria } from "../audit";
import { getConfig } from "../config";
import { isOperationalError, type Row, type Session } from "../db";
import { HttpError, json, readJson, type RouteContext } from "../http";
import { ensureRbacSchema, getPermissionsForUser, getRolePermissionsMap } from "../rbac";
import { ensureUsuariosSchema } from "../users";
import { verifyPassword } from "../password";

/* Portado de modules/auth/endpoints.py del backend Flask original. */

function domainAllowed(email: string): boolean {
  const allowedDomain = getConfig().MICROSOFT_ALLOWED_DOMAIN.toLowerCase();
  return !!email && email.toLowerCase().endsWith(`@${allowedDomain}`);
}

const USER_QUERY = `
  SELECT u.id, u.id_rol AS role_id, u.nombre, u.email, u.activo, u.password_hash, u.avatar, r.nombre AS rol
  FROM usuarios u
  INNER JOIN roles r ON r.id = u.id_rol
  WHERE LOWER(u.email) = LOWER(:email)
  LIMIT 1
`;

async function getUserByEmail(s: Session, email: string): Promise<Row | null> {
  return s.queryOne(USER_QUERY, { email });
}

async function issueSession(s: Session, row: Row): Promise<Response> {
  if (!row.activo) {
    return json({ message: "Usuario inactivo" }, 403);
  }

  await s.execute("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = :user_id", { user_id: row.id });
  await s.commit();

  const token = await createAccessToken({
    sub: String(row.id),
    role_id: row.role_id,
    email: row.email,
    nombre: row.nombre,
    rol: row.rol,
  });

  await ensureRbacSchema(s);
  const permissions = await getRolePermissionsMap(s, row.role_id);

  return json({
    token,
    user: {
      id: row.id,
      role_id: row.role_id,
      nombre: row.nombre,
      email: row.email,
      rol: row.rol,
      avatar: row.avatar || null,
    },
    permissions,
  });
}

function buildMicrosoftAuthority(): string {
  return `https://login.microsoftonline.com/${getConfig().MICROSOFT_TENANT_ID}/v2.0`;
}

async function validateMicrosoftIdToken(idToken: string): Promise<JWTPayload> {
  const authority = buildMicrosoftAuthority();
  const jwks = createRemoteJWKSet(new URL(`${authority}/discovery/v2.0/keys`));
  const { payload } = await jwtVerify(idToken, jwks, {
    algorithms: ["RS256"],
    audience: getConfig().MICROSOFT_CLIENT_ID,
    issuer: authority,
    requiredClaims: ["aud", "exp", "iat", "iss", "sub"],
  });
  return payload;
}

function emailFromClaims(claims: JWTPayload): string {
  for (const key of ["preferred_username", "email", "upn", "unique_name"]) {
    const value = String(claims[key] || "").trim().toLowerCase();
    if (value.includes("@")) return value;
  }
  return "";
}

export async function authConfig(): Promise<Response> {
  const config = getConfig();
  return json({
    microsoft: {
      enabled: config.MICROSOFT_AUTH_ENABLED,
      clientId: config.MICROSOFT_CLIENT_ID,
      tenantId: config.MICROSOFT_TENANT_ID,
      authority: config.MICROSOFT_AUTH_ENABLED ? buildMicrosoftAuthority() : "",
      allowedDomain: config.MICROSOFT_ALLOWED_DOMAIN,
    },
    manualLoginEnabled: config.LOCAL_LOGIN_ENABLED,
  });
}

export async function loginWithMicrosoft({ request, s }: RouteContext): Promise<Response> {
  const config = getConfig();
  if (!config.MICROSOFT_AUTH_ENABLED) {
    return json({ message: "Microsoft Entra ID no esta configurado" }, 503);
  }

  const payload = await readJson(request);
  const idToken = String(payload.id_token || "").trim();
  if (!idToken) {
    return json({ message: "Token de Microsoft requerido" }, 400);
  }

  let claims: JWTPayload;
  try {
    claims = await validateMicrosoftIdToken(idToken);
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      return json({ message: "No se pudo validar la sesion de Microsoft" }, 401);
    }
    return json({ message: "No se pudo validar Microsoft Entra ID" }, 503);
  }

  const email = emailFromClaims(claims);
  if (!domainAllowed(email)) {
    await registrarAuditoria(s, null, { accion: "login_fallido", entidad: "sesion", referencia: email.slice(0, 160), detalle: { proveedor: "microsoft", motivo: "dominio no permitido" } });
    await s.commit();
    return json({ message: `Solo se permiten cuentas @${config.MICROSOFT_ALLOWED_DOMAIN}` }, 403);
  }

  let row: Row | null;
  try {
    await ensureUsuariosSchema(s);
    row = await getUserByEmail(s, email);
  } catch (error) {
    if (isOperationalError(error)) {
      return json({ message: "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite." }, 503);
    }
    throw error;
  }

  if (!row) {
    await registrarAuditoria(s, null, { accion: "login_fallido", entidad: "sesion", referencia: email.slice(0, 160), detalle: { proveedor: "microsoft", existe_usuario: false } });
    await s.commit();
    return json({ message: "Tu cuenta pertenece a CICESE, pero todavia no esta dada de alta en FICOTOX." }, 403);
  }

  const name = String(claims.name || row.nombre || email.split("@", 1)[0]).trim().slice(0, 100);
  await s.execute(
    `
    UPDATE usuarios
    SET nombre = :nombre,
        auth_provider = 'microsoft',
        microsoft_oid = :microsoft_oid,
        microsoft_tid = :microsoft_tid,
        microsoft_preferred_username = :preferred_username
    WHERE id = :user_id
    `,
    {
      nombre: name,
      microsoft_oid: claims.oid ?? null,
      microsoft_tid: claims.tid ?? null,
      preferred_username: claims.preferred_username ?? null,
      user_id: row.id,
    },
  );
  await registrarAuditoria(s, { sub: String(row.id), nombre: name, email }, { accion: "login", entidad: "sesion", entidadId: row.id as number, referencia: email.slice(0, 160), detalle: { proveedor: "microsoft" } });
  await s.commit();
  row = await getUserByEmail(s, email);
  return issueSession(s, row as Row);
}

export async function loginWithEmail({ request, s }: RouteContext): Promise<Response> {
  const payload = await readJson(request);
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!email) {
    return json({ message: "El correo es obligatorio" }, 400);
  }
  if (!password) {
    return json({ message: "La contraseña es obligatoria" }, 400);
  }
  if (!getConfig().LOCAL_LOGIN_ENABLED) {
    return json({ message: "El acceso local esta desactivado" }, 403);
  }

  let row: Row | null;
  try {
    await ensureUsuariosSchema(s);
    row = await getUserByEmail(s, email);
  } catch (error) {
    if (isOperationalError(error)) {
      return json({ message: "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite." }, 503);
    }
    throw error;
  }

  // Mismo mensaje si el correo no existe o la contrasena falla: no revelar cuentas.
  if (!row || !verifyPassword(password, row.password_hash as string | null)) {
    // Los intentos fallidos quedan en la bitacora (ISO/IEC 17025 7.11.1).
    await registrarAuditoria(s, null, { accion: "login_fallido", entidad: "sesion", referencia: email.slice(0, 160), detalle: { existe_usuario: !!row } });
    await s.commit();
    return json({ message: "Correo o contraseña incorrectos" }, 401);
  }
  await registrarAuditoria(s, { sub: String(row.id), nombre: String(row.nombre || ""), email: String(row.email || "") }, { accion: "login", entidad: "sesion", entidadId: row.id as number, referencia: email.slice(0, 160) });
  return issueSession(s, row);
}

export async function me({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await ensureRbacSchema(s);
  await ensureUsuariosSchema(s);
  const permissions = await getPermissionsForUser(s, user);
  // El avatar y el nombre se leen de la base (no del token) para reflejar cambios sin volver a entrar.
  const row = await s.queryOne<{ nombre: string; avatar: string | null }>("SELECT nombre, avatar FROM usuarios WHERE id = :id", { id: Number(user.sub) });
  return json({ user: { ...user, id: Number(user.sub), nombre: row?.nombre ?? user.nombre, avatar: row?.avatar ?? null }, permissions });
}

/*
 * Personal activo con lo que puede hacer, para los selectores de "quién" de los
 * formatos (cualquier usuario autenticado puede verlo; no expone correos ni claves).
 */
export async function personal({ request, s }: RouteContext): Promise<Response> {
  await requireUser(request);
  await ensureRbacSchema(s);
  await ensureUsuariosSchema(s);
  const rows = await s.query<Row>("SELECT u.id, u.nombre, u.id_rol, r.nombre AS rol FROM usuarios u LEFT JOIN roles r ON r.id = u.id_rol WHERE COALESCE(u.activo, 1) = 1 ORDER BY u.nombre");
  const cache = new Map<number, Awaited<ReturnType<typeof getRolePermissionsMap>>>();
  const items = [];
  for (const row of rows) {
    const roleId = row.id_rol === null || row.id_rol === undefined ? null : Number(row.id_rol);
    if (roleId !== null && !cache.has(roleId)) cache.set(roleId, await getRolePermissionsMap(s, roleId));
    const perms = roleId !== null ? cache.get(roleId) || {} : {};
    items.push({
      id: Number(row.id),
      nombre: String(row.nombre || ""),
      rol: row.rol ? String(row.rol) : null,
      puede: {
        muestras: !!(perms.muestras?.create || perms.muestras?.update),
        aprobaciones: !!perms.aprobaciones?.update,
        informes: !!(perms.informes?.create || perms.informes?.update),
        inventario: !!(perms.reactivos?.update || perms.consumibles?.update || perms.equipos?.update),
      },
    });
  }
  return json({ items });
}

/* La persona elige su avatar del catalogo (o vuelve al de omision con null). Queda en la bitacora. */
export async function updateMyAvatar({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await ensureUsuariosSchema(s);
  const payload = await readJson(request);
  const avatar = payload.avatar === null || payload.avatar === "" ? null : payload.avatar;
  if (avatar !== null && !isAvatarKey(avatar)) return json({ message: "Avatar no reconocido" }, 400);
  const id = Number(user.sub);
  const antes = await s.queryOne<{ avatar: string | null }>("SELECT avatar FROM usuarios WHERE id = :id", { id });
  if (!antes) return json({ message: "Usuario no encontrado" }, 404);
  await s.execute("UPDATE usuarios SET avatar = :avatar WHERE id = :id", { avatar, id });
  await registrarAuditoria(s, user, { accion: "editar", entidad: "usuarios", entidadId: id, referencia: String(user.email || ""), detalle: { avatar: { antes: antes.avatar || null, despues: avatar } } });
  await s.commit();
  return json({ message: "Avatar actualizado", avatar });
}

export { HttpError };
