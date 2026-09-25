"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowSquareOut, CheckCircle, Prohibit, Stamp, XCircle } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { CampoIdentidad } from "@/components/session/Reautenticar";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Switch, Textarea } from "@/components/ui/Field";
import { Dialog, useConfirm, usePrompt } from "@/components/ui/Overlay";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, armarCargo, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { invalidate, useResource } from "@/lib/client/store";
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

const KEYS = ["solicitudes", "muestras", "informes", "usuarios", "roles", "dashboard"];

const TONO_ESTADO: Record<string, Tone> = { pendiente: "warning", aprobada: "success", rechazada: "danger", cancelada: "neutral", vencida: "neutral" };

/* Enlace al registro de la solicitud. */
function hrefDe(item: ApiRecord): string | null {
  const id = String(item.entidad_id || "");
  switch (String(item.entidad)) {
    case "muestras_recepcion":
      return `/muestras/recepcion/${id}`;
    case "muestras_procesamiento":
      return `/muestras/procesamiento/${id}`;
    case "muestras_extraccion":
      return `/muestras/extraccion/${id}`;
    case "muestras_analisis":
      return `/muestras/analisis/${id}`;
    case "informes":
      return `/informes/${id}`;
    case "usuarios":
      return "/administracion/usuarios";
    case "documentos_sgc":
      return "/documentos";
    default:
      return null;
  }
}

export function EstadoSolicitudBadge({ estado }: { estado: unknown }) {
  const key = String(estado || "") as EstadoSolicitud;
  return <Badge tone={TONO_ESTADO[key] || "neutral"}>{ETIQUETA_ESTADO_SOLICITUD[key] || key || "—"}</Badge>;
}

/* Que se pidio, en palabras, con los datos de la solicitud. */
function describir(item: ApiRecord): string {
  const datos = (item.datos || {}) as ApiRecord;
  switch (String(item.tipo)) {
    case "asignar_rol":
      return `Asignar el rol "${String(datos.rol || datos.rol_id || "")}"${datos.vigente_hasta ? ` hasta ${formatearFecha(datos.vigente_hasta)}` : ""}`;
    case "ampliar_vigencia":
      return datos.tipo_cuenta === "permanente" ? "Convertir la cuenta en permanente" : `Ampliar la vigencia hasta ${datos.vigente_hasta ? formatearFecha(datos.vigente_hasta) : "sin fecha de fin"}`;
    case "excepcion_segregacion":
      return `Excepción para ${String(datos.accion || item.accion)} lo que la misma persona elaboró`;
    case "restaurar_registro":
      return `Restaurar (volvería a "${String(datos.estado_previo || "")}")`;
    default:
      return String(item.etiqueta || item.tipo);
  }
}

