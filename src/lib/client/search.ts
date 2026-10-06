"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, type SessionValue } from "@/components/session/SessionProvider";
import { ESTADOS_INCIDENCIA, ESTADOS_NC, folioNc } from "../shared/calidad";
import { FEATURES } from "../shared/features";
import { API_BASE_URL, getJsonAuth } from "./api";
import { resetSearchIndex, searchIndexState as idx } from "./search-index";
import { subscribeInvalidate } from "./store";
import { fmtDate } from "./format";
import { formatReactivoName } from "./reactivos";
import { formatExtractionFolio, formatProcessingFolio, formatSampleFolio, sampleStatusLabel } from "./samples";
import type { ApiRecord } from "./types";

/*
 * Motor de búsqueda global. Lo comparten el buscador del Inicio y la paleta
 * ⌘K: un solo índice en memoria (muestras, análisis, informes, inventario,
 * documentos) y una lista de destinos y acciones filtradas por permisos.
 *
 * El índice se carga la primera vez que hace falta, caduca un minuto después
 * de construirse y se descarta al instante cuando algo cambia (`invalidate`)
 * o al cerrar sesión, para no servir datos viejos ni de otra persona.
 *
 * Los endpoints de lista tienen tope (p. ej. 400 recepciones, 500 reactivos):
 * los registros más antiguos que ese tope no aparecen en la búsqueda global,
 * pero sí en la búsqueda de cada lista, que consulta al servidor.
 */

export type SearchKind = "reciente" | "muestra" | "analisis" | "informe" | "reactivo" | "consumible" | "equipo" | "mantenimiento" | "documento" | "incidencia" | "nc" | "persona" | "accion" | "vista" | "destino" | "ayuda";

/* Ámbito opcional para acotar los resultados (chips del buscador). */
export type SearchScope = "todo" | "muestras" | "inventario" | "informes" | "acciones";

export const SEARCH_SCOPES: Array<{ value: SearchScope; label: string }> = [
  { value: "todo", label: "Todo" },
  { value: "muestras", label: "Muestras" },
  { value: "informes", label: "Informes" },
  { value: "inventario", label: "Inventario" },
  { value: "acciones", label: "Acciones" },
];

const SCOPE_KINDS: Record<SearchScope, SearchKind[] | null> = {
  todo: null,
  muestras: ["muestra", "analisis"],
  informes: ["informe"],
  inventario: ["reactivo", "consumible", "equipo", "mantenimiento"],
  acciones: ["accion", "vista", "destino", "ayuda"],
};

export interface SearchHit {
  id: string;
  kind: SearchKind;
  label: string;
  sub?: string;
  href: string;
  /* Chip corto (folio, clave) para mostrar en monoespaciado. */
  mono?: boolean;
  /* Etiqueta corta del tipo ("Recepción", "Reactivo") para leer el resultado de un vistazo. */
  tag?: string;
  /* En "Recientes": el tipo original del resultado. */
  sourceKind?: SearchKind;
  keywords: string;
}

export interface SearchGroup {
  kind: SearchKind;
  title: string;
  hits: SearchHit[];
}

const GROUP_TITLES: Record<SearchKind, string> = {
  reciente: "Recientes",
  muestra: "Muestras",
  analisis: "Análisis",
  informe: "Informes",
  reactivo: "Reactivos",
  consumible: "Consumibles",
  equipo: "Equipos",
  mantenimiento: "Mantenimientos",
  documento: "Biblioteca",
  incidencia: "Incidencias",
  nc: "No conformidades",
  persona: "Personas",
  accion: "Crear",
  vista: "Ver",
  destino: "Ir a",
  ayuda: "Ayuda",
};

const GROUP_ORDER: SearchKind[] = ["reciente", "accion", "muestra", "analisis", "informe", "reactivo", "consumible", "equipo", "mantenimiento", "documento", "incidencia", "nc", "persona", "vista", "destino", "ayuda"];

/* ---------- Secciones del Inicio ---------- */

export type SectionKey = "recientes" | "muestras" | "informes" | "inventario" | "calidad" | "biblioteca" | "personas" | "acciones" | "ir";

export interface SearchSection {
  key: SectionKey;
  title: string;
  hits: SearchHit[];
  /* Coincidencias totales (puede ser más de las que se muestran). */
  total: number;
  /* Lista filtrada con todo lo que coincide; solo si hay más de lo mostrado. */
  more?: string;
}

const SECTION_OF: Record<SearchKind, SectionKey> = {
  reciente: "recientes",
  muestra: "muestras",
  analisis: "muestras",
  informe: "informes",
  reactivo: "inventario",
  consumible: "inventario",
  equipo: "inventario",
  mantenimiento: "inventario",
  documento: "biblioteca",
  incidencia: "calidad",
  nc: "calidad",
  persona: "personas",
  accion: "acciones",
  vista: "ir",
  destino: "ir",
  ayuda: "ir",
};
const SECTION_TITLES: Record<SectionKey, string> = { recientes: "Recientes", muestras: "Muestras", informes: "Informes", inventario: "Inventario", calidad: "Calidad", biblioteca: "Biblioteca", personas: "Personas", acciones: "Acciones", ir: "Ir a" };
const SECTION_ORDER: SectionKey[] = ["recientes", "acciones", "muestras", "informes", "inventario", "calidad", "biblioteca", "personas", "ir"];
const SECTION_CAP = 4;

