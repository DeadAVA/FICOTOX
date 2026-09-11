"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CaretRight, Check, PencilSimple, SealCheck, Eye, FlagCheckered } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { Tooltip } from "@/components/ui/Overlay";
import { fmtDate } from "@/lib/client/format";

/*
 * "En curso" del Inicio: una tarjeta por recepción que no ha terminado su
 * flujo, con la línea de etapas (recepción → informe) y el siguiente paso
 * como botón. Al pasar el cursor (o enfocar con teclado) la tarjeta se
 * despliega con el detalle de cada etapa: folio, estado y enlace.
 */

export interface FlowStep {
  key: "recepcion" | "procesamiento" | "extraccion" | "analisis" | "informe";
  label: string;
  state: "done" | "current" | "pending" | "warn";
  folio: string | null;
  href: string | null;
  detail: string | null;
}

export interface FlowItem {
  id: number;
  folio: string;
  cliente: string | null;
  muestras: string[];
  analisis_tipos: string[];
  fecha_recepcion: string | null;
  dias: number;
  estado: string;
  etapa: FlowStep["key"] | "cierre";
  siguiente: { label: string; href: string; accion: "capturar" | "revisar" | "aprobar" | "cerrar" };
  pasos: FlowStep[];
}

const TIPO_LABEL: Record<string, string> = { acido_domoico: "ASP", toxinas_lipofilicas: "DSP", toxinas_paralizantes: "PSP" };

const ACTION_ICON = {
  capturar: <PencilSimple size={13} weight="bold" />,
  revisar: <Eye size={13} weight="bold" />,
  aprobar: <SealCheck size={13} weight="bold" />,
  cerrar: <FlagCheckered size={13} weight="bold" />,
};

const ACTION_TONE = {
  capturar: "bg-brand text-white hover:bg-brand-strong",
  revisar: "bg-ink text-white hover:bg-deep-2",
  aprobar: "bg-ink text-white hover:bg-deep-2",
  cerrar: "bg-surface-3 text-ink hover:bg-line-strong/70",
};

