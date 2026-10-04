/*
 * Notificaciones dentro de la app (Fase 9): campana de la barra lateral.
 * Se calculan al vuelo desde lo que ya existe (sin tabla nueva) y solo
 * muestran lo que aplica a la persona segun sus permisos y asignaciones.
 * Reutiliza las consultas de los avisos del Inicio.
 */
import { avisosCalidad } from "./calidad/tablero";
import { alertaBitacoraAbierta } from "./audit";
import { requireUser } from "../auth";
import { type Row, type Session } from "../db";
import { json, type RouteContext } from "../http";
import { cargarAutorizacion, permisoDe, type Autorizacion } from "../rbac";
import { contarPorSupervisar } from "../supervision";
import { porAutorizarDe } from "../solicitudes";
import { autorizacionesPorVencer } from "../autorizaciones";

import { ACCIONES_CRITICAS } from "../../shared/acciones-criticas";
import { formatearFecha, hoyLocal, sumarDias } from "../../shared/fechas";
import { vencimientosProximos } from "./admin";


export interface Notificacion {
  tipo: string;
  titulo: string;
  detalle: string;
  href: string;
  tono: "danger" | "warning" | "info";
}

const pad = (n: unknown) => String(n || 0).padStart(7, "0");
const LIMITE = 15;

