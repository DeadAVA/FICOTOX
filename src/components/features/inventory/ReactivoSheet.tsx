"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileXls } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/features/samples/FormLayout";
import { Field, FormGrid, FormSection, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { Badge, EmptyState } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { REACTIVO_FIELD_META, REACTIVO_TYPES } from "@/lib/client/constants";
import { fmt } from "@/lib/client/format";
import { workbookToReactivoSheets, type ReactivoImportSheet } from "@/lib/client/importing";
import { getReactivoTypeConfig } from "@/lib/client/reactivos";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/* Alta y edicion de reactivos: los campos dependen de la categoria. */
export function ReactivoSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const [tipo, setTipo] = useState<string>(String(item?.tipo_reactivo || item?.categoria || ""));
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (item) for (const [key, value] of Object.entries(item)) initial[key] = value === null || value === undefined ? "" : String(value);
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const config = getReactivoTypeConfig(tipo);
  const editing = !!item?.id;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = { tipo_reactivo: tipo || "" };
    for (const fieldKey of config?.fields || []) {
      const meta = REACTIVO_FIELD_META[fieldKey] || { label: fieldKey };
      payload[meta.target || fieldKey] = values[fieldKey] || null;
    }
    // Existencias (comunes a todas las categorías): lo que mueve el medidor y los avisos de stock bajo.
    for (const key of ["cantidad_actual", "unidad", "stock_maximo", "stock_minimo"]) payload[key] = values[key] || null;
    if (values.cantidad_actual === "" || values.cantidad_actual === undefined) {
      setError("Captura la cantidad actual en existencia");
      document.getElementById("reactivo-cantidad_actual")?.focus();
      return;
    }
    if (!values.unidad) {
      setError("Elige la unidad de la existencia");
      document.getElementById("reactivo-unidad")?.focus();
      return;
    }
    const productName = payload.producto || payload.item_name || payload.nombre_crm;
    if (!tipo || !productName) {
      setError("Selecciona la categoría y captura el nombre principal del reactivo");
      formRef.current?.reportValidity();
      return;
    }
    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      setError("Completa los campos obligatorios de esta categoría");
      return;
    }
    if (!can("reactivos", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/reactivos/${item!.id}`, token, payload);
        toast.success("Reactivo actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/reactivos`, token, payload);
        toast.success("Reactivo creado");
      }
      invalidate("reactivos", "dashboard");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el reactivo");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (fieldKey: string) => {
    const meta = REACTIVO_FIELD_META[fieldKey] || { label: fieldKey };
    const target = meta.target || fieldKey;
    const value = values[fieldKey] ?? values[target] ?? "";
    const id = `reactivo-${fieldKey}`;
    const setValue = (next: string) => setValues((prev) => ({ ...prev, [fieldKey]: next }));
    return (
      <Field key={fieldKey} label={meta.label} htmlFor={id} required={!!meta.required} className={meta.wide ? "sm:col-span-2" : undefined}>
        {meta.textarea ? (
          <Textarea id={id} rows={3} required={!!meta.required} value={value} onChange={(event) => setValue(event.target.value)} />
        ) : meta.options ? (
          <Select id={id} required={!!meta.required} value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="">Seleccionar</option>
            {meta.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : (
          <Input id={id} type={meta.type || "text"} step={meta.step} min={meta.min} required={!!meta.required} value={value} onChange={(event) => setValue(event.target.value)} />
        )}
      </Field>
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar reactivo" : "Nuevo reactivo"}
      description="Los campos cambian según la categoría del reactivo."
      size="lg"
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="reactivo-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear reactivo"}
          </Button>
        </>
      }
    >
      <form id="reactivo-form" ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
        <FormSection title="1. Categoría" description={config ? config.hint : "Elige la familia del reactivo: cada una tiene su propio formato de captura."}>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de reactivo">
            {REACTIVO_TYPES.map((type) => (
              <ChoiceCard key={type.value} type="radio" name="reactivo-tipo" checked={tipo === type.value} onChange={() => setTipo(type.value)} label={type.label} />
            ))}
          </div>
        </FormSection>
        {config ? (
          <FormSection title="2. Datos del reactivo" description="Los campos marcados con * son obligatorios para esta categoría.">
            <FormGrid cols={2}>{config.fields.map(renderField)}</FormGrid>
          </FormSection>
        ) : (
          <EmptyState compact title="Elige una categoría" description="Al elegirla aparecen solo los campos que aplican." />
        )}
        {config ? (
          <FormSection title="3. Existencias" description="Cantidad real en el laboratorio, la capacidad de referencia y el mínimo a partir del cual se avisa “stock bajo”. Los formatos descuentan de aquí.">
            <FormGrid cols={2}>
              <Field label="Cantidad actual" htmlFor="reactivo-cantidad_actual" required>
                <Input id="reactivo-cantidad_actual" type="number" min="0" step="0.001" inputMode="decimal" value={values.cantidad_actual ?? ""} onChange={(event) => setValues((prev) => ({ ...prev, cantidad_actual: event.target.value }))} />
              </Field>
              <Field label="Unidad" htmlFor="reactivo-unidad" required>
                <Select id="reactivo-unidad" value={values.unidad || ""} onChange={(event) => setValues((prev) => ({ ...prev, unidad: event.target.value }))}>
                  <option value="">Seleccionar</option>
                  {["L", "mL", "kg", "g", "piezas"].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Capacidad / stock de referencia" htmlFor="reactivo-stock_maximo" hint="Cantidad con la que se considera lleno (p. ej. 8 L = dos garrafones). Si se deja vacío, se toma la cantidad actual.">
                <Input id="reactivo-stock_maximo" type="number" min="0" step="0.001" inputMode="decimal" value={values.stock_maximo ?? ""} onChange={(event) => setValues((prev) => ({ ...prev, stock_maximo: event.target.value }))} />
              </Field>
              <Field label="Stock mínimo" htmlFor="reactivo-stock_minimo" hint="Al llegar a esta cantidad aparece el aviso de stock bajo. Sin mínimo, se avisa al 20 % de la capacidad.">
                <Input id="reactivo-stock_minimo" type="number" min="0" step="0.001" inputMode="decimal" value={values.stock_minimo ?? ""} onChange={(event) => setValues((prev) => ({ ...prev, stock_minimo: event.target.value }))} />
              </Field>
            </FormGrid>
          </FormSection>
        ) : null}
      </form>
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

  const handleFile = async () => {
    const file = fileRef.current?.files?.[0];
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
              <span className="text-[13.5px] font-medium text-ink">{fileRef.current?.files?.[0]?.name || "Elegir archivo .xlsx o .xls"}</span>
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
