"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowSquareOut, ArrowUUpLeft, CalendarBlank, CheckCircle, Paperclip, PaperPlaneTilt, SealCheck, TestTube, Warning } from "@phosphor-icons/react";
import { FlowSteps } from "@/components/features/samples/FormLayout";
import { SignDialog } from "@/components/features/samples/SignDialog";
import { BotonSegregado, FolioChip, StateBadge, SupervisionBadge } from "@/components/features/samples/status";
import { SolicitudBannerDe } from "@/components/features/solicitudes/Solicitudes";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { IndicadorConteo } from "@/components/ui/Insignias";
import { Tooltip, useConfirm, usePrompt } from "@/components/ui/Overlay";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTitulo } from "@/components/ui/Ventana";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta, formatearFechaHora } from "@/lib/shared/fechas";
import { ANALYSIS_METHODS, ANALYSIS_TYPES } from "@/lib/shared/sgc";
import { CadenaEtapas, EquiposUsados, FirmasEtapa, FolioEnlace, InsumosUsados, useDetalleEtapa } from "./ProcesamientoEtapaComun";

/*
 * Ventana de un analisis (lista -> ventana de detalle): avance (registrado ->
 * en revision -> revisado -> aprobado), datos rapidos, origen e informes que
 * lo reportan, resultados por muestra con su conformidad en color, evidencia
 * adjunta, firmas, equipo e insumos. Las acciones son las del formato, con sus
 * dialogos de siempre (enviar a revision, devolver, marcar revisado, aprobar);
 * capturar, enmendar o pedir una excepcion siguen en el formato completo.
 */

const PASOS = [
  { key: "registrado", label: "Registrado" },
  { key: "en_revision", label: "En revisión" },
  { key: "revisado", label: "Revisado" },
  { key: "aprobado", label: "Aprobado" },
];

export const folioAnalisis = (item: ApiRecord) => `A ${String(Number(item.folio_num || 0)).padStart(7, "0")}${Number(item.version || 1) > 1 ? ` v${String(item.version)}` : ""}`;

export function AnalisisVentana({ filas, indice, onIndice, onCerrar }: { filas: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void }) {
  const item = indice !== null ? filas[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < filas.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < filas.length - 1} etiquetaAnterior="Análisis anterior" etiquetaSiguiente="Análisis siguiente">
      {item ? <Ficha key={String(item.id)} base={item} /> : <VentanaTitulo className="sr-only">Análisis</VentanaTitulo>}
    </VentanaCentrada>
  );
}

const CONFORMIDAD: Record<string, { label: string; clase: string }> = {
  cumple: { label: "Cumple", clase: "bg-success-soft text-success-text" },
  no_cumple: { label: "No cumple", clase: "bg-danger-soft text-danger" },
  na: { label: "No aplica", clase: "bg-surface-3 text-ink-2" },
};

