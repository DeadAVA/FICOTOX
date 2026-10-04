"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FilePdf, FileText, Plus, X } from "@phosphor-icons/react";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { InformeVentana } from "@/components/features/informes/ventanas/InformeVentana";
import { FolioChip, StateBadge, SolicitudBadge, SupervisionBadge } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { FranjaPendientes } from "@/components/features/solicitudes/Solicitudes";
import { StatusCell, StatusFlag } from "@/components/ui/StatusFlag";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { useDebouncedValue, useParamChange } from "@/lib/client/hooks";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";

type EstadoFilter = "" | "pendiente" | "borrador" | "en_revision" | "autorizado" | "liberado" | "enviado" | "requiere_enmienda" | "sustituido";
const ESTADOS: string[] = ["pendiente", "borrador", "en_revision", "autorizado", "liberado", "enviado", "requiere_enmienda", "sustituido"];
type Orden = "recientes" | "folio" | "emision";

/*
 * Informes de resultados (patron lista -> ventana): columnas fijas (folio y
 * version, cliente, recepcion, estado con sus indicadores, emision y quien
 * autorizo); todos los filtros y el orden dentro de "Filtros"; el clic abre la
 * ventana del informe (flujo, cliente, analisis, envios, PDF y la accion que
 * sigue) con "Abrir formato completo". El menu ⋯ solo tiene lo relevante.
 */

const COLUMNAS: ColumnaLista[] = [
  { clave: "folio", titulo: "Folio", ancho: "minmax(150px,0.8fr)" },
  { clave: "cliente", titulo: "Cliente", ancho: "minmax(200px,1.4fr)" },
  { clave: "recepcion", titulo: "Recepción", ancho: "minmax(120px,0.7fr)" },
  { clave: "estado", titulo: "Estado", ancho: "minmax(170px,1fr)" },
  { clave: "emision", titulo: "Emisión", ancho: "120px" },
  { clave: "autorizo", titulo: "Autorizó", ancho: "minmax(170px,1fr)" },
];

export default function InformesPage() {
  return (
    <PageBody>
      <PageHeader title="Informes de resultados" description="Elaboración, revisión, autorización, liberación y envío por correo de informes al cliente (ISO/IEC 17025 7.8)." />
      <RequireModule modules="informes">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <InformesContent />
        </Suspense>
      </RequireModule>
    </PageBody>
  );
}

function celdas(item: ApiRecord) {
  const terminal = ["anulado", "sustituido"].includes(String(item.estado));
  return [
    <span key="f" className={terminal ? "flex flex-wrap items-center gap-2 opacity-60" : "flex flex-wrap items-center gap-2"}>
      <FolioChip type="IR" num={item.folio_num} />
      {Number(item.version) > 1 ? <Badge tone="warning">v{String(item.version)}</Badge> : null}
    </span>,
    <span key="c" className="flex min-w-0 flex-col">
      <span className="text-[14px] leading-tight font-semibold text-ink">{String((item.cliente as ApiRecord)?.nombre || item.solicitante || "—")}</span>
      {item.recepcion_id_interno ? <span className="text-[12.5px] text-ink-3">{String(item.recepcion_id_interno)}</span> : null}
    </span>,
    item.folio_recepcion_num ? <FolioChip key="r" type="R" num={item.folio_recepcion_num} /> : <span key="r" className="text-[13px] text-ink-4">—</span>,
    <span key="e" className="flex flex-col items-start gap-1">
      <StatusCell>
        <StateBadge kind="informe" status={item.estado} />
        <SupervisionBadge estado={item.supervision_estado} />
        {Number(item.retenido || 0) ? <StatusFlag kind="bloqueo" label="Retenido por una no conformidad" detail="No se libera ni se envía hasta liberar la retención." data-retenido /> : null}
        {Number(item.requiere_enmienda || 0) ? <StatusFlag kind="aviso" label="Requiere enmienda" detail={item.requiere_enmienda_motivo ? String(item.requiere_enmienda_motivo) : undefined} data-requiere-enmienda /> : null}
      </StatusCell>
      {item.liberado_en ? <span className="text-[12px] text-ink-3">Liberado {formatearFechaCorta(item.liberado_en)}</span> : null}
    </span>,
    <span key="m" className="text-[13px] text-ink-2" title={item.fecha_emision ? formatearFecha(item.fecha_emision) : undefined}>
      {item.fecha_emision ? formatearFechaCorta(item.fecha_emision) : <span className="text-ink-4">—</span>}
    </span>,
    item.autorizado_nombre ? <FiguraPersona key="a" id={item.autorizado_por} nombre={item.autorizado_nombre} conNombre /> : <span key="a" className="text-[13px] text-ink-4">—</span>,
  ];
}

