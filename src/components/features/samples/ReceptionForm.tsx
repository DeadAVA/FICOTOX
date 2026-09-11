"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, FloppyDisk, Plus, X } from "@phosphor-icons/react";
import { RecordHistory } from "@/components/features/audit/RecordHistory";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Textarea, controlClassSm } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { fmtDate, isoDate, parseIntOrNull } from "@/lib/client/format";
import { formatSampleFolio, isSampleReadOnly, sampleStatusLabel } from "@/lib/client/samples";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ACCEPTANCE_DECISIONS, DISPOSAL_TYPES, LEGACY_INSPECTION_REQUIREMENTS, LEGACY_RECEPTION_METHODS, LEGACY_RECEPTION_SAMPLE_TYPES, RECEPTION_ANALYSIS_TYPES, RECEPTION_INSPECTION_REQUIREMENTS, RECEPTION_METHODS, RECEPTION_SAMPLE_TYPES, CLIENT_CONTACT_MEDIA, RECEPTION_DELIVERY_MEDIA, STORAGE_PLACES } from "@/lib/shared/sgc";
import { Callout, ChoiceCard, ChoiceGrid, FieldGroup, FormCard, FormPage, Panel, PersonCard, missingMessage, missingSections, openFormSection, type FormSectionDef } from "./FormLayout";
import { PersonSelect } from "./PersonSelect";
import { SignaturePad } from "./SignaturePad";
import { FolioChip, SampleStatus } from "./status";

/*
 * Formato de recepcion de muestras (FX-TCF-GMR) como pagina completa, con
 * la decision de aceptacion (FX-MC 7.4.3), la disposicion final (7.4.4) y
 * el historial de auditoria.
 */

interface LoteRow {
  key: number;
  trabajar: boolean;
  id_interno: string;
  nombre_organismo: string;
  cantidad_volumen: string;
  sitio_muestreo: string;
  fecha_muestra: string;
  informacion_adicional: string;
}

interface InspectionRow {
  requisito: string;
  estado: string;
  observacion: string;
}

let loteKey = 1;
const newLoteRow = (item: ApiRecord = {}): LoteRow => ({
  key: loteKey++,
  trabajar: item.trabajar !== false,
  id_interno: item.id_interno || "",
  nombre_organismo: item.nombre_organismo || "",
  cantidad_volumen: item.cantidad_volumen || "",
  sitio_muestreo: item.sitio_muestreo || "",
  fecha_muestra: isoDate(item.fecha_muestra),
  informacion_adicional: item.informacion_adicional || "",
});

interface Comunicacion {
  fecha: string;
  medio: string;
  persona: string;
  respuesta: string;
}

interface SampleForm {
  claveRevision: string;
  fechaEmision: string;
  tipoRegistro: string;
  estado: string;
  folio: string;
  fechaRecepcion: string;
  horaRecepcion: string;
  recibidoPor: string;
  medioRecepcion: string;
  solicitante: string;
  muestraUnica: boolean;
  fechaMuestra: string;
  idInterno: string;
  especificaciones: string;
  loteRows: LoteRow[];
  tipos: string[];
  metodos: string[];
  metodoOtro: string;
  tiposMuestra: string[];
  tipoMuestraOtro: string;
  analisisObservaciones: string;
  inspeccion: InspectionRow[];
  inspeccionGeneral: string;
  decision: string;
  aceptacionFecha: string;
  aceptacionResponsable: string;
  temperaturaLlegada: string;
  aceptacionObservaciones: string;
  comunicacion: Comunicacion;
  solicitanteNombre: string;
  solicitanteFirma: string;
  conformidad: boolean;
  custodioNombre: string;
  custodioCargo: string;
  custodioFirma: string;
  custodioLugar: string;
  custodioOtro: string;
}

const defaultForm = (): SampleForm => ({
  claveRevision: "FX-TCF-GMR",
  fechaEmision: isoDate(new Date()),
  tipoRegistro: "R",
  estado: "registrada",
  folio: "",
  fechaRecepcion: isoDate(new Date()),
  horaRecepcion: new Date().toTimeString().slice(0, 5),
  recibidoPor: formatActiveUserSignature(),
  medioRecepcion: "",
  solicitante: "",
  muestraUnica: true,
  fechaMuestra: "",
  idInterno: "",
  especificaciones: "",
  loteRows: [newLoteRow()],
  tipos: [],
  metodos: [],
  metodoOtro: "",
  tiposMuestra: [],
  tipoMuestraOtro: "",
  analisisObservaciones: "",
  inspeccion: RECEPTION_INSPECTION_REQUIREMENTS.map((requisito) => ({ requisito, estado: "", observacion: "" })),
  inspeccionGeneral: "",
  decision: "",
  aceptacionFecha: isoDate(new Date()),
  aceptacionResponsable: formatActiveUserSignature(),
  temperaturaLlegada: "",
  aceptacionObservaciones: "",
  comunicacion: { fecha: "", medio: "", persona: "", respuesta: "" },
  solicitanteNombre: "",
  solicitanteFirma: "",
  conformidad: false,
  custodioNombre: formatActiveUserSignature(),
  custodioCargo: "",
  custodioFirma: "",
  custodioLugar: "",
  custodioOtro: "",
});

