"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, Cube, FileText, Flask, Package, TestTube, Truck, Wrench } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { HoverCard } from "@/components/ui/Overlay";
import { fmt } from "@/lib/client/format";

/*
 * Avisos del Inicio: una fila por aviso, solo nombre y cuenta; al pasar el
 * cursor se ve qué elementos son (los primeros seis) con enlace directo a
 * cada uno, y al hacer clic se abre la lista ya filtrada con la misma cuenta.
 */

export interface AvisoItem {
  label: string;
  sub: string | null;
  href: string;
}

export interface Aviso {
  key: string;
  label: string;
  tone: "danger" | "warning" | "info";
  count: number;
  href: string;
  items: AvisoItem[];
}

const ICONS: Record<string, ReactNode> = {
  mant_vencidos: <Wrench size={17} />,
  mant_proximos: <CalendarCheck size={17} />,
  equipos_cal: <Cube size={17} />,
  reactivos_bajos: <Flask size={17} />,
  consumibles_bajos: <Package size={17} />,
  analisis_pendientes: <TestTube size={17} />,
  informes_revision: <FileText size={17} />,
  informes_entrega: <Truck size={17} />,
};

const TONE = {
  danger: { icon: "bg-danger-soft text-danger", count: "text-danger", dot: "bg-danger" },
  warning: { icon: "bg-warning-soft text-warning-text", count: "text-ink", dot: "bg-warning" },
  info: { icon: "bg-brand-soft text-brand-strong", count: "text-ink", dot: "bg-brand" },
};

function AvisoDetail({ aviso }: { aviso: Aviso }) {
  const rest = aviso.count - aviso.items.length;
  return (
    <div className="flex flex-col">
      <p className="px-3 pt-2.5 pb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">{aviso.label}</p>
      <ul className="flex flex-col">
        {aviso.items.map((item, index) => (
          <li key={`${item.href}-${index}`}>
            <Link href={item.href} className="press flex items-center gap-3 rounded-[10px] px-3 py-2 hover:bg-brand-faint">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE[aviso.tone].dot)} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-[13px] font-medium text-ink">{item.label}</span>
                {item.sub ? <span className="truncate text-[12px] text-ink-3">{item.sub}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={aviso.href} className="press m-1 mt-1.5 inline-flex h-8 items-center justify-center gap-1 rounded-[10px] bg-surface-3/80 text-[12.5px] font-medium text-ink hover:bg-surface-3">
        {rest > 0 ? `Ver los ${fmt(aviso.count)}` : "Abrir la lista"} <ArrowRight size={12} weight="bold" />
      </Link>
    </div>
  );
}

export function AvisoRow({ aviso }: { aviso: Aviso }) {
  const tone = TONE[aviso.tone];
  return (
    <li>
      <HoverCard content={<AvisoDetail aviso={aviso} />} side="left" align="start" width={340}>
        <Link href={aviso.href} className="press group/aviso flex items-center gap-3 px-5 py-3 outline-none transition-colors hover:bg-brand-faint/70 focus-visible:bg-brand-faint/70">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-transform duration-300 ease-[var(--ease-spring)] group-hover/aviso:scale-105", tone.icon)}>{ICONS[aviso.key] || <Wrench size={17} />}</span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{aviso.label}</span>
          <span className={cn("tnum text-[15px] font-semibold", tone.count)}>{fmt(aviso.count)}</span>
          <ArrowRight size={14} className="text-ink-4 transition-transform duration-300 ease-[var(--ease-spring)] group-hover/aviso:translate-x-0.5" />
        </Link>
      </HoverCard>
    </li>
  );
}
