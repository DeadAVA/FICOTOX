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
import { requireUser, userIdFromClaims, type CurrentUser } from "../../auth";
import { registrarAuditoria, snapshotRow } from "../../audit";
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
import {
  adjuntoPorId,
  anularAdjuntoFila,
  contentDisposition,
  descartarArchivo,
  duplicadoVigente,
  ensureAdjuntosSchema,
  guardarArchivo,
  insertarAdjunto,
  integridadAdjunto,
  leerArchivo,
  listarAdjuntos,
  serializarAdjunto,
  type ArchivoGuardado,
} from "../../adjuntos";
import { EXTENSIONES_EVIDENCIA, MIME_EVIDENCIA, MOTIVO_MIN, TIPO_EVIDENCIA_LABEL, VISTA_PREVIA } from "../../../shared/adjuntos";
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

const detalleAdjunto = (a: Row) => ({ adjunto_id: Number(a.id), tipo_evidencia: String(a.tipo_evidencia), descripcion: String(a.descripcion), nombre: String(a.nombre_original), tamano_bytes: Number(a.tamano_bytes), sha256: String(a.sha256) });

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
  const archivo = await leerArchivo(request);
  const userId = userIdFromClaims(user);
  let guardado: ArchivoGuardado | null = null;
  try {
    guardado = await guardarArchivo("analisis", id, archivo.extension, archivo.bytes);
    const duplicado = await duplicadoVigente(s, "analisis", id, guardado.sha256);
    if (duplicado) throw new HttpError(409, { message: `Ese archivo ya está adjunto (${String(duplicado.descripcion)})`, codigo: "adjunto_duplicado" });
    const adjuntoId = await insertarAdjunto(s, {
      entidad: "analisis",
      entidad_id: id,
      tipo_evidencia: archivo.tipo_evidencia,
      descripcion: archivo.descripcion,
      nombre_original: archivo.nombre_original,
      nombre_almacenado: guardado.nombre_almacenado,
      mime: MIME_EVIDENCIA[archivo.extension] || "application/octet-stream",
      extension: archivo.extension,
      tamano_bytes: guardado.tamano_bytes,
      sha256: guardado.sha256,
      subido_por: userId,
      subido_rol: actuo.cargo,
    });
    // Cuenta supervisada: el analisis vuelve a quedar pendiente del visto bueno.
    await aplicarSupervision(s, TABLE, id, supervision, userId);
    const adjunto = (await adjuntoPorId(s, adjuntoId))!;
    await registrarAuditoria(s, user, { accion: "adjuntar", entidad: TABLE, entidadId: id, referencia: folioLabel(TABLE, row), detalle: { ...detalleAdjunto(adjunto), actuo_como: actuo } });
    await s.commit();
    return json({ message: `${TIPO_EVIDENCIA_LABEL[archivo.tipo_evidencia] || "Evidencia"} adjuntada`, item: serializarAdjunto(adjunto, { integridad: "ok" }) }, 201);
  } catch (error) {
    await s.rollback();
    // Nada apunta al archivo: se elimina para no dejar huerfanos.
    await descartarArchivo(guardado);
    throw error;
  }
}

/* Carga el adjunto y su analisis (solo la entidad "analisis" esta habilitada en esta fase). */
async function adjuntoConAnalisis(s: Session, adjuntoId: number, bloquear = false): Promise<{ adjunto: Row; row: Row }> {
  await ensureAdjuntosSchema(s);
  const adjunto = await adjuntoPorId(s, adjuntoId);
  if (!adjunto || String(adjunto.entidad) !== "analisis") throw new HttpError(404, { message: "Adjunto no encontrado" });
  return { adjunto, row: await analisisDe(s, Number(adjunto.entidad_id), bloquear) };
}

/* GET /api/adjuntos/:id/archivo (?inline=1 para la vista previa de PDF e imagenes) */
export async function descargarAdjunto({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const { adjunto, row } = await adjuntoConAnalisis(s, intParam(params.id));
  await exigirVerEvidencia(s, user, row);
  const referencia = folioLabel(TABLE, row);
  const integridad = await integridadAdjunto(adjunto);
  if (integridad.estado !== "ok") {
    await registrarAuditoria(s, user, { accion: "alerta_integridad", entidad: TABLE, entidadId: Number(row.id), referencia, detalle: { ...detalleAdjunto(adjunto), integridad: integridad.estado, esperado: adjunto.sha256, obtenido: integridad.sha256 } });
  }
  if (integridad.estado === "faltante" || !integridad.bytes) {
    await s.commit();
    return new Response(JSON.stringify({ message: "El archivo de la evidencia no está en el servidor; se registró una alerta de integridad", codigo: "archivo_faltante" }), { status: 404, headers: { "Content-Type": "application/json", "X-Integridad-Adjunto": "faltante" } });
  }
  const ext = String(adjunto.extension);
  const inline = new URL(request.url).searchParams.get("inline") === "1" && VISTA_PREVIA.has(ext);
  await registrarAuditoria(s, user, { accion: "descargar", entidad: TABLE, entidadId: Number(row.id), referencia, detalle: { adjunto_id: Number(adjunto.id), tipo_evidencia: String(adjunto.tipo_evidencia), nombre: String(adjunto.nombre_original), ...(inline ? { vista_previa: true } : {}) } });
  await s.commit();
  return new Response(new Uint8Array(integridad.bytes), {
    status: 200,
    headers: {
      "Content-Type": MIME_EVIDENCIA[ext] || "application/octet-stream",
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", String(adjunto.nombre_original)),
      "Content-Length": String(integridad.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "X-Adjunto-Sha256": String(adjunto.sha256),
      "X-Integridad-Adjunto": integridad.estado,
    },
  });
}

/* POST /api/adjuntos/:id/anular { motivo } (reautenticacion adjuntos:anular) */
export async function anularAdjunto({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const { adjunto, row } = await adjuntoConAnalisis(s, intParam(params.id), true);
  if (adjunto.anulado_en) throw new HttpError(409, { message: "El adjunto ya está anulado" });
  const permiso = await exigirModificarEvidencia(s, user, row);
  const actuo = cargoActuante(request, permiso);
  const supervision = marcaSupervision(permiso);
  const payload = await readJson(request);
  const motivo = String(payload.motivo || "").trim();
  if (motivo.length < MOTIVO_MIN) throw new HttpError(400, { message: `Indica el motivo de la anulación (al menos ${MOTIVO_MIN} caracteres)` });
  await exigirReauth(s, request, user, "adjuntos:anular");
  const userId = userIdFromClaims(user);
  // Con el analisis ya bloqueado se vuelve a leer el adjunto: si otra peticion lo anulo antes, 409 (sin doble entrada en la bitacora).
  const vigente = await adjuntoPorId(s, Number(adjunto.id), true);
  if (!vigente || vigente.anulado_en || !(await anularAdjuntoFila(s, Number(adjunto.id), { por: userId, rol: actuo.cargo, motivo }))) throw new HttpError(409, { message: "El adjunto ya está anulado" });
  await aplicarSupervision(s, TABLE, Number(row.id), supervision, userId);
  await registrarAuditoria(s, user, { accion: "anular_adjunto", entidad: TABLE, entidadId: Number(row.id), referencia: folioLabel(TABLE, row), motivo, detalle: { ...detalleAdjunto(adjunto), actuo_como: actuo } });
  await s.commit();
  const despues = (await adjuntoPorId(s, Number(adjunto.id)))!;
  return json({ message: "Adjunto anulado; el archivo se conserva", item: serializarAdjunto(despues) });
}
