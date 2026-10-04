"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Badge, type Tone } from "./Primitives";

/*
 * Insignias e indicadores con colores con significado, comunes a todas las
 * listas y ventanas:
 * - EstadoInsignia: el estado de un registro (punto + texto). Verde = listo o
 *   vigente, azul = en curso, ambar = espera o atencion, rojo = anulado,
 *   rechazado o bloqueado, gris = cerrado o de baja.
 * - IndicadorConteo: un dato compacto con icono ("5 vigentes", "2 evidencias").
 * - SinDato: "—" en gris para una columna sin valor (no se desplaza nada).
 * - Los indicadores de "solicitud pendiente", "visto bueno", "retenido",
 *   "requiere enmienda"… son StatusFlag (StatusFlag.tsx) y SolicitudBadge.
 */

export { StatusFlag as Indicador, StatusCell as Indicadores, type StatusFlagKind as TipoIndicador } from "./StatusFlag";

export function EstadoInsignia({ tono, children }: { tono: Tone; children: ReactNode }) {
  return (
    <Badge tone={tono} dot>
      {children}
    </Badge>
  );
}

const TONO_CONTEO: Record<"brand" | "success" | "warning" | "danger" | "neutral", string> = {
  brand: "bg-brand-faint text-brand-strong",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-3 text-ink-2",
};

export function IndicadorConteo({ icono, children, tono = "brand", titulo }: { icono?: ReactNode; children: ReactNode; tono?: keyof typeof TONO_CONTEO; titulo?: string }) {
  return (
    <span title={titulo} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium", TONO_CONTEO[tono])}>
      {icono}
      {children}
    </span>
  );
}

export function SinDato({ texto = "—" }: { texto?: string }) {
  return <span className="text-[13px] text-ink-4">{texto}</span>;
}

/* Figuras apiladas (maximo `max` y "+N"): asignados, autorizados, personas con un rol. */
export function FigurasApiladas({ children, total, max = 4 }: { children: ReactNode[]; total: number; max?: number }) {
  const visibles = children.slice(0, max);
  return (
    <span className="flex -space-x-2">
      {visibles}
      {total > max ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2 ring-2 ring-surface">+{total - max}</span> : null}
    </span>
  );
}
