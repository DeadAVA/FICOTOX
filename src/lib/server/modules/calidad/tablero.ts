/*
 * Indicadores de calidad (Fase 11; FX-MO-2-1 seccion 4: Mejora Continua
 * administra indicadores, el Responsable General los revisa) y avisos para el
 * Inicio y la campana.
 */
import { requireUser } from "../../auth";
import { type Row, type Session } from "../../db";
import { HttpError, json, type RouteContext } from "../../http";
import { permisoDe, type Autorizacion } from "../../rbac";
import { CLASIFICACION_NC_LABEL, TIPO_INCIDENCIA_LABEL, accionVencida, folioIncidencia, folioNc } from "../../../shared/calidad";
import { formatearFecha, hoyLocal, sumarDias } from "../../../shared/fechas";
import { accesoCalidad, ensureCalidadSchema, previosDe, T } from "./comun";
import { suspensionesActivas } from "./bloqueos";

/* GET /api/calidad/indicadores (calidad:V total) */
export async function indicadores({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const acc = await accesoCalidad(s, user, "nc");
  if (!acc.total) throw new HttpError(403, { message: "El tablero de indicadores requiere calidad:V total" });
  const hoy = hoyLocal();
  const ncs = await s.query<Row>(`SELECT n.id, n.estado, n.clasificacion, n.origen, n.creada_en, n.cerrada_en, n.reaperturas, (SELECT i.tipo FROM ${T.incidencias} i WHERE i.nc_id = n.id ORDER BY i.id LIMIT 1) AS tipo_incidencia FROM ${T.nc} n WHERE n.estado <> 'anulada'`);
  const acciones = await s.query<Row>(`SELECT a.estado, a.fecha_compromiso FROM ${T.acciones} a JOIN ${T.nc} n ON n.id = a.nc_id WHERE n.estado <> 'anulada'`);
  const incidencias = await s.query<Row>(`SELECT estado, tipo, origen_automatico FROM ${T.incidencias} WHERE estado <> 'anulada'`);
  const cerradas = ncs.filter((n) => n.estado === "cerrada");
  const dias = cerradas.map((n) => (Date.parse(String(n.cerrada_en)) - Date.parse(String(n.creada_en))) / 86_400_000).filter((d) => Number.isFinite(d) && d >= 0);
  const contar = (filas: Row[], campo: string, etiquetas?: Record<string, string>) => {
    const out: Record<string, { label: string; total: number }> = {};
    for (const f of filas) {
      const clave = String(f[campo] || "sin_dato");
      out[clave] ||= { label: etiquetas?.[clave] || (clave === "sin_dato" ? "Sin dato" : clave), total: 0 };
      out[clave].total += 1;
    }
    return Object.entries(out).map(([clave, v]) => ({ clave, ...v })).sort((a, b) => b.total - a.total);
  };
  return json({
    nc_abiertas: ncs.length - cerradas.length,
    nc_cerradas: cerradas.length,
    dias_promedio_cierre: dias.length ? Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10 : null,
    reaperturas: ncs.reduce((t, n) => t + Number(n.reaperturas || 0), 0),
    acciones_vencidas: acciones.filter((a) => accionVencida(a, hoy)).length,
    acciones_abiertas: acciones.filter((a) => ["pendiente", "en_proceso"].includes(String(a.estado))).length,
    por_clasificacion: contar(ncs, "clasificacion", CLASIFICACION_NC_LABEL),
    por_tipo: contar(ncs.map((n) => ({ ...n, tipo: n.tipo_incidencia || `origen_${n.origen}` })), "tipo", { ...TIPO_INCIDENCIA_LABEL, origen_queja: "Queja (sin incidencia)", origen_auditoria_interna: "Auditoría interna", origen_revision: "Revisión", origen_otro: "Otro origen" }),
    incidencias_por_estado: contar(incidencias, "estado"),
    incidencias_automaticas: incidencias.filter((i) => i.origen_automatico).length,
  });
}

export interface AvisoCalidad {
  tipo: string;
  titulo: string;
  detalle: string;
  href: string;
  tono: "danger" | "warning" | "info";
}

/* Avisos de calidad para el Inicio y la campana (solo lo que aplica a la persona). */
export async function avisosCalidad(s: Session, auth: Autorizacion): Promise<AvisoCalidad[]> {
  await ensureCalidadSchema(s);
  const out: AvisoCalidad[] = [];
  const yo = auth.userId;
  const puede = (accion: "R" | "A" | "G") => !!permisoDe(auth, "calidad", accion, { objeto: "nc" });
  const hoy = hoyLocal();
  const en7 = sumarDias(hoy, 7);
  // Sin calidad:V total la NC puede no ser visible: los avisos de retencion y suspension llevan al informe o al inventario.
  const total = !!permisoDe(auth, "calidad", "V", { objeto: "nc" })?.alcances.includes("total");
  // Incidencias por evaluar (calidad:R), sin las que reporto la persona (regla 7).
  if (puede("R")) {
    const filas = await s.query<Row>(`SELECT id, folio_num, tipo FROM ${T.incidencias} WHERE estado IN ('reportada', 'en_evaluacion') AND COALESCE(reportada_por, 0) <> :yo ORDER BY id LIMIT 15`, { yo });
    for (const f of filas) out.push({ tipo: "incidencia_por_evaluar", titulo: `Incidencia por evaluar: ${folioIncidencia(f.folio_num)}`, detalle: TIPO_INCIDENCIA_LABEL[String(f.tipo)] || String(f.tipo), href: `/calidad/incidencias/${f.id}`, tono: "warning" });
  }
  // Mis acciones correctivas: vencidas y proximas (7 dias).
  const mias = await s.query<Row>(`SELECT a.id, a.descripcion, a.fecha_compromiso, a.estado, n.id AS nc_id, n.folio_num FROM ${T.acciones} a JOIN ${T.nc} n ON n.id = a.nc_id WHERE a.responsable_id = :yo AND a.estado IN ('pendiente', 'en_proceso') AND n.estado NOT IN ('cerrada', 'anulada') ORDER BY a.fecha_compromiso`, { yo });
  for (const a of mias) {
    const vencida = accionVencida(a, hoy);
    const proxima = !vencida && !!a.fecha_compromiso && String(a.fecha_compromiso) <= en7;
    out.push({ tipo: vencida ? "accion_vencida" : "accion_mia", titulo: `${vencida ? "Acción vencida" : proxima ? "Acción próxima" : "Mi acción correctiva"}: ${folioNc(a.folio_num)}`, detalle: `${String(a.descripcion).slice(0, 70)} · compromiso ${formatearFecha(a.fecha_compromiso)}`, href: `/calidad/nc/${a.nc_id}`, tono: vencida ? "danger" : "info" });
  }
  // Verificaciones de eficacia pendientes (calidad:R), sin las NC donde es responsable de una accion (regla 8).
  if (puede("R")) {
    const filas = await s.query<Row>(`SELECT id, folio_num, verificacion_programada FROM ${T.nc} n WHERE estado = 'en_verificacion' AND NOT EXISTS (SELECT 1 FROM ${T.acciones} a WHERE a.nc_id = n.id AND (a.responsable_id = :yo OR a.implementada_por = :yo) AND a.estado <> 'cancelada') ORDER BY id LIMIT 30`, { yo });
    // Tampoco a quien fue responsable de una accion antes de reasignarla (regla 8).
    const previas = filas.length ? await s.query<Row>(`SELECT nc_id, responsables_previos FROM ${T.acciones} WHERE nc_id IN (${filas.map((f) => Number(f.id)).join(", ")}) AND estado <> 'cancelada'`) : [];
    const excluidas = new Set(previas.filter((a) => previosDe(a).includes(yo)).map((a) => Number(a.nc_id)));
    for (const f of filas.filter((x) => !excluidas.has(Number(x.id))).slice(0, 15)) out.push({ tipo: "verificacion_pendiente", titulo: `Verificar eficacia: ${folioNc(f.folio_num)}`, detalle: f.verificacion_programada ? `Programada ${formatearFecha(f.verificacion_programada)}` : "Acciones implementadas", href: `/calidad/nc/${f.id}`, tono: "warning" });
  }
  // Informes retenidos (quien libera o envia informes y calidad:A).
  if (puede("A") || permisoDe(auth, "informes", "A")) {
    const filas = await s.query<Row>(`SELECT r.informe_id, i.folio_num, i.version, n.id AS nc_id, n.folio_num AS nc_folio FROM ${T.retenciones} r JOIN informes i ON i.id = r.informe_id JOIN ${T.nc} n ON n.id = r.nc_id WHERE r.liberada_en IS NULL ORDER BY r.id LIMIT 15`);
    for (const f of filas) out.push({ tipo: "informe_retenido", titulo: `Informe retenido: IR ${String(f.folio_num).padStart(7, "0")}${Number(f.version || 1) > 1 ? ` v${f.version}` : ""}`, detalle: `Por ${folioNc(f.nc_folio)}`, href: total ? `/calidad/nc/${f.nc_id}` : `/informes/${f.informe_id}`, tono: "danger" });
  }
  // Metodos y equipos suspendidos (quien captura ensayos y calidad).
  if (puede("R") || puede("A") || permisoDe(auth, "ensayos", "C") || permisoDe(auth, "ensayos", "E")) {
    for (const su of (await suspensionesActivas(s)).slice(0, 15)) out.push({ tipo: "suspension", titulo: `${su.tipo === "metodo" ? `Método ${su.clave}` : `Equipo ${su.equipo_nombre || su.clave}`} suspendido`, detalle: `Por ${folioNc(su.nc_folio)}`, href: total ? `/calidad/nc/${su.nc_id}` : su.tipo === "equipo" ? "/inventario/equipos" : "/muestras/extraccion", tono: "danger" });
  }
  // Acciones cuyo responsable ya no tiene cuenta vigente (se reasignan con motivo): a calidad:G y al responsable de la NC.
  const noVigentes = await s.query<Row>(
    `SELECT a.id, n.id AS nc_id, n.folio_num, u.nombre FROM ${T.acciones} a JOIN ${T.nc} n ON n.id = a.nc_id JOIN usuarios u ON u.id = a.responsable_id
     WHERE a.estado IN ('pendiente', 'en_proceso') AND n.estado NOT IN ('cerrada', 'anulada') AND (u.activo = 0 OR (u.vigente_hasta IS NOT NULL AND u.vigente_hasta < :hoy)) AND (:g = 1 OR n.responsable_id = :yo) LIMIT 15`,
    { hoy, g: puede("G") ? 1 : 0, yo },
  );
  for (const f of noVigentes) out.push({ tipo: "responsable_no_vigente", titulo: `Reasignar acción de ${folioNc(f.folio_num)}`, detalle: `${f.nombre} ya no tiene cuenta vigente`, href: `/calidad/nc/${f.nc_id}`, tono: "warning" });
  // La NC misma sin responsable vigente: la reasigna quien administra calidad (calidad:G), con motivo.
  if (puede("G")) {
    const ncs = await s.query<Row>(
      `SELECT n.id, n.folio_num, u.nombre FROM ${T.nc} n JOIN usuarios u ON u.id = n.responsable_id
       WHERE n.estado NOT IN ('cerrada', 'anulada') AND (u.activo = 0 OR (u.vigente_hasta IS NOT NULL AND u.vigente_hasta < :hoy)) LIMIT 15`,
      { hoy },
    );
    for (const f of ncs) out.push({ tipo: "responsable_no_vigente", titulo: `Nombrar otro responsable de ${folioNc(f.folio_num)}`, detalle: `${f.nombre} ya no tiene cuenta vigente`, href: `/calidad/nc/${f.id}`, tono: "warning" });
  }
  return out;
}
