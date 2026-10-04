"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowCounterClockwise, Drop, Plus, Prohibit } from "@phosphor-icons/react";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { FolioChip, SampleStatus, SolicitudBadge, SupervisionBadge } from "@/components/features/samples/status";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { organismoDe, organismoLabel, ProcesamientoVentana } from "@/components/features/samples/ventanas/ProcesamientoVentana";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { SinDato } from "@/components/ui/Insignias";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { FranjaPendientes } from "@/components/features/solicitudes/Solicitudes";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { formatProcessingFolio, normalizeSampleStatus } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";

/*
 * Procesamiento (patron lista -> ventana de detalle): lista alineada (folio,
 * muestra, origen, fecha, quien lo proceso y estado), todos los filtros y el
 * orden dentro de "Filtros", y al pulsar un renglon la ventana de detalle. La
 * captura sigue en el formato completo.
 */

export default function ProcesamientoListPage() {
  return (
    <RequireModule modules="ensayos">
      <ProcesamientoList />
    </RequireModule>
  );
}

type EtapaFilter = "" | "registrada" | "en_proceso" | "completada";
type OrganismoFilter = "" | "bivalvos" | "sardinas" | "otro";
type Orden = "reciente" | "fecha" | "muestra";

const COLUMNAS: ColumnaLista[] = [
  { clave: "folio", titulo: "Folio", ancho: "130px" },
  { clave: "muestra", titulo: "Muestra", ancho: "minmax(180px,1.3fr)" },
  { clave: "origen", titulo: "Origen", ancho: "130px" },
  { clave: "fecha", titulo: "Procesada", ancho: "120px" },
  { clave: "quien", titulo: "Procesó", ancho: "minmax(170px,1fr)" },
  { clave: "estado", titulo: "Estado", ancho: "minmax(150px,0.9fr)" },
];

