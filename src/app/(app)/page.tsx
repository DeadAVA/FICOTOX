"use client";

import Link from "next/link";
import { ArrowRight, Flask, Package, Plus, TestTube, Wrench } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { useSession } from "@/components/session/SessionProvider";
import { Badge, Card, CardHeader, EmptyState, ErrorState, Skeleton, Stat } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { sampleStatusLabel } from "@/lib/client/samples";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

interface Overview {
  counters: ApiRecord;
  recent_movements: ApiRecord[];
  recent_maintenances: ApiRecord[];
  pending: ApiRecord[];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const SAMPLE_TONE: Record<string, "brand" | "warning" | "success" | "neutral"> = { registrada: "brand", en_proceso: "warning", completada: "success", pendiente: "neutral" };

export default function InicioPage() {
  const { token, user, can } = useSession();

  const resource = useResource<Overview>(
    ["dashboard", "movimientos", "mantenimientos", "muestras"],
    async () => {
      const empty: ApiRecord = {};
      const [overview, pending] = await Promise.all([
        can("dashboard") ? getJsonAuth(`${API_BASE_URL}/dashboard/overview`, token) : Promise.resolve(empty),
        can("muestras") ? getJsonAuth(`${API_BASE_URL}/samples/pending`, token).catch(() => empty) : Promise.resolve(empty),
      ]);
      return {
        counters: (overview.counters || {}) as ApiRecord,
        recent_movements: (overview.recent_movements || []) as ApiRecord[],
        recent_maintenances: (overview.recent_maintenances || []) as ApiRecord[],
        pending: (pending.items || []) as ApiRecord[],
      };
    },
    { enabled: !!token },
  );

  const data = resource.data;
  const counters = data?.counters || {};
  const rawToday = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);
  const firstName = (user?.nombre || user?.email || "").split(/[\s@]/)[0];

  const quick = [
    { label: "Nueva recepción", href: "/muestras/recepcion/nueva", icon: <TestTube size={16} />, allowed: can("muestras", "create") },
    { label: "Nuevo reactivo", href: "/inventario/reactivos?nuevo=1", icon: <Flask size={16} />, allowed: can("reactivos", "create") },
    { label: "Nuevo consumible", href: "/inventario/consumibles?nuevo=1", icon: <Package size={16} />, allowed: can("consumibles", "create") },
    { label: "Programar mantenimiento", href: "/inventario/mantenimiento?nuevo=1", icon: <Wrench size={16} />, allowed: can("mantenimiento", "create") },
  ].filter((item) => item.allowed);

