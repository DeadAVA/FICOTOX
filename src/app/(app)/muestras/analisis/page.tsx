"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowCounterClockwise, ArrowSquareOut, PencilSimple, Plus, Prohibit, TestTube } from "@phosphor-icons/react";
import { FolioChip, StateBadge } from "@/components/features/samples/status";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useParamChange } from "@/lib/client/hooks";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ANALYSIS_METHODS, ANALYSIS_TYPES } from "@/lib/shared/sgc";

type EstadoFilter = "" | "pendiente" | "registrado" | "revisado" | "aprobado";
const ESTADOS: string[] = ["pendiente", "registrado", "revisado", "aprobado"];

export default function AnalisisListPage() {
  return (
    <RequireModule modules="muestras">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AnalisisList />
      </Suspense>
    </RequireModule>
  );
}

function AnalisisList() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const recepcionId = params.get("recepcion") || "";
  const [search, setSearch] = useState("");
  /* ?filtro= llega desde los avisos del Inicio y el buscador ("Análisis por revisar o aprobar"). */
  const initialFilter = useInitialParam("filtro");
  const [estado, setEstado] = useState<EstadoFilter>(ESTADOS.includes(initialFilter) ? (initialFilter as EstadoFilter) : "");
  useParamChange("filtro", (value) => setEstado(ESTADOS.includes(value) ? (value as EstadoFilter) : ""));
  const [showAnulados, setShowAnulados] = useState(false);
  const [tipoFilter, setTipoFilter] = useState("");
  const debounced = useDebouncedValue(search);
  const folioA = (item: ApiRecord) => `A ${String(Number(item.folio_num || 0)).padStart(7, "0")}`;
  const { anular, restaurar } = useAnulacion("analysis", folioA);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (estado) query.set("estado", estado);
      if (recepcionId) query.set("recepcion_id", recepcionId);
      if (showAnulados) query.set("anulados", "1");
      const data = await getJsonAuth(`${API_BASE_URL}/samples/analysis?${query.toString()}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, estado, showAnulados, recepcionId] },
  );
  const items = (resource.data || []).filter((item) => !tipoFilter || item.tipo_analisis === tipoFilter);
  const loaded = !!resource.data;
  const canCreate = can("muestras", "create");
  const canUpdate = can("muestras", "update");
  const canDelete = can("muestras", "delete");
  const count = (predicate: (item: ApiRecord) => boolean) => (resource.data ? resource.data.filter(predicate).length : null);

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
        { value: "registrado", label: "Por revisar" },
        { value: "revisado", label: "Por aprobar" },
        { value: "aprobado", label: "Aprobados" },
      ],
    },
    {
      key: "tipo",
      label: "Análisis",
      value: tipoFilter,
      defaultValue: "",
      onChange: setTipoFilter,
      options: [{ value: "", label: "Cualquiera" }, ...ANALYSIS_TYPES.map((t) => ({ value: t.value, label: t.short || t.label, count: count((i) => i.tipo_analisis === t.value) }))],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "anulados", label: "Mostrar anulados", checked: showAnulados, onChange: setShowAnulados }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulado = item.estado === "anulado";
    const editable = canUpdate && !anulado && item.estado === "registrado";
    const list: MenuItem[] = [{ label: "Abrir", description: item.estado === "aprobado" ? "Solo lectura: análisis aprobado" : "Ver resultados, controles y revisión", icon: <ArrowSquareOut size={16} weight="duotone" />, tone: "brand", onSelect: () => router.push(`/muestras/analisis/${item.id}`) }];
    if (editable) list.push({ label: "Editar", description: "Corregir resultados antes de la revisión", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => router.push(`/muestras/analisis/${item.id}`) });
    if (canDelete) {
      if (anulado) list.push({ label: "Restaurar análisis", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular análisis…", description: "Queda en la bitácora con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  return (
    <>
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
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
        {recepcionId ? <Badge tone="brand">Recepción #{recepcionId}</Badge> : null}
      </Toolbar>

      <TableShell footer={loaded ? `${fmt(items.length)} análisis` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !loaded ? (
          <TableSkeleton cols={7} />
        ) : !items.length ? (
          <EmptyState icon={<TestTube size={20} />} title={search ? "Sin coincidencias" : "Sin análisis"} description={search ? "Prueba con otro término." : "Registra el análisis a partir de una extracción."} action={canCreate && !search ? <Button onClick={() => router.push("/muestras/analisis/nuevo")}>Nuevo análisis</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio A</Th>
                <Th>Análisis</Th>
                <Th>Origen</Th>
                <Th>Fecha</Th>
                <Th>Muestras</Th>
                <Th>Analista</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const tipo = ANALYSIS_TYPES.find((t) => t.value === item.tipo_analisis);
                const metodo = item.metodo === "otro" ? item.metodo_otro : ANALYSIS_METHODS.find((m) => m.value === item.metodo)?.label;
                return (
                  <Tr key={item.id} interactive onClick={() => router.push(`/muestras/analisis/${item.id}`)} className={item.estado === "anulado" ? "opacity-60" : undefined}>
                    <Td>
                      <FolioChip type="A" num={item.folio_num} />
                    </Td>
                    <Td className="max-w-[220px]">
                      <CellPrimary title={tipo?.label || item.tipo_analisis} subtitle={metodo || "-"} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.folio_recepcion_num ? <FolioChip type="R" num={item.folio_recepcion_num} /> : null}
                        {item.folio_extraccion_num ? <FolioChip type={String(item.tipo_extraccion || "E-A")} num={item.folio_extraccion_num} /> : null}
                      </div>
                      {item.recepcion_id_interno ? <p className="mt-0.5 max-w-[220px] truncate text-[12px] text-ink-3">{item.recepcion_id_interno}</p> : null}
                    </Td>
                    <Td muted className="whitespace-nowrap">
                      {fmtDate(item.fecha_analisis)}
                    </Td>
                    <Td>
                      <span className="tnum">{fmt(item.muestras)}</span>
                      {Number(item.no_conformes) > 0 ? <Badge tone="danger" className="ml-2">{fmt(item.no_conformes)} no conforme(s)</Badge> : null}
                    </Td>
                    <Td muted>{item.analista_nombre || "-"}</Td>
                    <Td>
                      <StateBadge kind="analisis" status={item.estado} />
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={`${folioA(item)} · ${tipo?.short || ""}`} />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>
    </>
  );
}
