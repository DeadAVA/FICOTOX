"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowRight, CalendarBlank, Certificate, ChartLine, Eye, FileText, Flask, HandPalm, HourglassLow, ListChecks, Package, Pause, PaperPlaneTilt, PencilLine, Ruler, SealCheck, ShieldWarning, Stamp, TestTube, UserMinus, UserSwitch, WarningDiamond, Wrench } from "@phosphor-icons/react";
import { IncidenciaVentana, NcVentana } from "@/components/features/calidad/ventanas/CalidadVentanas";
import { Conteo, MarcaDibujada } from "@/components/ui/Conteo";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import type { Pendiente, PendienteItem } from "./tipos";

/*
 * "Para ti": todo lo que espera a la persona en un solo lugar (solicitudes,
 * supervision, firmas, muestras asignadas, calidad, inventario, equipos y
 * vencimientos). Una tarjeta por pendiente con icono en circulo de color
 * (rojo urgente, ambar pronto, azul informativo), numero grande con conteo y
 * etiqueta corta; primero lo urgente. Al pulsarla se despliega una vista
 * previa de los primeros elementos; cada uno abre su ventana de detalle (o su
 * ficha) y "Ver todos" lleva a la lista filtrada.
 */

/* Etiqueta corta e icono de cada tipo de pendiente (Para ti y campana). */
export const CORTO: Record<string, { label: string; icono: ReactNode }> = {
  bitacora_alterada: { label: "Cambio no autorizado", icono: <ShieldWarning weight="duotone" /> },
  por_supervisar: { label: "Por supervisar", icono: <Eye weight="duotone" /> },
  por_autorizar: { label: "Por autorizar", icono: <Stamp weight="duotone" /> },
  analisis_pendientes: { label: "Análisis por firmar", icono: <ChartLine weight="duotone" /> },
  informes_revision: { label: "Informes por revisar", icono: <FileText weight="duotone" /> },
  informes_entrega: { label: "Por liberar o enviar", icono: <PaperPlaneTilt weight="duotone" /> },
  informes_enmienda: { label: "Requieren enmienda", icono: <PencilLine weight="duotone" /> },
  muestras_asignadas: { label: "Asignadas a ti", icono: <TestTube weight="duotone" /> },
  calidad_incidencias: { label: "Por evaluar", icono: <WarningDiamond weight="duotone" /> },
  calidad_acciones: { label: "Tus acciones", icono: <ListChecks weight="duotone" /> },
  calidad_verificaciones: { label: "Verificar eficacia", icono: <SealCheck weight="duotone" /> },
  calidad_retenidos: { label: "Informes retenidos", icono: <HandPalm weight="duotone" /> },
  calidad_suspensiones: { label: "Suspendidos", icono: <Pause weight="duotone" /> },
  calidad_reasignar: { label: "Por reasignar", icono: <UserSwitch weight="duotone" /> },
  reactivos_bajos: { label: "Stock bajo", icono: <Flask weight="duotone" /> },
  reactivos_caducan: { label: "Por caducar", icono: <HourglassLow weight="duotone" /> },
  consumibles_bajos: { label: "Consumibles bajos", icono: <Package weight="duotone" /> },
  equipos_cal: { label: "Calibración", icono: <Ruler weight="duotone" /> },
  mant_vencidos: { label: "Mantenimiento vencido", icono: <Wrench weight="duotone" /> },
  mant_proximos: { label: "Mantenimiento próximo", icono: <CalendarBlank weight="duotone" /> },
  accesos_vencen: { label: "Accesos por vencer", icono: <UserMinus weight="duotone" /> },
  autorizaciones_vencen: { label: "Autorizaciones por vencer", icono: <Certificate weight="duotone" /> },
};

export const TONO = {
  danger: { circulo: "bg-danger-soft text-danger", anillo: "ring-danger/25", numero: "text-danger" },
  warning: { circulo: "bg-warning-soft text-warning-text", anillo: "ring-warning/25", numero: "text-ink" },
  info: { circulo: "bg-brand-soft text-brand-strong", anillo: "ring-brand/20", numero: "text-ink" },
} as const;

const PESO = { danger: 0, warning: 1, info: 2 } as const;

export const ordenarPendientes = (lista: Pendiente[]) => [...lista].filter((p) => p.count > 0).sort((a, b) => PESO[a.tone] - PESO[b.tone]);

/* Ventana que abre cada elemento: incidencias y NC con la ventana de Calidad; lo demas, su lista o su ficha. */
export const ventanaDe = (href: string): { tipo: "incidencia" | "nc"; id: number } | null => {
  const inc = href.match(/^\/calidad\/incidencias\/(\d+)/);
  if (inc) return { tipo: "incidencia", id: Number(inc[1]) };
  const nc = href.match(/^\/calidad\/nc\/(\d+)/);
  return nc ? { tipo: "nc", id: Number(nc[1]) } : null;
};

