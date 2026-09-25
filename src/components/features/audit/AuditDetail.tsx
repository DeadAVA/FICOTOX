"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowSquareOut, CaretDown, Quotes, ShieldCheck } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { type HumanChange, type HumanEntry } from "@/lib/client/audit-humanize";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFechaHora, formatearFechaLarga, formatearHora, fechaSola } from "@/lib/shared/fechas";
import { AUDIT_ACTIONS } from "@/lib/shared/sgc";
import { CATEGORIAS, categoriaDe, EntryIcon } from "./categorias";

/*
 * Detalle de una entrada de la bitacora, el mismo en /auditoria y en el
 * Historial de cada registro: la frase, quien y cuando, que cambio (valor
 * anterior tachado → nuevo resaltado), el motivo, el registro relacionado y,
 * plegados, los datos tecnicos (id, sello y entrada previa). Sin JSON.
 */

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/* "hace 5 min", "hace 3 h", "ayer", "hace 4 días". */
export function tiempoRelativo(date: Date | null, ahora = new Date()): string {
  if (!date) return "";
  const seg = Math.max(0, Math.round((ahora.getTime() - date.getTime()) / 1000));
  if (seg < 60) return "hace un momento";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 31) return `hace ${d} días`;
  const m = Math.round(d / 30);
  return m < 12 ? `hace ${m} ${m === 1 ? "mes" : "meses"}` : `hace ${Math.round(m / 12)} año${Math.round(m / 12) === 1 ? "" : "s"}`;
}

/* Cargo con el que actuo quien hizo la accion (detalle.actuo_como), si lo guardo. */
export function cargoDe(record: ApiRecord): string | null {
  const detalle = ((record.cambios as ApiRecord | undefined)?._detalle || {}) as ApiRecord;
  const actuo = detalle.actuo_como;
  if (!actuo) return null;
  if (typeof actuo === "string") return actuo;
  return (actuo as ApiRecord).cargo ? String((actuo as ApiRecord).cargo) : null;
}

function Cambio({ change }: { change: HumanChange }) {
  if (change.lines) {
    return (
      <ul className="flex flex-col gap-0.5 text-[13.5px] text-ink">
        {change.lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    );
  }
  const antesVacio = !change.before || change.before === "vacío";
  const despuesVacio = !change.after || change.after === "vacío";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13.5px]">
      {antesVacio ? <span className="text-ink-4">—</span> : <span className="text-ink-3 line-through decoration-ink-4/60">{change.before}</span>}
      <span aria-hidden="true" className="text-ink-4">
        →
      </span>
      <span className="sr-only">cambió a</span>
      {despuesVacio ? <span className="text-ink-4">vacío</span> : <span className="rounded-[6px] bg-brand-faint px-1.5 py-0.5 font-medium text-ink">{change.after}</span>}
    </div>
  );
}

/* Lista de cambios con etiquetas legibles; en altas solo los datos principales (el resto se despliega). */
export function CambiosDetalle({ entry }: { entry: HumanEntry }) {
  const alta = entry.verb === "crear";
  const [todos, setTodos] = useState(false);
  const limite = alta ? 6 : 12;
  const visibles = todos ? entry.changes : entry.changes.slice(0, limite);
  if (!entry.changes.length) return <p className="text-[13px] text-ink-3">No se registraron cambios de campos.</p>;
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-[12px] bg-surface-2 ring-1 ring-line">
        {visibles.map((change, index) => (
          <div key={`${change.label}-${index}`} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(120px,34%)_minmax(0,1fr)] sm:gap-3">
            <dt className="text-[12.5px] font-medium text-ink-3">{change.label}</dt>
            <dd className="min-w-0">{alta && !change.lines ? <span className="text-[13.5px] text-ink">{change.after || "—"}</span> : <Cambio change={change} />}</dd>
          </div>
        ))}
      </dl>
      {entry.changes.length > limite ? (
        <button type="button" onClick={() => setTodos((v) => !v)} aria-expanded={todos} className="press inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium text-brand hover:bg-brand-faint focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
          {todos ? "Mostrar solo lo principal" : `Ver ${entry.changes.length - limite} dato${entry.changes.length - limite === 1 ? "" : "s"} más`}
          <CaretDown size={11} weight="bold" className={cn("transition-transform duration-200 ease-[var(--ease-spring)]", todos && "rotate-180")} />
        </button>
      ) : null}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="eyebrow text-ink-3">{titulo}</h3>
      {children}
    </section>
  );
}

