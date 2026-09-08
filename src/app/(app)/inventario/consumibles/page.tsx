"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowsClockwise, DotsThree, Package, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { ConsumibleSheet, ImportConsumiblesSheet } from "@/components/features/inventory/ConsumibleSheet";
import { StockRefillSheet, type StockRefillTarget } from "@/components/features/inventory/StockRefillSheet";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Dropdown, useConfirm } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, Stat, StockMeter, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, parseNumberOrNull } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useUrlTrigger } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function ConsumiblesPage() {
  return (
    <RequireModule modules="consumibles">
      <Suspense fallback={<TableSkeleton />}>
        <ConsumiblesContent />
      </Suspense>
    </RequireModule>
  );
}

function ConsumiblesContent() {
  const { token, can } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();
  const importSheet = useOpenState();
  const refill = useOpenState<StockRefillTarget>();

  const resource = useResource<ApiRecord[]>(
    "consumibles",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/consumables?search=${encodeURIComponent(debounced.trim())}`, token);
      return (Array.isArray(data) ? data : data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("consumibles", "create")) modal.open(null);
  });

  const stats = useMemo(() => {
    const list = items || [];
    const pieces = (item: ApiRecord) => Number(item.piezas || 0);
    return {
      total: list.length,
      available: list.filter((item) => pieces(item) > 5).length,
      low: list.filter((item) => pieces(item) > 0 && pieces(item) <= 5).length,
      out: list.filter((item) => pieces(item) <= 0).length,
    };
  }, [items]);

  const editConsumable = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/consumables/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch {
      const fallback = (items || []).find((row) => Number(row.id) === id);
      if (fallback) modal.open(fallback);
      else toast.error("No se pudo cargar el consumible");
    }
  };

  const deleteConsumable = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar consumible", description: `Se eliminará "${item.producto}" del inventario. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/consumables/${item.id}`, token);
      toast.success("Consumible eliminado");
      invalidate("consumibles", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("consumibles", "create");
  const canUpdate = can("consumibles", "update");
  const canDelete = can("consumibles", "delete");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Consumibles" value={fmt(stats.total)} />
        <Stat label="Disponibles" value={fmt(stats.available)} tone="success" hint="Más de 5 piezas" />
        <Stat label="Stock bajo" value={fmt(stats.low)} tone={stats.low ? "warning" : "neutral"} hint="Entre 1 y 5 piezas" />
        <Stat label="Agotados" value={fmt(stats.out)} tone={stats.out ? "danger" : "neutral"} hint="Sin piezas" />
      </div>

      <Toolbar
        end={
          <>
            {canCreate ? (
              <Button variant="secondary" icon={<UploadSimple size={16} />} onClick={() => importSheet.open()}>
                Importar
              </Button>
            ) : null}
            {canCreate ? (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
                Nuevo consumible
              </Button>
            ) : null}
          </>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o marca" className="w-full md:w-[360px]" />
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} consumibles` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<Package size={20} />} title={search ? "Sin coincidencias" : "Aún no hay consumibles"} description={search ? "Prueba con otro término o limpia la búsqueda." : "Crea el primero o importa desde CSV o Excel."} action={canCreate && !search ? <Button onClick={() => modal.open(null)}>Nuevo consumible</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Producto</Th>
                <Th>Marca / proveedor</Th>
                <Th>Catálogo</Th>
                <Th>Ingreso</Th>
                <Th>Presentación</Th>
                <Th>Piezas</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const pieces = parseNumberOrNull(item.piezas) ?? 0;
                const max = parseNumberOrNull(item.stock_maximo) || pieces;
                const percent = max ? (pieces / max) * 100 : 0;
                return (
                  <Tr key={item.id}>
                    <Td className="max-w-[300px]">
                      <CellPrimary title={item.producto || "-"} subtitle={item.cantidad_por_pieza ? `${fmt(item.cantidad_por_pieza)} por pieza` : undefined} />
                    </Td>
                    <Td muted>{[item.marca, item.proveedor].filter(Boolean).join(" / ") || "-"}</Td>
                    <Td mono>{item.catalogo_parte_cas || "-"}</Td>
                    <Td muted>{fmtDate(item.fecha_ingreso)}</Td>
                    <Td muted>{[item.tamano_capacidad, item.contenedor].filter(Boolean).join(" · ") || "-"}</Td>
                    <Td>
                      <StockMeter percent={percent} tone={pieces <= 0 ? "danger" : pieces <= 5 ? "warning" : "success"} label={`${fmt(pieces)} de ${fmt(max)} piezas`} />
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canUpdate ? (
                          <IconButton label="Rellenar stock" onClick={() => refill.open({ type: "consumible", id: Number(item.id), name: String(item.producto || "Consumible") })}>
                            <ArrowsClockwise size={16} />
                          </IconButton>
                        ) : null}
                        {canUpdate ? (
                          <IconButton label="Editar" onClick={() => editConsumable(Number(item.id))}>
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
                            items={[{ label: "Eliminar consumible", icon: <Trash size={16} />, tone: "danger", onSelect: () => deleteConsumable(item) }]}
                          />
                        ) : null}
                      </RowActions>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>

      {modal.key ? <ConsumibleSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
      {importSheet.key ? <ImportConsumiblesSheet key={`import-${importSheet.key}`} open={importSheet.isOpen} onClose={importSheet.close} /> : null}
      {refill.key ? <StockRefillSheet key={`refill-${refill.key}`} open={refill.isOpen} target={refill.payload} onClose={refill.close} /> : null}
    </>
  );
}
