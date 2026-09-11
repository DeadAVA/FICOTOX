"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { ArrowRight, CheckCircle, Plus } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { HomeSearch, type HomeSearchHandle } from "@/components/shell/HomeSearch";
import { AvisoRow, type Aviso } from "@/components/features/inicio/Avisos";
import { FlowCard, type FlowItem } from "@/components/features/inicio/FlowList";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/components/ui/cn";
import { ErrorState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Inicio. El buscador (encuentra cualquier cosa, crea y navega) y, debajo,
 * solo lo que requiere acción: cada muestra en curso con su siguiente paso y
 * los avisos con detalle al pasar el cursor. Nada más.
 */

interface Overview {
  flujo: FlowItem[];
  flujoTotal: number;
  avisos: Aviso[];
  avisosTotal: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioPage() {
  const { token, user, can } = useSession();
  const search = useRef<HomeSearchHandle>(null);

  const resource = useResource<Overview>(
    ["dashboard", "movimientos", "mantenimientos", "muestras", "reactivos", "consumibles", "equipos", "informes", "documentos"],
    async () => {
      const empty: ApiRecord = {};
      const quiet = (url: string, allowed: boolean) => (allowed ? getJsonAuth(url, token).catch(() => empty) : Promise.resolve(empty));
      const [flujo, avisos] = await Promise.all([quiet(`${API_BASE_URL}/inicio/en-curso`, can("muestras")), quiet(`${API_BASE_URL}/inicio/avisos`, can("dashboard"))]);
      return {
        flujo: (flujo.items || []) as FlowItem[],
        flujoTotal: Number(flujo.total || 0),
        avisos: (avisos.items || []) as Aviso[],
        avisosTotal: Number(avisos.total || 0),
      };
    },
    { enabled: !!token },
  );

  const data = resource.data;
  const rawToday = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);
  const firstName = (user?.nombre || user?.email || "").split(/[\s@]/)[0];

  const firmas = data ? data.flujo.filter((f) => f.siguiente.accion === "revisar" || f.siguiente.accion === "aprobar").length : 0;
  const urgentes = data ? data.avisos.filter((a) => a.tone === "danger").reduce((sum, a) => sum + a.count, 0) : 0;

  /* Tres ejemplos que escriben en el buscador: enseñan qué se puede buscar sin explicarlo. */
  const examples = [
    { label: "R 0000001", allowed: can("muestras") },
    { label: "metanol", allowed: can("reactivos") },
    { label: "nueva recepción", allowed: can("muestras", "create") },
    { label: "informes por revisar", allowed: can("informes") },
  ]
    .filter((e) => e.allowed)
    .slice(0, 3);

  return (
    <PageBody className="gap-10">
      <section className="mx-auto flex w-full max-w-[720px] flex-col items-center pt-2 text-center sm:pt-10">
        <p className="text-[13px] text-ink-3">{today}</p>
        <h1 className="display mt-1 text-[32px] text-ink sm:text-[40px]">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <HomeSearch className="mt-7" handle={search} />
        {examples.length ? (
          <p className="mt-3 text-[12.5px] text-ink-4">
            Prueba{" "}
            {examples.map((example, index) => (
              <span key={example.label}>
                {index > 0 ? <span aria-hidden="true"> · </span> : null}
                <button type="button" onClick={() => search.current?.ask(example.label)} className="rounded-[4px] text-ink-3 underline decoration-line-strong underline-offset-[3px] transition-colors hover:text-brand-strong hover:decoration-brand focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
                  {example.label}
                </button>
              </span>
            ))}
          </p>
        ) : null}
      </section>

      {resource.error ? (
        <ErrorState message={resource.error} onRetry={resource.reload} />
      ) : (
        <div className="mx-auto grid w-full max-w-[1040px] gap-5 lg:grid-cols-[1.4fr_1fr]">
          {can("muestras") ? (
            <Panel
              id="en-curso"
              title="En curso"
              count={data ? data.flujoTotal : null}
              meta={firmas ? `${fmt(firmas)} ${firmas === 1 ? "espera" : "esperan"} firma` : null}
              action={
                <Link href="/muestras" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong">
                  Todas <ArrowRight size={14} />
                </Link>
              }
            >
              {!data ? (
                <div className="flex flex-col gap-3 px-5 pb-5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ) : !data.flujo.length ? (
                <Quiet
                  icon={<CheckCircle size={20} weight="fill" />}
                  title="Nada en curso"
                  description={can("muestras", "create") ? "Registra una recepción para iniciar el flujo." : "No hay muestras pendientes."}
                  action={
                    can("muestras", "create") ? (
                      <Link href="/muestras/recepcion/nueva" className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-[13px] font-medium text-white hover:bg-brand-strong">
                        <Plus size={14} weight="bold" /> Nueva recepción
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="stagger flex flex-col gap-1 px-1.5 pb-2">
                  {data.flujo.slice(0, 8).map((item) => (
                    <FlowCard key={item.id} item={item} />
                  ))}
                  {data.flujoTotal > 8 ? (
                    <li className="px-3 pt-1 pb-1 text-center text-[12.5px] text-ink-3">
                      y {fmt(data.flujoTotal - 8)} más ·{" "}
                      <Link href="/muestras" className="font-medium text-brand hover:text-brand-strong">
                        ver todas
                      </Link>
                    </li>
                  ) : null}
                </ul>
              )}
            </Panel>
          ) : null}

          <div className="flex min-w-0 flex-col gap-3">
            {can("dashboard") ? (
              <Panel id="avisos" title="Avisos" count={data ? data.avisosTotal : null} meta={urgentes ? `${fmt(urgentes)} ${urgentes === 1 ? "urgente" : "urgentes"}` : null} metaTone="danger">
                {!data ? (
                  <div className="flex flex-col gap-3 px-5 pb-5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : !data.avisos.length ? (
                  <Quiet icon={<CheckCircle size={20} weight="fill" />} title="Todo en orden" description="Sin stock bajo, calibraciones vencidas ni firmas pendientes." />
                ) : (
                  <ul className="inset-group stagger">
                    {data.avisos.map((aviso) => (
                      <AvisoRow key={aviso.key} aviso={aviso} />
                    ))}
                  </ul>
                )}
              </Panel>
            ) : null}
            <p className="px-1 text-[12.5px] text-ink-4">
              ¿Primera vez aquí?{" "}
              <Link href="/ayuda" className="font-medium text-ink-3 underline decoration-line-strong underline-offset-[3px] hover:text-brand-strong hover:decoration-brand">
                Cómo se usa
              </Link>
            </p>
          </div>
        </div>
      )}
    </PageBody>
  );
}

/* Panel con título, cuenta y (si hay) un dato corto a la derecha del título. */
function Panel({ id, title, count, meta, metaTone = "neutral", action, children }: { id?: string; title: string; count?: number | null; meta?: string | null; metaTone?: "neutral" | "danger"; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={cn("rounded-card bg-surface shadow-card scroll-mt-20", id === "en-curso" ? "overflow-visible" : "overflow-hidden")}>
      <header className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="title-3 text-ink">{title}</h2>
          {count !== null && count !== undefined ? <span className="tnum text-[13px] text-ink-4">{fmt(count)}</span> : null}
          {meta ? <span className={cn("text-[12.5px]", metaTone === "danger" ? "font-medium text-danger" : "text-ink-3")}>· {meta}</span> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Quiet({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
      <span className="text-success">{icon}</span>
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description ? <p className="max-w-xs text-[12.5px] text-ink-3">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
