"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowCounterClockwise, Flask, Hash, PencilSimple, Plus, Printer, Prohibit, TestTube, UserPlus } from "@phosphor-icons/react";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { FolioChip, SampleStatus, SolicitudBadge, SupervisionBadge } from "@/components/features/samples/status";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { AsignadosCelda, DecisionInsignia, EtiquetasAnalisis, muestraDe, RecepcionVentana, tiposDe } from "@/components/features/samples/ventanas/RecepcionVentana";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { FranjaPendientes } from "@/components/features/solicitudes/Solicitudes";
import { StatusCell } from "@/components/ui/StatusFlag";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { formatSampleFolio, normalizeSampleStatus } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { ACCEPTANCE_DECISIONS, RECEPTION_ANALYSIS_TYPES, RECEPTION_STATE_ORDER, SAMPLE_STATES } from "@/lib/shared/sgc";
import { recepcionAsignable, useAccionesRecepcion } from "@/components/features/samples/RecepcionAcciones";

/*
 * Muestras › Recepción (patron lista -> ventana de detalle): lista en
 * cuadricula con columnas fijas (folio, muestra y solicitante, analisis,
 * estado, recibida, asignados); todos los filtros y el orden dentro de
 * "Filtros"; el clic abre la ventana con Resumen, Avance y Pendientes. La
 * captura y edicion siguen en el formato completo.
 */

export default function RecepcionListPage() {
  return (
    <RequireModule modules="muestras">
      <RecepcionList />
    </RequireModule>
  );
}

const DECISION_SHORT: Record<string, string> = { aceptada: "Aceptada", aceptada_con_desviacion: "Con desviación", rechazada: "Rechazada" };
const ANALYSIS_SHORT: Record<string, string> = { acido_domoico: "ASP", toxinas_lipofilicas: "DSP", toxinas_paralizantes: "PSP", pigmentos: "Pigmentos", plancton: "Plancton", otro: "Otro" };
type Orden = "recientes" | "antiguas" | "folio" | "solicitante";

const COLUMNAS: ColumnaLista[] = [
  { clave: "folio", titulo: "Folio", ancho: "130px" },
  { clave: "muestra", titulo: "Muestra", ancho: "minmax(220px,1.5fr)" },
  { clave: "analisis", titulo: "Análisis", ancho: "minmax(140px,1fr)" },
  { clave: "estado", titulo: "Estado", ancho: "minmax(170px,1fr)" },
  { clave: "recibida", titulo: "Recibida", ancho: "120px" },
  { clave: "asignados", titulo: "Asignados", ancho: "130px" },
];

/* Fase 5: estados de la especificacion (solo hacia adelante). */
type EtapaFilter = "" | (typeof RECEPTION_STATE_ORDER)[number];
type DecisionFilter = "" | "aceptada" | "aceptada_con_desviacion" | "rechazada" | "pendiente";


function RecepcionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [etapa, setEtapa] = useState<EtapaFilter>("");
  const [decision, setDecision] = useState<DecisionFilter>("");
  const [analisis, setAnalisis] = useState("");
  const [mias, setMias] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [abierta, setAbierta] = useState<number | null>(null);
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("reception", formatSampleFolio);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/reception?search=${encodeURIComponent(debounced.trim())}${showAnuladas ? "&anuladas=1" : ""}${mias ? "&mias=1" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showAnuladas, mias] },
  );
  const items = resource.data;

  const canCreate = can("muestras", "C", { objeto: "recepcion", borrador: true });
  const canEdit = (item: ApiRecord) => can("muestras", "E", { objeto: "recepcion", borrador: String(item.estado || "registrada") === "registrada" });
  const canProcesar = can("ensayos", "C", { objeto: "procesamiento", borrador: true });
  const canDelete = can("muestras", "AN");
  const canAsignar = can("muestras", "A");
  const acciones = useAccionesRecepcion(() => resource.reload());

  const visible = useMemo(() => {
    const list = items || [];
    const filtrada = list.filter((item) => {
      const estado = normalizeSampleStatus(item.estado);
      if (etapa && estado !== etapa) return false;
      const dec = String(item.decision_aceptacion || "");
      if (decision === "pendiente" && dec) return false;
      if (decision && decision !== "pendiente" && dec !== decision) return false;
      if (analisis && !tiposDe(item).includes(analisis)) return false;
      return true;
    });
    const folio = (i: ApiRecord) => Number(i.folio_num || 0);
    if (orden === "antiguas") return [...filtrada].sort((a, b) => String(a.fecha_recepcion || "").localeCompare(String(b.fecha_recepcion || "")) || folio(a) - folio(b));
    if (orden === "folio") return [...filtrada].sort((a, b) => folio(a) - folio(b));
    if (orden === "solicitante") return [...filtrada].sort((a, b) => String(a.solicitante || "").localeCompare(String(b.solicitante || ""), "es"));
    return filtrada;
  }, [items, etapa, decision, analisis, orden]);

  const groups: FilterGroup[] = [
    {
      key: "etapa",
      label: "Estado",
      value: etapa,
      defaultValue: "",
      onChange: (v) => setEtapa(v as EtapaFilter),
      options: [
        { value: "", label: "Todas" },
        ...RECEPTION_STATE_ORDER.map((estado) => ({ value: estado, label: SAMPLE_STATES[estado]?.label || estado })),
      ],
    },
    {
      key: "decision",
      label: "Aceptación",
      value: decision,
      defaultValue: "",
      onChange: (v) => setDecision(v as DecisionFilter),
      options: [
        { value: "", label: "Cualquiera" },
        { value: "pendiente", label: "Sin decisión" },
        ...ACCEPTANCE_DECISIONS.map((d) => ({ value: d.value, label: DECISION_SHORT[d.value] || d.label })),
      ],
    },
    {
      key: "analisis",
      label: "Análisis",
      value: analisis,
      defaultValue: "",
      onChange: setAnalisis,
      options: [{ value: "", label: "Cualquiera" }, ...RECEPTION_ANALYSIS_TYPES.map((t) => ({ value: t.value, label: ANALYSIS_SHORT[t.value] || t.label }))],
    },
  ];
  const toggles: FilterToggle[] = [
    { key: "mias", label: "Mis muestras", checked: mias, onChange: setMias },
    { key: "anuladas", label: "Mostrar anuladas", checked: showAnuladas, onChange: setShowAnuladas },
  ];
  // Una sola seleccion; va al final del menu de filtros.
  const ordenar: FilterGroup[] = [
    {
      key: "orden",
      label: "Ordenar por",
      value: orden,
      defaultValue: "recientes",
      showDefault: true,
      onChange: (v) => setOrden(v as Orden),
      options: [
        { value: "recientes", label: "Más recientes" },
        { value: "antiguas", label: "Más antiguas" },
        { value: "folio", label: "Folio" },
        { value: "solicitante", label: "Solicitante A–Z" },
      ],
    },
  ];
  const filtrando = !!search.trim() || !!etapa || !!decision || !!analisis || mias || showAnuladas;

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulada = item.estado === "anulada";
    const estado = String(item.estado || "");
    // Fase 5: las acciones dependen del estado (liberada, cerrada y rechazada ya no se editan) y del permiso.
    const terminada = ["liberada", "cerrada", "rechazada"].includes(estado);
    const puedeProcesar = canProcesar && !anulada && ["aceptada", "aceptada_con_desviacion"].includes(String(item.decision_aceptacion || "")) && !["rechazada", "cerrada", "liberada"].includes(estado);
    // El clic en el renglon ya abre la ventana (con "Abrir formato completo"): aqui solo lo demas.
    const list: MenuItem[] = [];
    if (canAsignar && recepcionAsignable(item)) list.push({ label: "Asignar…", description: "Quién trabaja esta muestra", icon: <UserPlus size={16} weight="duotone" />, onSelect: () => acciones.asignar(item) });
    if (canEdit(item) && !anulada && !terminada && !item.decision_aceptacion) list.push({ label: "Decidir aceptación", description: "En el formato completo", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => router.push(`/muestras/recepcion/${item.id}`) });
    if (!anulada) list.push({ label: "Imprimir etiqueta", description: "Una etiqueta por muestra del lote", icon: <Printer size={16} weight="duotone" />, onSelect: () => router.push(`/muestras/recepcion/${item.id}/etiquetas`) });
    if (!anulada && !terminada && can("muestras", "E", { objeto: "recepcion" })) list.push({ label: "Cambiar folio…", description: "Con motivo; lo autoriza la Coord. Técnica", icon: <Hash size={16} weight="duotone" />, onSelect: () => acciones.cambiarFolio(item) });
    if (["cerrada", "rechazada"].includes(estado) && can("muestras", "E", { objeto: "recepcion" })) list.push({ label: "Reabrir…", description: "Vuelve al estado previo, con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", onSelect: () => acciones.reabrir(item) });
    if (puedeProcesar) list.push({ label: "Procesar", description: "Crear el procesamiento de esta muestra", icon: <Flask size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/muestras/procesamiento/nuevo?recepcion=${item.id}`) });
    list.push(...reportar("muestras_recepcion", item.id, formatSampleFolio(item)));
    if (canDelete) {
      if (anulada) list.push({ label: "Restaurar recepción", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular recepción…", description: "Queda en la bitácora con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  return (
    <>
      <FranjaPendientes entidades={["muestras_recepcion"]} grupo="recepcion" />
      <Toolbar
        end={
          canCreate ? (
            <Link href="/muestras/recepcion/nueva" className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nueva recepción
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, solicitante o ID interno" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
      </Toolbar>

      <ListaCuadricula
        etiqueta="Recepciones"
        columnas={COLUMNAS}
        filas={items ? visible : null}
        error={resource.error}
        onReintentar={resource.reload}
        clave={(item) => String(item.id)}
        onAbrir={(_, i) => setAbierta(i)}
        activa={(_, i) => abierta === i}
        celdas={(item) => [
          <FolioChip key="f" type={String(item.tipo_registro || "R")} num={item.folio_num} />,
          <span key="m" className={item.estado === "anulada" ? "flex min-w-0 flex-col opacity-60" : "flex min-w-0 flex-col"}>
            <span className="text-[14px] leading-tight font-semibold text-ink">{muestraDe(item)}</span>
            <span className="text-[12.5px] text-ink-3">{item.solicitante ? String(item.solicitante) : "—"}</span>
          </span>,
          <EtiquetasAnalisis key="a" tipos={tiposDe(item)} />,
          <span key="e" className="flex flex-col items-start gap-1">
            <StatusCell>
              <SampleStatus status={item.estado} />
              <SupervisionBadge estado={item.supervision_estado} />
            </StatusCell>
            {item.decision_aceptacion || normalizeSampleStatus(item.estado) === "registrada" ? <DecisionInsignia decision={item.decision_aceptacion} /> : null}
          </span>,
          <span key="r" className="text-[13px] text-ink-2" title={formatearFecha(item.fecha_recepcion)}>
            {formatearFechaCorta(item.fecha_recepcion)}
          </span>,
          <AsignadosCelda key="g" id={item.id} />,
        ]}
        extremo={(item) => (
          <>
            <span className="flex w-7 justify-center">
              <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="muestras_recepcion" />
            </span>
            <span className="w-9">
              <ActionMenu items={menuFor(item)} header={`${formatSampleFolio(item)} · ${item.id_interno || "lote"}`} />
            </span>
          </>
        )}
        anchoExtremo="84px"
        propsFila={(item) => ({ "data-recepcion": String(item.id) })}
        vacio={{
          icono: <TestTube size={20} />,
          titulo: filtrando ? "Sin coincidencias" : "Sin recepciones",
          descripcion: filtrando ? "Prueba con otro término o cambia los filtros." : "La recepción es el primer paso del flujo de muestras.",
          accion: canCreate && !filtrando ? <Button onClick={() => router.push("/muestras/recepcion/nueva")}>Nueva recepción</Button> : undefined,
        }}
      />
      {items && visible.length ? <p className="tnum mt-2 px-1 text-[12px] text-ink-4">{visible.length === 1 ? "1 recepción" : `${fmt(visible.length)} recepciones`}</p> : null}

      <RecepcionVentana items={visible} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} onAsignar={(item) => acciones.asignar(item)} onCambio={() => resource.reload()} />
      {acciones.dialogo}
    </>
  );
}
