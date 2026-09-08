"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DotsThree, Flask, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { FolioChip, SampleStatus } from "@/components/features/samples/status";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Dropdown, useConfirm } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function ExtraccionListPage() {
  return (
    <RequireModule modules="muestras">
      <ExtraccionList />
    </RequireModule>
  );
}

function ExtraccionList() {
  const { token, can } = useSession();
  const router = useRouter();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);

  const resource = useResource<ApiRecord[]>(
    "muestras",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/extraction?search=${encodeURIComponent(debounced.trim())}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced] },
  );
  const items = resource.data;

  const remove = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar extracción", description: "Se eliminará el registro de extracción. Los descuentos de inventario ya aplicados no se revierten.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/samples/extraction/${item.id}`, token);
      toast.success("Extracción eliminada");
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
            <Link href="/muestras/extraccion/nueva" className="press inline-flex h-9 items-center gap-2 rounded-control bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-strong">
              <Plus size={16} weight="bold" /> Nueva extracción
            </Link>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio E, folio P o ID interno" className="w-full md:w-[380px]" />
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} extracciones` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<Flask size={20} />} title={search ? "Sin coincidencias" : "Sin extracciones"} description={search ? "Prueba con otro término." : "Registra la extracción a partir de un procesamiento."} action={canCreate && !search ? <Button onClick={() => router.push("/muestras/extraccion/nueva")}>Nueva extracción</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio E</Th>
                <Th>Procesamiento</Th>
                <Th>ID interno</Th>
                <Th>Fecha</Th>
                <Th>Molienda</Th>
                <Th>Estado</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/muestras/extraccion/${item.id}`)}>
                  <Td>
                    <FolioChip type={String(item.tipo_registro || "E-A")} num={item.folio_num} />
                  </Td>
                  <Td>{item.folio_procesamiento_num ? <FolioChip type="P" num={item.folio_procesamiento_num} /> : <span className="text-ink-4">Sin vincular</span>}</Td>
                  <Td className="max-w-[260px]">
                    <CellPrimary title={item.id_interno || "-"} subtitle={item.muestra_tipo === "lote" ? "Lote" : "Muestra única"} />
                  </Td>
                  <Td muted className="whitespace-nowrap">
                    {fmtDate(item.fecha_extraccion)}
                    {item.hora_extraccion ? <span className="ml-1 text-ink-4">{item.hora_extraccion}</span> : null}
                  </Td>
                  <Td>{item.tipo_molienda ? <Badge tone={item.tipo_molienda === "congelada" ? "brand" : "neutral"}>{item.tipo_molienda === "congelada" ? "Congelada" : "Fresca"}</Badge> : <span className="text-ink-4">-</span>}</Td>
                  <Td>
                    <SampleStatus status={item.estado} />
                  </Td>
                  <Td align="right" onClick={(event) => event.stopPropagation()}>
                    <RowActions>
                      {canUpdate ? (
                        <IconButton label="Editar" onClick={() => router.push(`/muestras/extraccion/${item.id}`)}>
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
                          items={[{ label: "Eliminar extracción", icon: <Trash size={16} />, tone: "danger", onSelect: () => remove(item) }]}
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
