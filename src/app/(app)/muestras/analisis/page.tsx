"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowCounterClockwise, Plus, Prohibit, TestTube } from "@phosphor-icons/react";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { FolioChip, StateBadge, SolicitudBadge, SupervisionBadge } from "@/components/features/samples/status";
import { AnalisisVentana, folioAnalisis } from "@/components/features/samples/ventanas/AnalisisVentana";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { IndicadorConteo, SinDato } from "@/components/ui/Insignias";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { FranjaPendientes } from "@/components/features/solicitudes/Solicitudes";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useParamChange } from "@/lib/client/hooks";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { ANALYSIS_METHODS, ANALYSIS_TYPES } from "@/lib/shared/sgc";

/*
 * Analisis (patron lista -> ventana de detalle): lista alineada (folio y
 * analisis, muestras, origen, fecha, analista y estado), todos los filtros y
 * el orden dentro de "Filtros", y al pulsar un renglon la ventana de detalle
 * con sus acciones (enviar a revision, devolver, revisar, aprobar). La captura
 * sigue en el formato completo.
 */

type EstadoFilter = "" | "pendiente" | "registrado" | "en_revision" | "revisado" | "aprobado" | "sustituido";
const ESTADOS: string[] = ["pendiente", "registrado", "en_revision", "revisado", "aprobado", "sustituido"];
type Orden = "reciente" | "fecha" | "folio";

export default function AnalisisListPage() {
  return (
    <RequireModule modules="ensayos">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AnalisisList />
      </Suspense>
    </RequireModule>
  );
}

const COLUMNAS: ColumnaLista[] = [
  { clave: "folio", titulo: "Folio y análisis", ancho: "minmax(170px,1fr)" },
  { clave: "muestras", titulo: "Muestras", ancho: "minmax(150px,1fr)" },
  { clave: "origen", titulo: "Origen", ancho: "minmax(150px,0.9fr)" },
  { clave: "fecha", titulo: "Fecha", ancho: "120px" },
  { clave: "analista", titulo: "Analista", ancho: "minmax(170px,1fr)" },
  { clave: "estado", titulo: "Estado", ancho: "minmax(140px,0.9fr)" },
];

