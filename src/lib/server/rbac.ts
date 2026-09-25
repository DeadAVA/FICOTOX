import { isSqlite, type Row, type Session } from "./db";
import { finDiaLocal, hoyLocal, inicioDiaLocal } from "../shared/fechas";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "./schema";
import { HttpError } from "./http";
import type { CurrentUser } from "./auth";
import { registrarAuditoria } from "./audit";
import { evaluarCombinacion, type RolEvaluado, type Violacion } from "../shared/combinaciones-roles";
import {
  MODULOS,
  MODULO_KEYS,
  esTotal,
  expandirPermisos,
  isAccion,
  isAlcance,
  isModulo,
  mapaPermisos,
  alcancePermite,
  permite,
  type Accion,
  type Alcance,
  type ContextoAlcance,
  type Modulo,
  type PermisoFila,
  type PermisosEfectivos,
  type PermisosMapa,
} from "../shared/permisos";

/*
 * Control de acceso por rol (Fase 1; FX-MO-2-1).
 *
 * - Un permiso es (rol, modulo, accion, alcance) en la tabla `rol_acciones`
 *   (modelo en src/lib/shared/permisos.ts).
 * - Una persona puede tener varios roles con vigencia (`usuario_roles`); sus
 *   permisos efectivos son la union de los roles vigentes hoy (no revocados,
 *   dentro de su vigencia, rol activo) y se calculan en cada peticion desde la
 *   base: el JWT solo identifica a la persona, asi que revocar o vencer un rol
 *   tiene efecto inmediato.
 * - El arranque no crea roles ni concede permisos: un permiso ausente es "no
 *   concedido". Los roles del catalogo se dan de alta con
 *   scripts/seed-roles-usuarios.mjs (scripts/roles-catalogo.json).
 * - `usuarios.id_rol` y `rol_permisos` son del modelo anterior: se conservan
 *   (la columna id_rol guarda el rol con el que se dio de alta la cuenta) pero
 *   ya no se leen para decidir permisos.
 */

export function toBit(value: unknown): number {
  return value ? 1 : 0;
}

/* Fecha local YYYY-MM-DD: la vigencia de los roles se mide por dia. */
/*
 * Limites en UTC (como se guarda fecha_hora) de un dia local "AAAA-MM-DD": los
 * filtros por fecha de la bitacora y de la revision de accesos comparan el dia
 * local del laboratorio, no el dia UTC.
 */
export { inicioDiaLocal, finDiaLocal };

/* Hoy en la zona del laboratorio (America/Tijuana), sin importar la zona del servidor (Fase 3). */
export function hoy(): string {
  return hoyLocal();
}

