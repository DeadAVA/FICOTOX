"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowCounterClockwise, ArrowsClockwise, IdentificationCard, Package, PencilSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { DetailSheet } from "@/components/features/inventory/DetailSheet";
import { ConsumibleSheet, ImportConsumiblesSheet } from "@/components/features/inventory/ConsumibleSheet";
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
import { fmt, fmtDate, parseNumberOrNull } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
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

type Filter = "todos" | "bajo" | "agotado";

const piecesOf = (item: ApiRecord) => Number(item.piezas || 0);

function ConsumiblesContent() {
  const { token, can } = useSession();
  const prompt = usePrompt();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const initialFilter = useInitialParam("filtro");
  const [filter, setFilter] = useState<Filter>(initialFilter === "bajo" || initialFilter === "agotado" ? initialFilter : "todos");
  const debounced = useDebouncedValue(search);
  const [showBajas, setShowBajas] = useState(initialFilter === "bajas");
  const modal = useOpenState<ApiRecord>();
  const importSheet = useOpenState();
  const refill = useOpenState<StockRefillTarget>();
  const detail = useOpenState<ApiRecord>();

  useParamChange("buscar", (value) => setSearch(value));
  useParamChange("filtro", (value) => {
    setFilter(value === "bajo" || value === "agotado" ? value : "todos");
    setShowBajas(value === "bajas");
  });

  const resource = useResource<ApiRecord[]>(
    "consumibles",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/consumables?search=${encodeURIComponent(debounced.trim())}${showBajas ? "&bajas=1" : ""}`, token);
      return (Array.isArray(data) ? data : data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showBajas] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("consumibles", "create")) modal.open(null);
  });

  const counts = useMemo(() => {
    const list = items || [];
    return {
      total: list.length,
      low: list.filter((item) => piecesOf(item) <= 5).length,
      out: list.filter((item) => piecesOf(item) <= 0).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const list = items || [];
    if (filter === "bajo") return list.filter((item) => piecesOf(item) <= 5);
    if (filter === "agotado") return list.filter((item) => piecesOf(item) <= 0);
    return list;
  }, [items, filter]);

  const editConsumable = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/consumables/${id}`, token);
      detail.close();
      modal.open(resolveApiEntity(data));
    } catch {
      const fallback = (items || []).find((row) => Number(row.id) === id);
      detail.close();
      if (fallback) modal.open(fallback);
      else toast.error("No se pudo cargar el consumible");
    }
  };

  // Baja logica con motivo: el consumible deja de ofrecerse, sus movimientos se conservan.
  const deleteConsumable = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Dar de baja "${item.producto}"`, description: "El consumible deja de aparecer en el inventario y en los formatos; sus movimientos y registros se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/consumables/${item.id}`, token, { motivo });
      toast.success("Consumible dado de baja");
      detail.close();
      invalidate("consumibles", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja");
    }
  };

  const reactivarConsumable = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Reactivar "${item.producto}"`, confirmLabel: "Reactivar" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/consumables/${item.id}/reactivar`, token, { motivo });
      toast.success("Consumible reactivado");
      detail.close();
      invalidate("consumibles", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  };

  const canCreate = can("consumibles", "create");
  const canUpdate = can("consumibles", "update");
  const canDelete = can("consumibles", "delete");

  const selected = detail.payload;
  const selectedInactive = selected ? Number(selected.activo ?? 1) === 0 : false;
  const selectedPieces = selected ? parseNumberOrNull(selected.piezas) ?? 0 : 0;
  const selectedMax = selected ? parseNumberOrNull(selected.stock_maximo) || selectedPieces : 0;

  const groups: FilterGroup[] = [
    {
      key: "piezas",
      label: "Piezas",
      value: filter,
      defaultValue: "todos",
      onChange: (v) => setFilter(v as Filter),
      options: [
        { value: "todos", label: "Todos", count: items ? counts.total : null },
        { value: "bajo", label: "5 piezas o menos", count: items ? counts.low : null, tone: counts.low ? "warning" : "neutral" },
        { value: "agotado", label: "Agotados", count: items ? counts.out : null, tone: counts.out ? "danger" : "neutral" },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "bajas", label: "Mostrar bajas", description: "Incluye consumibles dados de baja.", checked: showBajas, onChange: setShowBajas }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const inactive = Number(item.activo ?? 1) === 0;
    const list: MenuItem[] = [{ label: "Ver ficha", description: "Piezas, presentación y resguardo", icon: <IdentificationCard size={16} weight="duotone" />, tone: "brand", onSelect: () => detail.open(item) }];
    if (canUpdate && !inactive) list.push({ label: "Rellenar stock", description: "Registrar una entrada de piezas", icon: <ArrowsClockwise size={16} weight="duotone" />, tone: "success", onSelect: () => refill.open({ type: "consumible", id: Number(item.id), name: String(item.producto || "Consumible") }) });
    if (canUpdate) list.push({ label: "Editar", description: "Cambiar datos del consumible", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => editConsumable(Number(item.id)) });
    if (canDelete) {
      if (inactive) list.push({ label: "Reactivar consumible…", description: "Vuelve al inventario con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => reactivarConsumable(item) });
      else list.push({ label: "Dar de baja…", description: "Deja de ofrecerse; conserva su historial", icon: <Trash size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => deleteConsumable(item) });
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
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o marca" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} consumibles${filter !== "todos" ? " en este filtro" : ""}` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !visible.length ? (
          <EmptyState icon={<Package size={20} />} title={search || filter !== "todos" ? "Sin coincidencias" : "Aún no hay consumibles"} description={search || filter !== "todos" ? "Prueba con otro término o cambia el filtro." : "Crea el primero o importa desde CSV o Excel."} action={canCreate && !search && filter === "todos" ? <Button onClick={() => modal.open(null)}>Nuevo consumible</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Producto</Th>
                <Th>Marca / proveedor</Th>
                <Th>Presentación</Th>
                <Th>Piezas</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
                const pieces = parseNumberOrNull(item.piezas) ?? 0;
                const max = parseNumberOrNull(item.stock_maximo) || pieces;
                const inactive = Number(item.activo ?? 1) === 0;
                return (
                  <Tr key={item.id} interactive onClick={() => detail.open(item)} className={inactive ? "opacity-60" : undefined}>
                    <Td className="max-w-[360px]">
                      <div className="flex items-center gap-2">
                        {inactive ? <Badge tone="danger">Baja</Badge> : null}
                        <CellPrimary title={item.producto || "-"} subtitle={[item.catalogo_parte_cas, item.cantidad_por_pieza ? `${fmt(item.cantidad_por_pieza)} por pieza` : null].filter(Boolean).join(" · ")} />
                      </div>
                    </Td>
                    <Td muted>{[item.marca, item.proveedor].filter(Boolean).join(" / ") || "—"}</Td>
                    <Td muted>{[item.tamano_capacidad, item.contenedor].filter(Boolean).join(" · ") || "—"}</Td>
                    <Td>
                      <StockMeter current={pieces} max={max} min={5} unit="piezas" low={pieces <= 5} />
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={String(item.producto || "")} />
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
          title={String(selected.producto || "Consumible")}
          subtitle={[selected.marca, selected.proveedor].filter(Boolean).join(" / ") || undefined}
          badges={selectedInactive ? <Badge tone="danger">Baja</Badge> : selectedPieces <= 0 ? <Badge tone="danger">Agotado</Badge> : selectedPieces <= 5 ? <Badge tone="warning">Stock bajo</Badge> : null}
          hero={
            <div className="rounded-[14px] bg-surface-2 p-4 ring-1 ring-line">
              <p className="text-[12.5px] text-ink-3">Piezas disponibles</p>
              <p className="tnum mt-0.5 text-[26px] font-semibold tracking-[-0.02em] text-ink">
                {fmt(selectedPieces)} <span className="text-[15px] font-medium text-ink-3">de {fmt(selectedMax)}</span>
              </p>
              <StockMeter className="mt-3" size="lg" current={selectedPieces} max={selectedMax} min={5} unit="piezas" low={selectedPieces <= 5} label="Aviso de stock bajo con 5 piezas o menos" />
            </div>
          }
          groups={[
            {
              title: "Identificación",
              rows: [
                { label: "Catálogo / parte", value: selected.catalogo_parte_cas, mono: true },
                { label: "Marca", value: selected.marca },
                { label: "Proveedor", value: selected.proveedor },
                { label: "Cantidad por pieza", value: selected.cantidad_por_pieza ? fmt(selected.cantidad_por_pieza) : null },
              ],
            },
            {
              title: "Presentación y resguardo",
              rows: [
                { label: "Tamaño / capacidad", value: selected.tamano_capacidad },
                { label: "Contenedor", value: selected.contenedor },
                { label: "Ubicación", value: selected.ubicacion || selected.localizacion },
                { label: "Fecha de ingreso", value: selected.fecha_ingreso ? fmtDate(selected.fecha_ingreso) : null },
                { label: "Stock máximo", value: selected.stock_maximo ? fmt(selected.stock_maximo) : null },
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
                  <Button variant="secondary" icon={<ArrowCounterClockwise size={16} />} onClick={() => reactivarConsumable(selected)}>
                    Reactivar
                  </Button>
                ) : (
                  <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash size={16} />} onClick={() => deleteConsumable(selected)}>
                    Dar de baja
                  </Button>
                )
              ) : null}
              {canUpdate && !selectedInactive ? (
                <Button variant="secondary" icon={<ArrowsClockwise size={16} />} onClick={() => refill.open({ type: "consumible", id: Number(selected.id), name: String(selected.producto || "Consumible") })}>
                  Rellenar
                </Button>
              ) : null}
              {canUpdate ? (
                <Button icon={<PencilSimple size={16} />} onClick={() => editConsumable(Number(selected.id))}>
                  Editar
                </Button>
              ) : null}
            </>
          }
        />
      ) : null}

      {modal.key ? <ConsumibleSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
      {importSheet.key ? <ImportConsumiblesSheet key={`import-${importSheet.key}`} open={importSheet.isOpen} onClose={importSheet.close} /> : null}
      {refill.key ? <StockRefillSheet key={`refill-${refill.key}`} open={refill.isOpen} target={refill.payload} onClose={refill.close} /> : null}
    </>
  );
}
