"use client";

import { useMemo, useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { FilterChips, FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, normalizeText } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

type Origin = "todos" | "reactivos" | "consumibles";

const insumoName = (item: ApiRecord) => item.item_nombre || item.item_codigo || `#${item.id_item || "-"}`;

export default function MovimientosPage() {
  return (
    <RequireModule modules="movimientos">
      <MovimientosContent />
    </RequireModule>
  );
}

function MovimientosContent() {
  const { token } = useSession();
  const [origin, setOrigin] = useState<Origin>("todos");
  const [search, setSearch] = useState("");

  const resource = useResource<{ items: ApiRecord[]; summary: ApiRecord }>(
    "movimientos",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/inventory/movimientos`, token);
      return { items: (data.items || []) as ApiRecord[], summary: (data.summary || {}) as ApiRecord };
    },
    { enabled: !!token },
  );

  const rows = useMemo(() => {
    const list = resource.data?.items || [];
    const term = normalizeText(search);
    return list.filter((item) => {
      if (origin !== "todos" && item.tabla_origen !== origin) return false;
      if (!term) return true;
      return normalizeText(`${insumoName(item)} ${item.item_codigo || ""} ${item.referencia || ""} ${item.motivo || ""}`).includes(term);
    });
  }, [resource.data, origin, search]);

  const summary = resource.data?.summary || {};
  const groups: FilterGroup[] = [
    {
      key: "origen",
      label: "Origen",
      value: origin,
      defaultValue: "todos",
      onChange: (v) => setOrigin(v as Origin),
      options: [
        { value: "todos", label: "Todos", count: resource.data ? Number(summary.total || 0) : null },
        { value: "reactivos", label: "Reactivos", count: resource.data ? Number(summary.reactivos || 0) : null },
        { value: "consumibles", label: "Consumibles", count: resource.data ? Number(summary.consumibles || 0) : null },
      ],
    },
  ];

  return (
    <PageBody>
      <PageHeader title="Movimientos" description="Entradas y salidas de reactivos y consumibles, incluidas las generadas al procesar muestras." />

      <Toolbar
        end={
          resource.data ? (
            <p className="tnum text-[12.5px] text-ink-3">
              Hoy <span className="font-medium text-ink">{fmt(summary.hoy || 0)}</span> · Esta semana <span className="font-medium text-ink">{fmt(summary.semana || 0)}</span> · Este mes <span className="font-medium text-ink">{fmt(summary.mes || 0)}</span>
            </p>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por insumo, referencia o motivo" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} />
        <FilterChips groups={groups} />
      </Toolbar>

      <TableShell footer={resource.data ? `${fmt(rows.length)} movimientos` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !resource.data ? (
          <TableSkeleton cols={6} />
        ) : !rows.length ? (
          <EmptyState icon={<ArrowsLeftRight size={20} />} title="Sin movimientos" description={search || origin !== "todos" ? "No hay movimientos con ese filtro." : "Los descuentos y rellenos de inventario aparecerán aquí."} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Fecha</Th>
                <Th>Insumo</Th>
                <Th>Referencia</Th>
                <Th>Tipo</Th>
                <Th>Origen</Th>
                <Th align="right">Cantidad</Th>
                <Th>Motivo</Th>
              </tr>
            </THead>
            <TBody>
              {rows.map((item) => {
                const type = String(item.tipo || "").toLowerCase();
                return (
                  <Tr key={item.id}>
                    <Td muted className="whitespace-nowrap">
                      {fmtDate(item.fecha_hora)}
                    </Td>
                    <Td className="max-w-[280px]">
                      <CellPrimary title={insumoName(item)} subtitle={item.item_codigo || undefined} />
                    </Td>
                    <Td mono className="max-w-[160px] truncate">
                      {item.referencia || "-"}
                    </Td>
                    <Td>
                      <Badge tone={type === "entrada" ? "success" : type === "salida" ? "bloom" : "neutral"} dot>
                        {item.tipo || "-"}
                      </Badge>
                    </Td>
                    <Td muted>{item.tabla_origen === "reactivos" ? "Reactivo" : item.tabla_origen === "consumibles" ? "Consumible" : item.tabla_origen || "-"}</Td>
                    <Td align="right" className="font-medium">
                      {fmt(item.cantidad)}
                    </Td>
                    <Td muted className="max-w-[200px] truncate">
                      {item.motivo || "-"}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>
    </PageBody>
  );
}
