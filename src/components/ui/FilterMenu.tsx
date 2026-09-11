"use client";

import type { ReactNode } from "react";
import { Popover as RadixPopover } from "radix-ui";
import { Check, SlidersHorizontal } from "@phosphor-icons/react";
import { cn } from "./cn";
import { Switch } from "./Field";

/*
 * Menu de filtros compacto: un boton "Filtros" con el numero de filtros
 * activos y un panel con grupos de opciones (una sola por grupo) y
 * conmutadores. Las opciones `disabled` se muestran en gris con su nota
 * ("Proximamente"): existen en el plan pero aun no se pueden usar.
 */

export interface FilterOption<T extends string = string> {
  value: T;
  label: ReactNode;
  count?: number | null;
  disabled?: boolean;
  hint?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}

export interface FilterGroup<T extends string = string> {
  key: string;
  label: string;
  value: T;
  /* Valor que cuenta como "sin filtro" (normalmente el primero). */
  defaultValue: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}

export interface FilterToggle {
  key: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function FilterMenu({ groups = [], toggles = [], children, className, label = "Filtros" }: { groups?: FilterGroup[]; toggles?: FilterToggle[]; children?: ReactNode; className?: string; label?: string }) {
  const active = groups.filter((g) => g.value !== g.defaultValue).length + toggles.filter((t) => t.checked).length;
  const reset = () => {
    groups.forEach((g) => g.onChange(g.defaultValue));
    toggles.forEach((t) => t.onChange(false));
  };
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button type="button" className={cn("press inline-flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink-2 shadow-card hover:text-ink data-[state=open]:bg-surface-3 data-[state=open]:text-ink", active > 0 && "text-ink", className)} aria-label={active ? `${label} (${active} activos)` : label}>
          <SlidersHorizontal size={16} />
          {label}
          {active > 0 ? <span className="tnum flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{active}</span> : null}
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content align="start" sideOffset={8} className="material scroll-thin z-50 max-h-[min(72vh,640px)] w-[300px] origin-[var(--radix-popover-content-transform-origin)] overflow-y-auto rounded-[16px] p-2 shadow-pop outline-none data-[state=open]:animate-materialize">
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.key} role="radiogroup" aria-label={group.label}>
                <p className="eyebrow px-2 pt-1 pb-1.5 text-ink-3">{group.label}</p>
                <ul className="flex flex-col">
                  {group.options.map((option) => {
                    const selected = option.value === group.value;
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={option.disabled}
                          onClick={() => group.onChange(option.value)}
                          className={cn("press flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2 text-left text-[13.5px]", option.disabled ? "cursor-not-allowed text-ink-4" : selected ? "bg-brand-faint text-ink" : "text-ink-2 hover:bg-surface-3/80 hover:text-ink")}
                        >
                          <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full", selected ? "bg-brand text-white" : "border border-line-strong", option.disabled && "border-line")}>{selected ? <Check size={10} weight="bold" /> : null}</span>
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                          {option.hint ? <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-4">{option.hint}</span> : null}
                          {typeof option.count === "number" ? <span className={cn("tnum text-[12px]", option.tone === "danger" ? "text-danger" : option.tone === "warning" ? "text-warning-text" : "text-ink-3")}>{option.count}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {toggles.length ? (
              <div className={cn("flex flex-col gap-1 px-2", groups.length && "border-t border-line pt-3")}>
                {toggles.map((toggle) => (
                  <Switch key={toggle.key} label={toggle.label} description={toggle.description} checked={toggle.checked} onCheckedChange={toggle.onChange} />
                ))}
              </div>
            ) : null}
            {children ? <div className={cn("flex flex-col gap-3 px-2", (groups.length || toggles.length) && "border-t border-line pt-3")}>{children}</div> : null}
            {active > 0 ? (
              <div className="border-t border-line px-2 pt-2">
                <button type="button" onClick={reset} className="press h-8 rounded-[8px] px-2 text-[13px] font-medium text-brand hover:bg-brand-faint">
                  Quitar filtros
                </button>
              </div>
            ) : null}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

/* Resumen de filtros activos para mostrar junto al boton (chips). */
export function FilterChips({ groups = [], toggles = [] }: { groups?: FilterGroup[]; toggles?: FilterToggle[] }) {
  const chips: Array<{ key: string; label: ReactNode; clear: () => void }> = [];
  for (const g of groups) {
    if (g.value !== g.defaultValue) {
      const option = g.options.find((o) => o.value === g.value);
      chips.push({ key: g.key, label: option?.label || g.value, clear: () => g.onChange(g.defaultValue) });
    }
  }
  for (const t of toggles) if (t.checked) chips.push({ key: t.key, label: t.label, clear: () => t.onChange(false) });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button key={chip.key} type="button" onClick={chip.clear} className="press inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft pr-2 pl-2.5 text-[12.5px] font-medium text-brand-strong hover:bg-brand-soft/70" aria-label={`Quitar filtro ${String(chip.label)}`}>
          {chip.label}
          <span aria-hidden="true" className="text-brand">×</span>
        </button>
      ))}
    </div>
  );
}
