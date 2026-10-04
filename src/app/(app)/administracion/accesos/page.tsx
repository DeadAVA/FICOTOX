"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DownloadSimple, IdentificationCard } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { DateInput } from "@/components/ui/DateInput";
import { PageHeader, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, TableSkeleton } from "@/components/ui/Primitives";
import { StatusCell, StatusFlag } from "@/components/ui/StatusFlag";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFechaHora, hoyLocal, sumarDias } from "@/lib/shared/fechas";

/*
 * Revision de accesos (Fase 2; FX-MO-2-1, seccion 11): revision periodica de
 * quien tiene acceso y con que roles, cuentas temporales y su supervisor,
 * vencimientos proximos, cuentas bloqueadas y los cambios de roles, vigencia y
 * bloqueos de un periodo. Cada seccion se exporta a CSV. Con usuarios:V
 * "propio" el servidor solo devuelve la propia cuenta.
 */

const ACCION_LABEL: Record<string, string> = {
  bloquear: "Bloqueo por intentos fallidos",
  desbloquear: "Desbloqueo",
  asignar_rol: "Asignación de rol",
  revocar_rol: "Revocación de rol",
  vencer_rol: "Vencimiento de rol",
  cambiar_vigencia: "Cambio de vigencia o supervisor",
  restablecer_password: "Restablecimiento de contraseña",
  baja: "Baja de cuenta",
  reactivar: "Reactivación",
  cerrar_sesiones: "Cierre de sesiones",
  crear: "Alta",
};

const hace30 = () => sumarDias(hoyLocal(), -30);
const hoy = () => hoyLocal();
const hora = (value: unknown) => formatearFechaHora(value, "-");

export default function AccesosPage() {
  return (
    <PageBody>
      <PageHeader title="Revisión de accesos" description="Quién tiene acceso, con qué roles y hasta cuándo; cuentas temporales, bloqueos y cambios del periodo." />
      <RequireModule modules="usuarios">
        <AccesosContent />
      </RequireModule>
    </PageBody>
  );
}

