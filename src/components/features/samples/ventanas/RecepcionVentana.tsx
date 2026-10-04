"use client";

import { LineaEtapas } from "@/components/ui/LineaEtapas";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, CalendarBlank, Flask, Printer, TestTube, UserPlus, Users, WarningDiamond } from "@phosphor-icons/react";
import { reportarIncidencia, usePuedeReportar } from "@/components/features/calidad/ReportarIncidencia";
import { recepcionAsignable } from "@/components/features/samples/RecepcionAcciones";
import { SampleStatus } from "@/components/features/samples/status";
import { SolicitudBanner, SupervisionBanner } from "@/components/features/solicitudes/Solicitudes";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { FigurasApiladas, SinDato } from "@/components/ui/Insignias";
import { PestanasDeslizantes } from "@/components/ui/PestanasDeslizantes";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { formatSampleFolio } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ESTADOS_INCIDENCIA, TIPO_INCIDENCIA_LABEL } from "@/lib/shared/calidad";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { ACCEPTANCE_DECISIONS, RECEPTION_ANALYSIS_TYPES, RECEPTION_METHODS, RECEPTION_SAMPLE_TYPES, STORAGE_PLACES } from "@/lib/shared/sgc";

/*
 * Muestras › Recepción: piezas de la lista (analisis con color, asignados) y
 * la ventana de detalle (vista rapida: Resumen, Avance, Pendientes). La
 * captura y la edicion siguen en el formato completo, sin cambios.
 */

export const tiposDe = (item: ApiRecord): string[] => (Array.isArray(item.analisis?.tipos) ? item.analisis.tipos : Array.isArray(item.tipos_analisis) ? item.tipos_analisis : []);

export const ANALISIS_CORTO: Record<string, string> = { acido_domoico: "ASP", toxinas_lipofilicas: "DSP", toxinas_paralizantes: "PSP", pigmentos: "Pigmentos", plancton: "Plancton", otro: "Otro" };
const TONO_ANALISIS: Record<string, string> = {
  acido_domoico: "bg-brand-soft text-brand-strong",
  toxinas_lipofilicas: "bg-warning-soft text-warning-text",
  toxinas_paralizantes: "bg-danger-soft text-danger",
  pigmentos: "bg-success-soft text-success-text",
  plancton: "bg-deep-2/10 text-deep-2",
  otro: "bg-surface-3 text-ink-2",
};
const etiquetaAnalisis = (t: string) => ANALISIS_CORTO[t] || RECEPTION_ANALYSIS_TYPES.find((a) => a.value === t)?.label || t;

/* Etiquetas de color por tipo de analisis. */
export function EtiquetasAnalisis({ tipos }: { tipos: string[] }) {
  if (!tipos.length) return <SinDato />;
  return (
    <span className="flex flex-wrap gap-1">
      {tipos.map((t) => (
        <span key={t} title={RECEPTION_ANALYSIS_TYPES.find((a) => a.value === t)?.label} className={cn("inline-flex min-h-6 items-center rounded-full px-2 text-[12px] font-medium", TONO_ANALISIS[t] || TONO_ANALISIS.otro)}>
          {etiquetaAnalisis(t)}
        </span>
      ))}
    </span>
  );
}

const DECISION: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = { aceptada: { label: "Aceptada", tone: "success" }, aceptada_con_desviacion: { label: "Con desviación", tone: "warning" }, rechazada: { label: "Rechazada", tone: "danger" } };
export function DecisionInsignia({ decision }: { decision: unknown }) {
  const d = DECISION[String(decision || "")];
  return d ? <Badge tone={d.tone}>{d.label}</Badge> : <Badge tone="neutral">Sin decisión</Badge>;
}

/* "D26-001" o "Lote de 3". */
export function muestraDe(item: ApiRecord): string {
  const lote = Array.isArray(item.lote_muestras) ? item.lote_muestras.length : 0;
  if (item.id_interno) return String(item.id_interno);
  if (lote) return `Lote de ${lote}`;
  return item.muestra_unica ? "Muestra única" : "Lote";
}

