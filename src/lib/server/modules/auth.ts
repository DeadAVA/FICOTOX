import { createRemoteJWKSet, jwtVerify, errors as joseErrors, type JWTPayload } from "jose";
import { isAvatarKey } from "../../shared/avatars";
import { createAccessToken, requireUser, type CurrentUser } from "../auth";
import { registrarAuditoria } from "../audit";
import { getConfig } from "../config";
import { isOperationalError, type Row, type Session } from "../db";
import { HttpError, json, readJson, type RouteContext } from "../http";
import { cargarAutorizacion, ensureRbacSchema, filasDeRoles, hoy } from "../rbac";
import { expandirPermisos, mapaPermisos, permite } from "../../shared/permisos";
import { ensureUsuariosSchema } from "../users";
import { verifyPassword } from "../password";

/* Portado de modules/auth/endpoints.py del backend Flask original. */

function domainAllowed(email: string): boolean {
  const allowedDomain = getConfig().MICROSOFT_ALLOWED_DOMAIN.toLowerCase();
  return !!email && email.toLowerCase().endsWith(`@${allowedDomain}`);
}

const USER_QUERY = `
  SELECT u.id, u.nombre, u.email, u.activo, u.password_hash, u.avatar
  FROM usuarios u
  WHERE LOWER(u.email) = LOWER(:email)
  LIMIT 1
`;

async function getUserByEmail(s: Session, email: string): Promise<Row | null> {
  return s.queryOne(USER_QUERY, { email });
}

/*
 * Sesion: el JWT solo identifica a la persona (sub, correo, nombre). Los roles y
 * permisos se calculan en cada peticion desde la base (rbac.ts), asi que un rol
 * revocado o vencido deja de contar sin volver a iniciar sesion.
 */
async function issueSession(s: Session, row: Row): Promise<Response> {
  if (!row.activo) {
    return json({ message: "Usuario inactivo" }, 403);
  }

  await s.execute("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = :user_id", { user_id: row.id });
  await s.commit();

  const token = await createAccessToken({
    sub: String(row.id),
    email: row.email,
    nombre: row.nombre,
  });
  const perfil = await perfilSesion(s, { sub: String(row.id), email: String(row.email || ""), nombre: String(row.nombre || "") });
  return json({ token, ...perfil });
}

/* Usuario, roles vigentes y permisos efectivos { modulo: { accion: alcance } }. */
async function perfilSesion(s: Session, user: CurrentUser) {
  const auth = await cargarAutorizacion(s, user);
  const row = await s.queryOne<{ nombre: string; email: string; avatar: string | null }>("SELECT nombre, email, avatar FROM usuarios WHERE id = :id", { id: auth.userId });
  const roles = auth.roles.map((r) => ({ id: r.id, nombre: r.nombre, clave: r.clave, vigente_desde: r.vigente_desde, vigente_hasta: r.vigente_hasta ?? null, permisos: mapaPermisos(expandirPermisos(r.filas)) }));
  return {
    user: {
      id: auth.userId,
      nombre: row?.nombre ?? user.nombre,
      email: row?.email ?? user.email,
      avatar: row?.avatar ?? null,
      roles: roles.map((r) => r.nombre),
    },
    roles,
    permissions: mapaPermisos(auth.efectivos),
  };
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
  // Nombre, avatar, roles y permisos se leen de la base (no del token) para reflejar cambios sin volver a entrar.
  return json(await perfilSesion(s, user));
}

/*
 * Personal activo con lo que puede hacer, para los selectores de "quién" de los
 * formatos (cualquier usuario autenticado puede verlo; no expone correos ni claves).
 */
export async function personal({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await ensureUsuariosSchema(s);
  await cargarAutorizacion(s, user);
  const usuarios = await s.query<Row>("SELECT id, nombre FROM usuarios WHERE COALESCE(activo, 1) = 1 ORDER BY nombre");
  const asignaciones = await s.query<Row>(
    `
    SELECT ur.usuario_id, r.id AS rol_id, r.nombre
    FROM usuario_roles ur INNER JOIN roles r ON r.id = ur.rol_id
    WHERE ur.revocado_en IS NULL AND ur.vigente_desde <= :hoy AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy) AND r.activo = 1
    `,
    { hoy: hoy() },
  );
  const filasRol = await filasDeRoles(s, asignaciones.map((a) => Number(a.rol_id)));
  const items = usuarios.map((row) => {
    const propias = asignaciones.filter((a) => Number(a.usuario_id) === Number(row.id));
    const efectivos = expandirPermisos(propias.flatMap((a) => filasRol.get(Number(a.rol_id)) || []));
    type Par = [Parameters<typeof permite>[1], Parameters<typeof permite>[2]];
    const CAPACIDADES: Record<string, Par[]> = {
      muestras: [["muestras", "C"], ["muestras", "E"], ["ensayos", "C"], ["ensayos", "E"]],
      revision: [["ensayos", "R"], ["ensayos", "A"], ["informes", "R"], ["informes", "A"]],
      informes: [["informes", "C"], ["informes", "E"]],
      inventario: [["inventario", "C"], ["inventario", "E"], ["equipos", "C"], ["equipos", "E"]],
    };
    const puede: Record<string, boolean> = {};
    // Cargo con el que figura la persona para cada capacidad: el primer rol (por nombre) que la otorga.
    const cargos: Record<string, string | null> = {};
    for (const [capacidad, pares] of Object.entries(CAPACIDADES)) {
      puede[capacidad] = pares.some(([modulo, accion]) => permite(efectivos, modulo, accion));
      const rol = propias
        .map((a) => ({ nombre: String(a.nombre), filas: filasRol.get(Number(a.rol_id)) || [] }))
        .sort((x, y) => x.nombre.localeCompare(y.nombre))
        .find((r) => pares.some(([modulo, accion]) => permite(expandirPermisos(r.filas), modulo, accion)));
      cargos[capacidad] = rol?.nombre ?? null;
    }
    return {
      id: Number(row.id),
      nombre: String(row.nombre || ""),
      rol: propias.map((a) => String(a.nombre)).join(", ") || null,
      roles: propias.map((a) => String(a.nombre)),
      puede,
      cargos,
    };
  });
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