  return (
    <PageBody>
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-ink-3">{today}</p>
          <h1 className="display text-[34px] text-ink md:text-[40px]">
            {greeting()}, {firstName || "bienvenido"}.
          </h1>
          <p className="text-[14px] text-ink-2">Así está el laboratorio hoy.</p>
        </div>
        {quick.length ? (
          <div className="flex flex-wrap gap-2">
            {quick.map((item) => (
              <Link key={item.href} href={item.href} className="press inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:border-line-strong hover:bg-surface-2">
                <span className="text-brand">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      {resource.error ? (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {!data ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-card" />)
            ) : (
              <>
                <Stat label="Reactivos" value={fmt(counters.total_reactivos)} hint={`${fmt(counters.total_equipos)} equipos registrados`} icon={<Flask size={18} />} />
                <Stat label="Consumibles" value={fmt(counters.total_consumibles)} hint={`${fmt(counters.entradas_consumibles)} piezas ingresadas · ${fmt(counters.salidas_consumibles)} descontadas`} icon={<Package size={18} />} />
                <Stat label="Muestras" value={fmt(counters.total_muestras)} hint={`${fmt(data.pending.length)} en curso`} icon={<TestTube size={18} />} tone={data.pending.length ? "brand" : "neutral"} />
                <Stat label="Mantenimientos próximos" value={fmt(counters.mantenimientos_proximos)} hint={`${fmt(counters.mantenimientos_vencidos)} vencidos · ${fmt(counters.mantenimientos_pendientes)} pendientes`} icon={<Wrench size={18} />} tone={Number(counters.mantenimientos_vencidos) > 0 ? "danger" : Number(counters.mantenimientos_proximos) > 0 ? "warning" : "neutral"} />
              </>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <Card padded={false} className="overflow-hidden">
              <CardHeader
                className="px-5 pt-5"
                title="Muestras en curso"
                description="Registros que aún no se completan."
                actions={
                  can("muestras") ? (
                    <Link href="/muestras" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
                      Ver muestras <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />
              {!data ? (
                <div className="flex flex-col gap-3 px-5 pb-5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ) : !data.pending.length ? (
                <EmptyState compact icon={<TestTube size={18} />} title="Nada pendiente" description={can("muestras", "create") ? "Registra una recepción para iniciar el flujo." : "No hay muestras en curso."} action={can("muestras", "create") ? <Link href="/muestras/recepcion/nueva" className="press inline-flex h-8 items-center gap-1.5 rounded-control bg-brand px-3 text-[13px] font-medium text-white hover:bg-brand-strong"><Plus size={14} weight="bold" /> Nueva recepción</Link> : undefined} />
              ) : (
                <div className="scroll-thin overflow-x-auto">
                  <Table>
                    <THead>
                      <tr>
                        <Th>Folio</Th>
                        <Th>Etapa</Th>
                        <Th>Solicitante / ID</Th>
                        <Th>Estado</Th>
                        <Th>Fecha</Th>
                      </tr>
                    </THead>
                    <TBody>
                      {data.pending.slice(0, 8).map((item) => {
                        const status = String(item.estado || "").toLowerCase();
                        const kind = String(item.tipo || "");
                        const href = kind === "Procesamiento" ? `/muestras/procesamiento/${item.id}` : kind === "Extraccion" ? `/muestras/extraccion/${item.id}` : `/muestras/recepcion/${item.id}`;
                        return (
                          <Tr key={`${kind}-${item.id}`} interactive onClick={() => (window.location.href = href)}>
                            <Td mono className="font-medium text-ink">
                              {item.codigo || "-"}
                            </Td>
                            <Td muted>{kind === "Extraccion" ? "Extracción" : kind || "Recepción"}</Td>
                            <Td muted className="max-w-[220px] truncate">
                              {item.cliente || "-"}
                            </Td>
                            <Td>
                              <Badge tone={SAMPLE_TONE[status] || "neutral"} dot>
                                {sampleStatusLabel(status)}
                              </Badge>
                            </Td>
                            <Td muted>{fmtDate(item.fecha_ingreso)}</Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Mantenimiento"
                description="Próximos y recientes."
                actions={
                  can("mantenimiento") ? (
                    <Link href="/inventario/mantenimiento" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
                      Ver todo <ArrowRight size={14} />
                    </Link>
                  ) : null
                }
              />
              {!data ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : !data.recent_maintenances.length ? (
                <EmptyState compact icon={<Wrench size={18} />} title="Sin mantenimientos" description="No hay mantenimientos registrados." />
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {data.recent_maintenances.slice(0, 6).map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-[13.5px] font-medium text-ink">{item.equipo || "Equipo sin nombre"}</span>
                        <span className="text-[12.5px] text-ink-3">
                          {fmtDate(item.fecha_programada)}
                          {item.responsable ? ` · ${item.responsable}` : ""}
                        </span>
                      </div>
                      <Badge tone={item.estado === "completado" ? "success" : item.estado === "vencido" ? "danger" : item.estado === "en_proceso" ? "warning" : "brand"}>{String(item.tipo || "-")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card padded={false} className="overflow-hidden">
            <CardHeader
              className="px-5 pt-5"
              title="Últimos movimientos de inventario"
              actions={
                can("movimientos") ? (
                  <Link href="/movimientos" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
                    Ver historial <ArrowRight size={14} />
                  </Link>
                ) : null
              }
            />
            {!data ? (
              <div className="flex flex-col gap-3 px-5 pb-5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : !data.recent_movements.length ? (
              <EmptyState compact title="Sin movimientos" description="Los descuentos y rellenos aparecerán aquí." />
            ) : (
              <div className="scroll-thin overflow-x-auto">
                <Table>
                  <THead>
                    <tr>
                      <Th>Fecha</Th>
                      <Th>Tipo</Th>
                      <Th>Origen</Th>
                      <Th>Insumo</Th>
                      <Th align="right">Cantidad</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {data.recent_movements.slice(0, 8).map((item) => {
                      const type = String(item.tipo || "").toLowerCase();
                      return (
                        <Tr key={item.id}>
                          <Td muted className="whitespace-nowrap">
                            {fmtDate(item.fecha_hora)}
                          </Td>
                          <Td>
                            <Badge tone={type === "entrada" ? "success" : type === "salida" ? "bloom" : "neutral"} dot>
                              {item.tipo || "-"}
                            </Badge>
                          </Td>
                          <Td muted>{item.tabla_origen === "reactivos" ? "Reactivo" : item.tabla_origen === "consumibles" ? "Consumible" : item.tabla_origen || "-"}</Td>
                          <Td className="font-medium">{item.item_nombre || `Item #${item.id_item || item.id}`}</Td>
                          <Td align="right">{fmt(item.cantidad)}</Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </PageBody>
  );
}