/* A dónde lleva "Ver todos": la lista de ese tipo, con lo escrito cuando la lista sabe buscarlo. */
function sectionMore(key: SectionKey, first: SearchHit, query: string): string | undefined {
  const q = encodeURIComponent(query.trim());
  switch (key) {
    case "muestras":
      return "/muestras";
    case "informes":
      return "/informes";
    case "inventario":
      return first.kind === "mantenimiento" ? "/inventario/mantenimiento" : `/inventario/${first.kind === "reactivo" ? "reactivos" : first.kind === "consumible" ? "consumibles" : "equipos"}?buscar=${q}`;
    case "calidad":
      return first.kind === "nc" ? "/calidad/incidencias?tab=nc" : "/calidad/incidencias";
    case "biblioteca":
      return "/calidad/biblioteca";
    case "personas":
      return "/administracion/usuarios";
    default:
      return undefined;
  }
}

/* ---------- Recientes (últimos resultados abiertos, por persona en este navegador) ---------- */

const RECENT_MAX = 5;
const RECENT_KINDS = new Set<SearchKind>(["muestra", "analisis", "informe", "reactivo", "consumible", "equipo", "mantenimiento", "documento", "incidencia", "nc", "persona", "accion", "vista", "ayuda"]);

/* Clave por persona: en una PC compartida cada cuenta ve solo lo suyo. */
const recentKey = (owner: string) => `ficotox.search.recent.${norm(owner).replace(/[^a-z0-9@.]/g, "_") || "anon"}`;

function readRecent(owner: string): SearchHit[] {
  if (typeof window === "undefined" || !owner) return [];
  try {
    const raw = window.localStorage.getItem(recentKey(owner));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.filter((h): h is SearchHit => {
      if (!h || typeof h !== "object") return false;
      const hit = h as SearchHit;
      if (typeof hit.id !== "string" || typeof hit.href !== "string" || typeof hit.label !== "string" || !RECENT_KINDS.has(hit.kind)) return false;
      if (seen.has(hit.href)) return false;
      seen.add(hit.href);
      return true;
    });
  } catch {
    return [];
  }
}

/* Guarda el resultado elegido para ofrecerlo la próxima vez sin escribir nada (elegirlo de Recientes lo sube al principio). */
export function rememberSearchHit(owner: string, hit: SearchHit): void {
  if (typeof window === "undefined" || !owner) return;
  const kind = hit.kind === "reciente" ? hit.sourceKind : hit.kind;
  if (!kind || !RECENT_KINDS.has(kind)) return;
  try {
    const entry: SearchHit = { id: hit.id, kind, label: hit.label, sub: hit.sub, href: hit.href, mono: hit.mono, tag: hit.tag, keywords: hit.keywords };
    const next = [entry, ...readRecent(owner).filter((h) => h.href !== hit.href)].slice(0, RECENT_MAX);
    window.localStorage.setItem(recentKey(owner), JSON.stringify(next));
  } catch {
    /* sin almacenamiento */
  }
}

export function clearRecentSearches(owner: string): void {
  try {
    window.localStorage.removeItem(recentKey(owner));
  } catch {
    /* sin almacenamiento */
  }
}

export const norm = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/* Sin espacios ni guiones: "R-0000001", "R 0000001" y "R0000001" son el mismo folio. */
const compactText = (value: string): string => value.replace(/[\s-]+/g, "");

/* "R 5", "e-d 1", "IR4", "A 0000002" → { exact: "r0000005" } (ya normalizado y compacto). */
const FOLIO_RE = /^(r|p|e-?a|e-?d|e|a|ir)\s*-?\s*(\d{1,7})$/;
function parseFolio(q: string): { exact: string } | null {
  const match = FOLIO_RE.exec(q);
  if (!match) return null;
  return { exact: `${match[1].replace("-", "")}${match[2].padStart(7, "0")}` };
}

const TTL_MS = 60_000;

