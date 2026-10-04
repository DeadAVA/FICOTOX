"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowCounterClockwise, CaretDown, Flask, Plus, Prohibit, TestTube } from "@phosphor-icons/react";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { FolioChip, SampleStatus, SolicitudBadge, SupervisionBadge } from "@/components/features/samples/status";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { ExtraccionVentana, moliendaLabel } from "@/components/features/samples/ventanas/ExtraccionVentana";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { SinDato } from "@/components/ui/Insignias";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, Dropdown, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Primitives";
import { FranjaPendientes } from "@/components/features/solicitudes/Solicitudes";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { formatExtractionFolio, normalizeSampleStatus } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { EXTRACTION_TYPE_LIST, PLANNED_EXTRACTION_TYPES, extractionTypeMeta, normalizeExtractionType, type ExtractionType } from "@/lib/shared/extraction";

/*
 * Extraccion (patron lista -> ventana de detalle): lista alineada (folio y
 * formato, muestra, origen, fecha y estado), todos los filtros y el orden
 * dentro de "Filtros", y al pulsar un renglon la ventana de detalle. La
 * captura sigue en el formato completo.
 */

type TipoFilter = "" | ExtractionType;
type EtapaFilter = "" | "registrada" | "analizada";
type MoliendaFilter = "" | "fresca" | "congelada";
type Orden = "reciente" | "folio" | "muestra";

export default function ExtraccionListPage() {
  return (
    <RequireModule modules="ensayos">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ExtraccionList />
      </Suspense>
    </RequireModule>
  );
}

const COLUMNAS: ColumnaLista[] = [
  { clave: "folio", titulo: "Folio y formato", ancho: "minmax(170px,1fr)" },
  { clave: "muestra", titulo: "Muestra", ancho: "minmax(180px,1.3fr)" },
  { clave: "origen", titulo: "Origen", ancho: "130px" },
  { clave: "fecha", titulo: "Extraída", ancho: "120px" },
  { clave: "estado", titulo: "Estado", ancho: "minmax(150px,0.9fr)" },
];

function ExtraccionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<TipoFilter>(normalizeExtractionType(params.get("tipo")) || "");
  const [etapa, setEtapa] = useState<EtapaFilter>("");
  const [molienda, setMolienda] = useState<MoliendaFilter>("");
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [mias, setMias] = useState(false);
  const [orden, setOrden] = useState<Orden>("reciente");
  const [abierta, setAbierta] = useState<number | null>(null);
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("extraction", formatExtractionFolio);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (tipo) query.set("tipo", tipo);
      if (showAnuladas) query.set("anuladas", "1");
      if (mias) query.set("mias", "1");
      const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction?${query.toString()}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, tipo, showAnuladas, mias] },
  );
  const items = resource.data;

  const canCreate = can("ensayos", "C", { objeto: "extraccion", borrador: true });
  const canAnalizar = can("ensayos", "C", { objeto: "analisis", borrador: true });
  const canDelete = can("ensayos", "AN");
  const newItems: MenuItem[] = [
    ...EXTRACTION_TYPE_LIST.map((meta) => ({ label: meta.label, description: meta.clave, icon: <Flask size={16} weight="duotone" />, tone: "brand" as const, onSelect: () => router.push(`/muestras/extraccion/nueva?tipo=${meta.tipo}`) })),
    ...PLANNED_EXTRACTION_TYPES.map((meta, index) => ({ label: meta.label, description: "Próximamente · formato pendiente del SGC", icon: <Flask size={16} weight="duotone" />, disabled: true, separatorBefore: index === 0 })),
  ];

  const visible = useMemo(() => {
    const lista = (items || []).filter((item) => (!etapa || normalizeSampleStatus(item.estado) === etapa) && (!molienda || item.tipo_molienda === molienda));
    if (orden === "folio") return [...lista].sort((a, b) => Number(b.folio_num || 0) - Number(a.folio_num || 0));
    if (orden === "muestra") return [...lista].sort((a, b) => String(a.id_interno || "").localeCompare(String(b.id_interno || ""), "es"));
    return lista;
  }, [items, etapa, molienda, orden]);

  const groups: FilterGroup[] = [
    {
      key: "formato",
      label: "Formato",
      value: tipo,
      defaultValue: "",
      onChange: (v) => setTipo(v as TipoFilter),
      options: [
        { value: "", label: "Todos" },
        ...EXTRACTION_TYPE_LIST.map((meta) => ({ value: meta.tipo, label: `${meta.short} · ${meta.toxina.split(" (")[0]}` })),
        ...PLANNED_EXTRACTION_TYPES.map((meta) => ({ value: meta.tipo, label: meta.label, disabled: true, hint: "Próximamente" })),
      ],
    },
    {
      key: "etapa",
      label: "Estado",
      value: etapa,
      defaultValue: "",
      onChange: (v) => setEtapa(v as EtapaFilter),
      options: [
        { value: "", label: "Todas" },
        { value: "registrada", label: "Sin análisis" },
        { value: "analizada", label: "Analizadas" },
      ],
    },
    {
      key: "molienda",
      label: "Molienda",
      value: molienda,
      defaultValue: "",
      onChange: (v) => setMolienda(v as MoliendaFilter),
      options: [
        { value: "", label: "Cualquiera" },
        { value: "fresca", label: "Fresca" },
        { value: "congelada", label: "Congelada" },
      ],
    },
  ];
  const ordenar: FilterGroup[] = [{ key: "orden", label: "Ordenar por", value: orden, defaultValue: "reciente", showDefault: true, onChange: (v) => setOrden(v as Orden), options: [{ value: "reciente", label: "Fecha de extracción" }, { value: "folio", label: "Folio" }, { value: "muestra", label: "ID interno A–Z" }] }];
  const toggles: FilterToggle[] = [{ key: "mias", label: "Mis muestras", checked: mias, onChange: setMias }, { key: "anuladas", label: "Mostrar anuladas", checked: showAnuladas, onChange: setShowAnuladas }];

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulada = item.estado === "anulada";
    const list: MenuItem[] = [];
    if (canAnalizar && !anulada) list.push({ label: "Analizar", description: "Registrar el análisis de este extracto", icon: <TestTube size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/muestras/analisis/nuevo?extraccion=${item.id}`) });
    list.push(...reportar("muestras_extraccion", item.id, formatExtractionFolio(item)));
    if (canDelete) {
      if (anulada) list.push({ label: "Restaurar extracción", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular extracción…", description: "Repone el inventario y queda en la bitácora", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  const filtered = !!(search || tipo || etapa || molienda);

  return (
    <>
      <FranjaPendientes entidades={["muestras_extraccion"]} grupo="extraccion" />
      <Toolbar
        end={
          canCreate ? (
            <Dropdown
              label="Nueva extracción"
              trigger={
                <Button icon={<Plus size={16} weight="bold" />} iconRight={<CaretDown size={14} weight="bold" />}>
                  Nueva extracción
                </Button>
              }
              items={newItems}
            />
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio (E-D 12), folio P o ID interno" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
      </Toolbar>

      <ListaCuadricula
        etiqueta="Extracciones"
        columnas={COLUMNAS}
        filas={items ? visible : null}
        error={resource.error}
        onReintentar={resource.reload}
        clave={(item) => String(item.id)}
        onAbrir={(_, i) => setAbierta(i)}
        activa={(_, i) => abierta === i}
        celdas={(item) => {
          const meta = extractionTypeMeta(item.tipo_registro);
          const anulada = item.estado === "anulada";
          return [
            <span key="f" className={cn("flex flex-col items-start gap-1", anulada && "opacity-60")}>
              <FolioChip type={meta.tipo} num={item.folio_num} />
              <span className="text-[12.5px] text-ink-3">{[meta.short, moliendaLabel(item) || null].filter(Boolean).join(" · ")}</span>
            </span>,
            <span key="m" className={cn("flex flex-col", anulada && "opacity-60")}>
              <span className="break-words text-[14px] font-medium text-ink">{String(item.id_interno || "—")}</span>
              <span className="text-[12.5px] text-ink-3">{item.muestra_tipo === "lote" ? "Lote" : "Muestra única"}</span>
            </span>,
            item.folio_procesamiento_num ? <FolioChip key="o" type="P" num={item.folio_procesamiento_num} /> : <SinDato key="o" />,
            <span key="d" className="text-[13px] text-ink-2" title={formatearFecha(item.fecha_extraccion)}>
              {formatearFechaCorta(item.fecha_extraccion)}
            </span>,
            <span key="e" className="flex flex-wrap items-center gap-1.5">
              <SampleStatus status={item.estado} />
              <SupervisionBadge estado={item.supervision_estado} />
            </span>,
          ];
        }}
        extremo={(item) => {
          const menu = menuFor(item);
          return (
            <>
              <span className="flex w-7 justify-center">
                <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="muestras_extraccion" />
              </span>
              <span className="w-9">{menu.length ? <ActionMenu items={menu} header={`${formatExtractionFolio(item)} · ${extractionTypeMeta(item.tipo_registro).short}`} /> : null}</span>
            </>
          );
        }}
        anchoExtremo="84px"
        propsFila={(item) => ({ "data-extraccion": String(item.id) })}
        vacio={{ icono: <Flask size={20} />, titulo: filtered ? "Sin coincidencias" : "Sin extracciones", descripcion: filtered ? "Prueba con otro término o cambia los filtros." : "Registra la extracción a partir de un procesamiento.", accion: canCreate && !filtered ? <Button onClick={() => router.push("/muestras/extraccion/nueva")}>Nueva extracción</Button> : undefined }}
      />
      {items && visible.length ? <p className="tnum mt-2 px-1 text-[12px] text-ink-4">{visible.length === 1 ? "1 extracción" : `${fmt(visible.length)} extracciones`}{tipo ? ` ${extractionTypeMeta(tipo).short}` : ""}</p> : null}

      <ExtraccionVentana filas={visible} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} />
    </>
  );
}
