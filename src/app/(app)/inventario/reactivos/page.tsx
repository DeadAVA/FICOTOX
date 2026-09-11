"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowCounterClockwise, ArrowsClockwise, Flask, IdentificationCard, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { DetailSheet } from "@/components/features/inventory/DetailSheet";
import { ImportReactivosSheet, ReactivoSheet } from "@/components/features/inventory/ReactivoSheet";
import { StockRefillSheet, type StockRefillTarget } from "@/components/features/inventory/StockRefillSheet";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, StockMeter, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { deadlineTone, fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
import { formatReactivoName, getReactivoExpiry, getReactivoLocation, getReactivoStockInfo, getReactivoStockState, getReactivoTypeLabel, isReactivoLow } from "@/lib/client/reactivos";
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

type Filter = "todos" | "bajo" | "vencer";

/* Algunos registros importados traen "-" como caducidad: se trata como vacío. */
const expiryOf = (item: ApiRecord): unknown => {
  const value = getReactivoExpiry(item);
  return value && String(value).trim() !== "-" ? value : null;
};

const expiryTone = (value: unknown) => deadlineTone(value);

const isLow = isReactivoLow;

function ReactivosContent() {
  const { token, can } = useSession();
  const prompt = usePrompt();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const initialFilter = useInitialParam("filtro");
  const [filter, setFilter] = useState<Filter>(initialFilter === "bajo" || initialFilter === "vencer" ? initialFilter : "todos");
  const [showBajas, setShowBajas] = useState(initialFilter === "bajas");
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();
  const importSheet = useOpenState();
  const refill = useOpenState<StockRefillTarget>();
  const detail = useOpenState<ApiRecord>();

  /* Si ya estamos en la lista y la búsqueda global manda otro ?buscar= o ?filtro=, se aplica. */
  useParamChange("buscar", (value) => setSearch(value));
  useParamChange("filtro", (value) => {
    setFilter(value === "bajo" || value === "vencer" ? value : "todos");
    setShowBajas(value === "bajas");
  });

  const resource = useResource<ApiRecord[]>(
    "reactivos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos?search=${encodeURIComponent(debounced.trim())}${showBajas ? "&bajas=1" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showBajas] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("reactivos", "create")) modal.open(null);
  });

  const counts = useMemo(() => {
    const list = items || [];
    return { total: list.length, low: list.filter(isLow).length, expiring: list.filter((item) => expiryTone(expiryOf(item))).length };
  }, [items]);

  const visible = useMemo(() => {
    const list = items || [];
    if (filter === "bajo") return list.filter(isLow);
    if (filter === "vencer") return list.filter((item) => expiryTone(expiryOf(item)));
    return list;
  }, [items, filter]);

  const editReactivo = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/reactivos/${id}`, token);
      detail.close();
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el reactivo");
    }
  };

  // Baja logica con motivo: el reactivo deja de ofrecerse, sus movimientos se conservan.
  const deleteReactivo = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Dar de baja "${formatReactivoName(item)}"`, description: "El reactivo deja de aparecer en el inventario y en los formatos; sus movimientos y registros se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/reactivos/${item.id}`, token, { motivo });
      toast.success("Reactivo dado de baja");
      detail.close();
      invalidate("reactivos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja");
    }
  };

  const reactivarReactivo = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Reactivar "${formatReactivoName(item)}"`, confirmLabel: "Reactivar" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos/${item.id}/reactivar`, token, { motivo });
      toast.success("Reactivo reactivado");
      detail.close();
      invalidate("reactivos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  };

  const canCreate = can("reactivos", "create");
  const canUpdate = can("reactivos", "update");
  const canDelete = can("reactivos", "delete");

  const selected = detail.payload;
  const selectedStock = selected ? getReactivoStockState(selected) : null;
  const selectedInactive = selected ? Number(selected.activo ?? 1) === 0 : false;

  const groups: FilterGroup[] = [
    {
      key: "existencia",
      label: "Existencia",
      value: filter,
      defaultValue: "todos",
      onChange: (v) => setFilter(v as Filter),
      options: [
        { value: "todos", label: "Todos", count: items ? counts.total : null },
        { value: "bajo", label: "Stock bajo (vacío, bajo el mínimo o ≤ 20 %)", count: items ? counts.low : null, tone: counts.low ? "warning" : "neutral" },
        { value: "vencer", label: "Por vencer o vencidos", count: items ? counts.expiring : null, tone: counts.expiring ? "danger" : "neutral" },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "bajas", label: "Mostrar bajas", description: "Incluye reactivos dados de baja.", checked: showBajas, onChange: setShowBajas }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const inactive = Number(item.activo ?? 1) === 0;
    const { unit } = getReactivoStockInfo(item);
    const list: MenuItem[] = [{ label: "Ver ficha", description: "Existencia, lote, ubicación y caducidad", icon: <IdentificationCard size={16} weight="duotone" />, tone: "brand", onSelect: () => detail.open(item) }];
    if (canUpdate && !inactive) list.push({ label: "Rellenar stock", description: "Registrar una entrada", icon: <ArrowsClockwise size={16} weight="duotone" />, tone: "success", onSelect: () => refill.open({ type: "reactivo", id: Number(item.id), name: formatReactivoName(item), unit }) });
    if (canUpdate) list.push({ label: "Editar", description: "Cambiar datos del reactivo", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => editReactivo(Number(item.id)) });
    if (canDelete) {
      if (inactive) list.push({ label: "Reactivar reactivo…", description: "Vuelve al inventario con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => reactivarReactivo(item) });
      else list.push({ label: "Dar de baja…", description: "Deja de ofrecerse; conserva su historial", icon: <Trash size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => deleteReactivo(item) });
    }
    return list;
  };

  return (
    <>
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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, lote, CAS o catálogo" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} reactivos${filter !== "todos" ? " en este filtro" : ""}` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={5} />
        ) : !visible.length ? (
          <EmptyState icon={<Flask size={20} />} title={search || filter !== "todos" ? "Sin coincidencias" : "Aún no hay reactivos"} description={search || filter !== "todos" ? "Prueba con otro término o cambia el filtro." : "Crea el primero o importa el inventario desde Excel."} action={canCreate && !search && filter === "todos" ? <Button onClick={() => modal.open(null)}>Nuevo reactivo</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Producto</Th>
                <Th>Categoría</Th>
                <Th>Ubicación</Th>
                <Th>Caducidad</Th>
                <Th>Existencia</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
                const stock = getReactivoStockState(item);
                const expiry = expiryOf(item);
                const tone = expiryTone(expiry);
                const inactive = Number(item.activo ?? 1) === 0;
                return (
                  <Tr key={item.id} interactive onClick={() => detail.open(item)} className={inactive ? "opacity-60" : undefined}>
                    <Td className="max-w-[300px]">
                      <div className="flex items-center gap-2">
                        {inactive ? <Badge tone="danger">Baja</Badge> : null}
                        <CellPrimary title={formatReactivoName(item)} subtitle={[item.marca, item.catalogo_parte_cas_lote || item.catalogo || item.cas_number || item.numero_cas || (item.lote ? `Lote ${item.lote}` : "")].filter(Boolean).join(" · ")} />
                      </div>
                    </Td>
                    <Td muted className="max-w-[200px]">
                      {getReactivoTypeLabel(item.tipo_reactivo || item.categoria)}
                    </Td>
                    <Td muted className="max-w-[140px] truncate">
                      {getReactivoLocation(item)}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {expiry ? <span className={tone === "danger" ? "font-medium text-danger" : tone === "warning" ? "font-medium text-warning-text" : "text-ink-2"}>{fmtDate(expiry)}</span> : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      <StockMeter current={stock.current} max={stock.max} min={stock.min} unit={stock.unit} low={stock.low} />
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={formatReactivoName(item)} />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>

      {selected ? (
        <DetailSheet
          open={detail.isOpen}
          onOpenChange={(open) => {
            if (!open) detail.close();
          }}
          title={formatReactivoName(selected)}
          subtitle={getReactivoTypeLabel(selected.tipo_reactivo || selected.categoria)}
          badges={
            <span className="flex items-center gap-1.5">
              {selectedInactive ? <Badge tone="danger">Baja</Badge> : null}
              {expiryTone(expiryOf(selected)) === "danger" ? <Badge tone="danger">Vencido</Badge> : expiryTone(expiryOf(selected)) === "warning" ? <Badge tone="warning">Por vencer</Badge> : null}
              {selectedStock?.empty ? <Badge tone="danger">Vacío</Badge> : selectedStock?.low ? <Badge tone="warning">Stock bajo</Badge> : null}
            </span>
          }
          hero={
            selectedStock && selectedStock.current !== null ? (
              <div className="rounded-[14px] bg-surface-2 p-4 ring-1 ring-line">
                <p className="text-[12.5px] text-ink-3">Existencia</p>
                <p className="tnum mt-0.5 text-[26px] font-semibold tracking-[-0.02em] text-ink">
                  {fmt(selectedStock.current)} <span className="text-[15px] font-medium text-ink-3">de {fmt(selectedStock.max || selectedStock.current)} {selectedStock.unit}</span>
                </p>
                <StockMeter className="mt-3" size="lg" current={selectedStock.current} max={selectedStock.max} min={selectedStock.min} unit={selectedStock.unit} low={selectedStock.low} label={selectedStock.min ? `Aviso de stock bajo al llegar a ${fmt(selectedStock.min)} ${selectedStock.unit}` : "Aviso de stock bajo al 20 % de la capacidad"} />
              </div>
            ) : null
          }
          groups={[
            {
              title: "Identificación",
              rows: [
                { label: "ID interno", value: selected.id_interno, mono: true },
                { label: "Lote", value: selected.lote, mono: true },
                { label: "CAS", value: selected.numero_cas || selected.cas_number, mono: true },
                { label: "Catálogo", value: selected.catalogo || selected.catalogo_parte_cas_lote, mono: true },
                { label: "Marca", value: selected.marca },
                { label: "Proveedor", value: selected.proveedor || selected.vendor },
              ],
            },
            {
              title: "Resguardo",
              rows: [
                { label: "Ubicación", value: getReactivoLocation(selected) },
                { label: "Caducidad", value: expiryOf(selected) ? fmtDate(expiryOf(selected)) : null },
                { label: "Fecha de apertura", value: selected.fecha_apertura ? fmtDate(selected.fecha_apertura) : null },
                { label: "Stock mínimo", value: selected.stock_minimo !== null && selected.stock_minimo !== undefined ? fmt(selected.stock_minimo) : null },
              ],
            },
            {
              title: "Baja",
              rows: [
                { label: "Motivo", value: selectedInactive ? selected.baja_motivo : null },
                { label: "Fecha", value: selectedInactive && selected.baja_en ? fmtDate(selected.baja_en) : null },
              ],
            },
          ]}
          actions={
            <>
              {canDelete ? (
                selectedInactive ? (
                  <Button variant="secondary" icon={<ArrowCounterClockwise size={16} />} onClick={() => reactivarReactivo(selected)}>
                    Reactivar
                  </Button>
                ) : (
                  <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash size={16} />} onClick={() => deleteReactivo(selected)}>
                    Dar de baja
                  </Button>
                )
              ) : null}
              {canUpdate && !selectedInactive ? (
                <Button variant="secondary" icon={<ArrowsClockwise size={16} />} onClick={() => refill.open({ type: "reactivo", id: Number(selected.id), name: formatReactivoName(selected), unit: selectedStock?.unit || "" })}>
                  Rellenar
                </Button>
              ) : null}
              {canUpdate ? (
                <Button icon={<PencilSimple size={16} />} onClick={() => editReactivo(Number(selected.id))}>
                  Editar
                </Button>
              ) : null}
            </>
          }
        />
      ) : null}

      {modal.key ? <ReactivoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
      {importSheet.key ? <ImportReactivosSheet key={`import-${importSheet.key}`} open={importSheet.isOpen} onClose={importSheet.close} /> : null}
      {refill.key ? <StockRefillSheet key={`refill-${refill.key}`} open={refill.isOpen} target={refill.payload} onClose={refill.close} /> : null}
    </>
  );
}
