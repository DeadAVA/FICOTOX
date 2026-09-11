"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowsClockwise, FilePdf, FloppyDisk, PaperPlaneTilt, Prohibit, SealCheck, Truck } from "@phosphor-icons/react";
import { RecordHistory } from "@/components/features/audit/RecordHistory";
import { FolioChip } from "@/components/features/samples/status";
import { SignDialog } from "@/components/features/samples/SignDialog";
import { Callout, FlowSteps, FormCard, FormPage, FormTable, PersonCard, ReadValue, SignoffCard, formTd, formTh, missingMessage, missingSections, openFormSection, type FormSectionDef } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { ActionMenu, Dialog, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { Badge, EmptyState } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmtDate, isoDate, parseIntOrNull } from "@/lib/client/format";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ANALYSIS_METHODS, ANALYSIS_TYPES, REPORT_DEFAULT_STATEMENTS, REPORT_DELIVERY_MEDIA, REPORT_STATES } from "@/lib/shared/sgc";

/*
 * Informe de resultados (ISO/IEC 17025 7.8): se arma a partir de una
 * recepcion y sus analisis aprobados; pasa por revision y autorizacion con
 * firma; al autorizarse se congela y se genera el PDF.
 */

interface InformeState {
  recepcionId: string;
  clienteNombre: string;
  clienteContacto: string;
  clienteDireccion: string;
  analisisIds: number[];
  alcance: string;
  reglaDecision: string;
  desviaciones: string;
  descargo: string;
  opiniones: string;
  fechaEmision: string;
  elaboradoNombre: string;
  elaboradoCargo: string;
  elaboradoFirma: string;
  observaciones: string;
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const defaultForm = (): InformeState => ({
  recepcionId: "",
  clienteNombre: "",
  clienteContacto: "",
  clienteDireccion: "",
  analisisIds: [],
  alcance: REPORT_DEFAULT_STATEMENTS.alcance,
  reglaDecision: REPORT_DEFAULT_STATEMENTS.regla_decision,
  desviaciones: "",
  descargo: "",
  opiniones: "",
  fechaEmision: isoDate(new Date()),
  elaboradoNombre: formatActiveUserSignature(),
  elaboradoCargo: "",
  elaboradoFirma: "",
  observaciones: "",
});

const formFromItem = (item: ApiRecord): InformeState => {
  const cliente = (item.cliente || {}) as ApiRecord;
  const decl = (item.declaraciones || {}) as ApiRecord;
  return {
    recepcionId: item.recepcion_id ? String(item.recepcion_id) : "",
    clienteNombre: str(cliente.nombre),
    clienteContacto: str(cliente.contacto),
    clienteDireccion: str(cliente.direccion),
    analisisIds: Array.isArray(item.analisis_ids) ? item.analisis_ids.map(Number) : [],
    alcance: str(decl.alcance) || REPORT_DEFAULT_STATEMENTS.alcance,
    reglaDecision: str(decl.regla_decision) || REPORT_DEFAULT_STATEMENTS.regla_decision,
    desviaciones: str(decl.desviaciones),
    descargo: str(decl.descargo),
    opiniones: str(decl.opiniones),
    fechaEmision: isoDate(item.fecha_emision) || isoDate(new Date()),
    elaboradoNombre: str(item.elaborado_nombre),
    elaboradoCargo: str(item.elaborado_cargo),
    elaboradoFirma: str(item.elaborado_firma),
    observaciones: str(item.observaciones),
  };
};

const FLOW_STEPS = [
  { key: "borrador", label: "Borrador" },
  { key: "en_revision", label: "En revisión" },
  { key: "autorizado", label: "Autorizado" },
  { key: "entregado", label: "Entregado" },
];

function tipoLabel(value: unknown): string {
  return ANALYSIS_TYPES.find((t) => t.value === value)?.label || String(value || "");
}
function metodoLabel(value: unknown, otro?: unknown): string {
  if (value === "otro" && otro) return String(otro);
  return ANALYSIS_METHODS.find((m) => m.value === value)?.label || String(value || "");
}

export function InformeForm({ item, prefillRecepcionId }: { item: ApiRecord | null; prefillRecepcionId?: number | null }) {
  const router = useRouter();
  const prompt = usePrompt();
  const { token, can, user } = useSession();
  const [form, setForm] = useState<InformeState>(() => (item ? formFromItem(item) : defaultForm()));
  const [recepciones, setRecepciones] = useState<ApiRecord[]>([]);
  const [disponibles, setDisponibles] = useState<ApiRecord[]>(() => ((item?.disponibles || []) as ApiRecord[]));
  const [muestras, setMuestras] = useState<ApiRecord[]>(() => ((item?.muestras || []) as ApiRecord[]));
  const [recepcionInfo, setRecepcionInfo] = useState<ApiRecord | null>((item?.recepcion as ApiRecord) || null);
  const [descargoSugerido, setDescargoSugerido] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sign, setSign] = useState<"revisar" | "autorizar" | null>(null);
  const [signing, setSigning] = useState(false);
  const [entrega, setEntrega] = useState<{ open: boolean; fecha: string; medio: string; aQuien: string; observaciones: string }>({ open: false, fecha: isoDate(new Date()), medio: "correo", aQuien: "", observaciones: "" });
  const editing = !!item?.id;
  const estado = String(item?.estado || "borrador");
  const draft = !editing || ["borrador", "en_revision"].includes(estado);
  const patch = (changes: Partial<InformeState>) => setForm((prev) => ({ ...prev, ...changes }));

