/*
 * Adjuntos de calidad (Fase 11): la tabla generica `adjuntos` (Fase 10) con
 * entidad 'incidencia' (fotos, bitacoras, correos) y 'accion_correctiva'
 * (evidencia de implementacion). Mismas validaciones, almacenamiento e
 * integridad que la evidencia de los analisis (adjuntos-operaciones.ts).
 *
 * - Incidencia: ver = quien ve la incidencia; adjuntar o anular = quien la
 *   reporto o calidad:G, mientras este reportada o en evaluacion.
 * - Accion correctiva: ver = quien ve la accion (total, su responsable o el de
 *   la NC); adjuntar o anular = su responsable o calidad:G, mientras la accion
 *   no este cancelada y la NC no este cerrada ni anulada.
 */
import { requireUser, type CurrentUser } from "../../auth";
import { type Row, type Session } from "../../db";
import { HttpError, intParam, json, type RouteContext } from "../../http";
import { cargoActuante, permisoDe } from "../../rbac";
import { ensureAdjuntosSchema, integridadAdjunto, listarAdjuntos, serializarAdjunto } from "../../adjuntos";
import { subirAdjunto, type ContextoAdjunto } from "../../adjuntos-operaciones";
import { getConfig } from "../../config";
import { accesoCalidad, filaBloqueada, incidenciaVisible, T, veNc, type AccesoCalidad } from "./comun";
import { EXTENSIONES_EVIDENCIA } from "../../../shared/adjuntos";
import { folioIncidencia, folioNc } from "../../../shared/calidad";

type Modo = "ver" | "modificar";

async function accionVisible(s: Session, acc: AccesoCalidad, id: number, bloquear = false): Promise<{ accion: Row; nc: Row }> {
  const accion = bloquear ? await filaBloqueada(s, T.acciones, id) : await s.queryOne<Row>(`SELECT * FROM ${T.acciones} WHERE id = :id`, { id });
  const nc = accion ? await s.queryOne<Row>(`SELECT * FROM ${T.nc} WHERE id = :id`, { id: accion.nc_id }) : null;
  // Quien ve la NC ve sus acciones (la NC muestra la tabla completa).
  if (!accion || !nc || !(await veNc(s, acc, nc))) throw new HttpError(404, { message: "Acción correctiva no encontrada" });
  return { accion, nc };
}

/* Quien puede adjuntar o anular (409 por estado, 403 por persona). Devuelve el cargo con que actua. */
function exigirModificar(request: Request | undefined, acc: AccesoCalidad, entidad: "incidencia" | "accion_correctiva", row: Row, nc?: Row): string | null {
  const g = permisoDe(acc.auth, "calidad", "G", { objeto: entidad });
  if (entidad === "incidencia") {
    if (!["reportada", "en_evaluacion"].includes(String(row.estado))) throw new HttpError(409, { message: `La incidencia está ${row.estado}; sus adjuntos son de solo lectura` });
    if (Number(row.reportada_por) !== acc.yo && !g) throw new HttpError(403, { message: "Solo quien reportó la incidencia (o calidad:G) agrega o anula sus adjuntos" });
  } else {
    if (String(row.estado) === "cancelada" || ["cerrada", "anulada"].includes(String(nc?.estado))) throw new HttpError(409, { message: "La acción está cancelada o su NC ya está cerrada; su evidencia es de solo lectura" });
    if (Number(row.responsable_id) !== acc.yo && !g) throw new HttpError(403, { message: "Solo el responsable de la acción (o calidad:G) agrega o anula su evidencia" });
  }
  const permiso = g || permisoDe(acc.auth, "calidad", "C", { objeto: entidad });
  return permiso && request ? cargoActuante(request, permiso).cargo : null;
}