function Ficha({ base }: { base: ApiRecord }) {
  const { token, can, user } = useSession();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const { item, cargado, recargar } = useDetalleEtapa(`${API_BASE_URL}/samples/analysis/${base.id}`, base);
  const [sign, setSign] = useState<"revisar" | "aprobar" | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const v = useValidacion({ titulo: "No se pudo completar la acción", reglas: () => [] });

  const estado = String(item.estado || "");
  const anulado = estado === "anulado";
  const tipo = ANALYSIS_TYPES.find((t) => t.value === item.tipo_analisis);
  const metodo = item.metodo === "otro" ? String(item.metodo_otro || "Otro método") : ANALYSIS_METHODS.find((m) => m.value === item.metodo)?.label;
  const resultados = (Array.isArray(item.resultados) ? item.resultados : []) as ApiRecord[];
  const noConformes = resultados.filter((r) => r.cumple === "no_cumple").length;
  const adjuntos = (item.adjuntos || {}) as ApiRecord;
  const evidencias = Number(adjuntos.vigentes || 0);
  const informes = (Array.isArray(item.informes) ? item.informes : []) as ApiRecord[];
  const segregacion = (item.segregacion || {}) as { revisar?: string | null; aprobar?: string | null };
  const pendiente = !!item.solicitud_pendiente;

  const canEdit = can("ensayos", "E", { objeto: "analisis", borrador: estado === "registrado" });
  const canReview = can("ensayos", "R");
  const canApprove = can("ensayos", "A");
  const faltaEvidencia = cargado && !!adjuntos.obligatoria && evidencias === 0;

  const accion = async (ruta: "enviar-revision" | "devolver", body: Record<string, unknown>) => {
    setOcupado(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/samples/analysis/${base.id}/${ruta}`, token, body);
      toast.success(String(data.message || "Listo"));
      invalidate("muestras", "dashboard");
      await recargar();
    } catch (err) {
      v.errorServidor(err);
    } finally {
      setOcupado(false);
    }
  };
  const enviarRevision = async () => {
    const ok = await confirm({ title: `Enviar ${folioAnalisis(item)} a revisión`, description: "Desde ahí ya no podrás editarlo; si el revisor encuentra algo, te lo devolverá con observaciones.", confirmLabel: "Enviar a revisión" });
    if (ok) await accion("enviar-revision", {});
  };
  const devolver = async () => {
    const motivo = await prompt({ title: `Devolver ${folioAnalisis(item)} con observaciones`, description: "El análisis vuelve a registrado para que el analista lo corrija antes de aprobarse.", label: "Observaciones para el analista", confirmLabel: "Devolver" });
    if (motivo) await accion("devolver", { motivo });
  };
  const firmar = async (data: { firma: string; observaciones: string }) => {
    if (!sign) return;
    setOcupado(true);
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/samples/analysis/${base.id}/${sign}`, token, { firma: data.firma || null, observaciones: data.observaciones || null });
      toast.success(sign === "revisar" ? "Análisis revisado" : "Análisis aprobado");
      invalidate("muestras", "dashboard");
      setSign(null);
      await recargar();
    } catch (err) {
      v.errorServidor(err);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ValidacionAmbito v={v}>
      <div className="flex flex-col gap-5" data-analisis-ventana={String(base.id)}>
        <VentanaEncabezado
          figura={
            <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-success-soft text-success-text">
              <TestTube size={28} weight="duotone" />
            </span>
          }
          titulo={`Análisis ${folioAnalisis(item)}`}
          insignia={
            <>
              <StateBadge kind="analisis" status={estado} />
              <SupervisionBadge estado={item.supervision_estado} />
            </>
          }
          subtitulo={[tipo?.label || String(item.tipo_analisis || ""), metodo || null].filter(Boolean).join(" · ")}
        />

        {!anulado && estado !== "sustituido" ? (
          <div className="px-1">
            <FlowSteps steps={PASOS} current={estado} />
          </div>
        ) : null}

        <SolicitudBannerDe entidad="muestras_analisis" entidadId={Number(base.id)} />

        <DatosRapidos
          datos={[
            { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Analizado", valor: formatearFechaCorta(item.fecha_analisis), titulo: formatearFecha(item.fecha_analisis) },
            { icono: <TestTube size={17} weight="duotone" />, etiqueta: "Muestras", valor: String(resultados.length || Number(item.muestras || 0)) },
            { icono: <Warning size={17} weight="duotone" />, etiqueta: "No cumplen", valor: String(noConformes || Number(item.no_conformes || 0)), tono: noConformes || Number(item.no_conformes || 0) ? "danger" : "success" },
            { icono: <Paperclip size={17} weight="duotone" />, etiqueta: "Evidencias", valor: cargado ? String(evidencias) : "…", tono: faltaEvidencia ? "warning" : "brand" },
          ]}
        />

        <VentanaSeccion titulo="Origen e informes" i={0}>
          <CadenaEtapas
            origen={
              <>
                {item.recepcion_id && item.folio_recepcion_num ? <FolioEnlace tipo="R" num={item.folio_recepcion_num} href={`/muestras/recepcion/${item.recepcion_id}`} /> : null}
                {item.extraccion_id && item.folio_extraccion_num ? <FolioEnlace tipo={String(item.tipo_extraccion || "E-A")} num={item.folio_extraccion_num} href={`/muestras/extraccion/${item.extraccion_id}`} /> : null}
              </>
            }
            actual={<FolioChip type="A" num={item.folio_num} />}
            siguientes={informes.length ? informes.map((inf) => <FolioEnlace key={String(inf.id)} tipo="IR" num={inf.folio_num} href={`/informes/${inf.id}`} nota={Number(inf.version || 1) > 1 ? `v${String(inf.version)}` : undefined} />) : null}
            vacioSiguiente={cargado ? "Aún no está en un informe" : "Buscando…"}
          />
        </VentanaSeccion>

        <VentanaSeccion titulo="Resultados por muestra" i={1}>
          {resultados.length ? (
            <ul className="flex flex-col divide-y divide-line rounded-[14px] bg-surface-2 ring-1 ring-line">
              {resultados.map((r, i) => {
                const c = CONFORMIDAD[String(r.cumple || "")];
                const valor = r.resultado !== null && r.resultado !== undefined && r.resultado !== "" ? `${String(r.resultado)}${r.unidad ? ` ${String(r.unidad)}` : ""}` : String(r.resultado_texto || "—");
                return (
                  <li key={`${String(r.id_muestra)}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1 break-words text-[13.5px] font-medium text-ink">{String(r.id_muestra || "Muestra")}</span>
                    <span className="tnum text-[13.5px] text-ink">{valor}</span>
                    {r.limite_regulatorio !== null && r.limite_regulatorio !== undefined && r.limite_regulatorio !== "" ? <span className="text-[12px] text-ink-3">límite {String(r.limite_regulatorio)}</span> : null}
                    {c ? <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", c.clase)}>{c.label}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13.5px] text-ink-3">{cargado ? "Todavía no hay resultados capturados." : "Cargando resultados…"}</p>
          )}
          {cargado ? (
            <div className="flex flex-wrap gap-1.5">
              <IndicadorConteo icono={<Paperclip size={13} weight="duotone" />} tono={faltaEvidencia ? "warning" : evidencias ? "brand" : "neutral"}>
                {evidencias === 1 ? "1 evidencia adjunta" : `${evidencias} evidencias adjuntas`}
              </IndicadorConteo>
              {faltaEvidencia ? <span className="text-[12.5px] text-warning-text">Falta adjuntar la evidencia para enviar a revisión (en el formato completo).</span> : null}
            </div>
          ) : null}
        </VentanaSeccion>

        <VentanaSeccion titulo="Firmas" i={2}>
          <FirmasEtapa
            firmas={[
              { rol: "Analizó", nombre: item.analista_nombre, id: item.analista_usuario_id, cargo: item.analista_cargo },
              { rol: "Revisó", nombre: item.revisado_nombre, id: item.revisado_por, cargo: item.revisado_cargo, fecha: item.revisado_en ? formatearFechaHora(item.revisado_en) : undefined },
              { rol: "Aprobó", nombre: item.aprobado_nombre, id: item.aprobado_por, cargo: item.aprobado_cargo, fecha: item.aprobado_en ? formatearFechaHora(item.aprobado_en) : undefined },
            ]}
          />
          {item.revision_observaciones ? <p className="text-[13px] text-ink-2">Observaciones de la revisión: {String(item.revision_observaciones)}</p> : null}
          {item.devolucion_observaciones && estado === "registrado" ? <p className="text-[13px] text-warning-text">Devuelto con observaciones: {String(item.devolucion_observaciones)}</p> : null}
        </VentanaSeccion>

        <VentanaSeccion titulo="Equipo usado" i={3}>
          <EquiposUsados equipos={[{ nombre: item.equipo_nombre, clave: item.equipo_clave_bitacora, folio: item.equipo_folio_bitacora, ref: item.equipo_id }]} />
        </VentanaSeccion>

        <VentanaSeccion titulo="Reactivos y consumibles usados" i={4}>
          <InsumosUsados items={item.uso_inventario} />
        </VentanaSeccion>

        <VentanaAcciones>
          <Link href={`/muestras/analisis/${base.id}`} className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
            <ArrowSquareOut size={16} /> Abrir formato completo
          </Link>
          {cargado && estado === "registrado" && canEdit && !pendiente ? (
            faltaEvidencia ? (
              <Tooltip content="Adjunta al menos una evidencia instrumental en el formato completo antes de enviar a revisión.">
                <span tabIndex={0} className="inline-flex">
                  <Button variant="soft" icon={<PaperPlaneTilt size={16} />} disabled>
                    Enviar a revisión
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button variant="soft" icon={<PaperPlaneTilt size={16} />} onClick={enviarRevision} loading={ocupado}>
                Enviar a revisión
              </Button>
            )
          ) : null}
          {cargado && estado === "en_revision" && canReview ? (
            <Button variant="secondary" icon={<ArrowUUpLeft size={16} />} onClick={devolver} loading={ocupado}>
              Devolver con observaciones
            </Button>
          ) : null}
          {cargado && (estado === "registrado" || estado === "en_revision") && canReview ? (
            <BotonSegregado bloqueo={segregacion.revisar}>
              <Button variant="soft" icon={<CheckCircle size={16} />} onClick={() => setSign("revisar")} disabled={!!segregacion.revisar}>
                Marcar revisado
              </Button>
            </BotonSegregado>
          ) : null}
          {cargado && estado === "revisado" && canApprove ? (
            <BotonSegregado bloqueo={segregacion.aprobar}>
              <Button variant="soft" icon={<SealCheck size={16} />} onClick={() => setSign("aprobar")} disabled={!!segregacion.aprobar}>
                Aprobar
              </Button>
            </BotonSegregado>
          ) : null}
        </VentanaAcciones>

        <SignDialog
          key={sign || "sin-firma"}
          open={sign !== null}
          onOpenChange={(open) => !open && setSign(null)}
          title={sign === "revisar" ? "Marcar análisis como revisado" : "Aprobar análisis"}
          description={sign === "revisar" ? `Quedará registrado a nombre de ${user?.nombre || user?.email || "tu usuario"}.` : "A partir de la aprobación el resultado puede incluirse en un informe."}
          confirmLabel={sign === "revisar" ? "Marcar revisado" : "Aprobar"}
          withObservaciones={sign === "revisar"}
          loading={ocupado}
          critico={sign === "aprobar"}
          onConfirm={firmar}
        />
      </div>
    </ValidacionAmbito>
  );
}
