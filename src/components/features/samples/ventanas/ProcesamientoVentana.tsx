"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, CalendarBlank, Drop, Flask, Leaf, TestTube } from "@phosphor-icons/react";
import { FolioChip, SampleStatus, SupervisionBadge } from "@/components/features/samples/status";
import { SolicitudBannerDe } from "@/components/features/solicitudes/Solicitudes";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL } from "@/lib/client/api";
import { formatProcessingFolio } from "@/lib/client/samples";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { extractionTypeMeta } from "@/lib/shared/extraction";
import { CadenaEtapas, FirmasEtapa, FolioEnlace, InsumosUsados, MuestrasEtiquetas, useDetalleEtapa, useRelacionados } from "./ProcesamientoEtapaComun";

/*
 * Ventana de un procesamiento (lista -> ventana de detalle): datos rapidos,
 * recepcion de origen y extracciones que siguen, firmas e insumos. La captura
 * sigue en el formato completo (/muestras/procesamiento/:id).
 */

const ORGANISMO: Record<string, string> = { bivalvos: "Bivalvos", sardinas: "Sardinas", otro: "Otro" };

export const organismoDe = (item: ApiRecord) => (Array.isArray(item.tipo_organismo) ? String(item.tipo_organismo[0] || "") : String(item.tipo_organismo || ""));
export const organismoLabel = (item: ApiRecord) => ORGANISMO[organismoDe(item)] || (organismoDe(item) ? organismoDe(item) : "");

/* IDs internos de la muestra o del lote seleccionado. */
function muestrasDe(item: ApiRecord): string[] {
  const lote = (Array.isArray(item.lote_seleccion) ? item.lote_seleccion : []) as unknown[];
  const ids = lote.map((m) => (m && typeof m === "object" ? String((m as ApiRecord).id_interno || (m as ApiRecord).id_muestra || "") : String(m || ""))).filter(Boolean);
  return ids.length ? ids : item.id_interno ? [String(item.id_interno)] : [];
}

export function ProcesamientoVentana({ filas, indice, onIndice, onCerrar }: { filas: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void }) {
  const item = indice !== null ? filas[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < filas.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < filas.length - 1} etiquetaAnterior="Procesamiento anterior" etiquetaSiguiente="Procesamiento siguiente">
      {item ? <Ficha key={String(item.id)} base={item} /> : <VentanaTitulo className="sr-only">Procesamiento</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function Ficha({ base }: { base: ApiRecord }) {
  const { can } = useSession();
  const router = useRouter();
  const { item } = useDetalleEtapa(`${API_BASE_URL}/samples/processing/${base.id}`, base);
  const extracciones = useRelacionados(base.folio_num ? `${API_BASE_URL}/samples/extraction?search=${encodeURIComponent(String(base.folio_num))}&anuladas=1` : null, (e) => Number(e.procesamiento_id) === Number(base.id));
  const anulada = item.estado === "anulada";
  const muestras = muestrasDe(item);
  const canExtraer = can("ensayos", "C", { objeto: "extraccion", borrador: true });
  const partes = (Array.isArray(item.parte_organismo) ? item.parte_organismo : []).map(String).filter(Boolean);

  return (
    <div className="flex flex-col gap-5" data-procesamiento-ventana={String(base.id)}>
      <VentanaEncabezado
        figura={
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-warning-soft text-warning-text">
            <Drop size={28} weight="duotone" />
          </span>
        }
        titulo={`Procesamiento ${formatProcessingFolio(item)}`}
        insignia={
          <>
            <SampleStatus status={item.estado} />
            <SupervisionBadge estado={item.supervision_estado} />
          </>
        }
        subtitulo={[muestras.length > 1 ? `Lote de ${muestras.length} muestras` : item.id_interno ? `Muestra ${String(item.id_interno)}` : null, organismoLabel(item) || null].filter(Boolean).join(" · ")}
      />

      <SolicitudBannerDe entidad="muestras_procesamiento" entidadId={Number(base.id)} />

      <DatosRapidos
        datos={[
          { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Procesada", valor: formatearFechaCorta(item.fecha_procesamiento), titulo: formatearFecha(item.fecha_procesamiento) },
          { icono: <TestTube size={17} weight="duotone" />, etiqueta: "Muestras", valor: String(muestras.length || (item.id_interno ? 1 : 0)) },
          { icono: <Leaf size={17} weight="duotone" />, etiqueta: "Organismo", valor: organismoLabel(item) || "—" },
          { icono: <Flask size={17} weight="duotone" />, etiqueta: "Extracciones", valor: extracciones ? String(extracciones.filter((e) => e.estado !== "anulada").length) : "…" },
        ]}
      />

      <VentanaSeccion titulo="Origen y siguiente etapa" i={0}>
        <CadenaEtapas
          origen={item.recepcion_id && item.folio_recepcion_num ? <FolioEnlace tipo="R" num={item.folio_recepcion_num} href={`/muestras/recepcion/${item.recepcion_id}`} /> : null}
          actual={<FolioChip type="P" num={item.folio_num} />}
          siguientes={extracciones && extracciones.length ? extracciones.map((e) => <FolioEnlace key={String(e.id)} tipo={extractionTypeMeta(e.tipo_registro).tipo} num={e.folio_num} href={`/muestras/extraccion/${e.id}`} nota={e.estado === "anulada" ? "anulada" : undefined} />) : null}
          vacioSiguiente={extracciones === null ? "Buscando…" : "Aún no se extrae"}
        />
      </VentanaSeccion>

      <VentanaSeccion titulo="Muestras" i={1}>
        <MuestrasEtiquetas ids={muestras} />
        {partes.length ? <p className="text-[13px] text-ink-3">Parte del organismo: {partes.join(", ")}</p> : null}
      </VentanaSeccion>

      <VentanaSeccion titulo="Firmas" i={2}>
        <FirmasEtapa
          firmas={[
            { rol: "Procesó", nombre: item.nombre_quien_proceso, id: item.proceso_usuario_id, cargo: item.proceso_cargo },
            { rol: "Supervisó", nombre: item.nombre_quien_superviso, id: item.superviso_usuario_id, cargo: item.superviso_cargo },
          ]}
        />
      </VentanaSeccion>

      <VentanaSeccion titulo="Reactivos y consumibles usados" i={3}>
        <InsumosUsados items={item.uso_inventario} />
      </VentanaSeccion>

      <VentanaAcciones>
        <Link href={`/muestras/procesamiento/${base.id}`} className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
          <ArrowSquareOut size={16} /> Abrir formato completo
        </Link>
        {canExtraer && !anulada ? (
          <Button variant="soft" icon={<Flask size={16} />} onClick={() => router.push(`/muestras/extraccion/nueva?procesamiento=${base.id}`)}>
            Extraer
          </Button>
        ) : null}
      </VentanaAcciones>
    </div>
  );
}