function ProcesamientoList() {
  const { token, can } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [mias, setMias] = useState(false);
  const [etapa, setEtapa] = useState<EtapaFilter>("");
  const [organismo, setOrganismo] = useState<OrganismoFilter>("");
  const [orden, setOrden] = useState<Orden>("reciente");
  const [abierta, setAbierta] = useState<number | null>(null);
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("processing", formatProcessingFolio);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/processing?search=${encodeURIComponent(debounced.trim())}${showAnuladas ? "&anuladas=1" : ""}${mias ? "&mias=1" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showAnuladas, mias] },
  );
  const items = resource.data;

  const canCreate = can("ensayos", "C", { objeto: "procesamiento", borrador: true });
  const canExtraer = can("ensayos", "C", { objeto: "extraccion", borrador: true });
  const canDelete = can("ensayos", "AN");

  const visible = useMemo(() => {
    const lista = (items || []).filter((item) => (!etapa || normalizeSampleStatus(item.estado) === etapa) && (!organismo || organismoDe(item) === organismo));
    if (orden === "fecha") return [...lista].sort((a, b) => String(b.fecha_procesamiento || "").localeCompare(String(a.fecha_procesamiento || "")));
    if (orden === "muestra") return [...lista].sort((a, b) => String(a.id_interno || "").localeCompare(String(b.id_interno || ""), "es"));
    return lista;
  }, [items, etapa, organismo, orden]);

  const groups: FilterGroup[] = [
    {
      key: "etapa",
      label: "Estado",
      value: etapa,
      defaultValue: "",
      onChange: (v) => setEtapa(v as EtapaFilter),
      options: [
        { value: "", label: "Todos" },
        { value: "registrada", label: "Registrados" },
        { value: "en_proceso", label: "En proceso" },
        { value: "completada", label: "Completados" },
      ],
    },
    {
      key: "organismo",
      label: "Organismo",
      value: organismo,
      defaultValue: "",
      onChange: (v) => setOrganismo(v as OrganismoFilter),
      options: [
        { value: "", label: "Cualquiera" },
        { value: "bivalvos", label: "Bivalvos" },
        { value: "sardinas", label: "Sardinas" },
        { value: "otro", label: "Otro" },
      ],
    },
  ];
  const ordenar: FilterGroup[] = [{ key: "orden", label: "Ordenar por", value: orden, defaultValue: "reciente", showDefault: true, onChange: (v) => setOrden(v as Orden), options: [{ value: "reciente", label: "Folio más reciente" }, { value: "fecha", label: "Fecha de procesamiento" }, { value: "muestra", label: "ID interno A–Z" }] }];
  const toggles: FilterToggle[] = [{ key: "mias", label: "Mis muestras", checked: mias, onChange: setMias }, { key: "anulados", label: "Mostrar anulados", checked: showAnuladas, onChange: setShowAnuladas }];
  const filtrando = !!(search || etapa || organismo);

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulada = item.estado === "anulada";
    const list: MenuItem[] = [];
    if (canExtraer && !anulada) list.push({ label: "Extraer", description: "Nueva extracción ASP o DSP de esta molienda", icon: <Drop size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/muestras/extraccion/nueva?procesamiento=${item.id}`) });
    list.push(...reportar("muestras_procesamiento", item.id, formatProcessingFolio(item)));
    if (canDelete) {
      if (anulada) list.push({ label: "Restaurar procesamiento", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular procesamiento…", description: "Queda en la bitácora con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  return (
    <>
      <FranjaPendientes entidades={["muestras_procesamiento"]} grupo="procesamiento" />
      <Toolbar
        end={
          canCreate ? (
            <Link href="/muestras/procesamiento/nuevo" className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nuevo procesamiento
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio P, folio R o ID interno" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
      </Toolbar>

      <ListaCuadricula
        etiqueta="Procesamientos"
        columnas={COLUMNAS}
        filas={items ? visible : null}
        error={resource.error}
        onReintentar={resource.reload}
        clave={(item) => String(item.id)}
        onAbrir={(_, i) => setAbierta(i)}
        activa={(_, i) => abierta === i}
        celdas={(item) => {
          const anulada = item.estado === "anulada";
          const lote = item.muestra_tipo === "lote";
          return [
            <span key="f" className={cn(anulada && "opacity-60")}>
              <FolioChip type="P" num={item.folio_num} />
            </span>,
            <span key="m" className={cn("flex flex-col", anulada && "opacity-60")}>
              <span className="break-words text-[14px] font-medium text-ink">{String(item.id_interno || "—")}</span>
              <span className="text-[12.5px] text-ink-3">{[lote ? "Lote" : "Muestra única", organismoLabel(item) || null].filter(Boolean).join(" · ")}</span>
            </span>,
            item.folio_recepcion_num ? <FolioChip key="o" type="R" num={item.folio_recepcion_num} /> : <SinDato key="o" />,
            <span key="d" className="text-[13px] text-ink-2" title={formatearFecha(item.fecha_procesamiento)}>
              {formatearFechaCorta(item.fecha_procesamiento)}
            </span>,
            item.nombre_quien_proceso ? <FiguraPersona key="q" nombre={item.nombre_quien_proceso} conNombre /> : <SinDato key="q" />,
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
                <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="muestras_procesamiento" />
              </span>
              <span className="w-9">{menu.length ? <ActionMenu items={menu} header={`${formatProcessingFolio(item)} · ${item.id_interno || "lote"}`} /> : null}</span>
            </>
          );
        }}
        anchoExtremo="84px"
        propsFila={(item) => ({ "data-procesamiento": String(item.id) })}
        vacio={{ icono: <Drop size={20} />, titulo: filtrando ? "Sin coincidencias" : "Sin procesamientos", descripcion: filtrando ? "Prueba con otro término o cambia los filtros." : "Procesa una recepción aceptada para continuar el flujo.", accion: canCreate && !filtrando ? <Button onClick={() => router.push("/muestras/procesamiento/nuevo")}>Nuevo procesamiento</Button> : undefined }}
      />
      {items && visible.length ? <p className="tnum mt-2 px-1 text-[12px] text-ink-4">{visible.length === 1 ? "1 procesamiento" : `${fmt(visible.length)} procesamientos`}</p> : null}

      <ProcesamientoVentana filas={visible} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} />
    </>
  );
}
