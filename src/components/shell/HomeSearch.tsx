"use client";

import { useRouter } from "next/navigation";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Command } from "cmdk";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/Primitives";
import { useGlobalSearch, type SearchHit } from "@/lib/client/search";
import { SearchFooter, SearchHitRow, SearchScopes } from "./SearchHit";

/*
 * Buscador del Inicio: es lo primero que ve la persona al entrar. Escribe un
 * folio, un reactivo, un equipo, lo que quiere crear o a donde quiere ir, y
 * la lleva ahi. Comparte motor con la paleta ⌘K. Al enfocar (sin escribir)
 * ofrece lo reciente, lo que se puede crear y a donde ir.
 */

export interface HomeSearchHandle {
  /* Escribe una consulta y abre los resultados (los ejemplos de la portada). */
  ask: (query: string) => void;
}

export function HomeSearch({ className, handle }: { className?: string; handle?: Ref<HomeSearchHandle> }) {
  const router = useRouter();
  const { query, setQuery, scope, setScope, groups, loading, warm, remember, forgetRecent, hasRecent } = useGlobalSearch();
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const open = focused && (query.trim().length > 0 || groups.length > 0);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

  useImperativeHandle(handle, () => ({
    ask: (value: string) => {
      setQuery(value);
      setScope("todo");
      input.current?.focus();
      void warm();
    },
  }));

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
    setScope("todo");
  };

  const go = (hit: SearchHit) => {
    remember(hit);
    close();
    setQuery("");
    router.push(hit.href);
  };

  return (
    <div
      ref={root}
      className={cn("relative w-full", className)}
      /* Si el foco sale del buscador (Shift+Tab, clic en otro control), los resultados se cierran. */
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) close();
      }}
    >
      <Command label="Buscar" shouldFilter={false} loop className="w-full">
        <div className={cn("flex items-center gap-3 rounded-[20px] bg-surface pr-3 pl-5 shadow-raised transition-[box-shadow,transform] duration-300 ease-[var(--ease-spring)]", focused && "shadow-[var(--shadow-panel),var(--shadow-focus)]")}>
          <MagnifyingGlass size={22} className={cn("shrink-0 transition-colors", focused ? "text-brand" : "text-ink-3")} />
          <Command.Input
            ref={input}
            value={query}
            onValueChange={setQuery}
            onFocus={() => {
              setFocused(true);
              void warm();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (query) {
                  setQuery("");
                  return;
                }
                close();
                (event.target as HTMLInputElement).blur();
              }
              /* Tab rota el ámbito solo mientras se está escribiendo; sin texto, y siempre con Shift, el foco sigue su camino. */
              if (event.key === "Tab" && open && query.trim() && !event.shiftKey) {
                event.preventDefault();
                const order = ["todo", "muestras", "informes", "inventario", "acciones"] as const;
                const index = order.indexOf(scope);
                setScope(order[(index + 1) % order.length]);
              }
            }}
            placeholder="Busca un folio, un reactivo, un equipo, o escribe lo que quieres hacer"
            aria-label="Buscar en FICOTOX"
            className="h-[62px] flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-4 sm:text-[18px]"
          />
          <span className="hidden items-center gap-0.5 sm:flex">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </div>
        {/* mousedown sin preventDefault quitaría el foco al input (y el onBlur cerraría la lista antes del clic). */}
        <div onMouseDown={(event) => event.preventDefault()} className={cn("absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[20px] bg-white/95 text-left shadow-panel backdrop-blur-2xl", open ? "animate-materialize" : "hidden")}>
          <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-1.5">
            <SearchScopes value={scope} onChange={setScope} />
            <span className="hidden text-[11.5px] text-ink-4 sm:inline">
              <Kbd>Tab</Kbd> cambia el ámbito · <Kbd>Shift</Kbd> <Kbd>Tab</Kbd> sale
            </span>
          </div>
          <Command.List className="scroll-thin max-h-[48vh] overflow-y-auto border-t border-line/70 p-2">
            {loading && query.trim() ? <div className="px-3 py-2 text-[12.5px] text-ink-3">Preparando el índice…</div> : null}
            <Command.Empty className="px-3 py-8 text-center text-[13.5px] text-ink-3">
              Sin resultados para “{query}”{scope !== "todo" ? " en este ámbito" : ""}.
            </Command.Empty>
            {groups.map((group) => (
              <Command.Group key={group.kind} heading={group.title} className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-3">
                {group.hits.map((hit) => (
                  <Command.Item key={`${group.kind}-${hit.id}`} value={`${group.kind}-${hit.id}`} onSelect={() => go(hit)} className="group rounded-[10px] outline-none data-[selected=true]:bg-brand data-[selected=true]:text-white">
                    <SearchHitRow hit={hit} selectedStyle />
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <SearchFooter className="border-t border-line/70" onClearRecent={hasRecent && !query.trim() ? forgetRecent : undefined} />
        </div>
      </Command>
    </div>
  );
}
