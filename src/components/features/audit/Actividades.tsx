"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { ArrowRight, CaretDown, CaretUp, ChatCenteredText, Quotes, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { datosPrincipales, dayLabel, fechaYHora, haceCuanto, humanizeAuditEntry, timeLabel, type ContextoActividad, type HumanEntry } from "@/lib/client/audit-humanize";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import type { ApiRecord } from "@/lib/client/types";
import { EntryIcon } from "./categorias";

/*
 * Lista de actividades de la bitacora y su detalle, iguales en Calidad ›
 * Auditoría y en el historial de cada registro. Lenguaje simple y nada que
 * parezca codigo. Las repeticiones seguidas (misma persona, misma accion,
 * mismo registro, en pocos minutos) se muestran como un solo renglon
 * "· 4 veces"; es solo visual: en la bitacora siguen siendo entradas
 * individuales.
 */

/* Minutos entre repeticiones para agruparlas en un renglon. */
const MINUTOS_REPETICION = 10;

export interface GrupoActividad {
  /* La mas reciente primero. */
  entradas: HumanEntry[];
  registros: ApiRecord[];
}

/* Agrupa repeticiones seguidas (la lista viene de la mas reciente a la mas antigua). */
export function agruparActividades(registros: ApiRecord[], ctx: ContextoActividad = {}): GrupoActividad[] {
  const grupos: GrupoActividad[] = [];
  for (const record of registros) {
    const entry = humanizeAuditEntry(record, ctx);
    const ultimo = grupos[grupos.length - 1];
    const previa = ultimo?.entradas[ultimo.entradas.length - 1];
    const cerca = previa?.when && entry.when ? Math.abs(previa.when.getTime() - entry.when.getTime()) <= MINUTOS_REPETICION * 60_000 : false;
    if (ultimo && previa && previa.claveGrupo === entry.claveGrupo && cerca && !entry.cambios.length && !previa.cambios.length) {
      ultimo.entradas.push(entry);
      ultimo.registros.push(record);
    } else grupos.push({ entradas: [entry], registros: [record] });
  }
  return grupos;
}

/* Grupos por dia ("Hoy", "Ayer", "Miércoles 24 de septiembre"). */
export function porDia(grupos: GrupoActividad[]): Array<[string, GrupoActividad[]]> {
  const dias = new Map<string, GrupoActividad[]>();
  for (const grupo of grupos) {
    const dia = dayLabel(grupo.entradas[0].when);
    dias.set(dia, [...(dias.get(dia) || []), grupo]);
  }
  return [...dias.entries()];
}

/* Nombres de las cuentas (para decir "Mariana" y no un numero). Se piden una vez por sesion. */
let personasCache: Promise<Map<number, string>> | null = null;
export function usePersonas(): Map<number, string> | undefined {
  const { token } = useSession();
  const [personas, setPersonas] = useState<Map<number, string>>();
  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    if (!personasCache) {
      personasCache = getJsonAuth(`${API_BASE_URL}/cuentas/activas`, token)
        .then((data) => new Map(((data.items || []) as ApiRecord[]).map((c) => [Number(c.id), String(c.nombre || c.email)])))
        .catch(() => {
          personasCache = null;
          return new Map<number, string>();
        });
    }
    void personasCache.then((mapa) => !cancelado && setPersonas(mapa));
    return () => {
      cancelado = true;
    };
  }, [token]);
  return personas;
}

