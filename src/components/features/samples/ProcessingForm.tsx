"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { fmtDate, isoDate, parseFloatOrNull, parseIntOrNull } from "@/lib/client/format";
import { filterManualInventario, findInsumoByAutoQuery, findInsumoOption, loadInsumoOptions, resolveFixedInventoryAmount, type InventarioRow } from "@/lib/client/insumos";
import { formatProcessingFolio, sampleStatusLabel } from "@/lib/client/samples";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { ChoiceCard, ChoiceGrid, FormCard, FormPage, PersonCard, StepRow } from "./FormLayout";
import { InsumoSearch, InventarioRows, collectInventarioRows, newInventarioRow } from "./InsumoSearch";

/* Formato de procesamiento de muestras (FX-TCF-GMP) como pagina completa. */

const BIVALVOS_STEPS: Array<[string, string, string]> = [
  ["procBiv1", "Seleccionar organismos de mayor talla (~30)", "Seleccionar organismos de mayor talla (~30)"],
  ["procBiv2", "Lavar exterior con agua corriente", "Lavar el exterior con agua corriente"],
  ["procBiv3", "Abrir valvas", "Abrir las valvas"],
  ["procBiv4", "Lavar interior con agua corriente", "Lavar el interior con agua corriente"],
  ["procBiv5", "Desconchar", "Desconchar"],
  ["procBiv6", "Drenar 5 min", "Drenar 5 min"],
  ["procBiv7", "Moler 1-2 min 100-150g", "Moler 1 a 2 min (100 a 150 g)"],
  ["procBiv8", "Reservar molienda en bolsa hermetica", "Reservar molienda en bolsa hermética con etiqueta interna y externa"],
];
const SARDINAS_STEPS: Array<[string, string, string]> = [
  ["procSar1", "Seleccionar aprox. 10 organismos", "Seleccionar aprox. 10 organismos (molienda de hasta 150 g)"],
  ["procSar2", "Partir organismos por la mitad", "Partir o trozar los organismos por la mitad"],
  ["procSar3", "Moler 1-2 min 100-150g", "Moler 1 a 2 min (100 a 150 g)"],
  ["procSar4", "Pesar molienda obtenida", "Pesar la molienda obtenida"],
  ["procSar5", "Reservar molienda en bolsa hermetica", "Reservar molienda en bolsa hermética con etiqueta interna y externa"],
];
const PARTES: Array<[string, string]> = [
  ["cuerpo_completo", "Cuerpo completo"],
  ["viscera", "Víscera"],
  ["sifon_callo", "Sifón / callo"],
  ["otro", "Otro"],
];
const RESGUARDO: Array<[string, string]> = [
  ["entregado_extraccion", "Entregado para extracción"],
  ["refrigerador_re1", "Refrigerador RE1"],
  ["congelador_co1", "Congelador CO1"],
  ["congelador_co2", "Congelador CO2"],
  ["congelador_co3", "Congelador CO3"],
];

interface LoteSelectionRow {
  item: ApiRecord;
  checked: boolean;
}

interface ProcessingForm {
  claveRevision: string;
  fechaEmision: string;
  tipoRegistro: string;
  estado: string;
  folio: string;
  fecha: string;
  hora: string;
  receptionId: string;
  muestraTipo: "unica" | "lote";
  muestraTipoDisabled: boolean;
  idInterno: string;
  loteRows: LoteSelectionRow[] | null;
  organismo: string;
  otroOrganismoText: string;
  partes: string[];
  otroParteText: string;
  steps: Record<string, boolean>;
  biv7Equipo: string;
  biv7Peso: string;
  biv8Equipo: string;
  biv8Peso: string;
  biv8BolsaRef: string;
  sar3Equipo: string;
  sar3Peso: string;
  sar4Equipo: string;
  sar4Peso: string;
  sar5BolsaRef: string;
  otroProcesamiento: string;
  resguardo: Record<string, boolean>;
  observaciones: string;
  quienProceso: string;
  quienProcesoCargo: string;
  firmaProceso: string;
  quienSuperviso: string;
  quienSupervisoCargo: string;
  firmaSuperviso: string;
  inventarioRows: InventarioRow[];
}

