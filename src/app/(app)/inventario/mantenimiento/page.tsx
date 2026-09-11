"use client";

import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { PencilSimple, Plus, Prohibit, Wrench } from "@phosphor-icons/react";
import { MantenimientoSheet } from "@/components/features/inventory/EquipoSheets";
import { MANTENIMIENTO_ESTADOS, MANTENIMIENTO_TIPOS, metaFor } from "@/components/features/inventory/meta";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, todayIso } from "@/lib/client/format";
import { useDebouncedValue, useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
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
  const prompt = usePrompt();
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  type EstadoFilter = "" | "pendiente" | "proximo" | "completado" | "vencido";
  const ESTADOS: EstadoFilter[] = ["", "pendiente", "proximo", "completado", "vencido"];
  const initialFilter = useInitialParam("filtro");
  // Por omisión solo lo pendiente: lo completado es historial del equipo.
  const [estado, setEstado] = useState<EstadoFilter>(ESTADOS.includes(initialFilter as EstadoFilter) && initialFilter ? (initialFilter as EstadoFilter) : "pendiente");
  useParamChange("filtro", (value) => setEstado(ESTADOS.includes(value as EstadoFilter) && value ? (value as EstadoFilter) : "pendiente"));
  const debounced = useDebouncedValue(search);
  const modal = useOpenState<ApiRecord>();

  const resource = useResource<ApiRecord[]>(
    "mantenimientos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos?search=${encodeURIComponent(debounced.trim())}&tipo=${encodeURIComponent(tipo)}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token, deps: [debounced, tipo] },
  );
  const items = resource.data;

  // ?nuevo=1&equipo=ID (desde la ficha o el menú de un equipo) abre el alta con el equipo ya elegido.
  const equipoPrefill = useInitialParam("equipo");
  useUrlTrigger("nuevo", () => {
    if (can("mantenimiento", "create")) modal.open(equipoPrefill ? ({ id_equipo: Number(equipoPrefill) } as ApiRecord) : null);
  });

  // Mismas reglas que los contadores del Inicio: vencido = estado "vencido" o pendiente con fecha pasada;
  // próximo = pendiente con fecha en los siguientes 30 días. Las fechas se fijan al montar.
  const [dates] = useState(() => {
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    return { today: todayIso(), in30: `${in30.getFullYear()}-${String(in30.getMonth() + 1).padStart(2, "0")}-${String(in30.getDate()).padStart(2, "0")}` };
  });
  const rules = useMemo(() => {
    const dateOf = (item: ApiRecord) => String(item.fecha_programada || "").slice(0, 10);
    const isPendiente = (item: ApiRecord) => ["programado", "en_proceso"].includes(String(item.estado));
    return {
      abierto: (item: ApiRecord) => isPendiente(item) || item.estado === "vencido",
      vencido: (item: ApiRecord) => item.estado === "vencido" || (isPendiente(item) && dateOf(item) < dates.today),
      proximo: (item: ApiRecord) => isPendiente(item) && dateOf(item) >= dates.today && dateOf(item) <= dates.in30,
      completado: (item: ApiRecord) => item.estado === "completado",
    };
  }, [dates]);
  const stats = useMemo(() => {
    const list = items || [];
    return { total: list.length, pendientes: list.filter(rules.abierto).length, proximos: list.filter(rules.proximo).length, completados: list.filter(rules.completado).length, vencidos: list.filter(rules.vencido).length };
  }, [items, rules]);

  const visible = useMemo(() => {
    const list = items || [];
    if (estado === "pendiente") return list.filter(rules.abierto);
    if (estado === "proximo") return list.filter(rules.proximo);
    if (estado === "completado") return list.filter(rules.completado);
    if (estado === "vencido") return list.filter(rules.vencido);
    return list;
  }, [items, estado, rules]);

  const editItem = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/mantenimientos/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el mantenimiento");
    }
  };

  // Los mantenimientos forman el historial del equipo: se cancelan con motivo, no se borran.
  const deleteItem = async (item: ApiRecord) => {
    const motivo = await prompt({ title: "Cancelar mantenimiento", description: "El registro queda como cancelado con el motivo; sigue visible en el historial del equipo.", confirmLabel: "Cancelar mantenimiento", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/inventory/mantenimientos/${item.id}`, token, { motivo });
      toast.success("Mantenimiento cancelado");
      invalidate("mantenimientos", "documentos", "dashboard", "equipos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    }
  };

  const canCreate = can("mantenimiento", "create");
  const canUpdate = can("mantenimiento", "update");
  const canDelete = can("mantenimiento", "delete");
  const filtered = !!(search || tipo || estado !== "pendiente");

  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: estado,
      defaultValue: "pendiente",
      onChange: (v) => setEstado(v as EstadoFilter),
      options: [
        { value: "pendiente", label: "Pendientes (programados, en proceso o vencidos)", count: items ? stats.pendientes : null },
        { value: "proximo", label: "Próximos 30 días", count: items ? stats.proximos : null },
        { value: "vencido", label: "Vencidos", count: items ? stats.vencidos : null, tone: stats.vencidos ? "danger" : "neutral" },
        { value: "completado", label: "Completados (historial)", count: items ? stats.completados : null },
        { value: "", label: "Todos", count: items ? stats.total : null },
      ],
    },
    {
      key: "tipo",
      label: "Tipo",
      value: tipo,
      defaultValue: "",
      onChange: setTipo,
      options: [{ value: "", label: "Cualquiera" }, ...MANTENIMIENTO_TIPOS.map((t) => ({ value: t.value, label: t.label }))],
    },
  ];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const list: MenuItem[] = [];
    if (canUpdate) list.push({ label: "Editar", description: "Cambiar fecha, técnico, estado u observaciones", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => editItem(Number(item.id)) });
    if (canDelete) list.push({ label: "Cancelar mantenimiento…", description: "Queda cancelado con motivo en el historial", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", disabled: item.estado === "cancelado", separatorBefore: list.length > 0, onSelect: () => deleteItem(item) });
    return list;
  };

  return (
    <>
      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Programar mantenimiento
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por equipo o proveedor" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} />
        <FilterChips groups={groups} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(visible.length)} registros` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !visible.length ? (
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
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {visible.map((item) => {
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
                    <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                      <ActionMenu items={menuFor(item)} header={String(item.equipo || "Mantenimiento")} />
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
