/*
 * Evidencia instrumental de los analisis (Fase 10; FX-MO-2-1 seccion 7,
 * "Capturar resultados y adjuntar evidencia instrumental o calculos").
 *
 * Reglas (las mismas funciones que protegen la edicion del analisis):
 * - Adjuntar y anular: quien puede editar el analisis (ensayos:E con su
 *   alcance, solo en "registrado", sin anulacion ni solicitud pendiente),
 *   asignado a la muestra (o coordinacion) y con la autorizacion FX-THF-AP de
 *   "analisis" para el metodo. Anular exige motivo y reautenticacion.
 * - Supervision: lo que adjunta o anula una cuenta supervisada deja el analisis
 *   pendiente del visto bueno (no se elude el visto bueno por esta via).
 * - Ver y descargar: quien puede ver el analisis con su alcance (con "estado" no).
 *   Aprobado, sustituido o anulado: solo lectura, siempre descargable.
 * - Cada descarga se registra en la bitacora y recalcula el SHA-256.
 */
import { anularAdjuntoComun, servirAdjunto, subirAdjunto } from "../../adjuntos-operaciones";
import { contextoAdjuntoCalidad } from "../calidad/adjuntos";
import { requireUser, userIdFromClaims, type CurrentUser } from "../../auth";
import { snapshotRow } from "../../audit";
import { isSqlite, type Row, type Session } from "../../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../../http";
import { cargoActuante, requirePermission, soloEstado, type Permiso } from "../../rbac";
import { exigirReauth } from "../../seguridad";
import { aplicarSupervision, marcaSupervision } from "../../supervision";
import { exigirAutorizaciones } from "../../autorizaciones";
import { estaAsignado, exigirAsignacion, soloAsignado } from "../../asignaciones";
import { folioLabel } from "../../samples-flow";
import { getConfig } from "../../config";
import { toIntOrNull } from "../helpers";
import { adjuntoPorId, ensureAdjuntosSchema, integridadAdjunto, listarAdjuntos, serializarAdjunto } from "../../adjuntos";
import { EXTENSIONES_EVIDENCIA, MOTIVO_MIN } from "../../../shared/adjuntos";
import { requisitosAnalisis } from "../../../shared/autorizaciones";
import { ensureAnalysisSchema, exigirAnalisisEditable } from "./analisis";

const TABLE = "muestras_analisis";

/* Analisis de la peticion; en MySQL con la fila bloqueada para que el estado no cambie a mitad (concurrencia con "Enviar a revision"). */
async function analisisDe(s: Session, id: number, bloquear = false): Promise<Row> {
  await ensureAnalysisSchema(s);
  await ensureAdjuntosSchema(s);
  const row = bloquear && !isSqlite() ? await s.queryOne<Row>(`SELECT * FROM ${TABLE} WHERE id = :id FOR UPDATE`, { id }) : await snapshotRow(s, TABLE, id);
  if (!row) throw new HttpError(404, { message: "Análisis no encontrado" });
  return row;
}

const mensajeBloqueado = (estado: string) =>
  estado === "aprobado" || estado === "sustituido"
    ? `El análisis está ${estado}: su evidencia es de solo lectura (si hay que corregir, crea una enmienda)`
    : "El análisis ya se envió a revisión; si hay que corregir, el revisor lo devuelve con observaciones";

/*
 * Mismas reglas que editar el analisis, mas asignacion y autorizacion
 * FX-THF-AP de "analisis" para el metodo del registro.
 */
async function exigirModificarEvidencia(s: Session, user: CurrentUser, row: Row): Promise<Permiso> {
  const permiso = await exigirAnalisisEditable(s, user, row, mensajeBloqueado);
  await exigirAsignacion(s, user, toIntOrNull(row.recepcion_id), permiso.auth);
  await exigirAutorizaciones(s, user, requisitosAnalisis(row.tipo_analisis));
  return permiso;
}