export async function notificacionesDe(s: Session, auth: Autorizacion): Promise<Notificacion[]> {
  const out: Notificacion[] = [];
  const yo = auth.userId;
  const puede = (modulo: Parameters<typeof permisoDe>[1], accion: Parameters<typeof permisoDe>[2]) => !!permisoDe(auth, modulo, accion);

  // Muestras asignadas a la persona en los ultimos 7 dias.
  const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const asignadas = await s.query<Row>(
    `SELECT a.recepcion_id, a.asignado_en, r.folio_num, r.solicitante FROM asignaciones_muestra a LEFT JOIN muestras_recepcion r ON r.id = a.recepcion_id
     WHERE a.usuario_id = :yo AND a.revocado_en IS NULL AND a.asignado_en >= :desde ORDER BY a.asignado_en DESC LIMIT ${LIMITE}`,
    { yo, desde },
  );
  for (const a of asignadas) out.push({ tipo: "muestra_asignada", titulo: `Muestra asignada R ${pad(a.folio_num)}`, detalle: `${a.solicitante || ""} · ${formatearFecha(a.asignado_en)}`.replace(/^ · /, ""), href: `/muestras/recepcion/${a.recepcion_id}`, tono: "info" });

  // Analisis que puede revisar o aprobar (no los que elaboro).
  const estadosAnalisis = [puede("ensayos", "R") ? "en_revision" : null, puede("ensayos", "A") ? "revisado" : null].filter(Boolean) as string[];
  if (estadosAnalisis.length) {
    const filas = await s.query<Row>(`SELECT id, folio_num, version, estado FROM muestras_analisis WHERE estado IN (${estadosAnalisis.map((e) => `'${e}'`).join(", ")}) AND COALESCE(creado_por, 0) <> :yo ORDER BY id LIMIT ${LIMITE}`, { yo });
    for (const f of filas) out.push({ tipo: "analisis", titulo: `${String(f.estado) === "revisado" ? "Aprobar" : "Revisar"} análisis A ${pad(f.folio_num)}${Number(f.version || 1) > 1 ? ` v${f.version}` : ""}`, detalle: String(f.estado) === "revisado" ? "Revisado, falta aprobar" : "Enviado a revisión", href: `/muestras/analisis/${f.id}`, tono: "warning" });
  }

  // Informes que puede revisar, autorizar o liberar (no los que elaboro).
  const estadosInforme = [puede("informes", "R") ? "borrador" : null, ...(puede("informes", "A") ? ["en_revision", "autorizado"] : [])].filter(Boolean) as string[];
  if (estadosInforme.length) {
    const filas = await s.query<Row>(`SELECT id, folio_num, version, estado FROM informes WHERE estado IN (${estadosInforme.map((e) => `'${e}'`).join(", ")}) AND COALESCE(creado_por, 0) <> :yo AND COALESCE(requiere_enmienda, 0) = 0 ORDER BY id LIMIT ${LIMITE}`, { yo });
    const verbo: Record<string, string> = { borrador: "Revisar", en_revision: "Autorizar", autorizado: "Liberar" };
    for (const f of filas) out.push({ tipo: "informe", titulo: `${verbo[String(f.estado)]} informe IR ${pad(f.folio_num)}${Number(f.version || 1) > 1 ? ` v${f.version}` : ""}`, detalle: String(f.estado) === "autorizado" ? "Autorizado, falta liberar" : String(f.estado) === "en_revision" ? "Revisado, falta autorizar" : "Borrador, falta revisar", href: `/informes/${f.id}`, tono: "warning" });
  }

  // Solicitudes "Por autorizar" y registros "Por supervisar".
  for (const sol of await porAutorizarDe(s, auth)) out.push({ tipo: "solicitud", titulo: `Por autorizar: ${ACCIONES_CRITICAS[sol.tipo]?.etiqueta || sol.tipo}`, detalle: `${sol.referencia || ""} · solicitud #${sol.id}`.replace(/^ · /, ""), href: "/solicitudes", tono: "warning" });
  for (const r of await contarPorSupervisar(s, yo)) out.push({ tipo: "supervision", titulo: `Por supervisar: ${r.tipo} ${r.referencia}`, detalle: "Pendiente de tu visto bueno", href: String(r.href), tono: "warning" });

  // Biblioteca: ya no hay documentos por leer, revisar, aprobar ni publicar (flujo de control documental retirado).

  // Mantenimientos vencidos o proximos (si ve equipos).
  if (puede("equipos", "V")) {
    const hoy = hoyLocal();
    const filas = await s.query<Row>(
      `SELECT mt.id, mt.tipo, mt.fecha_programada, mt.estado, e.nombre AS equipo FROM mantenimientos mt LEFT JOIN equipos e ON e.id = mt.id_equipo
       WHERE mt.estado = 'vencido' OR (mt.estado IN ('programado', 'en_proceso') AND mt.fecha_programada <= :limite) ORDER BY mt.fecha_programada LIMIT ${LIMITE}`,
      { limite: sumarDias(hoy, 30) },
    );
    for (const m of filas) {
      const vencido = String(m.estado) === "vencido" || String(m.fecha_programada || "") < hoy;
      out.push({ tipo: "mantenimiento", titulo: `${vencido ? "Mantenimiento vencido" : "Mantenimiento próximo"}: ${m.equipo || "Equipo"}`, detalle: formatearFecha(m.fecha_programada), href: "/inventario/mantenimiento", tono: vencido ? "danger" : "info" });
    }
  }

  // Cuentas, roles y autorizaciones que vencen pronto (las propias; las de otros si administra).
  const administra = !!permisoDe(auth, "usuarios", "G");
  const vencen = administra ? await vencimientosProximos(s, 7) : (await vencimientosProximos(s, 7)).filter((v) => Number(v.usuario_id ?? v.id) === yo);
  for (const v of vencen.slice(0, LIMITE)) out.push({ tipo: "acceso", titulo: `${v.rol ? `Rol ${v.rol}` : "Cuenta"} vence el ${formatearFecha(v.vigente_hasta)}`, detalle: String(v.nombre || v.email || ""), href: administra ? "/administracion/usuarios?vigencia=vence7" : "/#mis-autorizaciones", tono: "warning" });
  for (const a of (await autorizacionesPorVencer(s, auth, 30)).slice(0, LIMITE)) out.push({ tipo: "autorizacion", titulo: `Autorización por vencer: ${a.etiqueta}`, detalle: `${a.propia ? "Tuya" : a.persona} · vence el ${formatearFecha(a.vigente_hasta)}`, href: a.propia ? "/#mis-autorizaciones" : "/administracion/usuarios", tono: "warning" });
  // Registro de actividad: posible cambio no autorizado (a quien consulta Calidad).
  if (puede("calidad", "V") && (await alertaBitacoraAbierta(s))) out.unshift({ tipo: "bitacora_alterada", titulo: "Posible cambio no autorizado en el registro de actividad", detalle: "Avisa a la Coordinación de Mejora Continua", href: "/auditoria", tono: "danger" });
  // Fase 11: incidencias por evaluar, mis acciones (proximas y vencidas), verificaciones, informes retenidos y suspensiones.
  for (const a of await avisosCalidad(s, auth)) out.push(a);
  return out;
}

/* GET /api/notificaciones */
export async function listarNotificaciones({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const items = await notificacionesDe(s, await cargarAutorizacion(s, user));
  return json({ items, total: items.length });
}
