"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { ArrowSquareOut, CheckCircle, Prohibit, Stamp, XCircle } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { describirSolicitud, GRUPO_DE_ENTIDAD, haceCuanto, hrefDeSolicitud, NOMBRE_GRUPO, useAccionesSolicitud } from "@/components/features/solicitudes/Solicitudes";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Switch } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ETIQUETA_ESTADO_SOLICITUD, type EstadoSolicitud } from "@/lib/shared/acciones-criticas";
import { formatearFecha, formatearFechaHora } from "@/lib/shared/fechas";

/*
 * "Por autorizar" (Fase 3). Las acciones criticas (anular fuera de borrador,
 * anular un informe autorizado, asignar un rol, reactivar o ampliar una cuenta,
 * excepcion de segregacion) no se ejecutan al pedirse: crean una solicitud que
 * un SEGUNDO usuario, distinto del solicitante y con el permiso de la accion,
 * aprueba (confirmando su contrasena; el servidor ejecuta la accion) o rechaza
 * con motivo. Quien la pidio puede cancelarla. Vencen a los 7 dias.
 * La ve toda persona con sesion: la bandeja solo trae lo que le toca.
 */

const TONO_ESTADO: Record<string, Tone> = { pendiente: "warning", aprobada: "success", rechazada: "danger", cancelada: "neutral", vencida: "neutral" };

export function EstadoSolicitudBadge({ estado }: { estado: unknown }) {
  const key = String(estado || "") as EstadoSolicitud;
  return <Badge tone={TONO_ESTADO[key] || "neutral"}>{ETIQUETA_ESTADO_SOLICITUD[key] || key || "—"}</Badge>;
}

export default function SolicitudesPage() {
  return (
    <Suspense fallback={null}>
      <Bandeja />
    </Suspense>
  );
}

