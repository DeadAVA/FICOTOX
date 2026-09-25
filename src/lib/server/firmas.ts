/*
 * Firmas ligadas a cuentas (Fase 5).
 *
 * - En recepcion, procesamiento, extraccion y analisis, quien firma (recibio,
 *   proceso, superviso, extrajo, limpio, analista) se elige de las cuentas
 *   activas: se guarda su usuario_id, su nombre y su cargo.
 * - Si quien firma no es la persona de la sesion, confirma con su propia
 *   contrasena en ese momento: POST /api/firmas/confirmar devuelve un token de
 *   firma de un solo uso ligado a esa cuenta (10 minutos), que el formato envia
 *   junto con el usuario_id del firmante.
 * - Quien firma un trabajo tecnico (proceso, extrajo, limpio, analista) debe
 *   tener la autorizacion FX-THF-AP de esa actividad y metodo.
 * - Un nombre escrito sin cuenta (clientes anteriores de la API) se conserva
 *   como texto, sin usuario_id; la interfaz siempre elige cuentas.
 */
import { createHash, randomBytes } from "node:crypto";
import { requireUser, userIdFromClaims, type CurrentUser } from "./auth";
import { registrarAuditoria } from "./audit";
import { vigentesDe } from "./autorizaciones";
import { getConfig } from "./config";
import { isSqlite, type Row, type Session } from "./db";
import { HttpError, json, readJson, type RouteContext } from "./http";
import { verifyPassword } from "./password";
import { rolesVigentes } from "./rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "./schema";
import { faltantes, type Requisito } from "../shared/autorizaciones";

const TOKENS = "firmas_tokens";
const VIGENCIA_MIN = 10;