/* Contexto de un adjunto de calidad para descargar o anular (lo usa /api/adjuntos/:id/...). */
export async function contextoAdjuntoCalidad(s: Session, user: CurrentUser, adjunto: Row, modo: Modo, request?: Request): Promise<ContextoAdjunto & { cargo: string | null }> {
  const entidad = String(adjunto.entidad);
  if (entidad === "incidencia") {
    const acc = await accesoCalidad(s, user, "incidencia");
    const row = await incidenciaVisible(s, acc, Number(adjunto.entidad_id), modo === "modificar");
    const cargo = modo === "modificar" ? exigirModificar(request, acc, "incidencia", row) : null;
    const referencia = folioIncidencia(row.folio_num);
    return { auditEntidad: T.incidencias, auditId: Number(row.id), referencia, que: `la incidencia ${referencia}`, cargo };
  }
  if (entidad === "accion_correctiva") {
    const acc = await accesoCalidad(s, user, "accion_correctiva");
    const { accion, nc } = await accionVisible(s, acc, Number(adjunto.entidad_id), modo === "modificar");
    const cargo = modo === "modificar" ? exigirModificar(request, acc, "accion_correctiva", accion, nc) : null;
    const referencia = `${folioNc(nc.folio_num)} · acción #${accion.id}`;
    return { auditEntidad: T.nc, auditId: Number(nc.id), referencia, que: `la acción correctiva #${accion.id} de ${folioNc(nc.folio_num)}`, cargo };
  }
  throw new HttpError(404, { message: "Adjunto no encontrado" });
}

async function listar(s: Session, entidad: "incidencia" | "accion_correctiva", id: number, puede: boolean, motivo: string | null): Promise<Response> {
  await ensureAdjuntosSchema(s);
  const filas = await listarAdjuntos(s, entidad, id);
  const items = [];
  for (const f of filas) items.push(serializarAdjunto(f, { integridad: (await integridadAdjunto(f)).estado }));
  return json({ items, edicion: { permitido: puede, motivo }, obligatoria: false, max_mb: getConfig().EVIDENCIA_MAX_MB, extensiones: EXTENSIONES_EVIDENCIA });
}

const intento = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (error) {
    if (error instanceof HttpError) return error.message;
    throw error;
  }
};

/* GET /api/calidad/incidencias/:id/adjuntos */
export async function listarAdjuntosIncidencia({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const acc = await accesoCalidad(s, user, "incidencia");
  const row = await incidenciaVisible(s, acc, intParam(params.id));
  const motivo = intento(() => exigirModificar(undefined, acc, "incidencia", row));
  return listar(s, "incidencia", Number(row.id), !motivo, motivo);
}

/* POST /api/calidad/incidencias/:id/adjuntos (multipart) */
export async function subirAdjuntoIncidencia({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const acc = await accesoCalidad(s, user, "incidencia");
  const row = await incidenciaVisible(s, acc, intParam(params.id), true);
  const cargo = exigirModificar(request, acc, "incidencia", row);
  const referencia = folioIncidencia(row.folio_num);
  return subirAdjunto(s, user, request, "incidencia", Number(row.id), { auditEntidad: T.incidencias, auditId: Number(row.id), referencia, que: `la incidencia ${referencia}`, cargo });
}

/* GET /api/calidad/acciones/:id/adjuntos */
export async function listarAdjuntosAccion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const acc = await accesoCalidad(s, user, "accion_correctiva");
  const { accion, nc } = await accionVisible(s, acc, intParam(params.id));
  const motivo = intento(() => exigirModificar(undefined, acc, "accion_correctiva", accion, nc));
  return listar(s, "accion_correctiva", Number(accion.id), !motivo, motivo);
}

/* POST /api/calidad/acciones/:id/adjuntos (multipart) */
export async function subirAdjuntoAccion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const acc = await accesoCalidad(s, user, "accion_correctiva");
  const { accion, nc } = await accionVisible(s, acc, intParam(params.id), true);
  const cargo = exigirModificar(request, acc, "accion_correctiva", accion, nc);
  const referencia = `${folioNc(nc.folio_num)} · acción #${accion.id}`;
  return subirAdjunto(s, user, request, "accion_correctiva", Number(accion.id), { auditEntidad: T.nc, auditId: Number(nc.id), referencia, que: `la acción correctiva #${accion.id} de ${folioNc(nc.folio_num)}`, cargo });
}

export { accionVisible };