function StepNode({ step, last }: { step: FlowStep; last: boolean }) {
  const node = (
    <span className={cn("relative z-[1] flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-surface transition-transform duration-300 ease-[var(--ease-spring)] group-hover/card:scale-110", step.state === "done" && "bg-brand text-white", step.state === "current" && "bg-surface text-brand shadow-[0_0_0_2px_var(--color-brand)]", step.state === "pending" && "bg-surface-3 text-ink-4")} aria-hidden="true">
      {step.state === "done" ? <Check size={10} weight="bold" /> : step.state === "current" ? <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-brand" /> : <span className="h-[5px] w-[5px] rounded-full bg-line-strong" />}
    </span>
  );
  const body = (
    <span className="flex flex-col items-center gap-1.5">
      {node}
      <span className={cn("hidden text-[10.5px] leading-none tracking-wide sm:block", step.state === "current" ? "font-semibold text-brand-strong" : step.state === "done" ? "text-ink-2" : "text-ink-4")}>{step.label}</span>
    </span>
  );
  const tip = (
    <span className="flex flex-col gap-0.5">
      <span className="font-medium">
        {step.label}
        {step.folio ? ` · ${step.folio}` : ""}
      </span>
      <span className="text-white/75">{step.detail || (step.state === "pending" ? "Pendiente" : step.state === "current" ? "Es el paso que sigue" : "Listo")}</span>
    </span>
  );
  return (
    <li className={cn("relative flex flex-1 flex-col items-center", !last && "after:absolute after:top-[9px] after:left-1/2 after:h-px after:w-full after:bg-line")}>
      <span className={cn("absolute top-[9px] left-1/2 h-px w-full bg-brand transition-transform duration-500 ease-[var(--ease-spring)] origin-left", last && "hidden", step.state === "done" ? "scale-x-100" : "scale-x-0")} aria-hidden="true" />
      <Tooltip content={tip} side="top">
        {step.href ? (
          <Link href={step.href} className="press rounded-[8px] px-1 outline-none focus-visible:shadow-[var(--shadow-focus)]" aria-label={`${step.label}${step.folio ? ` ${step.folio}` : ""}`}>
            {body}
          </Link>
        ) : (
          <span className="px-1">{body}</span>
        )}
      </Tooltip>
    </li>
  );
}

export function FlowCard({ item }: { item: FlowItem }) {
  const [pinned, setPinned] = useState(false);
  const tipos = item.analisis_tipos.map((t) => TIPO_LABEL[t] || t);
  const muestras = item.muestras.length;
  return (
    <li className={cn("group/card relative rounded-[14px] transition-[background-color,box-shadow] duration-200 hover:z-20 hover:bg-brand-faint/70 focus-within:z-20 focus-within:bg-brand-faint/70", pinned && "bg-brand-faint/70")}>
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link href={`/muestras/recepcion/${item.id}`} className="code rounded-[6px] text-[13px] font-semibold text-ink outline-none hover:text-brand-strong focus-visible:shadow-[var(--shadow-focus)]">
              {item.folio}
            </Link>
            <span className="min-w-0 truncate text-[13.5px] text-ink">{item.cliente || "Sin solicitante"}</span>
          </div>
          <p className="text-[12px] text-ink-3">
            {[tipos.join(" + ") || null, `${muestras} ${muestras === 1 ? "muestra" : "muestras"}`, item.dias === 0 ? "hoy" : item.dias === 1 ? "1 día" : `${item.dias} días`].filter(Boolean).join(" · ")}
          </p>
          <ol className="flex items-start pt-0.5 pr-2" aria-label="Etapas">
            {item.pasos.map((step, index) => (
              <StepNode key={step.key} step={step} last={index === item.pasos.length - 1} />
            ))}
          </ol>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:flex-col sm:items-end sm:gap-2 sm:pt-0.5">
          <Link href={item.siguiente.href} className={cn("press inline-flex h-8 items-center gap-1.5 rounded-full pr-2.5 pl-3 text-[12.5px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors", ACTION_TONE[item.siguiente.accion])}>
            {ACTION_ICON[item.siguiente.accion]}
            {item.siguiente.label}
            <ArrowRight size={12} weight="bold" className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover/card:translate-x-0.5" />
          </Link>
          <button type="button" onClick={() => setPinned((v) => !v)} aria-expanded={pinned} aria-controls={`flow-${item.id}-detalle`} className="press inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11.5px] text-ink-4 hover:bg-surface-3 hover:text-ink-2 sm:hidden">
            Detalle <CaretRight size={11} weight="bold" className={cn("transition-transform", pinned && "rotate-90")} />
          </button>
        </div>
      </div>
      {/*
       * Detalle. En escritorio sale del pie de la tarjeta como una capa (no empuja
       * las tarjetas de abajo, así la lista no se mueve bajo el cursor); en móvil,
       * con el botón "Detalle", se despliega en flujo.
       */}
      <div id={`flow-${item.id}-detalle`} className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-spring)]", pinned ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:top-full sm:z-20 sm:grid-rows-[1fr] sm:origin-top sm:scale-95 sm:transition-[opacity,transform] group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-hover/card:scale-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100 group-focus-within/card:scale-100 max-sm:group-hover/card:grid-rows-[1fr] max-sm:group-focus-within/card:grid-rows-[1fr]")}>
        <div className="min-h-0 overflow-hidden">
          <dl className={cn("mx-4 mb-3 grid gap-x-4 gap-y-1.5 rounded-[12px] px-3 py-2.5 text-[12.5px] ring-1 ring-line sm:grid-cols-2", pinned ? "bg-surface/80" : "bg-surface sm:shadow-pop")}>
            {item.pasos.map((step) => (
              <div key={step.key} className="flex min-w-0 items-baseline justify-between gap-3">
                <dt className="shrink-0 text-ink-3">{step.label}</dt>
                <dd className="min-w-0 truncate text-right text-ink">
                  {step.href && step.folio ? (
                    <Link href={step.href} className="code font-medium text-brand-strong hover:underline">
                      {step.folio}
                    </Link>
                  ) : null}
                  {step.detail ? <span className={cn(step.folio && "ml-1.5", step.state === "pending" ? "text-ink-4" : "text-ink-2")}>{step.detail}</span> : !step.folio ? <span className="text-ink-4">Pendiente</span> : null}
                </dd>
              </div>
            ))}
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <dt className="shrink-0 text-ink-3">Recibida</dt>
              <dd className="truncate text-right text-ink-2">{fmtDate(item.fecha_recepcion)}</dd>
            </div>
            {item.muestras.length ? (
              <div className="flex min-w-0 items-baseline justify-between gap-3 sm:col-span-2">
                <dt className="shrink-0 text-ink-3">Muestras</dt>
                <dd className="code min-w-0 truncate text-right text-ink-2">{item.muestras.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </li>
  );
}
