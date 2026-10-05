"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

/*
 * Tarjeta de sección del Inicio: todas comparten radio, anillo, fondo,
 * sombra y padding (20 px a los lados, 16 arriba del encabezado y 20 abajo),
 * y el mismo encabezado (icono de 18 px en acento, título de 15 px y, a la
 * derecha, su enlace). El cuerpo crece (flex-1) para que las tarjetas de una
 * misma fila midan lo mismo; `minimo` reserva la altura del contenido para
 * que el estado vacío o el esqueleto no hagan saltar el diseño.
 */
export function TarjetaInicio({ id, titulo, icono, enlace, i = 0, minimo, className, children }: { id: string; titulo: string; icono: ReactNode; enlace?: { href: string; texto: string } | null; i?: number; minimo?: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("entrada-escalonada flex min-w-0 flex-col rounded-card bg-surface shadow-card ring-1 ring-line", className)} style={{ ["--i" as string]: i }}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 id={id} className="flex items-center gap-2 text-[15px] leading-tight font-semibold text-ink">
          <span aria-hidden="true" className="flex text-brand [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {icono}
          </span>
          {titulo}
        </h2>
        {enlace ? (
          <Link href={enlace.href} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
            {enlace.texto} <ArrowRight size={13} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className={cn("flex min-h-0 flex-1 flex-col px-5 pb-5", minimo)}>{children}</div>
    </section>
  );
}

/* Escala de espaciado del Inicio (docs/DISENO_UI.md): bloques 32 px, columnas y tarjetas 24 px, dentro de una tarjeta 12 px. */
export const ESPACIO_INICIO = { bloques: "gap-8", columnas: "gap-6", interior: "gap-3" } as const;