/* Asignaciones vigentes de una recepcion (se piden solo cuando el renglon se ve). */
function useAsignados(id: unknown, activo: boolean) {
  const { token } = useSession();
  const recurso = useResource<ApiRecord[]>(["muestras", `asignados:${String(id)}`], async () => ((await getJsonAuth(`${API_BASE_URL}/samples/reception/${id}/asignaciones`, token)).items || []) as ApiRecord[], { enabled: !!token && !!id && activo });
  return { lista: (recurso.data || []).filter((a) => !a.revocado_en), cargado: !!recurso.data || !!recurso.error };
}

/* Celda "Asignados": mini figuras (maximo 4 y "+N"), pedidas al hacerse visible el renglon. */
export function AsignadosCelda({ id }: { id: unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) {
        setVisible(true);
        obs.disconnect();
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);
  const { lista, cargado } = useAsignados(id, visible);
  return (
    <span ref={ref} className="flex min-h-7 items-center">
      {!cargado ? (
        <Skeleton className="h-6 w-14 rounded-full" />
      ) : lista.length ? (
        <FigurasApiladas total={lista.length}>
          {lista.map((a) => (
            <FiguraPersona key={String(a.id)} id={a.usuario_id} nombre={a.nombre} email={a.email} size="sm" />
          ))}
        </FigurasApiladas>
      ) : (
        <SinDato />
      )}
    </span>
  );
}

type Pestana = "resumen" | "avance" | "pendientes";

export function RecepcionVentana({ items, indice, onIndice, onCerrar, onAsignar, onCambio }: { items: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void; onAsignar: (item: ApiRecord) => void; onCambio: () => void }) {
  const item = indice !== null ? items[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < items.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Recepción anterior" etiquetaSiguiente="Recepción siguiente">
      {item ? <FichaRecepcion key={String(item.id)} base={item} onAsignar={onAsignar} onCambio={onCambio} onCerrar={onCerrar} /> : <VentanaTitulo className="sr-only">Recepción</VentanaTitulo>}
    </VentanaCentrada>
  );
}

const pad = (n: unknown) => String(Number(n || 0)).padStart(7, "0");

interface Etapa {
  clave: string;
  nombre: string;
  enlaces: Array<{ href: string; texto: string }>;
  hecha: boolean;
  nota?: string;
}

