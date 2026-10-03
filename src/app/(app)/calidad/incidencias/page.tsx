"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { DownloadSimple, Plus, WarningDiamond } from "@phosphor-icons/react";
import { EstadoAccion, EstadoIncidencia, EstadoNc, ClasificacionNc } from "@/components/features/calidad/comun";
import { reportarIncidencia, usePuedeReportar } from "@/components/features/calidad/ReportarIncidencia";
import { FolioChip } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { Sheet } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Card, CardHeader, EmptyState, ErrorState, Skeleton, Stat, TableSkeleton } from "@/components/ui/Primitives";
import { StatusCell, StatusFlag } from "@/components/ui/StatusFlag";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { descargarCsv } from "@/lib/client/files";
import { fmt, fmtDate, fmtDateTime } from "@/lib/client/format";
import { useDebouncedValue, useParamChange } from "@/lib/client/hooks";
import { usePersonal } from "@/lib/client/personal";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { CLASIFICACIONES_NC, ESTADOS_INCIDENCIA, ESTADOS_NC, ORIGEN_AUTOMATICO_LABEL, ORIGENES_NC, TIPO_INCIDENCIA_LABEL, TIPOS_INCIDENCIA } from "@/lib/shared/calidad";
import { hoyLocal, sumarDias } from "@/lib/shared/fechas";

/*
 * Calidad › Incidencias y NC (Fase 11): tres listas (incidencias, no
 * conformidades, acciones correctivas) con filtros, busqueda y CSV, mas el
 * tablero de indicadores para quien tiene calidad:V total. Con alcance
 * "incidencias" cada lista trae solo lo propio (lo filtra el servidor).
 */

type Tab = "incidencias" | "nc" | "acciones" | "indicadores";

export default function CalidadIncidenciasPage() {
  return (
    <PageBody>
      <PageHeader title="Incidencias y no conformidades" description="Reporte y evaluación de incidencias, no conformidades con análisis de causa, acciones correctivas y su eficacia (ISO/IEC 17025 7.10 y 8.7)." />
      <RequireModule modules="calidad" ctx={{ objeto: "incidencia" }}>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Contenido />
        </Suspense>
      </RequireModule>
    </PageBody>
  );
}

const TABS: Tab[] = ["incidencias", "nc", "acciones", "indicadores"];

function Contenido() {
  const { alcance } = useSession();
  const params = useSearchParams();
  const total = alcance("calidad") !== "incidencias";
  const inicial = (params.get("tab") || "") as Tab;
  const [tab, setTab] = useState<Tab>(TABS.includes(inicial) ? inicial : "incidencias");
  useParamChange("tab", (value) => setTab(TABS.includes(value as Tab) ? (value as Tab) : "incidencias"));
  const opciones: Array<{ value: Tab; label: string }> = [
    { value: "incidencias", label: "Incidencias" },
    { value: "nc", label: "No conformidades" },
    { value: "acciones", label: "Acciones" },
    ...(total ? [{ value: "indicadores" as Tab, label: "Indicadores" }] : []),
  ];
  return (
    <>
      <SegmentedTabs value={tab} onChange={setTab} options={opciones} label="Listas de calidad" />
      {!total ? <p className="-mt-2 text-[13px] text-ink-3">Ves las incidencias que reportaste y las NC o acciones a tu cargo.</p> : null}
      {tab === "incidencias" ? <ListaIncidencias /> : tab === "nc" ? <ListaNc /> : tab === "acciones" ? <ListaAcciones /> : <Indicadores />}
    </>
  );
}

/* Periodo (chip de filtro): desde una fecha relativa a hoy. */
const PERIODOS = [
  { value: "", label: "Cualquier fecha" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "anio", label: "Este año" },
];
const desdePeriodo = (periodo: string): string => (!periodo ? "" : periodo === "anio" ? `${hoyLocal().slice(0, 4)}-01-01` : sumarDias(hoyLocal(), -Number(periodo)));
const grupoPeriodo = (value: string, onChange: (v: string) => void): FilterGroup => ({ key: "periodo", label: "Periodo", value, defaultValue: "", onChange, options: PERIODOS });

function BotonCsv({ ruta, nombre, query }: { ruta: string; nombre: string; query: URLSearchParams }) {
  const { token } = useSession();
  const [cargando, setCargando] = useState(false);
  return (
    <Button
      variant="secondary"
      icon={<DownloadSimple size={16} />}
      loading={cargando}
      onClick={async () => {
        setCargando(true);
        const q = new URLSearchParams(query);
        q.set("formato", "csv");
        await descargarCsv(`${API_BASE_URL}${ruta}?${q.toString()}`, token, `${nombre}-${hoyLocal()}.csv`);
        setCargando(false);
      }}
    >
      CSV
    </Button>
  );
}

