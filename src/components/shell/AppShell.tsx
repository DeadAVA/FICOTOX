"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Command, List, ShieldCheck, SignOut, Users, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/components/ui/cn";
import { Dropdown } from "@/components/ui/Overlay";
import { Avatar, Kbd } from "@/components/ui/Primitives";
import { ADMIN_NAV, PRIMARY_NAV, canAny, isActivePath } from "@/lib/client/nav";
import { BrandLockup } from "./Brand";
import { CommandPalette } from "./CommandPalette";

/*
 * Shell de la aplicacion: barra superior translucida con la navegacion
 * principal, acceso a la paleta de comandos (⌘K) y menu de usuario.
 * En movil la navegacion vive en un panel desplegable.
 */

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, permissions, logout } = useSession();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = PRIMARY_NAV.filter((item) => canAny(permissions, item.modules));
  const visibleAdmin = ADMIN_NAV.filter((item) => canAny(permissions, item.modules));
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop">
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
          <button type="button" className="press -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 lg:hidden" aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X size={20} /> : <List size={20} />}
          </button>

          <Link href="/" className="rounded-control focus-visible:shadow-[var(--shadow-focus)]">
            <BrandLockup />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Principal">
            {visibleNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press relative flex h-9 items-center rounded-[8px] px-3 text-[13.5px] font-medium transition-colors",
                    active ? "bg-surface text-ink shadow-[0_1px_2px_rgba(11,31,42,0.08),inset_0_0_0_1px_var(--color-line)]" : "text-ink-2 hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="press hidden h-9 items-center gap-2 rounded-[8px] border border-line bg-surface/80 pr-1.5 pl-3 text-[13px] text-ink-3 hover:border-line-strong hover:text-ink-2 md:flex"
              aria-label="Abrir paleta de comandos"
            >
              <Command size={15} />
              <span className="pr-4">Buscar o ir a…</span>
              <span className="flex items-center gap-0.5">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <button type="button" onClick={() => setPaletteOpen(true)} className="press inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 md:hidden" aria-label="Buscar">
              <Command size={20} />
            </button>

            <Dropdown
              label="Menú de usuario"
              trigger={
                <button type="button" className="press flex h-9 items-center gap-2 rounded-full pr-2.5 pl-1 hover:bg-surface-2" aria-label="Menú de usuario">
                  <Avatar name={user?.nombre} email={user?.email} size="sm" />
                  <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-ink sm:block">{user?.nombre || user?.email}</span>
                </button>
              }
              items={[
                ...visibleAdmin.map((item) => ({
                  label: item.label,
                  icon: item.href.includes("roles") ? <ShieldCheck size={16} /> : <Users size={16} />,
                  onSelect: () => {
                    window.location.assign(item.href);
                  },
                })),
                { label: "Cerrar sesión", icon: <SignOut size={16} />, onSelect: logout, tone: "danger", separatorBefore: visibleAdmin.length > 0 },
              ]}
            />
          </div>
        </div>

        {mobileOpen ? (
          <nav className="animate-fade-in border-t border-line bg-surface px-3 py-3 lg:hidden" aria-label="Principal">
            <ul className="flex flex-col gap-0.5">
              {[...visibleNav, ...visibleAdmin].map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col rounded-[8px] px-3 py-2.5", active ? "bg-brand-faint text-ink" : "text-ink-2 hover:bg-surface-2")}>
                      <span className="text-[14px] font-medium">{item.label}</span>
                      <span className="text-[12px] text-ink-3">{item.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="contenido" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

/* Contenedor de secciones con animacion de entrada discreta. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-rise-in flex flex-col gap-6", className)}>{children}</div>;
}
