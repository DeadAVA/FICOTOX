"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, FormGrid, Input, Select, Textarea, controlClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { isoDate, parseFloatOrNull, parseIntOrNull } from "@/lib/client/format";
import { filterManualInventario, findInsumoByAutoQuery, findInsumoOption, findReactivoByRef, formatInventoryAmount, loadInsumoOptions, resolveFixedInventoryAmount, type InventarioRow } from "@/lib/client/insumos";
import { formatExtractionFolio, getExtractionRowsFromProcessing, sampleStatusLabel } from "@/lib/client/samples";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ChoiceCard, ChoiceGrid, FormCard, FormPage, PersonCard, StepRow } from "./FormLayout";
import { InsumoSearch, InventarioRows, collectInventarioRows, newInventarioRow } from "./InsumoSearch";

/* Formato de extraccion ASP (FX-TCF-GME-A) como pagina completa. */

const EXTRACTION_STEPS: Array<{ key: string; value: string }> = [
  { key: "extrStep1", value: "Descongelar en oscuridad" },
  { key: "extrStep2", value: "Homogeneizar 30-45s sin descartar liquido de descongelacion" },
  { key: "extrStep3", value: "Submuestrear por duplicado en tubo protegido de luz" },
  { key: "extrStep4", value: "Pesar agua desionizada para blanco" },
  { key: "extrStep5", value: "Adicionar 16 mL de metanol agua 50 50" },
  { key: "extrStep6", value: "Homogeneizar durante 3 minutos" },
  { key: "extrStep7", value: "Centrifugar a 3000g o mas durante 10 minutos" },
  { key: "extrStep10", value: "Filtrar sobrenadante a vial ambar" },
  { key: "extrStep8", value: "Evaluar limpieza del extracto" },
  { key: "extrLimpStep2", value: "Lavar cartucho con agua desionizada" },
  { key: "limp3", value: "Descartar líquido" },
  { key: "extrStep9", value: "Limpieza del extracto" },
  { key: "extrLimpStep5", value: "Lavar con agua destilada" },
  { key: "limp6", value: "Descartar líquido hasta sequedad" },
  { key: "extrLimpStep7", value: "Colocar tubos Falcon" },
  { key: "limp8", value: "Adicionar ácido acético" },
  { key: "limp9", value: "Agitar en vortex" },
  { key: "limp10", value: "Transferir alícuota a vial ámbar" },
];

interface FixedField {
  key: keyof ExtractionForm;
  tipo: "reactivo" | "consumible";
  cantidadFija: string;
  cantidadUnidad: string;
  stepCheckbox?: string;
  autoQuery: string;
  placeholder: string;
}

const FIXED_FIELDS: FixedField[] = [
  { key: "reactivo", tipo: "reactivo", cantidadFija: "16", cantidadUnidad: "ml", autoQuery: "metanol agua 50 50", placeholder: "Metanol:agua 50:50 (16 mL)" },
  { key: "limpReactivoMetanol", tipo: "reactivo", cantidadFija: "6", cantidadUnidad: "ml", autoQuery: "metanol 100", placeholder: "Metanol 100 % (6 mL)" },
  { key: "limpReactivoDesionizada", tipo: "reactivo", cantidadFija: "6", cantidadUnidad: "ml", stepCheckbox: "extrLimpStep2", autoQuery: "agua desionizada", placeholder: "Agua desionizada (6 mL)" },
  { key: "limpReactivoDestilada", tipo: "reactivo", cantidadFija: "6", cantidadUnidad: "ml", stepCheckbox: "extrLimpStep5", autoQuery: "agua destilada", placeholder: "Agua destilada (6 mL)" },
  { key: "limpConsumibleFalcon15", tipo: "consumible", cantidadFija: "1", cantidadUnidad: "pieza", stepCheckbox: "extrLimpStep7", autoQuery: "tubo falcon 15 ml", placeholder: "Tubo Falcon 15 mL (1 pieza)" },
  { key: "limpReactivoAcetico", tipo: "reactivo", cantidadFija: "3", cantidadUnidad: "ml", autoQuery: "acido acetico 10", placeholder: "Ácido acético 10 % (3 mL)" },
];

interface WeightRow {
  id: string;
  organismo: string;
  sitio: string;
  pesoMuestra: string;
  replica: string;
  pesoReplica: string;
}

interface ExtractionForm {
  claveRevision: string;
  fechaEmision: string;
  tipoRegistro: string;
  estado: string;
  folio: string;
  fecha: string;
  hora: string;
  processingId: string;
  muestraTipo: "unica" | "lote";
  idInterno: string;
  summary: string;
  sampleRows: WeightRow[] | null;
  molienda: string;
  steps: Record<string, boolean>;
  licuadora: string;
  ba1: string;
  ba1b: string;
  probeta: string;
  reactivo: string;
  homogeneizador: string;
  cronometro: string;
  limpieza: string;
  volumenFiltrado: string;
  volumenRecuperado: string;
  filtro: string;
  observacionesProceso: string;
  limpMicropipeta1: string;
  limpReactivoMetanol: string;
  limpMicropipeta2: string;
  limpReactivoDesionizada: string;
  limpMicropipeta4: string;
  limpMicropipeta5: string;
  limpReactivoDestilada: string;
  limpConsumibleFalcon15: string;
  limpMicropipeta8: string;
  limpReactivoAcetico: string;
  limpVortex: string;
  limpMicropipeta10: string;
  totalPuntasRef: string;
  totalPuntasCantidad: string;
  resExtracto: boolean[];
  resMolida: boolean[];
  observaciones: string;
  inventarioRows: InventarioRow[];
  quienExtrajo: string;
  cargoExtrajo: string;
  firmaExtrajo: string;
  quienLimpieza: string;
  cargoLimpieza: string;
  firmaLimpieza: string;
  quienSuperviso: string;
  cargoSuperviso: string;
  firmaSuperviso: string;
  sub1: string;
  sub2: string;
  sub3: string;
  total: string;
}

