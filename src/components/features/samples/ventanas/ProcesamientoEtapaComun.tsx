"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Cube, Drop, Flask, Wrench } from "@phosphor-icons/react";
import { FolioChip } from "@/components/features/samples/status";
import { useSession } from "@/components/session/SessionProvider";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { SinDato } from "@/components/ui/Insignias";
import { cn } from "@/components/ui/cn";
import { getJsonAuth } from "@/lib/client/api";
import { findInsumoOption, formatInventoryAmount, isInsumoCacheLoaded, loadInsumoOptions } from "@/lib/client/insumos";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Piezas comunes de las ventanas de Procesamiento, Extraccion y Analisis
 * (patron lista -> ventana de detalle): detalle del registro, folios
 * enlazados (origen y siguiente etapa), firmas con figura, equipos e insumos.
 * Candidatas a moverse a src/components/ui si otras etapas las necesitan.
 */

/* Detalle del registro (GET /samples/<etapa>/:id) mezclado con la fila de la lista; `recargar` despues de una accion. */
export function useDetalleEtapa(url: string | null, base: ApiRecord) {
  const { token } = useSession();
  const [detalle, setDetalle] = useState<ApiRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    if (!url || !token) return;
    try {
      const data = await getJsonAuth(url, token);
      setDetalle({ ...base, ...((data.item || {}) as ApiRecord) });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el registro");
    }
  }, [url, token, base]);
  useEffect(() => {
    void Promise.resolve().then(recargar);
  }, [recargar]);
  return { item: detalle || base, cargado: !!detalle, error, recargar };
}

