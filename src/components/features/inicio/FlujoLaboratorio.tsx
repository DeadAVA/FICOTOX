"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Archive, ArrowRight, ChartLine, Drop, FileText, HandArrowDown, Knife, Plus, SealCheck } from "@phosphor-icons/react";
import { Avatar, Skeleton } from "@/components/ui/Primitives";
import { Conteo } from "@/components/ui/Conteo";
import { cn } from "@/components/ui/cn";
import { ETAPAS_FLUJO, type EtapaFlujo } from "@/lib/client/flujo";
import { haceCuantoCorto } from "@/lib/client/tiempo";
import type { MuestraEnCurso, PersonaAsignada } from "./tipos";

/*
 * Flujo del laboratorio: las etapas de las muestras en una linea
 * (Recepción → … → Cierre), cada una con su icono y una burbuja con cuantas
 * muestras estan ahi ahora (con los alcances de la persona). La linea de
 * progreso se dibuja al cargar y los numeros aparecen con conteo. Al pasar el
 * cursor (o al tocar en movil) una tarjeta flotante muestra las primeras
 * muestras de la etapa; al pulsar, la lista de Recepción filtrada por esa
 * etapa. Debajo, las 5 muestras con movimiento mas reciente.
 */

const ICONO: Record<EtapaFlujo, ReactNode> = {
  recepcion: <HandArrowDown weight="duotone" />,
  procesamiento: <Knife weight="duotone" />,
  extraccion: <Drop weight="duotone" />,
  analisis: <ChartLine weight="duotone" />,
  revision: <SealCheck weight="duotone" />,
  informe: <FileText weight="duotone" />,
  cierre: <Archive weight="duotone" />,
};

const hrefEtapa = (clave: EtapaFlujo) => `/muestras/recepcion?flujo=${clave}`;