export async function ensureRbacSchema(s: Session): Promise<void> {
  if (schemaReady("rbac")) return;
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
  /* Clave estable del rol del catalogo (las reglas de combinacion la usan en lugar del nombre). */
  await addColumnIfMissing(s, "roles", "clave", "VARCHAR(60) DEFAULT NULL");
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
  /* Modelo anterior (read/create/update/delete por modulo): se conserva sin uso. */
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
        UNIQUE KEY uk_rol_permiso (id_rol, id_permiso)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS rol_acciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rol INTEGER NOT NULL,
        modulo VARCHAR(30) NOT NULL,
        accion VARCHAR(4) NOT NULL,
        alcance VARCHAR(30) NOT NULL DEFAULT 'total',
        UNIQUE (id_rol, modulo, accion, alcance)
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS rol_acciones (
        id INT NOT NULL AUTO_INCREMENT,
        id_rol INT NOT NULL,
        modulo VARCHAR(30) NOT NULL,
        accion VARCHAR(4) NOT NULL,
        alcance VARCHAR(30) NOT NULL DEFAULT 'total',
        PRIMARY KEY (id),
        UNIQUE KEY uk_rol_accion (id_rol, modulo, accion, alcance)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS usuario_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        rol_id INTEGER NOT NULL,
        vigente_desde VARCHAR(10) NOT NULL,
        vigente_hasta VARCHAR(10) DEFAULT NULL,
        motivo TEXT NOT NULL,
        asignado_por INTEGER DEFAULT NULL,
        asignado_en VARCHAR(40) NOT NULL,
        revocado_en VARCHAR(40) DEFAULT NULL,
        revocado_por INTEGER DEFAULT NULL,
        motivo_revocacion TEXT,
        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS usuario_roles (
        id INT NOT NULL AUTO_INCREMENT,
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        vigente_desde VARCHAR(10) NOT NULL,
        vigente_hasta VARCHAR(10) DEFAULT NULL,
        motivo TEXT NOT NULL,
        asignado_por INT DEFAULT NULL,
        asignado_en VARCHAR(40) NOT NULL,
        revocado_en VARCHAR(40) DEFAULT NULL,
        revocado_por INT DEFAULT NULL,
        motivo_revocacion TEXT,
        vencimiento_registrado_en VARCHAR(40) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_usuario_roles_usuario (usuario_id),
        KEY idx_usuario_roles_rol (rol_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `,
  );
  if (isSqlite()) {
    await s.execute("CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario ON usuario_roles (usuario_id)");
    await s.execute("CREATE INDEX IF NOT EXISTS idx_rol_acciones_rol ON rol_acciones (id_rol)");
  }

  /* Catalogo de modulos (Fase 1). Los modulos del modelo anterior quedan inactivos, no se borran. */
  for (const modulo of MODULOS) {
    const params = { clave: modulo.clave, nombre: modulo.nombre, descripcion: modulo.descripcion };
    await s.execute(
      isSqlite()
        ? "INSERT INTO permisos (clave, nombre, descripcion, activo) VALUES (:clave, :nombre, :descripcion, 1) ON CONFLICT(clave) DO UPDATE SET nombre = excluded.nombre, descripcion = excluded.descripcion, activo = 1"
        : "INSERT INTO permisos (clave, nombre, descripcion, activo) VALUES (:clave, :nombre, :descripcion, 1) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), activo = 1",
      params,
    );
  }
  const placeholders = MODULO_KEYS.map((_, i) => `:m${i}`).join(", ");
  await s.execute(`UPDATE permisos SET activo = 0 WHERE clave NOT IN (${placeholders})`, Object.fromEntries(MODULO_KEYS.map((clave, i) => [`m${i}`, clave])));

  markSchemaReady("rbac");
}

/*
 * Migracion de usuarios.id_rol (un rol por persona) a usuario_roles. Idempotente:
 * solo toma a quien todavia no tiene ninguna asignacion. Queda en la bitacora.
 * Fase 3: no toca cuentas cuyos roles ya pasaron por el flujo nuevo (rol inicial
 * pendiente o rechazado, roles asignados o revocados): id_rol es solo historico.
 * Corre en el arranque, despues de asegurar usuarios y auditoria.
 */
export async function migrarRolesUnicos(s: Session): Promise<number> {
  if (schemaReady("usuario_roles_migracion")) return 0;
  const pendientes = await s.query<{ id: number; email: string; id_rol: number; rol: string | null }>(
    `
    SELECT u.id, u.email, u.id_rol, r.nombre AS rol
    FROM usuarios u
    LEFT JOIN roles r ON r.id = u.id_rol
    WHERE u.id_rol IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM usuario_roles ur WHERE ur.usuario_id = u.id)
      AND NOT EXISTS (
        SELECT 1 FROM auditoria a
        WHERE a.entidad = 'usuarios' AND a.entidad_id = CAST(u.id AS CHAR)
          AND a.accion IN ('solicitar', 'asignar_rol', 'revocar_rol', 'acotar_rol')
      )
    `,
  );
  const fecha = new Date().toISOString();
  for (const fila of pendientes) {
    if (!fila.rol) continue;
    const result = await s.execute(
      "INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, vigente_hasta, motivo, asignado_por, asignado_en) VALUES (:usuario_id, :rol_id, :desde, NULL, :motivo, NULL, :fecha)",
      { usuario_id: fila.id, rol_id: fila.id_rol, desde: hoy(), motivo: "Migración Fase 1", fecha },
    );
    await registrarAuditoria(s, null, {
      accion: "asignar_rol",
      entidad: "usuarios",
      entidadId: fila.id,
      referencia: String(fila.email || fila.id),
      motivo: "Migración Fase 1",
      detalle: { rol: fila.rol, rol_id: fila.id_rol, asignacion_id: result.lastrowid, vigente_desde: hoy(), vigente_hasta: null },
    });
  }
  markSchemaReady("usuario_roles_migracion");
  return pendientes.length;
}

/* ---------- Roles y permisos de un rol ---------- */

export interface RolVigente extends RolEvaluado {
  asignacion_id?: number;
  vigente_desde?: string;
  vigente_hasta?: string | null;
}

export async function filasDeRoles(s: Session, roleIds: number[]): Promise<Map<number, PermisoFila[]>> {
  const out = new Map<number, PermisoFila[]>();
  if (!roleIds.length) return out;
  const ids = [...new Set(roleIds)];
  const placeholders = ids.map((_, i) => `:r${i}`).join(", ");
  const rows = await s.query<{ id_rol: number; modulo: string; accion: string; alcance: string }>(
    `SELECT id_rol, modulo, accion, alcance FROM rol_acciones WHERE id_rol IN (${placeholders})`,
    Object.fromEntries(ids.map((id, i) => [`r${i}`, id])),
  );
  for (const id of ids) out.set(id, []);
  for (const row of rows) out.get(Number(row.id_rol))?.push({ modulo: String(row.modulo), accion: String(row.accion), alcance: String(row.alcance) });
  return out;
}

/* Filas validas de una matriz enviada por la pantalla de roles: [{ modulo, accion, alcance }]. */
export function normalizarFilas(value: unknown): PermisoFila[] {
  const out: PermisoFila[] = [];
  const vistas = new Set<string>();
  for (const item of Array.isArray(value) ? value : []) {
    if (!item || typeof item !== "object") continue;
    const { modulo, accion, alcance } = item as Record<string, unknown>;
    if (!isModulo(modulo) || !isAccion(accion)) continue;
    const fila = { modulo, accion, alcance: isAlcance(alcance) ? alcance : "total" };
    const clave = `${fila.modulo}:${fila.accion}:${fila.alcance}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    out.push(fila);
  }
  return out;
}

export async function guardarFilasRol(s: Session, roleId: number, filas: PermisoFila[]): Promise<void> {
  await s.execute("DELETE FROM rol_acciones WHERE id_rol = :id", { id: roleId });
  for (const fila of filas) {
    await s.execute("INSERT INTO rol_acciones (id_rol, modulo, accion, alcance) VALUES (:id, :modulo, :accion, :alcance)", { id: roleId, ...fila });
  }
}

const VIGENTE_SQL = `ur.revocado_en IS NULL AND ur.vigente_desde <= :hoy AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy) AND r.activo = 1`;

/* Roles vigentes hoy de una persona (con sus filas de permiso). */
export async function rolesVigentes(s: Session, userId: number): Promise<RolVigente[]> {
  const rows = await s.query<Row>(
    `
    SELECT ur.id AS asignacion_id, ur.vigente_desde, ur.vigente_hasta, r.id, r.nombre, r.clave
    FROM usuario_roles ur
    INNER JOIN roles r ON r.id = ur.rol_id
    WHERE ur.usuario_id = :usuario_id AND ${VIGENTE_SQL}
    ORDER BY r.nombre
    `,
    { usuario_id: userId, hoy: hoy() },
  );
  const filas = await filasDeRoles(s, rows.map((row) => Number(row.id)));
  const vistos = new Set<number>();
  const out: RolVigente[] = [];
  for (const row of rows) {
    const id = Number(row.id);
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push({ id, nombre: String(row.nombre), clave: (row.clave as string | null) || null, filas: filas.get(id) || [], asignacion_id: Number(row.asignacion_id), vigente_desde: String(row.vigente_desde), vigente_hasta: (row.vigente_hasta as string | null) || null });
  }
  return out;
}

/* ---------- Autorizacion por peticion ---------- */

export interface Autorizacion {
  userId: number;
  roles: RolVigente[];
  efectivos: PermisosEfectivos;
  cuenta: CuentaSesion;
}

/* Datos de la cuenta que importan en cada peticion (Fase 2). */
export interface CuentaSesion {
  email: string;
  nombre: string;
  tipo_cuenta: string;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  supervisor_id: number | null;
  cargo_predeterminado: number | null;
  debe_cambiar_password: boolean;
}

export const MENSAJE_CUENTA_NO_VIGENTE = "Tu acceso no está vigente; contacta al administrador";

/* ¿La cuenta esta dentro de su vigencia hoy? */
export function cuentaVigente(fila: { vigente_desde?: unknown; vigente_hasta?: unknown }, fecha = hoy()): boolean {
  const desde = fila.vigente_desde ? String(fila.vigente_desde) : null;
  const hasta = fila.vigente_hasta ? String(fila.vigente_hasta) : null;
  return (!desde || desde <= fecha) && (!hasta || hasta >= fecha);
}

/* Carga la persona (debe existir y estar activa) y sus permisos efectivos desde la base. */
/*
 * Valida la sesion en cada peticion (Fase 2): la cuenta existe, esta activa y
 * dentro de su vigencia, y el token no fue revocado (token_version). Si la
 * persona debe cambiar su contrasena, solo se permiten las rutas que lo
 * resuelven (opcion permitirCambioPendiente).
 */
export async function cargarAutorizacion(s: Session, user: CurrentUser | null, opciones: { permitirCambioPendiente?: boolean } = {}): Promise<Autorizacion> {
  if (!user) throw new HttpError(401, { message: "Token requerido" });
  await ensureRbacSchema(s);
  const userId = Number.parseInt(String(user.sub || ""), 10);
  if (!Number.isFinite(userId)) throw new HttpError(401, { message: "Token invalido" });
  const fila = await s.queryOne<Row>(
    "SELECT email, nombre, activo, tipo_cuenta, vigente_desde, vigente_hasta, supervisor_id, cargo_predeterminado, debe_cambiar_password, token_version FROM usuarios WHERE id = :id",
    { id: userId },
  );
  if (!fila) throw new HttpError(401, { message: "La cuenta ya no existe", codigo: "sesion_revocada" });
  if (fila.activo !== null && fila.activo !== undefined && !Number(fila.activo)) throw new HttpError(401, { message: "Usuario inactivo", codigo: "sesion_revocada" });
  if (Number(user.tv ?? 0) !== Number(fila.token_version ?? 0)) throw new HttpError(401, { message: "Tu sesión se cerró (cambio de contraseña, bloqueo o cierre en todos los dispositivos); vuelve a iniciar sesión", codigo: "sesion_revocada" });
  if (!cuentaVigente(fila)) throw new HttpError(401, { message: MENSAJE_CUENTA_NO_VIGENTE, codigo: "cuenta_no_vigente" });
  const debeCambiar = !!Number(fila.debe_cambiar_password || 0);
  if (debeCambiar && !opciones.permitirCambioPendiente) throw new HttpError(403, { message: "Debes cambiar tu contraseña antes de continuar", codigo: "cambiar_password" });
  const roles = await rolesVigentes(s, userId);
  return {
    userId,
    roles,
    efectivos: expandirPermisos(roles.flatMap((r) => r.filas)),
    cuenta: {
      email: String(fila.email || ""),
      nombre: String(fila.nombre || ""),
      tipo_cuenta: String(fila.tipo_cuenta || "permanente"),
      vigente_desde: (fila.vigente_desde as string | null) || null,
      vigente_hasta: (fila.vigente_hasta as string | null) || null,
      supervisor_id: fila.supervisor_id === null || fila.supervisor_id === undefined ? null : Number(fila.supervisor_id),
      cargo_predeterminado: fila.cargo_predeterminado === null || fila.cargo_predeterminado === undefined ? null : Number(fila.cargo_predeterminado),
      debe_cambiar_password: debeCambiar,
    },
  };
}

export interface Permiso {
  modulo: Modulo;
  accion: Accion;
  alcances: Alcance[];
  /* Equivale a "total" (total o diferido). */
  total: boolean;
  /* Roles vigentes que otorgan la accion en este contexto (para el cargo con que se actua). */
  candidatos: RolVigente[];
  auth: Autorizacion;
  /* Contexto con que se evaluo (para saber si solo lo cubre el alcance "supervisado"). */
  ctx?: ContextoAlcance;
}

export function permisoDe(auth: Autorizacion, modulo: Modulo, accion: Accion, ctx?: ContextoAlcance): Permiso | null {
  if (!permite(auth.efectivos, modulo, accion, ctx)) return null;
  const alcances = auth.efectivos[modulo]?.[accion] || [];
  const candidatos = auth.roles.filter((rol) => permite(expandirPermisos(rol.filas), modulo, accion, ctx));
  return { modulo, accion, alcances, total: esTotal(alcances), candidatos, auth, ctx };
}

/*
 * Exige (modulo, accion) y, si se da, el contexto del alcance. 403 si ningun
 * rol vigente lo otorga. Devuelve los alcances y los roles que lo otorgan.
 */
export async function requirePermission(s: Session, user: CurrentUser | null, modulo: Modulo, accion: Accion, ctx?: ContextoAlcance, auth?: Autorizacion): Promise<Permiso> {
  const autorizacion = auth || (await cargarAutorizacion(s, user));
  const permiso = permisoDe(autorizacion, modulo, accion, ctx);
  if (!permiso) {
    const conAlcance = ctx && permite(autorizacion.efectivos, modulo, accion);
    throw new HttpError(403, {
      message: conAlcance ? `Tu alcance en ${modulo}:${accion} no cubre esta operación` : `Permiso denegado para ${modulo}:${accion}`,
      required: { module: modulo, action: accion },
    });
  }
  return permiso;
}

/* Como requirePermission pero sin lanzar: para decidir que mostrar. */
export async function tienePermiso(s: Session, user: CurrentUser | null, modulo: Modulo, accion: Accion, ctx?: ContextoAlcance): Promise<boolean> {
  const auth = await cargarAutorizacion(s, user);
  return !!permisoDe(auth, modulo, accion, ctx);
}

/*
 * ¿La operacion solo esta cubierta por el alcance "supervisado"? Entonces lo
 * que se crea o edita queda pendiente del visto bueno del supervisor (Fase 2).
 */
export function soloSupervisado(permiso: Permiso): boolean {
  const cubren = permiso.alcances.filter((a) => alcancePermite(a, permiso.ctx || {}));
  return cubren.length > 0 && cubren.every((a) => a === "supervisado");
}

/* V de muestras solo con alcance "estado": la API omite datos tecnicos, resultados y firmas. */
export function soloEstado(permiso: Permiso): boolean {
  return !permiso.total && permiso.alcances.length > 0 && permiso.alcances.every((a) => a === "estado");
}

/*
 * Cargo con el que actua quien firma, revisa, aprueba, autoriza o anula: si un
 * solo rol vigente otorga el permiso se usa ese; si varios, la interfaz debe
 * mandar el elegido en el encabezado `X-Actuar-Como` (id del rol) y aqui se
 * valida que ese rol realmente lo otorgue. Si falta la eleccion: 409 con las
 * opciones (codigo ELEGIR_CARGO).
 */
export function cargoActuante(request: Request, permiso: Permiso): { rol_id: number; cargo: string } {
  const opciones = permiso.candidatos;
  const elegido = Number.parseInt(request.headers.get("x-actuar-como") || "", 10);
  if (Number.isFinite(elegido)) {
    const rol = opciones.find((r) => r.id === elegido);
    if (!rol) throw new HttpError(403, { message: "El rol elegido para actuar no otorga este permiso", codigo: "CARGO_INVALIDO" });
    return { rol_id: rol.id, cargo: rol.nombre };
  }
  if (opciones.length === 1) return { rol_id: opciones[0].id, cargo: opciones[0].nombre };
  // Fase 2: si su cargo predeterminado otorga el permiso, se usa sin preguntar.
  const predeterminado = opciones.find((r) => r.id === permiso.auth.cuenta.cargo_predeterminado);
  if (predeterminado) return { rol_id: predeterminado.id, cargo: predeterminado.nombre };
  throw new HttpError(409, {
    message: "Tienes varios roles que permiten esta acción: elige con qué cargo actúas",
    codigo: "ELEGIR_CARGO",
    opciones: opciones.map((r) => ({ rol_id: r.id, nombre: r.nombre })),
  });
}

/*
 * Recorta un resumen: los campos de modulos que la persona no puede ver quedan
 * en null (el Inicio lo ve toda persona activa; sus datos, segun permisos).
 */
export function recortarPorModulo<T extends Record<string, unknown>>(auth: Autorizacion, datos: T, campos: Record<string, Modulo>): T {
  const out: Record<string, unknown> = { ...datos };
  for (const [campo, modulo] of Object.entries(campos)) if (!permisoDe(auth, modulo, "V")) out[campo] = null;
  return out as T;
}

export async function getPermissionsForUser(s: Session, user: CurrentUser | null): Promise<PermisosMapa> {
  if (!user) return {};
  const auth = await cargarAutorizacion(s, user);
  return mapaPermisos(auth.efectivos);
}

/* ---------- Guarda: siempre queda un administrador ---------- */

/*
 * Administradores: usuarios activos con usuarios:G (total) otorgado por un rol
 * vigente hoy. `permanentes` son los que lo tienen por una asignacion sin fecha
 * de fin (no se quedaran sin el permiso cuando venza una vigencia).
 */
export interface ConteoAdministradores {
  vigentes: number;
  permanentes: number;
  /* Fase 3: usuarios activos con usuarios:A vigente (aprueban los cambios de acceso). */
  aprobadores: number;
}

export async function countActiveAdministrators(s: Session): Promise<ConteoAdministradores> {
  const rows = await s.query<{ usuario_id: number; rol_id: number; vigente_hasta: string | null; cuenta_hasta: string | null; tipo_cuenta: string | null }>(
    `
    SELECT ur.usuario_id, ur.rol_id, ur.vigente_hasta, u.vigente_hasta AS cuenta_hasta, u.tipo_cuenta
    FROM usuario_roles ur
    INNER JOIN roles r ON r.id = ur.rol_id
    INNER JOIN usuarios u ON u.id = ur.usuario_id
    WHERE COALESCE(u.activo, 1) = 1 AND ${VIGENTE_SQL}
      AND (u.vigente_desde IS NULL OR u.vigente_desde <= :hoy)
      AND (u.vigente_hasta IS NULL OR u.vigente_hasta >= :hoy)
    `,
    { hoy: hoy() },
  );
  const filas = await filasDeRoles(s, rows.map((r) => Number(r.rol_id)));
  const vigentes = new Set<number>();
  const permanentes = new Set<number>();
  const aprobadores = new Set<number>();
  for (const row of rows) {
    const efectivos = expandirPermisos(filas.get(Number(row.rol_id)) || []);
    if (esTotal(efectivos.usuarios?.A)) aprobadores.add(Number(row.usuario_id));
    if (!esTotal(efectivos.usuarios?.G)) continue;
    vigentes.add(Number(row.usuario_id));
    // Permanente: ni el rol ni la cuenta tienen fecha de fin.
    if (!row.vigente_hasta && !row.cuenta_hasta && String(row.tipo_cuenta || "permanente") !== "temporal") permanentes.add(Number(row.usuario_id));
  }
  return { vigentes: vigentes.size, permanentes: permanentes.size, aprobadores: aprobadores.size };
}

/*
 * Se llama antes del commit de un cambio sobre usuarios, roles o asignaciones,
 * con el conteo tomado antes del cambio. Se rechaza (apiRoute hace rollback) si
 * el cambio deja el sistema sin administradores o si solo quedan administradores
 * con fecha de fin (al vencer, nadie podria administrar usuarios y roles).
 */
export async function assertAdministratorRemains(s: Session, before: ConteoAdministradores): Promise<void> {
  const after = await countActiveAdministrators(s);
  if (before.vigentes > 0 && after.vigentes === 0) {
    throw new HttpError(409, {
      message: "El cambio dejaria el sistema sin ningun usuario activo con permiso de administrar usuarios y roles (usuarios:G vigente)",
    });
  }
  if (before.permanentes > 0 && after.permanentes === 0) {
    throw new HttpError(409, {
      message: "El cambio dejaria solo administradores con fecha de fin de vigencia: al vencer, nadie podria administrar usuarios y roles. Debe quedar al menos una persona activa con usuarios:G sin fecha de fin",
    });
  }
  // Fase 3: sin nadie con usuarios:A nadie podria aprobar asignaciones de rol, reactivaciones ni ampliaciones.
  if (before.aprobadores > 0 && after.aprobadores === 0) {
    throw new HttpError(409, {
      message: "El cambio dejaria el sistema sin ningun usuario activo con permiso de aprobar cambios de acceso (usuarios:A vigente)",
    });
  }
}

/*
 * Migracion Fase 3: el Responsable General aprueba los cambios de acceso
 * (usuarios = V A en la matriz). Si el rol existe y no tiene usuarios:A, se le
 * agrega una sola vez, con constancia en la bitacora.
 */
export async function migrarPermisosFase3(s: Session): Promise<boolean> {
  const rol = await s.queryOne<{ id: number; nombre: string }>("SELECT id, nombre FROM roles WHERE clave = 'responsable_general'");
  if (!rol) return false;
  // Se aplica una sola vez: si ya quedo en la bitacora, no se repite (un administrador puede quitarlo despues).
  const aplicada = await s.scalar("SELECT id FROM auditoria WHERE entidad = 'roles' AND accion = 'editar' AND motivo LIKE 'Migración Fase 3:%' LIMIT 1");
  if (aplicada) return false;
  const tiene = await s.scalar("SELECT id FROM rol_acciones WHERE id_rol = :id AND modulo = 'usuarios' AND accion = 'A'", { id: rol.id });
  const antes = (await filasDeRoles(s, [rol.id])).get(rol.id) || [];
  if (!tiene) await s.execute("INSERT INTO rol_acciones (id_rol, modulo, accion, alcance) VALUES (:id, 'usuarios', 'A', 'total')", { id: rol.id });
  const despues = (await filasDeRoles(s, [rol.id])).get(rol.id) || [];
  await registrarAuditoria(s, null, { accion: "editar", entidad: "roles", entidadId: rol.id, referencia: rol.nombre, motivo: "Migración Fase 3: el Responsable General aprueba los cambios de acceso (usuarios: V A)", antes: { permisos: antes }, despues: { permisos: despues } });
  return true;
}

/* ---------- Combinaciones prohibidas ---------- */

/* Roles no revocados ni vencidos (vigentes o por comenzar) de una persona. */
export async function rolesComprometidos(s: Session, userId: number, excluirAsignacion?: number): Promise<RolEvaluado[]> {
  const rows = await s.query<Row>(
    `
    SELECT DISTINCT r.id, r.nombre, r.clave
    FROM usuario_roles ur
    INNER JOIN roles r ON r.id = ur.rol_id
    WHERE ur.usuario_id = :usuario_id
      AND ur.revocado_en IS NULL
      AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy)
      AND r.activo = 1
      AND ur.id <> :excluir
    `,
    { usuario_id: userId, hoy: hoy(), excluir: excluirAsignacion || 0 },
  );
  const filas = await filasDeRoles(s, rows.map((r) => Number(r.id)));
  return rows.map((row) => ({ id: Number(row.id), nombre: String(row.nombre), clave: (row.clave as string | null) || null, filas: filas.get(Number(row.id)) || [] }));
}

export function mensajeViolaciones(violaciones: Violacion[]): string {
  return violaciones.map((v) => `Regla ${v.regla} (${v.titulo}): ${v.mensaje}`).join(" ");
}

/*
 * Personas que quedarian con una combinacion prohibida si el rol `roleId`
 * tuviera `filas` (y estuviera activo o no). Para rechazar la edicion de un rol.
 */
export async function afectadosPorCambioDeRol(s: Session, roleId: number, filas: PermisoFila[], activo: boolean, clave: string | null, nombre: string): Promise<Array<{ usuario_id: number; email: string; violaciones: Violacion[] }>> {
  const usuarios = await s.query<{ usuario_id: number; email: string }>(
    `
    SELECT DISTINCT ur.usuario_id, u.email
    FROM usuario_roles ur
    INNER JOIN usuarios u ON u.id = ur.usuario_id
    WHERE ur.rol_id = :rol_id AND ur.revocado_en IS NULL AND (ur.vigente_hasta IS NULL OR ur.vigente_hasta >= :hoy)
    `,
    { rol_id: roleId, hoy: hoy() },
  );
  const out = [];
  for (const u of usuarios) {
    const otros = (await rolesComprometidos(s, Number(u.usuario_id))).filter((r) => r.id !== roleId);
    const conjunto = activo ? [...otros, { id: roleId, nombre, clave, filas }] : otros;
    const violaciones = evaluarCombinacion(conjunto);
    if (violaciones.length) out.push({ usuario_id: Number(u.usuario_id), email: String(u.email), violaciones });
  }
  return out;
}

/* ---------- Vencimientos ---------- */

/*
 * Registra en la bitacora cada asignacion cuya vigencia ya termino (una sola
 * vez por asignacion). La vigencia se aplica sola al calcular permisos; esto
 * solo deja el rastro.
 */
export async function registrarVencimientos(s: Session): Promise<number> {
  const vencidas = await s.query<Row>(
    `
    SELECT ur.id, ur.usuario_id, ur.rol_id, ur.vigente_desde, ur.vigente_hasta, r.nombre AS rol, u.email
    FROM usuario_roles ur
    LEFT JOIN roles r ON r.id = ur.rol_id
    LEFT JOIN usuarios u ON u.id = ur.usuario_id
    WHERE ur.revocado_en IS NULL AND ur.vencimiento_registrado_en IS NULL
      AND ur.vigente_hasta IS NOT NULL AND ur.vigente_hasta < :hoy
    `,
    { hoy: hoy() },
  );
  for (const fila of vencidas) {
    await s.execute("UPDATE usuario_roles SET vencimiento_registrado_en = :fecha WHERE id = :id", { fecha: new Date().toISOString(), id: fila.id });
    await registrarAuditoria(s, null, {
      accion: "vencer_rol",
      entidad: "usuarios",
      entidadId: Number(fila.usuario_id),
      referencia: String(fila.email || fila.usuario_id),
      motivo: `Terminó la vigencia (${fila.vigente_hasta})`,
      detalle: { rol: fila.rol, rol_id: fila.rol_id, asignacion_id: fila.id, vigente_desde: fila.vigente_desde, vigente_hasta: fila.vigente_hasta },
    });
  }
  return vencidas.length;
}
