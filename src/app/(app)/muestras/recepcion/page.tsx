"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, DotsThree, PencilSimple, Plus, TestTube, Trash } from "@phosphor-icons/react";
import { FolioChip, SampleStatus } from "@/components/features/samples/status";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Dropdown, Tooltip, useConfirm } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { getSampleAnalysisSummary, getSampleTypeSummary } from "@/lib/client/samples";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function RecepcionListPage() {
  return (
    <RequireModule modules="muestras">
      <RecepcionList />
    </RequireModule>
  );
}

function RecepcionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/reception?search=${encodeURIComponent(debounced.trim())}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced] },
  );
  const items = resource.data;

  const remove = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar recepción", description: "Se eliminará el registro de recepción. Los procesamientos vinculados conservarán el folio como referencia.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/reception/${item.id}`, token);
      toast.success("Recepción eliminada");
      invalidate("muestras", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("muestras", "create");
  const canUpdate = can("muestras", "update");
  const canDelete = can("muestras", "delete");

  return (
    <>
      <Toolbar
        end={
          canCreate ? (
            <Link href="/muestras/recepcion/nueva" className="press inline-flex h-9 items-center gap-2 rounded-control bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nueva recepción
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, solicitante o ID interno" className="w-full md:w-[380px]" />
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} recepciones` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<TestTube size={20} />} title={search ? "Sin coincidencias" : "Sin recepciones"} description={search ? "Prueba con otro término." : "La recepción es el primer paso del flujo de muestras."} action={canCreate && !search ? <Button onClick={() => router.push("/muestras/recepcion/nueva")}>Nueva recepción</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Recepción</Th>
                <Th>Solicitante</Th>
                <Th>Muestra</Th>
                <Th>Análisis</Th>
                <Th>Estado</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/muestras/recepcion/${item.id}`)}>
                  <Td>
                    <FolioChip type={String(item.tipo_registro || "R")} num={item.folio_num} />
                  </Td>
                  <Td muted className="whitespace-nowrap">
                    {fmtDate(item.fecha_recepcion)}
                    {item.hora_recepcion ? <span className="ml-1 text-ink-4">{item.hora_recepcion}</span> : null}
                  </Td>
                  <Td className="max-w-[240px]">
                    <CellPrimary title={item.solicitante || "-"} subtitle={item.recibido_por ? `Recibió ${item.recibido_por}` : undefined} />
                  </Td>
                  <Td>
                    <CellPrimary title={item.id_interno || (item.muestra_unica ? "-" : "Lote")} subtitle={getSampleTypeSummary(item)} />
                  </Td>
                  <Td muted className="max-w-[260px] truncate">
                    {getSampleAnalysisSummary(item)}
                  </Td>
                  <Td>
                    <SampleStatus status={item.estado} />
                  </Td>
                  <Td align="right" onClick={(event) => event.stopPropagation()}>
                    <RowActions>
                      {canCreate ? (
                        <Tooltip content="Procesar esta recepción">
                          <IconButton label="Procesar" onClick={() => router.push(`/muestras/procesamiento/nuevo?recepcion=${item.id}`)}>
                            <ArrowRight size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canUpdate ? (
                        <IconButton label="Editar" onClick={() => router.push(`/muestras/recepcion/${item.id}`)}>
                          <PencilSimple size={16} />
                        </IconButton>
                      ) : null}
                      {canDelete ? (
                        <Dropdown
                          label="Más acciones"
                          trigger={
                            <IconButton label="Más acciones">
                              <DotsThree size={18} weight="bold" />
                            </IconButton>
                          }
                          items={[{ label: "Eliminar recepción", icon: <Trash size={16} />, tone: "danger", onSelect: () => remove(item) }]}
                        />
                      ) : null}
                    </RowActions>
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
