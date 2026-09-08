"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { DotsThree, PencilSimple, Plus, Trash, Wrench } from "@phosphor-icons/react";
import { MantenimientoSheet } from "@/components/features/inventory/EquipoSheets";
import { MANTENIMIENTO_ESTADOS, MANTENIMIENTO_TIPOS, metaFor } from "@/components/features/inventory/meta";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Dropdown, useConfirm } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useOpenState, useUrlTrigger } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function MantenimientoPage() {
  return (
    <RequireModule modules="mantenimiento">
      <Suspense fallback={<TableSkeleton />}>
        <MantenimientoContent />
      </Suspense>
    </RequireModule>
  );
}

function MantenimientoContent() {
  const { token, can } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();

  const resource = useResource<ApiRecord[]>(
    "mantenimientos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos?search=${encodeURIComponent(debounced.trim())}&tipo=${encodeURIComponent(tipo)}&estado=${encodeURIComponent(estado)}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, tipo, estado] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("mantenimiento", "create")) modal.open(null);
  });

  const stats = useMemo(() => {
    const list = items || [];
    return {
      total: list.length,
      pendientes: list.filter((item) => ["programado", "en_proceso"].includes(String(item.estado))).length,
      completados: list.filter((item) => item.estado === "completado").length,
      vencidos: list.filter((item) => item.estado === "vencido").length,
    };
  }, [items]);

  const editItem = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el mantenimiento");
    }
  };

  const deleteItem = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar mantenimiento", description: "Se eliminará el registro programado. Esta acción no se puede deshacer.", confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/mantenimientos/${item.id}`, token);
      toast.success("Mantenimiento eliminado");
      invalidate("mantenimientos", "documentos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("mantenimiento", "create");
  const canUpdate = can("mantenimiento", "update");
  const canDelete = can("mantenimiento", "delete");
  const filtered = !!(search || tipo || estado);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Mantenimientos" value={fmt(stats.total)} />
        <Stat label="Pendientes" value={fmt(stats.pendientes)} tone={stats.pendientes ? "brand" : "neutral"} hint="Programados o en proceso" />
        <Stat label="Completados" value={fmt(stats.completados)} tone="success" />
        <Stat label="Vencidos" value={fmt(stats.vencidos)} tone={stats.vencidos ? "danger" : "neutral"} />
      </div>

      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Programar mantenimiento
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por equipo o proveedor" className="w-full md:w-[300px]" />
        <div className="w-full md:w-[180px]">
          <Select value={tipo} onChange={(event) => setTipo(event.target.value)} aria-label="Filtrar por tipo">
            <option value="">Todos los tipos</option>
            {MANTENIMIENTO_TIPOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full md:w-[180px]">
          <Select value={estado} onChange={(event) => setEstado(event.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {MANTENIMIENTO_ESTADOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} registros` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<Wrench size={20} />} title={filtered ? "Sin coincidencias" : "Sin mantenimientos programados"} description={filtered ? "Ajusta la búsqueda o los filtros." : "Programa el primer mantenimiento o calibración de un equipo."} action={canCreate && !filtered ? <Button onClick={() => modal.open(null)}>Programar mantenimiento</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Equipo</Th>
                <Th>Tipo</Th>
                <Th>Programado</Th>
                <Th>Técnico / responsable</Th>
                <Th>Estado</Th>
                <Th>Observaciones</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const estadoMeta = metaFor(MANTENIMIENTO_ESTADOS, item.estado);
                const tipoMeta = metaFor(MANTENIMIENTO_TIPOS, item.tipo);
                return (
                  <Tr key={item.id}>
                    <Td>
                      <CellPrimary title={item.equipo || "Equipo sin nombre"} subtitle={[item.equipo_marca, item.equipo_modelo].filter(Boolean).join(" · ")} />
                    </Td>
                    <Td>
                      <Badge tone={tipoMeta.tone}>{tipoMeta.label}</Badge>
                    </Td>
                    <Td>
                      <CellPrimary title={fmtDate(item.fecha_programada)} subtitle={item.fecha_realizado ? `Realizado ${fmtDate(item.fecha_realizado)}` : undefined} />
                    </Td>
                    <Td>
                      <CellPrimary title={item.tecnico_proveedor || "-"} subtitle={item.responsable || undefined} />
                    </Td>
                    <Td>
                      <Badge tone={estadoMeta.tone} dot>
                        {estadoMeta.label}
                      </Badge>
                    </Td>
                    <Td muted className="max-w-[280px] truncate">
                      {item.observaciones || "-"}
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canUpdate ? (
                          <IconButton label="Editar" onClick={() => editItem(Number(item.id))}>
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
                            items={[{ label: "Eliminar mantenimiento", icon: <Trash size={16} />, tone: "danger", onSelect: () => deleteItem(item) }]}
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

      {modal.key ? <MantenimientoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
    </>
  );
}
