"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, CalendarBlank, Flask, Scales, Snowflake, TestTube } from "@phosphor-icons/react";
import { FolioChip, SampleStatus, SupervisionBadge } from "@/components/features/samples/status";
import { SolicitudBannerDe } from "@/components/features/solicitudes/Solicitudes";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL } from "@/lib/client/api";
import { formatExtractionFolio } from "@/lib/client/samples";
import type { ApiRecord } from "@/lib/client/types";
import { extractionTypeMeta } from "@/lib/shared/extraction";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";
import { CadenaEtapas, EquiposUsados, FirmasEtapa, FolioEnlace, InsumosUsados, MuestrasEtiquetas, useDetalleEtapa, useRelacionados } from "./ProcesamientoEtapaComun";

/*
 * Ventana de una extraccion (lista -> ventana de detalle): datos rapidos,
 * procesamiento de origen y analisis que siguen, firmas, equipos e insumos.
 * La captura sigue en el formato completo (/muestras/extraccion/:id).
 */

export const moliendaLabel = (item: ApiRecord) => (item.tipo_molienda === "congelada" ? "Molienda congelada" : item.tipo_molienda === "fresca" ? "Molienda fresca" : "");

/* Muestras pesadas (ID de cada replica) o, si no hay pesos, el ID interno. */
function muestrasDe(item: ApiRecord): string[] {
  const pesos = (Array.isArray(item.registro_pesos) ? item.registro_pesos : []) as ApiRecord[];
  const ids = [...new Set(pesos.map((p) => String(p.id_muestra || "")).filter(Boolean))];
  return ids.length ? ids : item.id_interno ? String(item.id_interno).split(/,\s*/).filter(Boolean) : [];
}

export function ExtraccionVentana({ filas, indice, onIndice, onCerrar }: { filas: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void }) {
  const item = indice !== null ? filas[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < filas.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < filas.length - 1} etiquetaAnterior="Extracción anterior" etiquetaSiguiente="Extracción siguiente">
      {item ? <Ficha key={String(item.id)} base={item} /> : <VentanaTitulo className="sr-only">Extracción</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function Ficha({ base }: { base: ApiRecord }) {
  const { can } = useSession();
  const router = useRouter();
  const { item } = useDetalleEtapa(`${API_BASE_URL}/samples/extraction/${base.id}`, base);
  const analisis = useRelacionados(`${API_BASE_URL}/samples/analysis?extraccion_id=${encodeURIComponent(String(base.id))}&anulados=1`, (a) => Number(a.extraccion_id ?? base.id) === Number(base.id));
  const meta = extractionTypeMeta(item.tipo_registro);
  const anulada = item.estado === "anulada";
  const muestras = muestrasDe(item);
  const pesos = (Array.isArray(item.registro_pesos) ? item.registro_pesos : []) as ApiRecord[];
  const canAnalizar = can("ensayos", "C", { objeto: "analisis", borrador: true });
  const equipos = ((Array.isArray(item.equipos) ? item.equipos : []) as ApiRecord[]).map((e) => ({ nombre: e.nombre, uso: e.uso, clave: e.clave_bitacora, folio: e.folio_bitacora, ref: e.equipo_id }));

  return (
    <div className="flex flex-col gap-5" data-extraccion-ventana={String(base.id)}>
      <VentanaEncabezado
        figura={
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#e9e4f8] text-[#5b3fa6]">
            <Flask size={28} weight="duotone" />
          </span>
        }
        titulo={`Extracción ${formatExtractionFolio(item)}`}
        insignia={
          <>
            <SampleStatus status={item.estado} />
            <SupervisionBadge estado={item.supervision_estado} />
          </>
        }
        subtitulo={[meta.label, moliendaLabel(item) || null].filter(Boolean).join(" · ")}
      />

      <SolicitudBannerDe entidad="muestras_extraccion" entidadId={Number(base.id)} />

      <DatosRapidos
        datos={[
          { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Extraída", valor: formatearFechaCorta(item.fecha_extraccion), titulo: formatearFecha(item.fecha_extraccion) },
          { icono: <TestTube size={17} weight="duotone" />, etiqueta: "Muestras", valor: String(muestras.length) },
          { icono: <Scales size={17} weight="duotone" />, etiqueta: "Pesadas", valor: String(pesos.length) },
          { icono: <Snowflake size={17} weight="duotone" />, etiqueta: "Molienda", valor: item.tipo_molienda === "congelada" ? "Congelada" : item.tipo_molienda === "fresca" ? "Fresca" : "—" },
        ]}
      />

      <VentanaSeccion titulo="Origen y siguiente etapa" i={0}>
        <CadenaEtapas
          origen={item.procesamiento_id && item.folio_procesamiento_num ? <FolioEnlace tipo="P" num={item.folio_procesamiento_num} href={`/muestras/procesamiento/${item.procesamiento_id}`} /> : null}
          actual={<FolioChip type={meta.tipo} num={item.folio_num} />}
          siguientes={analisis && analisis.length ? analisis.map((a) => <FolioEnlace key={String(a.id)} tipo="A" num={a.folio_num} href={`/muestras/analisis/${a.id}`} nota={a.estado === "anulado" ? "anulado" : Number(a.version || 1) > 1 ? `v${String(a.version)}` : undefined} />) : null}
          vacioSiguiente={analisis === null ? "Buscando…" : "Aún no se analiza"}
        />
      </VentanaSeccion>

      <VentanaSeccion titulo="Muestras" i={1}>
        <MuestrasEtiquetas ids={muestras} />
      </VentanaSeccion>

      <VentanaSeccion titulo="Firmas" i={2}>
        <FirmasEtapa
          firmas={[
            { rol: "Extrajo", nombre: item.nombre_quien_extrajo, id: item.extrajo_usuario_id, cargo: item.extrajo_cargo },
            ...(item.nombre_quien_limpieza || item.limpio_usuario_id ? [{ rol: "Hizo la limpieza", nombre: item.nombre_quien_limpieza, id: item.limpio_usuario_id, cargo: item.limpio_cargo }] : []),
            { rol: "Supervisó", nombre: item.nombre_quien_superviso, id: item.superviso_usuario_id, cargo: item.superviso_cargo },
          ]}
        />
      </VentanaSeccion>

      <VentanaSeccion titulo="Equipos usados" i={3}>
        <EquiposUsados equipos={equipos} />
      </VentanaSeccion>

      <VentanaSeccion titulo="Reactivos y consumibles usados" i={4}>
        <InsumosUsados items={item.uso_inventario} />
      </VentanaSeccion>

      <VentanaAcciones>
        <Link href={`/muestras/extraccion/${base.id}`} className="press inline-flex h-9 items-center gap-2 rounded-[9px] bg-brand px-3.5 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-brand-strong">
          <ArrowSquareOut size={16} /> Abrir formato completo
        </Link>
        {canAnalizar && !anulada ? (
          <Button variant="soft" icon={<TestTube size={16} />} onClick={() => router.push(`/muestras/analisis/nuevo?extraccion=${base.id}`)}>
            Analizar
          </Button>
        ) : null}
      </VentanaAcciones>
    </div>
  );
}
