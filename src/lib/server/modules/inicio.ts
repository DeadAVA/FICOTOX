import { requireUser } from "../auth";
import { avisosCalidad } from "./calidad/tablero";
import { alertaBitacoraAbierta } from "./audit";
import { type Row } from "../db";
import { json, type RouteContext } from "../http";
import { cargarAutorizacion, permisoDe, requirePermission, soloEstado } from "../rbac";
import type { Accion, ContextoAlcance, Modulo } from "../../shared/permisos";
import { contarPorSupervisar } from "../supervision";
import { porAutorizarDe } from "../solicitudes";
import { autorizacionesPorVencer, permisoAdministrar } from "../autorizaciones";
import { ACCIONES_CRITICAS } from "../../shared/acciones-criticas";
import { vencimientosProximos } from "./admin";

import { diasDesde, formatearFecha, hoyLocal, sumarDias } from "../../shared/fechas";
import { esCoordinacion, filtroAsignadas, soloAsignado } from "../asignaciones";

/*
 * Datos del Inicio.
 *
 * `inicioEnCurso`: cada recepción que todavía no termina su flujo, con la
 * etapa en la que va (recepción → procesamiento → extracción → análisis →
 * informe → cierre) y el siguiente paso concreto, con enlace, para que la
 * persona sepa qué toca hacer sin abrir cada lista.
 *
 * `inicioAvisos`: los avisos del Inicio con los primeros elementos de cada
 * uno (qué reactivos están bajos, qué equipos requieren calibración...), con
 * las mismas reglas SQL que usan las listas, para que la cuenta del aviso
 * coincida con lo que se ve al abrirlo.
 */

const pad = (n: unknown) => String(Number(n || 0)).padStart(7, "0");

type StepKey = "recepcion" | "procesamiento" | "extraccion" | "analisis" | "informe";
type StepState = "done" | "current" | "pending" | "warn";

interface FlowStep {
  key: StepKey;
  label: string;
  state: StepState;
  folio: string | null;
  href: string | null;
  detail: string | null;
}

interface FlowItem {
  id: number;
  folio: string;
  cliente: string | null;
  muestras: string[];
  analisis_tipos: string[];
  fecha_recepcion: string | null;
  dias: number;
  estado: string;
  etapa: StepKey | "cierre";
  /* accion "ver": la persona no tiene el permiso de ese paso; solo se informa. */
  siguiente: { label: string; href: string; accion: "capturar" | "revisar" | "aprobar" | "cerrar" | "ver" };
  pasos: FlowStep[];
  /* Fase 6: recepcion liberada -> "Falta disposición final" (va al final de la lista). */
  nota?: string | null;
}