function FichaRecepcion({ base, onAsignar, onCambio, onCerrar }: { base: ApiRecord; onAsignar: (item: ApiRecord) => void; onCambio: () => void; onCerrar: () => void }) {
  const { token, can } = useSession();
  const puedeReportar = usePuedeReportar();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const id = base.id;
  const detalle = useResource<ApiRecord>(["muestras", "solicitudes", "supervision", `recepcion:${String(id)}`], async () => ((await getJsonAuth(`${API_BASE_URL}/samples/reception/${id}`, token)).item || {}) as ApiRecord, { enabled: !!token });
  const item: ApiRecord = { ...base, ...(detalle.data || {}) };
  const { lista: asignados, cargado: asignadosCargados } = useAsignados(id, true);
  const procesamientos = (detalle.data?.procesamientos || []) as ApiRecord[];
  const verIncidencias = can("calidad", "V", { objeto: "incidencia" });

  // Etapas derivadas (solo lectura): extracciones de sus procesamientos, analisis e informes de la recepcion.
  const extracciones = useResource<ApiRecord[]>(["muestras", `extracciones-de:${String(id)}`], async () => {
    const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction?anuladas=1`, token);
    const ids = new Set(procesamientos.map((p) => Number(p.id)));
    return ((data.items || []) as ApiRecord[]).filter((e) => ids.has(Number(e.procesamiento_id)));
  }, { enabled: !!token && procesamientos.length > 0 && can("ensayos", "V"), deps: [procesamientos.map((p) => p.id).join(",")] });
  const analisis = useResource<ApiRecord[]>(["muestras", `analisis-de:${String(id)}`], async () => ((await getJsonAuth(`${API_BASE_URL}/samples/analysis?recepcion_id=${id}&anulados=1`, token)).items || []) as ApiRecord[], { enabled: !!token && can("ensayos", "V") });
  const informes = useResource<ApiRecord[]>(["informes", `informes-de:${String(id)}`], async () => ((await getJsonAuth(`${API_BASE_URL}/informes?recepcion_id=${id}`, token)).items || []) as ApiRecord[], { enabled: !!token && can("informes", "V") });
  const incidencias = useResource<ApiRecord[]>(["calidad", `incidencias-de:${String(id)}`], async () => ((await getJsonAuth(`${API_BASE_URL}/calidad/incidencias?entidad=muestras_recepcion&entidad_id=${id}`, token)).items || []) as ApiRecord[], { enabled: !!token && verIncidencias });

  const anulada = item.estado === "anulada";
  const tipos = tiposDe(item);
  const lote = Array.isArray(item.lote_muestras) ? (item.lote_muestras as ApiRecord[]) : [];
  const numMuestras = lote.length || 1;
  const custodio = (item.datos_custodio || {}) as ApiRecord;
  const lugar = STORAGE_PLACES.find((p) => p.value === custodio.lugar_resguardo)?.label || (custodio.lugar_resguardo ? String(custodio.lugar_resguardo) : "");
  const metodos = (Array.isArray(item.analisis?.metodos) ? item.analisis.metodos : []).map((m: string) => RECEPTION_METHODS.find((x) => x.value === m)?.label || m);
  const tiposMuestra = (Array.isArray(item.analisis?.tipos_muestra) ? item.analisis.tipos_muestra : []).map((m: string) => RECEPTION_SAMPLE_TYPES.find((x) => x.value === m)?.label || m);
  const decision = ACCEPTANCE_DECISIONS.find((d) => d.value === item.decision_aceptacion)?.label;

  const incidenciasAbiertas = (incidencias.data || []).filter((i) => ["reportada", "en_evaluacion"].includes(String(i.estado)));
  const solicitudPendiente = !!item.solicitud_pendiente && String((item.solicitud_pendiente as ApiRecord).estado || "pendiente") === "pendiente";
  const supervisionPendiente = String(item.supervision_estado || "") === "pendiente";
  const hayPendientes = solicitudPendiente || supervisionPendiente || incidenciasAbiertas.length > 0;
  const pestanaVisible: Pestana = pestana === "pendientes" && !hayPendientes ? "resumen" : pestana;

  // Etapas derivadas (sin memo: son pocas y baratas).
  const cerrada = item.estado === "cerrada";
  const etapas: Etapa[] = [
      { clave: "recepcion", nombre: "Recepción", enlaces: [{ href: `/muestras/recepcion/${id}`, texto: `R ${pad(item.folio_num)}` }], hecha: true },
      { clave: "procesamiento", nombre: "Procesamiento", enlaces: procesamientos.map((p) => ({ href: `/muestras/procesamiento/${p.id}`, texto: `P ${pad(p.folio_num)}` })), hecha: procesamientos.length > 0 },
      { clave: "extraccion", nombre: "Extracción", enlaces: (extracciones.data || []).map((e) => ({ href: `/muestras/extraccion/${e.id}`, texto: `${String(e.tipo_registro || "E")} ${pad(e.folio_num)}` })), hecha: (extracciones.data || []).length > 0 },
      { clave: "analisis", nombre: "Análisis", enlaces: (analisis.data || []).map((a) => ({ href: `/muestras/analisis/${a.id}`, texto: `A ${pad(a.folio_num)}${Number(a.version || 1) > 1 ? ` v${a.version}` : ""}` })), hecha: (analisis.data || []).length > 0 },
      { clave: "informe", nombre: "Informe", enlaces: (informes.data || []).map((i) => ({ href: `/informes/${i.id}`, texto: `IR ${pad(i.folio_num)}${Number(i.version || 1) > 1 ? ` v${i.version}` : ""}` })), hecha: (informes.data || []).length > 0 },
      { clave: "cierre", nombre: "Cierre", enlaces: [], hecha: cerrada, nota: cerrada ? "Muestra cerrada con su disposición final" : undefined },
  ];
  const actual = etapas.reduce((ultima, e, i) => (e.hecha ? i : ultima), 0);

  return (
    <div className="flex flex-col gap-5" data-recepcion-ventana={String(id)}>
      <VentanaEncabezado
        figura={
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-brand-soft text-brand-strong">
            <TestTube size={28} weight="duotone" />
          </span>
        }
        titulo={formatSampleFolio(item)}
        insignia={
          <>
            <SampleStatus status={item.estado} />
            <DecisionInsignia decision={item.decision_aceptacion} />
          </>
        }
        subtitulo={[muestraDe(item), item.solicitante ? String(item.solicitante) : null].filter(Boolean).join(" · ")}
      />

      <DatosRapidos
        datos={[
          { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Recibida", valor: formatearFechaCorta(item.fecha_recepcion), titulo: `${formatearFecha(item.fecha_recepcion)}${item.hora_recepcion ? ` a las ${String(item.hora_recepcion)}` : ""}` },
          { icono: <TestTube size={17} weight="duotone" />, etiqueta: "Muestras", valor: String(numMuestras) },
          { icono: <Flask size={17} weight="duotone" />, etiqueta: "Análisis", valor: tipos.length ? tipos.map(etiquetaAnalisis).join(", ") : "—" },
          { icono: <Users size={17} weight="duotone" />, etiqueta: "Asignados", valor: asignadosCargados ? String(asignados.length) : "…" },
        ]}
      />

      <PestanasDeslizantes
        label="Información de la recepción"
        value={pestanaVisible}
        onChange={setPestana}
        options={[
          { value: "resumen", label: "Resumen" },
          { value: "avance", label: "Avance" },
          ...(hayPendientes ? [{ value: "pendientes" as const, label: "Pendientes", badge: <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" /> }] : []),
        ]}
      />

      <div key={pestanaVisible} className="animate-rise-in motion-reduce:animate-none">
        {pestanaVisible === "resumen" ? (
          <div className="flex flex-col gap-5">
            <VentanaSeccion titulo="Solicitante" i={0}>
              <DatosLista
                datos={[
                  { etiqueta: "Solicitante", valor: String(item.solicitante || "—") },
                  item.datos_solicitante?.nombre_entrega ? { etiqueta: "Entregó", valor: String(item.datos_solicitante.nombre_entrega) } : null,
                  { etiqueta: "Recibió", valor: String(item.recibido_por || "—") },
                ]}
              />
            </VentanaSeccion>
            <VentanaSeccion titulo={numMuestras > 1 ? `Muestras (${numMuestras})` : "Muestra"} i={1}>
              {lote.length ? (
                <ul className="flex flex-col gap-1.5">
                  {lote.map((m, k) => (
                    <li key={`${String(m.id_interno)}-${k}`} className="rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[13.5px] ring-1 ring-line">
                      <span className="font-medium text-ink">{String(m.id_interno || `Muestra ${k + 1}`)}</span>
                      {m.nombre_organismo ? <span className="text-ink-2"> · {String(m.nombre_organismo)}</span> : null}
                      {m.sitio_muestreo ? <span className="text-ink-3"> · {String(m.sitio_muestreo)}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <DatosLista datos={[{ etiqueta: "ID interno", valor: String(item.id_interno || "—") }, item.fecha_muestra ? { etiqueta: "Fecha de la muestra", valor: formatearFecha(item.fecha_muestra) } : null]} />
              )}
            </VentanaSeccion>
            <VentanaSeccion titulo="Análisis solicitado" i={2}>
              <EtiquetasAnalisis tipos={tipos} />
              <DatosLista datos={[metodos.length ? { etiqueta: "Métodos", valor: metodos.join(", ") } : null, tiposMuestra.length ? { etiqueta: "Tipo de muestra", valor: tiposMuestra.join(", ") } : null]} />
            </VentanaSeccion>
            <VentanaSeccion titulo="Aceptación y resguardo" i={3}>
              <DatosLista
                datos={[
                  { etiqueta: "Decisión", valor: decision || "Todavía sin decisión" },
                  item.aceptacion?.temperatura_llegada ? { etiqueta: "Temperatura de llegada", valor: String(item.aceptacion.temperatura_llegada) } : null,
                  { etiqueta: "Resguardo", valor: [lugar, custodio.lugar_otro ? String(custodio.lugar_otro) : null].filter(Boolean).join(" · ") || "—" },
                  custodio.nombre_cargo_firma ? { etiqueta: "Custodio", valor: String(custodio.nombre_cargo_firma) } : null,
                ]}
              />
            </VentanaSeccion>
            {asignados.length ? (
              <VentanaSeccion titulo="Asignados" i={4}>
                <ul className="flex flex-wrap gap-2">
                  {asignados.map((a) => (
                    <li key={String(a.id)} className="rounded-full bg-surface py-1 pr-3 pl-1 shadow-card ring-1 ring-line">
                      <FiguraPersona id={a.usuario_id} nombre={a.nombre} email={a.email} conNombre />
                    </li>
                  ))}
                </ul>
              </VentanaSeccion>
            ) : null}
          </div>
        ) : null}

        {pestanaVisible === "avance" ? (
          <VentanaSeccion titulo="Etapas de la muestra">
            <LineaEtapas
              variante="vertical"
              etiqueta="Etapas de la muestra"
              actual={actual}
              etapas={etapas.map((e) => ({
                clave: e.clave,
                titulo: e.nombre,
                detalle: e.enlaces.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {e.enlaces.map((l) => (
                      <Link key={l.href} href={l.href} onClick={onCerrar} className="press inline-flex h-7 items-center gap-1 rounded-[8px] bg-surface-2 px-2.5 text-[12.5px] font-medium text-brand-strong ring-1 ring-line hover:bg-brand-faint">
                        {l.texto}
                      </Link>
                    ))}
                  </span>
                ) : (
                  <span className="text-[13px] text-ink-3">{e.nota || (e.hecha ? "" : "Todavía no")}</span>
                ),
              }))}
            />
          </VentanaSeccion>
        ) : null}

        {pestanaVisible === "pendientes" ? (
          <div className="flex flex-col gap-4">
            {solicitudPendiente ? <SolicitudBanner item={item} entidad="muestras_recepcion" onCambio={onCambio} /> : null}
            {supervisionPendiente ? (
              <SupervisionBanner item={item} tabla="muestras_recepcion" tipo="Recepción" referencia={formatSampleFolio(item)} onCambio={onCambio}>
                <VentanaTarjeta>
                  <p className="text-[14px] font-medium text-ink">Pendiente de visto bueno</p>
                  <p className="text-[13px] text-ink-2">La capturó una persona bajo supervisión; no avanza hasta que su supervisor dé el visto bueno.</p>
                </VentanaTarjeta>
              </SupervisionBanner>
            ) : null}
            {incidenciasAbiertas.length ? (
              <VentanaSeccion titulo="Incidencias abiertas">
                <ul className="flex flex-col gap-1.5">
                  {incidenciasAbiertas.map((inc) => (
                    <li key={String(inc.id)}>
                      <Link href={`/calidad/incidencias/${inc.id}`} onClick={onCerrar} className="press flex flex-wrap items-center gap-2 rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[13.5px] ring-1 ring-line transition-shadow hover:shadow-raised">
                        <WarningDiamond size={16} weight="duotone" className="text-warning-text" aria-hidden="true" />
                        <span className="font-medium text-ink">INC {pad(inc.folio_num)}</span>
                        <span className="min-w-0 flex-1 text-ink-2">{TIPO_INCIDENCIA_LABEL[String(inc.tipo)] || "Incidencia"}</span>
                        <Badge tone={(ESTADOS_INCIDENCIA[String(inc.estado)]?.tone as "warning") || "neutral"} dot>
                          {ESTADOS_INCIDENCIA[String(inc.estado)]?.label || "Abierta"}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              </VentanaSeccion>
            ) : null}
          </div>
        ) : null}
      </div>

      <VentanaAcciones>
        <Link href={`/muestras/recepcion/${id}`} onClick={onCerrar} className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white hover:bg-brand-strong">
          <ArrowSquareOut size={16} /> Abrir formato completo
        </Link>
        {!anulada ? (
          <Link href={`/muestras/recepcion/${id}/etiquetas`} onClick={onCerrar} className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-surface px-3.5 text-[13.5px] font-medium text-ink shadow-card ring-1 ring-line hover:bg-surface-2">
            <Printer size={16} /> Imprimir etiqueta
          </Link>
        ) : null}
        {can("muestras", "A") && recepcionAsignable(item) ? (
          <Button variant="secondary" icon={<UserPlus size={16} />} onClick={() => onAsignar(item)}>
            Asignar
          </Button>
        ) : null}
        {puedeReportar ? (
          <Button variant="secondary" icon={<WarningDiamond size={16} />} onClick={() => reportarIncidencia([{ entidad: "muestras_recepcion", entidad_id: Number(id), etiqueta: formatSampleFolio(item) }])}>
            Reportar incidencia
          </Button>
        ) : null}
      </VentanaAcciones>
    </div>
  );
}