const ANALYSIS_SHORT: Record<string, string> = { acido_domoico: "ASP", toxinas_lipofilicas: "DSP", toxinas_paralizantes: "PSP" };
const INFORME_ESTADO: Record<string, string> = { borrador: "Borrador", en_revision: "En revisión", autorizado: "Autorizado", liberado: "Liberado", enviado: "Enviado", entregado: "Enviado", sustituido: "Sustituido", anulado: "Anulado" };
const MANT_TIPO: Record<string, string> = { preventivo: "Preventivo", correctivo: "Correctivo", calibracion: "Calibración", verificacion: "Verificación" };
/* Temas del manual (/ayuda). Los anclas coinciden con las secciones de la página. */
export const HELP_TOPICS: Array<{ anchor: string; label: string; sub: string; kw: string }> = [
  { anchor: "empezar", label: "Cómo usar la plataforma", sub: "Guía rápida de FICOTOX", kw: "manual inicio empezar tutorial primeros pasos" },
  { anchor: "buscar", label: "Cómo buscar", sub: "Folios, reactivos, equipos y acciones desde el buscador", kw: "buscar buscador comando k atajos" },
  { anchor: "muestras", label: "Flujo de muestras", sub: "Recepción → procesamiento → extracción → análisis → informe", kw: "muestras flujo etapas recepcion procesamiento extraccion analisis" },
  { anchor: "extraccion", label: "Extracciones ASP y DSP", sub: "Folios, equipos, insumos y autollenado", kw: "extraccion asp dsp folio bitacora insumos" },
  { anchor: "analisis", label: "Análisis, revisión y aprobación", sub: "Resultados, controles de calidad y firmas", kw: "analisis revisar aprobar firma controles" },
  { anchor: "informes", label: "Informes de resultados", sub: "Crear, revisar, autorizar (PDF) y entregar", kw: "informes pdf autorizar entregar enmienda" },
  { anchor: "inventario", label: "Inventario y avisos", sub: "Stock, caducidad, equipos, mantenimiento y movimientos", kw: "inventario reactivos consumibles equipos mantenimiento movimientos avisos stock" },
  { anchor: "calidad", label: "Auditoría y trazabilidad", sub: "Qué se registra y cómo se consulta", kw: "auditoria bitacora historial trazabilidad calidad" },
  { anchor: "anular", label: "Corregir un registro", sub: "Anular con motivo, restaurar, enmendar", kw: "anular restaurar corregir error borrar eliminar enmienda" },
  { anchor: "atajos", label: "Atajos de teclado", sub: "⌘K, Esc, navegación con flechas", kw: "atajos teclado comando" },
];

const MANT_ESTADO: Record<string, string> = { programado: "Programado", en_proceso: "En proceso", completado: "Completado", vencido: "Vencido", cancelado: "Cancelado" };

if (typeof window !== "undefined") subscribeInvalidate(resetSearchIndex);

function informeFolio(item: ApiRecord): string {
  if (item.folio) return String(item.folio);
  return `IR ${String(Number(item.folio_num || 0)).padStart(7, "0")}${Number(item.version || 1) > 1 ? ` v${item.version}` : ""}`;
}