/* ---------- Incidencias ---------- */

function ListaIncidencias() {
  const { token } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const puedeReportar = usePuedeReportar();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState(params.get("filtro") === "por_evaluar" ? "por_evaluar" : "");
  const [tipo, setTipo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [mias, setMias] = useState(false);
  const [anuladas, setAnuladas] = useState(false);
  const debounced = useDebouncedValue(search);
  useParamChange("filtro", (value) => setEstado(value === "por_evaluar" ? value : ""));
  const query = new URLSearchParams({ search: debounced.trim() });
  if (estado) query.set("estado", estado);
  if (tipo) query.set("tipo", tipo);
  if (periodo) query.set("desde", desdePeriodo(periodo));
  if (mias) query.set("mias", "1");
  if (anuladas) query.set("anuladas", "1");
  const recurso = useResource<ApiRecord>("calidad", () => getJsonAuth(`${API_BASE_URL}/calidad/incidencias?${query.toString()}`, token), { enabled: !!token, deps: [query.toString()] });
  const items = recurso.data?.items as ApiRecord[] | undefined;
  const groups: FilterGroup[] = [
    { key: "estado", label: "Estado", value: estado, defaultValue: "", onChange: setEstado, options: [{ value: "", label: "Todas" }, { value: "por_evaluar", label: "Por evaluar", tone: "warning" }, ...Object.entries(ESTADOS_INCIDENCIA).filter(([k]) => k !== "anulada").map(([value, e]) => ({ value, label: e.label }))] },
    { key: "tipo", label: "Tipo", value: tipo, defaultValue: "", onChange: setTipo, options: [{ value: "", label: "Todos" }, ...TIPOS_INCIDENCIA] },
    grupoPeriodo(periodo, setPeriodo),
  ];
  const toggles: FilterToggle[] = [
    ...(recurso.data?.alcance === "total" ? [{ key: "mias", label: "Solo las que reporté", checked: mias, onChange: setMias }] : []),
    { key: "anuladas", label: "Mostrar anuladas", checked: anuladas, onChange: setAnuladas },
  ];
  return (
    <>
      <Toolbar
        end={
          <>
            <BotonCsv ruta="/calidad/incidencias" nombre="incidencias" query={query} />
            {puedeReportar ? (
              <Button icon={<WarningDiamond size={16} />} onClick={() => reportarIncidencia()}>
                Reportar incidencia
              </Button>
            ) : null}
          </>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, descripción o quién reportó" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>
      <TableShell footer={items ? `${fmt(items.length)} incidencias` : undefined}>
        {recurso.error ? (
          <ErrorState message={recurso.error} onRetry={recurso.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<WarningDiamond size={20} />} title={search || estado || tipo ? "Sin coincidencias" : "Sin incidencias"} description="Las incidencias reportadas aparecen aquí; también las que genera el sistema (desviaciones, equipos no aptos, alertas de integridad)." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Tipo</Th>
                <Th>Ocurrió</Th>
                <Th>Reportó</Th>
                <Th>Estado</Th>
                <Th>NC</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/calidad/incidencias/${item.id}`)} className={item.estado === "anulada" ? "opacity-60" : undefined} data-incidencia={item.id}>
                  <Td>
                    <FolioChip type="INC" num={item.folio_num} />
                  </Td>
                  <Td className="max-w-[360px]">
                    <CellPrimary title={TIPO_INCIDENCIA_LABEL[String(item.tipo)] || String(item.tipo)} subtitle={String(item.descripcion || "")} />
                  </Td>
                  <Td muted>{fmtDateTime(item.fecha_hora_ocurrencia)}</Td>
                  <Td>
                    <CellPrimary title={item.reportada_nombre || "—"} subtitle={item.origen_automatico ? ORIGEN_AUTOMATICO_LABEL[String(item.origen_automatico)] : undefined} />
                  </Td>
                  <Td>
                    <StatusCell>
                      <EstadoIncidencia estado={item.estado} />
                      {item.origen_automatico ? <StatusFlag kind="info" label="Generada automáticamente" detail={ORIGEN_AUTOMATICO_LABEL[String(item.origen_automatico)]} data-automatica /> : null}
                    </StatusCell>
                  </Td>
                  <Td>{item.nc_folio ? <FolioChip type="NC" num={item.nc_folio} /> : <span className="text-ink-4">—</span>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>
    </>
  );
}

/* ---------- No conformidades ---------- */

function ListaNc() {
  const { token, can } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState(params.get("estado") && ESTADOS_NC[params.get("estado") || ""] ? String(params.get("estado")) : "abiertas");
  const [clasificacion, setClasificacion] = useState("");
  const [origen, setOrigen] = useState("");
  const [tipo, setTipo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [mias, setMias] = useState(false);
  const [anuladas, setAnuladas] = useState(false);
  const [nueva, setNueva] = useState(false);
  const debounced = useDebouncedValue(search);
  const query = new URLSearchParams({ search: debounced.trim() });
  if (estado) query.set("estado", estado);
  if (clasificacion) query.set("clasificacion", clasificacion);
  if (origen) query.set("origen", origen);
  if (tipo) query.set("tipo", tipo);
  if (periodo) query.set("desde", desdePeriodo(periodo));
  if (mias) query.set("mias", "1");
  if (anuladas) query.set("anuladas", "1");
  const recurso = useResource<ApiRecord>("calidad", () => getJsonAuth(`${API_BASE_URL}/calidad/nc?${query.toString()}`, token), { enabled: !!token, deps: [query.toString()] });
  const items = recurso.data?.items as ApiRecord[] | undefined;
  const puedeCrear = can("calidad", "R", { objeto: "nc" }) || can("calidad", "G", { objeto: "nc" });
  const groups: FilterGroup[] = [
    { key: "estado", label: "Estado", value: estado, defaultValue: "abiertas", onChange: setEstado, options: [{ value: "abiertas", label: "Sin cerrar" }, { value: "", label: "Todas" }, ...Object.entries(ESTADOS_NC).filter(([k]) => k !== "anulada").map(([value, e]) => ({ value, label: e.label }))] },
    { key: "clasificacion", label: "Clasificación", value: clasificacion, defaultValue: "", onChange: setClasificacion, options: [{ value: "", label: "Todas" }, ...CLASIFICACIONES_NC] },
    { key: "origen", label: "Origen", value: origen, defaultValue: "", onChange: setOrigen, options: [{ value: "", label: "Todos" }, ...ORIGENES_NC] },
    { key: "tipo", label: "Tipo de incidencia", value: tipo, defaultValue: "", onChange: setTipo, options: [{ value: "", label: "Todos" }, ...TIPOS_INCIDENCIA] },
    grupoPeriodo(periodo, setPeriodo),
  ];
  const toggles: FilterToggle[] = [
    ...(recurso.data?.alcance === "total" ? [{ key: "mias", label: "Solo a mi cargo", checked: mias, onChange: setMias }] : []),
    { key: "anuladas", label: "Mostrar anuladas", checked: anuladas, onChange: setAnuladas },
  ];
  return (
    <>
      <Toolbar
        end={
          <>
            <BotonCsv ruta="/calidad/nc" nombre="no-conformidades" query={query} />
            {puedeCrear ? (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => setNueva(true)}>
                Nueva NC
              </Button>
            ) : null}
          </>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por folio, descripción o requisito" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>
      <TableShell footer={items ? `${fmt(items.length)} no conformidades` : undefined}>
        {recurso.error ? (
          <ErrorState message={recurso.error} onRetry={recurso.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !items.length ? (
          <EmptyState icon={<WarningDiamond size={20} />} title="Sin no conformidades" description="Se abren al escalar una incidencia o directamente (queja, auditoría interna, revisión)." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Folio</Th>
                <Th>Descripción</Th>
                <Th>Clasificación</Th>
                <Th>Responsable</Th>
                <Th>Acciones</Th>
                <Th>Estado</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/calidad/nc/${item.id}`)} className={item.estado === "anulada" ? "opacity-60" : undefined} data-nc={item.id}>
                  <Td>
                    <FolioChip type="NC" num={item.folio_num} />
                  </Td>
                  <Td className="max-w-[380px]">
                    <CellPrimary title={String(item.descripcion || "")} subtitle={`${ORIGENES_NC.find((o) => o.value === item.origen)?.label || item.origen} · ${fmtDate(item.creada_en)}`} />
                  </Td>
                  <Td>
                    <ClasificacionNc valor={item.clasificacion} />
                  </Td>
                  <Td muted>{item.responsable_nombre || "Sin nombrar"}</Td>
                  <Td className="tnum">
                    {fmt(item.acciones)}
                    {Number(item.acciones_abiertas) ? <span className="text-ink-3"> · {fmt(item.acciones_abiertas)} abiertas</span> : null}
                  </Td>
                  <Td>
                    <StatusCell>
                      <EstadoNc estado={item.estado} />
                      {Number(item.reaperturas) ? <StatusFlag kind="aviso" label={`${item.reaperturas} reapertura${Number(item.reaperturas) > 1 ? "s" : ""}`} detail="La verificación de eficacia resultó no eficaz y la NC volvió a análisis." data-reaperturas={String(item.reaperturas)} /> : null}
                    </StatusCell>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>
      {nueva ? <NuevaNcSheet onClose={() => setNueva(false)} /> : null}
    </>
  );
}

function NuevaNcSheet({ onClose }: { onClose: () => void }) {
  const { token, can } = useSession();
  const router = useRouter();
  const personal = usePersonal();
  const [open, setOpen] = useState(true);
  const [origen, setOrigen] = useState("queja");
  const [descripcion, setDescripcion] = useState("");
  const [clasificacion, setClasificacion] = useState("");
  const [requisito, setRequisito] = useState("");
  const [responsable, setResponsable] = useState("");
  const [enviando, setEnviando] = useState(false);
  const cerrar = () => {
    setOpen(false);
    window.setTimeout(onClose, 250);
  };
  const crear = async () => {
    setEnviando(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/calidad/nc`, token, { origen, descripcion, clasificacion: clasificacion || null, requisito_incumplido: requisito, responsable_id: responsable ? Number(responsable) : null });
      toast.success(String(data.message));
      invalidate("calidad");
      router.push(`/calidad/nc/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir la NC");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : cerrar())}
      title="Nueva no conformidad"
      description="Para una queja, un hallazgo de auditoría interna o de revisión. Las de una incidencia se abren al evaluarla."
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={crear} loading={enviando} disabled={descripcion.trim().length < 20}>
            Abrir NC
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Origen" htmlFor="nc-origen" required>
          <Select id="nc-origen" value={origen} onChange={(event) => setOrigen(event.target.value)}>
            {ORIGENES_NC.filter((o) => o.value !== "incidencia").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="nc-desc" required hint="Al menos 20 caracteres.">
          <Textarea id="nc-desc" rows={4} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
        </Field>
        <Field label="Requisito incumplido" htmlFor="nc-req" hint="Cláusula ISO, procedimiento o formato.">
          <Textarea id="nc-req" rows={2} value={requisito} onChange={(event) => setRequisito(event.target.value)} />
        </Field>
        <Field label="Clasificación" htmlFor="nc-clasif">
          <Select id="nc-clasif" value={clasificacion} onChange={(event) => setClasificacion(event.target.value)}>
            <option value="">Sin clasificar</option>
            {CLASIFICACIONES_NC.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} — {c.hint}
              </option>
            ))}
          </Select>
        </Field>
        {can("calidad", "G", { objeto: "nc" }) ? (
        <Field label="Responsable" htmlFor="nc-resp" hint="Opcional; cambiarlo después pide motivo.">
          <Select id="nc-resp" value={responsable} onChange={(event) => setResponsable(event.target.value)}>
            <option value="">Sin nombrar</option>
            {personal.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.rol ? ` · ${p.rol}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ---------- Acciones correctivas ---------- */

function ListaAcciones() {
  const { token } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [estado, setEstado] = useState("");
  const [mias, setMias] = useState(params.get("mias") === "1");
  const [vencidas, setVencidas] = useState(false);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState("");
  const debounced = useDebouncedValue(search);
  const query = new URLSearchParams({ search: debounced.trim() });
  if (estado) query.set("estado", estado);
  if (periodo) query.set("desde", desdePeriodo(periodo));
  if (mias) query.set("mias", "1");
  if (vencidas) query.set("vencidas", "1");
  const recurso = useResource<ApiRecord>("calidad", () => getJsonAuth(`${API_BASE_URL}/calidad/acciones?${query.toString()}`, token), { enabled: !!token, deps: [query.toString()] });
  const items = recurso.data?.items as ApiRecord[] | undefined;
  const groups: FilterGroup[] = [
    {
      key: "estado",
      label: "Estado",
      value: estado,
      defaultValue: "",
      onChange: setEstado,
      options: [
        { value: "", label: "Todas" },
        { value: "pendiente", label: "Pendientes" },
        { value: "en_proceso", label: "En proceso" },
        { value: "implementada", label: "Implementadas" },
        { value: "cancelada", label: "Canceladas" },
      ],
    },
    grupoPeriodo(periodo, setPeriodo),
  ];
  const toggles: FilterToggle[] = [
    { key: "mias", label: "Solo las mías", checked: mias, onChange: setMias },
    { key: "vencidas", label: "Solo vencidas", checked: vencidas, onChange: setVencidas },
  ];
  return (
    <>
      <Toolbar end={<BotonCsv ruta="/calidad/acciones" nombre="acciones-correctivas" query={query} />}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por acción o folio de la NC" className="w-full md:w-[320px]" />
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>
      <TableShell footer={items ? `${fmt(items.length)} acciones` : undefined}>
        {recurso.error ? (
          <ErrorState message={recurso.error} onRetry={recurso.reload} />
        ) : !items ? (
          <TableSkeleton cols={5} />
        ) : !items.length ? (
          <EmptyState compact title="Sin acciones correctivas" description="Las acciones se definen en el análisis de causa de cada NC." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>NC</Th>
                <Th>Acción</Th>
                <Th>Responsable</Th>
                <Th>Compromiso</Th>
                <Th>Estado</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((item) => (
                <Tr key={item.id} interactive onClick={() => router.push(`/calidad/nc/${item.nc_id}#acciones`)} data-accion={item.id}>
                  <Td>
                    <FolioChip type="NC" num={item.nc_folio} />
                  </Td>
                  <Td className="max-w-[420px]">
                    <CellPrimary title={String(item.descripcion || "")} />
                  </Td>
                  <Td muted>{item.responsable_nombre || "—"}</Td>
                  <Td className={item.vencida ? "font-medium text-danger" : "text-ink-3"}>{fmtDate(item.fecha_compromiso)}</Td>
                  <Td>
                    <StatusCell>
                      <EstadoAccion estado={item.estado} />
                      {item.vencida ? <StatusFlag kind="error" label="Vencida" detail={`Fecha compromiso: ${fmtDate(item.fecha_compromiso)}`} data-vencida /> : null}
                    </StatusCell>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>
    </>
  );
}

/* ---------- Indicadores (calidad:V total) ---------- */

function Barras({ titulo, filas }: { titulo: string; filas: Array<{ clave: string; label: string; total: number }> }) {
  const max = Math.max(1, ...filas.map((f) => f.total));
  return (
    <Card>
      <CardHeader title={titulo} />
      {!filas.length ? (
        <p className="text-[13px] text-ink-3">Sin datos todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filas.map((f) => (
            <li key={f.clave} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-ink-2">{f.label}</span>
                <span className="tnum font-medium text-ink">{fmt(f.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(f.total / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Indicadores() {
  const { token } = useSession();
  const recurso = useResource<ApiRecord>("calidad", () => getJsonAuth(`${API_BASE_URL}/calidad/indicadores`, token), { enabled: !!token });
  const d = recurso.data;
  if (recurso.error) return <ErrorState message={recurso.error} onRetry={recurso.reload} />;
  if (!d) return <Skeleton className="h-64 w-full" />;
  const estados = (d.incidencias_por_estado as ApiRecord[]).map((e) => ({ ...e, label: ESTADOS_INCIDENCIA[String(e.clave)]?.label || String(e.clave) })) as Array<{ clave: string; label: string; total: number }>;
  return (
    <div className="flex flex-col gap-4" data-indicadores>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="NC abiertas" value={fmt(d.nc_abiertas)} tone={Number(d.nc_abiertas) ? "warning" : "neutral"} />
        <Stat label="NC cerradas" value={fmt(d.nc_cerradas)} tone="success" />
        <Stat label="Días promedio al cierre" value={d.dias_promedio_cierre === null ? "—" : fmt(d.dias_promedio_cierre)} />
        <Stat label="Acciones vencidas" value={fmt(d.acciones_vencidas)} tone={Number(d.acciones_vencidas) ? "danger" : "neutral"} hint={`${fmt(d.acciones_abiertas)} abiertas`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reaperturas (no eficaz)" value={fmt(d.reaperturas)} tone={Number(d.reaperturas) ? "warning" : "neutral"} />
        <Stat label="Incidencias automáticas" value={fmt(d.incidencias_automaticas)} hint="Desviación, rechazo, equipo no apto, integridad" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Barras titulo="NC por clasificación" filas={d.por_clasificacion as Array<{ clave: string; label: string; total: number }>} />
        <Barras titulo="NC por tipo de incidencia u origen" filas={d.por_tipo as Array<{ clave: string; label: string; total: number }>} />
        <Barras titulo="Incidencias por estado" filas={estados} />
      </div>
    </div>
  );
}
