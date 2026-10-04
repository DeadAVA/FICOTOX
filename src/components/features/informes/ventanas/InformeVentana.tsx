"use client";

import { LineaEtapas } from "@/components/ui/LineaEtapas";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarBlank, EnvelopeSimple, FilePdf, FileText, Flask, LockKey, PaperPlaneTilt, SealCheck, Stamp, Warning } from "@phosphor-icons/react";
import { Callout } from "@/components/features/samples/FormLayout";
import { FolioChip, StateBadge } from "@/components/features/samples/status";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta, formatearFechaHora } from "@/lib/shared/fechas";

/*
 * Ventana de un informe (patron lista -> ventana): flujo visual Borrador ->
 * Revision -> Autorizado -> Liberado -> Enviado con la etapa actual, cliente,
 * analisis incluidos, envios por correo con su confirmacion, PDF y la accion
 * que sigue segun estado y permisos. Revisar, autorizar, liberar y enviar se
 * firman en el formato completo (sin cambios): el boton lleva ahi.
 */

const ETAPAS: Array<{ clave: string; titulo: string }> = [
  { clave: "borrador", titulo: "Borrador" },
  { clave: "en_revision", titulo: "Revisión" },
  { clave: "autorizado", titulo: "Autorizado" },
  { clave: "liberado", titulo: "Liberado" },
  { clave: "enviado", titulo: "Enviado" },
];
const indiceEtapa = (estado: string) => (estado === "entregado" ? 4 : ETAPAS.findIndex((e) => e.clave === estado));

/* Linea de etapas compartida (LineaEtapas): las pasadas con palomita, la actual resaltada. */
export function FlujoInforme({ estado }: { estado: string }) {
  return <LineaEtapas etapas={ETAPAS} actual={Math.max(0, indiceEtapa(estado))} anulada={estado === "anulado"} etiqueta="Avance del informe" />;
}

/* Siguiente paso segun estado y permisos (se firma en el formato completo). */
function siguientePaso(estado: string, puedeRevisar: boolean, puedeAutorizar: boolean): { texto: string; icono: React.ReactNode } | null {
  if (estado === "borrador" && puedeRevisar) return { texto: "Revisar", icono: <SealCheck size={15} /> };
  if (estado === "en_revision" && puedeAutorizar) return { texto: "Autorizar", icono: <Stamp size={15} /> };
  if (estado === "autorizado" && puedeAutorizar) return { texto: "Liberar", icono: <LockKey size={15} /> };
  if (estado === "liberado" && puedeAutorizar) return { texto: "Enviar por correo", icono: <PaperPlaneTilt size={15} /> };
  return null;
}

