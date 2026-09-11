"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Command } from "cmdk";
import { Dialog as RadixDialog } from "radix-ui";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Kbd } from "@/components/ui/Primitives";
import { useGlobalSearch, type SearchHit } from "@/lib/client/search";
import { SearchFooter, SearchHitRow, SearchScopes } from "./SearchHit";

/*
 * Paleta de comandos (⌘K): la misma busqueda del Inicio, en una ventana
 * flotante tipo Spotlight. Navegar, crear registros y encontrar muestras,
 * inventario o documentos sin salir del teclado. Tab cambia el ámbito.
 */

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { query, setQuery, scope, setScope, groups, loading, warm, remember, forgetRecent, hasRecent } = useGlobalSearch();

  useEffect(() => {
    if (open) void warm();
  }, [open, warm]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
      setScope("todo");
    }
    onOpenChange(next);
  };

  const go = (hit: SearchHit) => {
    remember(hit);
    handleOpenChange(false);
    router.push(hit.href);
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-deep/25 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <RadixDialog.Content className="material fixed top-[12vh] left-1/2 z-50 w-[calc(100%-24px)] max-w-[660px] -translate-x-1/2 overflow-hidden rounded-[20px] shadow-panel outline-none data-[state=open]:animate-materialize data-[state=closed]:animate-dematerialize">
          <RadixDialog.Title className="sr-only">Buscar</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Busca registros, crea uno nuevo o ve a una sección</RadixDialog.Description>
          <Command label="Buscar" shouldFilter={false} loop className="flex max-h-[66vh] flex-col">
            <div className="flex items-center gap-3 px-5">
              <MagnifyingGlass size={22} className="shrink-0 text-ink-3" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                onKeyDown={(event) => {
                  if (event.key === "Tab") {
                    event.preventDefault();
                    const order = ["todo", "muestras", "informes", "inventario", "acciones"] as const;
                    const index = order.indexOf(scope);
                    setScope(order[(index + (event.shiftKey ? order.length - 1 : 1)) % order.length]);
                  }
                }}
                placeholder="Folio, reactivo, equipo, «nueva recepción», «informes por revisar»…"
                className="h-[58px] flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-ink-4"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line/70 px-3 py-2">
              <SearchScopes value={scope} onChange={setScope} />
              <span className="hidden text-[11.5px] text-ink-4 sm:inline">
                <Kbd>Tab</Kbd> cambia el ámbito
              </span>
            </div>
            <Command.List className="scroll-thin overflow-y-auto border-t border-line/70 p-2">
              {loading && query.trim() ? <div className="px-3 py-2 text-[12.5px] text-ink-3">Preparando el índice…</div> : null}
              <Command.Empty className="px-3 py-10 text-center text-[13.5px] text-ink-3">
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
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
