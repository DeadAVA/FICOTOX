"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/* Piezas pequeñas compartidas: Badge, Card, Skeleton, EmptyState, Kbd, Avatar, Stat, StockMeter. */

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "bloom" | "ink";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-[#1f6b50]",
  warning: "bg-warning-soft text-[#8d6011]",
  danger: "bg-danger-soft text-[#a33731]",
  bloom: "bg-bloom-soft text-[#b1472e]",
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
    <div className={cn("rounded-card border border-line bg-surface shadow-card", padded && "p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[6px] bg-surface-3/80", className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col divide-y divide-line" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid items-center gap-4 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
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
      {icon ? <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-ink-3">{icon}</div> : null}
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
        <button type="button" onClick={onRetry} className="press h-8 rounded-control border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2">
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-line bg-surface-2 px-1.5 font-mono text-[11px] text-ink-2">{children}</kbd>;
}

export function Avatar({ name, email, size = "md", className }: { name?: string; email?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  const dims = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-[13px]", lg: "h-12 w-12 text-[16px]" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-deep-2 font-semibold uppercase tracking-wide text-white", dims, className)} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Stat({ label, value, hint, tone = "neutral", icon, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "brand" | "warning" | "danger" | "success"; icon?: ReactNode; className?: string }) {
  const valueTone = { neutral: "text-ink", brand: "text-brand-strong", warning: "text-[#8d6011]", danger: "text-danger", success: "text-[#1f6b50]" }[tone];
  return (
    <div className={cn("flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-3">
        <span>{label}</span>
        {icon ? <span className="text-ink-4">{icon}</span> : null}
      </div>
      <p className={cn("tnum text-[28px] font-semibold leading-none tracking-tight", valueTone)}>{value}</p>
      {hint ? <p className="text-[12.5px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function StockMeter({ percent, tone, label, className }: { percent: number | null; tone?: "success" | "warning" | "danger" | "neutral"; label?: ReactNode; className?: string }) {
  const p = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const t = tone || (percent === null ? "neutral" : p <= 15 ? "danger" : p <= 35 ? "warning" : "success");
  const bar = { success: "bg-success", warning: "bg-warning", danger: "bg-bloom", neutral: "bg-line-strong" }[t];
  return (
    <div className={cn("flex min-w-[120px] flex-col gap-1", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full transition-[width] duration-500 ease-[var(--ease-fluid)]", bar)} style={{ width: `${percent === null ? 0 : p}%` }} />
      </div>
      {label ? <span className="tnum text-[12px] text-ink-3">{label}</span> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
