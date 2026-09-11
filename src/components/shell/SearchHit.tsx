"use client";

import type { ReactNode } from "react";
import { ArrowRight, ClockCounterClockwise, Cube, FileText, Flask, Funnel, Package, Plus, Question, TestTube, Wrench } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/Primitives";
import { SEARCH_SCOPES, type SearchHit, type SearchKind, type SearchScope } from "@/lib/client/search";

/* Fila de resultado compartida por la paleta ⌘K y el buscador del Inicio. */

const KIND_ICON: Record<SearchKind, ReactNode> = {
  reciente: <ClockCounterClockwise size={17} />,
  muestra: <TestTube size={17} />,
  analisis: <TestTube size={17} weight="fill" />,
  informe: <FileText size={17} weight="fill" />,
  reactivo: <Flask size={17} />,
  consumible: <Package size={17} />,
  equipo: <Cube size={17} />,
  mantenimiento: <Wrench size={17} />,
  documento: <FileText size={17} />,
  accion: <Plus size={17} weight="bold" />,
  vista: <Funnel size={17} />,
  destino: <ArrowRight size={17} />,
  ayuda: <Question size={17} />,
};

const ICON_TONE: Partial<Record<SearchKind, string>> = {
  accion: "bg-brand-soft text-brand-strong",
  ayuda: "bg-bloom-soft text-bloom",
};

export function SearchHitRow({ hit, selectedStyle = false, className }: { hit: SearchHit; selectedStyle?: boolean; className?: string }) {
  return (
    <div className={cn("flex cursor-pointer items-center gap-3 px-2.5 py-2 text-[14px]", className)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-3 text-ink-2 transition-colors", ICON_TONE[hit.kind], selectedStyle && "group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white")}>{KIND_ICON[hit.kind]}</span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className={cn("truncate font-medium", hit.mono && "code")}>{hit.label}</span>
        {hit.sub ? <span className={cn("truncate text-[12.5px] text-ink-3", selectedStyle && "group-data-[selected=true]:text-white/80")}>{hit.sub}</span> : null}
      </span>
      {hit.tag && (hit.kind === "muestra" || hit.kind === "reciente") ? <span className={cn("hidden shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-3 sm:inline", selectedStyle && "group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white")}>{hit.tag}</span> : null}
      <span className={cn("hidden shrink-0 text-[11px] text-ink-4 opacity-0 transition-opacity sm:inline", selectedStyle && "group-data-[selected=true]:text-white/80 group-data-[selected=true]:opacity-100")} aria-hidden="true">
        ↵
      </span>
    </div>
  );
}

/* Chips de ámbito (Todo · Muestras · Informes · Inventario · Acciones). */
export function SearchScopes({ value, onChange, className }: { value: SearchScope; onChange: (scope: SearchScope) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Acotar la búsqueda" className={cn("flex flex-wrap items-center gap-1", className)}>
      {SEARCH_SCOPES.map((scope) => {
        const active = scope.value === value;
        return (
          <button
            key={scope.value}
            type="button"
            role="radio"
            aria-checked={active}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onChange(scope.value)}
            className={cn("press h-7 rounded-full px-2.5 text-[12px] font-medium transition-colors", active ? "bg-ink text-white" : "bg-surface-3/80 text-ink-2 hover:bg-surface-3 hover:text-ink")}
          >
            {scope.label}
          </button>
        );
      })}
    </div>
  );
}

/* Pie con las teclas: se lee una vez y se olvida, por eso va discreto. */
export function SearchFooter({ onClearRecent, className }: { onClearRecent?: () => void; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2 text-[11.5px] text-ink-4", className)}>
      <span className="inline-flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> moverse
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>↵</Kbd> abrir
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>Esc</Kbd> cerrar
      </span>
      {onClearRecent ? (
        <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={onClearRecent} className="ml-auto rounded-[6px] px-1.5 py-0.5 text-ink-4 hover:bg-surface-3 hover:text-ink-2">
          Borrar recientes
        </button>
      ) : null}
    </div>
  );
}