const safeJson = <T,>(raw: unknown, fallback: T): T => {
  try {
    const value = JSON.parse(String(raw ?? ""));
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const fmtDate = (value: unknown): string | null => (value ? formatearFecha(value) : null);

/* Dias transcurridos por dia local del laboratorio. */
const daysSince = (iso: string | null): number => diasDesde(iso);

export async function inicioEnCurso({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const permiso = await requirePermission(s, user, "muestras", "V");

  /*
   * Fase 5: cada analista (captura ensayos sin ser coordinacion) o quien tiene el
   * alcance "asignado" ve solo sus muestras: asignadas o registradas por la persona.
   */
  const soloMias = soloAsignado(permiso) || (!esCoordinacion(permiso.auth) && !!permisoDe(permiso.auth, "ensayos", "C"));
  const mias = await filtroAsignadas(s, permiso.auth.userId, "id", soloMias, "creado_por");
  const ABIERTAS = `estado NOT IN ('cerrada', 'anulada', 'rechazada') ${mias.sql}`;
  const total = Number((await s.scalar(`SELECT COUNT(*) FROM muestras_recepcion WHERE ${ABIERTAS}`, mias.params)) || 0);
  const recepciones = await s.query(
    `SELECT id, folio_num, solicitante, id_interno, muestra_unica, lote_muestras_json, analisis_json, estado, decision_aceptacion, fecha_recepcion
     FROM muestras_recepcion
     WHERE ${ABIERTAS}
     ORDER BY fecha_recepcion DESC, id DESC
     LIMIT 40`,
    mias.params,
  );
  if (!recepciones.length) return json({ items: [], resumen: {}, total: 0 });

  const ids = recepciones.map((r) => Number(r.id));
  const inList = ids.join(",");
  const [procesamientos, analisis, informes] = await Promise.all([
    s.query(`SELECT id, folio_num, recepcion_id, estado, fecha_procesamiento FROM muestras_procesamiento WHERE recepcion_id IN (${inList}) AND estado <> 'anulada' ORDER BY id DESC`),
    s.query(`SELECT id, folio_num, recepcion_id, extraccion_id, tipo_analisis, estado FROM muestras_analisis WHERE recepcion_id IN (${inList}) AND estado <> 'anulado' ORDER BY id DESC`),
    s.query(`SELECT id, folio_num, version, recepcion_id, estado FROM informes WHERE recepcion_id IN (${inList}) AND estado NOT IN ('anulado', 'sustituido') ORDER BY version DESC, id DESC`),
  ]);
  const procIds = procesamientos.map((p) => Number(p.id));
  const extracciones = procIds.length
    ? await s.query(`SELECT id, folio_num, tipo_registro, procesamiento_id, estado FROM muestras_extraccion WHERE procesamiento_id IN (${procIds.join(",")}) AND estado <> 'anulada' ORDER BY id DESC`)
    : [];

  const items: FlowItem[] = recepciones.map((r) => {
    const id = Number(r.id);
    const folio = `R ${pad(r.folio_num)}`;
    const lote = safeJson<Array<Record<string, unknown>>>(r.lote_muestras_json, []);
    const muestras = r.muestra_unica || !lote.length ? [String(r.id_interno || "")].filter(Boolean) : lote.filter((m) => m.trabajar !== false).map((m) => String(m.id_interno || "")).filter(Boolean);
    const tipos = safeJson<{ tipos?: string[] }>(r.analisis_json, {}).tipos || [];
    const proc = procesamientos.find((p) => Number(p.recepcion_id) === id) || null;
    /*
     * Una recepción puede pedir ASP y DSP: entonces hacen falta una extracción
     * por tipo y un análisis por extracción. Se muestra el pendiente menos
     * avanzado, para que el "siguiente paso" nunca salte una firma.
     */
    const requeridos = [tipos.includes("acido_domoico") ? "E-A" : null, tipos.includes("toxinas_lipofilicas") ? "E-D" : null].filter((t): t is string => !!t);
    const exts = proc ? extracciones.filter((e) => Number(e.procesamiento_id) === Number(proc.id)) : [];
    const faltaTipo = proc ? requeridos.find((t) => !exts.some((e) => String(e.tipo_registro || "E-A") === t)) || null : null;
    const ext = exts[0] || null;
    const ans = analisis.filter((a) => Number(a.recepcion_id) === id);
    const extSinAnalisis = exts.find((e) => !ans.some((a) => Number(a.extraccion_id) === Number(e.id))) || null;
    const RANK: Record<string, number> = { registrado: 0, en_revision: 1, revisado: 2, aprobado: 3 };
    const an = ans.length ? ans.reduce((menor, a) => ((RANK[String(a.estado)] ?? 0) < (RANK[String(menor.estado)] ?? 0) ? a : menor)) : null;
    const inf = informes.find((i) => Number(i.recepcion_id) === id) || null;
    const decision = String(r.decision_aceptacion || "");
    const aceptada = decision === "aceptada" || decision === "aceptada_con_desviacion";
    const anEstado = String(an?.estado || "");
    const infEstado = String(inf?.estado || "");
    const tipoExtraccion = faltaTipo || (requeridos.length === 1 ? requeridos[0] : null);

    /* Etapa actual y siguiente paso. */
    let etapa: FlowItem["etapa"];
    let siguiente: FlowItem["siguiente"];
    let requiere: [Modulo, Accion, ContextoAlcance?];
    if (!aceptada) {
      etapa = "recepcion";
      siguiente = { label: "Registrar decisión de aceptación", href: `/muestras/recepcion/${id}`, accion: "capturar" };
      requiere = ["muestras", "E", { objeto: "recepcion", borrador: true }];
    } else if (!proc) {
      etapa = "procesamiento";
      siguiente = { label: "Registrar procesamiento", href: `/muestras/procesamiento/nuevo?recepcion=${id}`, accion: "capturar" };
      requiere = ["ensayos", "C", { objeto: "procesamiento", borrador: true }];
    } else if (!ext || faltaTipo) {
      etapa = "extraccion";
      const label = ext && faltaTipo ? `Registrar extracción ${faltaTipo === "E-D" ? "DSP" : "ASP"}` : "Registrar extracción";
      siguiente = { label, href: `/muestras/extraccion/nueva?procesamiento=${proc.id}${tipoExtraccion ? `&tipo=${tipoExtraccion}` : ""}`, accion: "capturar" };
      requiere = ["ensayos", "C", { objeto: "extraccion", borrador: true }];
    } else if (!an || extSinAnalisis) {
      etapa = "analisis";
      const objetivo = extSinAnalisis || ext;
      const label = an && extSinAnalisis ? `Registrar análisis ${String(extSinAnalisis.tipo_registro) === "E-D" ? "DSP" : "ASP"}` : "Registrar análisis";
      siguiente = { label, href: `/muestras/analisis/nuevo?extraccion=${objetivo.id}`, accion: "capturar" };
      requiere = ["ensayos", "C", { objeto: "analisis", borrador: true }];
    } else if (anEstado === "registrado") {
      etapa = "analisis";
      siguiente = { label: "Enviar análisis a revisión", href: `/muestras/analisis/${an.id}`, accion: "capturar" };
      requiere = ["ensayos", "C", { objeto: "analisis", borrador: true }];
    } else if (anEstado === "en_revision") {
      etapa = "analisis";
      siguiente = { label: "Revisar análisis", href: `/muestras/analisis/${an.id}`, accion: "revisar" };
      requiere = ["ensayos", "R"];
    } else if (anEstado === "revisado") {
      etapa = "analisis";
      siguiente = { label: "Aprobar análisis", href: `/muestras/analisis/${an.id}`, accion: "aprobar" };
      requiere = ["ensayos", "A"];
    } else if (!inf) {
      etapa = "informe";
      siguiente = { label: "Crear informe", href: `/informes/nuevo?recepcion=${id}`, accion: "capturar" };
      requiere = ["informes", "C", { objeto: "informe", borrador: true }];
    } else if (infEstado === "borrador") {
      etapa = "informe";
      siguiente = { label: "Revisar informe", href: `/informes/${inf.id}`, accion: "revisar" };
      requiere = ["informes", "R"];
    } else if (infEstado === "en_revision") {
      etapa = "informe";
      siguiente = { label: "Autorizar informe", href: `/informes/${inf.id}`, accion: "aprobar" };
      requiere = ["informes", "A"];
    } else if (infEstado === "autorizado") {
      etapa = "informe";
      siguiente = { label: "Liberar informe", href: `/informes/${inf.id}`, accion: "aprobar" };
      requiere = ["informes", "A"];
    } else if (infEstado === "liberado") {
      etapa = "informe";
      siguiente = { label: "Enviar informe por correo", href: `/informes/${inf.id}`, accion: "cerrar" };
      requiere = ["informes", "A"];
    } else {
      etapa = "cierre";
      siguiente = { label: "Registrar disposición final", href: `/muestras/recepcion/${id}`, accion: "cerrar" };
      requiere = ["muestras", "A"];
    }
    // Si la persona no puede dar ese paso, se muestra como pendiente (sin boton de accion) y enlaza a la recepcion.
    if (!permisoDe(permiso.auth, requiere[0], requiere[1], requiere[2])) {
      siguiente = { label: `Pendiente: ${siguiente.label.charAt(0).toLowerCase()}${siguiente.label.slice(1)}`, href: `/muestras/recepcion/${id}`, accion: "ver" };
    }

    const order: StepKey[] = ["recepcion", "procesamiento", "extraccion", "analisis", "informe"];
    const currentIndex = etapa === "cierre" ? order.length : order.indexOf(etapa);
    const stateFor = (index: number): StepState => (index < currentIndex ? "done" : index === currentIndex ? "current" : "pending");
    const pasos: FlowStep[] = [
      { key: "recepcion", label: "Recepción", state: stateFor(0), folio, href: `/muestras/recepcion/${id}`, detail: aceptada ? (decision === "aceptada_con_desviacion" ? "Aceptada con desviación" : "Aceptada") : "Sin decisión de aceptación" },
      { key: "procesamiento", label: "Procesamiento", state: stateFor(1), folio: proc ? `P ${pad(proc.folio_num)}` : null, href: proc ? `/muestras/procesamiento/${proc.id}` : null, detail: proc ? fmtDate(proc.fecha_procesamiento) : null },
      { key: "extraccion", label: "Extracción", state: stateFor(2), folio: exts.length ? exts.map((e) => `${e.tipo_registro || "E-A"} ${pad(e.folio_num)}`).join(" · ") : null, href: ext ? `/muestras/extraccion/${ext.id}` : null, detail: faltaTipo ? `Falta la extracción ${faltaTipo === "E-D" ? "DSP" : "ASP"}` : exts.length ? exts.map((e) => (String(e.tipo_registro) === "E-D" ? "DSP" : "ASP")).join(" + ") : tipoExtraccion ? (tipoExtraccion === "E-D" ? "DSP" : "ASP") : null },
      { key: "analisis", label: "Análisis", state: stateFor(3), folio: ans.length ? ans.map((a) => `A ${pad(a.folio_num)}`).join(" · ") : null, href: an ? `/muestras/analisis/${an.id}` : null, detail: extSinAnalisis && an ? `Falta el análisis ${String(extSinAnalisis.tipo_registro) === "E-D" ? "DSP" : "ASP"}` : an ? (anEstado === "aprobado" ? (ans.length > 1 ? "Aprobados" : "Aprobado") : anEstado === "revisado" ? "Revisado, falta aprobar" : anEstado === "en_revision" ? "Enviado a revisión, falta revisar" : "Registrado, falta enviar a revisión") : null },
      { key: "informe", label: "Informe", state: stateFor(4), folio: inf ? `IR ${pad(inf.folio_num)}${Number(inf.version || 1) > 1 ? ` v${inf.version}` : ""}` : null, href: inf ? `/informes/${inf.id}` : null, detail: inf ? ({ borrador: "Borrador", en_revision: "En revisión", autorizado: "Autorizado, falta liberar", liberado: "Liberado, falta enviar", enviado: "Enviado" } as Record<string, string>)[infEstado] || infEstado : null },
    ];

    return {
      id,
      folio,
      cliente: (r.solicitante as string | null) || null,
      muestras,
      analisis_tipos: tipos,
      fecha_recepcion: (r.fecha_recepcion as string | null) || null,
      dias: daysSince((r.fecha_recepcion as string | null) || null),
      estado: String(r.estado || ""),
      etapa,
      siguiente,
      pasos,
      nota: String(r.estado) === "liberada" ? "Falta disposición final" : null,
    };
  });

  /* Lo más urgente primero: quien espera una firma, luego lo más antiguo. */
  const weight: Record<FlowItem["siguiente"]["accion"], number> = { aprobar: 0, revisar: 1, capturar: 2, cerrar: 3, ver: 4 };
  // Fase 6: las recepciones liberadas (solo falta la disposicion final) van al final.
  items.sort((a, b) => Number(!!a.nota) - Number(!!b.nota) || weight[a.siguiente.accion] - weight[b.siguiente.accion] || b.dias - a.dias);

  const resumen: Record<string, number> = {};
  for (const item of items) resumen[item.etapa] = (resumen[item.etapa] || 0) + 1;
  // Alcance "estado": folio, solicitante, fechas y estado; sin muestras, analisis ni enlaces a ensayos.
  if (soloEstado(permiso)) {
    const recortados = items.map((item) => ({ ...item, muestras: [], analisis_tipos: [], pasos: item.pasos.map((paso) => ({ ...paso, href: paso.key === "recepcion" ? paso.href : null, detail: null }))}));
    return json({ items: recortados, resumen, total, solo_estado: true });
  }
  return json({ items, resumen, total });
}

/* ---------- Avisos con detalle ---------- */

interface AvisoItem {
  label: string;
  sub: string | null;
  href: string;
}

interface Aviso {
  key: string;
  label: string;
  tone: "danger" | "warning" | "info";
  count: number;
  href: string;
  items: AvisoItem[];
}

/* Modulo cuyo permiso de ver habilita cada aviso (el Inicio lo ve toda persona activa). */
const MODULO_AVISO: Record<string, Modulo> = {
  mant_vencidos: "equipos",
  mant_proximos: "equipos",
  equipos_cal: "equipos",
  reactivos_bajos: "inventario",
  consumibles_bajos: "inventario",
  analisis_pendientes: "ensayos",
  informes_revision: "informes",
  informes_entrega: "informes",
  informes_enmienda: "informes",
};

export async function inicioAvisos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const auth = await cargarAutorizacion(s, user);

  // Dia local del laboratorio como parametro (date('now')/CURDATE() darian el dia UTC del servidor).
  const today = ":hoy";
  const in30 = ":en30";
  const fechas = { hoy: hoyLocal(), en30: sumarDias(hoyLocal(), 30) };
  const nombreReactivo = "COALESCE(NULLIF(producto, ''), NULLIF(nombre, ''), NULLIF(item_name, ''), 'Reactivo')";

  /* Cada aviso: la cuenta completa (COUNT) y solo los primeros seis elementos para el detalle. */
  const MAX_ITEMS = 6;
  const fetch = async (from: string, select: string, order: string): Promise<{ count: number; rows: Row[] }> => {
    const [count, rows] = await Promise.all([s.scalar(`SELECT COUNT(*) ${from}`, fechas), s.query(`SELECT ${select} ${from} ORDER BY ${order} LIMIT ${MAX_ITEMS}`, fechas)]);
    return { count: Number(count || 0), rows };
  };
  const [mantVencidos, mantProximos, equiposCal, reactivosBajos, consumiblesBajos, analisisPendientes, informesRevision, informesEntrega, informesEnmienda] = await Promise.all([
    fetch(`FROM mantenimientos mt LEFT JOIN equipos e ON e.id = mt.id_equipo WHERE mt.estado = 'vencido' OR (mt.fecha_programada < ${today} AND mt.estado IN ('programado', 'en_proceso'))`, "mt.id, mt.tipo, mt.fecha_programada, e.nombre AS equipo, e.clave_bitacora", "mt.fecha_programada ASC"),
    fetch(`FROM mantenimientos mt LEFT JOIN equipos e ON e.id = mt.id_equipo WHERE mt.fecha_programada BETWEEN ${today} AND ${in30} AND mt.estado IN ('programado', 'en_proceso')`, "mt.id, mt.tipo, mt.fecha_programada, e.nombre AS equipo, e.clave_bitacora", "mt.fecha_programada ASC"),
    fetch(`FROM equipos WHERE COALESCE(activo, 1) = 1 AND (estado IN ('calibracion_pendiente', 'fuera_servicio') OR (fecha_prox_calibracion IS NOT NULL AND fecha_prox_calibracion < ${today}))`, "id, nombre, clave_bitacora, estado, fecha_prox_calibracion", "fecha_prox_calibracion ASC"),
    fetch(
      `FROM reactivos WHERE COALESCE(activo, 1) = 1 AND cantidad_actual IS NOT NULL AND (cantidad_actual <= 0 OR (COALESCE(stock_minimo, 0) > 0 AND cantidad_actual <= stock_minimo) OR (COALESCE(stock_minimo, 0) <= 0 AND COALESCE(stock_maximo, 0) > 0 AND cantidad_actual <= stock_maximo * 0.2))`,
      `id, ${nombreReactivo} AS nombre, cantidad_actual, unidad, stock_minimo, stock_maximo`,
      "cantidad_actual ASC",
    ),
    fetch("FROM consumibles WHERE COALESCE(activo, 1) = 1 AND COALESCE(piezas, 0) <= 5", "id, producto, piezas", "piezas ASC"),
    fetch("FROM muestras_analisis a LEFT JOIN muestras_recepcion r ON r.id = a.recepcion_id WHERE a.estado IN ('en_revision', 'revisado')", "a.id, a.folio_num, a.estado, a.tipo_analisis, r.solicitante", "a.id ASC"),
    fetch("FROM informes WHERE estado IN ('borrador', 'en_revision')", "id, folio_num, version, estado, cliente_json", "id ASC"),
    fetch("FROM informes WHERE estado IN ('autorizado', 'liberado') AND COALESCE(requiere_enmienda, 0) = 0", "id, folio_num, version, estado, cliente_json", "id ASC"),
    // Fase 6: informes con un analisis enmendado despues: no se liberan ni envian hasta su enmienda.
    fetch("FROM informes WHERE COALESCE(requiere_enmienda, 0) = 1 AND estado IN ('autorizado', 'liberado', 'enviado')", "id, folio_num, version, estado, cliente_json, requiere_enmienda_motivo", "id ASC"),
  ]);

  const cliente = (row: Row) => {
    const value = safeJson<{ nombre?: string }>(row.cliente_json, {});
    return value.nombre || null;
  };
  const TIPO_MANT: Record<string, string> = { preventivo: "Preventivo", correctivo: "Correctivo", calibracion: "Calibración", verificacion: "Verificación" };
  const build = (key: string, label: string, tone: Aviso["tone"], href: string, data: { count: number; rows: Row[] }, map: (row: Row) => AvisoItem): Aviso => ({ key, label, tone, count: data.count, href, items: data.rows.map(map) });

  const avisos: Aviso[] = [
    build("mant_vencidos", "Mantenimientos vencidos", "danger", "/inventario/mantenimiento?filtro=vencido", mantVencidos, (m) => ({ label: String(m.equipo || "Equipo"), sub: `${TIPO_MANT[String(m.tipo)] || m.tipo || "Mantenimiento"} · programado ${fmtDate(m.fecha_programada)}`, href: "/inventario/mantenimiento?filtro=vencido" })),
    build("equipos_cal", "Equipos con alerta de calibración", "warning", "/inventario/equipos?filtro=calibracion", equiposCal, (e) => ({ label: String(e.nombre || "Equipo"), sub: String(e.estado) === "fuera_servicio" ? "Fuera de servicio" : e.fecha_prox_calibracion ? `Calibración vencida el ${fmtDate(e.fecha_prox_calibracion)}` : "Calibración pendiente", href: `/inventario/equipos?buscar=${encodeURIComponent(String(e.nombre || ""))}` })),
    build("reactivos_bajos", "Reactivos con stock bajo", "warning", "/inventario/reactivos?filtro=bajo", reactivosBajos, (r) => ({ label: String(r.nombre), sub: Number(r.cantidad_actual) <= 0 ? "Agotado" : `Quedan ${Number(r.cantidad_actual)} ${r.unidad || ""}`.trim(), href: `/inventario/reactivos?buscar=${encodeURIComponent(String(r.nombre))}` })),
    build("consumibles_bajos", "Consumibles con 5 piezas o menos", "warning", "/inventario/consumibles?filtro=bajo", consumiblesBajos, (c) => ({ label: String(c.producto || "Consumible"), sub: Number(c.piezas) <= 0 ? "Agotado" : `${Number(c.piezas)} pieza${Number(c.piezas) === 1 ? "" : "s"}`, href: `/inventario/consumibles?buscar=${encodeURIComponent(String(c.producto || ""))}` })),
    build("analisis_pendientes", "Análisis esperando revisión o aprobación", "info", "/muestras/analisis?filtro=pendiente", analisisPendientes, (a) => ({ label: `A ${pad(a.folio_num)}`, sub: `${String(a.estado) === "revisado" ? "Falta aprobar" : "Enviado, falta revisar"}${a.solicitante ? ` · ${a.solicitante}` : ""}`, href: `/muestras/analisis/${a.id}` })),
    build("informes_revision", "Informes por revisar o autorizar", "info", "/informes?filtro=pendiente", informesRevision, (i) => ({ label: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}`, sub: `${String(i.estado) === "en_revision" ? "Falta autorizar" : "Borrador, falta revisar"}${cliente(i) ? ` · ${cliente(i)}` : ""}`, href: `/informes/${i.id}` })),
    build("informes_entrega", "Informes por liberar o enviar", "info", "/informes?filtro=autorizado", informesEntrega, (i) => ({ label: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}`, sub: `${String(i.estado) === "liberado" ? "Falta enviar" : "Falta liberar"}${cliente(i) ? ` · ${cliente(i)}` : ""}`, href: `/informes/${i.id}` })),
    build("informes_enmienda", "Informes que requieren enmienda", "danger", "/informes?filtro=requiere_enmienda", informesEnmienda, (i) => ({ label: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}`, sub: String(i.requiere_enmienda_motivo || "Un análisis incluido se enmendó"), href: `/informes/${i.id}` })),
    build("mant_proximos", "Mantenimientos en los próximos 30 días", "info", "/inventario/mantenimiento?filtro=proximo", mantProximos, (m) => ({ label: String(m.equipo || "Equipo"), sub: `${TIPO_MANT[String(m.tipo)] || m.tipo || "Mantenimiento"} · ${fmtDate(m.fecha_programada)}`, href: "/inventario/mantenimiento?filtro=proximo" })),
  ].filter((a) => a.count > 0 && !!permisoDe(auth, MODULO_AVISO[a.key], "V"));

  // Biblioteca: los avisos del flujo de control documental (documentos por leer, revisar o aprobar) se retiraron.
  // Fase 3: solicitudes de autorizacion que puedo aprobar como segundo usuario.
  const porAutorizar = await porAutorizarDe(s, auth);
  if (porAutorizar.length) {
    avisos.unshift({
      key: "por_autorizar",
      label: "Por autorizar",
      tone: "warning",
      count: porAutorizar.length,
      href: "/solicitudes",
      items: porAutorizar.slice(0, MAX_ITEMS).map((sol) => ({ label: `${ACCIONES_CRITICAS[sol.tipo]?.etiqueta || sol.tipo} · ${sol.referencia || ""}`.trim(), sub: `Solicitud #${sol.id} · vence ${fmtDate(sol.vence_en)}`, href: "/solicitudes" })),
    });
  }
  // Fase 2: lo que me toca supervisar y los accesos que vencen pronto.
  const porSupervisar = await contarPorSupervisar(s, auth.userId);
  if (porSupervisar.length) {
    avisos.unshift({ key: "por_supervisar", label: "Por supervisar", tone: "warning", count: porSupervisar.length, href: "/supervision", items: porSupervisar.slice(0, MAX_ITEMS).map((r) => ({ label: `${r.tipo} ${r.referencia}`, sub: "Pendiente de tu visto bueno", href: String(r.href) })) });
  }
  const administra = !!permisoDe(auth, "usuarios", "G");
  const vencen = administra ? await vencimientosProximos(s, 7) : await vencimientosProximos(s, 7, auth.userId);
  if (vencen.length) {
    avisos.push({
      key: "accesos_vencen",
      label: administra ? "Accesos que vencen en 7 días" : "Accesos de tus supervisados que vencen en 7 días",
      tone: "warning",
      count: vencen.length,
      // Revision de accesos se integro en Usuarios: el aviso abre la lista con el filtro de vencimientos.
      href: administra ? "/administracion/usuarios?vigencia=vence7" : "/supervision",
      items: vencen.slice(0, MAX_ITEMS).map((v) => ({ label: String(v.nombre || v.email), sub: `${v.rol ? `Rol ${v.rol}` : "Cuenta"} vence el ${fmtDate(v.vigente_hasta)}`, href: administra ? "/administracion/usuarios?vigencia=vence7" : "/supervision" })),
    });
  }

  // Fase 4: autorizaciones FX-THF-AP que vencen en 30 dias (las propias y, para quien las administra, las de todo el personal).
  const porVencer = await autorizacionesPorVencer(s, auth, 30);
  if (porVencer.length) {
    const administraAut = !!permisoAdministrar(auth);
    avisos.push({
      key: "autorizaciones_vencen",
      label: "Autorizaciones por vencer (30 días)",
      tone: "warning",
      count: porVencer.length,
      // Fase 5: a quien no las administra lo lleva a Mi cuenta › Mis autorizaciones.
      href: administraAut ? "/administracion/usuarios" : "/#mis-autorizaciones",
      items: porVencer.slice(0, MAX_ITEMS).map((a) => ({ label: a.propia ? `Tu autorización: ${a.etiqueta}` : `${a.persona} · ${a.etiqueta}`, sub: `Vence el ${fmtDate(a.vigente_hasta)}`, href: administraAut ? "/administracion/usuarios" : "/#mis-autorizaciones" })),
    });
  }

  // Fase 11: calidad (incidencias por evaluar, mis acciones, verificaciones, retenciones y suspensiones).
  const calidad = await avisosCalidad(s, auth);
  const grupos: Array<[string, string, Aviso["tone"], string, string[]]> = [
    ["calidad_incidencias", "Incidencias por evaluar", "warning", "/calidad/incidencias?filtro=por_evaluar", ["incidencia_por_evaluar"]],
    ["calidad_acciones", "Mis acciones correctivas", "info", "/calidad/incidencias?tab=acciones&mias=1", ["accion_mia", "accion_vencida"]],
    ["calidad_verificaciones", "Verificaciones de eficacia pendientes", "warning", "/calidad/incidencias?tab=nc&estado=en_verificacion", ["verificacion_pendiente"]],
    ["calidad_retenidos", "Informes retenidos por NC", "danger", "/calidad/incidencias?tab=nc", ["informe_retenido"]],
    ["calidad_suspensiones", "Métodos y equipos suspendidos", "danger", "/calidad/incidencias?tab=nc", ["suspension"]],
    ["calidad_reasignar", "Acciones por reasignar", "warning", "/calidad/incidencias?tab=acciones", ["responsable_no_vigente"]],
  ];
  for (const [key, label, tone, href, tipos] of grupos) {
    const items = calidad.filter((a) => tipos.includes(a.tipo));
    if (items.length) avisos.push({ key, label, tone: items.some((a) => a.tono === "danger") ? "danger" : tone, count: items.length, href, items: items.slice(0, MAX_ITEMS).map((a) => ({ label: a.titulo, sub: a.detalle, href: a.href })) });
  }

  // Registro de actividad: posible cambio no autorizado (incidencia automatica abierta), a quien consulta Calidad.
  if (permisoDe(auth, "calidad", "V") && (await alertaBitacoraAbierta(s))) {
    avisos.unshift({ key: "bitacora_alterada", label: "Posible cambio no autorizado", tone: "danger", count: 1, href: "/auditoria", items: [{ label: "Se detectó un posible cambio no autorizado en el registro de actividad", sub: "Avisa a la Coordinación de Mejora Continua", href: "/auditoria" }] });
  }

  return json({ items: avisos, total: avisos.reduce((sum, a) => sum + a.count, 0) });
}
