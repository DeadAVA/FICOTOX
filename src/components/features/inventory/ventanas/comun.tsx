"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Atom, Certificate, Columns, Drop, Flask, Package, TestTube, Cube } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { deadlineTone, fmt } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import { haceCuantoCorto } from "@/lib/client/tiempo";
import type { ApiRecord } from "@/lib/client/types";
import { diasEntre, formatearFechaCorta, formatearFechaHora, hoyLocal } from "@/lib/shared/fechas";

/*
 * Piezas comunes de Inventario (Reactivos, Consumibles, Equipos,
 * Mantenimiento y Movimientos) para el patron lista -> ventana de detalle:
 * icono y color por categoria, caducidad en color, movimientos recientes de
 * un insumo y el origen de un movimiento en palabras (con enlace).
 */

/* Icono y color suave por categoria de reactivo. */
const CATEGORIA: Record<string, { icono: (s: number) => ReactNode; clase: string }> = {
  acidos: { icono: (s) => <Drop size={s} weight="duotone" />, clase: "bg-danger-soft text-danger" },
  alcoholes_solventes: { icono: (s) => <Flask size={s} weight="duotone" />, clase: "bg-brand-soft text-brand-strong" },
  compuestos_amonio: { icono: (s) => <Atom size={s} weight="duotone" />, clase: "bg-warning-soft text-warning-text" },
  compuestos_sodio: { icono: (s) => <Atom size={s} weight="duotone" />, clase: "bg-success-soft text-success-text" },
  estandares_preparados: { icono: (s) => <TestTube size={s} weight="duotone" />, clase: "bg-brand-faint text-brand" },
  materiales_referencia: { icono: (s) => <Certificate size={s} weight="duotone" />, clase: "bg-success-soft text-success-text" },
  columnas_cromatograficas: { icono: (s) => <Columns size={s} weight="duotone" />, clase: "bg-surface-3 text-ink-2" },
  miscelaneos: { icono: (s) => <Package size={s} weight="duotone" />, clase: "bg-surface-3 text-ink-2" },
};

export function IconoCategoria({ categoria, grande = false }: { categoria?: unknown; grande?: boolean }) {
  const meta = CATEGORIA[String(categoria || "")] || { icono: (s: number) => <Flask size={s} weight="duotone" />, clase: "bg-surface-3 text-ink-2" };
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", grande ? "h-14 w-14 rounded-[16px]" : "h-10 w-10 rounded-[12px]", meta.clase)}>
      {meta.icono(grande ? 28 : 20)}
    </span>
  );
}

/* Icono de un consumible (no tienen categoria): una caja suave. */
export function IconoConsumible({ grande = false }: { grande?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center bg-brand-faint text-brand-strong", grande ? "h-14 w-14 rounded-[16px]" : "h-10 w-10 rounded-[12px]")}>
      <Package size={grande ? 28 : 20} weight="duotone" />
    </span>
  );
}

/* Icono de un equipo. */
export function IconoEquipo({ grande = false, tono = "bg-brand-faint text-brand-strong" }: { grande?: boolean; tono?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", grande ? "h-14 w-14 rounded-[16px]" : "h-10 w-10 rounded-[12px]", tono)}>
      <Cube size={grande ? 28 : 20} weight="duotone" />
    </span>
  );
}

/* Caducidad en palabras y color: rojo si vencio, ambar si faltan 30 dias o menos. */
export function caducidadDe(value: unknown): { texto: string; detalle: string | null; tono: "danger" | "warning" | null } | null {
  if (!value || String(value).trim() === "-") return null;
  const tono = deadlineTone(value);
  const dias = diasEntre(hoyLocal(), value);
  const detalle = dias === null ? null : dias < 0 ? (dias === -1 ? "venció ayer" : `venció hace ${-dias} días`) : dias === 0 ? "vence hoy" : dias <= 30 ? (dias === 1 ? "vence mañana" : `vence en ${dias} días`) : null;
  return { texto: formatearFechaCorta(value), detalle, tono };
}

export function Caducidad({ value }: { value: unknown }) {
  const c = caducidadDe(value);
  if (!c) return <span className="text-[13px] text-ink-4">—</span>;
  return (
    <span className="flex flex-col">
      <span className={cn("text-[13.5px]", c.tono === "danger" ? "font-medium text-danger" : c.tono === "warning" ? "font-medium text-warning-text" : "text-ink-2")}>{c.texto}</span>
      {c.detalle ? <span className={cn("text-[12px]", c.tono === "danger" ? "text-danger" : "text-warning-text")}>{c.detalle}</span> : null}
    </span>
  );
}

