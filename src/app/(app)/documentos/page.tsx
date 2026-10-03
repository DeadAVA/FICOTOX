"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { folioNc } from "@/lib/shared/calidad";
import { FEATURES } from "@/lib/shared/features";
import { toast } from "sonner";
import { ArrowsClockwise, FileText, PaperPlaneTilt, PencilSimple, Plus, Prohibit, SealCheck, ArrowSquareOut, ClockCounterClockwise, ArrowUUpLeft, CheckCircle, DownloadSimple, Lightbulb, Megaphone } from "@phosphor-icons/react";
import { RecordHistory } from "@/components/features/audit/RecordHistory";
import { IncidenciasDelRegistro } from "@/components/features/calidad/IncidenciasDelRegistro";
import { useMenuReportar } from "@/components/features/calidad/ReportarIncidencia";
import { DocumentoSheet } from "@/components/features/documentos/DocumentoSheet";
import { StateBadge } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { DateInput } from "@/components/ui/DateInput";
import { ActionMenu, Dialog, Sheet, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { StatusCell, StatusFlag } from "@/components/ui/StatusFlag";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt, fmtDate, normalizeText, todayIso } from "@/lib/client/format";
import { useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { DOCUMENT_AREAS, DOCUMENT_TYPES } from "@/lib/shared/sgc";
import { CampoIdentidad } from "@/components/session/Reautenticar";

type Vista = "maestra" | "todos" | "propuestas" | "reportes";

const REPORTE_ESTADOS: Record<string, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "warning" },
  aprobado: { label: "Aprobado", tone: "brand" },
  publicado: { label: "Publicado", tone: "success" },
};

export default function DocumentosPage() {
  // Módulo apagado (ver src/lib/shared/features.ts): la ruta no existe para el usuario.
  if (!FEATURES.documentos) notFound();
  return (
    <PageBody>
      <PageHeader title="Documentos" description="Control de documentos del sistema de gestión de calidad (ISO/IEC 17025 8.3): lista maestra, revisiones, aprobación y obsolescencia." />
      <RequireModule modules="documentos">
        <Suspense fallback={<TableSkeleton />}>
          <DocumentosContent />
        </Suspense>
      </RequireModule>
    </PageBody>
  );
}