function Bandeja() {
  const { token, user } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const modulo = params.get("modulo") || "";
  const [historial, setHistorial] = useState(false);
  const acciones = useAccionesSolicitud();

  const resource = useResource<ApiRecord[]>(
    ["solicitudes", historial ? "solicitudes:todas" : "solicitudes:pendientes"],
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/solicitudes${historial ? "?estado=todas" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const todos = resource.data || [];
  const items = modulo ? todos.filter((i) => GRUPO_DE_ENTIDAD[String(i.entidad)] === modulo) : todos;
  const porAutorizar = items.filter((i) => i.puedo_aprobar);
  const mias = items.filter((i) => Number(i.solicitado_por) === Number(user?.id));
  const resto = items.filter((i) => !i.puedo_aprobar && Number(i.solicitado_por) !== Number(user?.id));
  const grupos = [...new Set(todos.filter((i) => i.puedo_aprobar).map((i) => GRUPO_DE_ENTIDAD[String(i.entidad)]).filter(Boolean))];

  const fila = (item: ApiRecord, botones: ReactNode) => {
    const href = hrefDeSolicitud(item);
    return (
      <Tr key={String(item.id)}>
        <Td className="max-w-[340px]">
          <CellPrimary
            title={`#${String(item.id)} · ${String(item.etiqueta)}`}
            subtitle={
              <span className="flex flex-wrap items-center gap-1.5">
                {href ? (
                  <Link href={href} className="inline-flex items-center gap-1 text-brand hover:underline">
                    {String(item.referencia || item.entidad_id)} <ArrowSquareOut size={12} />
                  </Link>
                ) : (
                  <span>{String(item.referencia || item.entidad_id)}</span>
                )}
                {describirSolicitud(item) !== String(item.etiqueta) ? (
                  <>
                    <span className="text-ink-4">·</span>
                    <span>{describirSolicitud(item)}</span>
                  </>
                ) : null}
              </span>
            }
          />
        </Td>
        <Td muted>
          <p className="text-ink-2">
            {String(item.solicitado_nombre || `usuario #${String(item.solicitado_por)}`)}
            {item.solicitado_rol ? <span className="text-ink-4"> · {String(item.solicitado_rol)}</span> : null}
          </p>
          <p className="tnum text-[12px]" title={formatearFechaHora(item.solicitado_en)}>
            {haceCuanto(item.solicitado_en)}
          </p>
        </Td>
        <Td className="max-w-[320px]">
          <p className="whitespace-pre-line text-[13px] text-ink-2">{String(item.motivo || "—")}</p>
          {item.motivo_resolucion && item.estado !== "pendiente" ? <p className="mt-0.5 whitespace-pre-line text-[12px] text-ink-3">Resolución: {String(item.motivo_resolucion)}</p> : null}
        </Td>
        <Td>
          <EstadoSolicitudBadge estado={item.estado} />
          {item.estado === "pendiente" ? <p className="tnum mt-0.5 text-[11.5px] text-ink-3">Vence {formatearFecha(item.vence_en)}</p> : item.resuelto_nombre ? <p className="mt-0.5 text-[11.5px] text-ink-3">{String(item.resuelto_nombre)} · {formatearFechaHora(item.resuelto_en)}</p> : null}
        </Td>
        <Td align="right">
          <div className="flex flex-wrap justify-end gap-2">{botones}</div>
        </Td>
      </Tr>
    );
  };

  const tabla = (lista: ApiRecord[], botones: (item: ApiRecord) => ReactNode, vacio: { title: string; description: string }) => (
    <TableShell>
      {resource.loading && !resource.data ? (
        <TableSkeleton rows={3} cols={5} />
      ) : lista.length ? (
        <Table>
          <THead>
            <Tr>
              <Th>Qué y de qué registro</Th>
              <Th>Quién y hace cuánto</Th>
              <Th>Motivo</Th>
              <Th>Estado</Th>
              <Th align="right">Acciones</Th>
            </Tr>
          </THead>
          <TBody>{lista.map((item) => fila(item, botones(item)))}</TBody>
        </Table>
      ) : (
        <EmptyState compact icon={<CheckCircle size={22} weight="duotone" />} title={vacio.title} description={vacio.description} />
      )}
    </TableShell>
  );

  return (
    <PageBody>
      <PageHeader
        title="Por autorizar"
        description="Acciones críticas que esperan la aprobación de un segundo usuario: anulaciones fuera de borrador, informes autorizados, asignación de roles, reactivaciones, ampliaciones de vigencia y excepciones de segregación. Quien las pide no puede aprobarlas."
        actions={<Switch id="sol-historial" checked={historial} onCheckedChange={setHistorial} label="Ver historial" />}
      />

      {resource.error ? <ErrorState message={resource.error} onRetry={resource.reload} /> : null}

      {modulo || grupos.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por módulo">
          <button type="button" onClick={() => router.replace("/solicitudes")} className={cn("press h-8 rounded-full px-3 text-[13px] font-medium", !modulo ? "bg-ink text-white" : "bg-surface text-ink-2 shadow-card hover:text-ink")}>
            Todos
          </button>
          {[...new Set([...(modulo ? [modulo] : []), ...grupos])].map((g) => (
            <button key={g} type="button" onClick={() => router.replace(`/solicitudes?modulo=${g}`)} className={cn("press h-8 rounded-full px-3 text-[13px] font-medium", modulo === g ? "bg-ink text-white" : "bg-surface text-ink-2 shadow-card hover:text-ink")}>
              {NOMBRE_GRUPO[g] || g}
            </button>
          ))}
        </div>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="sol-pendientes">
        <h2 id="sol-pendientes" className="title-3 text-ink">
          Pendientes de tu autorización
        </h2>
        {tabla(
          porAutorizar,
          (item) => (
            <>
              <Button size="sm" variant="secondary" icon={<XCircle size={15} />} onClick={() => acciones.rechazar(item)}>
                Rechazar
              </Button>
              <Button size="sm" icon={<Stamp size={15} />} onClick={() => acciones.aprobar(item)}>
                Aprobar
              </Button>
            </>
          ),
          { title: "Nada pendiente de tu autorización", description: modulo ? `No hay solicitudes de ${NOMBRE_GRUPO[modulo] || modulo} que puedas aprobar.` : "Cuando alguien pida una acción crítica que tú puedas aprobar, aparecerá aquí." },
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="sol-mias">
        <h2 id="sol-mias" className="title-3 text-ink">
          Mis solicitudes
        </h2>
        {tabla(
          mias,
          (item) =>
            item.puedo_cancelar ? (
              <Button size="sm" variant="secondary" icon={<Prohibit size={15} />} onClick={() => acciones.cancelar(item)}>
                Cancelar solicitud
              </Button>
            ) : null,
          { title: historial ? "No has hecho solicitudes" : "No tienes solicitudes pendientes", description: "Cuando pidas una acción crítica, aquí verás si ya la aprobaron o rechazaron." },
        )}
      </section>

      {historial && resto.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="sol-otras">
          <h2 id="sol-otras" className="title-3 text-ink">
            Otras solicitudes
          </h2>
          {tabla(resto, () => null, { title: "Sin más solicitudes", description: "" })}
        </section>
      ) : null}
      {acciones.dialogo}
    </PageBody>
  );
}
