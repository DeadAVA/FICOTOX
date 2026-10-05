"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { ActividadDialog, agruparActividades, usePersonas } from "@/components/features/audit/Actividades";
import { EntryIcon } from "@/components/features/audit/categorias";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { haceCuantoCorto } from "@/lib/client/tiempo";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Actividad reciente (solo para quien ve la Auditoría): las ultimas 5
 * actividades del equipo con la misma frase humana de la Auditoría, la figura
 * de la persona y "hace X min". Cada una abre su detalle.
 */
export function ActividadReciente({ registros, className }: { registros: ApiRecord[] | null; className?: string }) {
  const personas = usePersonas();
  const grupos = useMemo(() => (registros ? agruparActividades(registros, { personas }).slice(0, 5) : null), [registros, personas]);
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <section aria-labelledby="actividad-reciente" className={cn("entrada-escalonada flex flex-col gap-3", className)} style={{ ["--i" as string]: 3 }}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="actividad-reciente" className="title-3 text-ink">
          Actividad reciente
        </h2>
        <Link href="/auditoria" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:text-brand-strong">
          Auditoría <ArrowRight size={12} />
        </Link>
      </div>
      <div className="rounded-card bg-surface p-1.5 shadow-card">
        {!grupos ? (
          <div className="flex flex-col gap-2.5 p-2.5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !grupos.length ? (
          <p className="px-3 py-5 text-center text-[13px] text-ink-3">Sin actividad reciente.</p>
        ) : (
          <ul className="flex flex-col">
            {grupos.map((grupo, i) => {
              const e = grupo.entradas[0];
              return (
                <li key={e.id} className="entrada-escalonada" style={{ ["--i" as string]: i }}>
                  <button type="button" onClick={() => setAbierta(i)} aria-haspopup="dialog" className="group flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
                    {!e.isSystem && e.actor ? <FiguraPersona nombre={e.actor} size="sm" /> : <EntryIcon entry={e} size="sm" />}
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug text-ink">{e.frase}</span>
                    <span className="tnum shrink-0 text-[11.5px] text-ink-4">{haceCuantoCorto(e.when)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {grupos ? <ActividadDialog grupos={grupos} indice={abierta} onIndice={setAbierta} onCerrar={() => setAbierta(null)} /> : null}
    </section>
  );
}
