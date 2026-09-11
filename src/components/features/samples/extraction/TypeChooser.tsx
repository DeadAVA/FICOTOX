"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { EXTRACTION_TYPE_LIST, PLANNED_EXTRACTION_TYPES } from "@/lib/shared/extraction";

/*
 * Paso previo a una nueva extraccion: elegir el formato (ASP o DSP). Cada
 * uno es un procedimiento distinto con su propia serie de folios.
 */
export function ExtractionTypeChooser({ procesamiento }: { procesamiento: number | null }) {
  const suffix = procesamiento ? `&procesamiento=${procesamiento}` : "";
  return (
    <div className="animate-rise-in mx-auto flex w-full max-w-[820px] flex-col gap-6 py-4 sm:py-10">
      <div className="flex flex-col gap-2">
        <Link href="/muestras/extraccion" className="press inline-flex h-8 w-fit items-center gap-1 rounded-[8px] px-2 text-[13px] font-medium text-brand hover:bg-brand-faint">
          <ArrowLeft size={14} /> Extracciones
        </Link>
        <h1 className="title-1 text-ink">¿Qué extracción vas a registrar?</h1>
        <p className="max-w-[60ch] text-[14px] text-ink-2">
          Cada toxina tiene su propio formato aprobado y su propia numeración de folios.
          {procesamiento ? " La extracción quedará vinculada al procesamiento seleccionado." : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {EXTRACTION_TYPE_LIST.map((meta) => (
          <Link
            key={meta.tipo}
            href={`/muestras/extraccion/nueva?tipo=${meta.tipo}${suffix}`}
            className="press group flex flex-col gap-3 rounded-[18px] bg-surface p-6 shadow-card transition-shadow hover:shadow-raised"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="code inline-flex h-6 items-center rounded-[6px] bg-surface-3 px-2 text-[12px] font-medium text-ink-2">{meta.clave}</span>
              <span className="code text-[12px] text-ink-3">Folio {meta.tipo}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="title-2 text-ink">{meta.label}</span>
              <span className="text-[13.5px] text-ink-2">{meta.descripcion}</span>
            </div>
            <span className="mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand group-hover:text-brand-strong">
              Registrar extracción {meta.short} <ArrowRight size={14} weight="bold" />
            </span>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3" aria-label="Formatos previstos">
        {PLANNED_EXTRACTION_TYPES.map((meta) => (
          <div key={meta.tipo} className="flex flex-col gap-1.5 rounded-[14px] border border-dashed border-line-strong p-4 text-ink-4" aria-disabled="true">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-medium">{meta.label}</span>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide">Próximamente</span>
            </div>
            <span className="text-[12.5px]">{meta.toxina}</span>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-ink-3">Estos formatos se activarán cuando el laboratorio entregue los procedimientos aprobados del SGC.</p>
    </div>
  );
}