async function buildIndex(token: string, can: SessionValue["can"], alcance: SessionValue["alcance"]): Promise<SearchHit[]> {
  const safe = async (url: string, allowed: boolean): Promise<ApiRecord[]> => {
    if (!allowed) return [];
    try {
      const data = await getJsonAuth(url, token);
      return Array.isArray(data.items) ? (data.items as ApiRecord[]) : [];
    } catch {
      return [];
    }
  };
  const [reactivos, consumibles, equipos, recepciones, procesamientos, extracciones, analisis, informes, documentos, mantenimientos, incidencias, ncs, personas] = await Promise.all([
    safe(`${API_BASE_URL}/inventory/reactivos`, can("inventario")),
    safe(`${API_BASE_URL}/consumables`, can("inventario")),
    safe(`${API_BASE_URL}/inventory/equipos`, can("equipos")),
    safe(`${API_BASE_URL}/samples/reception`, can("muestras")),
    safe(`${API_BASE_URL}/samples/processing`, can("ensayos")),
    safe(`${API_BASE_URL}/samples/extraction`, can("ensayos")),
    safe(`${API_BASE_URL}/samples/analysis`, can("ensayos")),
    safe(`${API_BASE_URL}/informes`, can("informes")),
    safe(`${API_BASE_URL}/biblioteca`, FEATURES.documentos && can("documentos")),
    safe(`${API_BASE_URL}/inventory/mantenimientos`, can("equipos")),
    safe(`${API_BASE_URL}/calidad/incidencias`, can("calidad", "V", { objeto: "incidencia" })),
    safe(`${API_BASE_URL}/calidad/nc`, can("calidad", "V", { objeto: "nc" }) && alcance("calidad") !== "bitacora"),
    safe(`${API_BASE_URL}/admin/usuarios`, can("usuarios") && alcance("usuarios") !== "propio"),
  ]);

  const hits: SearchHit[] = [];
  const join = (...parts: unknown[]) => parts.filter(Boolean).map(String).join(" · ");

  for (const s of recepciones) {
    const folio = formatSampleFolio(s);
    // Fase 5: el estado de la recepcion (en extracción, validada, liberada...) tambien se busca.
    const estadoR = s.estado ? sampleStatusLabel(s.estado) : null;
    hits.push({ id: `r-${s.id}`, kind: "muestra", label: folio, sub: join(s.solicitante, s.id_interno, estadoR), href: `/muestras/recepcion/${s.id}`, mono: true, tag: "Recepción", keywords: norm(join(folio, folio.replace(/\s/g, ""), s.solicitante, s.id_interno, estadoR, "recepcion")) });
  }
  for (const s of procesamientos) {
    const folio = formatProcessingFolio(s);
    hits.push({ id: `p-${s.id}`, kind: "muestra", label: folio, sub: join(s.id_interno), href: `/muestras/procesamiento/${s.id}`, mono: true, tag: "Procesamiento", keywords: norm(join(folio, folio.replace(/\s/g, ""), s.id_interno, "procesamiento")) });
  }
  for (const s of extracciones) {
    const folio = formatExtractionFolio(s);
    hits.push({ id: `e-${s.id}`, kind: "muestra", label: folio, sub: join(s.id_interno), href: `/muestras/extraccion/${s.id}`, mono: true, tag: String(s.tipo_registro) === "E-D" ? "Extracción DSP" : "Extracción ASP", keywords: norm(join(folio, folio.replace(/\s/g, ""), s.id_interno, "extraccion", s.tipo_registro)) });
  }
  for (const a of analisis) {
    const folio = `A ${String(Number(a.folio_num || 0)).padStart(7, "0")}`;
    hits.push({ id: `a-${a.id}`, kind: "analisis", label: folio, sub: join(a.solicitante, a.recepcion_id_interno, ANALYSIS_SHORT[String(a.tipo_analisis)] || a.tipo_analisis), href: `/muestras/analisis/${a.id}`, mono: true, tag: "Análisis", keywords: norm(join(folio, folio.replace(/\s/g, ""), a.solicitante, a.recepcion_id_interno, a.tipo_analisis, "analisis")) });
  }
  for (const i of informes) {
    const folio = informeFolio(i);
    const cliente = (i.cliente && typeof i.cliente === "object" ? (i.cliente as ApiRecord).nombre : null) || i.solicitante;
    hits.push({ id: `i-${i.id}`, kind: "informe", label: folio, sub: join(cliente, i.recepcion_id_interno, INFORME_ESTADO[String(i.estado)] || null), href: `/informes/${i.id}`, mono: true, tag: "Informe", keywords: norm(join(folio, folio.replace(/\s/g, ""), cliente, i.recepcion_id_interno, "informe")) });
  }
  for (const r of reactivos) {
    const name = formatReactivoName(r);
    hits.push({ id: `re-${r.id}`, kind: "reactivo", label: name, sub: join(r.id_interno, r.lote ? `Lote ${r.lote}` : null, r.localizacion || r.ubicacion), href: `/inventario/reactivos?buscar=${encodeURIComponent(name)}`, tag: "Reactivo", keywords: norm(join(name, r.id_interno, r.lote, r.numero_cas, r.cas_number, r.catalogo, r.marca)) });
  }
  for (const c of consumibles) {
    const name = String(c.producto || "");
    hits.push({ id: `c-${c.id}`, kind: "consumible", label: name, sub: join(c.marca, c.catalogo_parte_cas), href: `/inventario/consumibles?buscar=${encodeURIComponent(name)}`, tag: "Consumible", keywords: norm(join(name, c.marca, c.catalogo_parte_cas)) });
  }
  for (const e of equipos) {
    const name = String(e.nombre || "");
    hits.push({ id: `eq-${e.id}`, kind: "equipo", label: name, sub: join(e.marca, e.modelo, e.clave_bitacora, e.ubicacion), href: `/inventario/equipos?buscar=${encodeURIComponent(name)}`, tag: "Equipo", keywords: norm(join(name, e.marca, e.modelo, e.numero_serie, e.clave_bitacora, e.ubicacion)) });
  }
  for (const d of documentos) {
    // Biblioteca de documentos: titulo, clave, categoria y etiquetas; abre el visor.
    const clave = String(d.clave || "");
    const etiquetas = Array.isArray(d.etiquetas) ? (d.etiquetas as unknown[]).map(String) : [];
    hits.push({ id: `d-${d.id}`, kind: "documento", label: String(d.titulo || clave || "Documento"), sub: join(clave, d.categoria, d.version ? `v${String(d.version)}` : null), href: `/calidad/biblioteca/${d.id}`, tag: "Biblioteca", keywords: norm(join(clave, d.titulo, d.categoria, d.descripcion, ...etiquetas)) });
  }
  for (const m of mantenimientos) {
    const equipo = String(m.equipo || "Equipo");
    const tipo = MANT_TIPO[String(m.tipo)] || String(m.tipo || "Mantenimiento");
    const estado = String(m.estado || "");
    const filtro = estado === "completado" ? "completado" : estado === "vencido" ? "vencido" : "pendiente";
    hits.push({ id: `m-${m.id}`, kind: "mantenimiento", label: `${tipo} · ${equipo}`, sub: join(MANT_ESTADO[estado] || estado, m.fecha_programada ? `programado ${fmtDate(m.fecha_programada)}` : null, m.tecnico_proveedor), href: `/inventario/mantenimiento?filtro=${filtro}`, tag: "Mantenimiento", keywords: norm(join(tipo, equipo, m.equipo_marca, m.equipo_modelo, estado, MANT_ESTADO[estado], m.tecnico_proveedor, "mantenimiento")) });
  }
  const corto = (value: unknown) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > 70 ? `${text.slice(0, 69)}…` : text;
  };
  for (const i of incidencias) {
    const folio = String(i.folio || "");
    const estado = ESTADOS_INCIDENCIA[String(i.estado)]?.label || String(i.estado || "");
    hits.push({ id: `inc-${i.id}`, kind: "incidencia", label: folio, sub: join(estado, corto(i.descripcion)), href: `/calidad/incidencias/${i.id}`, mono: true, tag: "Incidencia", keywords: norm(join(folio, folio.replace(/\s/g, ""), i.descripcion, i.reportada_nombre, estado, "incidencia")) });
  }
  for (const n of ncs) {
    const folio = folioNc(n.folio_num);
    const estado = ESTADOS_NC[String(n.estado)]?.label || String(n.estado || "");
    hits.push({ id: `nc-${n.id}`, kind: "nc", label: folio, sub: join(estado, corto(n.descripcion)), href: `/calidad/nc/${n.id}`, mono: true, tag: "NC", keywords: norm(join(folio, folio.replace(/\s/g, ""), n.descripcion, n.responsable_nombre, estado, "no conformidad")) });
  }
  for (const p of personas) {
    const nombre = String(p.nombre || p.email || "");
    hits.push({ id: `u-${p.id}`, kind: "persona", label: nombre, sub: join(p.email !== nombre ? p.email : null), href: `/administracion/usuarios?abrir=${p.id}`, tag: "Persona", keywords: norm(join(nombre, p.email)) });
  }
  return hits;
}

