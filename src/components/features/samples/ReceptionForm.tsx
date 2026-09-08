"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FloppyDisk, Plus, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Textarea, controlClass } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { INSPECCION_REQUIREMENTS } from "@/lib/client/constants";
import { isoDate, parseIntOrNull } from "@/lib/client/format";
import { formatSampleFolio, sampleStatusLabel } from "@/lib/client/samples";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ChoiceCard, ChoiceGrid, FormCard, FormPage, PersonCard } from "./FormLayout";
import { SignaturePad } from "./SignaturePad";

/* Formato de recepcion de muestras (FX-TCF-GMR) como pagina completa. */

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

const ANALISIS_TIPOS: Array<[string, string]> = [
  ["acido_domoico", "Ácido domoico (ASP)"],
  ["toxinas_lipofilicas", "Toxinas lipofílicas (DSP)"],
  ["toxinas_paralizantes", "Toxinas paralizantes (PSP)"],
  ["pigmentos", "Pigmentos"],
  ["plancton", "Plancton"],
];
const ANALISIS_METODOS: Array<[string, string]> = [
  ["microscopia", "Microscopía"],
  ["espectrofotometro", "Espectrofotómetro"],
  ["fluorometro", "Fluorómetro"],
  ["luminometro", "Luminómetro"],
  ["otro", "Otro"],
];
const ANALISIS_MUESTRAS: Array<[string, string]> = [
  ["organismo", "Organismo"],
  ["organismo_plancton", "Organismo plancton"],
  ["fitotox", "Fitotox"],
  ["agua_mar", "Agua de mar"],
  ["otro", "Otro"],
];
const RESGUARDO: Array<[string, string]> = [
  ["congelador", "Congelador"],
  ["refrigerador", "Refrigerador"],
  ["ingreso_analisis", "Inicia ingreso para análisis"],
  ["otro", "Otro"],
];

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
  recibidoPor: "",
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
  inspeccion: INSPECCION_REQUIREMENTS.map((requisito) => ({ requisito, estado: "", observacion: "" })),
  inspeccionGeneral: "",
  solicitanteNombre: "",
  solicitanteFirma: "",
  conformidad: false,
  custodioNombre: formatActiveUserSignature(),
  custodioCargo: "",
  custodioFirma: "",
  custodioLugar: "",
  custodioOtro: "",
});

const formFromItem = (item: ApiRecord): SampleForm => {
  const analisis = item.analisis || {};
  const inspeccion = item.inspeccion || {};
  const checklist: ApiRecord[] = Array.isArray(inspeccion.checklist) ? inspeccion.checklist : [];
  const map = new Map(checklist.map((entry) => [entry.requisito, entry]));
  const solicitante = item.datos_solicitante || {};
  const custodio = item.datos_custodio || {};
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
    inspeccion: INSPECCION_REQUIREMENTS.map((requisito) => {
      const current = map.get(requisito) || {};
      return { requisito, estado: current.estado || "", observacion: current.observacion || "" };
    }),
    inspeccionGeneral: inspeccion.observaciones_generales || "",
    solicitanteNombre: solicitante.nombre_entrega || "",
    solicitanteFirma: solicitante.firma_conformidad || "",
    conformidad: !!solicitante.firma_conformidad,
    custodioNombre: custodio.nombre_cargo_firma || "",
    custodioFirma: custodio.firma_digital || "",
    custodioLugar: custodio.lugar_resguardo || "",
    custodioOtro: custodio.lugar_otro || "",
  };
};

const SECTIONS = [
  { id: "sec-recepcion", label: "Recepción" },
  { id: "sec-muestra", label: "Muestra" },
  { id: "sec-analisis", label: "Análisis solicitado" },
  { id: "sec-inspeccion", label: "Inspección visual" },
  { id: "sec-solicitante", label: "Solicitante" },
  { id: "sec-custodio", label: "Custodio y resguardo" },
];

const toggle = (list: string[], value: string, checked: boolean) => (checked ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value));

