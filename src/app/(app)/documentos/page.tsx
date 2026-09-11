"use client";

import { notFound } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { FEATURES } from "@/lib/shared/features";
import { toast } from "sonner";
import { ArrowsClockwise, FileText, PaperPlaneTilt, PencilSimple, Plus, Prohibit, SealCheck, ArrowSquareOut, ClockCounterClockwise } from "@phosphor-icons/react";
import { RecordHistory } from "@/components/features/audit/RecordHistory";
import { DocumentoSheet } from "@/components/features/documentos/DocumentoSheet";
import { StateBadge } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ActionMenu, Dialog, Sheet, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt, fmtDate, normalizeText } from "@/lib/client/format";
import { useInitialParam, useOpenState, useParamChange, useUrlTrigger } from "@/lib/client/hooks";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { DOCUMENT_AREAS, DOCUMENT_TYPES } from "@/lib/shared/sgc";

type Vista = "maestra" | "todos" | "reportes";

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
  useUrlTrigger("nuevo", () => modal.open(null));

  const resource = useResource<{ docs: ApiRecord[]; maestra: ApiRecord[]; reportes: ApiRecord[]; summary: ApiRecord }>(
    "documentos",
    async () => {
      const [docs, maestra, reportes, summary] = await Promise.all([
        getJsonAuth(`${API_BASE_URL}/documentos-sgc`, token),
        getJsonAuth(`${API_BASE_URL}/documentos-sgc/lista-maestra`, token),
        getJsonAuth(`${API_BASE_URL}/documents`, token).catch(() => ({}) as ApiRecord),
        getJsonAuth(`${API_BASE_URL}/documentos-sgc/summary`, token).catch(() => ({}) as ApiRecord),
      ]);
      return { docs: (docs.items || []) as ApiRecord[], maestra: (maestra.items || []) as ApiRecord[], reportes: (reportes.items || []) as ApiRecord[], summary: summary as ApiRecord };
    },
    { enabled: !!token },
  );

  const rows = useMemo(() => {
    const base = vista === "maestra" ? resource.data?.maestra || [] : resource.data?.docs || [];
    const term = normalizeText(search);
    const today = new Date().toISOString().slice(0, 10);
    const vencido = (d: ApiRecord) => !!d.fecha_proxima_revision && String(d.fecha_proxima_revision).slice(0, 10) < today;
    return base.filter((d) => (!term || normalizeText(`${d.clave} ${d.titulo} ${d.descripcion || ""}`).includes(term)) && (!tipo || d.tipo === tipo) && (!estado || d.estado === estado) && (!soloVencidos || vencido(d)));
  }, [resource.data, vista, search, tipo, estado, soloVencidos]);
  const reportes = useMemo(() => {
    const term = normalizeText(search);
    return (resource.data?.reportes || []).filter((r) => !term || normalizeText(`${r.codigo || ""} ${r.tipo_mantenimiento || ""} ${r.estado || ""}`).includes(term));
  }, [resource.data, search]);
  const summary = resource.data?.summary || {};

  const canCreate = can("documentos", "create");
  const canUpdate = can("documentos", "update");
  const canDelete = can("documentos", "delete");
  const canApprove = can("aprobaciones", "update");

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

  const enviarRevision = (item: ApiRecord) => act(`${item.id}/enviar-revision`, { reviso: { nombre: formatActiveUserSignature() } }, "Enviado a revisión");
  const obsoletar = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Declarar obsoleto ${item.clave} rev. ${item.revision}`, description: "El documento deja de estar vigente y se conserva identificado como obsoleto.", confirmLabel: "Declarar obsoleto", tone: "danger" });
    if (motivo) await act(`${item.id}/obsoletar`, { motivo }, "Documento obsoleto");
  };
  const cancelar = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Cancelar borrador ${item.clave} rev. ${item.revision}`, confirmLabel: "Cancelar borrador", tone: "danger" });
    if (motivo) await act(`${item.id}/cancelar`, { motivo }, "Borrador cancelado");
  };
  const nuevaRevision = async (item: ApiRecord) => {
    const cambios = await prompt({ title: `Nueva revisión de ${item.clave}`, description: "Describe qué cambia respecto a la revisión vigente; se crea un borrador con revisión +1.", label: "Cambios", confirmLabel: "Crear revisión" });
    if (cambios) await act(`${item.id}/nueva-revision`, { cambios, elaboro: { nombre: formatActiveUserSignature() } }, "Nueva revisión creada");
  };
  const confirmarAprobacion = async () => {
    if (!aprobar) return;
    await act(`${aprobar.item.id}/aprobar`, { aprobo: { nombre: user?.nombre || user?.email || "", cargo: aprobar.cargo || null }, fecha_vigencia: aprobar.vigencia || null }, "Documento aprobado");
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
  const abrirDetalle = async (item: ApiRecord) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/documentos-sgc/${item.id}`, token);
      detail.open((data.item || item) as ApiRecord);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el documento");
    }
  };

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const items: MenuItem[] = [];
    const estadoDoc = String(item.estado);
    items.push({ label: "Ver detalle e historial", description: "Revisiones, aprobaciones y bitácora", icon: <ClockCounterClockwise size={16} weight="duotone" />, tone: "brand", onSelect: () => abrirDetalle(item) });
    if (item.archivo_nombre) items.push({ label: "Abrir archivo", description: String(item.archivo_original || item.archivo_nombre), icon: <ArrowSquareOut size={16} weight="duotone" />, onSelect: () => abrirArchivo(item) });
    if (canUpdate && ["borrador", "en_revision"].includes(estadoDoc)) items.push({ label: "Editar", description: "Título, descripción o archivo", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => modal.open(item) });
    if (canUpdate && estadoDoc === "borrador") items.push({ label: "Enviar a revisión", description: "Pasa a revisión técnica", icon: <PaperPlaneTilt size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => enviarRevision(item) });
    if (canApprove && ["en_revision", "borrador"].includes(estadoDoc)) items.push({ label: "Aprobar (vigente)", description: "Entra a la lista maestra", icon: <SealCheck size={16} weight="duotone" />, tone: "success", separatorBefore: estadoDoc !== "borrador", onSelect: () => setAprobar({ item, cargo: "", vigencia: "" }) });
    if (canCreate && ["vigente", "obsoleto"].includes(estadoDoc)) items.push({ label: "Nueva revisión…", description: "Borrador con revisión +1", icon: <ArrowsClockwise size={16} weight="duotone" />, tone: "success", separatorBefore: true, onSelect: () => nuevaRevision(item) });
    if (canApprove && estadoDoc === "vigente") items.push({ label: "Declarar obsoleto…", description: "Deja de estar vigente, con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => obsoletar(item) });
    if (canDelete && ["borrador", "en_revision"].includes(estadoDoc)) items.push({ label: "Cancelar borrador…", description: "Queda cancelado con motivo", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => cancelar(item) });
    return items;
  };

  const docGroups: FilterGroup[] = [
    { key: "tipo", label: "Tipo de documento", value: tipo, defaultValue: "", onChange: setTipo, options: [{ value: "", label: "Todos" }, ...DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))] },
    ...(vista === "todos"
      ? [{ key: "estado", label: "Estado", value: estado, defaultValue: "", onChange: setEstado, options: [{ value: "", label: "Todos" }, { value: "borrador", label: "Borrador" }, { value: "en_revision", label: "En revisión" }, { value: "vigente", label: "Vigente" }, { value: "obsoleto", label: "Obsoleto" }, { value: "cancelado", label: "Cancelado" }] } as FilterGroup]
      : []),
  ];
  const docToggles: FilterToggle[] = vista === "maestra" ? [{ key: "vencidos", label: "Solo con revisión vencida", description: resource.data ? `${fmt(summary.revision_vencida || 0)} documentos vigentes con revisión periódica pendiente` : undefined, checked: soloVencidos, onChange: setSoloVencidos }] : [];

  const detailItem = detail.payload;

  return (
    <>
      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Nuevo documento
            </Button>
          ) : null
        }
      >
        <SegmentedTabs<Vista>
          value={vista}
          onChange={setVista}
          options={[
            { value: "maestra", label: "Lista maestra", count: resource.data ? Number(summary.vigentes || 0) : null },
            { value: "todos", label: "Todas las revisiones", count: resource.data ? resource.data.docs.length : null },
            { value: "reportes", label: "Reportes de mantenimiento" },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por clave o título" className="w-full md:w-[260px]" />
        {vista !== "reportes" ? (
          <>
            <FilterMenu groups={docGroups} toggles={docToggles} />
            <FilterChips groups={docGroups} toggles={docToggles} />
          </>
        ) : null}
      </Toolbar>

      {vista === "reportes" ? (
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
                        {String(item.revision)}
                        {Number(item.revisiones_en_curso) > 0 ? <Badge tone="warning" className="ml-1.5">rev. en curso</Badge> : null}
                      </Td>
                      <Td muted>{fmtDate(item.fecha_vigencia)}</Td>
                      <Td muted>
                        {fmtDate(item.fecha_proxima_revision)}
                        {item.revision_vencida ? <Badge tone="danger" className="ml-1.5">vencida</Badge> : null}
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
              <p><span className="text-ink-3">Revisó: </span>{String((detailItem.reviso as ApiRecord)?.nombre || "—")}</p>
              <p><span className="text-ink-3">Aprobó: </span>{String((detailItem.aprobo as ApiRecord)?.nombre || "—")} {(detailItem.aprobo as ApiRecord)?.fecha ? `· ${fmtDate((detailItem.aprobo as ApiRecord).fecha)}` : ""}</p>
              <p><span className="text-ink-3">SHA-256: </span><span className="code text-[12px]">{String(detailItem.archivo_sha256 || "—").slice(0, 16)}</span></p>
              {detailItem.motivo_estado ? <p className="sm:col-span-2"><span className="text-ink-3">Motivo del estado: </span>{String(detailItem.motivo_estado)}</p> : null}
              {detailItem.cambios ? <p className="sm:col-span-2"><span className="text-ink-3">Cambios de esta revisión: </span>{String(detailItem.cambios)}</p> : null}
            </div>
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
        description="La revisión queda vigente y la anterior pasa a obsoleta. Queda registrado con tu usuario."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAprobar(null)}>
              Cancelar
            </Button>
            <Button icon={<SealCheck size={16} />} onClick={confirmarAprobacion}>
              Aprobar y poner en vigor
            </Button>
          </>
        }
      >
        {aprobar ? (
          <div className="flex flex-col gap-4">
            <Field label="Cargo de quien aprueba" htmlFor="ap-cargo">
              <Input id="ap-cargo" maxLength={120} value={aprobar.cargo} onChange={(event) => setAprobar({ ...aprobar, cargo: event.target.value })} placeholder="Ej. Director General" />
            </Field>
            <Field label="Vigente desde" htmlFor="ap-vig" hint="Si se deja vacío, hoy.">
              <Input id="ap-vig" type="date" value={aprobar.vigencia} onChange={(event) => setAprobar({ ...aprobar, vigencia: event.target.value })} />
            </Field>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