const defaultForm = (): ProcessingForm => ({
  claveRevision: "FX-TCF-GMP",
  fechaEmision: isoDate(new Date()),
  tipoRegistro: "P",
  estado: "registrada",
  folio: "",
  fecha: isoDate(new Date()),
  hora: new Date().toTimeString().slice(0, 5),
  receptionId: "",
  muestraTipo: "unica",
  muestraTipoDisabled: false,
  idInterno: "",
  loteRows: null,
  organismo: "",
  otroOrganismoText: "",
  partes: [],
  otroParteText: "",
  steps: {},
  biv7Equipo: "",
  biv7Peso: "",
  biv8Equipo: "",
  biv8Peso: "",
  biv8BolsaRef: "",
  sar3Equipo: "",
  sar3Peso: "",
  sar4Equipo: "",
  sar4Peso: "",
  sar5BolsaRef: "",
  otroProcesamiento: "",
  resguardo: {},
  observaciones: "",
  quienProceso: formatActiveUserSignature(),
  quienProcesoCargo: "",
  firmaProceso: "",
  quienSuperviso: "",
  quienSupervisoCargo: "",
  firmaSuperviso: "",
  inventarioRows: [],
});

const autoResolve = (current: ProcessingForm): ProcessingForm => {
  const next = { ...current };
  for (const key of ["biv8BolsaRef", "sar5BolsaRef"] as const) {
    const value = String(current[key] || "").trim();
    if (!value || !findInsumoOption("consumible", value)) {
      const match = findInsumoByAutoQuery("consumible", "bolsa hermetica");
      if (match) next[key] = match.ref;
    }
  }
  return next;
};

const buildProtocolInventario = (current: ProcessingForm) => {
  const result: Array<{ tipo: string; ref: string; cantidad: number }> = [];
  for (const [key, step] of [
    ["biv8BolsaRef", "procBiv8"],
    ["sar5BolsaRef", "procSar5"],
  ] as Array<["biv8BolsaRef" | "sar5BolsaRef", string]>) {
    if (!current.steps[step]) continue;
    const ref = String(current[key] || "").trim();
    if (!ref) continue;
    const resolved = resolveFixedInventoryAmount({ cantidadFija: 1, cantidadUnidad: "pieza" }, findInsumoOption("consumible", ref));
    result.push({ tipo: "consumible", ref, cantidad: resolved?.amount || 1 });
  }
  return result;
};

const formFromItem = (item: ApiRecord): ProcessingForm => {
  const steps: Record<string, boolean> = {};
  const names = (list: unknown) => (Array.isArray(list) ? list : []).map((step: ApiRecord | string) => (typeof step === "string" ? step : step.step));
  const bivalvos = names(item.bivalvos_steps);
  const sardinas = names(item.sardinas_steps);
  BIVALVOS_STEPS.forEach(([id, value]) => (steps[id] = bivalvos.includes(value)));
  SARDINAS_STEPS.forEach(([id, value]) => (steps[id] = sardinas.includes(value)));
  const stepObj = (arr: unknown, name: string): ApiRecord | null => ((Array.isArray(arr) ? arr : []).find((s) => typeof s === "object" && s && s.step === name) as ApiRecord) || null;
  const biv7 = stepObj(item.bivalvos_steps, "Moler 1-2 min 100-150g");
  const biv8 = stepObj(item.bivalvos_steps, "Reservar molienda en bolsa hermetica");
  const sar3 = stepObj(item.sardinas_steps, "Moler 1-2 min 100-150g");
  const sar4 = stepObj(item.sardinas_steps, "Pesar molienda obtenida");
  const res = item.resguardo || {};
  return {
    ...defaultForm(),
    claveRevision: item.clave_revision || "FX-TCF-GMP",
    fechaEmision: isoDate(item.fecha_emision),
    tipoRegistro: item.tipo_registro || "P",
    folio: item.folio_num ? String(item.folio_num) : "",
    fecha: isoDate(item.fecha_procesamiento),
    hora: item.hora_procesamiento || "",
    estado: item.estado || "registrada",
    receptionId: item.recepcion_id ? String(item.recepcion_id) : "",
    muestraTipo: item.muestra_tipo === "lote" ? "lote" : "unica",
    idInterno: item.id_interno || "",
    organismo: Array.isArray(item.tipo_organismo) ? item.tipo_organismo[0] || "" : "",
    partes: Array.isArray(item.parte_organismo) ? item.parte_organismo : [],
    steps,
    biv7Equipo: biv7?.equipo_id ? String(biv7.equipo_id) : "",
    biv8Equipo: biv8?.equipo_id ? String(biv8.equipo_id) : "",
    sar3Equipo: sar3?.equipo_id ? String(sar3.equipo_id) : "",
    sar4Equipo: sar4?.equipo_id ? String(sar4.equipo_id) : "",
    biv7Peso: biv7?.peso ?? "",
    biv8Peso: biv8?.peso ?? "",
    sar3Peso: sar3?.peso ?? "",
    sar4Peso: sar4?.peso ?? "",
    otroProcesamiento: item.otro_procesamiento || "",
    resguardo: Object.fromEntries(RESGUARDO.map(([key]) => [key, !!res[key]])),
    observaciones: item.observaciones_generales || "",
    quienProceso: item.nombre_quien_proceso || "",
    quienSuperviso: item.nombre_quien_superviso || "",
    firmaProceso: item.firma_quien_proceso || "",
    firmaSuperviso: item.firma_quien_superviso || "",
  };
};

