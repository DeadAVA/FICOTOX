"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileXls } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/features/samples/FormLayout";
import { Checkbox, Field, FormGrid, FormSection, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { Badge, EmptyState } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { REACTIVO_FIELD_META, REACTIVO_TYPES, UNIDADES_REACTIVO } from "@/lib/client/constants";
import { fmt } from "@/lib/client/format";
import { workbookToReactivoSheets, type ReactivoImportSheet } from "@/lib/client/importing";
import { getReactivoTypeConfig } from "@/lib/client/reactivos";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { DateInput } from "@/components/ui/DateInput";
import { CampoValidado, useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { msg, type Problema } from "@/lib/client/mensajes";

/* Valores iniciales del formulario: unifica los nombres de columna que usaba cada categoría antes. */
function valoresIniciales(item: ApiRecord | null): Record<string, string> {
  const initial: Record<string, string> = {};
  if (!item) return initial;
  for (const [key, value] of Object.entries(item)) initial[key] = value === null || value === undefined ? "" : String(value);
  const primero = (...claves: string[]) => claves.map((k) => initial[k]).find((v) => v) || "";
  initial.producto = primero("producto", "item_name", "nombre_crm", "nombre");
  initial.id_interno = primero("id_interno", "codigo_interno", "id_reactivo");
  initial.cas = primero("cas", "numero_cas", "cas_number");
  initial.lote = primero("lote", "lot_number");
  initial.localizacion = primero("localizacion", "ubicacion");
  initial.caducidad = primero("caducidad", "expiration_date", "fecha_vencimiento");
  initial.caducidad_indefinida = Number(item.caducidad_indefinida) === 1 ? "1" : "";
  initial.capacidad = primero("capacidad", "capacidad_litros", "capacidad_kilos");
  const unidadCap = (primero("unidad_capacidad") || (initial.capacidad && item.capacidad_litros ? "L" : initial.capacidad && item.capacidad_kilos ? "kg" : "")).toLowerCase();
  initial.unidad_capacidad = ["l", "litros", "litro"].includes(unidadCap) ? "L" : ["kg", "kilos", "kilo"].includes(unidadCap) ? "kg" : ["ml"].includes(unidadCap) ? "mL" : unidadCap === "g" ? "g" : "";
  const condicion = primero("nuevo_usado").toLowerCase();
  initial.nuevo_usado = condicion.startsWith("nuev") ? "Nueva" : condicion.startsWith("usad") ? "Usada" : "";
  initial.parte = primero("parte", "numero_parte");
  return initial;
}

/* Alta y edicion de reactivos: todas las categorías comparten los mismos campos; las columnas cromatográficas tienen los suyos y no llevan existencias. */
export function ReactivoSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const [tipo, setTipo] = useState<string>(String(item?.tipo_reactivo || item?.categoria || ""));
  const [values, setValues] = useState<Record<string, string>>(() => valoresIniciales(item));
  const [submitting, setSubmitting] = useState(false);
  const config = getReactivoTypeConfig(tipo);
  const editing = !!item?.id;
  const esColumna = tipo === "columnas_cromatograficas";
  const indefinida = values.caducidad_indefinida === "1";
  const valorDe = (fieldKey: string) => String(values[fieldKey] ?? "").trim();
  const capacidad = Number(values.capacidad);
  const piezas = Number(values.piezas);
  const total = values.capacidad && values.piezas && Number.isFinite(capacidad) && Number.isFinite(piezas) ? Math.round(capacidad * piezas * 1e6) / 1e6 : null;
  const v = useValidacion({
    titulo: editing ? "No se pudo guardar el reactivo" : "No se pudo crear el reactivo",
    reglas: () => {
      const out: Problema[] = [];
      if (!tipo || !config) {
        out.push({ campo: "reactivo-tipo", mensaje: msg.elige("la categoría del reactivo") });
        return out;
      }
      if (!valorDe("producto")) out.push({ campo: "reactivo-producto", mensaje: msg.indica("el nombre del producto") });
      for (const fieldKey of config.fields) {
        const meta = REACTIVO_FIELD_META[fieldKey];
        const valor = valorDe(fieldKey);
        if (!meta || !valor || meta.type !== "number") continue;
        if (Number.isNaN(Number(valor)) || Number(valor) < 0) out.push({ campo: `reactivo-${fieldKey}`, mensaje: `«${meta.label}» debe ser un número mayor o igual a cero` });
      }
      if (!esColumna && valorDe("capacidad") && !valorDe("unidad_capacidad")) out.push({ campo: "reactivo-unidad_capacidad", mensaje: msg.elige("la unidad de la capacidad") });
      return out;
    },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = { tipo_reactivo: tipo || "" };
    for (const fieldKey of config?.fields || []) payload[fieldKey] = values[fieldKey] || null;
    if (!esColumna) {
      payload.caducidad_indefinida = indefinida ? 1 : 0;
      if (indefinida) payload.caducidad = null;
    }
    if (!v.validar()) return;
    if (!can("inventario", editing ? "E" : "C", { objeto: "catalogo_inventario" })) {
      v.avisar({ que: "No tienes permiso para guardar reactivos.", hacer: "Pide a la administración que revise tus roles y permisos." });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/reactivos/${item!.id}`, token, payload);
        toast.success("Reactivo actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos`, token, payload);
        toast.success("Reactivo creado");
      }
      invalidate("reactivos", "dashboard", "movimientos");
      onClose();
    } catch (err) {
      v.errorServidor(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (fieldKey: string) => {
    const meta = REACTIVO_FIELD_META[fieldKey] || { label: fieldKey };
    const value = values[fieldKey] ?? "";
    const id = `reactivo-${fieldKey}`;
    const setValue = (next: string) => setValues((prev) => ({ ...prev, [fieldKey]: next }));
    if (fieldKey === "unidad_capacidad") return null;
    if (fieldKey === "capacidad") {
      return (
        <Field key={fieldKey} label={meta.label} htmlFor={id}>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Input id={id} type="number" step="any" min="0" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
            <Select id="reactivo-unidad_capacidad" aria-label="Unidad de la capacidad" value={values.unidad_capacidad ?? ""} onChange={(event) => setValues((prev) => ({ ...prev, unidad_capacidad: event.target.value }))}>
              <option value="">Unidad</option>
              {UNIDADES_REACTIVO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </Field>
      );
    }
    if (fieldKey === "caducidad") {
      return (
        <Field key={fieldKey} label={meta.label} htmlFor={id}>
          <div className="flex flex-col gap-2">
            <DateInput id={id} value={indefinida ? "" : value} onChange={setValue} disabled={indefinida} />
            <Checkbox label="Indefinido" checked={indefinida} onChange={(event) => setValues((prev) => ({ ...prev, caducidad_indefinida: event.target.checked ? "1" : "", caducidad: event.target.checked ? "" : prev.caducidad }))} />
          </div>
        </Field>
      );
    }
    // Un valor guardado antes de estas listas (p. ej. «Botella de vidrio») sigue visible al editar.
    const opciones = meta.options && value && !meta.options.includes(value) ? [...meta.options, value] : meta.options;
    return (
      <Field key={fieldKey} label={meta.label} htmlFor={id} hint={meta.hint} required={!!meta.required} className={meta.wide ? "sm:col-span-2" : undefined}>
        {meta.textarea ? (
          <Textarea id={id} rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
        ) : opciones ? (
          <Select id={id} value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="">Seleccionar</option>
            {opciones.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : meta.type === "date" ? (
          // Fechas siempre dd/mm/aaaa (componente propio, no el <input type="date"> del navegador).
          <DateInput id={id} value={value} onChange={setValue} />
        ) : (
          <Input id={id} type={meta.type || "text"} step={meta.step} min={meta.min} inputMode={meta.type === "number" ? "decimal" : undefined} value={value} onChange={(event) => setValue(event.target.value)} />
        )}
      </Field>
    );
  };

  const unidadTotal = values.unidad_capacidad || "";
  const existencia = item && item.cantidad_actual !== null && item.cantidad_actual !== undefined && item.cantidad_actual !== "" ? Number(item.cantidad_actual) : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar reactivo" : "Nuevo reactivo"}
      description="Elige la categoría; todas llevan los mismos datos, salvo las columnas cromatográficas."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="reactivo-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear reactivo"}
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
      <form id="reactivo-form" onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
        <FormSection title="1. Categoría" description={config ? config.hint : "Elige la familia del reactivo."}>
          <CampoValidado id="reactivo-tipo">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de reactivo">
              {REACTIVO_TYPES.map((type) => (
                <ChoiceCard key={type.value} type="radio" name="reactivo-tipo" checked={tipo === type.value} onChange={() => setTipo(type.value)} label={type.label} />
              ))}
            </div>
          </CampoValidado>
        </FormSection>
        {config ? (
          <FormSection title="2. Datos del reactivo" description="Solo el producto es obligatorio.">
            <FormGrid cols={2}>{config.fields.map(renderField)}</FormGrid>
          </FormSection>
        ) : (
          <EmptyState compact title="Elige una categoría" description="Al elegirla aparecen los campos del reactivo." />
        )}
        {config && !esColumna ? (
          <FormSection title="3. Existencia" description="El total inicial se calcula (capacidad × piezas). La existencia actual sale de los movimientos y no se escribe a mano: usa Registrar movimiento para anotar entradas, salidas, consumos o ajustes por conteo.">
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
              <p className="text-ink-2">
                Total inicial: <b className="tnum text-ink">{total !== null ? `${fmt(total)} ${unidadTotal}`.trim() : "—"}</b>
              </p>
              {editing ? (
                <p className="text-ink-2">
                  Existencia actual: <b className="tnum text-ink">{existencia !== null ? `${fmt(existencia)} ${item?.unidad || ""}`.trim() : "—"}</b>
                </p>
              ) : null}
            </div>
          </FormSection>
        ) : null}
      </form>
      </ValidacionAmbito>
    </Sheet>
  );
}

/* Importacion de reactivos desde Excel: SheetJS en el navegador, envio por hojas. */
export function ImportReactivosSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token } = useSession();
  const [sheets, setSheets] = useState<ReactivoImportSheet[]>([]);
  const [summary, setSummary] = useState<ApiRecord | null>(null);
  const [errors, setErrors] = useState<ApiRecord[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Nombre del archivo elegido (en estado: leer el ref durante el render no se actualiza ni es valido en React 19).
  const [nombreArchivo, setNombreArchivo] = useState("");

  const handleFile = async () => {
    const file = fileRef.current?.files?.[0];
    setNombreArchivo(file?.name || "");
    setSummary(null);
    setErrors([]);
    if (!file) {
      setSheets([]);
      return;
    }
    try {
      const parsed = await workbookToReactivoSheets(file);
      setSheets(parsed);
      const valid = parsed.filter((sheet) => sheet.valid);
      setMessage(valid.length ? { text: `${valid.length} hoja(s) de reactivos listas para importar`, error: false } : { text: "El Excel no contiene hojas de reactivos reconocidas", error: true });
    } catch (err) {
      setSheets([]);
      setErrors([{ hoja: file.name, fila: "-", error: err instanceof Error ? err.message : "No se pudo leer el Excel" }]);
      setMessage({ text: "No se pudo leer el archivo", error: true });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sheets.some((sheet) => sheet.valid)) {
      setMessage({ text: "Primero carga un Excel con hojas de reactivos reconocidas", error: true });
      return;
    }
    setSubmitting(true);
    try {
      const result = await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos/import`, token, { sheets: sheets.map((sheet) => ({ name: sheet.name, rows: sheet.rows })) });
      const next = (result.summary || {}) as ApiRecord;
      setSummary(next);
      setErrors((next.errores || []) as ApiRecord[]);
      setMessage({ text: `Importación completada: ${fmt(next.reactivos_insertados || 0)} insertados, ${fmt(next.reactivos_actualizados || 0)} actualizados, ${fmt(next.filas_ignoradas || 0)} filas ignoradas.`, error: false });
      toast.success("Reactivos importados");
      invalidate("reactivos", "dashboard");
    } catch (err) {
      setErrors([{ hoja: "-", fila: "-", error: err instanceof Error ? err.message : "No se pudo importar" }]);
      setMessage({ text: "No se pudo importar el Excel", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const processedByName = new Map(((summary?.hojas_procesadas || []) as ApiRecord[]).map((s) => [s.hoja, s]));
  const ignoredByName = new Map(((summary?.hojas_ignoradas || []) as ApiRecord[]).map((s) => [s.hoja, s]));

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Importar reactivos desde Excel"
      description="Se procesan solo las hojas de reactivos; consumibles y movimientos mensuales se ignoran."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {summary ? "Cerrar" : "Cancelar"}
          </Button>
          <Button type="submit" form="import-reactivos-form" loading={submitting} disabled={!sheets.some((s) => s.valid)}>
            Importar reactivos
          </Button>
        </>
      }
    >
      <form id="import-reactivos-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label="Archivo Excel" htmlFor="import-reactivos-file" hint="Hojas válidas: Ácidos, Alcoholes y solventes orgánicos, Compuestos de Amonio, Compuestos de Sodio, Estándares preparados, Materiales de Referencia, Misceláneos y Columnas cromatográficas.">
          <label htmlFor="import-reactivos-file" className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-2/50 px-4 py-4 transition-colors hover:border-brand hover:bg-brand-faint">
            <FileXls size={26} className="text-brand" />
            <span className="flex flex-col">
              <span className="text-[13.5px] font-medium text-ink">{nombreArchivo || "Elegir archivo .xlsx o .xls"}</span>
              <span className="text-[12.5px] text-ink-3">Se lee en tu navegador antes de enviarlo.</span>
            </span>
            <input ref={fileRef} id="import-reactivos-file" type="file" className="sr-only" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFile} />
          </label>
        </Field>

        {message ? <p className={message.error ? "text-[13px] text-danger" : "text-[13px] text-success-text"}>{message.text}</p> : null}

        {sheets.length ? (
          <TableShell>
            <Table>
              <THead>
                <tr>
                  <Th>Hoja</Th>
                  <Th>Categoría</Th>
                  <Th align="right">Filas</Th>
                  <Th>Estado</Th>
                </tr>
              </THead>
              <TBody>
                {sheets.map((sheet) => {
                  const processed = processedByName.get(sheet.name);
                  const ignored = ignoredByName.get(sheet.name);
                  return (
                    <Tr key={sheet.name}>
                      <Td>{sheet.name}</Td>
                      <Td muted>{sheet.label || "-"}</Td>
                      <Td align="right">{fmt(sheet.rows.length)}</Td>
                      <Td>
                        {processed ? (
                          <Badge tone="success">{`${processed.insertados || 0} insertados · ${processed.actualizados || 0} actualizados`}</Badge>
                        ) : ignored ? (
                          <Badge tone="neutral">Ignorada</Badge>
                        ) : sheet.valid ? (
                          <Badge tone="brand">Lista</Badge>
                        ) : (
                          <Badge tone="neutral">No aplica</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </TableShell>
        ) : null}

        {errors.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-ink">Errores ({errors.length})</p>
            <TableShell>
              <Table>
                <THead>
                  <tr>
                    <Th>Hoja</Th>
                    <Th>Fila</Th>
                    <Th>Detalle</Th>
                  </tr>
                </THead>
                <TBody>
                  {errors.slice(0, 80).map((row, index) => (
                    <Tr key={index}>
                      <Td muted>{row.hoja || "-"}</Td>
                      <Td muted>{row.fila || "-"}</Td>
                      <Td className="text-danger">{row.error || "-"}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableShell>
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}