export default function SolicitudesPage() {
  const { token, user } = useSession();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const [historial, setHistorial] = useState(false);
  const [aprobar, setAprobar] = useState<ApiRecord | null>(null);
  const [motivo, setMotivo] = useState("");
  const [clave, setClave] = useState("");
  const [cargo, setCargo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const resource = useResource<ApiRecord[]>(
    [...KEYS, historial ? "solicitudes:todas" : "solicitudes:pendientes"],
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/solicitudes${historial ? "?estado=todas" : ""}`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const items = resource.data || [];
  const porAutorizar = items.filter((i) => i.puedo_aprobar);
  const mias = items.filter((i) => Number(i.solicitado_por) === Number(user?.id));
  const resto = items.filter((i) => !i.puedo_aprobar && Number(i.solicitado_por) !== Number(user?.id));

  const abrirAprobar = (item: ApiRecord) => {
    setMotivo("");
    setClave("");
    setCargo("");
    setAprobar(item);
  };

  const confirmarAprobacion = async () => {
    if (!aprobar) return;
    if (motivo.trim().length < 5) return toast.error("Indica el motivo de la aprobación (al menos 5 caracteres)");
    setEnviando(true);
    // Aprobar exige confirmar la identidad: la contrasena y el cargo de este dialogo se usan en la peticion.
    armarReauth(clave ? { password: clave } : null);
    armarCargo(cargo ? Number(cargo) : null);
    setClave("");
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/solicitudes/${aprobar.id}/aprobar`, token, { motivo: motivo.trim() });
      toast.success(String(data.message || "Solicitud aprobada y ejecutada"));
      setAprobar(null);
      invalidate(...KEYS, "reactivos", "consumibles", "equipos", "movimientos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo aprobar la solicitud");
    } finally {
      setEnviando(false);
    }
  };

  const rechazar = async (item: ApiRecord) => {
    const razon = await prompt({
      critico: true,
      title: `Rechazar solicitud #${item.id}`,
      description: `${String(item.etiqueta)} · ${String(item.referencia || "")}. La acción no se ejecuta y quien la pidió verá tu motivo.`,
      label: "Motivo del rechazo",
      minLength: 5,
      confirmLabel: "Rechazar",
      tone: "danger",
    });
    if (!razon) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/solicitudes/${item.id}/rechazar`, token, { motivo: razon });
      toast.success(`Solicitud #${item.id} rechazada`);
      invalidate(...KEYS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo rechazar la solicitud");
    }
  };

  const cancelar = async (item: ApiRecord) => {
    const ok = await confirm({ title: `Cancelar solicitud #${item.id}`, description: `${String(item.etiqueta)} · ${String(item.referencia || "")}. La acción no se ejecutará; podrás pedirla de nuevo más adelante.`, confirmLabel: "Cancelar solicitud", cancelLabel: "Volver", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/solicitudes/${item.id}/cancelar`, token, {});
      toast.success(`Solicitud #${item.id} cancelada`);
      invalidate(...KEYS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar la solicitud");
    }
  };

  const fila = (item: ApiRecord, acciones: ReactNode) => {
    const href = hrefDe(item);
    return (
      <Tr key={String(item.id)}>
        <Td>
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
                <span className="text-ink-4">·</span>
                <span>{describir(item)}</span>
              </span>
            }
          />
        </Td>
        <Td>
          <p className="text-[13px] text-ink-2">{String(item.motivo || "—")}</p>
          {item.motivo_resolucion && item.estado !== "pendiente" ? <p className="mt-0.5 text-[12px] text-ink-3">Resolución: {String(item.motivo_resolucion)}</p> : null}
        </Td>
        <Td muted>
          <p>
            {String(item.solicitado_nombre || `usuario #${String(item.solicitado_por)}`)}
            {item.solicitado_rol ? <span className="text-ink-4"> · {String(item.solicitado_rol)}</span> : null}
          </p>
          <p className="tnum text-[12px]">{formatearFechaHora(item.solicitado_en)}</p>
        </Td>
        <Td>
          <EstadoSolicitudBadge estado={item.estado} />
          {item.estado === "pendiente" ? <p className="tnum mt-0.5 text-[11.5px] text-ink-3">Vence {formatearFecha(item.vence_en)}</p> : item.resuelto_nombre ? <p className="mt-0.5 text-[11.5px] text-ink-3">{String(item.resuelto_nombre)} · {formatearFechaHora(item.resuelto_en)}</p> : null}
        </Td>
        <Td align="right">
          <div className="flex flex-wrap justify-end gap-2">{acciones}</div>
        </Td>
      </Tr>
    );
  };

  const tabla = (lista: ApiRecord[], acciones: (item: ApiRecord) => ReactNode, vacio: { title: string; description: string }) => (
    <TableShell>
      {resource.loading && !resource.data ? (
        <TableSkeleton rows={3} cols={5} />
      ) : lista.length ? (
        <Table>
          <THead>
            <Tr>
              <Th>Solicitud</Th>
              <Th>Motivo</Th>
              <Th>Pidió</Th>
              <Th>Estado</Th>
              <Th align="right">Acciones</Th>
            </Tr>
          </THead>
          <TBody>{lista.map((item) => fila(item, acciones(item)))}</TBody>
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
        actions={
          <Switch id="sol-historial" checked={historial} onCheckedChange={setHistorial} label="Ver historial" />
        }
      />

      {resource.error ? <ErrorState message={resource.error} onRetry={resource.reload} /> : null}

      <section className="flex flex-col gap-3" aria-labelledby="sol-pendientes">
        <h2 id="sol-pendientes" className="title-3 text-ink">
          Pendientes de tu autorización
        </h2>
        {tabla(
          porAutorizar,
          (item) => (
            <>
              <Button size="sm" variant="secondary" icon={<XCircle size={15} />} onClick={() => rechazar(item)}>
                Rechazar
              </Button>
              <Button size="sm" icon={<Stamp size={15} />} onClick={() => abrirAprobar(item)}>
                Aprobar
              </Button>
            </>
          ),
          { title: "Nada pendiente de tu autorización", description: "Cuando alguien pida una acción crítica que tú puedas aprobar, aparecerá aquí." },
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
              <Button size="sm" variant="secondary" icon={<Prohibit size={15} />} onClick={() => cancelar(item)}>
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

      <Dialog
        open={!!aprobar}
        onOpenChange={(open) => !open && setAprobar(null)}
        title={aprobar ? `Aprobar solicitud #${aprobar.id}` : "Aprobar"}
        description={aprobar ? `${String(aprobar.etiqueta)} · ${String(aprobar.referencia || "")}. Al aprobar, el sistema ejecuta la acción en tu nombre como segundo usuario y todo queda en la bitácora enlazado a la solicitud.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAprobar(null)}>
              Volver
            </Button>
            <Button icon={<Stamp size={16} />} loading={enviando} onClick={confirmarAprobacion}>
              Aprobar y ejecutar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {aprobar ? (
            <p className="rounded-[10px] bg-surface-2 px-3 py-2 text-[13px] text-ink-2 ring-1 ring-line">
              <span className="font-medium text-ink">{describir(aprobar)}</span>
              <br />
              Motivo de quien la pidió: {String(aprobar.motivo || "—")}
            </p>
          ) : null}
          <Field label="Motivo de la aprobación" htmlFor="ap-motivo" required>
            <Textarea id="ap-motivo" rows={3} value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Por qué autorizas esta acción; queda en la bitácora" />
          </Field>
          <CampoIdentidad value={clave} onChange={setClave} id="ap-password" cargo={cargo} onCargo={setCargo} />
        </div>
      </Dialog>
    </PageBody>
  );
}