export function FlujoLaboratorio({ muestras, total, puedeCrear, className }: { muestras: MuestraEnCurso[] | null; total: number; puedeCrear: boolean; className?: string }) {
  const porEtapa = new Map<EtapaFlujo, MuestraEnCurso[]>(ETAPAS_FLUJO.map((e) => [e.clave, []]));
  for (const m of muestras || []) porEtapa.get(m.etapa_flujo)?.push(m);
  const recientes = [...(muestras || [])].sort((a, b) => String(b.ultimo_movimiento || "").localeCompare(String(a.ultimo_movimiento || ""))).slice(0, 5);

  return (
    <section aria-labelledby="flujo" className={cn("entrada-escalonada flex min-w-0 flex-col gap-3", className)} style={{ ["--i" as string]: 2 }}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="flujo" className="title-3 text-ink">
          Flujo del laboratorio
        </h2>
        {muestras ? (
          <Link href="/muestras/recepcion" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
            {total} en curso <ArrowRight size={13} />
          </Link>
        ) : null}
      </div>

      <div className="rounded-card bg-surface shadow-card">
        <div className="px-2 pt-5 pb-4 sm:px-5">
          <ol className="relative grid grid-cols-7" aria-label="Etapas del flujo">
            {ETAPAS_FLUJO.map((etapa, i) => (
              <Etapa key={etapa.clave} i={i} clave={etapa.clave} label={etapa.label} muestras={muestras ? porEtapa.get(etapa.clave) || [] : null} ultima={i === ETAPAS_FLUJO.length - 1} />
            ))}
          </ol>
        </div>

        <div className="border-t border-line">
          {!muestras ? (
            <div className="flex flex-col gap-3 px-5 py-4" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : !recientes.length ? (
            <div className="flex flex-col items-center gap-2 px-5 py-9 text-center">
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-faint text-brand-strong">
                <HandArrowDown size={22} weight="duotone" />
              </span>
              <p className="text-[14.5px] font-semibold text-ink">Sin muestras en curso</p>
              {puedeCrear ? (
                <Link href="/muestras/recepcion/nueva" className="press mt-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[13.5px] font-medium text-on-accent shadow-card hover:bg-brand-strong">
                  <Plus size={14} weight="bold" /> Nueva recepción
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="flex flex-col p-1.5" aria-label="Muestras en curso más recientes">
              {recientes.map((m, i) => (
                <FilaMuestra key={m.id} m={m} i={i} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* Una etapa: icono, burbuja con el numero, linea hacia la siguiente y tarjeta flotante con sus primeras muestras. */
function Etapa({ i, clave, label, muestras, ultima }: { i: number; clave: EtapaFlujo; label: string; muestras: MuestraEnCurso[] | null; ultima: boolean }) {
  const router = useRouter();
  const [flotante, setFlotante] = useState(false);
  const tactil = useRef(false);
  const n = muestras?.length ?? 0;
  const hay = n > 0;
  return (
    <li
      className="relative flex flex-col items-center"
      onMouseEnter={() => setFlotante(true)}
      onMouseLeave={() => setFlotante(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFlotante(false);
      }}
    >
      {/* Linea hacia la siguiente etapa: se dibuja al cargar. */}
      {!ultima ? (
        <span aria-hidden="true" className="absolute top-[17px] left-[calc(50%+22px)] h-0.5 w-[calc(100%-44px)] rounded-full bg-line sm:top-[21px] sm:left-[calc(50%+28px)] sm:w-[calc(100%-56px)]">
          {muestras ? <span className="linea-crece block h-full w-full rounded-full bg-brand/45" style={{ ["--i" as string]: i }} /> : null}
        </span>
      ) : null}
      <button
        type="button"
        onPointerDown={(e) => (tactil.current = e.pointerType === "touch")}
        onClick={() => {
          // En movil el primer toque muestra la tarjeta flotante; con raton o teclado abre la lista filtrada.
          if (tactil.current && !flotante) setFlotante(true);
          else router.push(hrefEtapa(clave));
        }}
        onFocus={() => setFlotante(true)}
        aria-label={`${label}: ${n} ${n === 1 ? "muestra" : "muestras"}. Abrir la lista de esta etapa`}
        className="press group relative flex flex-col items-center gap-1.5 rounded-[14px] px-1 pb-1 outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <span aria-hidden="true" className={cn("relative flex h-9 w-9 items-center justify-center rounded-full text-[18px] sm:h-11 sm:w-11 sm:text-[21px] transition-[transform,box-shadow] duration-200 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:shadow-raised motion-reduce:group-hover:translate-y-0 [&>svg]:h-[1em] [&>svg]:w-[1em]", hay ? "bg-brand-soft text-brand-strong" : "bg-surface-2 text-ink-4 ring-1 ring-line")}>
          {ICONO[clave]}
          {muestras ? (
            <span className={cn("absolute -top-1.5 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold ring-2 ring-surface animate-pop-in motion-reduce:animate-none", hay ? "bg-brand text-on-accent" : "bg-surface-3 text-ink-3")} style={{ animationDelay: `${i * 70}ms` }}>
              <Conteo valor={n} />
            </span>
          ) : (
            <Skeleton className="absolute -top-1.5 -right-2 h-5 w-5 rounded-full" />
          )}
        </span>
        <span className={cn("hidden text-center text-[12px] leading-tight font-medium sm:block", hay ? "text-ink-2" : "text-ink-4")}>{label}</span>
      </button>

      {flotante && muestras ? (
        <div className={cn("absolute top-full z-20 w-60 pt-1.5", i < 2 ? "left-0" : i > 4 ? "right-0" : "left-1/2 -translate-x-1/2")}>
        <div className="rounded-[16px] bg-surface/95 p-2 text-left shadow-panel ring-1 ring-line backdrop-blur-xl animate-pop-in motion-reduce:animate-none">
          <p className="px-2 pt-1 pb-1.5 text-[12px] font-semibold text-ink-3">
            {label} · {n}
          </p>
          {hay ? (
            <ul className="flex flex-col">
              {muestras.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <Link href={`/muestras/recepcion/${m.id}`} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-surface-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="tnum text-[13px] font-medium text-ink">{m.folio}</span>
                      <span className="truncate text-[11.5px] text-ink-3">{m.muestras[0] || m.cliente || "—"}</span>
                    </span>
                    <Asignados personas={m.asignados} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 pb-2 text-[12.5px] text-ink-3">Ninguna ahora.</p>
          )}
          {n > 4 ? (
            <Link href={hrefEtapa(clave)} className="mt-0.5 block rounded-[10px] px-2 py-1.5 text-center text-[12px] font-medium text-brand hover:bg-brand-faint">
              Ver las {n}
            </Link>
          ) : null}
        </div>
        </div>
      ) : null}
    </li>
  );
}

/* Mini figuras de los asignados (hasta 3, encimadas). */
function Asignados({ personas }: { personas: PersonaAsignada[] }) {
  if (!personas.length) return <span className="text-[11px] text-ink-4">Sin asignar</span>;
  return (
    <span className="flex shrink-0 -space-x-1.5" title={personas.map((p) => p.nombre || p.email).join(", ")}>
      {personas.slice(0, 3).map((p) => (
        <Avatar key={p.id} name={p.nombre} email={p.email} avatar={p.avatar} size="xs" className="ring-2 ring-surface" />
      ))}
      {personas.length > 3 ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-2 ring-2 ring-surface">+{personas.length - 3}</span> : null}
    </span>
  );
}

/* Renglon compacto: folio, muestra, puntos de etapas que se llenan, asignados y hace cuanto se movio. */
function FilaMuestra({ m, i }: { m: MuestraEnCurso; i: number }) {
  const actual = ETAPAS_FLUJO.findIndex((e) => e.clave === m.etapa_flujo);
  const etapa = ETAPAS_FLUJO[actual]?.label || "";
  return (
    <li className="entrada-escalonada" style={{ ["--i" as string]: i }}>
      <Link href={`/muestras/recepcion/${m.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-[12px] px-3.5 py-2.5 transition-colors duration-150 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none sm:grid-cols-[minmax(0,1.2fr)_auto_auto_64px]">
        <span className="flex min-w-0 flex-col">
          <span className="tnum text-[14px] font-semibold text-ink">{m.folio}</span>
          <span className="truncate text-[12.5px] text-ink-3">{m.muestras[0] || m.cliente || "—"}</span>
        </span>
        <span className="flex flex-col items-end gap-1 sm:items-start" role="img" aria-label={`Etapa ${actual + 1} de ${ETAPAS_FLUJO.length}: ${etapa}`}>
          <span className="flex items-center gap-1" aria-hidden="true">
            {ETAPAS_FLUJO.map((e, k) => (
              <span key={e.clave} className={cn("h-1.5 rounded-full transition-[width,background-color] duration-500 ease-[var(--ease-spring)]", k < actual ? "w-3 bg-brand/55" : k === actual ? "w-5 bg-brand" : "w-3 bg-surface-3")} />
            ))}
          </span>
          <span className="text-[11.5px] text-ink-3">{etapa}</span>
        </span>
        <span className="hidden sm:flex">
          <Asignados personas={m.asignados} />
        </span>
        <span className="hidden text-right text-[12px] text-ink-3 sm:block" title={m.ultimo_movimiento || undefined}>
          {m.ultimo_movimiento ? haceCuantoCorto(m.ultimo_movimiento) : "—"}
        </span>
      </Link>
    </li>
  );
}
