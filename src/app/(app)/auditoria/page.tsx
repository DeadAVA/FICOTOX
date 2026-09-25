"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DropdownMenu as RadixDropdown, Popover as RadixPopover } from "radix-ui";
import { ArrowsClockwise, CaretDown, Check, ChatCenteredText, DownloadSimple, ShieldCheck, ShieldWarning, X } from "@phosphor-icons/react";
import { AuditEntryDetail } from "@/components/features/audit/AuditDetail";
import { ACCIONES_DE_SESION, CATEGORIAS, EntryIcon, type Categoria } from "@/components/features/audit/categorias";
import { Callout } from "@/components/features/samples/FormLayout";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Switch } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, SegmentedTabs } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { dayLabel, humanizeAuditEntry, timeLabel, type HumanEntry } from "@/lib/client/audit-humanize";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { descargarCsv } from "@/lib/client/files";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import type { ApiRecord } from "@/lib/client/types";
import { hoyLocal, sumarDias } from "@/lib/shared/fechas";

/*
 * Auditoria (rediseño): lista compacta agrupada por dia a la izquierda y
 * detalle de la entrada a la derecha (hoja a pantalla completa en pantallas
 * angostas). Filtros siempre visibles, verificacion de integridad automatica
 * y exportacion CSV con los filtros aplicados. Solo interfaz: la bitacora,
 * sus sellos, permisos y alcances no cambian.
 */

const MODULOS = [
  { value: "muestras", label: "Muestras" },
  { value: "ensayos", label: "Ensayos" },
  { value: "informes", label: "Informes" },
  { value: "documentos", label: "Documentos" },
  { value: "inventario", label: "Inventario" },
  { value: "equipos", label: "Equipos" },
  { value: "usuarios", label: "Usuarios" },
];

type Periodo = "hoy" | "7" | "30" | "todo" | "rango";
const PERIODOS: Array<{ value: Periodo; label: string }> = [
  { value: "hoy", label: "Hoy" },
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "todo", label: "Todo" },
  { value: "rango", label: "Personalizado" },
];

const PAGINA = 60;

interface Integridad {
  ok: boolean;
  total: number;
  primer_error: number | null;
  filas_faltantes_al_final?: number;
  filas_faltantes_intermedias?: number;
  triggers_ok?: boolean;
  llave?: { origen: "SECRET_KEY" | "auditoria.key"; advertencias: string[] };
}

/* Qué falló exactamente en la verificación, en una frase. */
function integridadDetalle(r: Integridad): string {
  if (r.primer_error) return `La cadena está alterada desde la entrada #${r.primer_error}`;
  if (r.filas_faltantes_intermedias) return `Faltan ${fmt(r.filas_faltantes_intermedias)} entradas intermedias`;
  if (r.filas_faltantes_al_final) return `Faltan ${fmt(r.filas_faltantes_al_final)} entradas al final`;
  if (r.triggers_ok === false) return "La tabla no tiene su protección contra cambios";
  return "La verificación no cuadra";
}