/* La inspeccion guardada con el texto de la version anterior se casa por posicion (mismos 7 requisitos). */
const inspectionFromSaved = (checklist: ApiRecord[]): InspectionRow[] => {
  const byText = new Map(checklist.map((entry) => [String(entry.requisito || ""), entry]));
  return RECEPTION_INSPECTION_REQUIREMENTS.map((requisito, index) => {
    const current = byText.get(requisito) || byText.get(LEGACY_INSPECTION_REQUIREMENTS[index]) || {};
    return { requisito, estado: current.estado || "", observacion: current.observacion || "" };
  });
};

const formFromItem = (item: ApiRecord): SampleForm => {
  const analisis = item.analisis || {};
  const inspeccion = item.inspeccion || {};
  const checklist: ApiRecord[] = Array.isArray(inspeccion.checklist) ? inspeccion.checklist : [];
  const solicitante = item.datos_solicitante || {};
  const custodio = item.datos_custodio || {};
  const aceptacion = item.aceptacion || {};
  const comunicacion = aceptacion.comunicacion_cliente || {};
  const lote: ApiRecord[] = Array.isArray(item.lote_muestras) ? item.lote_muestras : [];
  return {
    ...defaultForm(),
    claveRevision: item.clave_revision || "FX-TCF-GMR",
    fechaEmision: isoDate(item.fecha_emision),
    tipoRegistro: item.tipo_registro || "R",
    folio: item.folio_num ? String(item.folio_num) : "",
    fechaRecepcion: isoDate(item.fecha_recepcion),
    horaRecepcion: item.hora_recepcion || "",
    recibidoPor: item.recibido_por || "",
    medioRecepcion: item.medio_recepcion || "",
    solicitante: item.solicitante || "",
    muestraUnica: !!item.muestra_unica,
    fechaMuestra: isoDate(item.fecha_muestra),
    idInterno: item.id_interno || "",
    especificaciones: item.especificaciones || "",
    estado: item.estado || "registrada",
    loteRows: lote.length ? lote.map((entry) => newLoteRow(entry)) : [newLoteRow()],
    tipos: analisis.tipos || [],
    metodos: analisis.metodos || [],
    metodoOtro: analisis.metodo_otro || "",
    tiposMuestra: analisis.tipos_muestra || [],
    tipoMuestraOtro: analisis.tipo_muestra_otro || "",
    analisisObservaciones: analisis.observaciones || "",
    inspeccion: inspectionFromSaved(checklist),
    inspeccionGeneral: inspeccion.observaciones_generales || "",
    decision: item.decision_aceptacion || "",
    aceptacionFecha: isoDate(aceptacion.fecha) || isoDate(new Date()),
    aceptacionResponsable: aceptacion.responsable || formatActiveUserSignature(),
    temperaturaLlegada: aceptacion.temperatura_llegada || "",
    aceptacionObservaciones: aceptacion.observaciones || "",
    comunicacion: { fecha: isoDate(comunicacion.fecha), medio: comunicacion.medio || "", persona: comunicacion.persona || "", respuesta: comunicacion.respuesta || "" },
    solicitanteNombre: solicitante.nombre_entrega || "",
    solicitanteFirma: solicitante.firma_conformidad || "",
    conformidad: solicitante.conformidad === true || (solicitante.conformidad === undefined && !!solicitante.firma_conformidad),
    custodioNombre: custodio.nombre_cargo_firma || "",
    custodioCargo: custodio.cargo || "",
    custodioFirma: custodio.firma_digital || "",
    custodioLugar: custodio.lugar_resguardo || "",
    custodioOtro: custodio.lugar_otro || "",
  };
};

/* La decisión puede tomarse después de registrar (sin ella no se procesa), por eso es opcional al guardar. */
const SECTIONS_BASE: FormSectionDef[] = [
  { id: "sec-recepcion", label: "Recepción" },
  { id: "sec-muestra", label: "Muestra" },
  { id: "sec-analisis", label: "Análisis solicitado" },
  { id: "sec-inspeccion", label: "Inspección visual" },
  { id: "sec-aceptacion", label: "Decisión de aceptación", optional: true },
  { id: "sec-solicitante", label: "Solicitante" },
  { id: "sec-custodio", label: "Custodio y resguardo" },
];
const SECTIONS_EDIT: FormSectionDef[] = [
  { id: "sec-cadena", label: "Seguimiento", optional: true },
  { id: "sec-disposicion", label: "Disposición final", optional: true },
  { id: "sec-historial", label: "Historial", optional: true },
];

const toggle = (list: string[], value: string, checked: boolean) => (checked ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value));

