"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { AvatarArt } from "./AvatarArt";
import { cn } from "./cn";

/* Piezas pequeñas compartidas: Badge, Card, Skeleton, EmptyState, Kbd, Avatar, Stat, StockMeter. */

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "bloom" | "ink";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-2",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger-text",
  bloom: "bg-bloom-soft text-[#9a4a1f]",
  ink: "bg-ink text-white",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium", TONES[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Card({ className, children, padded = true, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div className={cn("rounded-card bg-surface shadow-card", padded && "p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="title-3 text-ink">{title}</h2>
        {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[6px] bg-surface-3", className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col divide-y divide-line" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid items-center gap-4 px-4 py-3.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-3/4" : c === cols - 1 ? "w-1/3" : "w-1/2")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, compact, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14", className)}>
      {icon ? <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-surface-3 text-ink-3">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {description ? <p className="max-w-md text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-ink">No se pudo cargar</p>
      <p className="max-w-md text-[13px] text-ink-3">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="press h-8 rounded-[8px] bg-surface px-3 text-[13px] font-medium text-ink shadow-card hover:bg-surface-2">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-surface-3 px-1.5 font-sans text-[11px] font-medium text-ink-3">{children}</kbd>;
}

/*
 * Avatar: una ilustracion del catalogo (`AvatarArt`). Si la persona no ha
 * elegido, se deriva del correo para que siempre le toque la misma.
 */
export function Avatar({ name, email, avatar, size = "md", className }: { name?: string; email?: string; avatar?: string | null; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const px = { xs: 24, sm: 28, md: 36, lg: 48, xl: 72 }[size];
  return <AvatarArt avatar={avatar} seed={(email || name || "?").trim().toLowerCase()} size={px} className={cn("rounded-full shadow-[0_1px_2px_rgba(16,32,43,0.18)]", className)} />;
}

export function Stat({ label, value, hint, tone = "neutral", icon, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "brand" | "warning" | "danger" | "success"; icon?: ReactNode; className?: string }) {
  const valueTone = { neutral: "text-ink", brand: "text-brand-strong", warning: "text-warning-text", danger: "text-danger", success: "text-success-text" }[tone];
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-card bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-3">
        <span>{label}</span>
        {icon ? <span className="text-ink-4">{icon}</span> : null}
      </div>
      <p className={cn("tnum text-[26px] font-semibold leading-none tracking-[-0.02em]", valueTone)}>{value}</p>
      {hint ? <p className="text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

/*
 * Medidor de existencia. Recibe la cantidad real, el máximo (capacidad o stock
 * de referencia) y el mínimo, y muestra: barra animada con color según el estado
 * (vacío = rojo, bajo = ámbar, normal = verde), una marca en el mínimo y la
 * lectura "6 de 8 L · 75 %". `low` lo decide quien llama con la misma regla
 * que usan los filtros y los avisos del Inicio, para que todo coincida.
 */
export function StockMeter({ current, max, min, unit, low, size = "sm", label, className }: { current: number | null; max?: number | null; min?: number | null; unit?: string; low?: boolean; size?: "sm" | "lg"; label?: ReactNode; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const known = current !== null && current !== undefined;
  const value = known ? Math.max(0, current) : 0;
  const cap = max && max > 0 ? max : value > 0 ? value : 0;
  const percent = cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
  const empty = known && value <= 0;
  const state: "empty" | "low" | "ok" | "unknown" = !known ? "unknown" : empty ? "empty" : low ? "low" : "ok";
  const bar = { empty: "bg-danger", low: "bg-warning", ok: "bg-success", unknown: "bg-line-strong" }[state];
  const text = { empty: "text-danger", low: "text-warning-text", ok: "text-ink-3", unknown: "text-ink-4" }[state];
  const status = { empty: "Vacío", low: "Bajo", ok: `${Math.round(percent)} %`, unknown: "Sin registro" }[state];
  const minPercent = min && min > 0 && cap > 0 ? Math.min(100, (min / cap) * 100) : null;
  const u = unit ? ` ${unit}` : "";
  const reading = !known ? "Sin registro" : max && max > 0 ? `${fmtNumber(value)} de ${fmtNumber(max)}${u}` : `${fmtNumber(value)}${u}`;
  return (
    <div className={cn("flex min-w-[140px] flex-col", size === "lg" ? "gap-2" : "gap-1", className)}>
      <div className={cn("relative w-full overflow-hidden rounded-full bg-surface-3", size === "lg" ? "h-2.5" : "h-1.5")} role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={typeof label === "string" ? label : reading}>
        <div className={cn("h-full rounded-full transition-[width,background-color] duration-700 ease-[var(--ease-spring)]", bar, state === "empty" && "animate-pulse")} style={{ width: ready ? `${percent}%` : "0%" }} />
        {minPercent !== null ? <span className="absolute top-0 h-full w-0.5 bg-ink/35" style={{ left: `calc(${minPercent}% - 1px)` }} title={`Mínimo: ${fmtNumber(min as number)}${u}`} aria-hidden="true" /> : null}
      </div>
      <div className={cn("tnum flex items-center justify-between gap-2", size === "lg" ? "text-[13px]" : "text-[12px]")}>
        <span className="text-ink-3">{label ?? reading}</span>
        <span className={cn("shrink-0 font-medium", text)}>{status}</span>
      </div>
    </div>
  );
}

const fmtNumber = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 3 });

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

/* Fila "etiqueta · valor" para fichas de detalle (estilo lista de ajustes). */
export function DetailRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5 text-[13.5px]", className)}>
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="min-w-0 text-right text-ink">{children}</span>
    </div>
  );
}
