"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { Dialog as RadixDialog } from "radix-ui";
import { ArrowsLeftRight, Cube, FileText, Flask, House, MagnifyingGlass, Package, Plus, ShieldCheck, TestTube, Users, Wrench } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Kbd } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { formatReactivoName } from "@/lib/client/reactivos";
import { formatExtractionFolio, formatProcessingFolio, formatSampleFolio } from "@/lib/client/samples";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Paleta de comandos: navegar, crear registros y buscar reactivos,
 * consumibles y muestras sin salir del teclado.
 */

interface SearchIndex {
  reactivos: ApiRecord[];
  consumibles: ApiRecord[];
  recepciones: ApiRecord[];
  procesamientos: ApiRecord[];
  extracciones: ApiRecord[];
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { token, can } = useSession();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery("");
    onOpenChange(next);
  };

  useEffect(() => {
    if (!open || index || !token) return;
    let cancelled = false;
    const safe = async (url: string, allowed: boolean): Promise<ApiRecord[]> => {
      if (!allowed) return [];
      try {
        const data = await getJsonAuth(url, token);
        return Array.isArray(data.items) ? (data.items as ApiRecord[]) : [];
      } catch {
        return [];
      }
    };
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      const [reactivos, consumibles, recepciones, procesamientos, extracciones] = await Promise.all([
        safe(`${API_BASE_URL}/inventory/reactivos`, can("reactivos")),
        safe(`${API_BASE_URL}/consumables`, can("consumibles")),
        safe(`${API_BASE_URL}/samples/reception`, can("muestras")),
        safe(`${API_BASE_URL}/samples/processing`, can("muestras")),
        safe(`${API_BASE_URL}/samples/extraction`, can("muestras")),
      ]);
      if (!cancelled) {
        setIndex({ reactivos, consumibles, recepciones, procesamientos, extracciones });
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, index, token, can]);

  // Reindexar al reabrir tras un rato: se descarta el indice al cerrar.
  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setIndex(null), 60_000);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const navItems = useMemo(
    () =>
      [
        { label: "Inicio", href: "/", icon: <House size={16} />, allowed: can("dashboard") },
        { label: "Muestras", href: "/muestras/recepcion", icon: <TestTube size={16} />, allowed: can("muestras") },
        { label: "Reactivos", href: "/inventario/reactivos", icon: <Flask size={16} />, allowed: can("reactivos") },
        { label: "Consumibles", href: "/inventario/consumibles", icon: <Package size={16} />, allowed: can("consumibles") },
        { label: "Equipos", href: "/inventario/equipos", icon: <Cube size={16} />, allowed: can("equipos") },
        { label: "Mantenimiento", href: "/inventario/mantenimiento", icon: <Wrench size={16} />, allowed: can("mantenimiento") },
        { label: "Movimientos", href: "/movimientos", icon: <ArrowsLeftRight size={16} />, allowed: can("movimientos") },
        { label: "Documentos", href: "/documentos", icon: <FileText size={16} />, allowed: can("documentos") },
        { label: "Usuarios", href: "/administracion/usuarios", icon: <Users size={16} />, allowed: can("usuarios") },
        { label: "Roles", href: "/administracion/roles", icon: <ShieldCheck size={16} />, allowed: can("roles") },
      ].filter((item) => item.allowed),
    [can],
  );

  const actions = useMemo(
    () =>
      [
        { label: "Nueva recepción de muestra", href: "/muestras/recepcion/nueva", allowed: can("muestras", "create") },
        { label: "Nuevo procesamiento", href: "/muestras/procesamiento/nuevo", allowed: can("muestras", "create") },
        { label: "Nueva extracción", href: "/muestras/extraccion/nueva", allowed: can("muestras", "create") },
        { label: "Nuevo reactivo", href: "/inventario/reactivos?nuevo=1", allowed: can("reactivos", "create") },
        { label: "Nuevo consumible", href: "/inventario/consumibles?nuevo=1", allowed: can("consumibles", "create") },
        { label: "Nuevo equipo", href: "/inventario/equipos?nuevo=1", allowed: can("equipos", "create") },
        { label: "Nuevo mantenimiento", href: "/inventario/mantenimiento?nuevo=1", allowed: can("mantenimiento", "create") },
      ].filter((item) => item.allowed),
    [can],
  );

  const q = query.trim().toLowerCase();
  const matches = (values: unknown[]) => values.some((value) => String(value || "").toLowerCase().includes(q));
  const limit = 6;
  const reactivoHits = q && index ? index.reactivos.filter((r) => matches([formatReactivoName(r), r.id_interno, r.lote, r.numero_cas, r.cas_number, r.catalogo])).slice(0, limit) : [];
  const consumibleHits = q && index ? index.consumibles.filter((c) => matches([c.producto, c.marca, c.catalogo_parte_cas])).slice(0, limit) : [];
  const sampleHits = q && index
    ? [
        ...index.recepciones.map((s) => ({ kind: "R", label: formatSampleFolio(s), sub: s.solicitante || s.id_interno, href: `/muestras/recepcion/${s.id}`, hay: [formatSampleFolio(s), s.solicitante, s.id_interno] })),
        ...index.procesamientos.map((s) => ({ kind: "P", label: formatProcessingFolio(s), sub: s.id_interno, href: `/muestras/procesamiento/${s.id}`, hay: [formatProcessingFolio(s), s.id_interno] })),
        ...index.extracciones.map((s) => ({ kind: "E", label: formatExtractionFolio(s), sub: s.id_interno, href: `/muestras/extraccion/${s.id}`, hay: [formatExtractionFolio(s), s.id_interno] })),
      ]
        .filter((s) => matches(s.hay))
        .slice(0, limit)
    : [];

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-deep/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <RadixDialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-24px)] max-w-[620px] -translate-x-1/2 overflow-hidden rounded-panel border border-line bg-surface shadow-panel outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out">
          <RadixDialog.Title className="sr-only">Paleta de comandos</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">Busca o navega a cualquier sección</RadixDialog.Description>
          <Command label="Paleta de comandos" shouldFilter={false} className="flex max-h-[60vh] flex-col">
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <MagnifyingGlass size={17} className="text-ink-3" />
              <Command.Input value={query} onValueChange={setQuery} placeholder="Buscar reactivos, muestras o ir a una sección…" className="h-12 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-4" />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="scroll-thin overflow-y-auto p-2">
              {loading && q ? <div className="px-3 py-2 text-[12.5px] text-ink-3">Indexando…</div> : null}
              <Command.Empty className="px-3 py-8 text-center text-[13px] text-ink-3">Sin resultados para “{query}”.</Command.Empty>

              {sampleHits.length ? (
                <Command.Group heading="Muestras" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3">
                  {sampleHits.map((s) => (
                    <Item key={s.href} onSelect={() => go(s.href)} icon={<TestTube size={16} />} label={s.label} sub={String(s.sub || "")} mono />
                  ))}
                </Command.Group>
              ) : null}

              {reactivoHits.length ? (
                <Command.Group heading="Reactivos" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3">
                  {reactivoHits.map((r) => (
                    <Item key={`r-${r.id}`} onSelect={() => go(`/inventario/reactivos?buscar=${encodeURIComponent(formatReactivoName(r))}`)} icon={<Flask size={16} />} label={formatReactivoName(r)} sub={[r.id_interno, r.lote ? `Lote ${r.lote}` : null].filter(Boolean).join(" · ")} />
                  ))}
                </Command.Group>
              ) : null}

              {consumibleHits.length ? (
                <Command.Group heading="Consumibles" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3">
                  {consumibleHits.map((c) => (
                    <Item key={`c-${c.id}`} onSelect={() => go(`/inventario/consumibles?buscar=${encodeURIComponent(String(c.producto || ""))}`)} icon={<Package size={16} />} label={String(c.producto || "")} sub={[c.marca, c.catalogo_parte_cas].filter(Boolean).join(" · ")} />
                  ))}
                </Command.Group>
              ) : null}

              {(!q || actions.some((a) => a.label.toLowerCase().includes(q))) && actions.length ? (
                <Command.Group heading="Crear" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3">
                  {actions
                    .filter((a) => !q || a.label.toLowerCase().includes(q))
                    .map((a) => (
                      <Item key={a.href} onSelect={() => go(a.href)} icon={<Plus size={16} />} label={a.label} />
                    ))}
                </Command.Group>
              ) : null}

              {(!q || navItems.some((n) => n.label.toLowerCase().includes(q))) ? (
                <Command.Group heading="Ir a" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3">
                  {navItems
                    .filter((n) => !q || n.label.toLowerCase().includes(q))
                    .map((n) => (
                      <Item key={n.href} onSelect={() => go(n.href)} icon={n.icon} label={n.label} />
                    ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function Item({ onSelect, icon, label, sub, mono }: { onSelect: () => void; icon: React.ReactNode; label: string; sub?: string; mono?: boolean }) {
  return (
    <Command.Item
      value={`${label} ${sub || ""}`}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2.5 py-2 text-[13.5px] text-ink outline-none data-[selected=true]:bg-brand-faint"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-surface-2 text-ink-2">{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className={mono ? "code font-medium" : "truncate font-medium"}>{label}</span>
        {sub ? <span className="truncate text-[12px] text-ink-3">{sub}</span> : null}
      </span>
    </Command.Item>
  );
}