function Seccion({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          {description ? <p className="text-[12.5px] text-ink-3">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function AccesosContent() {
  const { token } = useSession();
  const [desde, setDesde] = useState(hace30);
  const [hasta, setHasta] = useState(hoy);
  const [dias, setDias] = useState("30");
  const query = `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}&dias=${encodeURIComponent(dias)}`;
  const resource = useResource<ApiRecord>("usuarios", () => getJsonAuth(`${API_BASE_URL}/admin/accesos?${query}`, token), { enabled: !!token, deps: [query] });
  const data = resource.data;

  // Descarga el CSV con el token (no es un enlace publico).
  // Solo la lista de cuentas: los eventos vienen de la bitacora, que no se exporta (decision del laboratorio).
  const exportar = async (seccion: "cuentas") => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/accesos?${query}&formato=csv&seccion=${seccion}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(String(body?.message || `No se pudo exportar (${res.status})`));
      }
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `revision-accesos-${seccion}-${hoy()}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo exportar");
    }
  };

  if (resource.error) return <ErrorState message={resource.error} onRetry={resource.reload} />;

  const cuentas = (data?.cuentas || []) as ApiRecord[];
  const temporales = (data?.temporales || []) as ApiRecord[];
  const vencimientos = (data?.vencimientos || []) as ApiRecord[];
  const bloqueadas = (data?.bloqueadas || []) as ApiRecord[];
  const eventos = (data?.eventos || []) as ApiRecord[];

  return (
    <div className="flex flex-col gap-8">
      <Toolbar>
        <Field label="Periodo desde" htmlFor="acc-desde">
          <DateInput id="acc-desde" value={desde} onChange={(value) => setDesde(value)} small />
        </Field>
        <Field label="hasta" htmlFor="acc-hasta">
          <DateInput id="acc-hasta" value={hasta} onChange={(value) => setHasta(value)} small />
        </Field>
        <Field label="Vencimientos en" htmlFor="acc-dias">
          <Select id="acc-dias" value={dias} onChange={(event) => setDias(event.target.value)}>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
          </Select>
        </Field>
      </Toolbar>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Cuentas activas" value={data ? fmt(cuentas.filter((c) => c.activo).length) : "-"} />
        <Stat label="Temporales" value={data ? fmt(temporales.length) : "-"} tone="brand" />
        <Stat label={`Vencen en ${dias} días`} value={data ? fmt(vencimientos.length) : "-"} tone={vencimientos.length ? "warning" : "neutral"} />
        <Stat label="Bloqueadas" value={data ? fmt(bloqueadas.length) : "-"} tone={bloqueadas.length ? "danger" : "neutral"} />
        <Stat label="Eventos del periodo" value={data ? fmt(eventos.length) : "-"} />
      </div>

      <Seccion
        title="Cuentas y roles vigentes"
        description="Cada cuenta con su tipo, vigencia, supervisor y roles vigentes o por comenzar."
        actions={
          <Button variant="secondary" size="sm" icon={<DownloadSimple size={15} />} onClick={() => exportar("cuentas")}>
            Exportar CSV de cuentas
          </Button>
        }
      >
        <TableShell footer={data ? `${fmt(cuentas.length)} cuentas` : undefined}>
          {!data ? (
            <TableSkeleton cols={5} />
          ) : !cuentas.length ? (
            <EmptyState compact icon={<IdentificationCard size={20} />} title="Sin cuentas" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cuenta</Th>
                  <Th>Tipo y vigencia</Th>
                  <Th>Supervisor</Th>
                  <Th>Roles</Th>
                  <Th>Estado</Th>
                </tr>
              </THead>
              <TBody>
                {cuentas.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium text-ink">{c.nombre || "Sin nombre"}</span>
                        <span className="text-[12px] text-ink-3">{c.email}</span>
                      </div>
                    </Td>
                    <Td muted>
                      {c.tipo_cuenta === "temporal" ? "Temporal" : "Permanente"}
                      {c.vigente_desde ? ` · desde ${fmtDate(c.vigente_desde)}` : ""}
                      {c.vigente_hasta ? ` · hasta ${fmtDate(c.vigente_hasta)}` : ""}
                    </Td>
                    <Td muted>{c.supervisor_nombre || "-"}</Td>
                    <Td className="max-w-[340px]">
                      <div className="flex flex-wrap gap-1">
                        {((c.roles || []) as ApiRecord[]).map((r, i) => (
                          <Badge key={`${r.rol}-${i}`} tone={r.estado === "futuro" ? "neutral" : "brand"}>
                            {r.rol}
                            {r.vigente_hasta ? ` · hasta ${fmtDate(r.vigente_hasta)}` : ""}
                            {r.estado === "futuro" ? " · por comenzar" : ""}
                          </Badge>
                        ))}
                        {!((c.roles || []) as ApiRecord[]).length ? <Badge tone="warning">Sin roles</Badge> : null}
                      </div>
                    </Td>
                    <Td>
                      <StatusCell>
                        <Badge tone={c.activo ? "success" : "neutral"} dot>
                          {c.activo ? "Activa" : "Inactiva"}
                        </Badge>
                        {c.activo && c.cuenta_vigente === false ? <StatusFlag kind="error" label="Fuera de vigencia" detail="La cuenta aún no inicia o ya terminó su vigencia." /> : null}
                        {c.bloqueado_hasta ? <StatusFlag kind="bloqueo" label="Bloqueada" detail="Por intentos fallidos de acceso." /> : null}
                      </StatusCell>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion title="Cuentas temporales" description="Estudiantes y estancias: su supervisor da el visto bueno de lo que capturan.">
        <TableShell>
          {!data ? (
            <TableSkeleton cols={3} rows={3} />
          ) : !temporales.length ? (
            <EmptyState compact title="Sin cuentas temporales" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cuenta</Th>
                  <Th>Vigencia</Th>
                  <Th>Supervisor</Th>
                </tr>
              </THead>
              <TBody>
                {temporales.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <span className="font-medium text-ink">{c.nombre}</span> <span className="text-[12px] text-ink-3">{c.email}</span>
                    </Td>
                    <Td muted>
                      {c.vigente_desde ? `${fmtDate(c.vigente_desde)} – ` : "Hasta "}
                      {fmtDate(c.vigente_hasta)}
                    </Td>
                    <Td muted>{c.supervisor_nombre || "Sin supervisor"}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion title="Vencimientos próximos" description={`Cuentas y roles que terminan en los próximos ${dias} días.`}>
        <TableShell>
          {!data ? (
            <TableSkeleton cols={3} rows={3} />
          ) : !vencimientos.length ? (
            <EmptyState compact title="Nada vence en ese plazo" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Vence</Th>
                  <Th>Cuenta</Th>
                  <Th>Qué vence</Th>
                </tr>
              </THead>
              <TBody>
                {vencimientos.map((v, i) => (
                  <Tr key={`${v.usuario_id}-${v.tipo}-${i}`}>
                    <Td className="tnum">{fmtDate(v.vigente_hasta)}</Td>
                    <Td>
                      <span className="font-medium text-ink">{v.nombre}</span> <span className="text-[12px] text-ink-3">{v.email}</span>
                    </Td>
                    <Td muted>{v.tipo === "cuenta" ? "La cuenta" : `Rol ${v.rol}`}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion title="Cuentas bloqueadas" description="Bloqueadas por intentos fallidos; se desbloquean solas al vencer el plazo o desde Usuarios.">
        <TableShell>
          {!data ? (
            <TableSkeleton cols={2} rows={2} />
          ) : !bloqueadas.length ? (
            <EmptyState compact title="Ninguna cuenta bloqueada" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Cuenta</Th>
                  <Th>Bloqueada hasta</Th>
                </tr>
              </THead>
              <TBody>
                {bloqueadas.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <span className="font-medium text-ink">{c.nombre}</span> <span className="text-[12px] text-ink-3">{c.email}</span>
                    </Td>
                    <Td className="tnum">{hora(c.bloqueado_hasta)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion
        title="Cambios del periodo"
        description="Bloqueos, desbloqueos, asignaciones, revocaciones y vencimientos de roles, cambios de vigencia, restablecimientos de contraseña y bajas."
      >
        <TableShell footer={data ? `${fmt(eventos.length)} eventos` : undefined}>
          {!data ? (
            <TableSkeleton cols={5} />
          ) : !eventos.length ? (
            <EmptyState compact title="Sin cambios en el periodo" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Evento</Th>
                  <Th>Cuenta</Th>
                  <Th>Motivo</Th>
                  <Th>Realizó</Th>
                </tr>
              </THead>
              <TBody>
                {eventos.map((e) => (
                  <Tr key={e.id}>
                    <Td className="tnum whitespace-nowrap">{hora(e.fecha_hora)}</Td>
                    <Td>
                      {ACCION_LABEL[String(e.accion)] || String(e.accion)}
                      {e.rol ? <span className="text-ink-3"> · {String(e.rol)}</span> : null}
                    </Td>
                    <Td muted>{e.referencia || "-"}</Td>
                    <Td muted className="max-w-[320px]">
                      {e.motivo || "-"}
                    </Td>
                    <Td muted>{e.por}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>
    </div>
  );
}