  const loadRecepcion = async (id: number, keepSelection = false) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/informes/recepcion/${id}`, token);
      setRecepcionInfo(data.recepcion as ApiRecord);
      setMuestras((data.muestras || []) as ApiRecord[]);
      setDisponibles((data.analisis || []) as ApiRecord[]);
      setDescargoSugerido((data.descargo_sugerido as string | null) || null);
      const cliente = (data.cliente || {}) as ApiRecord;
      setForm((prev) => ({
        ...prev,
        recepcionId: String(id),
        clienteNombre: prev.clienteNombre || str(cliente.nombre),
        clienteContacto: prev.clienteContacto || str(cliente.contacto),
        analisisIds: keepSelection ? prev.analisisIds : ((data.analisis || []) as ApiRecord[]).map((a) => Number(a.id)),
        descargo: prev.descargo || (data.descargo_sugerido as string) || "",
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la recepción");
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/samples/reception?search=`, token).catch(() => ({}) as ApiRecord);
      if (cancelled) return;
      setRecepciones(((data.items || []) as ApiRecord[]).filter((r) => !["anulada", "rechazada"].includes(String(r.estado))));
      if (!item && prefillRecepcionId) await loadRecepcion(prefillRecepcionId);
      if (item && draft && item.recepcion_id) await loadRecepcion(Number(item.recepcion_id), true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, item, prefillRecepcionId]);

  const buildPayload = () => ({
    recepcion_id: parseIntOrNull(form.recepcionId),
    analisis_ids: form.analisisIds,
    cliente: { nombre: form.clienteNombre.trim() || null, contacto: form.clienteContacto.trim() || null, direccion: form.clienteDireccion.trim() || null },
    declaraciones: { alcance: form.alcance.trim(), regla_decision: form.reglaDecision.trim(), desviaciones: form.desviaciones.trim() || null, descargo: form.descargo.trim() || null, opiniones: form.opiniones.trim() || null },
    fecha_emision: form.fechaEmision || null,
    elaborado_nombre: form.elaboradoNombre.trim() || null,
    elaborado_cargo: form.elaboradoCargo.trim() || null,
    elaborado_firma: form.elaboradoFirma || null,
    observaciones: form.observaciones.trim() || null,
  });

  const fail = (message: string, section: string) => {
    setError(message);
    toast.error(message);
    openFormSection(section);
  };

  const handleSave = async () => {
    const payload = buildPayload();
    const incompletas = missingSections(sections);
    if (incompletas.length) return fail(missingMessage(incompletas), incompletas[0].id);
    if (!payload.recepcion_id) return fail("Selecciona la recepción que se informa", "sec-origen");
    if (!payload.cliente.nombre) return fail("Indica el nombre del cliente", "sec-origen");
    if (!payload.analisis_ids.length) return fail("Incluye al menos un análisis aprobado", "sec-analisis");
    if (!can("informes", editing ? "update" : "create")) return fail("No tienes permiso para esta acción", "sec-origen");
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/informes/${item!.id}`, token, payload);
        toast.success("Informe actualizado");
      } else {
        const created = await sendJsonAuth("POST", `${API_BASE_URL}/informes`, token, payload);
        toast.success("Informe creado en borrador");
        invalidate("informes", "muestras", "dashboard");
        router.push(`/informes/${created.id}`);
        return;
      }
      invalidate("informes", "muestras", "dashboard");
      router.push("/informes");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el informe";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  const doSign = async (data: { firma: string; cargo: string }) => {
    if (!sign || !item) return;
    setSigning(true);
    try {
      const body: Record<string, unknown> = { firma: data.firma || null, cargo: data.cargo || null };
      try {
        await sendJsonAuth("POST", `${API_BASE_URL}/informes/${item.id}/${sign}`, token, body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/persona distinta|misma_persona/i.test(message)) {
          const motivo = await prompt({ title: sign === "revisar" ? "Elaboraste este informe y vas a revisarlo" : "Revisaste y vas a autorizar el mismo informe", description: "Debe hacerlo otra persona. Si no hay nadie más disponible, indica el motivo para registrar la excepción.", confirmLabel: sign === "revisar" ? "Revisar con excepción" : "Autorizar con excepción" });
          if (!motivo) throw err;
          await sendJsonAuth("POST", `${API_BASE_URL}/informes/${item.id}/${sign}`, token, { ...body, permitir_misma_persona: true, motivo });
        } else throw err;
      }
      toast.success(sign === "revisar" ? "Informe revisado" : "Informe autorizado; PDF generado");
      invalidate("informes", "muestras", "dashboard");
      setSign(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setSigning(false);
    }
  };

  const registrarEntrega = async () => {
    if (!item) return;
    if (!entrega.fecha || !entrega.medio || !entrega.aQuien.trim()) return toast.error("Fecha, medio y destinatario son obligatorios");
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/informes/${item.id}/entregar`, token, { fecha: entrega.fecha, medio: entrega.medio, a_quien: entrega.aQuien.trim(), observaciones: entrega.observaciones.trim() || null });
      toast.success("Entrega registrada");
      invalidate("informes", "dashboard");
      setEntrega({ ...entrega, open: false });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la entrega");
    }
  };

  const anular = async () => {
    if (!item) return;
    const motivo = await prompt({ title: `Anular informe ${item.folio}`, description: "El informe queda anulado y su PDF marcado como sin validez. Para corregirlo emite una enmienda.", confirmLabel: "Anular", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/informes/${item.id}/anular`, token, { motivo });
      toast.success("Informe anulado");
      invalidate("informes", "dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo anular");
    }
  };

  const enmendar = async () => {
    if (!item) return;
    const motivo = await prompt({ title: `Emitir enmienda de ${item.folio}`, description: "Se crea una nueva versión en borrador que declara sustituir a este informe (ISO/IEC 17025 7.8.8).", confirmLabel: "Crear enmienda" });
    if (!motivo) return;
    try {
      const created = await sendJsonAuth("POST", `${API_BASE_URL}/informes/${item.id}/enmienda`, token, { motivo });
      toast.success(`Enmienda creada (versión ${created.version})`);
      invalidate("informes", "dashboard");
      router.push(`/informes/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la enmienda");
    }
  };

  const verPdf = () => {
    if (!item) return;
    void openProtectedFile(`${API_BASE_URL}/informes/${item.id}/pdf`, token, `${String(item.folio || "informe").replace(/\s+/g, "-")}.pdf`);
  };

  const toggleAnalisis = (id: number, checked: boolean) => patch({ analisisIds: checked ? Array.from(new Set([...form.analisisIds, id])) : form.analisisIds.filter((v) => v !== id) });
  const canApprove = can("aprobaciones", "update");
  const resultadosCongelados = (item?.resultados || []) as ApiRecord[];
  const entregaInfo = (item?.entrega || null) as ApiRecord | null;
  const folioLabel = editing ? `${item!.folio} · v${item!.version}` : "Nuevo informe";

  const sections: FormSectionDef[] = [
    { id: "sec-origen", label: "Recepción y cliente", complete: draft ? !!form.recepcionId && !!form.clienteNombre.trim() : undefined },
    { id: "sec-muestras", label: "Ítems ensayados", complete: draft ? muestras.length > 0 : undefined },
    { id: "sec-analisis", label: "Análisis incluidos", complete: draft ? form.analisisIds.length > 0 : undefined },
    { id: "sec-declaraciones", label: "Declaraciones", complete: draft ? !!form.alcance.trim() && !!form.reglaDecision.trim() && (!descargoSugerido || !!form.descargo.trim()) : undefined },
    { id: "sec-firmas", label: "Elaboró, revisó, autorizó", complete: draft ? !!form.elaboradoNombre.trim() : undefined },
    { id: "sec-entrega", label: "Entrega", optional: true },
    ...(editing ? [{ id: "sec-historial", label: "Historial", optional: true }] : []),
  ];

  // Acciones secundarias (PDF, enmienda, anulación) van en un menú para que la cabecera solo muestre el siguiente paso.
  const moreItems: MenuItem[] = [];
  if (editing) moreItems.push({ label: estado === "borrador" || estado === "en_revision" ? "Vista previa del PDF" : "Ver PDF", description: "Abre el documento en una pestaña nueva", icon: <FilePdf size={16} weight="duotone" />, tone: "brand", onSelect: verPdf });
  if (editing && ["autorizado", "entregado", "anulado"].includes(estado) && can("informes", "create")) moreItems.push({ label: "Emitir enmienda…", description: "Nueva versión que sustituye a esta", icon: <ArrowsClockwise size={16} weight="duotone" />, onSelect: enmendar });
  if (editing && estado !== "anulado" && can("informes", "delete")) moreItems.push({ label: "Anular informe…", description: "El PDF queda sin validez", icon: <Prohibit size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: anular });

  const failedLabel = estado === "anulado" ? "Anulado" : estado === "sustituido" ? "Sustituido por enmienda" : undefined;

  return (
    <FormPage
      backHref="/informes"
      backLabel="Informes"
      code="FX-TCF-IR"
      title={editing ? `Informe ${folioLabel}` : "Nuevo informe de resultados"}
      status={REPORT_STATES[estado]?.label || estado}
      statusTone={REPORT_STATES[estado]?.tone || "neutral"}
      sections={sections}
      error={error}
      readOnly={!draft}
      after={
        editing ? (
          <FormCard id="sec-historial" title="Historial del informe" description="Bitácora de auditoría: creación, revisión, autorización, entrega, enmiendas y descargas.">
            <RecordHistory entidad="informes" entidadId={item?.id as number | undefined} />
          </FormCard>
        ) : null
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => router.push("/informes")}>
            {draft ? "Cancelar" : "Volver"}
          </Button>
          {moreItems.length ? <ActionMenu items={moreItems} label="Más acciones" header={editing ? String(item!.folio) : undefined} /> : null}
          {editing && estado === "borrador" && canApprove ? (
            <Button variant="soft" icon={<PaperPlaneTilt size={16} />} onClick={() => setSign("revisar")}>
              Marcar revisado
            </Button>
          ) : null}
          {editing && estado === "en_revision" && canApprove ? (
            <Button variant="soft" icon={<SealCheck size={16} />} onClick={() => setSign("autorizar")}>
              Autorizar
            </Button>
          ) : null}
          {editing && estado === "autorizado" && can("informes", "update") ? (
            <Button icon={<Truck size={16} />} onClick={() => setEntrega({ ...entrega, open: true })}>
              Registrar entrega
            </Button>
          ) : null}
          {draft ? (
            <Button onClick={handleSave} loading={submitting} icon={<FloppyDisk size={16} />}>
              {editing ? "Guardar borrador" : "Crear borrador"}
            </Button>
          ) : null}
        </>
      }
    >
      {editing ? (
        <div className="flex flex-col gap-3 px-1">
          <FlowSteps steps={FLOW_STEPS} current={estado} failed={failedLabel} />
        </div>
      ) : null}
      {item?.sustituye_a ? (
        <Callout tone="warning" title="Enmienda">
          Esta versión sustituye a la anterior. Motivo: {String(item.motivo_enmienda || "—")}
        </Callout>
      ) : null}
      {item?.motivo_anulacion ? (
        <Callout tone="danger" title="Informe anulado">
          Motivo: {String(item.motivo_anulacion)}
        </Callout>
      ) : null}
      {editing && estado === "en_revision" ? <Callout tone="info">Al guardar cambios el informe regresa a borrador y debe revisarse de nuevo.</Callout> : null}

      <FormCard id="sec-origen" title="Recepción y cliente" description="El informe se emite para la recepción de una muestra y su solicitante (7.8.2 e, g, h).">
        <FormGrid cols={3}>
          <Field label="Recepción" htmlFor="i-rec" required hint={recepcionInfo ? `${fmtDate(recepcionInfo.fecha_recepcion)} · ${recepcionInfo.solicitante || ""}` : undefined}>
            <Select
              id="i-rec"
              value={form.recepcionId}
              disabled={editing}
              onChange={(event) => {
                const id = parseIntOrNull(event.target.value);
                patch({ recepcionId: event.target.value, analisisIds: [] });
                if (id) void loadRecepcion(id);
              }}
            >
              <option value="">Seleccionar</option>
              {recepciones.map((r) => (
                <option key={r.id} value={r.id}>
                  R {String(r.folio_num).padStart(7, "0")} · {r.solicitante || r.id_interno || ""} · {fmtDate(r.fecha_recepcion)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha de emisión" htmlFor="i-fecha" hint="Se fija al autorizar si se deja vacía.">
            <Input id="i-fecha" type="date" value={form.fechaEmision} onChange={(event) => patch({ fechaEmision: event.target.value })} readOnly={!draft} />
          </Field>
          {recepcionInfo ? (
            <div className="flex flex-col gap-1 self-end pb-1 text-[13px] text-ink-2">
              <span className="flex items-center gap-2">
                <FolioChip type="R" num={recepcionInfo.folio_num} /> <Link href={`/muestras/recepcion/${recepcionInfo.id}`} className="text-brand">abrir recepción</Link>
              </span>
              {recepcionInfo.decision_aceptacion === "aceptada_con_desviacion" ? <Badge tone="warning">Aceptada con desviación</Badge> : null}
            </div>
          ) : null}
        </FormGrid>
        <FormGrid cols={3} className="mt-4">
          <Field label="Cliente / solicitante" htmlFor="i-cli" required>
            <Input id="i-cli" maxLength={180} value={form.clienteNombre} onChange={(event) => patch({ clienteNombre: event.target.value })} readOnly={!draft} />
          </Field>
          <Field label="Contacto" htmlFor="i-con">
            <Input id="i-con" maxLength={180} value={form.clienteContacto} onChange={(event) => patch({ clienteContacto: event.target.value })} readOnly={!draft} />
          </Field>
          <Field label="Dirección" htmlFor="i-dir">
            <Input id="i-dir" maxLength={240} value={form.clienteDireccion} onChange={(event) => patch({ clienteDireccion: event.target.value })} readOnly={!draft} />
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard id="sec-muestras" title="Ítems ensayados" description="Descripción e identificación de las muestras tal como se recibieron (7.8.2 g).">
        {!muestras.length ? (
          <EmptyState compact title="Sin muestras" description="Selecciona una recepción para cargar sus muestras." />
        ) : (
          <FormTable minWidth={640}>
            <thead>
                <tr>
                  <th className={formTh}>ID interno</th>
                  <th className={formTh}>Organismo</th>
                  <th className={formTh}>Sitio</th>
                  <th className={formTh}>Fecha de muestra</th>
                  <th className={formTh}>Cantidad</th>
                  <th className={formTh}>Condición</th>
                </tr>
              </thead>
              <tbody>
                {muestras.map((m, i) => (
                  <tr key={`${m.id_interno}-${i}`}>
                    <td className={cn(formTd, "code")}>{m.id_interno || "—"}</td>
                    <td className={formTd}>{m.organismo || "—"}</td>
                    <td className={formTd}>{m.sitio || "—"}</td>
                    <td className={formTd}>{fmtDate(m.fecha_muestra)}</td>
                    <td className={formTd}>{m.cantidad || "—"}</td>
                    <td className={formTd}>{m.condicion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </FormTable>
        )}
      </FormCard>

      <FormCard id="sec-analisis" title="Análisis incluidos" description={draft ? "Solo análisis aprobados de esta recepción. Los resultados se copian al informe al autorizarlo." : "Resultados congelados al autorizar el informe."}>
        {draft ? (
          !disponibles.length ? (
            <EmptyState compact title="No hay análisis aprobados" description="Aprueba los análisis de esta recepción para poder informarlos." />
          ) : (
            <div className="flex flex-col gap-2">
              {disponibles.map((a) => {
                const id = Number(a.id);
                const resultados = (a.resultados || []) as ApiRecord[];
                return (
                  <div key={id} className="rounded-card border border-line p-3">
                    <Checkbox
                      checked={form.analisisIds.includes(id)}
                      onChange={(event) => toggleAnalisis(id, event.target.checked)}
                      label={
                        <span className="flex flex-wrap items-center gap-2">
                          <FolioChip type="A" num={a.folio_num} /> {tipoLabel(a.tipo_analisis)} · {metodoLabel(a.metodo, a.metodo_otro)} · {fmtDate(a.fecha_analisis)}
                        </span>
                      }
                      description={`${resultados.length} resultado(s) · aprobó ${a.aprobado_nombre || "—"}`}
                    />
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4">
            {resultadosCongelados.map((a, i) => (
              <div key={i}>
                <p className="mb-2 text-[13.5px] font-medium text-ink">
                  {String(a.folio)} · {String(a.tipo)} · {String(a.metodo)}
                </p>
                <FormTable minWidth={640}>
                  <thead>
                      <tr>
                        <th className={formTh}>ID muestra</th>
                        <th className={formTh}>Resultado</th>
                        <th className={formTh}>Unidad</th>
                        <th className={formTh}>Límite</th>
                        <th className={formTh}>Conformidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((a.resultados || []) as ApiRecord[]).map((r, j) => (
                        <tr key={j}>
                          <td className={cn(formTd, "code")}>{r.id_muestra}</td>
                          <td className={cn(formTd, "tnum")}>{r.resultado ?? r.resultado_texto ?? "—"}</td>
                          <td className={formTd}>{r.unidad || "—"}</td>
                          <td className={cn(formTd, "tnum")}>{r.limite_regulatorio ?? "—"}</td>
                          <td className={formTd}>{r.cumple === "cumple" ? <Badge tone="success">Cumple</Badge> : r.cumple === "no_cumple" ? <Badge tone="danger">No cumple</Badge> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </FormTable>
              </div>
            ))}
          </div>
        )}
      </FormCard>

      <FormCard id="sec-declaraciones" title="Declaraciones" description="Alcance, regla de decisión, desviaciones del método y descargos (7.8.2 l, n; 7.8.6; 7.4.3).">
        <div className="flex flex-col gap-4">
          <Field label="Alcance de los resultados" htmlFor="i-alc">
            {draft ? <Textarea id="i-alc" rows={2} value={form.alcance} onChange={(event) => patch({ alcance: event.target.value })} /> : <ReadValue value={form.alcance} />}
          </Field>
          <Field label="Regla de decisión" htmlFor="i-regla">
            {draft ? <Textarea id="i-regla" rows={2} value={form.reglaDecision} onChange={(event) => patch({ reglaDecision: event.target.value })} /> : <ReadValue value={form.reglaDecision} />}
          </Field>
          <Field label="Adiciones, desviaciones o exclusiones del método" htmlFor="i-desv">
            {draft ? <Textarea id="i-desv" rows={2} value={form.desviaciones} onChange={(event) => patch({ desviaciones: event.target.value })} /> : <ReadValue value={form.desviaciones} />}
          </Field>
          <Field label="Descargo por muestra recibida con desviación" htmlFor="i-desc" hint={descargoSugerido && !form.descargo ? "La recepción fue aceptada con desviación: se sugiere incluir el descargo." : undefined}>
            {draft ? <Textarea id="i-desc" rows={2} value={form.descargo} onChange={(event) => patch({ descargo: event.target.value })} /> : <ReadValue value={form.descargo} />}
          </Field>
          <Field label="Opiniones e interpretaciones" htmlFor="i-op" hint="Solo personal autorizado; deben ir identificadas como tales (7.8.7).">
            {draft ? <Textarea id="i-op" rows={2} value={form.opiniones} onChange={(event) => patch({ opiniones: event.target.value })} /> : <ReadValue value={form.opiniones} />}
          </Field>
          <Field label="Observaciones internas (no salen en el PDF)" htmlFor="i-obs">
            {draft ? <Textarea id="i-obs" rows={2} value={form.observaciones} onChange={(event) => patch({ observaciones: event.target.value })} /> : <ReadValue value={form.observaciones} />}
          </Field>
        </div>
      </FormCard>

      <FormCard id="sec-firmas" title="Elaboró, revisó y autorizó" description="Quien elabora firma aquí; la revisión y la autorización se firman con los botones de la cabecera y quedan en la bitácora.">
        <div className="flex flex-col gap-4">
          <PersonCard title="Elaboró" requires="informes" name={form.elaboradoNombre} onName={(v) => patch({ elaboradoNombre: v })} cargo={form.elaboradoCargo} onCargo={(v) => patch({ elaboradoCargo: v })} signature={form.elaboradoFirma} onSignature={(v) => patch({ elaboradoFirma: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <SignoffCard title="Revisó" name={item?.revisado_nombre} cargo={item?.revisado_cargo} at={item?.revisado_en} hint={editing ? "Se firma con “Marcar revisado”." : "Después de crear el borrador."} />
            <SignoffCard title="Autorizó" name={item?.autorizado_nombre} cargo={item?.autorizado_cargo} at={item?.autorizado_en} hint={editing ? "Se firma con “Autorizar” tras la revisión." : "Después de la revisión."}>
              {item?.pdf_sha256 ? <p className="code mt-1 text-[11px] text-ink-4">SHA-256 {String(item.pdf_sha256).slice(0, 16)}…</p> : null}
            </SignoffCard>
          </div>
        </div>
      </FormCard>

      <FormCard id="sec-entrega" title="Entrega al cliente" description="Cuándo, cómo y a quién se entregó el informe autorizado.">
        {entregaInfo ? (
          <SignoffCard title="Entregado a" name={entregaInfo.a_quien} cargo={REPORT_DELIVERY_MEDIA.find((m) => m.value === entregaInfo.medio)?.label || String(entregaInfo.medio)} at={entregaInfo.fecha} note={entregaInfo.observaciones} />
        ) : (
          <Callout tone="info">{estado === "autorizado" ? "Registra la entrega con el botón «Registrar entrega»." : "La entrega se registra una vez autorizado el informe."}</Callout>
        )}
      </FormCard>

      <SignDialog
        key={sign || "sin-firma"}
        open={sign !== null}
        onOpenChange={(open) => !open && setSign(null)}
        title={sign === "revisar" ? "Marcar informe como revisado" : "Autorizar informe"}
        description={sign === "revisar" ? `Quedará registrado a nombre de ${user?.nombre || user?.email || "tu usuario"}.` : "Al autorizar se congelan los resultados, se genera el PDF y la recepción pasa a informada."}
        confirmLabel={sign === "revisar" ? "Marcar revisado" : "Autorizar"}
        withCargo={false}
        requireSignature={sign === "autorizar"}
        loading={signing}
        onConfirm={doSign}
      />

      <Dialog
        open={entrega.open}
        onOpenChange={(open) => setEntrega({ ...entrega, open })}
        title="Registrar entrega del informe"
        description="Queda constancia de la entrega en la bitácora."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntrega({ ...entrega, open: false })}>
              Cancelar
            </Button>
            <Button onClick={registrarEntrega}>Registrar entrega</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormGrid>
            <Field label="Fecha" htmlFor="e-fecha" required>
              <Input id="e-fecha" type="date" value={entrega.fecha} onChange={(event) => setEntrega({ ...entrega, fecha: event.target.value })} />
            </Field>
            <Field label="Medio" htmlFor="e-medio" required>
              <Select id="e-medio" value={entrega.medio} onChange={(event) => setEntrega({ ...entrega, medio: event.target.value })}>
                {REPORT_DELIVERY_MEDIA.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
          <Field label="Entregado a" htmlFor="e-quien" required>
            <Input id="e-quien" maxLength={180} value={entrega.aQuien} onChange={(event) => setEntrega({ ...entrega, aQuien: event.target.value })} />
          </Field>
          <Field label="Observaciones" htmlFor="e-obs">
            <Textarea id="e-obs" rows={2} value={entrega.observaciones} onChange={(event) => setEntrega({ ...entrega, observaciones: event.target.value })} />
          </Field>
        </div>
      </Dialog>
    </FormPage>
  );
}