/* Ver y descargar: ensayos:V con su alcance; con "estado" no se ven adjuntos; con "asignado", solo lo asignado. */
async function exigirVerEvidencia(s: Session, user: CurrentUser, row: Row): Promise<Permiso> {
  const permiso = await requirePermission(s, user, "ensayos", "V");
  if (soloEstado(permiso)) throw new HttpError(403, { message: "Con tu alcance solo ves el estado del análisis, no su evidencia", codigo: "solo_estado" });
  if (soloAsignado(permiso)) {
    const yo = permiso.auth.userId;
    const recepcion = toIntOrNull(row.recepcion_id);
    if (Number(row.creado_por) !== yo && !(recepcion && (await estaAsignado(s, yo, recepcion)))) throw new HttpError(403, { message: "Este análisis no está asignado a ti", codigo: "no_asignado" });
  }
  return permiso;
}


/* GET /api/samples/analysis/:id/adjuntos */
export async function listarAdjuntosAnalisis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const row = await analisisDe(s, id);
  await exigirVerEvidencia(s, user, row);
  const filas = await listarAdjuntos(s, "analisis", id);
  // "Heredado de v1": version del analisis al que pertenecia el adjunto original.
  const origenes = filas.filter((f) => f.heredado_de).map((f) => Number(f.heredado_de));
  const versiones = new Map<number, number>();
  if (origenes.length) {
    const padres = await s.query<{ id: number; version: number }>(`SELECT a.id, m.version FROM adjuntos a LEFT JOIN ${TABLE} m ON m.id = a.entidad_id WHERE a.id IN (${origenes.join(", ")})`);
    for (const p of padres) versiones.set(Number(p.id), Number(p.version || 1));
  }
  const items = [];
  for (const f of filas) items.push(serializarAdjunto(f, { integridad: (await integridadAdjunto(f)).estado, heredado_de_version: f.heredado_de ? versiones.get(Number(f.heredado_de)) || null : null }));
  // Si la persona puede adjuntar ahora (y si no, por que): las mismas reglas que al subir.
  // El motivo es para la persona: primero el estado del analisis y, si solo consulta, una frase clara (no el codigo del permiso).
  let edicion: { permitido: boolean; motivo: string | null } = { permitido: true, motivo: null };
  const estado = String(row.estado || "");
  if (estado !== "registrado") {
    edicion = { permitido: false, motivo: estado === "anulado" ? "El análisis está anulado: su evidencia es de solo lectura" : mensajeBloqueado(estado) };
  } else {
    try {
      await exigirModificarEvidencia(s, user, row);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      edicion = { permitido: false, motivo: error.status === 403 && error.body.required ? "Solo consulta: adjuntar evidencia requiere poder editar este análisis" : error.message };
    }
  }
  const cfg = getConfig();
  return json({ items, edicion, obligatoria: cfg.EVIDENCIA_OBLIGATORIA_ANALISIS, max_mb: cfg.EVIDENCIA_MAX_MB, extensiones: EXTENSIONES_EVIDENCIA, referencia: folioLabel(TABLE, row) });
}

/* POST /api/samples/analysis/:id/adjuntos (multipart: archivo, tipo_evidencia, descripcion) */
export async function subirAdjuntoAnalisis({ request, s, params }: RouteContext): Promise<Response> {
  const id = intParam(params.id);
  const user = await requireUser(request);
  const row = await analisisDe(s, id, true);
  const permiso = await exigirModificarEvidencia(s, user, row);
  const actuo = cargoActuante(request, permiso);
  const supervision = marcaSupervision(permiso);
  const referencia = folioLabel(TABLE, row);
  return subirAdjunto(s, user, request, "analisis", id, {
    auditEntidad: TABLE,
    auditId: id,
    referencia,
    que: `el análisis ${referencia}`,
    cargo: actuo.cargo,
    detalleExtra: { actuo_como: actuo },
    // Cuenta supervisada: el analisis vuelve a quedar pendiente del visto bueno.
    despues: () => aplicarSupervision(s, TABLE, id, supervision, userIdFromClaims(user)),
  });
}