export function AuditEntryDetail({ entry, record }: { entry: HumanEntry; record: ApiRecord }) {
  const cargo = cargoDe(record);
  const categoria = CATEGORIAS.find((c) => c.value === categoriaDe(entry));
  const estado = entry.changes.find((c) => c.isState)?.after || null;
  const detalle = ((record.cambios as ApiRecord | undefined)?._detalle || {}) as ApiRecord;
  const solicitudId = detalle.solicitud_id ? String(detalle.solicitud_id) : null;
  const esSesion = ["login", "login_fallido", "reauth_fallida", "cerrar_sesiones"].includes(entry.verb);
  return (
    <div className="flex flex-col gap-6" data-audit-detalle={entry.id}>
      <header className="flex gap-3.5">
        <EntryIcon entry={entry} size="lg" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[18px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">
            {entry.actor ? <span>{entry.actor} </span> : null}
            <span className="font-normal text-ink-2">{entry.actor ? entry.action : capitalize(entry.action)}</span>
          </p>
          <p className="tnum text-[13px] text-ink-2">
            {entry.when ? `${formatearFechaLarga(fechaSola(entry.when))}, ${formatearHora(entry.when)}` : "Sin fecha"}
            {entry.when ? <span className="text-ink-3"> · {tiempoRelativo(entry.when)}</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            {entry.isSystem ? <span>Acción automática del sistema</span> : entry.actorEmail || cargo ? <span>{[entry.actorEmail, cargo ? `actuó como ${cargo}` : null].filter(Boolean).join(" · ")}</span> : null}
            {categoria ? <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11.5px] text-ink-2">{categoria.label}</span> : null}
          </div>
        </div>
      </header>

      {entry.motivo ? (
        <div className="flex gap-2.5 rounded-[12px] bg-warning-soft/70 px-3.5 py-3 text-[14px] text-ink ring-1 ring-warning/15">
          <Quotes size={16} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="eyebrow mb-0.5 text-warning-text">Motivo</p>
            <p>{entry.motivo}</p>
          </div>
        </div>
      ) : null}

      {entry.changes.length || entry.facts.length ? (
      <Seccion titulo={entry.verb === "crear" ? "Datos principales" : "Qué cambió"}>
        <CambiosDetalle key={entry.id} entry={entry} />
        {entry.facts.length ? (
          <div className="flex flex-wrap gap-1.5">
            {entry.facts.map((fact) => (
              <span key={fact} className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[12px] text-ink-2">
                {fact}
              </span>
            ))}
          </div>
        ) : null}
      </Seccion>
      ) : null}

      {!esSesion && (entry.reference || entry.href) ? (
        <Seccion titulo="Registro relacionado">
          <div className="flex items-center justify-between gap-3 rounded-[12px] bg-surface px-3.5 py-3 shadow-card">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[12.5px] text-ink-3">{entry.entityLabel}</p>
              <p className="truncate text-[14px] font-medium text-ink">{entry.reference ? <span className="code">{entry.reference}</span> : "—"}</p>
              {estado ? <p className="text-[12.5px] text-ink-3">Estado tras este cambio: <span className="text-ink-2">{estado}</span></p> : null}
            </div>
            {entry.href ? (
              <Link href={entry.href} className="press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-surface-2 px-3 text-[13px] font-medium text-brand-strong ring-1 ring-line hover:bg-brand-faint focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
                <ArrowSquareOut size={14} /> Abrir
              </Link>
            ) : null}
          </div>
          {solicitudId ? (
            <Link href="/solicitudes" className="inline-flex w-fit items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
              Viene de la solicitud #{solicitudId} <ArrowSquareOut size={12} />
            </Link>
          ) : null}
        </Seccion>
      ) : null}

      <details className="group rounded-[12px] bg-surface-2 ring-1 ring-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] font-medium text-ink-2 outline-none focus-visible:shadow-[var(--shadow-focus)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} /> Datos técnicos
          </span>
          <CaretDown size={12} weight="bold" className="transition-transform duration-200 ease-[var(--ease-spring)] group-open:rotate-180" />
        </summary>
        <dl className="grid gap-x-4 gap-y-1.5 border-t border-line px-3.5 py-3 text-[12.5px] sm:grid-cols-[max-content_minmax(0,1fr)]">
          <dt className="text-ink-3">Entrada</dt>
          <dd className="tnum text-ink">#{entry.id}</dd>
          <dt className="text-ink-3">Acción</dt>
          <dd className="text-ink">{AUDIT_ACTIONS[entry.verb] || entry.verb}</dd>
          <dt className="text-ink-3">Fecha (UTC)</dt>
          <dd className="tnum text-ink">{record.fecha_hora ? String(record.fecha_hora) : "—"}</dd>
          <dt className="text-ink-3">Fecha local</dt>
          <dd className="tnum text-ink">{formatearFechaHora(record.fecha_hora)}</dd>
          <dt className="text-ink-3">Sello</dt>
          <dd className="code break-all text-ink">{entry.hash || "—"}</dd>
          <dt className="text-ink-3">Entrada previa</dt>
          <dd className="code break-all text-ink">{record.hash_anterior ? String(record.hash_anterior) : "— (primera de la cadena)"}</dd>
        </dl>
        <p className="border-t border-line px-3.5 py-2 text-[11.5px] text-ink-3">Cada entrada sella la anterior: si alguien altera la bitácora, la cadena deja de cuadrar.</p>
      </details>
    </div>
  );
}