function DocumentosContent() {
  const { token, can, user } = useSession();
  const prompt = usePrompt();
  const initialFilter = useInitialParam("filtro");
  const [vista, setVista] = useState<Vista>("maestra");
  const [search, setSearch] = useState(useInitialParam("buscar"));
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [soloVencidos, setSoloVencidos] = useState(initialFilter === "vencidos");
  useParamChange("buscar", (value) => setSearch(value));
  useParamChange("filtro", (value) => {
    setVista("maestra");
    setSoloVencidos(value === "vencidos");
  });
  const modal = useOpenState<ApiRecord>();
  const detail = useOpenState<ApiRecord>();
  const [aprobar, setAprobar] = useState<{ item: ApiRecord; cargo: string; vigencia: string } | null>(null);
  const [claveAprobar, setClaveAprobar] = useState("");
  // Fase 7: publicar con distribucion y aceptar propuestas.
  const [publicar, setPublicar] = useState<{ item: ApiRecord; vigencia: string; usuarios: number[]; roles: number[] } | null>(null);
  const [aceptar, setAceptar] = useState<{ item: ApiRecord; asignado: string; clave: string; tipo: string; area: string; requiere: boolean } | null>(null);
  const [cuentas, setCuentas] = useState<ApiRecord[]>([]);
  const [rolesLista, setRolesLista] = useState<ApiRecord[]>([]);
  const documentoInicial = useInitialParam("documento");
  useUrlTrigger("nuevo", () => modal.open(null));

  const resource = useResource<{ docs: ApiRecord[]; maestra: ApiRecord[]; reportes: ApiRecord[]; summary: ApiRecord; propuestas: ApiRecord[] }>(
    "documentos",
    async () => {
      const [docs, maestra, reportes, summary, propuestas] = await Promise.all([
        getJsonAuth(`${API_BASE_URL}/documentos-sgc`, token),
        getJsonAuth(`${API_BASE_URL}/documentos-sgc/lista-maestra`, token),
        getJsonAuth(`${API_BASE_URL}/documents`, token).catch(() => ({}) as ApiRecord),
        getJsonAuth(`${API_BASE_URL}/documentos-sgc/summary`, token).catch(() => ({}) as ApiRecord),
        getJsonAuth(`${API_BASE_URL}/documentos-sgc/propuestas`, token).catch(() => ({}) as ApiRecord),
      ]);
      return { docs: (docs.items || []) as ApiRecord[], maestra: (maestra.items || []) as ApiRecord[], reportes: (reportes.items || []) as ApiRecord[], summary: summary as ApiRecord, propuestas: (propuestas.items || []) as ApiRecord[] };
    },
    { enabled: !!token },
  );

  const rows = useMemo(() => {
    const base = vista === "maestra" ? resource.data?.maestra || [] : resource.data?.docs || [];
    const term = normalizeText(search);
    const today = todayIso();
    const vencido = (d: ApiRecord) => !!d.fecha_proxima_revision && String(d.fecha_proxima_revision).slice(0, 10) < today;
    return base.filter((d) => (!term || normalizeText(`${d.clave} ${d.titulo} ${d.descripcion || ""}`).includes(term)) && (!tipo || d.tipo === tipo) && (!estado || d.estado === estado) && (!soloVencidos || vencido(d)));
  }, [resource.data, vista, search, tipo, estado, soloVencidos]);
  const reportes = useMemo(() => {
    const term = normalizeText(search);
    return (resource.data?.reportes || []).filter((r) => !term || normalizeText(`${r.codigo || ""} ${r.tipo_mantenimiento || ""} ${r.estado || ""}`).includes(term));
  }, [resource.data, search]);
  const summary = resource.data?.summary || {};

  const canCreate = can("documentos", "C", { objeto: "documento", borrador: true });
  const canUpdate = can("documentos", "E", { objeto: "documento", borrador: true });
  const canDelete = can("documentos", "AN");
  const canApprove = can("documentos", "A");
  const canCalidad = can("documentos", "G");
  const canTecnica = can("documentos", "R");
  const canView = can("documentos", "V");

  const act = async (path: string, body: Record<string, unknown>, ok: string) => {
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/documentos-sgc/${path}`, token, body);
      toast.success(String(data.message || ok));
      invalidate("documentos");
      detail.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción");
    }
  };

  const enviarRevision = (item: ApiRecord) => act(`${item.id}/enviar-revision`, {}, "Enviado a revisión de calidad");
  const revisar = async (item: ApiRecord, tipoRev: "calidad" | "tecnica") => {
    const observaciones = await prompt({ title: tipoRev === "calidad" ? `Revisión de calidad de ${item.clave} rev. ${item.revision}` : `Revisión técnica de ${item.clave} rev. ${item.revision}`, description: "Observaciones opcionales. El documento avanza al siguiente paso.", label: "Observaciones", minLength: 0, confirmLabel: tipoRev === "calidad" ? "Revisión de calidad hecha" : "Revisión técnica hecha" });
    if (observaciones !== null) await act(`${item.id}/revisar-${tipoRev}`, { observaciones }, "Revisión registrada");
  };
  const devolver = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Devolver ${item.clave} rev. ${item.revision} a borrador`, description: "Quien elabora verá tus observaciones y podrá corregirlo.", label: "Observaciones", confirmLabel: "Devolver con observaciones", tone: "danger" });
    if (motivo) await act(`${item.id}/devolver`, { motivo }, "Documento devuelto");
  };
  const obsoletar = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Declarar obsoleto ${item.clave} rev. ${item.revision}`, description: "Queda como solicitud: la aprueba alguien con permiso de aprobar documentos. Al aprobarse deja de estar vigente y se conserva como obsoleto.", confirmLabel: "Solicitar obsolescencia", tone: "danger" });
    if (motivo) await act(`${item.id}/obsoletar`, { motivo }, "Obsolescencia solicitada");
  };
  const confirmarLectura = (item: ApiRecord) => act(`${item.id}/leido`, {}, "Lectura confirmada");
  const proponer = async (item?: ApiRecord) => {
    const titulo = item ? String(item.titulo || "") : await prompt({ title: "Proponer documento", description: "Título del documento que propones crear.", label: "Título", confirmLabel: "Continuar" });
    if (!titulo) return;
    const motivo = await prompt({ title: item ? `Solicitar cambio de ${item.clave}` : "Proponer documento", description: "¿Por qué se necesita? Mejora Continua la acepta o la rechaza.", label: "Motivo", confirmLabel: item ? "Solicitar cambio" : "Proponer" });
    if (!motivo) return;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/documentos-sgc/propuestas`, token, item ? { tipo: "cambio", documento_id: item.id, titulo: `Cambio a ${item.clave}: ${titulo}`, motivo } : { tipo: "nuevo", titulo, motivo });
      toast.success(String(data.message || "Propuesta registrada"));
      invalidate("documentos");
      detail.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la propuesta");
    }
  };
  const cargarDestinatarios = async () => {
    const [c, r] = await Promise.all([getJsonAuth(`${API_BASE_URL}/cuentas/activas`, token).catch(() => ({}) as ApiRecord), getJsonAuth(`${API_BASE_URL}/admin/roles`, token).catch(() => ({}) as ApiRecord)]);
    setCuentas((c.items || []) as ApiRecord[]);
    setRolesLista((r.items || []) as ApiRecord[]);
  };
  const abrirPublicar = async (item: ApiRecord) => {
    await cargarDestinatarios();
    setPublicar({ item, vigencia: "", usuarios: [], roles: [] });
  };
  const confirmarPublicar = async () => {
    if (!publicar) return;
    armarReauth(claveAprobar ? { password: claveAprobar } : null);
    setClaveAprobar("");
    await act(`${publicar.item.id}/publicar`, { fecha_vigencia: publicar.vigencia || null, usuarios: publicar.usuarios, roles: publicar.roles }, "Documento publicado");
    setPublicar(null);
  };
  const abrirAceptar = async (item: ApiRecord) => {
    await cargarDestinatarios();
    setAceptar({ item, asignado: "", clave: "", tipo: "", area: "", requiere: false });
  };
  const confirmarAceptar = async () => {
    if (!aceptar) return;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/documentos-sgc/propuestas/${aceptar.item.id}/aceptar`, token, { asignado_a: Number(aceptar.asignado) || null, clave: aceptar.clave, tipo: aceptar.tipo, area: aceptar.area, requiere_revision_tecnica: aceptar.requiere });
      toast.success(String(data.message || "Propuesta aceptada"));
      invalidate("documentos");
      setAceptar(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo aceptar la propuesta");
    }
  };
  const rechazarPropuesta = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Rechazar la propuesta "${item.titulo}"`, label: "Motivo", confirmLabel: "Rechazar", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/documentos-sgc/propuestas/${item.id}/rechazar`, token, { motivo });
      toast.success("Propuesta rechazada");
      invalidate("documentos");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo rechazar la propuesta");
    }
  };
  const exportarCsv = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/documentos-sgc/lista-maestra?formato=csv`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`No se pudo exportar (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `lista-maestra-${todayIso()}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo exportar la lista maestra");
    }
  };
  const cancelar = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Cancelar borrador ${item.clave} rev. ${item.revision}`, confirmLabel: "Cancelar borrador", tone: "danger" });
    if (motivo) await act(`${item.id}/cancelar`, { motivo }, "Borrador cancelado");
  };
  const nuevaRevision = async (item: ApiRecord) => {
    const cambios = await prompt({ title: `Nueva revisión de ${item.clave}`, description: "Describe qué cambia respecto a la revisión vigente; se crea un borrador con revisión +1.", label: "Cambios", confirmLabel: "Crear revisión" });
    if (cambios) await act(`${item.id}/nueva-revision`, { cambios, elaboro: { nombre: formatActiveUserSignature() } }, "Nueva revisión creada");
  };
  const confirmarAprobacion = async () => {
    if (!aprobar) return;
    armarReauth(claveAprobar ? { password: claveAprobar } : null);
    setClaveAprobar("");
    await act(`${aprobar.item.id}/aprobar`, { aprobo: { nombre: user?.nombre || user?.email || "", cargo: aprobar.cargo || null } }, "Documento aprobado");
    setAprobar(null);
  };
  const abrirArchivo = (item: ApiRecord) => {
    if (!item.archivo_nombre) return toast.error("El documento no tiene archivo adjunto");
    void openProtectedFile(`${API_BASE_URL}/documentos-sgc/${item.id}/archivo`, token, `${item.clave}-${item.revision}`);
  };
  const abrirReporte = (item: ApiRecord) => {
    const raw = String(item.archivo_url || "");
    const url = raw.startsWith("/") ? raw : `${API_BASE_URL}/documents/files/${raw.split("/").pop()}`;
    void openProtectedFile(url, token, String(item.codigo || "reporte"));
  };
  // Fase 7: el Inicio ("Documentos por leer") abre la ficha con ?documento=<id>.
  useEffect(() => {
    if (documentoInicial && token) void abrirDetalle({ id: Number(documentoInicial) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentoInicial, token]);
  async function abrirDetalle(item: ApiRecord) {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/documentos-sgc/${item.id}`, token);
      detail.open((data.item || item) as ApiRecord);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el documento");
    }
  }

  const reportar = useMenuReportar();
  const menuFor = (item: ApiRecord): MenuItem[] => {
    const items: MenuItem[] = [];
    const estadoDoc = String(item.estado);
    items.push({ label: "Ver detalle e historial", description: "Revisiones, aprobaciones y bitácora", icon: <ClockCounterClockwise size={16} weight="duotone" />, tone: "brand", onSelect: () => abrirDetalle(item) });
    if (item.archivo_nombre) items.push({ label: "Abrir archivo", description: String(item.archivo_original || item.archivo_nombre), icon: <ArrowSquareOut size={16} weight="duotone" />, onSelect: () => abrirArchivo(item) });
    if (canUpdate && estadoDoc === "borrador") items.push({ label: "Editar", description: "Título, descripción o archivo", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => modal.open(item) });
    if (canUpdate && estadoDoc === "borrador") items.push({ label: "Enviar a revisión", description: "Pasa a revisión de calidad", icon: <PaperPlaneTilt size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => enviarRevision(item) });
    if (canCalidad && estadoDoc === "revision_calidad") items.push({ label: "Revisión de calidad hecha", description: item.requiere_revision_tecnica ? "Pasa a revisión técnica" : "Pasa a aprobación", icon: <SealCheck size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => revisar(item, "calidad") });
    if (canTecnica && estadoDoc === "revision_tecnica") items.push({ label: "Revisión técnica hecha", description: "Pasa a aprobación", icon: <SealCheck size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => revisar(item, "tecnica") });
    if ((canCalidad && estadoDoc === "revision_calidad") || (canTecnica && estadoDoc === "revision_tecnica")) items.push({ label: "Devolver con observaciones", description: "Regresa a borrador", icon: <ArrowUUpLeft size={16} weight="duotone" />, tone: "danger", onSelect: () => devolver(item) });
    if (canApprove && estadoDoc === "por_aprobar") items.push({ label: "Aprobar", description: "Después se publica", icon: <SealCheck size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => setAprobar({ item, cargo: "", vigencia: "" }) });
    if (canCalidad && estadoDoc === "aprobado") items.push({ label: "Publicar y distribuir…", description: "Entra a la lista maestra (vigente)", icon: <Megaphone size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => abrirPublicar(item) });
    if (canCreate && ["vigente", "obsoleto"].includes(estadoDoc)) items.push({ label: "Nueva revisión…", description: "Borrador con revisión +1", icon: <ArrowsClockwise size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => nuevaRevision(item) });
    if (canView && estadoDoc === "vigente") items.push({ label: "Solicitar cambio…", description: "Mejora Continua la acepta o la rechaza", icon: <Lightbulb size={16} weight="duotone" />, onSelect: () => proponer(item) });
    if (canCalidad && estadoDoc === "vigente") items.push({ label: "Declarar obsoleto…", description: "Queda como solicitud a quien aprueba", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => obsoletar(item) });
    items.push(...reportar("documentos_sgc", item.id, `${String(item.clave)} rev. ${String(item.revision)}`));
    if (canDelete && ["borrador", "revision_calidad", "revision_tecnica", "por_aprobar", "aprobado"].includes(estadoDoc)) items.push({ label: "Cancelar borrador…", description: "Queda cancelado con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => cancelar(item) });
    return items;
  };

  const docGroups: FilterGroup[] = [
    { key: "tipo", label: "Tipo de documento", value: tipo, defaultValue: "", onChange: setTipo, options: [{ value: "", label: "Todos" }, ...DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))] },
    ...(vista === "todos"
      ? [{ key: "estado", label: "Estado", value: estado, defaultValue: "", onChange: setEstado, options: [{ value: "", label: "Todos" }, { value: "borrador", label: "Borrador" }, { value: "revision_calidad", label: "Revisión de calidad" }, { value: "revision_tecnica", label: "Revisión técnica" }, { value: "por_aprobar", label: "Por aprobar" }, { value: "aprobado", label: "Aprobado" }, { value: "vigente", label: "Vigente" }, { value: "obsoleto", label: "Obsoleto" }, { value: "cancelado", label: "Cancelado" }] } as FilterGroup]
      : []),
  ];
  const docToggles: FilterToggle[] = vista === "maestra" ? [{ key: "vencidos", label: "Solo con revisión vencida", description: resource.data ? `${fmt(summary.revision_vencida || 0)} documentos vigentes con revisión periódica pendiente` : undefined, checked: soloVencidos, onChange: setSoloVencidos }] : [];

  const detailItem = detail.payload;

  return (
    <>
      <Toolbar
        end={
          <>
            {vista === "maestra" ? (
              <Button variant="secondary" icon={<DownloadSimple size={16} />} onClick={exportarCsv}>
                Exportar CSV
              </Button>
            ) : null}
            {canView ? (
              <Button variant="secondary" icon={<Lightbulb size={16} />} onClick={() => proponer()}>
                Proponer documento
              </Button>
            ) : null}
            {canCreate ? (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
                Nuevo documento
              </Button>
            ) : null}
          </>
        }
      >
        <SegmentedTabs<Vista>
          value={vista}
          onChange={setVista}
          options={[
            { value: "maestra", label: "Lista maestra", count: resource.data ? Number(summary.vigentes || 0) : null },
            { value: "todos", label: "Todas las revisiones", count: resource.data ? resource.data.docs.length : null },
            { value: "propuestas", label: "Propuestas", count: resource.data ? resource.data.propuestas.filter((p) => p.estado === "pendiente").length : null },
            { value: "reportes", label: "Reportes de mantenimiento" },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por clave o título" className="w-full md:w-[260px]" />
        {vista !== "reportes" && vista !== "propuestas" ? (
          <>
            <FilterMenu groups={docGroups} toggles={docToggles} />
            <FilterChips groups={docGroups} toggles={docToggles} />
          </>
        ) : null}
      </Toolbar>

      {vista === "propuestas" ? (
        <TableShell footer={resource.data ? `${fmt(resource.data.propuestas.length)} propuestas` : undefined}>
          {!resource.data ? (
            <TableSkeleton cols={5} />
          ) : !resource.data.propuestas.length ? (
            <EmptyState icon={<Lightbulb size={20} />} title="Sin propuestas" description="Cualquier persona puede proponer un documento o solicitar un cambio de uno vigente." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Propuesta</Th>
                  <Th>Tipo</Th>
                  <Th>Propuso</Th>
                  <Th>Estado</Th>
                  <Th align="right" sticky />
                </tr>
              </THead>
              <TBody>
                {resource.data.propuestas.map((item) => (
                  <Tr key={item.id} data-propuesta={item.id}>
                    <Td className="max-w-[360px]">
                      <CellPrimary title={item.titulo || "-"} subtitle={String(item.motivo || "")} />
                      {item.nc_id ? (
                        <Link href={`/calidad/nc/${item.nc_id}`} className="mt-0.5 inline-flex text-[12px] font-medium text-brand hover:underline" data-propuesta-nc>
                          Por {folioNc(item.nc_folio)}
                        </Link>
                      ) : null}
                    </Td>
                    <Td muted>{item.tipo === "cambio" ? `Cambio${item.documento_clave ? ` · ${item.documento_clave}` : ""}` : "Nuevo"}</Td>
                    <Td muted>
                      {String(item.propuesto_por_nombre || "—")} · {fmtDate(item.propuesto_en)}
                    </Td>
                    <Td>
                      <Badge tone={item.estado === "pendiente" ? "warning" : item.estado === "aceptada" ? "success" : "danger"} dot>
                        {item.estado === "pendiente" ? "Pendiente" : item.estado === "aceptada" ? `Aceptada${item.asignado_nombre ? ` · elabora ${item.asignado_nombre}` : ""}` : "Rechazada"}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {canCalidad && item.estado === "pendiente" ? (
                        <span className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => rechazarPropuesta(item)}>
                            Rechazar
                          </Button>
                          <Button size="sm" onClick={() => abrirAceptar(item)}>
                            Aceptar
                          </Button>
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      ) : vista === "reportes" ? (
        <TableShell footer={resource.data ? `${fmt(reportes.length)} reportes` : undefined}>
          {resource.error ? (
            <ErrorState message={resource.error} onRetry={resource.reload} />
          ) : !resource.data ? (
            <TableSkeleton cols={5} />
          ) : !reportes.length ? (
            <EmptyState icon={<FileText size={20} />} title="Sin reportes" description="Los reportes de mantenimiento en PDF se registran desde Inventario › Mantenimiento." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Código</Th>
                  <Th>Tipo</Th>
                  <Th>Versión</Th>
                  <Th>Estado</Th>
                  <Th>Fecha</Th>
                  <Th align="right" sticky />
                </tr>
              </THead>
              <TBody>
                {reportes.map((item) => {
                  const meta = REPORTE_ESTADOS[String(item.estado || "")] || { label: item.estado || "-", tone: "neutral" as Tone };
                  return (
                    <Tr key={item.id}>
                      <Td>
                        <CellPrimary title={item.codigo || "-"} mono />
                      </Td>
                      <Td muted className="capitalize">
                        {item.tipo_mantenimiento || "-"}
                      </Td>
                      <Td muted>{item.version || "-"}</Td>
                      <Td>
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </Td>
                      <Td muted>{fmtDate(item.fecha_reporte)}</Td>
                      <Td align="right">
                        {item.archivo_url ? (
                          <Button variant="ghost" size="sm" iconRight={<ArrowSquareOut size={14} />} onClick={() => abrirReporte(item)}>
                            Abrir PDF
                          </Button>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </TableShell>
      ) : (
        <TableShell footer={resource.data ? `${fmt(rows.length)} documentos${vista === "maestra" ? " vigentes" : ""}` : undefined}>
          {resource.error ? (
            <ErrorState message={resource.error} onRetry={resource.reload} />
          ) : !resource.data ? (
            <TableSkeleton cols={7} />
          ) : !rows.length ? (
            <EmptyState icon={<FileText size={20} />} title={search || tipo || estado ? "Sin coincidencias" : vista === "maestra" ? "Sin documentos vigentes" : "Sin documentos"} description={vista === "maestra" ? "Los documentos aprobados aparecen aquí como lista maestra." : "Registra el primer documento controlado del SGC."} action={canCreate && !search ? <Button onClick={() => modal.open(null)}>Nuevo documento</Button> : undefined} />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Clave</Th>
                  <Th>Título</Th>
                  <Th>Tipo · área</Th>
                  <Th>Rev.</Th>
                  <Th>Vigencia</Th>
                  <Th>Próx. revisión</Th>
                  <Th>Estado</Th>
                  <Th align="right" sticky />
                </tr>
              </THead>
              <TBody>
                {rows.map((item) => {
                  const tipoMeta = DOCUMENT_TYPES.find((t) => t.value === item.tipo);
                  const areaMeta = DOCUMENT_AREAS.find((a) => a.value === item.area);
                  const aprobo = (item.aprobo || null) as ApiRecord | null;
                  return (
                    <Tr key={item.id}>
                      <Td>
                        <CellPrimary title={item.clave} mono subtitle={item.es_externo ? "Externo" : undefined} />
                      </Td>
                      <Td className="max-w-[320px]">
                        <CellPrimary title={item.titulo || "-"} subtitle={aprobo?.nombre ? `Aprobó ${aprobo.nombre}` : undefined} />
                      </Td>
                      <Td muted>
                        {tipoMeta?.label || item.tipo} · {areaMeta?.label || item.area}
                      </Td>
                      <Td className="tnum">
                        <StatusCell>
                          {String(item.revision)}
                          {Number(item.revisiones_en_curso) > 0 ? <StatusFlag kind="info" label="Revisión nueva en curso" detail="Hay un borrador o una revisión de este documento en trámite." /> : null}
                        </StatusCell>
                      </Td>
                      <Td muted>{fmtDate(item.fecha_vigencia)}</Td>
                      <Td muted>
                        <StatusCell>
                          {fmtDate(item.fecha_proxima_revision)}
                          {item.revision_vencida ? <StatusFlag kind="error" label="Revisión periódica vencida" /> : null}
                        </StatusCell>
                      </Td>
                      <Td>
                        <StateBadge kind="documento" status={item.estado} />
                      </Td>
                      <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                        <ActionMenu items={menuFor(item)} header={`${item.clave} · rev. ${item.revision}`} />
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </TableShell>
      )}

      {modal.key ? <DocumentoSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}

      <Sheet open={detail.isOpen} onOpenChange={(open) => !open && detail.close()} title={detailItem ? `${detailItem.clave} · revisión ${detailItem.revision}` : "Documento"} description={detailItem?.titulo as string} size="lg">
        {detailItem ? (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2 text-[13.5px]">
              <p><span className="text-ink-3">Estado: </span><StateBadge kind="documento" status={detailItem.estado} /></p>
              <p><span className="text-ink-3">Archivo: </span>{detailItem.archivo_original ? <button type="button" className="text-brand" onClick={() => abrirArchivo(detailItem)}>{String(detailItem.archivo_original)}</button> : "—"}</p>
              <p><span className="text-ink-3">Emisión: </span>{fmtDate(detailItem.fecha_emision)}</p>
              <p><span className="text-ink-3">Vigente desde: </span>{fmtDate(detailItem.fecha_vigencia)}</p>
              <p><span className="text-ink-3">Elaboró: </span>{String((detailItem.elaboro as ApiRecord)?.nombre || "—")}</p>
              <p><span className="text-ink-3">Revisión de calidad: </span>{String((detailItem.reviso as ApiRecord)?.nombre || "—")}</p>
              <p><span className="text-ink-3">Revisión técnica: </span>{Number(detailItem.requiere_revision_tecnica) ? String((detailItem.revision_tecnica as ApiRecord)?.nombre || "Pendiente") : "No requiere"}</p>
              <p><span className="text-ink-3">Publicó: </span>{String((detailItem.publico as ApiRecord)?.nombre || "—")}</p>
              <p><span className="text-ink-3">Aprobó: </span>{String((detailItem.aprobo as ApiRecord)?.nombre || "—")} {(detailItem.aprobo as ApiRecord)?.fecha ? `· ${fmtDate((detailItem.aprobo as ApiRecord).fecha)}` : ""}</p>
              <p><span className="text-ink-3">SHA-256: </span><span className="code text-[12px]">{String(detailItem.archivo_sha256 || "—").slice(0, 16)}</span></p>
              {detailItem.motivo_estado ? <p className="whitespace-pre-line sm:col-span-2"><span className="text-ink-3">Motivo del estado: </span>{String(detailItem.motivo_estado)}</p> : null}
              {detailItem.cambios ? <p className="sm:col-span-2"><span className="text-ink-3">Cambios de esta revisión: </span>{String(detailItem.cambios)}</p> : null}
              {detailItem.devolucion_observaciones ? <p className="whitespace-pre-line sm:col-span-2 text-warning"><span className="text-ink-3">Devuelto con observaciones: </span>{String(detailItem.devolucion_observaciones)}</p> : null}
            </div>
            {detailItem.mi_distribucion && !(detailItem.mi_distribucion as ApiRecord).leido_en ? (
              <div className="flex items-center justify-between gap-3 rounded-card border border-line px-3 py-2">
                <span className="text-[13.5px]">Este documento te fue distribuido: confirma que lo leíste.</span>
                <Button icon={<CheckCircle size={16} />} onClick={() => confirmarLectura(detailItem)}>
                  Leí y comprendí
                </Button>
              </div>
            ) : null}
            {((detailItem.distribucion_lectura || []) as ApiRecord[]).length ? (
              <div data-distribucion>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Distribución y acuse de lectura</p>
                <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
                  {((detailItem.distribucion_lectura || []) as ApiRecord[]).map((d) => (
                    <li key={String(d.usuario_id)} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                      <span>{String(d.nombre || d.email)}</span>
                      <span className={d.leido_en ? "text-success" : "text-ink-3"}>{d.leido_en ? `Leído · ${fmtDate(d.leido_en)}` : "Pendiente de lectura"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {((detailItem.revisiones || []) as ApiRecord[]).length ? (
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Revisiones de {String(detailItem.clave)}</p>
              <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
                {((detailItem.revisiones || []) as ApiRecord[]).map((rev) => (
                  <li key={rev.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="tnum font-medium">Rev. {String(rev.revision)}</span>
                      <StateBadge kind="documento" status={rev.estado} />
                      <span className="text-ink-3">{fmtDate(rev.fecha_emision)}</span>
                    </span>
                    <span className="max-w-[320px] truncate text-ink-3">{rev.cambios ? String(rev.cambios) : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
            ) : null}
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Incidencias</p>
              <IncidenciasDelRegistro entidad="documentos_sgc" id={detailItem.id} etiqueta={`${String(detailItem.clave)} rev. ${String(detailItem.revision)}`} />
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Historial (bitácora de auditoría)</p>
              <RecordHistory entidad="documentos_sgc" entidadId={detailItem.id as number} compact />
            </div>
          </div>
        ) : null}
      </Sheet>

      <Dialog
        open={!!aprobar}
        onOpenChange={(open) => !open && setAprobar(null)}
        title={aprobar ? `Aprobar ${aprobar.item.clave} rev. ${aprobar.item.revision}` : "Aprobar"}
        description="Queda aprobada con tu usuario; después Mejora Continua la publica (vigente) y la distribuye."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAprobar(null)}>
              Cancelar
            </Button>
            <Button icon={<SealCheck size={16} />} onClick={confirmarAprobacion}>
              Aprobar
            </Button>
          </>
        }
      >
        {aprobar ? (
          <div className="flex flex-col gap-4">
            <Field label="Cargo de quien aprueba" htmlFor="ap-cargo">
              <Input id="ap-cargo" maxLength={120} value={aprobar.cargo} onChange={(event) => setAprobar({ ...aprobar, cargo: event.target.value })} placeholder="Ej. Director General" />
            </Field>
            <CampoIdentidad value={claveAprobar} onChange={setClaveAprobar} id="ap-password" />
          </div>
        ) : null}
      </Dialog>
      <Dialog
        open={!!publicar}
        onOpenChange={(open) => !open && setPublicar(null)}
        title={publicar ? `Publicar ${publicar.item.clave} rev. ${publicar.item.revision}` : "Publicar"}
        description="Entra a la lista maestra como vigente; la revisión vigente anterior pasa a obsoleta. Elige a quién se distribuye (cada persona confirma su lectura)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublicar(null)}>
              Cancelar
            </Button>
            <Button icon={<Megaphone size={16} />} onClick={confirmarPublicar}>
              Publicar
            </Button>
          </>
        }
      >
        {publicar ? (
          <div className="flex flex-col gap-4">
            <Field label="Vigente desde" htmlFor="pub-vig" hint="Si se deja vacío, hoy.">
              <DateInput id="pub-vig" value={publicar.vigencia} onChange={(value) => setPublicar({ ...publicar, vigencia: value })} />
            </Field>
            {rolesLista.length ? (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Distribuir a roles</p>
                <div className="grid max-h-[160px] gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {rolesLista.map((rol) => (
                    <Checkbox key={String(rol.id)} checked={publicar.roles.includes(Number(rol.id))} onChange={(event) => setPublicar({ ...publicar, roles: event.target.checked ? [...publicar.roles, Number(rol.id)] : publicar.roles.filter((r) => r !== Number(rol.id)) })} label={String(rol.nombre)} />
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-2">Distribuir a personas</p>
              <div className="grid max-h-[200px] gap-1.5 overflow-y-auto sm:grid-cols-2" id="pub-usuarios">
                {cuentas.map((c) => (
                  <Checkbox key={String(c.id)} checked={publicar.usuarios.includes(Number(c.id))} onChange={(event) => setPublicar({ ...publicar, usuarios: event.target.checked ? [...publicar.usuarios, Number(c.id)] : publicar.usuarios.filter((u) => u !== Number(c.id)) })} label={String(c.nombre || c.email)} />
                ))}
              </div>
            </div>
            <CampoIdentidad value={claveAprobar} onChange={setClaveAprobar} id="pub-password" />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={!!aceptar}
        onOpenChange={(open) => !open && setAceptar(null)}
        title={aceptar ? `Aceptar "${aceptar.item.titulo}"` : "Aceptar propuesta"}
        description={aceptar?.item.tipo === "cambio" ? "Se crea la nueva revisión en borrador, asignada a quien elabora." : "Se crea el documento en borrador, asignado a quien elabora."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAceptar(null)}>
              Cancelar
            </Button>
            <Button icon={<CheckCircle size={16} />} onClick={confirmarAceptar}>
              Aceptar y asignar
            </Button>
          </>
        }
      >
        {aceptar ? (
          <div className="flex flex-col gap-4">
            <Field label="Quién elabora" htmlFor="acp-asignado" required>
              <Select id="acp-asignado" value={aceptar.asignado} onChange={(event) => setAceptar({ ...aceptar, asignado: event.target.value })}>
                <option value="">Seleccionar</option>
                {cuentas.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.nombre || c.email)}
                  </option>
                ))}
              </Select>
            </Field>
            {aceptar.item.tipo !== "cambio" ? (
              <>
                <Field label="Clave" htmlFor="acp-clave" required hint="FX-<área><tipo>-<siglas>">
                  <Input id="acp-clave" mono maxLength={40} value={aceptar.clave} onChange={(event) => setAceptar({ ...aceptar, clave: event.target.value.toUpperCase() })} />
                </Field>
                <Field label="Tipo" htmlFor="acp-tipo" required>
                  <Select id="acp-tipo" value={aceptar.tipo} onChange={(event) => setAceptar({ ...aceptar, tipo: event.target.value })}>
                    <option value="">Seleccionar</option>
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Área" htmlFor="acp-area" required>
                  <Select id="acp-area" value={aceptar.area} onChange={(event) => setAceptar({ ...aceptar, area: event.target.value })}>
                    <option value="">Seleccionar</option>
                    {DOCUMENT_AREAS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}
            <Checkbox checked={aceptar.requiere} onChange={(event) => setAceptar({ ...aceptar, requiere: event.target.checked })} label="Requiere revisión técnica" />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
