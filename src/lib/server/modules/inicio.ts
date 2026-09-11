import { requireUser } from "../auth";
import { isSqlite, type Row } from "../db";
import { json, type RouteContext } from "../http";
import { requirePermission } from "../rbac";
import { ensureConsumiblesSchema } from "./consumables";
import { ensureInformesSchema } from "./informes";
import { ensureEquiposSchema, ensureMantenimientosSchema, ensureReactivosSchema } from "./inventory";
import { ensureAnalysisSchema } from "./samples/analisis";
import { ensureSamplesExtraccionSchema } from "./samples/extraccion";
import { ensureSamplesProcesamientoSchema } from "./samples/procesamiento";
import { ensureSamplesRecepcionSchema } from "./samples/recepcion";

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
  siguiente: { label: string; href: string; accion: "capturar" | "revisar" | "aprobar" | "cerrar" };
  pasos: FlowStep[];
}

const safeJson = <T,>(raw: unknown, fallback: T): T => {
  try {
    const value = JSON.parse(String(raw ?? ""));
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const fmtDate = (value: unknown): string | null => {
  const raw = String(value || "").slice(0, 10);
  if (!raw) return null;
  const [y, m, d] = raw.split("-");
  return y && m && d ? `${d}/${m}/${y}` : raw;
};

const daysSince = (iso: string | null): number => {
  if (!iso) return 0;
  const then = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
};

export async function inicioEnCurso({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "muestras", "read");
  await ensureSamplesRecepcionSchema(s);
  await ensureSamplesProcesamientoSchema(s);
  await ensureSamplesExtraccionSchema(s);
  await ensureAnalysisSchema(s);
  await ensureInformesSchema(s);

  const ABIERTAS = "estado NOT IN ('cerrada', 'anulada', 'rechazada')";
  const total = Number((await s.scalar(`SELECT COUNT(*) FROM muestras_recepcion WHERE ${ABIERTAS}`)) || 0);
  const recepciones = await s.query(
    `SELECT id, folio_num, solicitante, id_interno, muestra_unica, lote_muestras_json, analisis_json, estado, decision_aceptacion, fecha_recepcion
     FROM muestras_recepcion
     WHERE ${ABIERTAS}
     ORDER BY fecha_recepcion DESC, id DESC
     LIMIT 40`,
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
    const RANK: Record<string, number> = { registrado: 0, revisado: 1, aprobado: 2 };
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
    if (!aceptada) {
      etapa = "recepcion";
      siguiente = { label: "Registrar decisión de aceptación", href: `/muestras/recepcion/${id}`, accion: "capturar" };
    } else if (!proc) {
      etapa = "procesamiento";
      siguiente = { label: "Registrar procesamiento", href: `/muestras/procesamiento/nuevo?recepcion=${id}`, accion: "capturar" };
    } else if (!ext || faltaTipo) {
      etapa = "extraccion";
      const label = ext && faltaTipo ? `Registrar extracción ${faltaTipo === "E-D" ? "DSP" : "ASP"}` : "Registrar extracción";
      siguiente = { label, href: `/muestras/extraccion/nueva?procesamiento=${proc.id}${tipoExtraccion ? `&tipo=${tipoExtraccion}` : ""}`, accion: "capturar" };
    } else if (!an || extSinAnalisis) {
      etapa = "analisis";
      const objetivo = extSinAnalisis || ext;
      const label = an && extSinAnalisis ? `Registrar análisis ${String(extSinAnalisis.tipo_registro) === "E-D" ? "DSP" : "ASP"}` : "Registrar análisis";
      siguiente = { label, href: `/muestras/analisis/nuevo?extraccion=${objetivo.id}`, accion: "capturar" };
    } else if (anEstado === "registrado") {
      etapa = "analisis";
      siguiente = { label: "Revisar análisis", href: `/muestras/analisis/${an.id}`, accion: "revisar" };
    } else if (anEstado === "revisado") {
      etapa = "analisis";
      siguiente = { label: "Aprobar análisis", href: `/muestras/analisis/${an.id}`, accion: "aprobar" };
    } else if (!inf) {
      etapa = "informe";
      siguiente = { label: "Crear informe", href: `/informes/nuevo?recepcion=${id}`, accion: "capturar" };
    } else if (infEstado === "borrador") {
      etapa = "informe";
      siguiente = { label: "Revisar informe", href: `/informes/${inf.id}`, accion: "revisar" };
    } else if (infEstado === "en_revision") {
      etapa = "informe";
      siguiente = { label: "Autorizar informe", href: `/informes/${inf.id}`, accion: "aprobar" };
    } else if (infEstado === "autorizado") {
      etapa = "informe";
      siguiente = { label: "Registrar entrega", href: `/informes/${inf.id}`, accion: "cerrar" };
    } else {
      etapa = "cierre";
      siguiente = { label: "Registrar disposición final", href: `/muestras/recepcion/${id}`, accion: "cerrar" };
    }

    const order: StepKey[] = ["recepcion", "procesamiento", "extraccion", "analisis", "informe"];
    const currentIndex = etapa === "cierre" ? order.length : order.indexOf(etapa);
    const stateFor = (index: number): StepState => (index < currentIndex ? "done" : index === currentIndex ? "current" : "pending");
    const pasos: FlowStep[] = [
      { key: "recepcion", label: "Recepción", state: stateFor(0), folio, href: `/muestras/recepcion/${id}`, detail: aceptada ? (decision === "aceptada_con_desviacion" ? "Aceptada con desviación" : "Aceptada") : "Sin decisión de aceptación" },
      { key: "procesamiento", label: "Procesamiento", state: stateFor(1), folio: proc ? `P ${pad(proc.folio_num)}` : null, href: proc ? `/muestras/procesamiento/${proc.id}` : null, detail: proc ? fmtDate(proc.fecha_procesamiento) : null },
      { key: "extraccion", label: "Extracción", state: stateFor(2), folio: exts.length ? exts.map((e) => `${e.tipo_registro || "E-A"} ${pad(e.folio_num)}`).join(" · ") : null, href: ext ? `/muestras/extraccion/${ext.id}` : null, detail: faltaTipo ? `Falta la extracción ${faltaTipo === "E-D" ? "DSP" : "ASP"}` : exts.length ? exts.map((e) => (String(e.tipo_registro) === "E-D" ? "DSP" : "ASP")).join(" + ") : tipoExtraccion ? (tipoExtraccion === "E-D" ? "DSP" : "ASP") : null },
      { key: "analisis", label: "Análisis", state: stateFor(3), folio: ans.length ? ans.map((a) => `A ${pad(a.folio_num)}`).join(" · ") : null, href: an ? `/muestras/analisis/${an.id}` : null, detail: extSinAnalisis && an ? `Falta el análisis ${String(extSinAnalisis.tipo_registro) === "E-D" ? "DSP" : "ASP"}` : an ? (anEstado === "aprobado" ? (ans.length > 1 ? "Aprobados" : "Aprobado") : anEstado === "revisado" ? "Revisado, falta aprobar" : "Registrado, falta revisar") : null },
      { key: "informe", label: "Informe", state: stateFor(4), folio: inf ? `IR ${pad(inf.folio_num)}${Number(inf.version || 1) > 1 ? ` v${inf.version}` : ""}` : null, href: inf ? `/informes/${inf.id}` : null, detail: inf ? ({ borrador: "Borrador", en_revision: "En revisión", autorizado: "Autorizado, falta entregar", entregado: "Entregado" } as Record<string, string>)[infEstado] || infEstado : null },
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
    };
  });

  /* Lo más urgente primero: quien espera una firma, luego lo más antiguo. */
  const weight: Record<FlowItem["siguiente"]["accion"], number> = { aprobar: 0, revisar: 1, capturar: 2, cerrar: 3 };
  items.sort((a, b) => weight[a.siguiente.accion] - weight[b.siguiente.accion] || b.dias - a.dias);

  const resumen: Record<string, number> = {};
  for (const item of items) resumen[item.etapa] = (resumen[item.etapa] || 0) + 1;
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

export async function inicioAvisos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "dashboard", "read");
  await ensureReactivosSchema(s);
  await ensureConsumiblesSchema(s);
  await ensureEquiposSchema(s);
  await ensureMantenimientosSchema(s);
  await ensureAnalysisSchema(s);
  await ensureInformesSchema(s);

  const today = isSqlite() ? "date('now')" : "CURDATE()";
  const in30 = isSqlite() ? "date('now', '+30 days')" : "DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
  const nombreReactivo = "COALESCE(NULLIF(producto, ''), NULLIF(nombre, ''), NULLIF(item_name, ''), 'Reactivo')";

  /* Cada aviso: la cuenta completa (COUNT) y solo los primeros seis elementos para el detalle. */
  const MAX_ITEMS = 6;
  const fetch = async (from: string, select: string, order: string): Promise<{ count: number; rows: Row[] }> => {
    const [count, rows] = await Promise.all([s.scalar(`SELECT COUNT(*) ${from}`), s.query(`SELECT ${select} ${from} ORDER BY ${order} LIMIT ${MAX_ITEMS}`)]);
    return { count: Number(count || 0), rows };
  };
  const [mantVencidos, mantProximos, equiposCal, reactivosBajos, consumiblesBajos, analisisPendientes, informesRevision, informesEntrega] = await Promise.all([
    fetch(`FROM mantenimientos mt LEFT JOIN equipos e ON e.id = mt.id_equipo WHERE mt.estado = 'vencido' OR (mt.fecha_programada < ${today} AND mt.estado IN ('programado', 'en_proceso'))`, "mt.id, mt.tipo, mt.fecha_programada, e.nombre AS equipo, e.clave_bitacora", "mt.fecha_programada ASC"),
    fetch(`FROM mantenimientos mt LEFT JOIN equipos e ON e.id = mt.id_equipo WHERE mt.fecha_programada BETWEEN ${today} AND ${in30} AND mt.estado IN ('programado', 'en_proceso')`, "mt.id, mt.tipo, mt.fecha_programada, e.nombre AS equipo, e.clave_bitacora", "mt.fecha_programada ASC"),
    fetch(`FROM equipos WHERE COALESCE(activo, 1) = 1 AND (estado IN ('calibracion_pendiente', 'fuera_servicio') OR (fecha_prox_calibracion IS NOT NULL AND fecha_prox_calibracion < ${today}))`, "id, nombre, clave_bitacora, estado, fecha_prox_calibracion", "fecha_prox_calibracion ASC"),
    fetch(
      `FROM reactivos WHERE COALESCE(activo, 1) = 1 AND cantidad_actual IS NOT NULL AND (cantidad_actual <= 0 OR (COALESCE(stock_minimo, 0) > 0 AND cantidad_actual <= stock_minimo) OR (COALESCE(stock_minimo, 0) <= 0 AND COALESCE(stock_maximo, 0) > 0 AND cantidad_actual <= stock_maximo * 0.2))`,
      `id, ${nombreReactivo} AS nombre, cantidad_actual, unidad, stock_minimo, stock_maximo`,
      "cantidad_actual ASC",
    ),
    fetch("FROM consumibles WHERE COALESCE(activo, 1) = 1 AND COALESCE(piezas, 0) <= 5", "id, producto, piezas", "piezas ASC"),
    fetch("FROM muestras_analisis a LEFT JOIN muestras_recepcion r ON r.id = a.recepcion_id WHERE a.estado IN ('registrado', 'revisado')", "a.id, a.folio_num, a.estado, a.tipo_analisis, r.solicitante", "a.id ASC"),
    fetch("FROM informes WHERE estado IN ('borrador', 'en_revision')", "id, folio_num, version, estado, cliente_json", "id ASC"),
    fetch("FROM informes WHERE estado = 'autorizado'", "id, folio_num, version, estado, cliente_json", "id ASC"),
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
    build("analisis_pendientes", "Análisis esperando revisión o aprobación", "info", "/muestras/analisis?filtro=pendiente", analisisPendientes, (a) => ({ label: `A ${pad(a.folio_num)}`, sub: `${String(a.estado) === "revisado" ? "Falta aprobar" : "Falta revisar"}${a.solicitante ? ` · ${a.solicitante}` : ""}`, href: `/muestras/analisis/${a.id}` })),
    build("informes_revision", "Informes por revisar o autorizar", "info", "/informes?filtro=pendiente", informesRevision, (i) => ({ label: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}`, sub: `${String(i.estado) === "en_revision" ? "Falta autorizar" : "Borrador, falta revisar"}${cliente(i) ? ` · ${cliente(i)}` : ""}`, href: `/informes/${i.id}` })),
    build("informes_entrega", "Informes autorizados sin entregar", "info", "/informes?filtro=autorizado", informesEntrega, (i) => ({ label: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}`, sub: cliente(i) || "Falta registrar la entrega", href: `/informes/${i.id}` })),
    build("mant_proximos", "Mantenimientos en los próximos 30 días", "info", "/inventario/mantenimiento?filtro=proximo", mantProximos, (m) => ({ label: String(m.equipo || "Equipo"), sub: `${TIPO_MANT[String(m.tipo)] || m.tipo || "Mantenimiento"} · ${fmtDate(m.fecha_programada)}`, href: "/inventario/mantenimiento?filtro=proximo" })),
  ].filter((a) => a.count > 0);

  return json({ items: avisos, total: avisos.reduce((sum, a) => sum + a.count, 0) });
}
