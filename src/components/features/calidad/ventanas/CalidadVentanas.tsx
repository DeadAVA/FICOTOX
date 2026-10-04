"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarBlank, Clock, DownloadSimple, Lightning, LinkSimple, ListChecks, Prohibit, Scales, Tag, User } from "@phosphor-icons/react";
import { useAccionCalidad } from "@/components/features/calidad/acciones";
import { ClasificacionNc, EstadoAccion, EstadoIncidencia, EstadoNc } from "@/components/features/calidad/comun";
import { Callout } from "@/components/features/samples/FormLayout";
import { SolicitudBanner } from "@/components/features/solicitudes/Solicitudes";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import type { ApiRecord } from "@/lib/client/types";
import { IMPACTO_LABEL, ORIGEN_AUTOMATICO_LABEL, ORIGENES_NC, RANGO_NC, TIPO_INCIDENCIA_LABEL } from "@/lib/shared/calidad";
import { formatearFecha, formatearFechaCorta, formatearFechaHora } from "@/lib/shared/fechas";
import { IconoCalidad } from "./iconos";
import { LineaEtapas } from "@/components/ui/LineaEtapas";

/*
 * Ventanas de detalle de Calidad (patron lista -> ventana): vista rapida de
 * una incidencia o de una no conformidad con sus acciones principales segun
 * permisos y estado, y "Abrir ficha completa" para todo lo demas (evaluar,
 * analisis de causa, acciones correctivas, verificacion, cierre). La captura
 * sigue en las fichas, sin cambios.
 */

const ETAPAS_NC_VISIBLES = ["Impacto", "Causa", "Acciones", "Verificación", "Cierre"];

/* Carga un registro por id; se vuelve a pedir al cambiar de registro. */
function useRegistro(ruta: string | null) {
  const { token } = useAccionCalidad();
  const [item, setItem] = useState<ApiRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    if (!ruta) return;
    try {
      const data = await getJsonAuth(`${API_BASE_URL}${ruta}`, token);
      setItem((data.item || null) as ApiRecord | null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar");
    }
  }, [ruta, token]);
  useEffect(() => {
    void Promise.resolve().then(cargar);
  }, [cargar]);
  return { item, error, cargar };
}