const SECTIONS = [
  { id: "sec-datos", label: "Datos generales" },
  { id: "sec-muestra", label: "Muestra" },
  { id: "sec-organismo", label: "Organismo" },
  { id: "sec-proceso", label: "Procesamiento" },
  { id: "sec-resguardo", label: "Resguardo" },
  { id: "sec-insumos", label: "Insumos" },
  { id: "sec-personal", label: "Personal" },
];

export function ProcessingForm({ item, prefillReceptionId }: { item: ApiRecord | null; prefillReceptionId?: number | null }) {
  const router = useRouter();
  const { token, can } = useSession();
  const [form, setForm] = useState<ProcessingForm>(() => (item ? formFromItem(item) : defaultForm()));
  const [receptions, setReceptions] = useState<ApiRecord[]>([]);
  const [equipos, setEquipos] = useState<ApiRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef(new Map<number, ApiRecord>());
  const editing = !!item?.id;
  const patch = (changes: Partial<ProcessingForm>) => setForm((prev) => ({ ...prev, ...changes }));

  const receptionDetail = async (id: number): Promise<ApiRecord | null> => {
    const cached = detailCache.current.get(id);
    if (cached) return cached;
    const data = await getJsonAuth(`${API_BASE_URL}/samples/reception/${id}`, token);
    const detail = (data.item || null) as ApiRecord | null;
    if (detail) detailCache.current.set(id, detail);
    return detail;
  };

  const applyReception = (reception: ApiRecord | null, selected: ApiRecord[] = []) => {
    if (!reception) {
      patch({ muestraTipo: "unica", muestraTipoDisabled: false, idInterno: "", loteRows: null });
      return;
    }
    if (reception.muestra_unica) {
      patch({ muestraTipo: "unica", muestraTipoDisabled: true, idInterno: reception.id_interno || "", loteRows: null });
      return;
    }
    const selectedIds = new Set(selected.map((row) => String(row.id_interno || "")).filter(Boolean));
    const items: ApiRecord[] = Array.isArray(reception.lote_muestras) ? reception.lote_muestras : [];
    const loteRows = items.map((entry) => ({ item: entry, checked: selectedIds.size ? selectedIds.has(String(entry.id_interno || "").trim()) : entry.trabajar !== false }));
    patch({ muestraTipo: "lote", muestraTipoDisabled: true, loteRows, idInterno: joinIds(loteRows) });
  };

  const joinIds = (rows: LoteSelectionRow[] | null) =>
    (rows || [])
      .filter((row) => row.checked)
      .map((row) => String(row.item.id_interno || "").trim())
      .filter(Boolean)
      .join(", ");

  const selectReception = async (value: string, selected: ApiRecord[] = []) => {
    const id = parseIntOrNull(value);
    if (!id) return applyReception(null);
    try {
      applyReception(await receptionDetail(id), selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la recepción");
      applyReception(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const empty: ApiRecord = {};
      const [eq, rec] = await Promise.all([getJsonAuth(`${API_BASE_URL}/inventory/equipos`, token).catch(() => empty), getJsonAuth(`${API_BASE_URL}/samples/reception?search=`, token).catch(() => empty)]);
      if (cancelled) return;
      setEquipos((eq.items || []) as ApiRecord[]);
      setReceptions((rec.items || []) as ApiRecord[]);
      await loadInsumoOptions();
      if (cancelled) return;
      if (item) {
        if (item.recepcion_id) {
          await selectReception(String(item.recepcion_id), item.lote_seleccion || []);
          if (cancelled) return;
          if ((item.muestra_tipo || "") === "unica") patch({ idInterno: item.id_interno || "" });
        }
        setForm((prev) => {
          const resolved = autoResolve(prev);
          const manual = filterManualInventario((item.uso_inventario || []) as ApiRecord[], buildProtocolInventario(resolved));
          return { ...resolved, inventarioRows: manual.map((row) => newInventarioRow(row.tipo || "consumible", row.ref || row.nombre || "", row.cantidad ?? 1, row.nombre)) };
        });
        return;
      }
      setForm((prev) => autoResolve(prev));
      try {
        const data = await getJsonAuth(`${API_BASE_URL}/samples/processing/next-folio`, token);
        if (!cancelled) patch({ folio: data.next_folio ? String(data.next_folio) : "" });
      } catch {
        /* sin folio sugerido */
      }
      if (prefillReceptionId) {
        patch({ receptionId: String(prefillReceptionId) });
        await selectReception(String(prefillReceptionId));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, item, prefillReceptionId]);

  const isLote = form.muestraTipo === "lote";
  const setStep = (id: string, checked: boolean) => patch({ steps: { ...form.steps, [id]: checked } });

  const buildPayload = (current: ProcessingForm) => {
    const selected = current.receptionId ? receptions.find((row) => String(row.id) === current.receptionId) : undefined;
    const lote = current.muestraTipo === "lote"
      ? (current.loteRows || [])
          .filter((row) => row.checked)
          .map((row) => ({
            trabajar: true,
            id_interno: String(row.item.id_interno || "").trim() || null,
            nombre_organismo: String(row.item.nombre_organismo || "").trim() || null,
            cantidad_volumen: String(row.item.cantidad_volumen || "").trim() || null,
            sitio_muestreo: String(row.item.sitio_muestreo || "").trim() || null,
            fecha_muestra: row.item.fecha_muestra || null,
            informacion_adicional: String(row.item.informacion_adicional || "").trim() || null,
          }))
      : [];
    const stepObjects = (list: Array<[string, string, string]>, extras: Record<string, { equipo: string; peso: string }>) =>
      list.filter(([id]) => !!current.steps[id]).map(([id, value]) => ({ step: value, equipo_id: extras[id] ? parseIntOrNull(extras[id].equipo) : null, peso: extras[id] ? parseFloatOrNull(extras[id].peso) : null }));
    return {
      folio_num: parseIntOrNull(current.folio),
      tipo_registro: current.tipoRegistro.trim() || "P",
      clave_revision: current.claveRevision.trim() || "FX-TCF-GMP",
      fecha_emision: current.fechaEmision || null,
      fecha_procesamiento: current.fecha || null,
      hora_procesamiento: current.hora || null,
      recepcion_id: parseIntOrNull(current.receptionId),
      folio_recepcion_num: parseIntOrNull(selected?.folio_num),
      muestra_tipo: current.muestraTipo || null,
      id_interno: (current.muestraTipo === "lote" ? lote.map((r) => r.id_interno).filter(Boolean).join(", ") : current.idInterno).trim() || null,
      lote_seleccion: lote,
      tipo_organismo: current.organismo ? [current.organismo] : [],
      parte_organismo: PARTES.map(([v]) => v).filter((v) => current.partes.includes(v)),
      bivalvos_steps: stepObjects(BIVALVOS_STEPS, { procBiv7: { equipo: current.biv7Equipo, peso: current.biv7Peso }, procBiv8: { equipo: current.biv8Equipo, peso: current.biv8Peso } }),
      sardinas_steps: stepObjects(SARDINAS_STEPS, { procSar3: { equipo: current.sar3Equipo, peso: current.sar3Peso }, procSar4: { equipo: current.sar4Equipo, peso: current.sar4Peso } }),
      otro_procesamiento: current.organismo === "otro" ? current.otroProcesamiento.trim() || null : null,
      resguardo: Object.fromEntries(RESGUARDO.map(([key]) => [key, !!current.resguardo[key]])),
      observaciones_generales: current.observaciones.trim() || null,
      nombre_quien_proceso: current.quienProceso.trim() || null,
      nombre_quien_superviso: current.quienSuperviso.trim() || null,
      firma_quien_proceso: current.firmaProceso.trim() || null,
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
    if (!payload.folio_num) return fail("El folio de procesamiento es obligatorio", "sec-datos");
    if (payload.muestra_tipo === "unica" && !payload.id_interno) return fail("Captura el ID interno de la muestra", "sec-muestra");
    if (payload.muestra_tipo === "lote" && !payload.lote_seleccion.length) return fail("Selecciona al menos una muestra del lote", "sec-muestra");
    if (!payload.tipo_organismo.length) return fail("Selecciona el tipo de organismo", "sec-organismo");
    if (!can("muestras", editing ? "update" : "create")) return fail("No tienes permiso para esta acción", "sec-datos");
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/samples/processing/${item!.id}`, token, payload);
        toast.success("Procesamiento actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/samples/processing`, token, payload);
        toast.success("Procesamiento registrado. Inventario descontado.");
      }
      invalidate("muestras", "movimientos", "consumibles", "reactivos", "dashboard");
      router.push("/muestras/procesamiento");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el procesamiento");
      setSubmitting(false);
    }
  };

  const equipoSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {equipos.map((eq) => (
        <option key={eq.id} value={eq.id}>
          {[eq.nombre || "Equipo", eq.marca, eq.modelo].filter(Boolean).join(" · ")}
        </option>
      ))}
    </Select>
  );

  const pesoInput = (value: string, onChange: (v: string) => void, placeholder: string) => <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} aria-label={placeholder} />;

  return (
    <FormPage
      backHref="/muestras/procesamiento"
      backLabel="Procesamientos"
      code="FX-TCF-GMP"
      title={editing ? `Procesamiento ${formatProcessingFolio(item!)}` : "Nuevo procesamiento"}
      status={sampleStatusLabel(form.estado)}
      sections={SECTIONS}
      error={error}
      actions={
        <>
          <Button variant="secondary" onClick={() => router.push("/muestras/procesamiento")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={submitting} icon={<FloppyDisk size={16} />}>
            {editing ? "Guardar cambios" : "Registrar procesamiento"}
          </Button>
        </>
      }
    >
      <FormCard id="sec-datos" title="Datos generales" description="Folio, fecha y recepción de origen.">
        <FormGrid cols={4}>
          <Field label="Folio P" htmlFor="p-folio" required>
            <Input id="p-folio" type="number" min="1" inputMode="numeric" value={form.folio} onChange={(event) => patch({ folio: event.target.value })} mono invalid={!!error && !form.folio} />
          </Field>
          <Field label="Fecha" htmlFor="p-fecha" required>
            <Input id="p-fecha" type="date" value={form.fecha} onChange={(event) => patch({ fecha: event.target.value })} />
          </Field>
          <Field label="Hora" htmlFor="p-hora" required>
            <Input id="p-hora" type="time" value={form.hora} onChange={(event) => patch({ hora: event.target.value })} />
          </Field>
          <Field label="Recepción (FX-TCF-GMR)" htmlFor="p-recepcion" hint="Al vincular se cargan las muestras.">
            <Select
              id="p-recepcion"
              value={form.receptionId}
              onChange={(event) => {
                patch({ receptionId: event.target.value });
                void selectReception(event.target.value);
              }}
            >
              <option value="">Sin vincular</option>
              {receptions.map((option) => (
                <option key={option.id} value={option.id}>
                  R {String(option.folio_num || "").padStart(7, "0")} · {option.solicitante || option.id_interno || "Sin solicitante"}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard id="sec-muestra" title="Muestra" description={form.muestraTipoDisabled ? "El tipo lo define la recepción vinculada." : "Muestra única o lote."}>
        <ChoiceGrid className="mb-5 lg:grid-cols-2">
          <ChoiceCard type="radio" name="p-tipo" checked={!isLote} disabled={form.muestraTipoDisabled} onChange={() => patch({ muestraTipo: "unica" })} label="Muestra única" description="Un ID interno." />
          <ChoiceCard type="radio" name="p-tipo" checked={isLote} disabled={form.muestraTipoDisabled} onChange={() => patch({ muestraTipo: "lote", idInterno: joinIds(form.loteRows) })} label="Lote" description="Selecciona qué muestras se procesan." />
        </ChoiceGrid>
        {!isLote ? (
          <Field label="ID interno" htmlFor="p-id" required>
            <Input id="p-id" maxLength={100} value={form.idInterno} onChange={(event) => patch({ idInterno: event.target.value })} mono invalid={!!error && !form.idInterno.trim()} className="max-w-sm" />
          </Field>
        ) : form.loteRows === null ? (
          <EmptyState compact title="Vincula una recepción" description="Selecciona el folio de recepción para cargar las muestras del lote." />
        ) : !form.loteRows.length ? (
          <EmptyState compact title="Sin muestras de lote" description="La recepción vinculada no contiene muestras de lote." />
        ) : (
          <div className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2/70 text-[12px] text-ink-3">
                <tr>
                  <th className="h-9 w-16 px-2 text-center font-medium">Trabajar</th>
                  <th className="h-9 px-3 text-left font-medium">ID interno</th>
                  <th className="h-9 px-3 text-left font-medium">Organismo</th>
                  <th className="h-9 px-3 text-left font-medium">Cantidad</th>
                  <th className="h-9 px-3 text-left font-medium">Sitio</th>
                  <th className="h-9 px-3 text-left font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {form.loteRows.map((row, index) => (
                  <tr key={`${row.item.id_interno}-${index}`} className={row.checked ? "" : "text-ink-3"}>
                    <td className="px-2 py-2 text-center">
                      <Checkbox
                        className="inline-flex"
                        aria-label="Trabajar"
                        checked={row.checked}
                        onChange={(event) => {
                          const rows = (form.loteRows || []).map((entry, i) => (i === index ? { ...entry, checked: event.target.checked } : entry));
                          patch({ loteRows: rows, idInterno: joinIds(rows) });
                        }}
                      />
                    </td>
                    <td className="code px-3 py-2 font-medium">{String(row.item.id_interno || "").trim() || `Muestra ${index + 1}`}</td>
                    <td className="px-3 py-2">{row.item.nombre_organismo || "-"}</td>
                    <td className="px-3 py-2">{row.item.cantidad_volumen || "-"}</td>
                    <td className="px-3 py-2">{row.item.sitio_muestreo || "-"}</td>
                    <td className="px-3 py-2">{fmtDate(row.item.fecha_muestra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      <FormCard id="sec-organismo" title="Organismo" description="Tipo de organismo y parte a procesar.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Tipo de organismo</p>
            {(
              [
                ["bivalvos", "Bivalvos", "Moluscos: lavado, desconche, drenado y molienda."],
                ["sardinas", "Sardinas", "Peces: trozado y molienda del tejido."],
                ["otro", "Otro", "Describe el procedimiento aplicado."],
              ] as Array<[string, string, string]>
            ).map(([value, label, description]) => (
              <ChoiceCard key={value} type="radio" name="p-organismo" checked={form.organismo === value} onChange={() => patch({ organismo: value })} label={label} description={description} />
            ))}
            {form.organismo === "otro" ? <Input placeholder="Especificar tipo de organismo" value={form.otroOrganismoText} onChange={(event) => patch({ otroOrganismoText: event.target.value })} aria-label="Otro organismo" /> : null}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink-2">Parte del organismo</p>
            {PARTES.map(([value, label]) => (
              <ChoiceCard key={value} checked={form.partes.includes(value)} onChange={(checked) => patch({ partes: checked ? [...form.partes.filter((v) => v !== value), value] : form.partes.filter((v) => v !== value) })} label={label} />
            ))}
            {form.partes.includes("otro") ? <Input placeholder="Especificar otra parte" value={form.otroParteText} onChange={(event) => patch({ otroParteText: event.target.value })} aria-label="Otra parte" /> : null}
          </div>
        </div>
      </FormCard>

      <FormCard id="sec-proceso" title="Procesamiento" description={form.organismo ? "Marca los pasos realizados y registra equipo y peso donde aplique." : "Selecciona el tipo de organismo para ver los pasos."}>
        {form.organismo === "bivalvos" ? (
          <div className="flex flex-col">
            {BIVALVOS_STEPS.map(([id, , label], index) => (
              <StepRow key={id} number={index + 1} label={label} checked={!!form.steps[id]} onCheckedChange={(checked) => setStep(id, checked)}>
                {id === "procBiv7" && form.steps[id] ? (
                  <>
                    {equipoSelect(form.biv7Equipo, (v) => patch({ biv7Equipo: v }), "Licuadora")}
                    {pesoInput(form.biv7Peso, (v) => patch({ biv7Peso: v }), "Peso (g), 100 a 150")}
                  </>
                ) : null}
                {id === "procBiv8" && form.steps[id] ? (
                  <>
                    <InsumoSearch tipo="consumible" value={form.biv8BolsaRef} onChange={(ref) => patch({ biv8BolsaRef: ref })} placeholder="Bolsa hermética (se descuenta 1 pieza)" />
                    {equipoSelect(form.biv8Equipo, (v) => patch({ biv8Equipo: v }), "Balanza")}
                    {pesoInput(form.biv8Peso, (v) => patch({ biv8Peso: v }), "Peso de la molienda (g)")}
                  </>
                ) : null}
              </StepRow>
            ))}
          </div>
        ) : form.organismo === "sardinas" ? (
          <div className="flex flex-col">
            {SARDINAS_STEPS.map(([id, , label], index) => (
              <StepRow key={id} number={index + 1} label={label} checked={!!form.steps[id]} onCheckedChange={(checked) => setStep(id, checked)}>
                {id === "procSar3" && form.steps[id] ? (
                  <>
                    {equipoSelect(form.sar3Equipo, (v) => patch({ sar3Equipo: v }), "Licuadora")}
                    {pesoInput(form.sar3Peso, (v) => patch({ sar3Peso: v }), "Peso (g), 100 a 150")}
                  </>
                ) : null}
                {id === "procSar4" && form.steps[id] ? (
                  <>
                    {equipoSelect(form.sar4Equipo, (v) => patch({ sar4Equipo: v }), "Balanza")}
                    {pesoInput(form.sar4Peso, (v) => patch({ sar4Peso: v }), "Peso de la molienda (g)")}
                  </>
                ) : null}
                {id === "procSar5" && form.steps[id] ? <InsumoSearch tipo="consumible" value={form.sar5BolsaRef} onChange={(ref) => patch({ sar5BolsaRef: ref })} placeholder="Bolsa hermética (se descuenta 1 pieza)" /> : null}
              </StepRow>
            ))}
          </div>
        ) : form.organismo === "otro" ? (
          <Field label="Procedimiento aplicado" htmlFor="p-otro">
            <Textarea id="p-otro" rows={4} placeholder="Describe el proceso de preparación para este organismo" value={form.otroProcesamiento} onChange={(event) => patch({ otroProcesamiento: event.target.value })} />
          </Field>
        ) : (
          <EmptyState compact title="Sin organismo seleccionado" description="Elige bivalvos, sardinas u otro en la sección anterior." />
        )}
      </FormCard>

      <FormCard id="sec-resguardo" title="Resguardo de la molienda" description="Dónde queda la molienda al terminar.">
        <ChoiceGrid>
          {RESGUARDO.map(([key, label]) => (
            <ChoiceCard key={key} checked={!!form.resguardo[key]} onChange={(checked) => patch({ resguardo: { ...form.resguardo, [key]: checked } })} label={label} />
          ))}
        </ChoiceGrid>
        <Field label="Observaciones generales" htmlFor="p-obs" className="mt-5">
          <Textarea id="p-obs" rows={3} value={form.observaciones} onChange={(event) => patch({ observaciones: event.target.value })} />
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

      <FormCard id="sec-personal" title="Personal responsable" description="Quién procesó y quién supervisó.">
        <div className="grid gap-5 lg:grid-cols-2">
          <PersonCard title="Quien procesó" name={form.quienProceso} onName={(v) => patch({ quienProceso: v })} cargo={form.quienProcesoCargo} onCargo={(v) => patch({ quienProcesoCargo: v })} signature={form.firmaProceso} onSignature={(v) => patch({ firmaProceso: v })} />
          <PersonCard title="Quien supervisó" name={form.quienSuperviso} onName={(v) => patch({ quienSuperviso: v })} cargo={form.quienSupervisoCargo} onCargo={(v) => patch({ quienSupervisoCargo: v })} signature={form.firmaSuperviso} onSignature={(v) => patch({ firmaSuperviso: v })} />
        </div>
        <p className="mt-4 rounded-card border border-line bg-surface-2/50 px-4 py-3 text-[12.5px] text-ink-2">Recuerda registrar el uso de cada equipo en su bitácora correspondiente.</p>
      </FormCard>
    </FormPage>
  );
}
