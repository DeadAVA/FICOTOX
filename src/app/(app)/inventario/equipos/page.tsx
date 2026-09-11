"use client";

import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowCounterClockwise, Cube, IdentificationCard, PencilSimple, Plus, Trash, Wrench } from "@phosphor-icons/react";
import { DetailSheet } from "@/components/features/inventory/DetailSheet";
import { EquipoSheet } from "@/components/features/inventory/EquipoSheets";
import { EQUIPO_ESTADOS, MANTENIMIENTO_TIPOS, metaFor } from "@/components/features/inventory/meta";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { deadlineTone, fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
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

/* Los segmentos son los estados del equipo; "calibracion" agrupa calibración pendiente y fuera de servicio. */
type Filter = "todos" | "operativo" | "mantenimiento" | "calibracion";

const calibrationTone = (value: unknown) => deadlineTone(value);

function EquiposContent() {
  const { token, can } = useSession();
  const router = useRouter();
  const prompt = usePrompt();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const initialFilter = useInitialParam("filtro");
  const [filter, setFilter] = useState<Filter>(initialFilter === "operativo" || initialFilter === "mantenimiento" || initialFilter === "calibracion" ? initialFilter : "todos");
  const debounced = useDebouncedValue(search);
  const [showBajas, setShowBajas] = useState(initialFilter === "bajas");
  const modal = useOpenState<ApiRecord>();
  const detail = useOpenState<ApiRecord>();

  useParamChange("buscar", (value) => setSearch(value));
  useParamChange("filtro", (value) => {
    setFilter(value === "operativo" || value === "mantenimiento" || value === "calibracion" ? value : "todos");
    setShowBajas(value === "bajas");
  });

  const resource = useResource<ApiRecord[]>(
    "equipos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos?search=${encodeURIComponent(debounced.trim())}${showBajas ? "&bajas=1" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, showBajas] },
  );
  const items = resource.data;

  useUrlTrigger("nuevo", () => {
    if (can("equipos", "create")) modal.open(null);
  });

  const isAlert = (item: ApiRecord) => ["fuera_servicio", "calibracion_pendiente"].includes(String(item.estado)) || calibrationTone(item.fecha_prox_calibracion) === "danger";

  /*
   * Estado que se muestra: el guardado, salvo que un equipo operativo tenga la
   * calibración vencida por fecha (entonces se ve "Calibración vencida"). Debajo,
   * el mantenimiento pendiente que explica un "En mantenimiento".
   */
  const displayState = (item: ApiRecord): { label: string; tone: Tone; detail: string | null; detailTone: "danger" | "warning" | null } => {
    const meta = metaFor(EQUIPO_ESTADOS, item.estado);
    const fem = item.mantenimiento_tipo === "calibracion";
    const estadoTxt = item.mantenimiento_estado === "vencido" ? (fem ? "vencida" : "vencido") : item.mantenimiento_estado === "en_proceso" ? "en proceso" : fem ? "programada" : "programado";
    const pendiente = item.mantenimiento_tipo ? `${metaFor(MANTENIMIENTO_TIPOS, item.mantenimiento_tipo).label} ${estadoTxt} · ${fmtDate(item.mantenimiento_fecha)}` : null;
    if (item.estado === "operativo" && calibrationTone(item.fecha_prox_calibracion) === "danger") {
      return { label: "Calibración vencida", tone: "danger", detail: pendiente, detailTone: "danger" };
    }
    return { label: meta.label, tone: meta.tone, detail: pendiente, detailTone: item.mantenimiento_estado === "vencido" ? "danger" : pendiente ? "warning" : null };
  };

  const counts = useMemo(() => {
    const list = items || [];
    return {
      total: list.length,
      operativos: list.filter((item) => item.estado === "operativo").length,
      mantenimiento: list.filter((item) => item.estado === "mantenimiento").length,
      alertas: list.filter(isAlert).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const list = items || [];
    if (filter === "operativo") return list.filter((item) => item.estado === "operativo");
    if (filter === "mantenimiento") return list.filter((item) => item.estado === "mantenimiento");
    if (filter === "calibracion") return list.filter(isAlert);
    return list;
  }, [items, filter]);

  const editEquipo = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/equipos/${id}`, token);
      detail.close();
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el equipo");
    }
  };

  // Baja logica con motivo: el equipo conserva mantenimientos, bitacoras y registros que lo citan.
  const deleteEquipo = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Dar de baja "${item.nombre}"`, description: "El equipo deja de ofrecerse en los formatos; sus mantenimientos y los registros que lo citan se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/equipos/${item.id}`, token, { motivo });
      toast.success("Equipo dado de baja");
      detail.close();
      invalidate("equipos", "mantenimientos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja");
    }
  };

  const reactivarEquipo = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Reactivar "${item.nombre}"`, confirmLabel: "Reactivar" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/inventory/equipos/${item.id}/reactivar`, token, { motivo });
      toast.success("Equipo reactivado");
      detail.close();
      invalidate("equipos", "mantenimientos", "dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reactivar");
    }
  };

  const canCreate = can("equipos", "create");
  const canUpdate = can("equipos", "update");
  const canDelete = can("equipos", "delete");

  const selected = detail.payload;
  const selectedInactive = selected ? Number(selected.activo ?? 1) === 0 : false;
  const selectedMeta = selected ? displayState(selected) : null;

  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: filter,
      defaultValue: "todos",
      onChange: (v) => setFilter(v as Filter),
      options: [
        { value: "todos", label: "Todos", count: items ? counts.total : null },
        { value: "operativo", label: "Operativos", count: items ? counts.operativos : null },
        { value: "mantenimiento", label: "En mantenimiento", count: items ? counts.mantenimiento : null, tone: counts.mantenimiento ? "warning" : "neutral" },
        { value: "calibracion", label: "Con alerta de calibración", count: items ? counts.alertas : null, tone: counts.alertas ? "danger" : "neutral" },
      ],
    },
  ];
  const toggles: FilterToggle[] = [{ key: "bajas", label: "Mostrar bajas", description: "Incluye equipos dados de baja.", checked: showBajas, onChange: setShowBajas }];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const inactive = Number(item.activo ?? 1) === 0;
    const list: MenuItem[] = [{ label: "Ver ficha", description: "Bitácora, serie, ubicación y calibración", icon: <IdentificationCard size={16} weight="duotone" />, tone: "brand", onSelect: () => detail.open(item) }];
    if (can("mantenimiento", "create") && !inactive) list.push({ label: "Programar mantenimiento", description: "Preventivo, correctivo o calibración", icon: <Wrench size={16} weight="duotone" />, tone: "success", onSelect: () => router.push(`/inventario/mantenimiento?nuevo=1&equipo=${item.id}`) });
    if (canUpdate) list.push({ label: "Editar", description: "Cambiar datos del equipo", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => editEquipo(Number(item.id)) });
    if (canDelete) {
      if (inactive) list.push({ label: "Reactivar equipo…", description: "Vuelve al inventario con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => reactivarEquipo(item) });
      else list.push({ label: "Dar de baja…", description: "Deja de ofrecerse; conserva su historial", icon: <Trash size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => deleteEquipo(item) });
    }
    return list;
  };

  return (
    <>
      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Nuevo equipo
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, marca o modelo" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} equipos${filter !== "todos" ? " en este filtro" : ""}` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={5} />
        ) : !visible.length ? (
          <EmptyState icon={<Cube size={20} />} title={search || filter !== "todos" ? "Sin coincidencias" : "Aún no hay equipos"} description={search || filter !== "todos" ? "Ajusta la búsqueda o el filtro." : "Registra los equipos del laboratorio para programar su mantenimiento."} action={canCreate && !search && filter === "todos" ? <Button onClick={() => modal.open(null)}>Nuevo equipo</Button> : undefined} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Equipo</Th>
                <Th>Bitácora</Th>
                <Th>Ubicación</Th>
                <Th>Próxima calibración</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
                const state = displayState(item);
                const inactive = Number(item.activo ?? 1) === 0;
                const calTone = calibrationTone(item.fecha_prox_calibracion);
                return (
                  <Tr key={item.id} interactive onClick={() => detail.open(item)} className={inactive ? "opacity-60" : undefined}>
                    <Td className="max-w-[360px]">
                      <div className="flex items-center gap-2">
                        {inactive ? <Badge tone="danger">Baja</Badge> : null}
                        <CellPrimary title={item.nombre || "-"} subtitle={[item.marca, item.modelo, item.numero_serie ? `Serie ${item.numero_serie}` : null].filter(Boolean).join(" · ")} />
                      </div>
                    </Td>
                    <Td mono>{item.clave_bitacora || <span className="text-ink-4">—</span>}</Td>
                    <Td muted>{item.ubicacion || "—"}</Td>
                    <Td className="whitespace-nowrap">
                      {item.fecha_prox_calibracion ? <span className={calTone === "danger" ? "font-medium text-danger" : calTone === "warning" ? "font-medium text-warning-text" : "text-ink-2"}>{fmtDate(item.fecha_prox_calibracion)}</span> : <span className="text-ink-4">—</span>}
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <Badge tone={state.tone} dot>
                          {state.label}
                        </Badge>
                        {state.detail ? <span className={cn("text-[12px]", state.detailTone === "danger" ? "text-danger" : "text-ink-3")}>{state.detail}</span> : null}
                      </div>
                    </Td>
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={String(item.nombre || "")} />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>

      {selected && selectedMeta ? (
        <DetailSheet
          open={detail.isOpen}
          onOpenChange={(open) => {
            if (!open) detail.close();
          }}
          title={String(selected.nombre || "Equipo")}
          subtitle={[selected.marca, selected.modelo].filter(Boolean).join(" · ") || undefined}
          badges={
            <span className="flex items-center gap-1.5">
              {selectedInactive ? <Badge tone="danger">Baja</Badge> : null}
              <Badge tone={selectedMeta.tone} dot>
                {selectedMeta.label}
              </Badge>
            </span>
          }
          groups={[
            {
              title: "Identificación",
              rows: [
                { label: "Clave de bitácora", value: selected.clave_bitacora, mono: true },
                { label: "Número de serie", value: selected.numero_serie, mono: true },
                { label: "Marca", value: selected.marca },
                { label: "Modelo", value: selected.modelo },
              ],
            },
            {
              title: "Operación",
              rows: [
                { label: "Ubicación", value: selected.ubicacion },
                { label: "Responsable", value: selected.responsable },
                { label: "Próxima calibración", value: selected.fecha_prox_calibracion ? fmtDate(selected.fecha_prox_calibracion) : null },
                { label: "Mantenimiento pendiente", value: selectedMeta?.detail || null },
                { label: "Registrado", value: selected.creado_en ? fmtDate(selected.creado_en) : null },
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
                  <Button variant="secondary" icon={<ArrowCounterClockwise size={16} />} onClick={() => reactivarEquipo(selected)}>
                    Reactivar
                  </Button>
                ) : (
                  <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash size={16} />} onClick={() => deleteEquipo(selected)}>
                    Dar de baja
                  </Button>
                )
              ) : null}
              {canUpdate ? (
                <Button icon={<PencilSimple size={16} />} onClick={() => editEquipo(Number(selected.id))}>
                  Editar
                </Button>
              ) : null}
            </>
          }
        />
      ) : null}

      {modal.key ? <EquipoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
    </>
  );
}