/*
 * Carga el adjunto. Los de un analisis se resuelven aqui; los de una incidencia
 * o accion correctiva (Fase 11) los resuelve el modulo de calidad con sus reglas.
 */
async function adjuntoDe(s: Session, adjuntoId: number): Promise<Row> {
  await ensureAdjuntosSchema(s);
  const adjunto = await adjuntoPorId(s, adjuntoId);
  if (!adjunto) throw new HttpError(404, { message: "Adjunto no encontrado" });
  return adjunto;
}

/* GET /api/adjuntos/:id/archivo (?inline=1 para la vista previa de PDF e imagenes) */
export async function descargarAdjunto({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const adjunto = await adjuntoDe(s, intParam(params.id));
  if (String(adjunto.entidad) !== "analisis") return servirAdjunto(s, user, request, adjunto, await contextoAdjuntoCalidad(s, user, adjunto, "ver"));
  const row = await analisisDe(s, Number(adjunto.entidad_id));
  await exigirVerEvidencia(s, user, row);
  const referencia = folioLabel(TABLE, row);
  return servirAdjunto(s, user, request, adjunto, { auditEntidad: TABLE, auditId: Number(row.id), referencia, que: `el análisis ${referencia}` });
}

/* POST /api/adjuntos/:id/anular { motivo } (reautenticacion adjuntos:anular) */
export async function anularAdjunto({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const adjunto = await adjuntoDe(s, intParam(params.id));
  const payload = await readJson(request);
  const motivo = String(payload.motivo || "").trim();
  if (String(adjunto.entidad) !== "analisis") {
    // Primero la visibilidad (lo ajeno responde 404) y despues el estado del adjunto.
    const ctx = await contextoAdjuntoCalidad(s, user, adjunto, "modificar", request);
    if (adjunto.anulado_en) throw new HttpError(409, { message: "El adjunto ya está anulado" });
    if (motivo.length < MOTIVO_MIN) throw new HttpError(400, { message: `Indica el motivo de la anulación (al menos ${MOTIVO_MIN} caracteres)` });
    await exigirReauth(s, request, user, "adjuntos:anular");
    await anularAdjuntoComun(s, user, adjunto, motivo, ctx);
    await s.commit();
    return json({ message: "Adjunto anulado; el archivo se conserva", item: serializarAdjunto((await adjuntoPorId(s, Number(adjunto.id)))!) });
  }
  const row = await analisisDe(s, Number(adjunto.entidad_id), true);
  const permiso = await exigirModificarEvidencia(s, user, row);
  if (adjunto.anulado_en) throw new HttpError(409, { message: "El adjunto ya está anulado" });
  const actuo = cargoActuante(request, permiso);
  const supervision = marcaSupervision(permiso);
  if (motivo.length < MOTIVO_MIN) throw new HttpError(400, { message: `Indica el motivo de la anulación (al menos ${MOTIVO_MIN} caracteres)` });
  await exigirReauth(s, request, user, "adjuntos:anular");
  const referencia = folioLabel(TABLE, row);
  // Con el analisis ya bloqueado se vuelve a leer el adjunto: si otra peticion lo anulo antes, 409 (sin doble entrada en la bitacora).
  await anularAdjuntoComun(s, user, adjunto, motivo, { auditEntidad: TABLE, auditId: Number(row.id), referencia, que: `el análisis ${referencia}`, cargo: actuo.cargo, detalleExtra: { actuo_como: actuo } });
  await aplicarSupervision(s, TABLE, Number(row.id), supervision, userIdFromClaims(user));
  await s.commit();
  const despues = (await adjuntoPorId(s, Number(adjunto.id)))!;
  return json({ message: "Adjunto anulado; el archivo se conserva", item: serializarAdjunto(despues) });
}