/* Lista relacionada (siguiente etapa): p. ej. extracciones de un procesamiento. */
export function useRelacionados(url: string | null, filtro: (item: ApiRecord) => boolean) {
  const { token } = useSession();
  const [items, setItems] = useState<ApiRecord[] | null>(null);
  useEffect(() => {
    if (!url || !token) return;
    let cancelado = false;
    getJsonAuth(url, token)
      .then((data) => !cancelado && setItems(((data.items || []) as ApiRecord[]).filter(filtro)))
      .catch(() => !cancelado && setItems([]));
    return () => {
      cancelado = true;
    };
    // `filtro` se define en cada render: basta con la url.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token]);
  return items;
}

/* Un folio enlazado a su registro ("R 0000012 →"). */
export function FolioEnlace({ tipo, num, href, nota }: { tipo: string; num: unknown; href: string; nota?: string }) {
  return (
    <Link href={href} className="press group/folio inline-flex items-center gap-2 rounded-[10px] bg-surface px-2.5 py-1.5 shadow-card ring-1 ring-line transition-shadow duration-200 hover:shadow-raised focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
      <FolioChip type={tipo} num={num} />
      {nota ? <span className="text-[12.5px] text-ink-2">{nota}</span> : null}
      <ArrowRight size={13} weight="bold" className="text-ink-4 transition-transform duration-200 ease-[var(--ease-spring)] group-hover/folio:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/* Origen -> este registro -> siguiente etapa, en una linea que pasa de renglon si no cabe. */
export function CadenaEtapas({ origen, actual, siguientes, vacioSiguiente }: { origen: ReactNode; actual: ReactNode; siguientes: ReactNode; vacioSiguiente: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface-2 px-3.5 py-3 ring-1 ring-line">
        <span className="text-[11.5px] text-ink-3">Viene de</span>
        <div className="flex flex-wrap gap-1.5">{origen || <SinDato />}</div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-brand-faint px-3.5 py-3 ring-1 ring-brand/20">
        <span className="text-[11.5px] text-brand-strong">Este registro</span>
        <div className="flex flex-wrap gap-1.5">{actual}</div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-surface-2 px-3.5 py-3 ring-1 ring-line">
        <span className="text-[11.5px] text-ink-3">Sigue en</span>
        <div className="flex flex-wrap gap-1.5">{siguientes || <span className="text-[13px] text-ink-3">{vacioSiguiente}</span>}</div>
      </div>
    </div>
  );
}

export interface FirmaEtapa {
  rol: string;
  nombre: unknown;
  id?: unknown;
  cargo?: unknown;
  fecha?: string;
}

/* Firmas: quien hizo, quien supervisó o aprobó, con su figura. Las que faltan se dicen en palabras. */
export function FirmasEtapa({ firmas }: { firmas: FirmaEtapa[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {firmas.map((f, i) => (
        <li key={f.rol} className="entrada-escalonada flex flex-col gap-1.5 rounded-[14px] bg-surface px-3.5 py-3 shadow-card ring-1 ring-line" style={{ ["--i" as string]: i }}>
          <span className="text-[11.5px] text-ink-3">{f.rol}</span>
          {f.nombre ? <FiguraPersona id={f.id} nombre={f.nombre} size="md" conNombre subtitulo={[f.cargo ? String(f.cargo) : null, f.fecha || null].filter(Boolean).join(" · ") || undefined} /> : <span className="text-[13.5px] text-ink-3">Todavía no firma</span>}
        </li>
      ))}
    </ul>
  );
}

/* Catalogo de insumos y equipos para mostrar nombres en lugar de referencias. */
function useCatalogoInsumos(): number {
  const [tick, setTick] = useState(() => (isInsumoCacheLoaded() ? 1 : 0));
  useEffect(() => {
    if (isInsumoCacheLoaded()) return;
    let cancelado = false;
    void loadInsumoOptions().then(() => !cancelado && setTick((t) => t + 1));
    return () => {
      cancelado = true;
    };
  }, []);
  return tick;
}

const ICONO_INSUMO: Record<string, ReactNode> = {
  reactivo: <Flask size={16} weight="duotone" />,
  consumible: <Cube size={16} weight="duotone" />,
  equipo: <Wrench size={16} weight="duotone" />,
};

/* Reactivos y consumibles usados: nombre y cantidad con su unidad. */
export function InsumosUsados({ items }: { items: unknown }) {
  useCatalogoInsumos();
  const lista = (Array.isArray(items) ? items : []) as ApiRecord[];
  if (!lista.length) return <p className="text-[13.5px] text-ink-3">No se registraron reactivos ni consumibles.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-[14px] bg-surface-2 ring-1 ring-line">
      {lista.map((u, i) => {
        const tipo = String(u.tipo || "consumible");
        const opcion = findInsumoOption(tipo, u.ref || u.nombre);
        const nombre = opcion?.label || String(u.nombre || "Insumo del inventario");
        const unidad = opcion?.unidad ? ` ${opcion.unidad}` : tipo === "consumible" ? " pza" : "";
        return (
          <li key={`${tipo}-${String(u.ref || u.nombre)}-${i}`} className="flex items-start gap-3 px-3.5 py-2.5">
            <span aria-hidden="true" className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]", tipo === "reactivo" ? "bg-[#e9e4f8] text-[#5b3fa6]" : "bg-surface text-ink-2")}>
              {ICONO_INSUMO[tipo] || <Drop size={16} weight="duotone" />}
            </span>
            <span className="min-w-0 flex-1 break-words text-[13.5px] text-ink">{nombre}</span>
            <span className="tnum shrink-0 text-[13px] text-ink-2">
              {u.cantidad !== undefined && u.cantidad !== null ? `${formatInventoryAmount(u.cantidad)}${unidad}` : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* Equipos usados: nombre, para que se usó y su bitácora. */
export function EquiposUsados({ equipos }: { equipos: Array<{ nombre?: unknown; uso?: unknown; clave?: unknown; folio?: unknown; ref?: unknown }> }) {
  useCatalogoInsumos();
  const lista = equipos.filter((e) => e.nombre || e.ref);
  if (!lista.length) return <p className="text-[13.5px] text-ink-3">No se registraron equipos.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-[14px] bg-surface-2 ring-1 ring-line">
      {lista.map((e, i) => {
        const opcion = e.ref ? findInsumoOption("equipo", e.ref) : null;
        const nombre = String(e.nombre || opcion?.nombre || opcion?.label || "Equipo");
        return (
          <li key={`${nombre}-${i}`} className="flex items-start gap-3 px-3.5 py-2.5">
            <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-surface text-ink-2">
              <Wrench size={16} weight="duotone" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="break-words text-[13.5px] text-ink">{nombre}</span>
              {e.uso ? <span className="text-[12.5px] text-ink-3">{String(e.uso)}</span> : null}
            </span>
            {e.clave || e.folio ? (
              <span className="shrink-0 text-right text-[12px] text-ink-3">
                Bitácora {[e.clave, e.folio ? `folio ${String(e.folio)}` : null].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* Muestras de la etapa (ID interno o lote) como etiquetas que pasan de linea. */
export function MuestrasEtiquetas({ ids }: { ids: string[] }) {
  if (!ids.length) return <SinDato />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className="inline-flex min-h-6 items-center rounded-full bg-surface-3 px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2">
          {id}
        </span>
      ))}
    </div>
  );
}