export function useGlobalSearch() {
  const { token, user, can, alcance } = useSession();
  const owner = String(user?.email || user?.nombre || "");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("todo");
  const [recent, setRecent] = useState<SearchHit[]>(() => readRecent(owner));
  const [index, setIndex] = useState<SearchHit[] | null>(() => (idx.cache && idx.cache.token === token && Date.now() - idx.cache.at < TTL_MS ? idx.cache.hits : null));
  const [loading, setLoading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* Carga (o reutiliza) el índice. Se llama al enfocar el buscador o abrir la paleta. */
  const warm = useCallback(async () => {
    if (!token) return;
    setRecent(readRecent(owner));
    if (idx.cache && idx.cache.token === token && Date.now() - idx.cache.at < TTL_MS) {
      setIndex(idx.cache.hits);
      return;
    }
    if (!idx.inflight || idx.inflight.token !== token) {
      setLoading(true);
      const promise = buildIndex(token, can, alcance).then((hits) => {
        // Solo se guarda si nadie reinició el índice ni cambió la sesión mientras se construía.
        if (idx.inflight && idx.inflight.promise === promise) {
          idx.cache = { hits, at: Date.now(), token };
          idx.inflight = null;
        }
        return hits;
      });
      idx.inflight = { token, promise };
    }
    const hits = await idx.inflight.promise;
    if (mounted.current) {
      setIndex(idx.cache && idx.cache.token === token ? idx.cache.hits : hits);
      setLoading(false);
    }
  }, [token, owner, can, alcance]);

  const destinations = useMemo<SearchHit[]>(
    () =>
      [
        { label: "Inicio", href: "/", allowed: true, kw: "inicio home dashboard" },
        { label: "Todas las muestras", href: "/muestras", allowed: can("muestras") || can("ensayos"), kw: "muestras flujo" },
        { label: "Recepción de muestras", href: "/muestras/recepcion", allowed: can("muestras"), kw: "muestras recepcion" },
        { label: "Procesamiento", href: "/muestras/procesamiento", allowed: can("ensayos"), kw: "muestras procesamiento" },
        { label: "Extracción", href: "/muestras/extraccion", allowed: can("ensayos"), kw: "muestras extraccion asp dsp" },
        { label: "Análisis", href: "/muestras/analisis", allowed: can("ensayos"), kw: "muestras analisis" },
        { label: "Informes de resultados", href: "/informes", allowed: can("informes"), kw: "informes resultados" },
        { label: "Reactivos", href: "/inventario/reactivos", allowed: can("inventario"), kw: "inventario reactivos" },
        { label: "Consumibles", href: "/inventario/consumibles", allowed: can("inventario"), kw: "inventario consumibles" },
        { label: "Equipos", href: "/inventario/equipos", allowed: can("equipos"), kw: "inventario equipos" },
        { label: "Mantenimiento", href: "/inventario/mantenimiento", allowed: can("equipos"), kw: "inventario mantenimiento" },
        { label: "Movimientos de inventario", href: "/movimientos", allowed: can("inventario"), kw: "movimientos entradas salidas" },
        { label: "Biblioteca", href: "/calidad/biblioteca", allowed: FEATURES.documentos && can("documentos"), kw: "biblioteca documentos manual procedimientos instructivos formatos normas calidad" },
        { label: "Bitácora de auditoría", href: "/auditoria", allowed: can("calidad"), kw: "auditoria bitacora" },
        { label: "Incidencias y no conformidades", href: "/calidad/incidencias", allowed: can("calidad", "V", { objeto: "incidencia" }) && alcance("calidad") !== "bitacora", kw: "calidad incidencias no conformidades nc acciones correctivas" },
        { label: "Usuarios", href: "/administracion/usuarios", allowed: can("usuarios"), kw: "administracion usuarios cuentas" },
        { label: "Roles y permisos", href: "/administracion/roles", allowed: can("usuarios") && alcance("usuarios") !== "propio", kw: "administracion roles permisos" },
      ]
        .filter((d) => d.allowed)
        .map((d) => ({ id: `go-${d.href}`, kind: "destino" as const, label: d.label, href: d.href, keywords: norm(`${d.label} ${d.kw} ir a abrir`) })),
    [can, alcance],
  );

  /* Vistas filtradas: lo que normalmente se busca "por estado" (lo mismo que abren los avisos del Inicio). */
  const views = useMemo<SearchHit[]>(
    () =>
      [
        { label: "Muestras en curso", sub: "Recepciones que no han terminado su flujo", href: "/muestras", allowed: can("muestras"), kw: "pendientes en proceso flujo" },
        { label: "Análisis por revisar o aprobar", sub: "Registrados o revisados, sin aprobar", href: "/muestras/analisis?filtro=pendiente", allowed: can("ensayos"), kw: "analisis pendientes revisar aprobar firma" },
        { label: "Informes por revisar o autorizar", sub: "Borradores y en revisión", href: "/informes?filtro=pendiente", allowed: can("informes"), kw: "informes revision revisar autorizar pendientes" },
        { label: "Informes autorizados sin entregar", sub: "Falta registrar la entrega al cliente", href: "/informes?filtro=autorizado", allowed: can("informes"), kw: "informes autorizados entregar entrega" },
        { label: "Informes enviados", sub: "Enviados por correo al cliente", href: "/informes?filtro=enviado", allowed: can("informes"), kw: "informes enviados entregados correo historial" },
        { label: "Reactivos con stock bajo", sub: "Por debajo del mínimo o agotados", href: "/inventario/reactivos?filtro=bajo", allowed: can("inventario"), kw: "reactivos stock bajo agotado minimo" },
        { label: "Reactivos por vencer", sub: "Caducan pronto o ya caducaron", href: "/inventario/reactivos?filtro=vencer", allowed: can("inventario"), kw: "reactivos caducidad vencer vencidos" },
        { label: "Consumibles con stock bajo", sub: "5 piezas o menos", href: "/inventario/consumibles?filtro=bajo", allowed: can("inventario"), kw: "consumibles stock bajo agotado" },
        { label: "Equipos con alerta de calibración", sub: "Calibración vencida, pendiente o fuera de servicio", href: "/inventario/equipos?filtro=calibracion", allowed: can("equipos"), kw: "equipos calibracion vencida pendiente fuera de servicio" },
        { label: "Equipos en mantenimiento", sub: "Con un mantenimiento pendiente", href: "/inventario/equipos?filtro=mantenimiento", allowed: can("equipos"), kw: "equipos mantenimiento" },
        { label: "Mantenimientos vencidos", sub: "Programados y no realizados a tiempo", href: "/inventario/mantenimiento?filtro=vencido", allowed: can("equipos"), kw: "mantenimientos vencidos atrasados" },
        { label: "Mantenimientos próximos", sub: "En los próximos 30 días", href: "/inventario/mantenimiento?filtro=proximo", allowed: can("equipos"), kw: "mantenimientos proximos calendario 30 dias" },
        { label: "Incidencias por evaluar", sub: "Reportadas o en evaluación", href: "/calidad/incidencias?filtro=por_evaluar", allowed: can("calidad", "R", { objeto: "incidencia" }), kw: "incidencias evaluar calidad pendientes" },
        { label: "No conformidades abiertas", sub: "Sin cerrar, por etapa", href: "/calidad/incidencias?tab=nc", allowed: can("calidad", "V", { objeto: "nc" }) && alcance("calidad") !== "bitacora", kw: "nc no conformidades abiertas acciones correctivas" },
        { label: "Mis acciones correctivas", sub: "Pendientes o en proceso a tu nombre", href: "/calidad/incidencias?tab=acciones", allowed: can("calidad", "V", { objeto: "accion_correctiva" }) && alcance("calidad") !== "bitacora", kw: "acciones correctivas mias pendientes vencidas" },
        { label: "Mantenimientos completados", sub: "Historial por equipo", href: "/inventario/mantenimiento?filtro=completado", allowed: can("equipos"), kw: "mantenimientos completados historial" },
      ]
        .filter((v) => v.allowed)
        .map((v) => ({ id: `view-${v.href}`, kind: "vista" as const, label: v.label, sub: v.sub, href: v.href, keywords: norm(`${v.label} ${v.sub} ${v.kw} ver lista filtro`) })),
    [can, alcance],
  );

  /* Temas de la ayuda: se abren en la sección correspondiente del manual. */
  const help = useMemo<SearchHit[]>(
    () =>
      HELP_TOPICS.map((t) => ({ id: `help-${t.anchor}`, kind: "ayuda" as const, label: t.label, sub: t.sub, href: `/ayuda#${t.anchor}`, keywords: norm(`${t.label} ${t.sub} ${t.kw} ayuda manual como se hace guia`) })),
    [],
  );

  const actions = useMemo<Array<SearchHit & { specific: boolean }>>(
    () =>
      [
        /* Lo general primero; las variantes concretas (ASP/DSP) solo salen al escribir. */
        { label: "Nueva recepción", sub: "Registrar la llegada de una muestra o lote", href: "/muestras/recepcion/nueva", allowed: can("muestras", "C", { objeto: "recepcion", borrador: true }), kw: "muestra lote solicitante" },
        { label: "Nuevo procesamiento", sub: "Lavado, desconche y molienda", href: "/muestras/procesamiento/nuevo", allowed: can("ensayos", "C", { objeto: "procesamiento", borrador: true }), kw: "molienda" },
        { label: "Nueva extracción", sub: "Elige el formato (ASP, DSP…) al abrir", href: "/muestras/extraccion/nueva", allowed: can("ensayos", "C", { objeto: "extraccion", borrador: true }), kw: "extracto" },
        { label: "Nuevo análisis", sub: "Resultados, controles y firma", href: "/muestras/analisis/nuevo", allowed: can("ensayos", "C", { objeto: "analisis", borrador: true }), kw: "resultados cromatografia" },
        { label: "Nuevo informe", sub: "Informe de resultados para el cliente", href: "/informes/nuevo", allowed: can("informes", "C"), kw: "resultados cliente pdf" },
        { label: "Nuevo reactivo", sub: "Alta en el inventario", href: "/inventario/reactivos?nuevo=1", allowed: can("inventario", "C", { objeto: "catalogo_inventario" }), kw: "inventario alta" },
        { label: "Nuevo consumible", sub: "Alta en el inventario", href: "/inventario/consumibles?nuevo=1", allowed: can("inventario", "C", { objeto: "catalogo_inventario" }), kw: "inventario alta" },
        { label: "Nuevo equipo", sub: "Alta con clave de bitácora", href: "/inventario/equipos?nuevo=1", allowed: can("equipos", "C", { objeto: "equipo" }), kw: "inventario alta bitacora" },
        { label: "Programar mantenimiento", sub: "Preventivo, correctivo, calibración o verificación", href: "/inventario/mantenimiento?nuevo=1", allowed: can("equipos", "C", { objeto: "mantenimiento" }), kw: "calibracion verificacion" },
        { label: "Subir documento", sub: "A la biblioteca", href: "/calidad/biblioteca", allowed: FEATURES.documentos && can("documentos", "C", { objeto: "documento", borrador: true }), kw: "calidad" },
        { label: "Reportar incidencia", sub: "Falla, desviación o queja; con foto", href: "?reportar=1", allowed: can("calidad", "C", { objeto: "incidencia" }), kw: "incidencia problema falla desviacion queja reportar calidad" },
        { label: "Nueva extracción ASP", sub: "Ácido domoico · metanol:agua 50:50", href: "/muestras/extraccion/nueva?tipo=E-A", allowed: can("ensayos", "C", { objeto: "extraccion", borrador: true }), kw: "acido domoico asp e-a", specific: true },
        { label: "Nueva extracción DSP", sub: "Toxinas lipofílicas · metanol 100 % e hidrólisis", href: "/muestras/extraccion/nueva?tipo=E-D", allowed: can("ensayos", "C", { objeto: "extraccion", borrador: true }), kw: "toxinas lipofilicas dsp e-d okadaico", specific: true },
      ]
        .filter((a) => a.allowed)
        .map((a) => ({ id: `new-${a.href}`, kind: "accion" as const, label: a.label, sub: a.sub, href: a.href, keywords: norm(`${a.label} ${a.sub} ${a.kw} nuevo nueva crear registrar alta`), specific: !!a.specific })),
    [can],
  );

  /* Sin escribir: unas pocas acciones frecuentes según lo que la persona puede hacer (primero lo que atiende, luego lo que crea). */
  const quick = useMemo<SearchHit[]>(
    () =>
      [
        { label: "Por autorizar", href: "/solicitudes", allowed: can("usuarios", "A"), kw: "solicitudes autorizar" },
        { label: "Mis muestras", href: "/muestras/recepcion?mias=1", allowed: alcance("muestras", "V") === "asignado", kw: "asignadas" },
        { label: "Análisis por revisar", href: "/muestras/analisis?filtro=pendiente", allowed: can("ensayos", "R"), kw: "firmar" },
        { label: "Nueva recepción", href: "/muestras/recepcion/nueva", allowed: can("muestras", "C", { objeto: "recepcion", borrador: true }), kw: "muestra" },
        { label: "Nuevo análisis", href: "/muestras/analisis/nuevo", allowed: can("ensayos", "C", { objeto: "analisis", borrador: true }), kw: "resultados" },
        { label: "Informes por liberar", href: "/informes?filtro=autorizado", allowed: can("informes", "A"), kw: "entregar" },
        { label: "Nuevo reactivo", href: "/inventario/reactivos?nuevo=1", allowed: can("inventario", "C", { objeto: "catalogo_inventario" }), kw: "inventario" },
        { label: "Subir documento", href: "/calidad/biblioteca?subir=1", allowed: FEATURES.documentos && can("documentos", "G"), kw: "biblioteca" },
        { label: "Reportar incidencia", href: "?reportar=1", allowed: can("calidad", "C", { objeto: "incidencia" }), kw: "problema" },
        { label: "Nuevo usuario", href: "/administracion/usuarios?nuevo=1", allowed: can("usuarios", "G"), kw: "persona" },
      ]
        .filter((a) => a.allowed)
        .slice(0, 5)
        .map((a) => ({ id: `quick-${a.href}`, kind: "accion" as const, label: a.label, href: a.href, keywords: norm(`${a.label} ${a.kw}`) })),
    [can, alcance],
  );

  const result = useMemo<{ groups: SearchGroup[]; sections: SearchSection[] }>(() => {
    const q = norm(query.trim());
    const compact = compactText(q);
    const terms = q.split(/\s+/).filter(Boolean);
    /*
     * Puntuación: 0 = la etiqueta empieza con lo escrito; 1 = la frase completa
     * aparece (sin espacios, para folios como "R 12"); 2 = todas las palabras
     * aparecen sueltas (las de una letra no cuentan salvo que sean la única).
     */
    /*
     * Folio corto ("R 5", "e-d1", "IR 4"): se normaliza a "r0000005" y solo
     * cuenta el folio exacto (las etiquetas siempre llevan 7 dígitos); no se
     * mezcla con la búsqueda por palabras ("ir" está en "abrir"). Una letra
     * más un número que no sea folio ("A 2026") también entra aquí y no
     * encuentra nada: es el precio de que los folios sean directos.
     */
    const folio = parseFolio(q);
    const score = (hit: SearchHit): number | null => {
      const label = norm(hit.label);
      const labelCompact = compactText(label);
      if (folio) return labelCompact === folio.exact ? 0 : null;
      if (label.startsWith(q) || labelCompact.startsWith(compact)) return 0;
      if (compactText(hit.keywords).includes(compact)) return 1;
      const useful = terms.length === 1 ? terms : terms.filter((t) => t.length >= 2 || /^\d$/.test(t));
      if (useful.length && useful.every((t) => hit.keywords.includes(t))) return 2;
      return null;
    };
    const perGroup = 6;
    const buckets = new Map<SearchKind, Array<{ hit: SearchHit; score: number }>>();
    const push = (hit: SearchHit, value: number) => {
      const list = buckets.get(hit.kind) || [];
      list.push({ hit, score: value });
      buckets.set(hit.kind, list);
    };
    const allowedKinds = SCOPE_KINDS[scope];
    const inScope = (hit: SearchHit) => !allowedKinds || allowedKinds.includes(hit.kind);
    if (terms.length) {
      for (const hit of [...(index || []), ...actions, ...views, ...destinations, ...help]) {
        if (!inScope(hit)) continue;
        const value = score(hit);
        if (value !== null) push(hit, value);
      }
      const groups = GROUP_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({
        kind,
        title: GROUP_TITLES[kind],
        hits: buckets
          .get(kind)!
          .sort((a, b) => a.score - b.score)
          .slice(0, kind === "accion" ? 4 : perGroup)
          .map((entry) => entry.hit),
      }));
      /* Las mismas coincidencias, agrupadas por sección para el Inicio (mejor puntuadas primero). */
      const bySection = new Map<SectionKey, Array<{ hit: SearchHit; score: number }>>();
      for (const [kind, entries] of buckets) bySection.set(SECTION_OF[kind], [...(bySection.get(SECTION_OF[kind]) || []), ...entries]);
      const sections = SECTION_ORDER.filter((key) => bySection.has(key)).map((key) => {
        const sorted = bySection.get(key)!.sort((a, b) => a.score - b.score).map((entry) => entry.hit);
        return { key, title: SECTION_TITLES[key], hits: sorted.slice(0, SECTION_CAP), total: sorted.length, more: sorted.length > SECTION_CAP ? sectionMore(key, sorted[0], query) : undefined };
      });
      return { groups, sections };
    }
    /* Sin texto: lo último que abriste, lo que puedes crear y a dónde ir. */
    if (scope === "todo" || scope === "muestras" || scope === "inventario" || scope === "informes") {
      for (const hit of recent.filter(inScope)) push({ ...hit, kind: "reciente", sourceKind: hit.kind, tag: hit.tag || GROUP_TITLES[hit.kind] }, 0);
    }
    if (scope === "todo" || scope === "acciones") {
      for (const hit of actions.filter((a) => !a.specific).slice(0, 6)) push(hit, 0);
      for (const hit of views.slice(0, scope === "acciones" ? views.length : 4)) push(hit, 0);
      for (const hit of destinations) push(hit, 0);
      for (const hit of help.slice(0, scope === "acciones" ? help.length : 1)) push(hit, 0);
    } else {
      for (const hit of actions.filter((a) => !a.specific && (scope === "muestras" ? a.href.startsWith("/muestras") : scope === "informes" ? a.href.startsWith("/informes") : a.href.startsWith("/inventario")))) push(hit, 0);
      for (const hit of views.filter((v) => (scope === "muestras" ? v.href.startsWith("/muestras") : scope === "informes" ? v.href.startsWith("/informes") : v.href.startsWith("/inventario")))) push(hit, 0);
    }
    const groups = GROUP_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({ kind, title: GROUP_TITLES[kind], hits: buckets.get(kind)!.map((entry) => entry.hit) }));
    const sections: SearchSection[] = [];
    if (quick.length) sections.push({ key: "acciones", title: SECTION_TITLES.acciones, hits: quick, total: quick.length });
    if (recent.length) sections.push({ key: "recientes", title: SECTION_TITLES.recientes, hits: recent.map((hit) => ({ ...hit, kind: "reciente" as const, sourceKind: hit.kind, tag: hit.tag || GROUP_TITLES[hit.kind] })), total: recent.length });
    return { groups, sections };
  }, [query, scope, recent, index, actions, views, destinations, help, quick]);

  const remember = useCallback(
    (hit: SearchHit) => {
      rememberSearchHit(owner, hit);
      setRecent(readRecent(owner));
    },
    [owner],
  );

  const forgetRecent = useCallback(() => {
    clearRecentSearches(owner);
    setRecent([]);
  }, [owner]);

  return { query, setQuery, scope, setScope, groups: result.groups, sections: result.sections, loading, warm, remember, forgetRecent, hasRecent: recent.length > 0, ready: index !== null };
}
