"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { cn } from "./cn";
import { Input } from "./Field";

export function PageHeader({ title, description, actions, eyebrow, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <div className="text-[13px] text-ink-3">{eyebrow}</div> : null}
        <h1 className="display text-[30px] text-ink md:text-[34px]">{title}</h1>
        {description ? <p className="max-w-2xl text-[14px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export interface TabItem {
  href: string;
  label: string;
  count?: number | null;
  exact?: boolean;
}

/* Pestañas enlazadas a rutas (la URL es la fuente de verdad). */
export function LinkTabs({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("scroll-thin -mb-px flex gap-1 overflow-x-auto border-b border-line", className)} aria-label="Secciones">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[13.5px] font-medium transition-colors",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? <span className={cn("tnum rounded-full px-1.5 py-0.5 text-[11px]", active ? "bg-brand-soft text-brand-strong" : "bg-surface-2 text-ink-3")}>{item.count}</span> : null}
            {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* Pestañas de estado local (sin ruta). */
export function SegmentedTabs<T extends string>({ value, onChange, options, className, size = "md" }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: ReactNode }>; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("inline-flex rounded-[8px] border border-line bg-surface-2 p-0.5", className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "press rounded-[6px] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
              active ? "bg-surface text-ink shadow-[0_1px_2px_rgba(11,31,42,0.08)]" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className, autoFocus }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <Input
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder || "Buscar"}
      leading={<MagnifyingGlass size={15} />}
      trailing={
        value ? (
          <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange("")} className="rounded-full p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X size={13} weight="bold" />
          </button>
        ) : null
      }
      className={cn("[&::-webkit-search-cancel-button]:hidden", className)}
    />
  );
}

export function Toolbar({ children, className, end }: { children?: ReactNode; className?: string; end?: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {end ? <div className="flex flex-wrap items-center gap-2">{end}</div> : null}
    </div>
  );
}