/* Pantalla ancha (panel lateral) o angosta (hoja a pantalla completa). */
function useAncho(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(min-width: 1024px)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export default function AuditoriaPage() {
  return (
    <PageBody>
      <RequireModule modules="calidad">
        <AuditoriaContent />
      </RequireModule>
    </PageBody>
  );
}

interface Fila {
  entry: HumanEntry;
  record: ApiRecord;
}

function AuditoriaContent() {
  const { token } = useSession();
  const ancho = useAncho();
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [desdeRango, setDesdeRango] = useState("");
  const [hastaRango, setHastaRango] = useState("");
  const [usuario, setUsuario] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [modulo, setModulo] = useState("");
  const [conAccesos, setConAccesos] = useState(false);
  const [registros, setRegistros] = useState<ApiRecord[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [integridad, setIntegridad] = useState<Integridad | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [summary, setSummary] = useState<ApiRecord>({});
  const [cuentas, setCuentas] = useState<ApiRecord[]>([]);
  const [exportando, setExportando] = useState(false);
  const debounced = useDebouncedValue(search);
  const lista = useRef<HTMLDivElement>(null);
  const centinela = useRef<HTMLDivElement>(null);

  const hoy = hoyLocal();
  const { desde, hasta } = useMemo(() => {
    if (periodo === "hoy") return { desde: hoy, hasta: hoy };
    if (periodo === "7") return { desde: sumarDias(hoy, -6), hasta: hoy };
    if (periodo === "30") return { desde: sumarDias(hoy, -29), hasta: hoy };
    if (periodo === "rango") return { desde: desdeRango, hasta: hastaRango };
    return { desde: "", hasta: "" };
  }, [periodo, hoy, desdeRango, hastaRango]);

  /* Filtros comunes de la lista y de la exportación. */
  const filtros = useMemo(() => {
    const params = new URLSearchParams({ search: debounced.trim(), usuario, desde, hasta, modulo });
    if (categoria) params.set("acciones", CATEGORIAS.find((c) => c.value === categoria)!.acciones.join(","));
    return params;
  }, [debounced, usuario, desde, hasta, modulo, categoria]);
  // Si se eligió la categoría Accesos, los inicios de sesión se muestran aunque el interruptor esté apagado.
  const ocultarAccesos = !conAccesos && categoria !== "accesos";
  const claveFiltros = `${filtros.toString()}|${ocultarAccesos}`;

  const pedir = useCallback(
    async (antesDe?: number) => {
      const params = new URLSearchParams(filtros);
      params.set("limit", String(PAGINA));
      if (ocultarAccesos) params.set("sin_accesos", "1");
      if (antesDe) params.set("antes_de", String(antesDe));
      const data = await getJsonAuth(`${API_BASE_URL}/audit?${params.toString()}`, token);
      return (data.items || []) as ApiRecord[];
    },
    [filtros, ocultarAccesos, token],
  );

  // Primera página: se reinicia al cambiar cualquier filtro.
  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    (async () => {
      await Promise.resolve();
      if (cancelado) return;
      setRegistros(null);
      setError(null);
      try {
        const items = await pedir();
        if (cancelado) return;
        setRegistros(items);
        setHayMas(items.length >= PAGINA);
      } catch (err) {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo cargar la bitácora");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [token, claveFiltros, pedir, recarga]);

  const cargarMas = useCallback(async () => {
    if (!registros?.length || cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      const items = await pedir(Number(registros[registros.length - 1].id));
      setRegistros((prev) => [...(prev || []), ...items]);
      setHayMas(items.length >= PAGINA);
    } catch {
      setHayMas(false);
    } finally {
      setCargandoMas(false);
    }
  }, [registros, cargandoMas, hayMas, pedir]);

  // Carga progresiva: al acercarse al final de la lista se pide la página siguiente.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void cargarMas(), { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cargarMas, hayMas]);

  const verificar = useCallback(async () => {
    setVerificando(true);
    try {
      setIntegridad((await getJsonAuth(`${API_BASE_URL}/audit/verify`, token)) as Integridad);
    } catch {
      /* se reintenta desde la insignia */
    } finally {
      setVerificando(false);
    }
  }, [token]);

  // Al abrir: verificación de integridad en segundo plano, resumen y personas para el filtro.
  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    (async () => {
      await Promise.resolve();
      if (cancelado) return;
      void verificar();
      getJsonAuth(`${API_BASE_URL}/audit/summary`, token)
        .then((data) => !cancelado && setSummary(data as ApiRecord))
        .catch(() => undefined);
      getJsonAuth(`${API_BASE_URL}/cuentas/activas`, token)
        .then((data) => !cancelado && setCuentas((data.items || []) as ApiRecord[]))
        .catch(() => undefined);
    })();
    return () => {
      cancelado = true;
    };
  }, [token, verificar]);

  const filas: Fila[] = useMemo(() => (registros || []).map((record) => ({ entry: humanizeAuditEntry(record), record })), [registros]);
  const grupos = useMemo(() => {
    const porDia = new Map<string, Fila[]>();
    for (const fila of filas) {
      const dia = dayLabel(fila.entry.when);
      porDia.set(dia, [...(porDia.get(dia) || []), fila]);
    }
    return Array.from(porDia.entries());
  }, [filas]);
  const elegida = seleccion !== null ? filas.find((f) => f.entry.id === seleccion) || null : null;

  // Teclado: ↑/↓ cambian de entrada y Esc cierra el detalle; la lista conserva su posición.
  useEffect(() => {
    if (seleccion === null) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [role=menu], [role=dialog] input") || target.isContentEditable)) return;
      if (event.key === "Escape" && ancho) {
        setSeleccion(null);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const index = filas.findIndex((f) => f.entry.id === seleccion);
      const next = filas[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
      event.preventDefault();
      setSeleccion(next.entry.id);
      requestAnimationFrame(() => {
        const row = lista.current?.querySelector<HTMLElement>(`[data-audit-fila="${next.entry.id}"]`);
        row?.scrollIntoView({ block: "nearest" });
        if (ancho) row?.focus({ preventScroll: true });
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seleccion, filas, ancho]);

  const exportar = async () => {
    setExportando(true);
    const params = new URLSearchParams(filtros);
    params.set("formato", "csv");
    await descargarCsv(`${API_BASE_URL}/audit?${params.toString()}`, token, `bitacora-${hoy}.csv`);
    setExportando(false);
  };

  const cuentaElegida = cuentas.find((c) => String(c.email) === usuario);
  const chips: Array<{ key: string; label: string; quitar: () => void }> = [
    search.trim() ? { key: "search", label: `“${search.trim()}”`, quitar: () => setSearch("") } : null,
    periodo !== "todo" ? { key: "periodo", label: periodo === "rango" ? `Del ${desde ? fmtDate(desde) : "inicio"} al ${hasta ? fmtDate(hasta) : "hoy"}` : PERIODOS.find((p) => p.value === periodo)!.label, quitar: () => setPeriodo("todo") } : null,
    usuario ? { key: "usuario", label: `Usuario: ${cuentaElegida?.nombre || usuario}`, quitar: () => setUsuario("") } : null,
    categoria ? { key: "categoria", label: `Acción: ${CATEGORIAS.find((c) => c.value === categoria)?.label}`, quitar: () => setCategoria("") } : null,
    modulo ? { key: "modulo", label: `Módulo: ${MODULOS.find((m) => m.value === modulo)?.label}`, quitar: () => setModulo("") } : null,
    conAccesos ? { key: "accesos", label: "Con inicios de sesión", quitar: () => setConAccesos(false) } : null,
  ].filter((c): c is { key: string; label: string; quitar: () => void } => !!c);
  const limpiar = () => {
    setSearch("");
    setPeriodo("todo");
    setDesdeRango("");
    setHastaRango("");
    setUsuario("");
    setCategoria("");
    setModulo("");
    setConAccesos(false);
  };

  const detalle = elegida ? <AuditEntryDetail entry={elegida.entry} record={elegida.record} /> : null;

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Quién hizo qué, cuándo y por qué. Solo lectura: cada entrada guarda el dato anterior y el nuevo, el motivo y un sello encadenado con la entrada previa (ISO/IEC 17025 7.5.2 y 7.11)."
        actions={
          <>
            <InsigniaIntegridad integridad={integridad} verificando={verificando} onVerificar={verificar} />
            <Button variant="secondary" icon={<DownloadSimple size={16} />} loading={exportando} onClick={exportar}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {integridad && !integridad.ok ? (
        <Callout tone="danger" title="La bitácora no pasó la verificación de integridad" className="mb-4">
          {integridadDetalle(integridad)}. Alguien pudo alterar o borrar entradas fuera de la plataforma; conserva el archivo y avisa a la Responsable General y a Mejora Continua.
        </Callout>
      ) : null}
      {integridad?.llave?.advertencias?.length ? (
        <Callout tone="warning" title="Llave de la bitácora" className="mb-4">
          {integridad.llave.advertencias.map((texto) => (
            <span key={texto} className="block">
              {texto}
            </span>
          ))}
        </Callout>
      ) : null}

      {/* Filtros siempre visibles. */}
      <div className="mb-3 flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Folio, referencia o motivo" className="w-full md:w-[320px]" />
          <SegmentedTabs label="Periodo" value={periodo} onChange={setPeriodo} options={PERIODOS} size="sm" />
          {periodo === "rango" ? (
            <div className="flex items-center gap-2">
              <DateInput id="aud-desde" small value={desdeRango} onChange={setDesdeRango} aria-label="Desde" />
              <span className="text-[12.5px] text-ink-3">a</span>
              <DateInput id="aud-hasta" small value={hastaRango} onChange={setHastaRango} aria-label="Hasta" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Desplegable label="Usuario" valor={usuario} onChange={setUsuario} opciones={cuentas.map((c) => ({ value: String(c.email), label: String(c.nombre || c.email), hint: c.cargo ? String(c.cargo) : undefined }))} />
          <Desplegable label="Acción" valor={categoria} onChange={(v) => setCategoria(v as Categoria | "")} opciones={CATEGORIAS.map((c) => ({ value: c.value, label: c.label }))} />
          <Desplegable label="Módulo" valor={modulo} onChange={setModulo} opciones={MODULOS} />
          <div className="ml-1 flex items-center gap-2 text-[13px] text-ink-2">
            <Switch id="aud-accesos" checked={conAccesos} onCheckedChange={setConAccesos} />
            <label htmlFor="aud-accesos" className="cursor-pointer select-none">
              Mostrar inicios de sesión
            </label>
          </div>
        </div>
        {chips.length ? (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtros activos">
            {chips.map((chip) => (
              <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft pr-1 pl-2.5 text-[12.5px] font-medium text-brand-strong">
                {chip.label}
                <button type="button" onClick={chip.quitar} aria-label={`Quitar ${chip.label}`} className="press flex h-5 w-5 items-center justify-center rounded-full text-brand hover:bg-white/70 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none">
                  <X size={11} weight="bold" />
                </button>
              </span>
            ))}
            <button type="button" onClick={limpiar} className="press h-7 rounded-full px-2.5 text-[12.5px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink">
              Limpiar
            </button>
          </div>
        ) : null}
        <p className="tnum text-[12px] text-ink-3" data-audit-resumen>
          {registros ? `${fmt(filas.length)}${hayMas ? "+" : ""} movimientos con estos filtros` : "Cargando…"} · Total en la bitácora {fmt(Number(summary.total || 0))} · Anulaciones {fmt(Number(summary.anulaciones || 0))} · Accesos fallidos (30 días){" "}
          <span className={cn(Number(summary.accesos_fallidos_30_dias || 0) ? "text-danger" : undefined)}>{fmt(Number(summary.accesos_fallidos_30_dias || 0))}</span>
        </p>
      </div>

      <div className={cn("grid items-start gap-4", ancho && elegida && "lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]")}>
        <div ref={lista} className="min-w-0 overflow-hidden rounded-card bg-surface shadow-card" aria-label="Movimientos de la bitácora">
          {error ? (
            <ErrorState message={error} onRetry={() => setRecarga((n) => n + 1)} />
          ) : !registros ? (
            <EsqueletoLista filas={8} />
          ) : !filas.length ? (
            <EmptyState title="Sin movimientos" description={ocultarAccesos ? "No hay entradas con esos filtros (los inicios de sesión están ocultos)." : "No hay entradas con esos filtros."} />
          ) : (
            <>
              {grupos.map(([dia, filasDia]) => (
                <section key={dia} aria-label={dia}>
                  <h2 className="material sticky top-0 z-[2] border-b border-line px-4 py-1.5 text-[12px] font-semibold text-ink-3 lg:top-0">{dia}</h2>
                  <ul className="divide-y divide-line">
                    {filasDia.map((fila) => (
                      <FilaEntrada key={fila.entry.id} fila={fila} activa={fila.entry.id === seleccion} onElegir={() => setSeleccion(fila.entry.id === seleccion && ancho ? null : fila.entry.id)} />
                    ))}
                  </ul>
                </section>
              ))}
              <div ref={centinela} />
              {cargandoMas ? <EsqueletoLista filas={3} /> : null}
              {!hayMas ? <p className="border-t border-line px-4 py-3 text-center text-[12px] text-ink-4">Inicio de la bitácora con estos filtros</p> : null}
            </>
          )}
        </div>

        {ancho && elegida ? (
          <aside key={elegida.entry.id} className="scroll-thin sticky top-4 max-h-[calc(100dvh-2rem)] animate-sheet-in overflow-y-auto rounded-panel bg-surface p-5 shadow-raised motion-reduce:animate-none" aria-label="Detalle del movimiento">
            <div className="-mt-1 mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow text-ink-3">Detalle · ↑ ↓ para moverte</p>
              <IconButton label="Cerrar detalle" onClick={() => setSeleccion(null)}>
                <X size={16} weight="bold" />
              </IconButton>
            </div>
            {detalle}
          </aside>
        ) : null}
      </div>

      {!ancho ? (
        <Sheet open={!!elegida} onOpenChange={(open) => !open && setSeleccion(null)} title="Detalle del movimiento" description="Bitácora de auditoría">
          {detalle}
        </Sheet>
      ) : null}
    </>
  );
}

function FilaEntrada({ fila, activa, onElegir }: { fila: Fila; activa: boolean; onElegir: () => void }) {
  const { entry } = fila;
  const sesion = ACCIONES_DE_SESION.has(entry.verb);
  return (
    <li>
      <button
        type="button"
        data-audit-fila={entry.id}
        onClick={onElegir}
        aria-pressed={activa}
        className={cn(
          "relative flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 outline-none",
          "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:shadow-[inset_0_0_0_2px_rgba(15,122,149,0.45)]",
          activa && "bg-brand-faint hover:bg-brand-faint before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-brand",
        )}
      >
        <EntryIcon entry={entry} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-[13.5px] leading-[1.35] text-ink">
            {entry.actor ? <span className={cn("font-semibold", entry.isSystem && "text-ink-2")}>{entry.actor} </span> : null}
            {entry.action}
          </span>
          <span className="tnum flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-3">
            <span>{timeLabel(entry.when)}</span>
            {!sesion ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{entry.entityLabel}</span>
              </>
            ) : null}
            {entry.reference && !sesion ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="code text-ink-2">{entry.reference}</span>
              </>
            ) : null}
            {entry.motivo ? (
              <span className="ml-1 inline-flex items-center gap-0.5 text-warning-text" title="Tiene motivo">
                <ChatCenteredText size={12} weight="fill" /> motivo
              </span>
            ) : null}
            {entry.changes.length ? <span className="ml-1 rounded-full bg-surface-3 px-1.5 text-[11px] text-ink-2">{entry.changes.length === 1 ? "1 cambio" : `${entry.changes.length} cambios`}</span> : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function EsqueletoLista({ filas }: { filas: number }) {
  return (
    <div className="flex flex-col divide-y divide-line" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className={cn("h-3.5", i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-2/3" : "w-1/2")} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Botón compacto que abre una lista de una sola opción (con "Todos" para quitar el filtro). */
function Desplegable({ label, valor, onChange, opciones }: { label: string; valor: string; onChange: (value: string) => void; opciones: Array<{ value: string; label: string; hint?: string }> }) {
  const actual = opciones.find((o) => o.value === valor);
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          type="button"
          className={cn(
            "press inline-flex h-8 max-w-[240px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium outline-none focus-visible:shadow-[var(--shadow-focus)] data-[state=open]:bg-surface-3",
            actual ? "bg-brand-soft text-brand-strong" : "bg-surface text-ink-2 shadow-card hover:bg-surface-2",
          )}
        >
          <span className="truncate">{actual ? `${label}: ${actual.label}` : label}</span>
          <CaretDown size={11} weight="bold" className="shrink-0" />
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content align="start" sideOffset={6} className="material scroll-thin z-50 max-h-[min(60vh,420px)] min-w-[220px] origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-y-auto rounded-[14px] p-1.5 shadow-pop data-[state=open]:animate-materialize">
          <RadixDropdown.Label className="px-2.5 pt-1 pb-1.5 text-[11.5px] font-semibold text-ink-3">{label}</RadixDropdown.Label>
          <RadixDropdown.RadioGroup value={valor} onValueChange={onChange}>
            {[{ value: "", label: "Todos" }, ...opciones].map((opcion) => (
              <RadixDropdown.RadioItem key={opcion.value || "todos"} value={opcion.value} className="group flex cursor-pointer select-none items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-[13.5px] text-ink outline-none data-[highlighted]:bg-brand data-[highlighted]:text-white">
                <span className="flex w-4 shrink-0 justify-center">
                  <RadixDropdown.ItemIndicator>
                    <Check size={13} weight="bold" />
                  </RadixDropdown.ItemIndicator>
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">{opcion.label}</span>
                  {"hint" in opcion && opcion.hint ? <span className="truncate text-[11.5px] text-ink-3 group-data-[highlighted]:text-white/80">{opcion.hint}</span> : null}
                </span>
              </RadixDropdown.RadioItem>
            ))}
          </RadixDropdown.RadioGroup>
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

/* Insignia de integridad: la verificación corre sola; al pulsarla explica qué significa y permite volver a verificar. */
function InsigniaIntegridad({ integridad, verificando, onVerificar }: { integridad: Integridad | null; verificando: boolean; onVerificar: () => void }) {
  const ok = integridad?.ok;
  const texto: ReactNode = !integridad ? (verificando ? "Verificando…" : "Integridad") : ok ? `Íntegra · ${fmt(integridad.total)} entradas` : "No íntegra";
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          data-integridad={!integridad ? "pendiente" : ok ? "ok" : "falla"}
          className={cn(
            "press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium outline-none focus-visible:shadow-[var(--shadow-focus)]",
            !integridad ? "bg-surface-3 text-ink-3" : ok ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger",
          )}
        >
          {integridad && !ok ? <ShieldWarning size={15} weight="fill" /> : <ShieldCheck size={15} weight={integridad ? "fill" : "regular"} />}
          {texto}
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content align="end" sideOffset={8} className="material z-50 w-[300px] origin-[var(--radix-popover-content-transform-origin)] rounded-[14px] p-3.5 shadow-pop data-[state=open]:animate-materialize">
          <p className="text-[13.5px] font-semibold text-ink">{!integridad ? "Verificación en curso" : ok ? "La bitácora está íntegra" : "La bitácora no pasó la verificación"}</p>
          <p className="mt-1 text-[12.5px] leading-[1.45] text-ink-2">
            {integridad && !ok ? `${integridadDetalle(integridad)}.` : "Cada entrada lleva un sello que encadena la anterior; si alguien cambiara o borrara una entrada fuera de la plataforma, la cadena dejaría de cuadrar."}
          </p>
          <Button variant="soft" size="sm" className="mt-3" icon={<ArrowsClockwise size={14} />} loading={verificando} onClick={onVerificar}>
            Volver a verificar
          </Button>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