export async function ensureFirmasSchema(s: Session): Promise<void> {
  if (schemaReady(TOKENS)) return;
  await s.execute(
    isSqlite()
      ? `CREATE TABLE IF NOT EXISTS ${TOKENS} (
          id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash VARCHAR(64) NOT NULL UNIQUE, usuario_id INTEGER NOT NULL,
          solicitado_por INTEGER NOT NULL, creado_en VARCHAR(40) NOT NULL, expira_en VARCHAR(40) NOT NULL, usado_en VARCHAR(40) DEFAULT NULL)`
      : `CREATE TABLE IF NOT EXISTS ${TOKENS} (
          id INT AUTO_INCREMENT PRIMARY KEY, token_hash VARCHAR(64) NOT NULL, usuario_id INT NOT NULL,
          solicitado_por INT NOT NULL, creado_en VARCHAR(40) NOT NULL, expira_en VARCHAR(40) NOT NULL, usado_en VARCHAR(40) DEFAULT NULL,
          UNIQUE KEY uq_firmas_tokens_hash (token_hash)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  markSchemaReady(TOKENS);
}

const hashToken = (token: string) => createHash("sha256").update(`${token}:${getConfig().SECRET_KEY}`).digest("hex");

/* POST /api/firmas/confirmar { usuario_id, password }: el firmante confirma con su contrasena. */
export async function confirmarFirmante({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await ensureFirmasSchema(s);
  const payload = await readJson(request);
  const usuarioId = Number(payload.usuario_id) || 0;
  const fila = await s.queryOne<Row>("SELECT id, nombre, email, activo, password_hash, bloqueado_hasta FROM usuarios WHERE id = :id", { id: usuarioId });
  if (!fila || !Number(fila.activo ?? 1)) throw new HttpError(400, { message: "Elige una cuenta activa" });
  if (fila.bloqueado_hasta && String(fila.bloqueado_hasta) > new Date().toISOString()) throw new HttpError(423, { message: "La cuenta del firmante está bloqueada temporalmente" });
  if (!verifyPassword(String(payload.password || ""), (fila.password_hash as string | null) || null)) {
    await registrarAuditoria(s, user, { accion: "reauth_fallida", entidad: "usuarios", entidadId: usuarioId, referencia: String(fila.email), detalle: { motivo: "confirmar firma" } });
    await s.commit();
    throw new HttpError(401, { message: `La contraseña de ${fila.nombre || fila.email} no es correcta`, codigo: "firma_invalida" });
  }
  const token = randomBytes(24).toString("base64url");
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + VIGENCIA_MIN * 60_000).toISOString();
  await s.execute(`INSERT INTO ${TOKENS} (token_hash, usuario_id, solicitado_por, creado_en, expira_en) VALUES (:h, :u, :por, :en, :exp)`, { h: hashToken(token), u: usuarioId, por: userIdFromClaims(user), en: ahora.toISOString(), exp: expira });
  await registrarAuditoria(s, user, { accion: "confirmar_firma", entidad: "usuarios", entidadId: usuarioId, referencia: String(fila.email), detalle: { firmante: fila.nombre || fila.email } });
  await s.commit();
  return json({ token_firma: token, usuario: { id: usuarioId, nombre: fila.nombre, email: fila.email }, expira_en: expira });
}

/* Consume un token de firma: debe ser de ese firmante, emitido para esta sesion, vigente y sin usar. */
async function consumirToken(s: Session, token: string, firmanteId: number, sesionId: number): Promise<boolean> {
  if (!token) return false;
  await ensureFirmasSchema(s);
  const fila = await s.queryOne<Row>(`SELECT * FROM ${TOKENS} WHERE token_hash = :h`, { h: hashToken(token) });
  if (!fila || fila.usado_en || Number(fila.usuario_id) !== firmanteId || Number(fila.solicitado_por) !== sesionId || String(fila.expira_en) < new Date().toISOString()) return false;
  const r = await s.execute(`UPDATE ${TOKENS} SET usado_en = :en WHERE id = :id AND usado_en IS NULL`, { en: new Date().toISOString(), id: fila.id });
  return r.rowcount > 0;
}

/* ---------- Firmantes de cada formato ---------- */

export interface RolFirma {
  /* Clave en payload.firmantes y prefijo de columnas (<rol>_usuario_id, <rol>_cargo). */
  rol: string;
  /* Columna con el nombre visible del firmante. */
  columnaNombre: string;
  etiqueta: string;
  /* Autorizaciones FX-THF-AP que necesita el firmante (trabajo tecnico). */
  requisitos?: Requisito[];
}

export async function ensureColumnasFirma(s: Session, tabla: string, roles: RolFirma[]): Promise<void> {
  for (const r of roles) {
    await addColumnIfMissing(s, tabla, `${r.rol}_usuario_id`, "INT DEFAULT NULL");
    await addColumnIfMissing(s, tabla, `${r.rol}_cargo`, "VARCHAR(120) DEFAULT NULL");
  }
}

async function cargoDe(s: Session, usuarioId: number): Promise<string | null> {
  const roles = await rolesVigentes(s, usuarioId);
  return roles[0]?.nombre ? String(roles[0].nombre) : null;
}

/*
 * Resuelve los firmantes elegidos en el formato y los escribe en `data`
 * (nombre, <rol>_usuario_id, <rol>_cargo). Si el firmante no es la persona de
 * la sesion exige su token de firma; si hace trabajo tecnico, su autorizacion.
 * Sin firmante elegido en un rol, se conserva lo anterior (edicion) o el nombre escrito.
 */
export async function resolverFirmantes(s: Session, user: CurrentUser, payload: Record<string, unknown>, data: Record<string, unknown>, roles: RolFirma[], antes?: Row | null): Promise<void> {
  const sesionId = userIdFromClaims(user) as number;
  const elegidos = (payload.firmantes && typeof payload.firmantes === "object" ? payload.firmantes : {}) as Record<string, { usuario_id?: unknown; token_firma?: unknown } | null>;
  for (const r of roles) {
    const elegido = elegidos[r.rol];
    const usuarioId = Number(elegido?.usuario_id) || 0;
    if (!usuarioId) {
      // Sin cuenta elegida: se conserva la firma ligada anterior si el nombre no cambio.
      const previo = antes?.[`${r.rol}_usuario_id`];
      const mismoNombre = antes && String(antes[r.columnaNombre] || "") === String(data[r.columnaNombre] || "");
      data[`${r.rol}_usuario_id`] = previo && mismoNombre ? Number(previo) : null;
      data[`${r.rol}_cargo`] = previo && mismoNombre ? (antes?.[`${r.rol}_cargo`] as string | null) || null : null;
      continue;
    }
    const persona = await s.queryOne<Row>("SELECT id, nombre, email, activo FROM usuarios WHERE id = :id", { id: usuarioId });
    if (!persona || !Number(persona.activo ?? 1)) throw new HttpError(400, { message: `${r.etiqueta}: elige una cuenta activa` });
    const yaLigado = antes && Number(antes[`${r.rol}_usuario_id`]) === usuarioId;
    if (usuarioId !== sesionId && !yaLigado && !(await consumirToken(s, String(elegido?.token_firma || ""), usuarioId, sesionId))) {
      throw new HttpError(403, { message: `${r.etiqueta}: ${persona.nombre || persona.email} debe confirmar su firma con su contraseña`, codigo: "firma_sin_confirmar", rol: r.rol });
    }
    if (r.requisitos?.length && getConfig().AUTORIZACIONES_OBLIGATORIAS) {
      const faltan = faltantes(r.requisitos, await vigentesDe(s, usuarioId));
      if (faltan.length) throw new HttpError(403, { message: `${r.etiqueta}: ${persona.nombre || persona.email} no tiene autorización vigente para ${faltan.map((f) => f.texto).join(", ")} (FX-THF-AP)`, codigo: "no_autorizado", faltan, rol: r.rol });
    }
    data[r.columnaNombre] = String(persona.nombre || persona.email).slice(0, 180);
    data[`${r.rol}_usuario_id`] = usuarioId;
    data[`${r.rol}_cargo`] = await cargoDe(s, usuarioId);
  }
}

/* Guarda en el registro las cuentas y cargos de los firmantes resueltos. */
export async function guardarFirmantes(s: Session, tabla: string, id: number, data: Record<string, unknown>, roles: RolFirma[]): Promise<void> {
  const sets = roles.flatMap((r) => [`${r.rol}_usuario_id = :${r.rol}_usuario_id`, `${r.rol}_cargo = :${r.rol}_cargo`]);
  const params: Record<string, unknown> = { id };
  for (const r of roles) {
    params[`${r.rol}_usuario_id`] = data[`${r.rol}_usuario_id`] ?? null;
    params[`${r.rol}_cargo`] = data[`${r.rol}_cargo`] ?? null;
  }
  await s.execute(`UPDATE ${tabla} SET ${sets.join(", ")} WHERE id = :id`, params);
}

/* GET /api/cuentas/activas: cuentas activas para elegir firmantes o asignar muestras (nombre, correo y cargo). */
export async function listarCuentasActivas({ request, s }: RouteContext): Promise<Response> {
  await requireUser(request);
  const filas = await s.query<Row>("SELECT id, nombre, email FROM usuarios WHERE COALESCE(activo, 1) = 1 ORDER BY nombre, email");
  const items = [];
  for (const f of filas) items.push({ id: Number(f.id), nombre: f.nombre || f.email, email: f.email, cargo: await cargoDe(s, Number(f.id)) });
  return json({ items });
}
