"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowCounterClockwise, ArrowSquareOut, CaretDown, Flask, PencilSimple, Plus, Prohibit, TestTube } from "@phosphor-icons/react";
import { FolioChip, SampleStatus } from "@/components/features/samples/status";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, Dropdown, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { formatExtractionFolio, normalizeSampleStatus } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { EXTRACTION_TYPE_LIST, PLANNED_EXTRACTION_TYPES, extractionTypeMeta, normalizeExtractionType, type ExtractionType } from "@/lib/shared/extraction";

type TipoFilter = "" | ExtractionType;
type EtapaFilter = "" | "registrada" | "analizada";
type MoliendaFilter = "" | "fresca" | "congelada";

export default function ExtraccionListPage() {
  return (
    <RequireModule modules="muestras">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ExtraccionList />
      </Suspense>
    </RequireModule>
  );
}

function ExtraccionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<TipoFilter>(normalizeExtractionType(params.get("tipo")) || "");
  const [etapa, setEtapa] = useState<EtapaFilter>("");
  const [molienda, setMolienda] = useState<MoliendaFilter>("");
  const [showAnuladas, setShowAnuladas] = useState(false);
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("extraction", formatExtractionFolio);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (tipo) query.set("tipo", tipo);
      if (showAnuladas) query.set("anuladas", "1");
      const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction?${query.toString()}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, tipo, showAnuladas] },
  );
  const items = resource.data;

  const canCreate = can("muestras", "create");
  const canUpdate = can("muestras", "update");
  const canDelete = can("muestras", "delete");
  const newItems: MenuItem[] = [
    ...EXTRACTION_TYPE_LIST.map((meta) => ({ label: meta.label, description: meta.clave, icon: <Flask size={16} weight="duotone" />, tone: "brand" as const, onSelect: () => router.push(`/muestras/extraccion/nueva?tipo=${meta.tipo}`) })),
    ...PLANNED_EXTRACTION_TYPES.map((meta, index) => ({ label: meta.label, description: "Próximamente · formato pendiente del SGC", icon: <Flask size={16} weight="duotone" />, disabled: true, separatorBefore: index === 0 })),
  ];

  const count = (predicate: (item: ApiRecord) => boolean) => (items ? items.filter(predicate).length : null);
  const visible = useMemo(() => (items || []).filter((item) => (!etapa || normalizeSampleStatus(item.estado) === etapa) && (!molienda || item.tipo_molienda === molienda)), [items, etapa, molienda]);

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
      label: "Etapa",
      value: etapa,
      defaultValue: "",
      onChange: (v) => setEtapa(v as EtapaFilter),
      options: [
        { value: "", label: "Todas", count: items ? items.length : null },
        { value: "registrada", label: "Sin análisis", count: count((i) => normalizeSampleStatus(i.estado) === "registrada") },
        { value: "analizada", label: "Analizadas", count: count((i) => normalizeSampleStatus(i.estado) === "analizada") },
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
        { value: "fresca", label: "Fresca", count: count((i) => i.tipo_molienda === "fresca") },
        { value: "congelada", label: "Congelada", count: count((i) => i.tipo_molienda === "congelada") },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "anuladas", label: "Mostrar anuladas", checked: showAnuladas, onChange: setShowAnuladas }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulada = item.estado === "anulada";
    const list: MenuItem[] = [{ label: "Abrir", description: "Ver el formato completo", icon: <ArrowSquareOut size={16} weight="duotone" />, tone: "brand", onSelect: () => router.push(`/muestras/extraccion/${item.id}`) }];
    if (canUpdate && !anulada) list.push({ label: "Editar", description: "Corregir pasos, pesos o equipos", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => router.push(`/muestras/extraccion/${item.id}`) });
    if (canCreate && !anulada) list.push({ label: "Analizar", description: "Registrar el análisis de este extracto", icon: <TestTube size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/muestras/analisis/nuevo?extraccion=${item.id}`) });
    if (canDelete) {
      if (anulada) list.push({ label: "Restaurar extracción", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular extracción…", description: "Repone el inventario y queda en la bitácora", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  const filtered = !!(search || tipo || etapa || molienda);

  return (
    <>
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
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} extracciones${tipo ? ` ${extractionTypeMeta(tipo).short}` : ""}` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !visible.length ? (
          <EmptyState
            icon={<Flask size={20} />}
            title={filtered ? "Sin coincidencias" : "Sin extracciones"}
            description={filtered ? "Prueba con otro término o cambia los filtros." : "Registra la extracción a partir de un procesamiento."}
            action={canCreate && !filtered ? <Button onClick={() => router.push("/muestras/extraccion/nueva")}>Nueva extracción</Button> : undefined}
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Formato</Th>
                <Th>Muestra</Th>
                <Th>Procesamiento</Th>
                <Th>Extraída</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
                const meta = extractionTypeMeta(item.tipo_registro);
                const anulada = item.estado === "anulada";
                return (
                  <Tr key={item.id} interactive onClick={() => router.push(`/muestras/extraccion/${item.id}`)} className={anulada ? "opacity-60" : undefined}>
                    <Td>
                      <FolioChip type={meta.tipo} num={item.folio_num} />
                    </Td>
                    <Td>
                      <CellPrimary title={meta.short} subtitle={item.tipo_molienda === "congelada" ? "Molienda congelada" : item.tipo_molienda === "fresca" ? "Molienda fresca" : meta.clave} />
                    </Td>
                    <Td className="max-w-[220px]">
                      <CellPrimary title={item.id_interno || "—"} subtitle={item.muestra_tipo === "lote" ? "Lote" : "Muestra única"} />
                    </Td>
                    <Td>{item.folio_procesamiento_num ? <FolioChip type="P" num={item.folio_procesamiento_num} /> : <span className="text-[12.5px] text-ink-3">Sin vincular</span>}</Td>
                    <Td muted className="whitespace-nowrap">
                      {fmtDate(item.fecha_extraccion)}
                    </Td>
                    <Td>
                      <SampleStatus status={item.estado} />
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={`${formatExtractionFolio(item)} · ${meta.short}`} />
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