const defaultForm = (): ExtractionForm => ({
  claveRevision: "FX-TCF-GME-A",
  fechaEmision: isoDate(new Date()),
  tipoRegistro: "E-A",
  estado: "registrada",
  folio: "",
  fecha: isoDate(new Date()),
  hora: new Date().toTimeString().slice(0, 5),
  processingId: "",
  muestraTipo: "unica",
  idInterno: "",
  summary: "",
  sampleRows: null,
  molienda: "",
  steps: {},
  licuadora: "",
  ba1: "",
  ba1b: "",
  probeta: "",
  reactivo: "",
  homogeneizador: "",
  cronometro: "",
  limpieza: "",
  volumenFiltrado: "",
  volumenRecuperado: "",
  filtro: "0.45 µm",
  observacionesProceso: "",
  limpMicropipeta1: "",
  limpReactivoMetanol: "",
  limpMicropipeta2: "",
  limpReactivoDesionizada: "",
  limpMicropipeta4: "",
  limpMicropipeta5: "",
  limpReactivoDestilada: "",
  limpConsumibleFalcon15: "",
  limpMicropipeta8: "",
  limpReactivoAcetico: "",
  limpVortex: "",
  limpMicropipeta10: "",
  totalPuntasRef: "",
  totalPuntasCantidad: "",
  resExtracto: [false, false, false, false, false],
  resMolida: [false, false, false, false, false],
  observaciones: "",
  inventarioRows: [],
  quienExtrajo: formatActiveUserSignature(),
  cargoExtrajo: "",
  firmaExtrajo: "",
  quienLimpieza: "",
  cargoLimpieza: "",
  firmaLimpieza: "",
  quienSuperviso: "",
  cargoSuperviso: "",
  firmaSuperviso: "",
  sub1: "",
  sub2: "",
  sub3: "",
  total: "",
});

const defaultChecklist = (steps: Record<string, boolean>, processing: ApiRecord | null): Record<string, boolean> => {
  const resguardo = processing?.resguardo || {};
  const frozen = !!resguardo.congelador_co1 || !!resguardo.congelador_co2 || !!resguardo.congelador_co3;
  return { ...steps, extrStep1: frozen, extrStep2: frozen, extrStep3: true, extrStep4: true, extrStep5: true, extrStep6: true, extrStep7: true, extrStep8: true, extrStep10: true, extrStep9: false };
};

const rowsFromProcessing = (rows: ApiRecord[], existing: ApiRecord[]): WeightRow[] => {
  const byId = new Map(existing.filter((entry) => entry && entry.id_muestra).map((entry) => [String(entry.id_muestra), entry]));
  return rows.map((row, index) => {
    const id = String(row.id_interno || `Muestra ${index + 1}`).trim();
    const prev = byId.get(id) || {};
    return { id, organismo: row.nombre_organismo || "", sitio: row.sitio_muestreo || "", pesoMuestra: prev.peso_muestra ?? "", replica: prev.replica || `${id}_R1`, pesoReplica: prev.peso_replica ?? "" };
  });
};

const autoResolve = (current: ExtractionForm): ExtractionForm => {
  const next = { ...current };
  const bag = next as unknown as Record<string, unknown>;
  for (const field of FIXED_FIELDS) {
    const value = String(bag[field.key] || "").trim();
    if (!value || !findInsumoOption(field.tipo, value)) {
      const match = findInsumoByAutoQuery(field.tipo, field.autoQuery);
      if (match) bag[field.key] = match.ref;
    }
  }
  return next;
};

const fixedEnabled = (field: FixedField, current: ExtractionForm) => (field.stepCheckbox ? !!current.steps[field.stepCheckbox] : true);

const buildProtocolInventario = (current: ExtractionForm) => {
  const result: Array<{ tipo: string; ref: string; cantidad: number }> = [];
  for (const field of FIXED_FIELDS) {
    if (!fixedEnabled(field, current)) continue;
    const ref = String(current[field.key] || "").trim();
    if (!ref) continue;
    const resolved = resolveFixedInventoryAmount({ cantidadFija: field.cantidadFija, cantidadUnidad: field.cantidadUnidad }, findInsumoOption(field.tipo, ref));
    result.push({ tipo: field.tipo, ref, cantidad: resolved?.amount || 1 });
  }
  const puntasRef = String(current.totalPuntasRef || "").trim();
  const puntas = Number.parseFloat(current.totalPuntasCantidad) || 0;
  if (puntasRef && puntas > 0) result.push({ tipo: "consumible", ref: puntasRef, cantidad: puntas });
  return result;
};

