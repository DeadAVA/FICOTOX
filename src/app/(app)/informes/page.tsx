"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowSquareOut, FilePdf, FileText, Plus } from "@phosphor-icons/react";
import { FolioChip, StateBadge } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useParamChange } from "@/lib/client/hooks";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

type EstadoFilter = "" | "pendiente" | "borrador" | "en_revision" | "autorizado" | "entregado" | "sustituido";
const ESTADOS: string[] = ["pendiente", "borrador", "en_revision", "autorizado", "entregado", "sustituido"];

export default function InformesPage() {
  return (
    <PageBody>
      <PageHeader title="Informes de resultados" description="Elaboración, revisión, autorización y entrega de informes al cliente (ISO/IEC 17025 7.8)." />
      <RequireModule modules="informes">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <InformesContent />
        </Suspense>
      </RequireModule>
    </PageBody>
  );
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
  const debounced = useDebouncedValue(search);
  useParamChange("filtro", (value) => setEstado(ESTADOS.includes(value) ? (value as EstadoFilter) : ""));

  const resource = useResource<{ items: ApiRecord[]; summary: ApiRecord }>(
    "informes",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim() });
      if (estado) query.set("estado", estado);
      if (recepcionId) query.set("recepcion_id", recepcionId);
      if (showAnulados) query.set("anulados", "1");
      const [list, summary] = await Promise.all([getJsonAuth(`${API_BASE_URL}/informes?${query.toString()}`, token), getJsonAuth(`${API_BASE_URL}/informes/summary`, token).catch(() => ({}))]);
      return { items: (list.items || []) as ApiRecord[], summary: summary as ApiRecord };
    },
    { enabled: !!token, deps: [debounced, estado, showAnulados, recepcionId] },
  );
  const items = resource.data?.items;
  const summary = resource.data?.summary || {};
  const canCreate = can("informes", "create");

  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: estado,
      defaultValue: "",
      onChange: (v) => setEstado(v as EstadoFilter),
      options: [
        { value: "", label: "Todos" },
        { value: "pendiente", label: "Por revisar o autorizar", count: resource.data ? Number(summary.borrador || 0) + Number(summary.en_revision || 0) : null, tone: Number(summary.borrador || 0) + Number(summary.en_revision || 0) ? "warning" : "neutral" },
        { value: "borrador", label: "Borradores", count: resource.data ? Number(summary.borrador || 0) : null },
        { value: "en_revision", label: "En revisión", count: resource.data ? Number(summary.en_revision || 0) : null, tone: summary.en_revision ? "warning" : "neutral" },
        { value: "autorizado", label: "Autorizados por entregar", count: resource.data ? Number(summary.autorizados || 0) : null },
        { value: "entregado", label: "Entregados", count: resource.data ? Number(summary.entregados || 0) : null },
        { value: "sustituido", label: "Sustituidos por enmienda" },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "anulados", label: "Mostrar anulados", checked: showAnulados, onChange: setShowAnulados }];

  const menuFor = (item: ApiRecord): MenuItem[] => [
    { label: "Abrir", description: "Ver el informe y su historial", icon: <ArrowSquareOut size={16} weight="duotone" />, tone: "brand", onSelect: () => router.push(`/informes/${item.id}`) },
    { label: "Ver PDF", description: item.estado === "borrador" || item.estado === "en_revision" ? "Vista previa (sin validez)" : "Documento autorizado con SHA-256", icon: <FilePdf size={16} weight="duotone" />, onSelect: () => openProtectedFile(`${API_BASE_URL}/informes/${item.id}/pdf`, token, `${String(item.folio || "informe").replace(/\s+/g, "-")}.pdf`) },
  ];

  return (
    <>
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
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
        {recepcionId ? <Badge tone="brand">Recepción #{recepcionId}</Badge> : null}
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} informes` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={7} />
        ) : !items.length ? (
          <EmptyState icon={<FileText size={20} />} title={search ? "Sin coincidencias" : "Sin informes"} description={search ? "Prueba con otro término." : "Crea el informe a partir de una recepción con análisis aprobados."} action={canCreate && !search ? <Button onClick={() => router.push("/informes/nuevo")}>Nuevo informe</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Cliente</Th>
                <Th>Recepción</Th>
                <Th>Análisis</Th>
                <Th>Emisión</Th>
                <Th>Autorizó</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/informes/${item.id}`)} className={["anulado", "sustituido"].includes(String(item.estado)) ? "opacity-60" : undefined}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <FolioChip type="IR" num={item.folio_num} />
                      {Number(item.version) > 1 ? <Badge tone="warning">v{String(item.version)}</Badge> : null}
                    </span>
                  </Td>
                  <Td className="max-w-[260px]">
                    <CellPrimary title={(item.cliente as ApiRecord)?.nombre || item.solicitante || "-"} subtitle={item.recepcion_id_interno || undefined} />
                  </Td>
                  <Td>{item.folio_recepcion_num ? <FolioChip type="R" num={item.folio_recepcion_num} /> : "-"}</Td>
                  <Td className="tnum">{fmt(item.analisis)}</Td>
                  <Td muted>{fmtDate(item.fecha_emision)}</Td>
                  <Td muted>{item.autorizado_nombre || "-"}</Td>
                  <Td>
                    <StateBadge kind="informe" status={item.estado} />
                    {item.estado === "entregado" && (item.entrega as ApiRecord)?.fecha ? <p className="mt-0.5 text-[11.5px] text-ink-3">Entregado {fmtDate((item.entrega as ApiRecord).fecha)}</p> : null}
                  </Td>
                  <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                    <ActionMenu items={menuFor(item)} header={String(item.folio || "")} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>
    </>
  );
}
