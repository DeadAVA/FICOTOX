"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Archive, ArrowClockwise, ArrowCounterClockwise, ArrowSquareOut, CaretDown, CheckCircle, DownloadSimple, Eye, LockKey, Package, PencilSimple, Plus, Prohibit, SealCheck, ShieldCheck, SignIn, Trash, Truck, UploadSimple, Warning, XCircle } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/Overlay";
import { cn } from "@/components/ui/cn";
import { dayLabel, humanizeAuditEntry, timeLabel, type AuditTone, type HumanChange, type HumanEntry } from "@/lib/client/audit-humanize";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Linea de tiempo de la bitacora: una frase por entrada ("Daniela Cortés
 * aprobó el análisis A 0000004"), el motivo como cita, los hechos clave como
 * chips y, al desplegar, la lista de cambios en español (antes → después).
 * Sin JSON ni nombres de columnas.
 */

const ICONS: Record<string, ReactNode> = {
  crear: <Plus size={13} weight="bold" />,
  editar: <PencilSimple size={13} weight="bold" />,
  anular: <Prohibit size={13} weight="bold" />,
  restaurar: <ArrowCounterClockwise size={13} weight="bold" />,
  baja: <Archive size={13} weight="bold" />,
  reactivar: <ArrowClockwise size={13} weight="bold" />,
  revisar: <Eye size={13} weight="bold" />,
  aprobar: <SealCheck size={13} weight="bold" />,
  autorizar: <ShieldCheck size={13} weight="bold" />,
  entregar: <Truck size={13} weight="bold" />,
  rechazar: <XCircle size={13} weight="bold" />,
  aceptar: <CheckCircle size={13} weight="bold" />,
  cerrar: <LockKey size={13} weight="bold" />,
  reponer: <Package size={13} weight="bold" />,
  importar: <UploadSimple size={13} weight="bold" />,
  eliminar: <Trash size={13} weight="bold" />,
  login: <SignIn size={13} weight="bold" />,
  login_fallido: <Warning size={13} weight="bold" />,
  descargar: <DownloadSimple size={13} weight="bold" />,
};

const NODE_TONE: Record<AuditTone, string> = {
  neutral: "bg-surface-3 text-ink-2",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger",
  ink: "bg-ink text-white",
};

export function ChangeList({ changes }: { changes: HumanChange[] }) {
  if (!changes.length) return <p className="text-[12.5px] text-ink-3">No se registraron cambios de campos.</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-[minmax(140px,max-content)_minmax(0,1fr)]">
      {changes.map((change, index) => (
        <div key={`${change.label}-${index}`} className="contents">
          <dt className="text-ink-3 sm:text-right">{change.label}</dt>
          <dd className="min-w-0 text-ink">
            {change.lines ? (
              <ul className="flex flex-col gap-0.5">
                {change.lines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <span className={cn(change.before === "vacío" ? "text-ink-4" : "text-ink-3 line-through decoration-line-strong")}>{change.before}</span>
                <span className="text-ink-4">→</span>
                <span className={cn("font-medium", change.after === "vacío" && "font-normal text-ink-4")}>{change.after}</span>
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditEntryRow({ entry, showEntity = false, defaultOpen = false, compact = false }: { entry: HumanEntry; showEntity?: boolean; defaultOpen?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = entry.changes.length > 0;
  const link = entry.href ? (
    <Link href={entry.href} className="press inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[12px] font-medium text-brand hover:bg-brand-faint">
      Abrir <ArrowSquareOut size={12} />
    </Link>
  ) : null;
  return (
    <li className={cn("relative flex gap-3 last:pb-0", compact ? "pb-3.5" : "pb-5")}>
      {/* El nodo mide 28 px y la primera línea de texto se centra con él (min-h-7). */}
      <span className={cn("relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", NODE_TONE[entry.tone])} aria-hidden="true">
        {ICONS[entry.verb] || <PencilSimple size={13} weight="bold" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-[13.5px] leading-[1.35] text-ink">
            {entry.actor ? <span className={cn("font-semibold", entry.isSystem && "text-ink-2")}>{entry.actor} </span> : null}
            {entry.action}
          </p>
          <span className="tnum text-[12px] text-ink-3">{timeLabel(entry.when)}</span>
        </div>
        {showEntity && entry.verb !== "login" && entry.verb !== "login_fallido" ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
            {entry.entityLabel}
            {entry.reference ? <span className="code text-ink-2">{entry.reference}</span> : null}
            {link}
          </p>
        ) : null}
        {entry.motivo && !compact ? <p className="mt-1.5 border-l-2 border-line-strong pl-2.5 text-[13px] italic text-ink-2">“{entry.motivo}”</p> : null}
        {!compact && (entry.facts.length || hasDetails) ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {entry.facts.map((fact) => (
              <span key={fact} className="rounded-full bg-surface-3 px-2 py-0.5 text-[12px] text-ink-2">
                {fact}
              </span>
            ))}
            {hasDetails ? (
              <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={`audit-${entry.id}-detalle`} className="press inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-brand hover:bg-brand-faint">
                {open ? "Ocultar detalles" : `Ver ${entry.changes.length === 1 ? "el cambio" : `${entry.changes.length} cambios`}`}
                <CaretDown size={11} weight="bold" className={cn("transition-transform", open && "rotate-180")} />
              </button>
            ) : null}
          </div>
        ) : null}
        {open ? (
          <div id={`audit-${entry.id}-detalle`} className="mt-2 rounded-[10px] bg-surface-2 p-3 ring-1 ring-line">
            <ChangeList changes={entry.changes} />
            {entry.hash ? (
              <Tooltip content="Sello de integridad: cada entrada firma la anterior; si alguien altera la bitácora, la cadena se rompe.">
                <button type="button" className="mt-2 inline-flex items-center gap-1 rounded-[6px] text-[11px] text-ink-4 hover:text-ink-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
                  <ShieldCheck size={12} /> Sello <span className="code">{entry.hash.slice(0, 12)}</span>
                </button>
              </Tooltip>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/* `compact`: solo la frase, la hora y el enlace (para el Inicio); sin motivo, hechos ni cambios. */
export function AuditTimeline({ items, showEntity = false, compact = false, className }: { items: ApiRecord[]; showEntity?: boolean; compact?: boolean; className?: string }) {
  const groups = useMemo(() => {
    const entries = items.map(humanizeAuditEntry);
    const byDay = new Map<string, HumanEntry[]>();
    for (const entry of entries) {
      const key = dayLabel(entry.when);
      const list = byDay.get(key) || [];
      list.push(entry);
      byDay.set(key, list);
    }
    return Array.from(byDay.entries());
  }, [items]);

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-6", className)}>
      {groups.map(([day, entries]) => (
        <section key={day} className="flex flex-col gap-3">
          <p className={cn("z-[2] -mx-1 w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-ink-3", !compact && "sticky top-14 bg-canvas/90 backdrop-blur lg:top-2")}>{day}</p>
          <ol aria-label="Movimientos" className="relative flex flex-col pl-1 before:absolute before:top-3 before:bottom-3 before:left-[17px] before:w-px before:bg-line">
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} showEntity={showEntity} compact={compact} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