function Cargando() {
  return (
    <div className="flex flex-col gap-4">
      <VentanaTitulo className="sr-only">Cargando</VentanaTitulo>
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-[16px]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ErrorVentana({ error }: { error: string }) {
  return (
    <>
      <VentanaTitulo className="sr-only">No se pudo abrir</VentanaTitulo>
      <Callout tone="danger" title="No se pudo abrir el registro">
        {error}
      </Callout>
    </>
  );
}

/* Navegacion ↑/↓ sobre una lista de ids. */
function useMover(ids: number[], indice: number | null, onIndice: (i: number) => void) {
  return {
    mover: (paso: number) => {
      if (indice === null) return;
      const siguiente = indice + paso;
      if (siguiente >= 0 && siguiente < ids.length) onIndice(siguiente);
    },
    puedeAnterior: indice !== null && indice > 0,
    puedeSiguiente: indice !== null && indice < ids.length - 1,
  };
}

/* ---------- Incidencia ---------- */

export function IncidenciaVentana({ ids, indice, onIndice, onCerrar }: { ids: number[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void }) {
  const id = indice !== null ? ids[indice] : undefined;
  const nav = useMover(ids, indice, onIndice);
  return (
    <VentanaCentrada abierta={id !== undefined} onCerrar={onCerrar} onMover={nav.mover} puedeAnterior={nav.puedeAnterior} puedeSiguiente={nav.puedeSiguiente} etiquetaAnterior="Incidencia anterior" etiquetaSiguiente="Incidencia siguiente">
      {id !== undefined ? <FichaIncidencia key={id} id={id} onCerrar={onCerrar} /> : <VentanaTitulo className="sr-only">Incidencia</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function FichaIncidencia({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const router = useRouter();
  const { prompt, enviar } = useAccionCalidad();
  const { item, error, cargar } = useRegistro(`/calidad/incidencias/${id}`);
  if (error) return <ErrorVentana error={error} />;
  if (!item) return <Cargando />;
  const puede = (item.puede || {}) as ApiRecord;
  const bloqueo = (item.segregacion as ApiRecord | undefined)?.evaluar as string | null | undefined;
  const registros = (item.registros || []) as ApiRecord[];
  const nc = item.nc as ApiRecord | null;
  const abrirFicha = () => {
    onCerrar();
    router.push(`/calidad/incidencias/${id}`);
  };
  const anular = async () => {
    const motivo = await prompt({ critico: true, tone: "danger", title: `Anular ${item.folio}`, description: "La incidencia deja de contar, pero se conserva. La anulación la autoriza un segundo usuario con calidad:AN.", confirmLabel: "Solicitar anulación" });
    if (motivo && (await enviar("POST", `/calidad/incidencias/${id}/anular`, { motivo }))) await cargar();
  };
  let paso = 0;
  return (
    <div className="flex flex-col gap-5" data-incidencia-ventana={id}>
      <VentanaEncabezado
        figura={<IconoCalidad tipo={item.tipo} grande />}
        titulo={String(item.folio || "Incidencia")}
        insignia={<EstadoIncidencia estado={item.estado} />}
        subtitulo={TIPO_INCIDENCIA_LABEL[String(item.tipo)] || "Incidencia"}
      >
        {item.origen_automatico ? <p className="text-[13px] text-ink-3">Registrada automáticamente: {ORIGEN_AUTOMATICO_LABEL[String(item.origen_automatico)] || "por el sistema"}</p> : null}
      </VentanaEncabezado>

      <DatosRapidos
        datos={[
          { icono: <Clock size={17} weight="duotone" />, etiqueta: "Ocurrió", valor: formatearFechaCorta(item.fecha_hora_ocurrencia), titulo: formatearFechaHora(item.fecha_hora_ocurrencia) },
          { icono: <User size={17} weight="duotone" />, etiqueta: "Reportó", valor: String(item.reportada_nombre || "Sistema").split(" ")[0], titulo: String(item.reportada_nombre || "") },
          { icono: <Lightning size={17} weight="duotone" />, etiqueta: "¿Afecta resultados?", valor: IMPACTO_LABEL[String(item.impacto_resultados)]?.replace(" resultados", "") || "—", tono: item.impacto_resultados === "si" ? "danger" : item.impacto_resultados === "desconocido" ? "warning" : "success" },
          { icono: <LinkSimple size={17} weight="duotone" />, etiqueta: "Registros", valor: String(registros.length) },
        ]}
      />

      {item.solicitud_pendiente ? <SolicitudBanner item={item} entidad="incidencias" onCambio={cargar} /> : null}

      <VentanaSeccion titulo="Qué pasó" i={paso++}>
        <VentanaTarjeta>
          <p className="whitespace-pre-line break-words text-[14px] leading-[1.55] text-ink">{String(item.descripcion || "—")}</p>
          {item.accion_inmediata ? (
            <p className="mt-2 whitespace-pre-line break-words text-[13.5px] text-ink-2">
              <span className="font-medium text-ink">Acción inmediata: </span>
              {String(item.accion_inmediata)}
            </p>
          ) : null}
        </VentanaTarjeta>
      </VentanaSeccion>

      <VentanaSeccion titulo="Registros relacionados" i={paso++}>
        {registros.length ? (
          <ul className="flex flex-wrap gap-2">
            {registros.map((r) => (
              <li key={String(r.id)}>
                {r.href ? (
                  <Link href={String(r.href)} onClick={onCerrar} className="press inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink shadow-card ring-1 ring-line transition-shadow duration-200 hover:shadow-raised">
                    <LinkSimple size={13} className="text-ink-3" />
                    <span className="text-ink-3">{String(r.etiqueta || "")}</span> {String(r.referencia || "")}
                  </Link>
                ) : (
                  <span className="inline-flex rounded-full bg-surface-2 px-3 py-1.5 text-[13px] text-ink ring-1 ring-line">{String(r.referencia || "")}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-ink-3">Sin registros ligados.</p>
        )}
      </VentanaSeccion>

      {item.decision_evaluacion || nc ? (
        <VentanaSeccion titulo="Evaluación" i={paso++}>
          <DatosLista
            datos={[
              item.decision_evaluacion ? { etiqueta: "Decisión", valor: item.decision_evaluacion === "escalar" ? "Convertir en no conformidad" : "Cerrar sin no conformidad" } : null,
              item.evaluada_nombre ? { etiqueta: "Evaluó", valor: <FiguraPersona id={item.evaluada_por} nombre={item.evaluada_nombre} conNombre /> } : null,
              item.justificacion ? { etiqueta: "Justificación", valor: <span className="whitespace-pre-line">{String(item.justificacion)}</span> } : null,
              nc ? { etiqueta: "No conformidad", valor: <Link href={`/calidad/nc/${nc.id}`} onClick={onCerrar} className="font-medium text-brand hover:underline">{String(nc.folio)}</Link> } : null,
            ]}
          />
        </VentanaSeccion>
      ) : null}

      {puede.evaluar && bloqueo ? (
        <Callout tone="warning" title="Otra persona debe evaluarla">
          {bloqueo}
        </Callout>
      ) : null}

      <VentanaAcciones>
        <Button icon={<ArrowRight size={15} weight="bold" />} onClick={abrirFicha}>
          Abrir ficha completa
        </Button>
        {puede.evaluar && !bloqueo && item.estado === "reportada" ? (
          <Button variant="secondary" icon={<Scales size={15} />} onClick={async () => (await enviar("POST", `/calidad/incidencias/${id}/evaluacion`, {}, "Evaluación iniciada")) && cargar()}>
            Iniciar evaluación
          </Button>
        ) : null}
        {puede.anular && !item.solicitud_pendiente ? (
          <Button variant="secondary" icon={<Prohibit size={15} />} onClick={anular}>
            Anular…
          </Button>
        ) : null}
      </VentanaAcciones>
    </div>
  );
}

/* ---------- No conformidad ---------- */

export function NcVentana({ ids, indice, onIndice, onCerrar, etiquetas = ["NC anterior", "NC siguiente"] }: { ids: number[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void; etiquetas?: [string, string] }) {
  const id = indice !== null ? ids[indice] : undefined;
  const nav = useMover(ids, indice, onIndice);
  return (
    <VentanaCentrada abierta={id !== undefined} onCerrar={onCerrar} onMover={nav.mover} puedeAnterior={nav.puedeAnterior} puedeSiguiente={nav.puedeSiguiente} etiquetaAnterior={etiquetas[0]} etiquetaSiguiente={etiquetas[1]}>
      {id !== undefined ? <FichaNc key={`${indice}-${id}`} id={id} onCerrar={onCerrar} /> : <VentanaTitulo className="sr-only">No conformidad</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function FichaNc({ id, onCerrar }: { id: number; onCerrar: () => void }) {
  const router = useRouter();
  const { token, prompt, enviar } = useAccionCalidad();
  const { item, error, cargar } = useRegistro(`/calidad/nc/${id}`);
  if (error) return <ErrorVentana error={error} />;
  if (!item) return <Cargando />;
  const puede = (item.puede || {}) as ApiRecord;
  const acciones = ((item.acciones || []) as ApiRecord[]).filter((a) => a.estado !== "cancelada");
  const abiertas = acciones.filter((a) => ["pendiente", "en_proceso"].includes(String(a.estado))).length;
  const suspensiones = ((item.suspensiones || []) as ApiRecord[]).filter((su) => !su.reanudada_en);
  const retenciones = ((item.retenciones || []) as ApiRecord[]).filter((r) => !r.liberada_en);
  const incidencias = (item.incidencias || []) as ApiRecord[];
  const responsable = item.responsable as ApiRecord | null;
  const anulada = item.estado === "anulada";
  const abrirFicha = () => {
    onCerrar();
    router.push(`/calidad/nc/${id}`);
  };
  const anular = async () => {
    const motivo = await prompt({ critico: true, tone: "danger", title: `Anular ${item.folio}`, description: "La NC deja de contar, pero se conserva. La anulación la autoriza un segundo usuario con calidad:AN.", confirmLabel: "Solicitar anulación" });
    if (motivo && (await enviar("POST", `/calidad/nc/${id}/anular`, { motivo }))) await cargar();
  };
  const pdf = () => openProtectedFile(`${API_BASE_URL}/calidad/nc/${id}/pdf`, token, `${String(item.folio).replace(" ", "-")}.pdf`);
  let paso = 0;
  return (
    <div className="flex flex-col gap-5" data-nc-ventana={id}>
      <VentanaEncabezado
        figura={<IconoCalidad clase="nc" grande />}
        titulo={String(item.folio || "No conformidad")}
        insignia={
          <>
            <EstadoNc estado={item.estado} />
            {item.clasificacion ? <ClasificacionNc valor={item.clasificacion} /> : null}
          </>
        }
        subtitulo={<span className="whitespace-pre-line text-[14px] text-ink-2">{String(item.descripcion || "")}</span>}
      />

      <DatosRapidos
        datos={[
          { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Abierta", valor: formatearFechaCorta(item.creada_en), titulo: formatearFechaHora(item.creada_en) },
          { icono: <User size={17} weight="duotone" />, etiqueta: "Responsable", valor: responsable ? String(responsable.nombre || "").split(" ")[0] || "—" : "Sin nombrar", titulo: responsable ? String(responsable.nombre || "") : undefined },
          { icono: <ListChecks size={17} weight="duotone" />, etiqueta: "Acciones", valor: acciones.length ? (abiertas ? `${abiertas} de ${acciones.length} abiertas` : `${acciones.length} hechas`) : "Ninguna", tono: abiertas ? "warning" : "brand" },
          { icono: <Tag size={17} weight="duotone" />, etiqueta: "Origen", valor: ORIGENES_NC.find((o) => o.value === item.origen)?.label || "—" },
        ]}
      />

      {item.solicitud_pendiente ? <SolicitudBanner item={item} entidad="no_conformidades" onCambio={cargar} /> : null}

      <VentanaSeccion titulo="Etapa" i={paso++}>
        <VentanaTarjeta>
          <LineaEtapas etapas={ETAPAS_NC_VISIBLES} actual={RANGO_NC[String(item.estado)] ?? 0} anulada={anulada} />
          {anulada ? <p className="mt-2 text-[13px] text-danger">La NC está anulada: se conserva para consulta.</p> : null}
        </VentanaTarjeta>
      </VentanaSeccion>

      <VentanaSeccion titulo="Acciones correctivas" i={paso++}>
        {acciones.length ? (
          <ul className="flex flex-col gap-2">
            {acciones.map((a, i) => (
              <li key={String(a.id)} className={cn("entrada-escalonada flex flex-col gap-2 rounded-[14px] bg-surface px-4 py-3 shadow-card ring-1 transition-shadow duration-200 hover:shadow-raised sm:flex-row sm:items-center", a.vencida ? "ring-danger/30" : "ring-line")} style={{ ["--i" as string]: i }}>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="break-words text-[14px] text-ink">{String(a.descripcion || "")}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                    <FiguraPersona id={a.responsable_id} nombre={a.responsable_nombre} conNombre size="xs" />
                    <span className={a.vencida ? "font-medium text-danger" : undefined}>
                      {a.fecha_compromiso ? `Compromiso: ${formatearFecha(a.fecha_compromiso)}${a.vencida ? " · vencida" : ""}` : "Sin fecha compromiso"}
                    </span>
                  </div>
                </div>
                <EstadoAccion estado={a.estado} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] text-ink-3">{item.requiere_accion_correctiva === 0 ? "No requiere acción correctiva." : "Todavía no hay acciones definidas."}</p>
        )}
      </VentanaSeccion>

      {suspensiones.length || retenciones.length ? (
        <VentanaSeccion titulo="Suspensiones y retenciones activas" i={paso++}>
          <ul className="flex flex-col gap-2">
            {suspensiones.map((su) => (
              <li key={`s${su.id}`} className="flex flex-col gap-0.5 rounded-[14px] bg-danger-soft/50 px-4 py-3 ring-1 ring-danger/15">
                <span className="text-[14px] font-medium text-ink">
                  {su.tipo === "equipo" ? `Equipo ${String(su.equipo_nombre || "")}` : `Método ${String(su.clave || "")}`} suspendido
                </span>
                <span className="text-[12.5px] text-ink-2">
                  Desde el {formatearFecha(su.suspendida_en)}
                  {su.suspendida_nombre ? ` · por ${String(su.suspendida_nombre)}` : ""}
                </span>
                {su.motivo ? <span className="whitespace-pre-line text-[12.5px] text-ink-3">{String(su.motivo)}</span> : null}
              </li>
            ))}
            {retenciones.map((r) => (
              <li key={`r${r.id}`} className="flex flex-col gap-0.5 rounded-[14px] bg-warning-soft/60 px-4 py-3 ring-1 ring-warning/20">
                <span className="text-[14px] font-medium text-ink">Informe {String(r.informe || "")} retenido</span>
                <span className="text-[12.5px] text-ink-2">
                  Desde el {formatearFecha(r.retenido_en)}
                  {r.retenido_nombre ? ` · por ${String(r.retenido_nombre)}` : ""}
                </span>
                {r.motivo ? <span className="whitespace-pre-line text-[12.5px] text-ink-3">{String(r.motivo)}</span> : null}
              </li>
            ))}
          </ul>
        </VentanaSeccion>
      ) : null}

      {incidencias.length ? (
        <VentanaSeccion titulo="Incidencias que la originaron" i={paso++}>
          <ul className="flex flex-wrap gap-2">
            {incidencias.map((inc) => (
              <li key={String(inc.id)}>
                <Link href={`/calidad/incidencias/${inc.id}`} onClick={onCerrar} className="press inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink shadow-card ring-1 ring-line transition-shadow duration-200 hover:shadow-raised">
                  {String(inc.folio)}
                  {inc.estado ? <EstadoIncidencia estado={inc.estado} /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </VentanaSeccion>
      ) : null}

      {responsable && responsable.vigente === false ? <Badge tone="warning">El responsable ya no tiene acceso vigente: conviene reasignarla</Badge> : null}

      <VentanaAcciones>
        <Button icon={<ArrowRight size={15} weight="bold" />} onClick={abrirFicha}>
          Abrir ficha completa
        </Button>
        {item.pdf_disponible ? (
          <Button variant="secondary" icon={<DownloadSimple size={15} />} onClick={pdf}>
            PDF
          </Button>
        ) : null}
        {puede.anular && !item.solicitud_pendiente ? (
          <Button variant="secondary" icon={<Prohibit size={15} />} onClick={anular}>
            Anular…
          </Button>
        ) : null}
      </VentanaAcciones>
    </div>
  );
}