/* Origen de un movimiento en palabras y su registro enlazado (las salidas de los formatos llevan su folio en el motivo). */
export function origenDeMovimiento(m: ApiRecord): { texto: string; href: string | null } {
  const ref = String(m.referencia || "");
  const motivo = String(m.motivo || "");
  const ext = /^EXT-(\d+)-/.exec(ref);
  const proc = /^PROC-(\d+)-/.exec(ref);
  const ana = /^(?:ANA|AN)-(\d+)-/.exec(ref);
  if (ext) return { texto: motivo.replace(/^Extraccion/, "Extracción") || "Extracción", href: `/muestras/extraccion/${ext[1]}` };
  if (proc) return { texto: motivo.replace(/^Procesamiento/, "Procesamiento") || "Procesamiento", href: `/muestras/procesamiento/${proc[1]}` };
  if (ana) return { texto: motivo || "Análisis", href: `/muestras/analisis/${ana[1]}` };
  if (/^(reactivo|consumible)-/.test(ref)) return { texto: motivo || "Entrada al inventario", href: null };
  return { texto: motivo || "Movimiento de inventario", href: null };
}

export const esEntrada = (m: ApiRecord) => String(m.tipo || "").toLowerCase() === "entrada";

/* Icono de entrada (verde) o salida (ambar) de un movimiento. */
export function IconoMovimiento({ m, grande = false }: { m: ApiRecord; grande?: boolean }) {
  const entrada = esEntrada(m);
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", grande ? "h-14 w-14 rounded-[16px]" : "h-10 w-10 rounded-[12px]", entrada ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text")}>
      {entrada ? <ArrowDownLeft size={grande ? 28 : 20} weight="bold" /> : <ArrowUpRight size={grande ? 28 : 20} weight="bold" />}
    </span>
  );
}

/* Movimientos (los ultimos de la plataforma) de un insumo, para su ventana. */
export function useMovimientos(): { items: ApiRecord[] | null; error: string | null } {
  const { token } = useSession();
  const recurso = useResource<ApiRecord[]>(["movimientos", "movimientos-ventana"], async () => ((await getJsonAuth(`${API_BASE_URL}/inventory/movimientos`, token)).items || []) as ApiRecord[], { enabled: !!token });
  return { items: recurso.data || null, error: recurso.error || null };
}

export function MovimientosRecientes({ tabla, id, unidad }: { tabla: "reactivos" | "consumibles"; id: unknown; unidad?: string }) {
  const { items, error } = useMovimientos();
  if (error) return <p className="text-[13.5px] text-ink-3">No se pudieron cargar los movimientos.</p>;
  if (!items) return <Skeleton className="h-16 w-full" />;
  const propios = items.filter((m) => m.tabla_origen === tabla && Number(m.id_item) === Number(id)).slice(0, 6);
  if (!propios.length)
    return (
      <p className="text-[13.5px] text-ink-3">
        Sin movimientos recientes.{" "}
        <Link href="/movimientos" className="font-medium text-brand hover:underline">
          Ver todos los movimientos
        </Link>
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {propios.map((m, i) => {
        const origen = origenDeMovimiento(m);
        return (
          <li key={String(m.id)} className="entrada-escalonada flex items-start gap-3 rounded-[12px] bg-surface px-3 py-2.5 ring-1 ring-line" style={{ ["--i" as string]: i }}>
            <IconoMovimiento m={m} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[13.5px] font-medium text-ink">
                {esEntrada(m) ? "Entrada" : "Salida"} de {fmt(m.cantidad)}
                {unidad ? ` ${unidad}` : ""}
              </span>
              <span className="break-words text-[12.5px] text-ink-3">
                {origen.href ? (
                  <Link href={origen.href} className="text-brand hover:underline">
                    {origen.texto}
                  </Link>
                ) : (
                  origen.texto
                )}{" "}
                · <span title={formatearFechaHora(m.fecha_hora)}>{haceCuantoCorto(m.fecha_hora)}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* Indice de ventana con ↑/↓ sobre la lista visible. */
export function moverEn(indice: number | null, total: number, paso: number): number | null {
  if (indice === null) return null;
  const siguiente = indice + paso;
  return siguiente >= 0 && siguiente < total ? siguiente : indice;
}
