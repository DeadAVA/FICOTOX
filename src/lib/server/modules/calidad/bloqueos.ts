/*
 * Bloqueos por no conformidad (Fase 11, ISO/IEC 17025 7.10.1): los consultan
 * los modulos de muestras, informes y equipos antes de escribir.
 * - Metodo suspendido: no se crean ni editan extracciones ni analisis de ese
 *   metodo (409 "Metodo DSP suspendido por NC 0000001"). Lo ya aprobado no se toca.
 * - Equipo suspendido: queda "fuera de servicio" y usarlo en un formato responde 409.
 * - Informe retenido: no se libera ni se envia (409 "Retenido por NC 0000001").
 */
import { isSqlite, type Row, type Session } from "../../db";
import { HttpError } from "../../http";
import { ensureCalidadSchema, T } from "./comun";
import { folioNc } from "../../../shared/calidad";

/* Suspensiones activas (no reanudadas) con el folio de su NC. */
/* `bloquear`: lectura con FOR UPDATE en MySQL (suspender y reanudar ven lo ultimo confirmado, no la foto de la transaccion). */
export async function suspensionesActivas(s: Session, filtro?: { tipo: "metodo" | "equipo"; clave: string }, bloquear = false): Promise<Row[]> {
  await ensureCalidadSchema(s);
  // En MySQL se bloquean solo las filas de suspensiones (sin arrastrar NC ni equipos del JOIN, que invertiria el orden de bloqueo).
  if (bloquear && !isSqlite()) await s.query(`SELECT id FROM ${T.suspensiones} WHERE reanudada_en IS NULL ${filtro ? "AND tipo = :tipo AND clave = :clave" : ""} FOR UPDATE`, filtro ? { tipo: filtro.tipo, clave: filtro.clave } : {});
  return s.query<Row>(
    `SELECT su.*, n.folio_num AS nc_folio, e.nombre AS equipo_nombre, e.clave_bitacora AS equipo_clave FROM ${T.suspensiones} su
     LEFT JOIN ${T.nc} n ON n.id = su.nc_id LEFT JOIN equipos e ON su.tipo = 'equipo' AND e.id = CAST(su.clave AS ${isSqlite() ? "INTEGER" : "SIGNED"})
     WHERE su.reanudada_en IS NULL ${filtro ? "AND su.tipo = :tipo AND su.clave = :clave" : ""} ORDER BY su.id`,
    filtro ? { tipo: filtro.tipo, clave: filtro.clave } : {},
  );
}

const nombreSuspension = (row: Row) => (row.tipo === "metodo" ? `Método ${row.clave}` : `Equipo ${row.equipo_nombre || `#${row.clave}`}${row.equipo_clave ? ` (${row.equipo_clave})` : ""}`);

/* 409 si algun metodo o equipo del formato esta suspendido. */
/* Ids de equipos de un formato: los declarados con id y los declarados solo por texto (nombre o clave de bitacora del catalogo). */
export async function idsDeEquipos(s: Session, equipoIds: unknown[] = [], equipoNombres: Array<string | null | undefined> = []): Promise<number[]> {
  const ids = equipoIds.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
  for (const nombre of equipoNombres.map((n) => String(n || "").trim()).filter(Boolean)) {
    const eq = await s.queryOne<Row>("SELECT id FROM equipos WHERE LOWER(nombre) = LOWER(:n) OR LOWER(clave_bitacora) = LOWER(:n)", { n: nombre });
    if (eq) ids.push(Number(eq.id));
  }
  return [...new Set(ids)];
}

/* `equipoNombres`: equipo declarado como texto (sin id); se resuelve contra el catalogo. */
export async function exigirSinSuspension(s: Session, uso: { metodos?: Array<string | null | undefined>; equipoIds?: unknown[]; equipoNombres?: Array<string | null | undefined> }): Promise<void> {
  const metodos = [...new Set((uso.metodos || []).filter((m): m is string => !!m))];
  const equipos = (await idsDeEquipos(s, uso.equipoIds || [], uso.equipoNombres || [])).map(String);
  if (!metodos.length && !equipos.length) return;
  const activas = await suspensionesActivas(s);
  const bloquea = activas.filter((su) => (su.tipo === "metodo" && metodos.includes(String(su.clave))) || (su.tipo === "equipo" && equipos.includes(String(su.clave))));
  if (!bloquea.length) return;
  const primero = bloquea[0];
  const ncs = [...new Set(bloquea.filter((b) => b.tipo === primero.tipo && b.clave === primero.clave).map((b) => folioNc(b.nc_folio)))].join(", ");
  throw new HttpError(409, { message: `${nombreSuspension(primero)} suspendido por ${ncs}; no se puede usar hasta que Calidad lo reanude`, codigo: "suspendido", suspensiones: bloquea.map((b) => ({ id: b.id, tipo: b.tipo, clave: b.clave, nc: folioNc(b.nc_folio) })) });
}

/* Retenciones activas de un informe. */
export async function retencionesActivas(s: Session, informeId: number): Promise<Row[]> {
  await ensureCalidadSchema(s);
  return s.query<Row>(`SELECT r.*, n.folio_num AS nc_folio FROM ${T.retenciones} r LEFT JOIN ${T.nc} n ON n.id = r.nc_id WHERE r.informe_id = :id AND r.liberada_en IS NULL ORDER BY r.id`, { id: informeId });
}

/* 409 si el informe esta retenido por una NC (como "requiere enmienda"). */
export async function exigirSinRetencion(s: Session, informeId: number, referencia: string, que: string): Promise<void> {
  const activas = await retencionesActivas(s, informeId);
  if (!activas.length) return;
  const ncs = [...new Set(activas.map((r) => folioNc(r.nc_folio)))].join(", ");
  throw new HttpError(409, { message: `El informe ${referencia} está retenido por ${ncs}; no se puede ${que} hasta que Calidad libere la retención`, codigo: "informe_retenido", retenido_por: ncs });
}
