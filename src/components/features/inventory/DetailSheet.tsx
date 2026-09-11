"use client";

import type { ReactNode } from "react";
import { Sheet } from "@/components/ui/Overlay";
import { cn } from "@/components/ui/cn";

/*
 * Ficha de detalle de un elemento de inventario: se abre al hacer clic en
 * una fila. Muestra los datos en grupos "etiqueta · valor" (como una lista
 * de ajustes) y las acciones grandes al pie, sin depender de iconitos.
 */

export interface DetailGroup {
  title?: string;
  rows: Array<{ label: string; value: ReactNode; mono?: boolean }>;
}

export function DetailSheet({ open, onOpenChange, title, subtitle, badges, groups, actions, hero }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; subtitle?: ReactNode; badges?: ReactNode; groups: DetailGroup[]; actions?: ReactNode; hero?: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={subtitle} footer={actions} headerExtra={badges}>
      <div className="flex flex-col gap-5">
        {hero}
        {groups.map((group, index) => {
          const rows = group.rows.filter((row) => row.value !== null && row.value !== undefined && row.value !== "" && row.value !== "-");
          if (!rows.length) return null;
          return (
            <section key={index} className="flex flex-col gap-1.5">
              {group.title ? <h3 className="eyebrow px-1 text-ink-3">{group.title}</h3> : null}
              <dl className="inset-group rounded-[12px] bg-surface-2 px-4 ring-1 ring-line">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-2.5 text-[13.5px]">
                    <dt className="shrink-0 text-ink-3">{row.label}</dt>
                    <dd className={cn("m-0 min-w-0 text-right text-ink", row.mono && "code")}>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}
