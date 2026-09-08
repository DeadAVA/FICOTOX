"use client";

import { useMemo, useState } from "react";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, TableSkeleton } from "@/components/ui/Primitives";
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

  return (
    <PageBody>
      <PageHeader title="Movimientos" description="Entradas y salidas de reactivos y consumibles, incluidas las generadas al procesar muestras." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={fmt(summary.total || 0)} />
        <Stat label="Hoy" value={fmt(summary.hoy || 0)} tone="brand" />
        <Stat label="Esta semana" value={fmt(summary.semana || 0)} />
        <Stat label="Este mes" value={fmt(summary.mes || 0)} />
        <Stat label="Reactivos" value={fmt(summary.reactivos || 0)} />
        <Stat label="Consumibles" value={fmt(summary.consumibles || 0)} />
      </div>

      <Toolbar
        end={
          <SegmentedTabs
            value={origin}
            onChange={setOrigin}
            options={[
              { value: "todos", label: "Todos" },
              { value: "reactivos", label: "Reactivos" },
              { value: "consumibles", label: "Consumibles" },
            ]}
          />
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por insumo, referencia o motivo" className="w-full md:w-[380px]" />
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
                    <Td mono className="max-w-[220px] truncate">
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
                    <Td muted className="max-w-[260px] truncate">
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