function AnalisisList() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const recepcionParam = params.get("recepcion") || "";
  const [soloRecepcion, setSoloRecepcion] = useState(true);
  const recepcionId = soloRecepcion ? recepcionParam : "";
  const [search, setSearch] = useState("");
  /* ?filtro= llega desde los avisos del Inicio y el buscador ("Análisis por revisar o aprobar"). */
  const initialFilter = useInitialParam("filtro");
  const [estado, setEstado] = useState<EstadoFilter>(ESTADOS.includes(initialFilter) ? (initialFilter as EstadoFilter) : "");
  useParamChange("filtro", (value) => setEstado(ESTADOS.includes(value) ? (value as EstadoFilter) : ""));
  const [showAnulados, setShowAnulados] = useState(false);
  const [mias, setMias] = useState(false);
  const [tipoFilter, setTipoFilter] = useState("");
  const [orden, setOrden] = useState<Orden>("reciente");
  const [abierta, setAbierta] = useState<number | null>(null);
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("analysis", folioAnalisis);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (estado) query.set("estado", estado);
      if (recepcionId) query.set("recepcion_id", recepcionId);
      if (showAnulados) query.set("anulados", "1");
      if (mias) query.set("mias", "1");
      const data = await getJsonAuth(`${API_BASE_URL}/samples/analysis?${query.toString()}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, estado, showAnulados, recepcionId, mias] },
  );
  const items = useMemo(() => {
    const lista = (resource.data || []).filter((item) => !tipoFilter || item.tipo_analisis === tipoFilter);
    if (orden === "fecha") return [...lista].sort((a, b) => String(b.fecha_analisis || "").localeCompare(String(a.fecha_analisis || "")));
    if (orden === "folio") return [...lista].sort((a, b) => Number(b.folio_num || 0) - Number(a.folio_num || 0) || Number(b.version || 1) - Number(a.version || 1));
    return lista;
  }, [resource.data, tipoFilter, orden]);
  const loaded = !!resource.data;
  const canCreate = can("ensayos", "C", { objeto: "analisis", borrador: true });
  const canDelete = can("ensayos", "AN");

  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: estado,
      defaultValue: "",
      onChange: (v) => setEstado(v as EstadoFilter),
      options: [
        { value: "", label: "Todos" },
        { value: "pendiente", label: "Por revisar o aprobar" },
        { value: "registrado", label: "En captura" },
        { value: "en_revision", label: "Por revisar" },
        { value: "revisado", label: "Por aprobar" },
        { value: "aprobado", label: "Aprobados" },
        { value: "sustituido", label: "Sustituidos (enmendados)" },
      ],
    },
    {
      key: "tipo",
      label: "Análisis",
      value: tipoFilter,
      defaultValue: "",
      onChange: setTipoFilter,
      options: [{ value: "", label: "Cualquiera" }, ...ANALYSIS_TYPES.map((t) => ({ value: t.value, label: t.short || t.label }))],
    },
  ];
  const ordenar: FilterGroup[] = [{ key: "orden", label: "Ordenar por", value: orden, defaultValue: "reciente", showDefault: true, onChange: (v) => setOrden(v as Orden), options: [{ value: "reciente", label: "Más recientes" }, { value: "fecha", label: "Fecha del análisis" }, { value: "folio", label: "Folio" }] }];
  const toggles: FilterToggle[] = [
    { key: "mias", label: "Mis muestras", checked: mias, onChange: setMias },
    { key: "anulados", label: "Mostrar anulados", checked: showAnulados, onChange: setShowAnulados },
    // Desde la ficha de una recepcion (?recepcion=): solo sus analisis, mientras este encendido.
    ...(recepcionParam ? [{ key: "recepcion", label: "Solo la recepción elegida", checked: soloRecepcion, onChange: setSoloRecepcion }] : []),
  ];

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulado = item.estado === "anulado";
    const list: MenuItem[] = [...reportar("muestras_analisis", item.id, folioAnalisis(item))];
    if (canDelete) {
      if (anulado) list.push({ label: "Restaurar análisis", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular análisis…", description: "Queda en la bitácora con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  return (
    <>
      <FranjaPendientes entidades={["muestras_analisis"]} grupo="analisis" />
      <Toolbar
        end={
          canCreate ? (
            <Link href="/muestras/analisis/nuevo" className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nuevo análisis
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, solicitante, ID o analista" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
      </Toolbar>

      <ListaCuadricula
        etiqueta="Análisis"
        columnas={COLUMNAS}
        filas={loaded ? items : null}
        error={resource.error}
        onReintentar={resource.reload}
        clave={(item) => String(item.id)}
        onAbrir={(_, i) => setAbierta(i)}
        activa={(_, i) => abierta === i}
        celdas={(item) => {
          const tipo = ANALYSIS_TYPES.find((t) => t.value === item.tipo_analisis);
          const metodo = item.metodo === "otro" ? item.metodo_otro : ANALYSIS_METHODS.find((m) => m.value === item.metodo)?.label;
          const anulado = item.estado === "anulado";
          const noConformes = Number(item.no_conformes || 0);
          return [
            <span key="f" className={cn("flex flex-col items-start gap-1", anulado && "opacity-60")}>
              <span className="flex flex-wrap items-center gap-1.5">
                <FolioChip type="A" num={item.folio_num} />
                {/* Las enmiendas conservan el folio con su version. */}
                {Number(item.version || 1) > 1 ? <Badge tone="warning">v{String(item.version)}</Badge> : null}
              </span>
              <span className="text-[12.5px] text-ink-3">{[tipo?.short || tipo?.label || String(item.tipo_analisis || ""), metodo ? String(metodo) : null].filter(Boolean).join(" · ")}</span>
            </span>,
            <span key="m" className={cn("flex flex-col items-start gap-1", anulado && "opacity-60")}>
              <span className="text-[13.5px] text-ink">{Number(item.muestras || 0) === 1 ? "1 muestra" : `${fmt(item.muestras || 0)} muestras`}</span>
              {noConformes > 0 ? <IndicadorConteo tono="danger">{noConformes === 1 ? "1 no cumple" : `${fmt(noConformes)} no cumplen`}</IndicadorConteo> : null}
              {item.recepcion_id_interno ? <span className="break-words text-[12px] text-ink-3">{String(item.recepcion_id_interno)}</span> : null}
            </span>,
            item.folio_recepcion_num || item.folio_extraccion_num ? (
              <span key="o" className="flex flex-wrap items-center gap-1.5">
                {item.folio_recepcion_num ? <FolioChip type="R" num={item.folio_recepcion_num} /> : null}
                {item.folio_extraccion_num ? <FolioChip type={String(item.tipo_extraccion || "E-A")} num={item.folio_extraccion_num} /> : null}
              </span>
            ) : (
              <SinDato key="o" />
            ),
            <span key="d" className="text-[13px] text-ink-2" title={formatearFecha(item.fecha_analisis)}>
              {formatearFechaCorta(item.fecha_analisis)}
            </span>,
            item.analista_nombre ? <FiguraPersona key="q" nombre={item.analista_nombre} conNombre /> : <SinDato key="q" />,
            <span key="e" className="flex flex-wrap items-center gap-1.5">
              <StateBadge kind="analisis" status={item.estado} />
              <SupervisionBadge estado={item.supervision_estado} />
            </span>,
          ];
        }}
        extremo={(item) => {
          const menu = menuFor(item);
          return (
            <>
              <span className="flex w-7 justify-center">
                <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="muestras_analisis" />
              </span>
              <span className="w-9">{menu.length ? <ActionMenu items={menu} header={folioAnalisis(item)} /> : null}</span>
            </>
          );
        }}
        anchoExtremo="84px"
        propsFila={(item) => ({ "data-analisis": String(item.id) })}
        vacio={{ icono: <TestTube size={20} />, titulo: search ? "Sin coincidencias" : "Sin análisis", descripcion: search ? "Prueba con otro término." : "Registra el análisis a partir de una extracción.", accion: canCreate && !search ? <Button onClick={() => router.push("/muestras/analisis/nuevo")}>Nuevo análisis</Button> : undefined }}
      />
      {loaded && items.length ? <p className="tnum mt-2 px-1 text-[12px] text-ink-4">{items.length === 1 ? "1 análisis" : `${fmt(items.length)} análisis`}</p> : null}

      <AnalisisVentana filas={items} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} />
    </>
  );
}