const validateStock = (current: ExtractionForm): string[] => {
  const errors: string[] = [];
  for (const field of FIXED_FIELDS) {
    if (field.tipo !== "reactivo" || !fixedEnabled(field, current)) continue;
    const ref = String(current[field.key] || "").trim();
    if (!ref) {
      errors.push(`${field.placeholder}: no se encontró en inventario`);
      continue;
    }
    const reactivo = findReactivoByRef(ref);
    if (!reactivo) continue;
    const resolved = resolveFixedInventoryAmount({ cantidadFija: field.cantidadFija, cantidadUnidad: field.cantidadUnidad }, reactivo);
    if (!resolved) continue;
    const stock = reactivo.cantidad_actual ?? null;
    if (stock !== null && Number(stock) < resolved.amount) {
      errors.push(`${reactivo.label}: ${formatInventoryAmount(stock)} ${reactivo.unidad || ""} disponibles, se requieren ${formatInventoryAmount(resolved.amount)}`);
    }
  }
  return errors;
};

const formFromItem = (item: ApiRecord): ExtractionForm => {
  const pasos = item.pasos || {};
  const selected: string[] = Array.isArray(pasos.checklist) ? pasos.checklist : [];
  const steps: Record<string, boolean> = {};
  EXTRACTION_STEPS.forEach((step) => (steps[step.key] = selected.includes(step.value)));
  const filtrado = pasos.filtrado || {};
  const rE = pasos.resguardo_extracto || {};
  const rM = pasos.resguardo_molienda_restante || {};
  const pesos = new Map<string, unknown>();
  (item.registro_pesos || []).forEach((entry: ApiRecord) => {
    if (entry && entry.peso !== undefined && entry.peso !== null) pesos.set(String(entry.submuestra), entry.peso);
  });
  const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
  return {
    ...defaultForm(),
    claveRevision: item.clave_revision || "FX-TCF-GME-A",
    fechaEmision: isoDate(item.fecha_emision),
    tipoRegistro: item.tipo_registro || "E-A",
    folio: item.folio_num ? String(item.folio_num) : "",
    fecha: isoDate(item.fecha_extraccion),
    hora: item.hora_extraccion || "",
    estado: item.estado || "registrada",
    processingId: item.procesamiento_id ? String(item.procesamiento_id) : "",
    muestraTipo: item.muestra_tipo === "lote" ? "lote" : "unica",
    idInterno: item.id_interno || "",
    molienda: item.tipo_molienda || "",
    steps,
    licuadora: str(pasos.id_equipo_licuadora),
    ba1: str(pasos.id_ba1),
    probeta: str(pasos.id_probeta),
    reactivo: str(pasos.folio_reactivo),
    homogeneizador: str(pasos.id_homogeneizador),
    cronometro: str(pasos.id_cronometro),
    limpieza: pasos.limpieza === "si" ? "si" : pasos.limpieza === "no" ? "no" : "",
    limpMicropipeta1: str(pasos.limp_micropipeta_1),
    limpReactivoMetanol: str(pasos.limp_reactivo_metanol),
    limpMicropipeta2: str(pasos.limp_micropipeta_2),
    limpMicropipeta4: str(pasos.limp_micropipeta_4),
    limpMicropipeta5: str(pasos.limp_micropipeta_5),
    limpMicropipeta8: str(pasos.limp_micropipeta_8),
    limpReactivoAcetico: str(pasos.limp_reactivo_acetico),
    limpVortex: str(pasos.limp_vortex),
    limpMicropipeta10: str(pasos.limp_micropipeta_10),
    totalPuntasRef: str(pasos.limp_total_puntas_ref),
    totalPuntasCantidad: str(pasos.limp_total_puntas_cantidad),
    observacionesProceso: str(pasos.observaciones_extraccion),
    volumenFiltrado: str(filtrado.volumen_filtrado),
    volumenRecuperado: str(filtrado.volumen_recuperado),
    filtro: filtrado.filtro || "0.45 µm",
    resExtracto: [!!rE.entregado_fx106, !!rE.refrigerador_re1, !!rE.congelador_co1, !!rE.congelador_co2, !!rE.congelador_co3],
    resMolida: [!!rM.no_sobro, !!rM.refrigerador_re1, !!rM.congelador_co1, !!rM.congelador_co2, !!rM.congelador_co3],
    sub1: pesos.has("1") ? String(pesos.get("1")) : "",
    sub2: pesos.has("2") ? String(pesos.get("2")) : "",
    sub3: pesos.has("3") ? String(pesos.get("3")) : "",
    total: pesos.has("total") ? String(pesos.get("total")) : "",
    observaciones: item.observaciones_generales || "",
    quienExtrajo: item.nombre_quien_extrajo || "",
    quienLimpieza: item.nombre_quien_limpieza || "",
    quienSuperviso: item.nombre_quien_superviso || "",
    firmaExtrajo: item.firma_quien_extrajo || "",
    firmaLimpieza: item.firma_quien_limpieza || "",
    firmaSuperviso: item.firma_quien_superviso || "",
  };
};

const SECTIONS = [
  { id: "sec-datos", label: "Datos generales" },
  { id: "sec-muestra", label: "Muestra y molienda" },
  { id: "sec-extraccion", label: "Extracción" },
  { id: "sec-pesos", label: "Registro de pesos" },
  { id: "sec-filtrado", label: "Filtrado final" },
  { id: "sec-limpieza", label: "Limpieza del extracto" },
  { id: "sec-resguardo", label: "Resguardo" },
  { id: "sec-insumos", label: "Insumos" },
  { id: "sec-personal", label: "Personal" },
];

