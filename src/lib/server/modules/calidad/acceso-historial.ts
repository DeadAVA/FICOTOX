/*
 * Fase 11: el historial (bitacora) de una incidencia, NC o accion lo ve quien ve
 * ese registro: con calidad:V total, todo; con el alcance "incidencias", solo lo
 * propio (lo ajeno responde 404, como la ficha).
 */
import type { CurrentUser } from "../../auth";
import { type Row, type Session } from "../../db";
import { HttpError } from "../../http";
import { accesoCalidad, incidenciaVisible, ncVisible, T, veNc } from "./comun";

/* Entidades de calidad cuyo historial y solicitudes se filtran por registro. */
export const ENTIDADES_REGISTRO_CALIDAD = new Set<string>([T.incidencias, T.nc, T.acciones, T.suspensiones]);

export async function exigirVerRegistroCalidad(s: Session, user: CurrentUser, entidad: string, id: number): Promise<void> {
  if (entidad === T.incidencias) {
    await incidenciaVisible(s, await accesoCalidad(s, user, "incidencia"), id);
    return;
  }
  if (entidad === T.nc) {
    await ncVisible(s, await accesoCalidad(s, user, "nc"), id);
    return;
  }
  if (entidad === T.acciones) {
    const acc = await accesoCalidad(s, user, "accion_correctiva");
    // Como la ficha: quien ve la NC ve sus acciones.
    const nc = await s.queryOne<Row>(`SELECT n.* FROM ${T.acciones} a JOIN ${T.nc} n ON n.id = a.nc_id WHERE a.id = :id`, { id });
    if (!nc || !(await veNc(s, acc, nc))) throw new HttpError(404, { message: "Acción correctiva no encontrada" });
    return;
  }
  if (entidad === T.suspensiones) {
    // Las suspensiones (y sus excepciones de segregacion) solo con calidad:V total.
    if (!(await accesoCalidad(s, user, "nc")).total) throw new HttpError(403, { message: "Las suspensiones requieren calidad:V total" });
    return;
  }
  throw new HttpError(404, { message: "Registro no encontrado" });
}
