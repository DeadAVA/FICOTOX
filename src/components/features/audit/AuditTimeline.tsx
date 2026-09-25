"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Archive, ArrowClockwise, ArrowCounterClockwise, CheckCircle, DownloadSimple, Eye, LockKey, Package, PencilSimple, Plus, Prohibit, SealCheck, ShieldCheck, SignIn, Trash, Truck, UploadSimple, Warning, XCircle } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Overlay";
import { AuditEntryDetail } from "./AuditDetail";
import { cn } from "@/components/ui/cn";
import { dayLabel, humanizeAuditEntry, timeLabel, type AuditTone, type HumanChange, type HumanEntry } from "@/lib/client/audit-humanize";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Linea de tiempo de la bitacora: una frase por entrada ("Daniela Cortés
 * aprobó el análisis A 0000004"), el motivo como cita y los hechos clave como
 * chips. Al pulsar un evento se abre el mismo detalle que en Auditoría
 * (AuditEntryDetail). Sin JSON ni nombres de columnas.
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

export function AuditEntryRow({ entry, showEntity = false, compact = false, onOpen, selected = false }: { entry: HumanEntry; showEntity?: boolean; compact?: boolean; onOpen?: () => void; selected?: boolean }) {
  const hasDetails = entry.changes.length > 0;
  return (
    <li className={cn("relative flex gap-3 last:pb-0", compact ? "pb-3.5" : "pb-5")}>
      {/* El nodo mide 28 px y la primera línea de texto se centra con él (min-h-7). */}
      <span className={cn("relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", NODE_TONE[entry.tone])} aria-hidden="true">
        {ICONS[entry.verb] || <PencilSimple size={13} weight="bold" />}
      </span>
      {/* Al pulsar el evento se abre el mismo detalle que en Auditoría. */}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cn("-mx-2 -my-1 min-w-0 flex-1 rounded-[10px] px-2 py-1 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none", selected && "bg-brand-faint")}
      >
        <span className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13.5px] leading-[1.35] text-ink">
            {entry.actor ? <span className={cn("font-semibold", entry.isSystem && "text-ink-2")}>{entry.actor} </span> : null}
            {entry.action}
          </span>
          <span className="tnum text-[12px] text-ink-3">{timeLabel(entry.when)}</span>
        </span>
        {showEntity && entry.verb !== "login" && entry.verb !== "login_fallido" ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
            {entry.entityLabel}
            {entry.reference ? <span className="code text-ink-2">{entry.reference}</span> : null}
          </span>
        ) : null}
        {entry.motivo && !compact ? <span className="mt-1.5 block border-l-2 border-line-strong pl-2.5 text-[13px] italic text-ink-2">“{entry.motivo}”</span> : null}
        {!compact && (entry.facts.length || hasDetails) ? (
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {entry.facts.slice(0, 3).map((fact) => (
              <span key={fact} className="rounded-full bg-surface-3 px-2 py-0.5 text-[12px] text-ink-2">
                {fact}
              </span>
            ))}
            {hasDetails ? <span className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-brand">{`Ver ${entry.changes.length === 1 ? "el cambio" : `${entry.changes.length} cambios`}`}</span> : null}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/* `compact`: solo la frase, la hora y el enlace (para el Inicio); sin motivo, hechos ni cambios. */
export function AuditTimeline({ items, showEntity = false, compact = false, className }: { items: ApiRecord[]; showEntity?: boolean; compact?: boolean; className?: string }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const { groups, porId } = useMemo(() => {
    const porId = new Map<number, { entry: HumanEntry; record: ApiRecord }>();
    const byDay = new Map<string, HumanEntry[]>();
    for (const record of items) {
      const entry = humanizeAuditEntry(record);
      porId.set(entry.id, { entry, record });
      const key = dayLabel(entry.when);
      const list = byDay.get(key) || [];
      list.push(entry);
      byDay.set(key, list);
    }
    return { groups: Array.from(byDay.entries()), porId };
  }, [items]);
  const seleccion = abierta !== null ? porId.get(abierta) : undefined;

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-6", className)}>
      {groups.map(([day, entries]) => (
        <section key={day} className="flex flex-col gap-3">
          <p className={cn("z-[2] -mx-1 w-fit rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-ink-3", !compact && "sticky top-14 bg-canvas/90 backdrop-blur lg:top-2")}>{day}</p>
          <ol aria-label="Movimientos" className="relative flex flex-col pl-1 before:absolute before:top-3 before:bottom-3 before:left-[17px] before:w-px before:bg-line">
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} showEntity={showEntity} compact={compact} selected={entry.id === abierta} onOpen={() => setAbierta(entry.id)} />
            ))}
          </ol>
        </section>
      ))}
      <Sheet open={!!seleccion} onOpenChange={(open) => !open && setAbierta(null)} title="Detalle del movimiento" description="Bitácora de auditoría">
        {seleccion ? <AuditEntryDetail entry={seleccion.entry} record={seleccion.record} /> : null}
      </Sheet>
    </div>
  );
}