/* Valores guardados que ya no estan en el catalogo (version anterior): se muestran para poder quitarlos. */
function LegacyChips({ values, catalog, labels, onRemove }: { values: string[]; catalog: string[]; labels: Record<string, string>; onRemove: (value: string) => void }) {
  const legacy = values.filter((value) => !catalog.includes(value));
  if (!legacy.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {legacy.map((value) => (
        <span key={value} className="inline-flex items-center gap-1 rounded-[6px] bg-warning-soft px-2 py-0.5 text-[12px] text-warning-text">
          {labels[value] || value}
          <button type="button" onClick={() => onRemove(value)} aria-label={`Quitar ${labels[value] || value}`} className="opacity-70 hover:opacity-100">
            <X size={11} weight="bold" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function ReceptionForm({ item }: { item: ApiRecord | null }) {
  const router = useRouter();
  const { token, can } = useSession();
  const [form, setForm] = useState<SampleForm>(() => (item ? formFromItem(item) : defaultForm()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disposicion, setDisposicion] = useState({ tipo: "", tipoOtro: "", fecha: isoDate(new Date()), responsable: formatActiveUserSignature(), remanentes: "", observaciones: "", firma: "" });
  const [savingDisposicion, setSavingDisposicion] = useState(false);
  const editing = !!item?.id;
  const readOnly = editing && isSampleReadOnly(item?.estado);
  const patch = (changes: Partial<SampleForm>) => setForm((prev) => ({ ...prev, ...changes }));

  useEffect(() => {
    if (item || !token) return;
    getJsonAuth(`${API_BASE_URL}/samples/reception/next-folio`, token)
      .then((data) => patch({ folio: data.next_folio ? String(data.next_folio) : "" }))
      .catch(() => patch({ folio: "" }));
  }, [item, token]);

  const isUnique = form.muestraUnica;
  const methodOther = form.metodos.includes("otro");
  const sampleOther = form.tiposMuestra.includes("otro");
  const hasNc = form.inspeccion.some((row) => row.estado === "NC");
  const inspectionComplete = form.inspeccion.every((row) => !!row.estado);
  const needsComunicacion = form.decision === "aceptada_con_desviacion" || form.decision === "rechazada";
  /* Completitud por seccion para el riel del formato: que falta antes de guardar. */
  const completeness: Record<string, boolean | undefined> = {
    "sec-recepcion": !!(form.folio && form.fechaRecepcion && form.horaRecepcion && form.medioRecepcion && form.recibidoPor.trim()),
    "sec-muestra": isUnique ? !!form.idInterno.trim() : form.loteRows.some((row) => row.id_interno.trim()),
    "sec-analisis": form.tipos.length > 0,
    "sec-inspeccion": inspectionComplete,
    // Sin decisión aún = sin evaluar; con decisión, completa si no falta la comunicación al cliente.
    "sec-aceptacion": form.decision ? !needsComunicacion || !!(form.comunicacion.fecha && form.comunicacion.medio) : undefined,
    // El formato pide nombre, firma de conformidad y la casilla de conformidad de quien entrega.
    "sec-solicitante": !!form.solicitanteNombre.trim() && !!form.solicitanteFirma && form.conformidad,
    "sec-custodio": !!form.custodioNombre.trim() && !!form.custodioLugar && !!form.custodioFirma,
  };
  const sections = (editing ? [...SECTIONS_BASE, ...SECTIONS_EDIT] : SECTIONS_BASE).map((section) => ({ ...section, complete: readOnly ? undefined : completeness[section.id] }));

  const updateLote = (key: number, changes: Partial<LoteRow>) => patch({ loteRows: form.loteRows.map((row) => (row.key === key ? { ...row, ...changes } : row)) });

  const buildPayload = () => {
    const lote = form.loteRows
      .map((row) => ({
        trabajar: !!row.trabajar,
        id_interno: row.id_interno.trim() || null,
        nombre_organismo: row.nombre_organismo.trim() || null,
        cantidad_volumen: row.cantidad_volumen.trim() || null,
        sitio_muestreo: row.sitio_muestreo.trim() || null,
        fecha_muestra: row.fecha_muestra || null,
        informacion_adicional: row.informacion_adicional.trim() || null,
      }))
      .filter((row) => [row.id_interno, row.nombre_organismo, row.cantidad_volumen, row.sitio_muestreo, row.fecha_muestra, row.informacion_adicional].some(Boolean));
    return {
      folio_num: parseIntOrNull(form.folio),
      tipo_registro: form.tipoRegistro.trim() || "R",
      clave_revision: form.claveRevision.trim() || "FX-TCF-GMR",
      fecha_emision: form.fechaEmision || null,
      fecha_recepcion: form.fechaRecepcion || null,
      hora_recepcion: form.horaRecepcion || null,
      recibido_por: form.recibidoPor.trim() || null,
      medio_recepcion: form.medioRecepcion.trim() || null,
      solicitante: form.solicitante.trim() || null,
      muestra_unica: isUnique,
      fecha_muestra: form.fechaMuestra || null,
      id_interno: isUnique ? form.idInterno.trim() || null : null,
      especificaciones: form.especificaciones.trim() || null,
      estado: form.estado || "registrada",
      lote_muestras: isUnique ? [] : lote,
      analisis: {
        tipos: form.tipos,
        metodos: form.metodos,
        metodo_otro: methodOther ? form.metodoOtro.trim() || null : null,
        tipos_muestra: form.tiposMuestra,
        tipo_muestra_otro: sampleOther ? form.tipoMuestraOtro.trim() || null : null,
        observaciones: form.analisisObservaciones.trim() || null,
      },
      inspeccion: {
        checklist: form.inspeccion.map((row) => ({ requisito: row.requisito, estado: row.estado, observacion: row.observacion.trim() || null })),
        observaciones_generales: form.inspeccionGeneral.trim() || null,
      },
      decision_aceptacion: form.decision || null,
      aceptacion: form.decision
        ? {
            fecha: form.aceptacionFecha || null,
            responsable: form.aceptacionResponsable.trim() || null,
            temperatura_llegada: form.temperaturaLlegada.trim() || null,
            observaciones: form.aceptacionObservaciones.trim() || null,
            comunicacion_cliente: needsComunicacion ? { requerida: true, fecha: form.comunicacion.fecha || null, medio: form.comunicacion.medio || null, persona: form.comunicacion.persona.trim() || null, respuesta: form.comunicacion.respuesta.trim() || null } : { requerida: false },
          }
        : {},
      datos_solicitante: { nombre_entrega: form.solicitanteNombre.trim() || null, firma_conformidad: form.solicitanteFirma.trim() || null, conformidad: form.conformidad },
      datos_custodio: {
        nombre_cargo_firma: form.custodioNombre.trim() || null,
        cargo: form.custodioCargo.trim() || null,
        firma_digital: form.custodioFirma.trim() || null,
        lugar_resguardo: form.custodioLugar || null,
        lugar_otro: form.custodioOtro.trim() || null,
      },
    };
  };

  const focus = (id: string) => openFormSection(id);

  const fail = (message: string, section: string) => {
    setError(message);
    toast.error(message);
    focus(section);
  };

  const handleSave = async () => {
    const payload = buildPayload();
    const missing = missingSections(sections);
    if (missing.length) return fail(missingMessage(missing), missing[0].id);
    if (!payload.folio_num) return fail("El folio es obligatorio", "sec-recepcion");
    if (!payload.recibido_por) return fail("Captura quién recibe la muestra", "sec-recepcion");
    if (!payload.medio_recepcion) return fail("Selecciona el medio de recepción", "sec-recepcion");
    if (payload.muestra_unica && !payload.id_interno) return fail("En muestra única el ID interno es obligatorio", "sec-muestra");
    if (!payload.muestra_unica && payload.lote_muestras.length === 0) return fail("Captura al menos una muestra del lote", "sec-muestra");
    if (form.decision && !inspectionComplete) return fail("Para decidir la aceptación completa la inspección visual (C, NC o NA en cada requisito)", "sec-inspeccion");
    if (form.decision === "aceptada" && hasNc) return fail("Hay requisitos que no cumplen: la muestra solo puede aceptarse con desviación o rechazarse", "sec-aceptacion");
    if (needsComunicacion && (!form.comunicacion.fecha || !form.comunicacion.medio)) return fail("Registra la comunicación al cliente (fecha y medio)", "sec-aceptacion");
    if (!can("muestras", editing ? "update" : "create")) return fail("No tienes permiso para esta acción", "sec-recepcion");
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/reception/${item!.id}`, token, payload);
        toast.success("Recepción actualizada");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/reception`, token, payload);
        toast.success("Recepción registrada");
      }
      invalidate("muestras", "dashboard");
      router.push("/muestras/recepcion");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar la recepción";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  const registrarDisposicion = async () => {
    if (!disposicion.tipo) return toast.error("Selecciona el tipo de disposición final");
    if (!disposicion.fecha || !disposicion.responsable.trim()) return toast.error("Fecha y responsable son obligatorios");
    setSavingDisposicion(true);
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/samples/reception/${item!.id}/disposicion`, token, {
        tipo: disposicion.tipo,
        tipo_otro: disposicion.tipoOtro.trim() || null,
        fecha: disposicion.fecha,
        responsable: disposicion.responsable.trim(),
        remanentes: disposicion.remanentes.trim() || null,
        observaciones: disposicion.observaciones.trim() || null,
        firma: disposicion.firma || null,
      });
      toast.success("Disposición registrada; la muestra queda cerrada");
      invalidate("muestras", "dashboard");
      router.push("/muestras/recepcion");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la disposición");
      setSavingDisposicion(false);
    }
  };

  const decisionMeta = ACCEPTANCE_DECISIONS.find((d) => d.value === form.decision);
  const savedDisposicion = item?.disposicion as ApiRecord | null | undefined;
  const procesamientos = (item?.procesamientos || []) as ApiRecord[];
  // Una muestra rechazada tambien se dispone (se devuelve o se desecha); solo las
  // cerradas y las anuladas ya no admiten disposicion.
  const puedeDisponer = editing && !["cerrada", "anulada"].includes(String(form.estado)) && can("muestras", "update") && !savedDisposicion;

  return (
    <FormPage
      backHref="/muestras/recepcion"
      backLabel="Recepciones"
      code="FX-TCF-GMR"
      title={editing ? `Recepción ${formatSampleFolio(item!)}` : "Nueva recepción"}
      status={sampleStatusLabel(form.estado)}
      statusTone={readOnly ? (form.estado === "cerrada" ? "ink" : "danger") : "brand"}
      sections={sections}
      error={error}
      readOnly={readOnly}
      after={
        editing ? (
          <>
          <FormCard id="sec-cadena" title="Seguimiento de la muestra" description="Etapas registradas a partir de esta recepción.">
            {procesamientos.length ? (
              <ul className="flex flex-col gap-2">
                {procesamientos.map((proc) => (
                  <li key={proc.id} className="flex items-center justify-between gap-3 rounded-card border border-line px-3 py-2">
                    <span className="flex items-center gap-2">
                      <FolioChip type="P" num={proc.folio_num} />
                      <SampleStatus status={proc.estado} />
                    </span>
                    <Link href={`/muestras/procesamiento/${proc.id}`} className="text-[13px] font-medium text-brand hover:text-brand-strong">
                      Abrir procesamiento
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">Aún no hay procesamientos vinculados a esta recepción.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/muestras/analisis?recepcion=${item!.id}`} className="text-[13px] font-medium text-brand hover:text-brand-strong">
                Ver análisis de esta recepción
              </Link>
              <span className="text-ink-4">·</span>
              <Link href={`/informes?recepcion=${item!.id}`} className="text-[13px] font-medium text-brand hover:text-brand-strong">
                Ver informes
              </Link>
            </div>
          </FormCard>

          <FormCard id="sec-disposicion" title="Disposición final de remanentes" description="Cierra la muestra: qué se hizo con lo que sobró, cuándo y quién (FX-MC 7.4.4).">
            {savedDisposicion ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="text-[13.5px]">
                  <span className="text-ink-3">Disposición: </span>
                  <span className="font-medium text-ink">{DISPOSAL_TYPES.find((d) => d.value === savedDisposicion.tipo)?.label || savedDisposicion.tipo_otro || savedDisposicion.tipo}</span>
                </p>
                <p className="text-[13.5px]">
                  <span className="text-ink-3">Fecha: </span>
                  <span className="font-medium text-ink">{fmtDate(savedDisposicion.fecha)}</span>
                </p>
                <p className="text-[13.5px]">
                  <span className="text-ink-3">Responsable: </span>
                  <span className="font-medium text-ink">{savedDisposicion.responsable}</span>
                </p>
                <p className="text-[13.5px]">
                  <span className="text-ink-3">Remanentes: </span>
                  <span className="text-ink">{savedDisposicion.remanentes || "—"}</span>
                </p>
                {savedDisposicion.observaciones ? <p className="text-[13.5px] sm:col-span-2">{savedDisposicion.observaciones}</p> : null}
              </div>
            ) : puedeDisponer ? (
              <div className="flex flex-col gap-4">
                <ChoiceGrid>
                  {DISPOSAL_TYPES.map((d) => (
                    <ChoiceCard key={d.value} type="radio" name="r-disp" checked={disposicion.tipo === d.value} onChange={() => setDisposicion({ ...disposicion, tipo: d.value })} label={d.label} />
                  ))}
                </ChoiceGrid>
                {disposicion.tipo === "otro" ? <Input placeholder="Especificar" maxLength={120} value={disposicion.tipoOtro} onChange={(event) => setDisposicion({ ...disposicion, tipoOtro: event.target.value })} aria-label="Otro tipo de disposición" /> : null}
                <FormGrid cols={3}>
                  <Field label="Fecha" htmlFor="r-disp-fecha" required>
                    <Input id="r-disp-fecha" type="date" value={disposicion.fecha} onChange={(event) => setDisposicion({ ...disposicion, fecha: event.target.value })} />
                  </Field>
                  <Field label="Responsable" htmlFor="r-disp-resp" required>
                    <PersonSelect id="r-disp-resp" value={disposicion.responsable} onChange={(name) => setDisposicion({ ...disposicion, responsable: name })} requires="muestras" />
                  </Field>
                  <Field label="Remanentes" htmlFor="r-disp-rem" hint="Qué sobró y cuánto.">
                    <Input id="r-disp-rem" maxLength={240} value={disposicion.remanentes} onChange={(event) => setDisposicion({ ...disposicion, remanentes: event.target.value })} />
                  </Field>
                </FormGrid>
                <FormGrid>
                  <Field label="Observaciones" htmlFor="r-disp-obs">
                    <Textarea id="r-disp-obs" rows={3} value={disposicion.observaciones} onChange={(event) => setDisposicion({ ...disposicion, observaciones: event.target.value })} />
                  </Field>
                  <Field label="Firma del responsable">
                    <SignaturePad value={disposicion.firma} onChange={(value) => setDisposicion({ ...disposicion, firma: value })} label="Firma de la disposición" />
                  </Field>
                </FormGrid>
                <div>
                  <Button variant="secondary" icon={<Archive size={16} />} loading={savingDisposicion} onClick={registrarDisposicion}>
                    Registrar disposición y cerrar la muestra
                  </Button>
                </div>
              </div>
            ) : (
              <Callout tone="info">La disposición final se registra cuando la muestra ya no requiere trabajo en el laboratorio.</Callout>
            )}
          </FormCard>
            <FormCard id="sec-historial" title="Historial del registro" description="Bitácora de auditoría: quién creó, editó, aceptó, anuló o cerró esta recepción y qué cambió.">
              <RecordHistory entidad="muestras_recepcion" entidadId={item?.id as number | undefined} />
            </FormCard>
          </>
        ) : null
      }
      actions={
        <>
          <Button variant="secondary" onClick={() => router.push("/muestras/recepcion")}>
            {readOnly ? "Volver" : "Cancelar"}
          </Button>
          {!readOnly ? (
            <Button onClick={handleSave} loading={submitting} icon={<FloppyDisk size={16} />}>
              {editing ? "Guardar cambios" : "Registrar recepción"}
            </Button>
          ) : null}
        </>
      }
    >
      {readOnly && item?.motivo_anulacion ? (
        <Callout tone="danger" title="Registro anulado">
          Motivo: {String(item.motivo_anulacion)}
        </Callout>
      ) : null}

      <FormCard id="sec-recepcion" title="Datos de la recepción" description="Quién recibe, cuándo y por qué medio.">
        <FormGrid cols={4}>
          <Field label="Folio" htmlFor="r-folio" required hint="Se sugiere el siguiente disponible.">
            <Input id="r-folio" type="number" min="1" inputMode="numeric" value={form.folio} onChange={(event) => patch({ folio: event.target.value })} mono invalid={!!error && !form.folio} />
          </Field>
          <Field label="Fecha de recepción" htmlFor="r-fecha" required>
            <Input id="r-fecha" type="date" value={form.fechaRecepcion} onChange={(event) => patch({ fechaRecepcion: event.target.value })} />
          </Field>
          <Field label="Hora" htmlFor="r-hora" required>
            <Input id="r-hora" type="time" value={form.horaRecepcion} onChange={(event) => patch({ horaRecepcion: event.target.value })} />
          </Field>
          <Field label="Medio de recepción" htmlFor="r-medio" required>
            <Select id="r-medio" value={form.medioRecepcion} onChange={(event) => patch({ medioRecepcion: event.target.value })} invalid={!!error && !form.medioRecepcion}>
              <option value="">Seleccionar</option>
              {RECEPTION_DELIVERY_MEDIA.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Recibido por" htmlFor="r-recibido" required className="sm:col-span-2">
            <PersonSelect id="r-recibido" value={form.recibidoPor} onChange={(name) => patch({ recibidoPor: name })} requires="muestras" placeholder="Quién recibe la muestra" />
          </Field>
          <Field label="Solicitante" htmlFor="r-solicitante" className="sm:col-span-2">
            <Input id="r-solicitante" maxLength={180} placeholder="Cliente o institución que entrega" value={form.solicitante} onChange={(event) => patch({ solicitante: event.target.value })} />
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard id="sec-muestra" title="Datos de la muestra" description="Muestra única o lote con varias muestras.">
        <ChoiceGrid cols={2} className="mb-5">
          <ChoiceCard type="radio" name="r-tipo" checked={isUnique} onChange={() => patch({ muestraUnica: true })} label="Muestra única" description="Un solo organismo o volumen con ID interno." />
          <ChoiceCard type="radio" name="r-tipo" checked={!isUnique} onChange={() => patch({ muestraUnica: false })} label="Lote" description="Varias muestras asociadas a la misma recepción." />
        </ChoiceGrid>
        {isUnique ? (
          <FormGrid cols={3}>
            <Field label="ID interno" htmlFor="r-id" required>
              <Input id="r-id" maxLength={100} placeholder="Ejemplo: D26-100" value={form.idInterno} onChange={(event) => patch({ idInterno: event.target.value })} mono invalid={!!error && isUnique && !form.idInterno.trim()} />
            </Field>
            <Field label="Fecha de la muestra" htmlFor="r-fecha-muestra">
              <Input id="r-fecha-muestra" type="date" value={form.fechaMuestra} onChange={(event) => patch({ fechaMuestra: event.target.value })} />
            </Field>
            <Field label="Especificaciones" htmlFor="r-esp">
              <Input id="r-esp" maxLength={220} value={form.especificaciones} onChange={(event) => patch({ especificaciones: event.target.value })} />
            </Field>
          </FormGrid>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-ink-3">{form.loteRows.length} muestra(s) en el lote. Marca “Trabajar” en las que continúan al procesamiento.</p>
            <div className="flex flex-col gap-2.5">
              {form.loteRows.map((row, index) => {
                const cell = "flex flex-col gap-1 text-[11.5px] font-medium text-ink-3";
                return (
                  <div key={row.key} className="on-panel grid gap-3 rounded-[12px] bg-surface-2 p-3.5 ring-1 ring-line md:grid-cols-[auto_minmax(0,1fr)_auto]">
                    <div className="self-start md:w-[88px] md:pt-5">
                      <Checkbox label="Trabajar" checked={row.trabajar} onChange={(event) => updateLote(row.key, { trabajar: event.target.checked })} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className={cell}>
                        ID interno · muestra {index + 1}
                        <input className={`${controlClassSm} font-mono`} placeholder="Ej. D26-101" value={row.id_interno} onChange={(event) => updateLote(row.key, { id_interno: event.target.value })} aria-label={`ID interno de la muestra ${index + 1}`} />
                      </label>
                      <label className={cell}>
                        Organismo
                        <input className={`${controlClassSm}`} value={row.nombre_organismo} onChange={(event) => updateLote(row.key, { nombre_organismo: event.target.value })} aria-label={`Organismo de la muestra ${index + 1}`} />
                      </label>
                      <label className={cell}>
                        Cantidad / volumen
                        <input className={`${controlClassSm}`} value={row.cantidad_volumen} onChange={(event) => updateLote(row.key, { cantidad_volumen: event.target.value })} aria-label={`Cantidad o volumen de la muestra ${index + 1}`} />
                      </label>
                      <label className={cell}>
                        Sitio de muestreo
                        <input className={`${controlClassSm}`} value={row.sitio_muestreo} onChange={(event) => updateLote(row.key, { sitio_muestreo: event.target.value })} aria-label={`Sitio de muestreo de la muestra ${index + 1}`} />
                      </label>
                      <label className={cell}>
                        Fecha de la muestra
                        <input type="date" className={`${controlClassSm}`} value={row.fecha_muestra} onChange={(event) => updateLote(row.key, { fecha_muestra: event.target.value })} aria-label={`Fecha de la muestra ${index + 1}`} />
                      </label>
                      <label className={cell}>
                        Información adicional
                        <input className={`${controlClassSm}`} value={row.informacion_adicional} onChange={(event) => updateLote(row.key, { informacion_adicional: event.target.value })} aria-label={`Información adicional de la muestra ${index + 1}`} />
                      </label>
                    </div>
                    <div className="flex items-start justify-end md:pt-4">
                      <IconButton label={`Quitar muestra ${index + 1}`} size="sm" tone="danger" onClick={() => patch({ loteRows: form.loteRows.length > 1 ? form.loteRows.filter((r) => r.key !== row.key) : [newLoteRow()] })}>
                        <X size={14} weight="bold" />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <Button variant="ghost" size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => patch({ loteRows: [...form.loteRows, newLoteRow()] })}>
                Agregar muestra
              </Button>
            </div>
          </div>
        )}
      </FormCard>

      <FormCard id="sec-analisis" title="Análisis solicitado" description="Marca uno o más análisis, el método y el tipo de muestra, tal como los lista el formato.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de análisis</p>
            {RECEPTION_ANALYSIS_TYPES.map(({ value, label }) => (
              <Checkbox key={value} label={label} checked={form.tipos.includes(value)} onChange={(event) => patch({ tipos: toggle(form.tipos, value, event.target.checked) })} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Método de análisis</p>
            {RECEPTION_METHODS.map(({ value, label }) => (
              <Checkbox key={value} label={label} checked={form.metodos.includes(value)} onChange={(event) => patch({ metodos: toggle(form.metodos, value, event.target.checked), metodoOtro: value === "otro" && !event.target.checked ? "" : form.metodoOtro })} />
            ))}
            <LegacyChips values={form.metodos} catalog={RECEPTION_METHODS.map((m) => m.value)} labels={LEGACY_RECEPTION_METHODS} onRemove={(value) => patch({ metodos: form.metodos.filter((v) => v !== value) })} />
            {methodOther ? <Input placeholder="Especifica el método" maxLength={120} value={form.metodoOtro} onChange={(event) => patch({ metodoOtro: event.target.value })} aria-label="Otro método" /> : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de muestra</p>
            {RECEPTION_SAMPLE_TYPES.map(({ value, label }) => (
              <Checkbox key={value} label={label} checked={form.tiposMuestra.includes(value)} onChange={(event) => patch({ tiposMuestra: toggle(form.tiposMuestra, value, event.target.checked), tipoMuestraOtro: value === "otro" && !event.target.checked ? "" : form.tipoMuestraOtro })} />
            ))}
            <LegacyChips values={form.tiposMuestra} catalog={RECEPTION_SAMPLE_TYPES.map((m) => m.value)} labels={LEGACY_RECEPTION_SAMPLE_TYPES} onRemove={(value) => patch({ tiposMuestra: form.tiposMuestra.filter((v) => v !== value) })} />
            {sampleOther ? <Input placeholder="Especifica el tipo de muestra" maxLength={120} value={form.tipoMuestraOtro} onChange={(event) => patch({ tipoMuestraOtro: event.target.value })} aria-label="Otro tipo de muestra" /> : null}
          </div>
        </div>
        <Field label="Observaciones" htmlFor="r-obs-analisis" className="mt-5">
          <Textarea id="r-obs-analisis" rows={2} value={form.analisisObservaciones} onChange={(event) => patch({ analisisObservaciones: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard
        id="sec-inspeccion"
        title="Inspección visual de la muestra"
        description="Requisitos del formato: cumple (C), no cumple (NC) o no aplica (NA)."
        aside={
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            <Badge tone="success">C cumple</Badge>
            <Badge tone="danger">NC no cumple</Badge>
            <Badge tone="neutral">NA no aplica</Badge>
          </div>
        }
      >
        <div className="flex flex-col divide-y divide-line">
          {form.inspeccion.map((row) => (
            <div key={row.requisito} className="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto_260px] md:items-center">
              <p className="text-[13.5px] leading-snug text-ink">{row.requisito}</p>
              <div className="inline-flex rounded-full bg-surface-3 p-0.5" role="radiogroup" aria-label={row.requisito}>
                {(["C", "NC", "NA"] as const).map((status) => {
                  const active = row.estado === status;
                  const tone = status === "C" ? "bg-success text-white" : status === "NC" ? "bg-danger text-white" : "bg-surface text-ink shadow-card";
                  return (
                    <button key={status} type="button" role="radio" aria-checked={active} onClick={() => patch({ inspeccion: form.inspeccion.map((entry) => (entry.requisito === row.requisito ? { ...entry, estado: active ? "" : status } : entry)) })} className={`press h-7 min-w-11 rounded-full px-2.5 text-[12.5px] font-medium transition-colors ${active ? tone : "text-ink-3 hover:text-ink"}`}>
                      {status}
                    </button>
                  );
                })}
              </div>
              <Input placeholder="Observación" value={row.observacion} onChange={(event) => patch({ inspeccion: form.inspeccion.map((entry) => (entry.requisito === row.requisito ? { ...entry, observacion: event.target.value } : entry)) })} aria-label={`Observación: ${row.requisito}`} small />
            </div>
          ))}
        </div>
        <Field label="Observaciones generales" htmlFor="r-obs-insp" className="mt-5">
          <Textarea id="r-obs-insp" rows={2} value={form.inspeccionGeneral} onChange={(event) => patch({ inspeccionGeneral: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard id="sec-aceptacion" title="Decisión de aceptación" description="Con la inspección completa se decide si la muestra entra al proceso. Sin decisión no se puede procesar.">
        <ChoiceGrid cols={3} className="mb-5">
          {ACCEPTANCE_DECISIONS.map((decision) => (
            <ChoiceCard key={decision.value} type="radio" name="r-decision" checked={form.decision === decision.value} onChange={() => patch({ decision: decision.value })} label={decision.label} description={decision.hint} disabled={decision.value === "aceptada" && hasNc} />
          ))}
        </ChoiceGrid>
        {!inspectionComplete ? <Callout tone="warning" className="mb-4">Faltan requisitos por calificar en la inspección visual.</Callout> : null}
        {hasNc ? <Callout tone="danger" className="mb-4">Hay requisitos que no cumplen (NC): solo puede aceptarse con desviación o rechazarse.</Callout> : null}
        {form.decision ? (
          <div className="flex flex-col gap-4">
            <FormGrid cols={3}>
              <Field label="Fecha de la decisión" htmlFor="r-acep-fecha" required>
                <Input id="r-acep-fecha" type="date" value={form.aceptacionFecha} onChange={(event) => patch({ aceptacionFecha: event.target.value })} />
              </Field>
              <Field label="Responsable" htmlFor="r-acep-resp" required>
                <PersonSelect id="r-acep-resp" value={form.aceptacionResponsable} onChange={(name) => patch({ aceptacionResponsable: name })} requires="muestras" />
              </Field>
              <Field label="Temperatura de llegada" htmlFor="r-acep-temp" hint="Requisito: entre 4 y 10 °C.">
                <Input id="r-acep-temp" maxLength={20} placeholder="Ej. 6 °C" value={form.temperaturaLlegada} onChange={(event) => patch({ temperaturaLlegada: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Observaciones de la decisión" htmlFor="r-acep-obs">
              <Textarea id="r-acep-obs" rows={2} value={form.aceptacionObservaciones} onChange={(event) => patch({ aceptacionObservaciones: event.target.value })} />
            </Field>
            {needsComunicacion ? (
              <Panel title="Comunicación al cliente (FX-MC 7.4.3)" description="La desviación o el rechazo se comunican al cliente antes de continuar. Si pide analizar de todos modos, el informe llevará el descargo correspondiente.">
                <FormGrid cols={4}>
                  <Field label="Fecha" htmlFor="r-com-fecha" required>
                    <Input id="r-com-fecha" type="date" value={form.comunicacion.fecha} onChange={(event) => patch({ comunicacion: { ...form.comunicacion, fecha: event.target.value } })} />
                  </Field>
                  <Field label="Medio" htmlFor="r-com-medio" required>
                    <Select id="r-com-medio" value={form.comunicacion.medio} onChange={(event) => patch({ comunicacion: { ...form.comunicacion, medio: event.target.value } })}>
                      <option value="">Seleccionar</option>
                      {CLIENT_CONTACT_MEDIA.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Persona contactada" htmlFor="r-com-persona">
                    <Input id="r-com-persona" maxLength={180} value={form.comunicacion.persona} onChange={(event) => patch({ comunicacion: { ...form.comunicacion, persona: event.target.value } })} />
                  </Field>
                  <Field label="Respuesta del cliente" htmlFor="r-com-resp">
                    <Input id="r-com-resp" maxLength={240} placeholder="Ej. Solicita continuar con el análisis" value={form.comunicacion.respuesta} onChange={(event) => patch({ comunicacion: { ...form.comunicacion, respuesta: event.target.value } })} />
                  </Field>
                </FormGrid>
              </Panel>
            ) : null}
          </div>
        ) : null}
        {decisionMeta ? <Callout tone={decisionMeta.value === "rechazada" ? "danger" : decisionMeta.value === "aceptada_con_desviacion" ? "warning" : "success"} className="mt-4">Decisión actual: <span className="font-medium">{decisionMeta.label}</span>.</Callout> : null}
      </FormCard>

      <FormCard id="sec-solicitante" title="Datos del solicitante" description="Quien entrega la muestra firma de conformidad.">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <Field label="Nombre de quien entrega" htmlFor="r-sol-nombre">
            <Input id="r-sol-nombre" maxLength={150} value={form.solicitanteNombre} onChange={(event) => patch({ solicitanteNombre: event.target.value })} />
          </Field>
          <Field label="Firma de conformidad">
            <SignaturePad value={form.solicitanteFirma} onChange={(value) => patch({ solicitanteFirma: value })} label="Firma de conformidad del solicitante" compact />
          </Field>
        </div>
        <Panel className="mt-4">
          <Checkbox checked={form.conformidad} onChange={(event) => patch({ conformidad: event.target.checked })} label="He revisado la información registrada en este formato y afirmo que es correcta." description="Se han hecho de mi conocimiento las aclaraciones al final del formato y estoy de acuerdo con ellas. A partir de este momento no se realizan modificaciones a la solicitud del servicio." />
        </Panel>
      </FormCard>

      <FormCard id="sec-custodio" title="Custodio y resguardo" description="Personal que registra el ingreso y dónde se resguarda la muestra.">
        <div className="flex flex-col gap-5">
          <PersonCard title="Custodio" name={form.custodioNombre} onName={(v) => patch({ custodioNombre: v })} cargo={form.custodioCargo} onCargo={(v) => patch({ custodioCargo: v })} signature={form.custodioFirma} onSignature={(v) => patch({ custodioFirma: v })} />
          <FieldGroup label="Lugar de resguardo">
            <ChoiceGrid cols={4}>
              {STORAGE_PLACES.map(({ value, label }) => (
                <ChoiceCard key={value} type="radio" name="r-resguardo" checked={form.custodioLugar === value} onChange={() => patch({ custodioLugar: value, custodioOtro: "" })} label={label} />
              ))}
            </ChoiceGrid>
            {/* El formato deja un espacio junto a cada opción: cuál congelador o refrigerador, o el detalle de "otro". */}
            {form.custodioLugar ? (
              <Input
                placeholder={form.custodioLugar === "congelador" ? "¿Cuál? CO1, CO2 o CO3" : form.custodioLugar === "refrigerador" ? "¿Cuál? RE1" : form.custodioLugar === "ingreso_analisis" ? "Analista o área que la recibe" : "Especificar"}
                maxLength={120}
                value={form.custodioOtro}
                onChange={(event) => patch({ custodioOtro: event.target.value })}
                aria-label="Detalle del lugar de resguardo"
                className="max-w-[360px]"
              />
            ) : null}
          </FieldGroup>
        </div>
      </FormCard>

    </FormPage>
  );
}