export function ParaTi({ pendientes, className }: { pendientes: Pendiente[] | null; className?: string }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const lista = pendientes ? ordenarPendientes(pendientes) : null;
  const elegida = lista?.find((p) => p.key === abierta) || null;
  return (
    <section aria-labelledby="para-ti" className={cn("entrada-escalonada flex flex-col gap-3", className)} style={{ ["--i" as string]: 1 }}>
      <h2 id="para-ti" className="title-3 px-1 text-ink">
        Para ti
      </h2>
      {!lista ? (
        <div className="grid grid-cols-2 gap-2.5" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-card" />
          ))}
        </div>
      ) : !lista.length ? (
        <div className="flex flex-col items-center gap-2 rounded-card bg-surface px-5 py-8 text-center shadow-card">
          <MarcaDibujada className="text-success" />
          <p className="text-[15px] font-semibold text-ink">Todo al día</p>
          <p className="text-[12.5px] text-ink-3">Nada te espera por ahora.</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2.5">
            {lista.map((p, i) => (
              <li key={p.key} className="entrada-escalonada" style={{ ["--i" as string]: i }}>
                <TarjetaPendiente pendiente={p} activa={abierta === p.key} onPulsar={() => setAbierta((actual) => (actual === p.key ? null : p.key))} />
              </li>
            ))}
          </ul>
          <Despliegue abierto={!!elegida}>{elegida ? <VistaPrevia key={elegida.key} pendiente={elegida} /> : null}</Despliegue>
        </>
      )}
    </section>
  );
}

/* Tarjeta de pendiente: icono en circulo de color, numero grande con conteo y etiqueta corta. */
export function TarjetaPendiente({ pendiente, activa, onPulsar }: { pendiente: Pendiente; activa: boolean; onPulsar: () => void }) {
  const corto = CORTO[pendiente.key] || { label: pendiente.label, icono: <WarningDiamond weight="duotone" /> };
  const tono = TONO[pendiente.tone];
  return (
    <button
      type="button"
      onClick={onPulsar}
      aria-expanded={activa}
      aria-label={`${corto.label}: ${pendiente.count}`}
      title={pendiente.label}
      className={cn(
        "press flex h-full w-full flex-col items-start gap-2 rounded-card bg-surface p-3.5 text-left shadow-card ring-1 transition-[box-shadow,transform] duration-200 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:shadow-raised focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none motion-reduce:hover:translate-y-0",
        activa ? tono.anillo + " ring-2" : "ring-line",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span aria-hidden="true" className={cn("flex h-9 w-9 items-center justify-center rounded-full text-[19px] [&>svg]:h-[1em] [&>svg]:w-[1em]", tono.circulo)}>
          {corto.icono}
        </span>
        <Conteo valor={pendiente.count} className={cn("text-[26px] leading-none font-semibold tracking-[-0.02em]", tono.numero)} />
      </span>
      <span className="text-[13px] leading-tight font-medium text-ink-2">{corto.label}</span>
    </button>
  );
}

/* Despliegue suave (alto de 0 a su contenido) sin saltos. */
function Despliegue({ abierto, children }: { abierto: boolean; children: ReactNode }) {
  return (
    <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none", abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function VistaPrevia({ pendiente }: { pendiente: Pendiente }) {
  const router = useRouter();
  const [ventana, setVentana] = useState<{ tipo: "incidencia" | "nc"; id: number } | null>(null);
  const abrir = (item: PendienteItem) => {
    const v = ventanaDe(item.href);
    if (v) setVentana(v);
    else router.push(item.href);
  };
  return (
    <div className="rounded-card bg-surface p-2 shadow-card ring-1 ring-line">
      <ul className="flex flex-col">
        {pendiente.items.slice(0, 5).map((item, i) => (
          <li key={`${item.label}-${i}`} className="entrada-escalonada" style={{ ["--i" as string]: i }}>
            <button type="button" onClick={() => abrir(item)} className="group flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none">
              {item.persona_id || item.persona ? <FiguraPersona id={item.persona_id} nombre={item.persona} size="xs" /> : <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-4 mx-[9px]" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-medium text-ink">{item.label}</span>
                {item.sub ? <span className="truncate text-[12px] text-ink-3">{item.sub}</span> : null}
              </span>
              <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ul>
      <Link href={pendiente.href} className="mt-1 flex items-center justify-center gap-1 rounded-[10px] py-1.5 text-[12.5px] font-medium text-brand hover:bg-brand-faint hover:text-brand-strong">
        Ver todos{pendiente.count > 5 ? ` (${pendiente.count})` : ""} <ArrowRight size={13} />
      </Link>
      <IncidenciaVentana ids={ventana?.tipo === "incidencia" ? [ventana.id] : []} indice={ventana?.tipo === "incidencia" ? 0 : null} onIndice={() => undefined} onCerrar={() => setVentana(null)} />
      <NcVentana ids={ventana?.tipo === "nc" ? [ventana.id] : []} indice={ventana?.tipo === "nc" ? 0 : null} onIndice={() => undefined} onCerrar={() => setVentana(null)} />
    </div>
  );
}
