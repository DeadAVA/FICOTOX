"use client";

import type { ReactNode } from "react";
import { ChatCircleText, Desktop, Flask, ListChecks, Package, SealWarning, ShieldWarning, TestTube, Thermometer, WarningDiamond, Wrench } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";

/* Iconos de calidad: uno por tipo de incidencia, uno para las NC y otro para las acciones correctivas. */
const POR_TIPO: Record<string, { icono: (s: number) => ReactNode; tono: string }> = {
  desviacion_metodo: { icono: (s) => <Flask size={s} weight="duotone" />, tono: "bg-warning-soft text-warning-text" },
  falla_equipo: { icono: (s) => <Wrench size={s} weight="duotone" />, tono: "bg-danger-soft text-danger" },
  condicion_ambiental: { icono: (s) => <Thermometer size={s} weight="duotone" />, tono: "bg-warning-soft text-warning-text" },
  muestra_custodia: { icono: (s) => <TestTube size={s} weight="duotone" />, tono: "bg-brand-soft text-brand-strong" },
  insumo: { icono: (s) => <Package size={s} weight="duotone" />, tono: "bg-brand-soft text-brand-strong" },
  seguridad: { icono: (s) => <ShieldWarning size={s} weight="duotone" />, tono: "bg-danger-soft text-danger" },
  sistema: { icono: (s) => <Desktop size={s} weight="duotone" />, tono: "bg-surface-3 text-ink-2" },
  queja_cliente: { icono: (s) => <ChatCircleText size={s} weight="duotone" />, tono: "bg-warning-soft text-warning-text" },
  otro: { icono: (s) => <WarningDiamond size={s} weight="duotone" />, tono: "bg-surface-3 text-ink-2" },
};

export function IconoCalidad({ tipo, clase = "incidencia", grande = false }: { tipo?: unknown; clase?: "incidencia" | "nc" | "accion"; grande?: boolean }) {
  const s = grande ? 26 : 19;
  const def =
    clase === "nc"
      ? { icono: (n: number) => <SealWarning size={n} weight="duotone" />, tono: "bg-danger-soft text-danger" }
      : clase === "accion"
        ? { icono: (n: number) => <ListChecks size={n} weight="duotone" />, tono: "bg-success-soft text-success-text" }
        : POR_TIPO[String(tipo || "")] || POR_TIPO.otro;
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", grande ? "h-14 w-14 rounded-[16px]" : "h-10 w-10 rounded-[12px]", def.tono)}>
      {def.icono(s)}
    </span>
  );
}