function InformesContent() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const recepcionId = params.get("recepcion") || "";
  const [search, setSearch] = useState("");
  const initialFilter = params.get("filtro") || "";
  const [estado, setEstado] = useState<EstadoFilter>(ESTADOS.includes(initialFilter) ? (initialFilter as EstadoFilter) : "");
  const [showAnulados, setShowAnulados] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [abierta, setAbierta] = useState<number | null>(null);
  const debounced = useDebouncedValue(search);
  useParamChange("filtro", (value) => setEstado(ESTADOS.includes(value) ? (value as EstadoFilter) : ""));

  const resource = useResource<{ items: ApiRecord[] }>(
    "informes",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (estado) query.set("estado", estado);
      if (recepcionId) query.set("recepcion_id", recepcionId);
      if (showAnulados) query.set("anulados", "1");
      const list = await getJsonAuth(`${API_BASE_URL}/informes?${query.toString()}`, token);
      return { items: (list.items || []) as ApiRecord[] };
    },
    { enabled: !!token, deps: [debounced, estado, showAnulados, recepcionId] },
  );
  const items = useMemo(() => {
    const lista = [...(resource.data?.items || [])];
    if (orden === "folio") lista.sort((a, b) => Number(b.folio_num || 0) - Number(a.folio_num || 0) || Number(b.version || 0) - Number(a.version || 0));
    else if (orden === "emision") lista.sort((a, b) => String(b.fecha_emision || "").localeCompare(String(a.fecha_emision || "")));
    return lista;
  }, [resource.data, orden]);
  const canCreate = can("informes", "C");

  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: estado,
      defaultValue: "",
      onChange: (v) => setEstado(v as EstadoFilter),
      options: [
        { value: "", label: "Todos" },
        { value: "pendiente", label: "Por revisar o autorizar" },
        { value: "borrador", label: "Borradores" },
        { value: "en_revision", label: "En revisión" },
        { value: "autorizado", label: "Autorizados por liberar" },
        { value: "liberado", label: "Liberados por enviar" },
        { value: "enviado", label: "Enviados" },
        { value: "requiere_enmienda", label: "Requieren enmienda" },
        { value: "sustituido", label: "Sustituidos por enmienda" },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "anulados", label: "Mostrar anulados", checked: showAnulados, onChange: setShowAnulados }];
  const ordenar: FilterGroup[] = [
    { key: "orden", label: "Ordenar por", value: orden, defaultValue: "recientes", showDefault: true, onChange: (v) => setOrden(v as Orden), options: [{ value: "recientes", label: "Más recientes" }, { value: "folio", label: "Folio" }, { value: "emision", label: "Fecha de emisión" }] },
  ];

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => [
    { label: ["liberado", "enviado", "sustituido", "anulado"].includes(String(item.estado)) ? "Ver PDF" : "Vista previa del PDF", icon: <FilePdf size={16} weight="duotone" />, onSelect: () => openProtectedFile(`${API_BASE_URL}/informes/${item.id}/pdf`, token, `${String(item.folio || "informe").replace(/\s+/g, "-")}.pdf`) },
    ...reportar("informes", item.id, String(item.folio || "Informe")),
  ];
  const filtrando = !!search.trim() || !!estado || showAnulados;

  return (
    <>
      <FranjaPendientes entidades={["informes"]} grupo="informes" />
      <Toolbar
        end={
          canCreate ? (
            <Link href="/informes/nuevo" className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nuevo informe
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, cliente o ID interno" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
        {recepcionId ? (
          <Link href="/informes" className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[12.5px] font-medium text-brand-strong hover:bg-brand-soft/70">
            Solo de una recepción <X size={12} weight="bold" aria-label="Quitar" />
          </Link>
        ) : null}
      </Toolbar>

      <ListaCuadricula
        etiqueta="Informes"
        columnas={COLUMNAS}
        filas={resource.data ? items : null}
        error={resource.error}
        onReintentar={resource.reload}
        clave={(item) => String(item.id)}
        onAbrir={(_, i) => setAbierta(i)}
        activa={(_, i) => abierta === i}
        celdas={celdas}
        extremo={(item) => (
          <>
            <span className="flex w-7 justify-center">
              <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="informes" />
            </span>
            <span className="w-9">
              <ActionMenu items={menuFor(item)} header={String(item.folio || "")} />
            </span>
          </>
        )}
        anchoExtremo="84px"
        propsFila={(item) => ({ "data-informe": String(item.id) })}
        vacio={{
          icono: <FileText size={20} />,
          titulo: filtrando ? "Sin coincidencias" : "Sin informes",
          descripcion: filtrando ? "Prueba con otro término o cambia los filtros." : "Crea el informe a partir de una recepción con análisis aprobados.",
          accion: canCreate && !filtrando ? <Button onClick={() => router.push("/informes/nuevo")}>Nuevo informe</Button> : undefined,
        }}
      />

      <InformeVentana items={items} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} />
    </>
  );
}
