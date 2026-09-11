"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowCounterClockwise, ArrowSquareOut, Flask, PencilSimple, Plus, Prohibit, TestTube } from "@phosphor-icons/react";
import { FolioChip, SampleStatus } from "@/components/features/samples/status";
import { useAnulacion } from "@/components/features/samples/useAnulacion";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { formatSampleFolio, getSampleTypeSummary, normalizeSampleStatus } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ACCEPTANCE_DECISIONS, RECEPTION_ANALYSIS_TYPES } from "@/lib/shared/sgc";

export default function RecepcionListPage() {
  return (
    <RequireModule modules="muestras">
      <RecepcionList />
    </RequireModule>
  );
}

const DECISION_TONE: Record<string, "success" | "warning" | "danger"> = { aceptada: "success", aceptada_con_desviacion: "warning", rechazada: "danger" };
const DECISION_SHORT: Record<string, string> = { aceptada: "Aceptada", aceptada_con_desviacion: "Con desviación", rechazada: "Rechazada" };
const ANALYSIS_SHORT: Record<string, string> = { acido_domoico: "ASP", toxinas_lipofilicas: "DSP", toxinas_paralizantes: "PSP", pigmentos: "Pigmentos", plancton: "Plancton", otro: "Otro" };

type EtapaFilter = "" | "registrada" | "aceptada" | "en_proceso" | "analizada" | "informada" | "cerrada" | "rechazada";
type DecisionFilter = "" | "aceptada" | "aceptada_con_desviacion" | "rechazada" | "pendiente";

function RecepcionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAnuladas, setShowAnuladas] = useState(false);
  const [etapa, setEtapa] = useState<EtapaFilter>("");
  const [decision, setDecision] = useState<DecisionFilter>("");
  const debounced = useDebouncedValue(search);
  const { anular, restaurar } = useAnulacion("reception", formatSampleFolio);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/reception?search=${encodeURIComponent(debounced.trim())}${showAnuladas ? "&anuladas=1" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showAnuladas] },
  );
  const items = resource.data;

  const canCreate = can("muestras", "create");
  const canUpdate = can("muestras", "update");
  const canDelete = can("muestras", "delete");

  const count = (predicate: (item: ApiRecord) => boolean) => (items ? items.filter(predicate).length : null);
  const visible = useMemo(() => {
    const list = items || [];
    return list.filter((item) => {
      const estado = normalizeSampleStatus(item.estado);
      if (etapa && estado !== etapa) return false;
      const dec = String(item.decision_aceptacion || "");
      if (decision === "pendiente" && dec) return false;
      if (decision && decision !== "pendiente" && dec !== decision) return false;
      return true;
    });
  }, [items, etapa, decision]);

  const groups: FilterGroup[] = [
    {
      key: "etapa",
      label: "Etapa",
      value: etapa,
      defaultValue: "",
      onChange: (v) => setEtapa(v as EtapaFilter),
      options: [
        { value: "", label: "Todas", count: items ? items.length : null },
        { value: "registrada", label: "Registradas", count: count((i) => normalizeSampleStatus(i.estado) === "registrada") },
        { value: "aceptada", label: "Aceptadas", count: count((i) => normalizeSampleStatus(i.estado) === "aceptada") },
        { value: "en_proceso", label: "En proceso", count: count((i) => normalizeSampleStatus(i.estado) === "en_proceso") },
        { value: "analizada", label: "Analizadas", count: count((i) => normalizeSampleStatus(i.estado) === "analizada") },
        { value: "informada", label: "Informadas", count: count((i) => normalizeSampleStatus(i.estado) === "informada") },
        { value: "cerrada", label: "Cerradas", count: count((i) => normalizeSampleStatus(i.estado) === "cerrada") },
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
        { value: "pendiente", label: "Sin decisión", count: count((i) => !i.decision_aceptacion), tone: "warning" },
        ...ACCEPTANCE_DECISIONS.map((d) => ({ value: d.value, label: DECISION_SHORT[d.value] || d.label, count: count((i) => i.decision_aceptacion === d.value) })),
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "anuladas", label: "Mostrar anuladas", description: "Incluye las recepciones anuladas con motivo.", checked: showAnuladas, onChange: setShowAnuladas }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const anulada = item.estado === "anulada";
    const puedeProcesar = canCreate && !anulada && ["aceptada", "aceptada_con_desviacion"].includes(String(item.decision_aceptacion || "")) && !["rechazada", "cerrada"].includes(String(item.estado));
    const list: MenuItem[] = [{ label: "Abrir", description: "Ver el formato completo", icon: <ArrowSquareOut size={16} weight="duotone" />, tone: "brand", onSelect: () => router.push(`/muestras/recepcion/${item.id}`) }];
    if (canUpdate && !anulada) list.push({ label: "Editar", description: "Cambiar datos o decidir la aceptación", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => router.push(`/muestras/recepcion/${item.id}`) });
    if (puedeProcesar) list.push({ label: "Procesar", description: "Crear el procesamiento de esta muestra", icon: <Flask size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/muestras/procesamiento/nuevo?recepcion=${item.id}`) });
    if (canDelete) {
      if (anulada) list.push({ label: "Restaurar recepción", description: "Vuelve a la lista con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => restaurar(item) });
      else list.push({ label: "Anular recepción…", description: "Queda en la bitácora con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => anular(item) });
    }
    return list;
  };

  return (
    <>
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
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} recepciones` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !visible.length ? (
          <EmptyState icon={<TestTube size={20} />} title={search || etapa || decision ? "Sin coincidencias" : "Sin recepciones"} description={search || etapa || decision ? "Prueba con otro término o cambia los filtros." : "La recepción es el primer paso del flujo de muestras."} action={canCreate && !search && !etapa && !decision ? <Button onClick={() => router.push("/muestras/recepcion/nueva")}>Nueva recepción</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Muestra</Th>
                <Th>Recibida</Th>
                <Th>Análisis</Th>
                <Th>Aceptación</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
                const anulada = item.estado === "anulada";
                const tipos: string[] = Array.isArray(item.analisis?.tipos) ? item.analisis.tipos : Array.isArray(item.tipos_analisis) ? item.tipos_analisis : [];
                const dec = String(item.decision_aceptacion || "");
                return (
                  <Tr key={item.id} interactive onClick={() => router.push(`/muestras/recepcion/${item.id}`)} className={anulada ? "opacity-60" : undefined}>
                    <Td>
                      <FolioChip type={String(item.tipo_registro || "R")} num={item.folio_num} />
                    </Td>
                    <Td className="max-w-[260px]">
                      <CellPrimary title={item.id_interno || (item.muestra_unica ? "—" : "Lote")} subtitle={[item.solicitante, getSampleTypeSummary(item)].filter(Boolean).join(" · ")} />
                    </Td>
                    <Td muted className="whitespace-nowrap">
                      {fmtDate(item.fecha_recepcion)}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {tipos.length ? (
                          tipos.map((t) => (
                            <span key={t} className="rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-[11.5px] font-medium text-ink-2">
                              {ANALYSIS_SHORT[t] || RECEPTION_ANALYSIS_TYPES.find((a) => a.value === t)?.label || t}
                            </span>
                          ))
                        ) : (
                          <span className="text-ink-4">—</span>
                        )}
                      </div>
                    </Td>
                    <Td>{dec ? <Badge tone={DECISION_TONE[dec]}>{DECISION_SHORT[dec] || dec}</Badge> : <span className="text-[12.5px] text-ink-3">Sin decisión</span>}</Td>
                    <Td>
                      <SampleStatus status={item.estado} />
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={`${formatSampleFolio(item)} · ${item.id_interno || "lote"}`} />
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