export function ExtractionForm({ item, prefillProcessingId }: { item: ApiRecord | null; prefillProcessingId?: number | null }) {
  const router = useRouter();
  const { token, can } = useSession();
  const [form, setForm] = useState<ExtractionForm>(() => (item ? formFromItem(item) : { ...defaultForm(), steps: defaultChecklist({}, null) }));
  const [processings, setProcessings] = useState<ApiRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef(new Map<number, ApiRecord>());
  const editing = !!item?.id;
  const patch = (changes: Partial<ExtractionForm>) => setForm((prev) => ({ ...prev, ...changes }));

  const processingDetail = async (id: number): Promise<ApiRecord | null> => {
    const cached = detailCache.current.get(id);
    if (cached) return cached;
    const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/${id}`, token);
    const detail = (data.item || null) as ApiRecord | null;
    if (detail) detailCache.current.set(id, detail);
    return detail;
  };

  const applyProcessing = (processing: ApiRecord | null, existing: ApiRecord[] = []) => {
    setForm((prev) => {
      if (!processing) return { ...prev, idInterno: "", muestraTipo: "unica", summary: "", sampleRows: null, steps: defaultChecklist(prev.steps, null) };
      const rows = getExtractionRowsFromProcessing(processing);
      const ids = rows.map((row) => row.id_interno).filter(Boolean).join(", ");
      const muestraTipo: "unica" | "lote" = processing.muestra_tipo === "lote" || (!processing.muestra_tipo && rows.length > 1) ? "lote" : "unica";
      const resguardo = processing.resguardo || {};
      const frozen = !!resguardo.congelador_co1 || !!resguardo.congelador_co2 || !!resguardo.congelador_co3;
      const folio = processing.folio_num ? `P ${String(processing.folio_num).padStart(7, "0")}` : "Procesamiento";
      return {
        ...prev,
        idInterno: ids || processing.id_interno || "",
        muestraTipo,
        molienda: frozen ? "congelada" : "fresca",
        summary: `${folio}: ${rows.length || 1} muestra(s) lista(s) para extracción.`,
        sampleRows: rows.length ? rowsFromProcessing(rows, existing) : [],
        steps: defaultChecklist(prev.steps, processing),
      };
    });
  };

  const selectProcessing = async (value: string, existing: ApiRecord[] = []) => {
    const id = parseIntOrNull(value);
    if (!id) return setForm((prev) => ({ ...prev, idInterno: "", muestraTipo: "unica", summary: "", sampleRows: null }));
    try {
      applyProcessing(await processingDetail(id), existing);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer el procesamiento");
      setForm((prev) => ({ ...prev, idInterno: "", muestraTipo: "unica", summary: "", sampleRows: null }));
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const empty: ApiRecord = {};
      const data = await getJsonAuth(`${API_BASE_URL}/samples/processing?search=`, token).catch(() => empty);
      if (cancelled) return;
      setProcessings((data.items || []) as ApiRecord[]);
      await loadInsumoOptions();
      if (cancelled) return;
      if (item) {
        if (item.procesamiento_id) {
          await selectProcessing(String(item.procesamiento_id), item.registro_pesos || []);
          if (cancelled) return;
          const saved = formFromItem(item);
          setForm((prev) => ({ ...prev, steps: saved.steps, molienda: item.tipo_molienda || prev.molienda }));
        }
        setForm((prev) => {
          const resolved = autoResolve(prev);
          const manual = filterManualInventario((item.uso_inventario || []) as ApiRecord[], buildProtocolInventario(resolved));
          return { ...resolved, inventarioRows: manual.map((row) => newInventarioRow(row.tipo || "consumible", row.ref || row.nombre || "", row.cantidad ?? 1, row.nombre)) };
        });
        return;
      }
      setForm((prev) => autoResolve(prev));
      if (prefillProcessingId) {
        patch({ processingId: String(prefillProcessingId) });
        await selectProcessing(String(prefillProcessingId));
        if (cancelled) return;
        setForm((prev) => autoResolve(prev));
      }
      try {
        const next = await getJsonAuth(`${API_BASE_URL}/samples/extraction/next-folio`, token);
        if (!cancelled) patch({ folio: next.next_folio ? String(next.next_folio) : "" });
      } catch {
        /* sin folio sugerido */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, item, prefillProcessingId]);

  const setStep = (key: string, checked: boolean) => patch({ steps: { ...form.steps, [key]: checked } });

  const buildPayload = (current: ExtractionForm) => {
    const selected = current.processingId ? processings.find((row) => String(row.id) === current.processingId) : undefined;
    const weights = (current.sampleRows || [])
      .map((row) => ({ id_muestra: row.id || null, organismo: row.organismo || null, sitio_muestreo: row.sitio || null, peso_muestra: parseFloatOrNull(row.pesoMuestra), replica: row.replica.trim() || null, peso_replica: parseFloatOrNull(row.pesoReplica) }))
      .filter((entry) => entry.id_muestra);
    return {
      folio_num: parseIntOrNull(current.folio),
      tipo_registro: current.tipoRegistro.trim() || "E-A",
      clave_revision: current.claveRevision.trim() || "FX-TCF-GME-A",
      fecha_emision: current.fechaEmision || null,
      fecha_extraccion: current.fecha || null,
      hora_extraccion: current.hora || null,
      procesamiento_id: parseIntOrNull(current.processingId),
      folio_procesamiento_num: parseIntOrNull(selected?.folio_num),
      muestra_tipo: current.muestraTipo || null,
      id_interno: current.idInterno.trim() || null,
      tipo_molienda: current.molienda || null,
      pasos: {
        checklist: EXTRACTION_STEPS.filter((step) => !!current.steps[step.key]).map((step) => step.value),
        id_equipo_licuadora: current.licuadora.trim() || null,
        id_ba1: current.ba1.trim() || null,
        id_probeta: current.probeta.trim() || null,
        folio_reactivo: current.reactivo.trim() || null,
        id_homogeneizador: current.homogeneizador.trim() || null,
        id_cronometro: current.cronometro.trim() || null,
        limpieza: current.limpieza || null,
        observaciones_extraccion: current.observacionesProceso.trim() || null,
        limp_micropipeta_1: current.limpMicropipeta1.trim() || null,
        limp_reactivo_metanol: current.limpReactivoMetanol.trim() || null,
        limp_micropipeta_2: current.limpMicropipeta2.trim() || null,
        limp_micropipeta_4: current.limpMicropipeta4.trim() || null,
        limp_micropipeta_5: current.limpMicropipeta5.trim() || null,
        limp_micropipeta_8: current.limpMicropipeta8.trim() || null,
        limp_reactivo_acetico: current.limpReactivoAcetico.trim() || null,
        limp_vortex: current.limpVortex.trim() || null,
        limp_micropipeta_10: current.limpMicropipeta10.trim() || null,
        limp_total_puntas_ref: current.totalPuntasRef.trim() || null,
        limp_total_puntas_cantidad: Number.parseFloat(current.totalPuntasCantidad) || null,
        filtrado: { volumen_filtrado: current.volumenFiltrado.trim() || null, volumen_recuperado: current.volumenRecuperado.trim() || null, filtro: current.filtro.trim() || null },
        resguardo_extracto: { entregado_fx106: !!current.resExtracto[0], refrigerador_re1: !!current.resExtracto[1], congelador_co1: !!current.resExtracto[2], congelador_co2: !!current.resExtracto[3], congelador_co3: !!current.resExtracto[4] },
        resguardo_molienda_restante: { no_sobro: !!current.resMolida[0], refrigerador_re1: !!current.resMolida[1], congelador_co1: !!current.resMolida[2], congelador_co2: !!current.resMolida[3], congelador_co3: !!current.resMolida[4] },
      },
      registro_pesos: weights.length
        ? weights
        : [
            { submuestra: 1, peso: parseFloatOrNull(current.sub1) },
            { submuestra: 2, peso: parseFloatOrNull(current.sub2) },
            { submuestra: 3, peso: parseFloatOrNull(current.sub3) },
            { submuestra: "total", peso: parseFloatOrNull(current.total) },
          ].filter((entry) => entry.peso !== null),
      observaciones_generales: current.observaciones.trim() || null,
      nombre_quien_extrajo: current.quienExtrajo.trim() || null,
      nombre_quien_limpieza: current.quienLimpieza.trim() || null,
      nombre_quien_superviso: current.quienSuperviso.trim() || null,
      firma_quien_extrajo: current.firmaExtrajo.trim() || null,
      firma_quien_limpieza: current.firmaLimpieza.trim() || null,
      firma_quien_superviso: current.firmaSuperviso.trim() || null,
      estado: current.estado || "registrada",
      uso_inventario: [...buildProtocolInventario(current), ...collectInventarioRows(current.inventarioRows)],
    };
  };

  const fail = (message: string, section: string) => {
    setError(message);
    toast.error(message);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSave = async () => {
    await loadInsumoOptions();
    const current = autoResolve(form);
    setForm(current);
    const payload = buildPayload(current);
    if (!payload.folio_num) return fail("El folio de extracción es obligatorio", "sec-datos");
    if (payload.procesamiento_id && !payload.id_interno) return fail("El procesamiento seleccionado no tiene muestras para extracción", "sec-muestra");
    const stockErrors = validateStock(current);
    if (stockErrors.length) return fail(`Stock insuficiente: ${stockErrors.join("; ")}`, "sec-extraccion");
    if (!can("muestras", editing ? "update" : "create")) return fail("No tienes permiso para esta acción", "sec-datos");
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/extraction/${item!.id}`, token, payload);
        toast.success("Extracción actualizada. Inventario descontado.");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/extraction`, token, payload);
        toast.success("Extracción registrada. Inventario descontado.");
      }
      invalidate("muestras", "movimientos", "reactivos", "consumibles", "dashboard");
      router.push("/muestras/extraccion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la extracción");
      setSubmitting(false);
    }
  };

  const equipo = (key: keyof ExtractionForm, placeholder: string) => <InsumoSearch tipo="equipo" value={form[key] as string} onChange={(ref) => patch({ [key]: ref } as Partial<ExtractionForm>)} placeholder={placeholder} size="sm" />;
  const fixed = (key: keyof ExtractionForm) => {
    const field = FIXED_FIELDS.find((entry) => entry.key === key)!;
    return <InsumoSearch tipo={field.tipo} value={form[field.key] as string} onChange={(ref) => patch({ [field.key]: ref } as Partial<ExtractionForm>)} placeholder={field.placeholder} cantidadFija={field.cantidadFija} cantidadUnidad={field.cantidadUnidad} stepEnabled={fixedEnabled(field, form)} showStockBadge size="sm" />;
  };
  const step = (key: string, number: ReactNode, label: ReactNode, children?: ReactNode) => (
    <StepRow number={number} label={label} checked={!!form.steps[key]} onCheckedChange={(checked) => setStep(key, checked)}>
      {children}
    </StepRow>
  );
  const updateRow = (index: number, changes: Partial<WeightRow>) => patch({ sampleRows: (form.sampleRows || []).map((row, i) => (i === index ? { ...row, ...changes } : row)) });

  const RES_EXTRACTO = ["Entregado a FX-106", "Refrigerador RE1", "Congelador CO1", "Congelador CO2", "Congelador CO3"];
  const RES_MOLIDA = ["No sobró", "Refrigerador RE1", "Congelador CO1", "Congelador CO2", "Congelador CO3"];

  return (
    <FormPage
      backHref="/muestras/extraccion"
      backLabel="Extracciones"
      code="FX-TCF-GME-A"
      title={editing ? `Extracción ${formatExtractionFolio(item!)}` : "Nueva extracción"}
      status={sampleStatusLabel(form.estado)}
      sections={SECTIONS}
      error={error}
      actions={
        <>
          <Button variant="secondary" onClick={() => router.push("/muestras/extraccion")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={submitting} icon={<FloppyDisk size={16} />}>
            {editing ? "Guardar cambios" : "Registrar extracción"}
          </Button>
        </>
      }
    >
      <FormCard id="sec-datos" title="Datos generales" description="Folio, fecha y procesamiento de origen.">
        <FormGrid cols={4}>
          <Field label="Folio E-A" htmlFor="e-folio" required>
            <Input id="e-folio" type="number" min="1" inputMode="numeric" value={form.folio} onChange={(event) => patch({ folio: event.target.value })} mono invalid={!!error && !form.folio} />
          </Field>
          <Field label="Fecha" htmlFor="e-fecha" required>
            <Input id="e-fecha" type="date" value={form.fecha} onChange={(event) => patch({ fecha: event.target.value })} />
          </Field>
          <Field label="Hora" htmlFor="e-hora" required>
            <Input id="e-hora" type="time" value={form.hora} onChange={(event) => patch({ hora: event.target.value })} />
          </Field>
          <Field label="Procesamiento (FX-TCF-GMP)" htmlFor="e-proc" hint={form.summary || "Al vincular se cargan las muestras y el tipo de molienda."}>
            <Select
              id="e-proc"
              value={form.processingId}
              onChange={(event) => {
                patch({ processingId: event.target.value });
                void selectProcessing(event.target.value);
              }}
            >
              <option value="">Sin vincular</option>
              {processings.map((option) => (
                <option key={option.id} value={option.id}>
                  P {String(option.folio_num || "").padStart(7, "0")} · {option.id_interno || "Sin ID interno"}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard id="sec-muestra" title="Muestra y molienda" description="Identificación de la muestra y estado de la molienda.">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <ChoiceGrid className="lg:grid-cols-2">
              <ChoiceCard type="radio" name="e-tipo" checked={form.muestraTipo === "unica"} onChange={() => patch({ muestraTipo: "unica" })} label="Muestra única" />
              <ChoiceCard type="radio" name="e-tipo" checked={form.muestraTipo === "lote"} onChange={() => patch({ muestraTipo: "lote" })} label="Lote" />
            </ChoiceGrid>
            <Field label="ID interno" htmlFor="e-id">
              <Input id="e-id" maxLength={200} value={form.idInterno} onChange={(event) => patch({ idInterno: event.target.value })} mono placeholder="Se completa desde el procesamiento" />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de molienda</p>
            <ChoiceGrid className="lg:grid-cols-2">
              <ChoiceCard type="radio" name="e-molienda" checked={form.molienda === "fresca"} onChange={() => patch({ molienda: "fresca" })} label="Fresca" description="Pasa directo al submuestreo." />
              <ChoiceCard type="radio" name="e-molienda" checked={form.molienda === "congelada"} onChange={() => patch({ molienda: "congelada" })} label="Congelada" description="Requiere descongelar y homogeneizar." />
            </ChoiceGrid>
          </div>
        </div>
      </FormCard>

      <FormCard id="sec-extraccion" title="Extracción" description="Pasos del protocolo. Los reactivos de cantidad fija se descuentan al guardar.">
        <div className="mb-3 text-[12.5px] font-medium text-ink-3">Molienda congelada</div>
        <div className="mb-5 flex flex-col">
          {step("extrStep1", 1, "Descongelar en oscuridad")}
          {step("extrStep2", 2, "Homogeneizar por 30 a 45 s sin descartar el líquido de descongelación", equipo("licuadora", "Licuadora"))}
        </div>
        <div className="mb-3 text-[12.5px] font-medium text-ink-3">Submuestreo y blanco</div>
        <div className="mb-5 flex flex-col">
          {step("extrStep3", 3, "Submuestrear por duplicado en un tubo de centrífuga protegido de la luz (4 ± 0.1 g)", <Input placeholder="Folio de verificación de BA1" maxLength={60} value={form.ba1} onChange={(event) => patch({ ba1: event.target.value })} className="h-8" />)}
          {step("extrStep4", 4, "Pesar agua desionizada para el blanco (4 ± 0.1 g)", <Input placeholder="Folio de verificación de BA1" maxLength={60} value={form.ba1b} onChange={(event) => patch({ ba1b: event.target.value })} className="h-8" />)}
        </div>
        <div className="mb-3 text-[12.5px] font-medium text-ink-3">Preparación y homogeneización</div>
        <div className="flex flex-col">
          {step(
            "extrStep5",
            6,
            "Adicionar a la(s) muestra(s) y el blanco 16 mL de metanol:agua (50:50)",
            <>
              {equipo("probeta", "Probeta")}
              {fixed("reactivo")}
            </>,
          )}
          {step(
            "extrStep6",
            7,
            "Homogeneizar durante 3 minutos",
            <>
              {equipo("homogeneizador", "Homogeneizador")}
              {equipo("cronometro", "Cronómetro")}
            </>,
          )}
          {step("extrStep7", 8, "Centrifugar a 3,000 g o más durante 10 minutos, de ser posible a 4 °C")}
        </div>
      </FormCard>

      <FormCard id="sec-pesos" title="Registro de pesos" description="Peso de cada submuestra y su réplica.">
        {form.sampleRows === null ? (
          <EmptyState compact title="Vincula un procesamiento" description="Las muestras se cargan desde el folio de procesamiento seleccionado." />
        ) : !form.sampleRows.length ? (
          <EmptyState compact title="Sin muestras seleccionadas" description="El procesamiento no tiene muestras marcadas para trabajar." />
        ) : (
          <div className="scroll-thin overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-surface-2/70 text-[12px] text-ink-3">
                <tr>
                  <th className="h-9 px-3 text-left font-medium">ID muestra</th>
                  <th className="h-9 px-3 text-left font-medium">Organismo</th>
                  <th className="h-9 px-3 text-left font-medium">Sitio</th>
                  <th className="h-9 px-2 text-left font-medium">Peso (g)</th>
                  <th className="h-9 px-2 text-left font-medium">Réplica</th>
                  <th className="h-9 px-2 text-left font-medium">Peso réplica (g)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {form.sampleRows.map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td className="code px-3 py-1.5 font-medium">{row.id}</td>
                    <td className="px-3 py-1.5 text-ink-2">{row.organismo || "-"}</td>
                    <td className="px-3 py-1.5 text-ink-2">{row.sitio || "-"}</td>
                    <td className="px-1 py-1.5">
                      <input type="number" min="0" step="0.0001" className={`${controlClass} tnum h-8`} value={row.pesoMuestra} onChange={(event) => updateRow(index, { pesoMuestra: event.target.value })} aria-label={`Peso de ${row.id}`} />
                    </td>
                    <td className="px-1 py-1.5">
                      <input className={`${controlClass} h-8 font-mono text-[12.5px]`} value={row.replica} onChange={(event) => updateRow(index, { replica: event.target.value })} aria-label={`Réplica de ${row.id}`} />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" min="0" step="0.0001" className={`${controlClass} tnum h-8`} value={row.pesoReplica} onChange={(event) => updateRow(index, { pesoReplica: event.target.value })} aria-label={`Peso de la réplica de ${row.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      <FormCard id="sec-filtrado" title="Filtrado final" description="Filtrar 1.5 mL de sobrenadante para recuperar al menos 1 mL con filtro de 0.45 µm y transferir a vial ámbar.">
        <FormGrid cols={3}>
          <Field label="Volumen filtrado (mL)" htmlFor="e-vf">
            <Input id="e-vf" value={form.volumenFiltrado} onChange={(event) => patch({ volumenFiltrado: event.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Volumen recuperado (mL)" htmlFor="e-vr">
            <Input id="e-vr" value={form.volumenRecuperado} onChange={(event) => patch({ volumenRecuperado: event.target.value })} inputMode="decimal" />
          </Field>
          <Field label="Filtro utilizado" htmlFor="e-filtro">
            <Input id="e-filtro" value={form.filtro} onChange={(event) => patch({ filtro: event.target.value })} />
          </Field>
        </FormGrid>
        <div className="mt-4 flex flex-col">{step("extrStep10", undefined, "Transferido a vial ámbar para automuestreador")}</div>
        <Field label="Observaciones sobre la extracción" htmlFor="e-obs-proc" className="mt-4">
          <Textarea id="e-obs-proc" rows={3} value={form.observacionesProceso} onChange={(event) => patch({ observacionesProceso: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard id="sec-limpieza" title="Limpieza del extracto" description="Solo si la naturaleza de la muestra lo requiere (cartucho Bond Elut SAX).">
        <ChoiceGrid className="mb-5 lg:grid-cols-2">
          <ChoiceCard type="radio" name="e-limpieza" checked={form.limpieza === "si"} onChange={() => patch({ limpieza: "si" })} label="Sí requirió limpieza" description="Se registran los pasos de acondicionamiento, carga y elución." />
          <ChoiceCard type="radio" name="e-limpieza" checked={form.limpieza === "no"} onChange={() => patch({ limpieza: "no" })} label="No requirió limpieza" description="Continúa con el filtrado final." />
        </ChoiceGrid>
        {form.limpieza === "si" ? (
          <div className="flex flex-col">
            {step(
              "extrStep8",
              1,
              "Adicionar 6 mL de metanol 100 % en 2 rondas de 3 mL (acondicionamiento del cartucho)",
              <>
                {equipo("limpMicropipeta1", "Micropipeta")}
                {fixed("limpReactivoMetanol")}
              </>,
            )}
            {step(
              "extrLimpStep2",
              2,
              "Lavar con 6 mL de agua desionizada en 2 rondas de 3 mL",
              <>
                {equipo("limpMicropipeta2", "Micropipeta")}
                {fixed("limpReactivoDesionizada")}
              </>,
            )}
            {step("limp3", 3, "Descartar el líquido")}
            {step("extrStep9", 4, "Cargar 3 mL de la muestra de interés y filtrar a flujo lento", equipo("limpMicropipeta4", "Micropipeta"))}
            {step(
              "extrLimpStep5",
              5,
              "Lavar con 6 mL de agua destilada en dos rondas de 3 mL",
              <>
                {equipo("limpMicropipeta5", "Micropipeta")}
                {fixed("limpReactivoDestilada")}
              </>,
            )}
            {step("limp6", 6, "Descartar el líquido hasta sequedad")}
            {step("extrLimpStep7", 7, "Colocar tubos Falcon de 15 mL para colectar la muestra final", fixed("limpConsumibleFalcon15"))}
            {step(
              "limp8",
              8,
              "Adicionar 3 mL de ácido acético al 10 % y filtrar a flujo lento",
              <>
                {equipo("limpMicropipeta8", "Micropipeta")}
                {fixed("limpReactivoAcetico")}
              </>,
            )}
            {step("limp9", 9, "Agitar en vortex", equipo("limpVortex", "Vortex"))}
            {step("limp10", 10, "Transferir una alícuota de 1 mL a un vial ámbar para automuestreador", equipo("limpMicropipeta10", "Micropipeta"))}
            <div className="mt-4 grid gap-3 rounded-card border border-line bg-surface-2/50 p-4 md:grid-cols-[1fr_140px]">
              <Field label="Puntas de micropipeta utilizadas" hint="Se descuentan del inventario.">
                <InsumoSearch tipo="consumible" value={form.totalPuntasRef} onChange={(ref) => patch({ totalPuntasRef: ref })} placeholder="Buscar punta de micropipeta" />
              </Field>
              <Field label="Cantidad">
                <Input type="number" min="0" step="1" inputMode="numeric" value={form.totalPuntasCantidad} onChange={(event) => patch({ totalPuntasCantidad: event.target.value })} />
              </Field>
            </div>
          </div>
        ) : null}
      </FormCard>

      <FormCard id="sec-resguardo" title="Resguardo" description="Dónde queda el extracto y la molienda restante.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Extracto</p>
            {RES_EXTRACTO.map((label, index) => (
              <ChoiceCard key={label} checked={!!form.resExtracto[index]} onChange={(checked) => patch({ resExtracto: form.resExtracto.map((v, i) => (i === index ? checked : v)) })} label={label} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Molienda restante</p>
            {RES_MOLIDA.map((label, index) => (
              <ChoiceCard key={label} checked={!!form.resMolida[index]} onChange={(checked) => patch({ resMolida: form.resMolida.map((v, i) => (i === index ? checked : v)) })} label={label} />
            ))}
          </div>
        </div>
        <Field label="Observaciones generales" htmlFor="e-obs" className="mt-5">
          <Textarea id="e-obs" rows={3} value={form.observaciones} onChange={(event) => patch({ observaciones: event.target.value })} />
        </Field>
      </FormCard>

      <FormCard
        id="sec-insumos"
        title="Insumos adicionales"
        description="Reactivos y consumibles usados fuera del protocolo. Se descuentan del inventario al guardar."
        aside={
          <Button variant="secondary" size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => patch({ inventarioRows: [...form.inventarioRows, newInventarioRow()] })}>
            Agregar insumo
          </Button>
        }
      >
        <InventarioRows rows={form.inventarioRows} onChange={(rows) => patch({ inventarioRows: rows })} />
      </FormCard>

      <FormCard id="sec-personal" title="Personal responsable" description="Quién extrajo, quién realizó la limpieza y quién supervisó.">
        <div className="grid gap-5 xl:grid-cols-3">
          <PersonCard title="Quien extrajo" name={form.quienExtrajo} onName={(v) => patch({ quienExtrajo: v })} cargo={form.cargoExtrajo} onCargo={(v) => patch({ cargoExtrajo: v })} signature={form.firmaExtrajo} onSignature={(v) => patch({ firmaExtrajo: v })} />
          <PersonCard title="Quien realizó la limpieza" name={form.quienLimpieza} onName={(v) => patch({ quienLimpieza: v })} cargo={form.cargoLimpieza} onCargo={(v) => patch({ cargoLimpieza: v })} signature={form.firmaLimpieza} onSignature={(v) => patch({ firmaLimpieza: v })} />
          <PersonCard title="Quien supervisó" name={form.quienSuperviso} onName={(v) => patch({ quienSuperviso: v })} cargo={form.cargoSuperviso} onCargo={(v) => patch({ cargoSuperviso: v })} signature={form.firmaSuperviso} onSignature={(v) => patch({ firmaSuperviso: v })} />
        </div>
        <div className="mt-4 grid gap-2 text-[12.5px] text-ink-2 md:grid-cols-2">
          <p className="rounded-card border border-line bg-surface-2/50 px-4 py-3">
            <span className="font-medium text-ink">Almacenamiento temporal.</span> Si no se analiza de inmediato, almacenar en oscuridad y congelación hasta por una semana.
          </p>
          <p className="rounded-card border border-line bg-surface-2/50 px-4 py-3">
            <span className="font-medium text-ink">Bitácoras.</span> Registrar el uso de cada equipo en su bitácora correspondiente.
          </p>
        </div>
      </FormCard>
    </FormPage>
  );
}