export function InformeVentana({ items, indice, onIndice, onCerrar }: { items: ApiRecord[]; indice: number | null; onIndice: (indice: number) => void; onCerrar: () => void }) {
  const item = indice !== null ? items[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < items.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Informe anterior" etiquetaSiguiente="Informe siguiente">
      {item ? <FichaInforme key={String(item.id)} base={item} onIr={onCerrar} /> : <VentanaTitulo className="sr-only">Informe</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function FichaInforme({ base, onIr }: { base: ApiRecord; onIr: () => void }) {
  const { token, can } = useSession();
  const [detalle, setDetalle] = useState<ApiRecord | null>(null);
  const [envios, setEnvios] = useState<ApiRecord[] | null>(null);

  const cargar = useCallback(async () => {
    const [d, e] = await Promise.all([
      getJsonAuth(`${API_BASE_URL}/informes/${base.id}`, token).catch(() => ({ item: base }) as ApiRecord),
      getJsonAuth(`${API_BASE_URL}/informes/${base.id}/envios`, token).catch(() => ({ items: [] }) as ApiRecord),
    ]);
    setDetalle({ ...base, ...((d.item || {}) as ApiRecord) });
    setEnvios((e.items || []) as ApiRecord[]);
  }, [base, token]);
  useEffect(() => {
    void Promise.resolve().then(cargar);
  }, [cargar]);

  const item = detalle || base;
  const estado = String(item.estado || "");
  const cliente = ((item.cliente || {}) as ApiRecord) || {};
  const resultados = (Array.isArray(item.resultados) && item.resultados.length ? item.resultados : Array.isArray(item.analisis_detalle) ? item.analisis_detalle : []) as ApiRecord[];
  const retenciones = (item.retenciones || []) as ApiRecord[];
  const recepcion = (item.recepcion || null) as ApiRecord | null;
  const folio = String(item.folio || "Informe");
  const paso = siguientePaso(estado, can("informes", "R"), can("informes", "A"));
  const bloqueoPaso = estado === "borrador" ? (item.segregacion as ApiRecord | undefined)?.revisar : estado === "en_revision" ? (item.segregacion as ApiRecord | undefined)?.autorizar : null;
  const retenido = Number(item.retenido || 0) > 0 || retenciones.length > 0;
  const requiereEnmienda = Number(item.requiere_enmienda || 0) > 0;
  const terminal = ["anulado", "sustituido"].includes(estado);
  const verPdf = () => void openProtectedFile(`${API_BASE_URL}/informes/${item.id}/pdf`, token, `${folio.replace(/\s+/g, "-")}.pdf`);
  const pdfFinal = ["liberado", "enviado", "entregado", "sustituido", "anulado"].includes(estado);

  return (
    <div className="flex flex-col gap-5" data-informe-ventana={String(item.id)}>
      <VentanaEncabezado
        figura={
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-brand-soft text-brand-strong">
            <FileText size={28} weight="duotone" />
          </span>
        }
        titulo={
          <>
            {folio}
            {Number(item.version) > 1 ? <span className="ml-1.5 text-[15px] font-normal text-ink-3">versión {String(item.version)}</span> : null}
          </>
        }
        insignia={
          <>
            <StateBadge kind="informe" status={estado} />
            {requiereEnmienda ? (
              <Badge tone="danger" dot>
                Requiere enmienda
              </Badge>
            ) : null}
            {retenido ? (
              <Badge tone="danger" dot>
                Retenido
              </Badge>
            ) : null}
          </>
        }
        subtitulo={String(cliente.nombre || item.solicitante || "Sin cliente")}
      />

      <DatosRapidos
        datos={[
          { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Emisión", valor: item.fecha_emision ? formatearFechaCorta(item.fecha_emision) : "—", titulo: item.fecha_emision ? formatearFecha(item.fecha_emision) : undefined },
          { icono: <Flask size={17} weight="duotone" />, etiqueta: "Análisis", valor: String(resultados.length || Number(item.analisis || 0) || 0) },
          { icono: <FileText size={17} weight="duotone" />, etiqueta: "Recepción", valor: recepcion?.folio_num || item.folio_recepcion_num ? `R ${String(recepcion?.folio_num || item.folio_recepcion_num).padStart(7, "0")}` : "—" },
          { icono: <EnvelopeSimple size={17} weight="duotone" />, etiqueta: "Envíos", valor: envios ? String(envios.length) : "…" },
        ]}
      />

      {terminal ? (
        <Callout tone={estado === "anulado" ? "danger" : "info"} title={estado === "anulado" ? "Informe anulado" : "Sustituido por una enmienda"}>
          {estado === "anulado" ? "Su PDF queda marcado como sin validez; se conserva para consulta." : "Una versión corregida lo reemplaza; este se conserva para consulta."}
        </Callout>
      ) : (
        <VentanaSeccion titulo="Avance" i={0}>
          <FlujoInforme estado={estado} />
        </VentanaSeccion>
      )}

      {requiereEnmienda || retenido ? (
        <div className="flex flex-col gap-2">
          {requiereEnmienda ? (
            <Callout tone="warning" title="Requiere una versión corregida">
              {item.requiere_enmienda_motivo ? String(item.requiere_enmienda_motivo) : "Se detectó que este informe necesita una enmienda; no se envía hasta corregirlo."}
            </Callout>
          ) : null}
          {retenido ? (
            <Callout tone="danger" title="Retenido por una no conformidad">
              No se libera ni se envía hasta que se libere la retención{retenciones.length ? ` (${retenciones.map((r) => String(r.nc_folio || "")).filter(Boolean).join(", ")})` : ""}.
            </Callout>
          ) : null}
        </div>
      ) : null}

      <VentanaSeccion titulo="Cliente" i={1}>
        <VentanaTarjeta>
          <DatosLista
            datos={[
              { etiqueta: "Nombre", valor: String(cliente.nombre || item.solicitante || "—") },
              cliente.contacto ? { etiqueta: "Contacto", valor: String(cliente.contacto) } : null,
              cliente.correo ? { etiqueta: "Correo", valor: <span className="break-all">{String(cliente.correo)}</span> } : null,
              cliente.direccion ? { etiqueta: "Dirección", valor: String(cliente.direccion) } : null,
            ]}
          />
        </VentanaTarjeta>
      </VentanaSeccion>

      <VentanaSeccion titulo="Análisis incluidos" i={2}>
        {!detalle ? (
          <Skeleton className="h-16 w-full" />
        ) : resultados.length ? (
          <ul className="flex flex-col gap-2">
            {resultados.map((a, i) => {
              const filas = (Array.isArray(a.resultados) ? a.resultados : []) as ApiRecord[];
              return (
                <li key={String(a.folio || a.id || i)} className="entrada-escalonada rounded-[14px] bg-surface px-4 py-3 ring-1 ring-line transition-shadow duration-200 hover:shadow-raised" style={{ ["--i" as string]: i }}>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.folio ? <span className="text-[13.5px] font-semibold text-ink">{String(a.folio)}</span> : a.folio_num ? <FolioChip type="A" num={a.folio_num} /> : null}
                    <span className="text-[13.5px] text-ink-2">{String(a.tipo || a.tipo_analisis_label || a.tipo_analisis || "Análisis")}</span>
                  </div>
                  {filas.length ? (
                    <ul className="mt-2 flex flex-col gap-1">
                      {filas.map((r, k) => (
                        <li key={k} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
                          <span className="font-medium text-ink">{String(r.id_muestra || "Muestra")}</span>
                          <span>
                            {r.resultado_texto ? String(r.resultado_texto) : r.resultado !== null && r.resultado !== undefined ? `${String(r.resultado)} ${String(r.unidad || "")}`.trim() : "—"}
                          </span>
                          {r.cumple === "cumple" ? (
                            <Badge tone="success" dot>
                              Cumple
                            </Badge>
                          ) : r.cumple === "no_cumple" ? (
                            <Badge tone="danger" dot>
                              No cumple
                            </Badge>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">Todavía no tiene análisis incluidos.</p>
        )}
      </VentanaSeccion>

      <VentanaSeccion titulo="Envíos por correo" i={3}>
        {!envios ? (
          <Skeleton className="h-12 w-full" />
        ) : envios.length ? (
          <ul className="flex flex-col gap-2">
            {envios.map((e, i) => (
              <li key={String(e.id || i)} className="flex flex-wrap items-start gap-3 rounded-[14px] bg-surface px-4 py-3 ring-1 ring-line">
                <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-strong">
                  <EnvelopeSimple size={17} weight="duotone" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-medium text-ink">{String(e.destinatario_nombre || e.nombre || "Destinatario")}</span>
                  {e.destinatario_correo || e.correo ? <span className="break-all text-[12.5px] text-ink-3">{String(e.destinatario_correo || e.correo)}</span> : null}
                  <span className="text-[12.5px] text-ink-3">
                    Enviado el {formatearFechaHora(e.enviado_en)}
                    {e.enviado_por_nombre ? ` por ${String(e.enviado_por_nombre)}` : ""}
                    {e.medio === "smtp" ? " desde la plataforma" : ""}
                  </span>
                </div>
                {e.confirmacion_en ? (
                  <Badge tone="success" dot>
                    Recibido el {formatearFechaCorta(e.confirmacion_en)}
                  </Badge>
                ) : (
                  <Badge tone="warning" dot>
                    Sin confirmar
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">{["liberado", "enviado", "entregado"].includes(estado) ? "Todavía no se ha enviado." : "Se envía una vez liberado."}</p>
        )}
      </VentanaSeccion>

      {item.autorizado_nombre || item.revisado_nombre || item.elaborado_nombre ? (
        <VentanaSeccion titulo="Firmas" i={4}>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {item.elaborado_nombre ? <FiguraPersona id={item.elaborado_por} nombre={item.elaborado_nombre} size="md" conNombre subtitulo="Elaboró" /> : null}
            {item.revisado_nombre ? <FiguraPersona id={item.revisado_por} nombre={item.revisado_nombre} size="md" conNombre subtitulo="Revisó" /> : null}
            {item.autorizado_nombre ? <FiguraPersona id={item.autorizado_por} nombre={item.autorizado_nombre} size="md" conNombre subtitulo="Autorizó" /> : null}
            {item.liberado_nombre ? <FiguraPersona id={item.liberado_por} nombre={item.liberado_nombre} size="md" conNombre subtitulo="Liberó" /> : null}
          </div>
        </VentanaSeccion>
      ) : null}

      {paso && bloqueoPaso ? (
        <p className="flex gap-2 rounded-[12px] bg-warning-soft/60 px-3.5 py-2.5 text-[13px] text-ink-2">
          <Warning size={16} weight="duotone" className="mt-0.5 shrink-0 text-warning-text" />
          {String(bloqueoPaso)}
        </p>
      ) : null}

      <VentanaAcciones>
        {paso && !terminal ? (
          <Link href={`/informes/${item.id}`} onClick={onIr} className="press inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white hover:bg-brand-strong">
            {paso.icono} {paso.texto}
          </Link>
        ) : null}
        <Button variant="secondary" icon={<FilePdf size={15} />} onClick={verPdf}>
          {pdfFinal ? "PDF" : "Vista previa del PDF"}
        </Button>
        <Link href={`/informes/${item.id}`} onClick={onIr} className="press inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13.5px] font-medium text-brand hover:bg-brand-faint">
          Abrir formato completo <ArrowRight size={14} weight="bold" />
        </Link>
      </VentanaAcciones>
    </div>
  );
}