/* Un renglon: icono, la frase en una linea y debajo la hora y el area. */
export function FilaActividad({ grupo, activa, onAbrir }: { grupo: GrupoActividad; activa?: boolean; onAbrir: () => void }) {
  const entry = grupo.entradas[0];
  const veces = grupo.entradas.length;
  const conMotivo = grupo.entradas.some((e) => e.motivo);
  return (
    <li>
      <button
        type="button"
        data-actividad={entry.id}
        onClick={onAbrir}
        aria-haspopup="dialog"
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 outline-none",
          "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-[inset_0_0_0_2px_rgba(15,122,149,0.45)]",
          activa && "bg-brand-faint hover:bg-brand-faint",
        )}
      >
        <EntryIcon entry={entry} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] leading-[1.35] text-ink">
            {entry.frase}
            {veces > 1 ? <span className="text-ink-3"> · {veces} veces</span> : null}
          </span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <span>
              {timeLabel(entry.when)} · {entry.area}
            </span>
            {conMotivo ? <ChatCenteredText size={13} weight="fill" className="text-ink-4" aria-label="Tiene motivo" /> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

/* Lista agrupada por dia. */
export function ListaActividades({ grupos, seleccion, onAbrir }: { grupos: GrupoActividad[]; seleccion?: number | null; onAbrir: (indice: number) => void }) {
  const dias = useMemo(() => porDia(grupos), [grupos]);
  const indice = useMemo(() => new Map(grupos.map((g, i) => [g, i])), [grupos]);
  return (
    <>
      {dias.map(([dia, lista]) => (
        <section key={dia} aria-label={dia}>
          <h2 className="material sticky top-0 z-[2] border-b border-line px-4 py-1.5 text-[12px] font-semibold text-ink-3">{dia}</h2>
          <ul className="divide-y divide-line">
            {lista.map((grupo) => (
              <FilaActividad key={grupo.entradas[0].id} grupo={grupo} activa={seleccion !== null && seleccion !== undefined && grupos[seleccion] === grupo} onAbrir={() => onAbrir(indice.get(grupo)!)} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/*
 * Ventana centrada con el detalle, sobre la pagina difuminada. Esc, la "×" o
 * pulsar fuera la cierran; ↑/↓ pasan a la actividad anterior o siguiente.
 * En pantallas angostas ocupa toda la pantalla.
 */
export function ActividadDialog({ grupos, indice, onIndice, onCerrar }: { grupos: GrupoActividad[]; indice: number | null; onIndice: (indice: number) => void; onCerrar: () => void }) {
  const grupo = indice !== null ? grupos[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < grupos.length) onIndice(siguiente);
  };
  return (
    <RadixDialog.Root open={!!grupo} onOpenChange={(open) => !open && onCerrar()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-deep/45 backdrop-blur-md data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-6">
          <RadixDialog.Content
            aria-describedby={undefined}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              const target = event.target as HTMLElement;
              if (target.closest("input, textarea, select")) return;
              event.preventDefault();
              mover(event.key === "ArrowDown" ? 1 : -1);
            }}
            className={cn(
              "pointer-events-auto flex w-full flex-col overflow-hidden bg-surface shadow-panel outline-none",
              "h-full sm:h-auto sm:max-h-[min(86dvh,760px)] sm:max-w-[600px] sm:rounded-panel",
              "data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out",
            )}
          >
            {grupo ? (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5 sm:px-5">
                  <div className="flex items-center gap-1">
                    <IconButton label="Actividad anterior" size="sm" onClick={() => mover(-1)} disabled={indice === 0}>
                      <CaretUp size={14} weight="bold" />
                    </IconButton>
                    <IconButton label="Actividad siguiente" size="sm" onClick={() => mover(1)} disabled={indice === grupos.length - 1}>
                      <CaretDown size={14} weight="bold" />
                    </IconButton>
                  </div>
                  <RadixDialog.Close asChild>
                    <IconButton label="Cerrar">
                      <X size={16} weight="bold" />
                    </IconButton>
                  </RadixDialog.Close>
                </div>
                <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                  <DetalleActividad key={grupo.entradas[0].id} grupo={grupo} onIr={onCerrar} />
                </div>
              </>
            ) : (
              <RadixDialog.Title className="sr-only">Actividad</RadixDialog.Title>
            )}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-semibold text-ink-2">{titulo}</h3>
      {children}
    </section>
  );
}

/* Contenido del detalle: titulo, quien y cuando, que paso, que cambio, motivo y "Ver el registro". */
function DetalleActividad({ grupo, onIr }: { grupo: GrupoActividad; onIr: () => void }) {
  const { token, can } = useSession();
  const personas = usePersonas();
  const record = grupo.registros[0];
  const base = grupo.entradas[0];
  const [datos, setDatos] = useState<ContextoActividad["datos"]>(null);
  // Los datos completos (registro nuevo, unidades) solo para quien consulta la bitacora general.
  const necesitaDatos = can("calidad", "V") && !record.datos_restringidos && ["crear", "editar", "reponer"].includes(base.verb);
  useEffect(() => {
    if (!necesitaDatos || !token) return;
    let cancelado = false;
    getJsonAuth(`${API_BASE_URL}/audit/${base.id}`, token)
      .then((data) => {
        const item = (data.item || {}) as ApiRecord;
        if (!cancelado) setDatos({ antes: (item.datos_anteriores as ApiRecord | null) || null, nuevos: (item.datos_nuevos as ApiRecord | null) || null });
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [necesitaDatos, token, base.id]);
  const entry = useMemo(() => humanizeAuditEntry(record, { personas, datos }), [record, personas, datos]);
  const principales = entry.verb === "crear" ? datosPrincipales(entry.entidad, datos?.nuevos, { personas }) : [];
  const motivos = [...new Set(grupo.entradas.map((e) => e.motivo).filter((m): m is string => !!m))];
  const veces = grupo.entradas.length;

  return (
    <article className="flex flex-col gap-6" data-actividad-detalle={entry.id}>
      <header className="flex gap-3.5">
        <EntryIcon entry={entry} size="lg" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <RadixDialog.Title className="text-[19px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">
            {entry.frase}
            {veces > 1 ? <span className="font-normal text-ink-3"> · {veces} veces</span> : null}
          </RadixDialog.Title>
          <p className="text-[13.5px] text-ink-2">
            {!entry.isSystem && entry.actor ? (
              <>
                <span className="font-medium text-ink">{entry.actor}</span>
                {entry.cargo ? <span> · {entry.cargo}</span> : null}
                <br />
              </>
            ) : null}
            <span>{fechaYHora(entry.when)}</span>
            <span className="text-ink-3"> · {haceCuanto(entry.when)}</span>
          </p>
        </div>
      </header>

      <Seccion titulo="Qué pasó">
        <p className="text-[14.5px] leading-[1.55] text-ink">{entry.quePaso}</p>
        {veces > 1 ? (
          <p className="text-[13.5px] text-ink-2">
            Lo hizo {veces} veces seguidas, a las {grupo.entradas.map((e) => timeLabel(e.when)).reverse().join(", ").replace(/, ([^,]*)$/, " y $1")}.
          </p>
        ) : null}
      </Seccion>

      {entry.cambios.length ? (
        <Seccion titulo="Qué cambió">
          <ul className="flex flex-col gap-1.5 text-[14px] leading-[1.5] text-ink">
            {entry.cambios.map((frase) => (
              <li key={frase} className="flex gap-2">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60" />
                <span>{frase}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      ) : principales.length ? (
        <Seccion titulo="Qué cambió">
          <p className="text-[14px] text-ink">Se registró con estos datos principales:</p>
          <dl className="grid gap-x-4 gap-y-1.5 rounded-[12px] bg-surface-2 px-3.5 py-3 text-[13.5px] ring-1 ring-line sm:grid-cols-[max-content_minmax(0,1fr)]">
            {principales.map((dato) => (
              <div key={dato.etiqueta} className="contents">
                <dt className="text-ink-3">{dato.etiqueta}</dt>
                <dd className="text-ink">{dato.valor}</dd>
              </div>
            ))}
          </dl>
        </Seccion>
      ) : null}

      {motivos.length ? (
        <Seccion titulo="Motivo">
          {motivos.map((motivo) => (
            <blockquote key={motivo} className="flex gap-2.5 rounded-[12px] bg-warning-soft/70 px-3.5 py-3 text-[14.5px] leading-[1.5] text-ink ring-1 ring-warning/15">
              <Quotes size={16} weight="fill" className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <p className="whitespace-pre-line">{motivo}</p>
            </blockquote>
          ))}
        </Seccion>
      ) : null}

      {entry.href ? (
        <div>
          <Link href={entry.href} onClick={onIr} className="press inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[14px] font-medium text-white shadow-card hover:bg-brand-strong focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
            Ver el registro <ArrowRight size={15} weight="bold" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