export function ReceptionForm({ item }: { item: ApiRecord | null }) {
  const router = useRouter();
  const { token, can } = useSession();
  const [form, setForm] = useState<SampleForm>(() => (item ? formFromItem(item) : defaultForm()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;
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
        tipos: ANALISIS_TIPOS.map(([v]) => v).filter((v) => form.tipos.includes(v)),
        metodos: ANALISIS_METODOS.map(([v]) => v).filter((v) => form.metodos.includes(v)),
        metodo_otro: methodOther ? form.metodoOtro.trim() || null : null,
        tipos_muestra: ANALISIS_MUESTRAS.map(([v]) => v).filter((v) => form.tiposMuestra.includes(v)),
        tipo_muestra_otro: sampleOther ? form.tipoMuestraOtro.trim() || null : null,
        observaciones: form.analisisObservaciones.trim() || null,
      },
      inspeccion: {
        checklist: form.inspeccion.map((row) => ({ requisito: row.requisito, estado: row.estado, observacion: row.observacion.trim() || null })),
        observaciones_generales: form.inspeccionGeneral.trim() || null,
      },
      datos_solicitante: { nombre_entrega: form.solicitanteNombre.trim() || null, firma_conformidad: form.solicitanteFirma.trim() || null },
      datos_custodio: {
        nombre_cargo_firma: form.custodioNombre.trim() || null,
        firma_digital: form.custodioFirma.trim() || null,
        lugar_resguardo: form.custodioLugar || null,
        lugar_otro: form.custodioOtro.trim() || null,
      },
    };
  };

  const focus = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload.folio_num) return fail("El folio es obligatorio", "sec-recepcion");
    if (!payload.recibido_por) return fail("Captura quién recibe la muestra", "sec-recepcion");
    if (!payload.medio_recepcion) return fail("Selecciona el medio de recepción", "sec-recepcion");
    if (payload.muestra_unica && !payload.id_interno) return fail("En muestra única el ID interno es obligatorio", "sec-muestra");
    if (!payload.muestra_unica && payload.lote_muestras.length === 0) return fail("Captura al menos una muestra del lote", "sec-muestra");
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
      setError(err instanceof Error ? err.message : "No se pudo guardar la recepción");
      setSubmitting(false);
    }
  };

  const fail = (message: string, section: string) => {
    setError(message);
    toast.error(message);
    focus(section);
  };

  return (
    <FormPage
      backHref="/muestras/recepcion"
      backLabel="Recepciones"
      code="FX-TCF-GMR"
      title={editing ? `Recepción ${formatSampleFolio(item!)}` : "Nueva recepción"}
      status={sampleStatusLabel(form.estado)}
      sections={SECTIONS}
      error={error}
      actions={
        <>
          <Button variant="secondary" onClick={() => router.push("/muestras/recepcion")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={submitting} icon={<FloppyDisk size={16} />}>
            {editing ? "Guardar cambios" : "Registrar recepción"}
          </Button>
        </>
      }
    >
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
              <option value="directa">Entrega directa</option>
              <option value="paqueteria">Paquetería</option>
              <option value="recoleccion">Recolección</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
          <Field label="Recibido por" htmlFor="r-recibido" required className="sm:col-span-2">
            <Input id="r-recibido" maxLength={150} placeholder="Nombre de quien recibe" value={form.recibidoPor} onChange={(event) => patch({ recibidoPor: event.target.value })} invalid={!!error && !form.recibidoPor.trim()} />
          </Field>
          <Field label="Solicitante" htmlFor="r-solicitante" className="sm:col-span-2">
            <Input id="r-solicitante" maxLength={180} placeholder="Cliente o institución que entrega" value={form.solicitante} onChange={(event) => patch({ solicitante: event.target.value })} />
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard id="sec-muestra" title="Datos de la muestra" description="Muestra única o lote con varias muestras.">
        <ChoiceGrid className="mb-5 lg:grid-cols-2">
          <ChoiceCard type="radio" name="r-tipo" checked={isUnique} onChange={() => patch({ muestraUnica: true })} label="Muestra única" description="Un solo organismo o volumen con ID interno." />
          <ChoiceCard type="radio" name="r-tipo" checked={!isUnique} onChange={() => patch({ muestraUnica: false })} label="Lote" description="Varias muestras asociadas a la misma recepción." />
        </ChoiceGrid>
        {isUnique ? (
          <FormGrid cols={3}>
            <Field label="ID interno" htmlFor="r-id" required>
              <Input id="r-id" maxLength={100} placeholder="Ejemplo: D45-2" value={form.idInterno} onChange={(event) => patch({ idInterno: event.target.value })} mono invalid={!!error && isUnique && !form.idInterno.trim()} />
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
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-ink-3">{form.loteRows.length} muestra(s) en el lote. Marca “Trabajar” en las que continúan al procesamiento.</p>
              <Button variant="secondary" size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => patch({ loteRows: [...form.loteRows, newLoteRow()] })}>
                Agregar fila
              </Button>
            </div>
            <div className="scroll-thin overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[900px] text-[13px]">
                <thead className="bg-surface-2/70 text-[12px] text-ink-3">
                  <tr>
                    <th className="h-9 w-16 px-2 text-center font-medium">Trabajar</th>
                    <th className="h-9 px-2 text-left font-medium">ID interno</th>
                    <th className="h-9 px-2 text-left font-medium">Organismo</th>
                    <th className="h-9 px-2 text-left font-medium">Cantidad / volumen</th>
                    <th className="h-9 px-2 text-left font-medium">Sitio de muestreo</th>
                    <th className="h-9 px-2 text-left font-medium">Fecha</th>
                    <th className="h-9 px-2 text-left font-medium">Información adicional</th>
                    <th className="h-9 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {form.loteRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-2 py-1.5 text-center">
                        <Checkbox className="inline-flex" aria-label="Trabajar" checked={row.trabajar} onChange={(event) => updateLote(row.key, { trabajar: event.target.checked })} />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className={`${controlClass} h-8 font-mono text-[12.5px]`} value={row.id_interno} onChange={(event) => updateLote(row.key, { id_interno: event.target.value })} aria-label="ID interno" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className={`${controlClass} h-8`} value={row.nombre_organismo} onChange={(event) => updateLote(row.key, { nombre_organismo: event.target.value })} aria-label="Organismo" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className={`${controlClass} h-8`} value={row.cantidad_volumen} onChange={(event) => updateLote(row.key, { cantidad_volumen: event.target.value })} aria-label="Cantidad o volumen" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className={`${controlClass} h-8`} value={row.sitio_muestreo} onChange={(event) => updateLote(row.key, { sitio_muestreo: event.target.value })} aria-label="Sitio de muestreo" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="date" className={`${controlClass} h-8`} value={row.fecha_muestra} onChange={(event) => updateLote(row.key, { fecha_muestra: event.target.value })} aria-label="Fecha de la muestra" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input className={`${controlClass} h-8`} value={row.informacion_adicional} onChange={(event) => updateLote(row.key, { informacion_adicional: event.target.value })} aria-label="Información adicional" />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <IconButton label="Quitar fila" size="sm" tone="danger" onClick={() => patch({ loteRows: form.loteRows.length > 1 ? form.loteRows.filter((r) => r.key !== row.key) : [newLoteRow()] })}>
                          <X size={14} weight="bold" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </FormCard>

      <FormCard id="sec-analisis" title="Análisis solicitado" description="Marca uno o más análisis, el método y el tipo de muestra.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de análisis</p>
            {ANALISIS_TIPOS.map(([value, label]) => (
              <Checkbox key={value} label={label} checked={form.tipos.includes(value)} onChange={(event) => patch({ tipos: toggle(form.tipos, value, event.target.checked) })} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Método de análisis</p>
            {ANALISIS_METODOS.map(([value, label]) => (
              <Checkbox key={value} label={label} checked={form.metodos.includes(value)} onChange={(event) => patch({ metodos: toggle(form.metodos, value, event.target.checked), metodoOtro: value === "otro" && !event.target.checked ? "" : form.metodoOtro })} />
            ))}
            {methodOther ? <Input placeholder="Especifica el método" maxLength={120} value={form.metodoOtro} onChange={(event) => patch({ metodoOtro: event.target.value })} aria-label="Otro método" /> : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de muestra</p>
            {ANALISIS_MUESTRAS.map(([value, label]) => (
              <Checkbox key={value} label={label} checked={form.tiposMuestra.includes(value)} onChange={(event) => patch({ tiposMuestra: toggle(form.tiposMuestra, value, event.target.checked), tipoMuestraOtro: value === "otro" && !event.target.checked ? "" : form.tipoMuestraOtro })} />
            ))}
            {sampleOther ? <Input placeholder="Especifica el tipo de muestra" maxLength={120} value={form.tipoMuestraOtro} onChange={(event) => patch({ tipoMuestraOtro: event.target.value })} aria-label="Otro tipo de muestra" /> : null}
          </div>
        </div>
        <Field label="Observaciones" htmlFor="r-obs-analisis" className="mt-5">
          <Textarea id="r-obs-analisis" rows={2} value={form.analisisObservaciones} onChange={(event) => patch({ analisisObservaciones: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard
        id="sec-inspeccion"
        title="Inspección visual"
        description="Condiciones en que llega la muestra."
        aside={
          <div className="flex gap-1.5">
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
              <div className="inline-flex rounded-[8px] border border-line bg-surface-2 p-0.5" role="radiogroup" aria-label={row.requisito}>
                {(["C", "NC", "NA"] as const).map((status) => {
                  const active = row.estado === status;
                  const tone = status === "C" ? "bg-success text-white" : status === "NC" ? "bg-danger text-white" : "bg-ink-2 text-white";
                  return (
                    <button key={status} type="button" role="radio" aria-checked={active} onClick={() => patch({ inspeccion: form.inspeccion.map((entry) => (entry.requisito === row.requisito ? { ...entry, estado: active ? "" : status } : entry)) })} className={`press h-7 min-w-11 rounded-[6px] px-2.5 text-[12.5px] font-medium ${active ? tone : "text-ink-3 hover:text-ink"}`}>
                      {status}
                    </button>
                  );
                })}
              </div>
              <Input placeholder="Observación" value={row.observacion} onChange={(event) => patch({ inspeccion: form.inspeccion.map((entry) => (entry.requisito === row.requisito ? { ...entry, observacion: event.target.value } : entry)) })} aria-label={`Observación: ${row.requisito}`} className="h-8" />
            </div>
          ))}
        </div>
        <Field label="Observaciones generales" htmlFor="r-obs-insp" className="mt-5">
          <Textarea id="r-obs-insp" rows={2} value={form.inspeccionGeneral} onChange={(event) => patch({ inspeccionGeneral: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard id="sec-solicitante" title="Datos del solicitante" description="Quien entrega la muestra firma de conformidad.">
        <FormGrid>
          <Field label="Nombre de quien entrega" htmlFor="r-sol-nombre">
            <Input id="r-sol-nombre" maxLength={150} value={form.solicitanteNombre} onChange={(event) => patch({ solicitanteNombre: event.target.value })} />
          </Field>
          <Field label="Firma de conformidad">
            <SignaturePad value={form.solicitanteFirma} onChange={(value) => patch({ solicitanteFirma: value })} label="Firma de conformidad del solicitante" />
          </Field>
        </FormGrid>
        <div className="mt-4 rounded-card border border-line bg-surface-2/50 p-4">
          <Checkbox checked={form.conformidad} onChange={(event) => patch({ conformidad: event.target.checked })} label="He revisado la información registrada en este formato y afirmo que es correcta." description="Se han hecho de mi conocimiento las aclaraciones al final del formato y estoy de acuerdo con ellas. A partir de este momento no se realizan modificaciones a la solicitud del servicio." />
        </div>
      </FormCard>

      <FormCard id="sec-custodio" title="Custodio y resguardo" description="Personal que registra el ingreso y dónde se resguarda la muestra.">
        <div className="grid gap-5 lg:grid-cols-2">
          <PersonCard title="Custodio" name={form.custodioNombre} onName={(v) => patch({ custodioNombre: v })} cargo={form.custodioCargo} onCargo={(v) => patch({ custodioCargo: v })} signature={form.custodioFirma} onSignature={(v) => patch({ custodioFirma: v })} />
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] font-semibold text-ink">Lugar de resguardo</p>
            <div className="grid gap-2">
              {RESGUARDO.map(([value, label]) => (
                <ChoiceCard key={value} type="radio" name="r-resguardo" checked={form.custodioLugar === value} onChange={() => patch({ custodioLugar: value, custodioOtro: value === "otro" ? form.custodioOtro : "" })} label={label} />
              ))}
            </div>
            {form.custodioLugar === "otro" ? <Input placeholder="Especificar" maxLength={120} value={form.custodioOtro} onChange={(event) => patch({ custodioOtro: event.target.value })} aria-label="Otro lugar de resguardo" /> : null}
          </div>
        </div>
      </FormCard>
    </FormPage>
  );
}
