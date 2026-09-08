"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowsClockwise, DotsThree, Flask, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { ImportReactivosSheet, ReactivoSheet } from "@/components/features/inventory/ReactivoSheet";
import { StockRefillSheet, type StockRefillTarget } from "@/components/features/inventory/StockRefillSheet";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Dropdown, useConfirm } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, StockMeter, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useUrlTrigger } from "@/lib/client/hooks";
import { formatReactivoName, getReactivoExpiry, getReactivoLocation, getReactivoStockInfo, getReactivoTypeLabel } from "@/lib/client/reactivos";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function ReactivosPage() {
  return (
    <RequireModule modules="reactivos">
      <Suspense fallback={<TableSkeleton />}>
        <ReactivosContent />
      </Suspense>
    </RequireModule>
  );
}

function expiryTone(value: unknown): "danger" | "warning" | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  const days = (date.getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return null;
}

function ReactivosContent() {
  const { token, can } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();
  const importSheet = useOpenState();
  const refill = useOpenState<StockRefillTarget>();

  const resource = useResource<ApiRecord[]>(
    "reactivos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos?search=${encodeURIComponent(debounced.trim())}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("reactivos", "create")) modal.open(null);
  });

  const stats = useMemo(() => {
    const list = items || [];
    let low = 0;
    let expiring = 0;
    for (const item of list) {
      const { current, max } = getReactivoStockInfo(item);
      if (current !== null && max && current / max <= 0.2) low += 1;
      if (expiryTone(getReactivoExpiry(item))) expiring += 1;
    }
    return { total: list.length, low, expiring, types: new Set(list.map((item) => item.tipo_reactivo || item.categoria).filter(Boolean)).size };
  }, [items]);

  const editReactivo = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el reactivo");
    }
  };

  const deleteReactivo = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar reactivo", description: `Se eliminará "${formatReactivoName(item)}" del inventario. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/reactivos/${item.id}`, token);
      toast.success("Reactivo eliminado");
      invalidate("reactivos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("reactivos", "create");
  const canUpdate = can("reactivos", "update");
  const canDelete = can("reactivos", "delete");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reactivos" value={fmt(stats.total)} hint={`${fmt(stats.types)} categorías`} />
        <Stat label="Stock bajo" value={fmt(stats.low)} tone={stats.low ? "warning" : "neutral"} hint="20 % o menos del máximo" />
        <Stat label="Por vencer o vencidos" value={fmt(stats.expiring)} tone={stats.expiring ? "danger" : "neutral"} hint="Caducidad en 30 días" />
        <Stat label="Búsqueda" value={search ? fmt(stats.total) : "Todo"} hint={search ? `Coincidencias con “${search}”` : "Sin filtro activo"} />
      </div>

      <Toolbar
        end={
          <>
            {canCreate ? (
              <Button variant="secondary" icon={<UploadSimple size={16} />} onClick={() => importSheet.open()}>
                Importar Excel
              </Button>
            ) : null}
            {canCreate ? (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
                Nuevo reactivo
              </Button>
            ) : null}
          </>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, lote, CAS o catálogo" className="w-full md:w-[360px]" />
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} reactivos` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<Flask size={20} />} title={search ? "Sin coincidencias" : "Aún no hay reactivos"} description={search ? "Prueba con otro término o limpia la búsqueda." : "Crea el primero o importa el inventario desde Excel."} action={canCreate && !search ? <Button onClick={() => modal.open(null)}>Nuevo reactivo</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Producto</Th>
                <Th>Categoría</Th>
                <Th>Marca / proveedor</Th>
                <Th>Ubicación</Th>
                <Th>Caducidad</Th>
                <Th>Existencia</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const { current, max, unit } = getReactivoStockInfo(item);
                const expiry = getReactivoExpiry(item);
                const tone = expiryTone(expiry);
                const percent = current === null ? null : max ? (current / max) * 100 : 100;
                return (
                  <Tr key={item.id}>
                    <Td className="max-w-[320px]">
                      <CellPrimary title={formatReactivoName(item)} subtitle={item.catalogo_parte_cas_lote || item.catalogo || item.cas_number || item.numero_cas || (item.lote ? `Lote ${item.lote}` : "")} />
                    </Td>
                    <Td>
                      <Badge tone="neutral">{getReactivoTypeLabel(item.tipo_reactivo || item.categoria)}</Badge>
                    </Td>
                    <Td muted>{[item.marca, item.proveedor || item.vendor].filter(Boolean).join(" / ") || "-"}</Td>
                    <Td muted>{getReactivoLocation(item)}</Td>
                    <Td>
                      {expiry ? (
                        <span className={tone === "danger" ? "font-medium text-danger" : tone === "warning" ? "font-medium text-[#8d6011]" : "text-ink-2"}>{fmtDate(expiry)}</span>
                      ) : (
                        <span className="text-ink-4">-</span>
                      )}
                    </Td>
                    <Td>
                      {current === null ? <span className="text-ink-4">Sin registro</span> : <StockMeter percent={percent} label={`${fmt(current)} de ${fmt(max || current)}${unit ? ` ${unit}` : ""}`} />}
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canUpdate ? (
                          <IconButton label="Rellenar stock" onClick={() => refill.open({ type: "reactivo", id: Number(item.id), name: formatReactivoName(item), unit })}>
                            <ArrowsClockwise size={16} />
                          </IconButton>
                        ) : null}
                        {canUpdate ? (
                          <IconButton label="Editar" onClick={() => editReactivo(Number(item.id))}>
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
                            items={[{ label: "Eliminar reactivo", icon: <Trash size={16} />, tone: "danger", onSelect: () => deleteReactivo(item) }]}
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

      {modal.key ? <ReactivoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
      {importSheet.key ? <ImportReactivosSheet key={`import-${importSheet.key}`} open={importSheet.isOpen} onClose={importSheet.close} /> : null}
      {refill.key ? <StockRefillSheet key={`refill-${refill.key}`} open={refill.isOpen} target={refill.payload} onClose={refill.close} /> : null}
    </>
  );
}
