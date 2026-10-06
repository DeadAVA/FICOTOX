"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { IncidenciaVentana, NcVentana } from "@/components/features/calidad/ventanas/CalidadVentanas";
import { ventanaDe } from "@/components/features/inicio/pendientes";
import { cn } from "@/components/ui/cn";
import { useGlobalSearch, type SearchHit } from "@/lib/client/search";
import { SearchHitRow } from "./SearchHit";

/*
 * Buscador del Inicio: el elemento principal de la página. Comparte motor con
 * la paleta ⌘K (mismos resultados). Al enfocarlo, un panel debajo ofrece
 * acciones frecuentes y lo reciente; al escribir, resultados agrupados por
 * sección. ↑/↓ mueven, Enter abre y Esc cierra.
 */

const HEADING = "[&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:justify-between [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-3";

export function HomeSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { query, setQuery, sections, loading, warm, remember, forgetRecent } = useGlobalSearch();
  const [focused, setFocused] = useState(false);
  // El panel de acciones y recientes se muestra solo cuando la persona interactúa, no por el enfoque automático.
  const [shown, setShown] = useState(false);
  const autoFocus = useRef(false);
  const [ventana, setVentana] = useState<{ tipo: "incidencia" | "nc"; id: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const typed = query.trim().length > 0;
  const open = focused && (typed || (shown && sections.length > 0));

  // En computadora se enfoca sola; en teléfono no, para no abrir el teclado.
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      autoFocus.current = true;
      input.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!focused) return;
    const onDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [focused]);

  const close = () => {
    setFocused(false);
    setShown(false);
  };

  const go = (hit: SearchHit) => {
    remember(hit);
    close();
    setQuery("");
    const v = ventanaDe(hit.href);
    if (v) setVentana(v);
    else router.push(hit.href);
  };

  const goTo = (href: string) => {
    close();
    setQuery("");
    router.push(href);
  };

  const itemClass = "group rounded-[10px] outline-none data-[selected=true]:bg-brand data-[selected=true]:text-on-accent";

  return (
    <div
      ref={root}
      className={cn("relative mx-auto w-full", className)}
      /* Si el foco sale del buscador (Shift+Tab, clic en otro control), el panel se cierra. */
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <Command label="Buscar" shouldFilter={false} loop className="w-full">
        <div className={cn("flex items-center gap-3.5 rounded-[22px] bg-surface pr-4 pl-6 shadow-raised ring-1 ring-line/60 transition-shadow duration-300 ease-[var(--ease-spring)]", focused && "shadow-[var(--shadow-panel)]")}>
          <MagnifyingGlass size={24} className={cn("shrink-0 transition-colors", focused ? "text-brand" : "text-ink-3")} />
          <Command.Input
            ref={input}
            value={query}
            onValueChange={setQuery}
            onFocus={() => {
              setFocused(true);
              if (autoFocus.current) autoFocus.current = false;
              else setShown(true);
              void warm();
            }}
            onClick={() => setShown(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") setShown(true);
              if (event.key === "Escape") {
                if (query) setQuery("");
                else {
                  close();
                  (event.target as HTMLInputElement).blur();
                }
              }
            }}
            placeholder="Busca un folio, un reactivo, un equipo, o escribe lo que quieres hacer"
            aria-label="Buscar en FICOTOX"
            className="h-[72px] min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-4 sm:text-[19px]"
          />
        </div>
        {/* mousedown sin preventDefault quitaría el foco al input (y el onBlur cerraría el panel antes del clic). */}
        <div onMouseDown={(event) => event.preventDefault()} className={cn("absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[20px] bg-surface/95 text-left shadow-panel ring-1 ring-line/60 backdrop-blur-2xl", open ? "animate-materialize" : "hidden")}>
          <Command.List className="scroll-thin max-h-[min(56vh,460px)] overflow-y-auto p-2 pb-3">
            {loading && typed ? <div className="px-3 py-2 text-[12.5px] text-ink-3">Preparando el índice…</div> : null}
            <Command.Empty className="px-3 py-9 text-center">
              <p className="text-[14px] text-ink-2">No encontré nada para “{query.trim()}”.</p>
              <p className="mt-1 text-[12.5px] text-ink-3">Busca por folio, ID interno, nombre o reactivo.</p>
            </Command.Empty>
            {sections.map((section) => (
              <Command.Group
                key={section.key}
                className={HEADING}
                heading={
                  <>
                    <span>{section.title}</span>
                    {section.key === "recientes" ? (
                      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={forgetRecent} className="rounded-[6px] px-1.5 py-0.5 text-[11.5px] font-normal text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink-2">
                        Borrar historial
                      </button>
                    ) : null}
                  </>
                }
              >
                {section.hits.map((hit) => (
                  <Command.Item key={`${section.key}-${hit.id}`} value={`${section.key}-${hit.id}`} onSelect={() => go(hit)} className={itemClass}>
                    <SearchHitRow hit={hit} selectedStyle query={typed ? query : undefined} />
                  </Command.Item>
                ))}
                {section.more ? (
                  <Command.Item value={`${section.key}-todos`} onSelect={() => goTo(section.more!)} className={itemClass}>
                    <span className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-brand group-data-[selected=true]:text-on-accent">
                      Ver todos ({section.total}) <ArrowRight size={13} />
                    </span>
                  </Command.Item>
                ) : null}
              </Command.Group>
            ))}
          </Command.List>
        </div>
      </Command>
      <IncidenciaVentana ids={ventana?.tipo === "incidencia" ? [ventana.id] : []} indice={ventana?.tipo === "incidencia" ? 0 : null} onIndice={() => undefined} onCerrar={() => setVentana(null)} />
      <NcVentana ids={ventana?.tipo === "nc" ? [ventana.id] : []} indice={ventana?.tipo === "nc" ? 0 : null} onIndice={() => undefined} onCerrar={() => setVentana(null)} />
    </div>
  );
}
