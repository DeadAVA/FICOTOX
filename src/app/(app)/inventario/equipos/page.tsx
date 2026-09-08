"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { Cube, DotsThree, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { EquipoSheet } from "@/components/features/inventory/EquipoSheets";
import { EQUIPO_ESTADOS, metaFor } from "@/components/features/inventory/meta";
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

export default function EquiposPage() {
  return (
    <RequireModule modules="equipos">
      <Suspense fallback={<TableSkeleton />}>
        <EquiposContent />
      </Suspense>
    </RequireModule>
  );
}

function EquiposContent() {
  const { token, can } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();

  const resource = useResource<ApiRecord[]>(
    "equipos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos?search=${encodeURIComponent(debounced.trim())}&estado=${encodeURIComponent(estado)}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, estado] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("equipos", "create")) modal.open(null);
  });

  const stats = useMemo(() => {
    const list = items || [];
    return {
      total: list.length,
      operativos: list.filter((item) => item.estado === "operativo").length,
      mantenimiento: list.filter((item) => item.estado === "mantenimiento").length,
      alertas: list.filter((item) => ["fuera_servicio", "calibracion_pendiente"].includes(String(item.estado))).length,
    };
  }, [items]);

  const editEquipo = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el equipo");
    }
  };

  const deleteEquipo = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar equipo", description: `Se eliminará "${item.nombre}". Sus mantenimientos quedarán sin equipo asociado.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/equipos/${item.id}`, token);
      toast.success("Equipo eliminado");
      invalidate("equipos", "mantenimientos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("equipos", "create");
  const canUpdate = can("equipos", "update");
  const canDelete = can("equipos", "delete");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Equipos" value={fmt(stats.total)} />
        <Stat label="Operativos" value={fmt(stats.operativos)} tone="success" />
        <Stat label="En mantenimiento" value={fmt(stats.mantenimiento)} tone={stats.mantenimiento ? "warning" : "neutral"} />
        <Stat label="Alertas" value={fmt(stats.alertas)} tone={stats.alertas ? "danger" : "neutral"} hint="Fuera de servicio o calibración pendiente" />
      </div>

      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Nuevo equipo
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, marca o modelo" className="w-full md:w-[320px]" />
        <div className="w-full md:w-[220px]">
          <Select value={estado} onChange={(event) => setEstado(event.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {EQUIPO_ESTADOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} equipos` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<Cube size={20} />} title={search || estado ? "Sin coincidencias" : "Aún no hay equipos"} description={search || estado ? "Ajusta la búsqueda o el filtro de estado." : "Registra los equipos del laboratorio para programar su mantenimiento."} action={canCreate && !search && !estado ? <Button onClick={() => modal.open(null)}>Nuevo equipo</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Equipo</Th>
                <Th>Marca / modelo</Th>
                <Th>Serie</Th>
                <Th>Ubicación</Th>
                <Th>Responsable</Th>
                <Th>Próx. calibración</Th>
                <Th>Estado</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const meta = metaFor(EQUIPO_ESTADOS, item.estado);
                return (
                  <Tr key={item.id}>
                    <Td>
                      <CellPrimary title={item.nombre || "-"} subtitle={`ID ${item.id}`} />
                    </Td>
                    <Td muted>{[item.marca, item.modelo].filter(Boolean).join(" · ") || "-"}</Td>
                    <Td mono>{item.numero_serie || "-"}</Td>
                    <Td muted>{item.ubicacion || "-"}</Td>
                    <Td muted>{item.responsable || "-"}</Td>
                    <Td muted>{fmtDate(item.fecha_prox_calibracion)}</Td>
                    <Td>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canUpdate ? (
                          <IconButton label="Editar" onClick={() => editEquipo(Number(item.id))}>
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
                            items={[{ label: "Eliminar equipo", icon: <Trash size={16} />, tone: "danger", onSelect: () => deleteEquipo(item) }]}
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

      {modal.key ? <EquipoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
    </>
  );
}
