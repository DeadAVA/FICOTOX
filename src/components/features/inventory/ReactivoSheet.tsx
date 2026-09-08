"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FileXls } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
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
        <FormSection title="Categoría" description={config ? config.hint : "Elige la familia para cargar solo los campos que aplican."}>
          <Field label="Tipo de reactivo" htmlFor="reactivo-tipo" required>
            <Select id="reactivo-tipo" required value={tipo} onChange={(event) => setTipo(event.target.value)} autoFocus={!editing}>
              <option value="">Seleccionar categoría</option>
              {REACTIVO_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
        {config ? (
          <FormSection title="Datos del formato">
            <FormGrid cols={2}>{config.fields.map(renderField)}</FormGrid>
          </FormSection>
        ) : (
          <EmptyState compact title="Sin categoría" description="Elige el tipo de reactivo para mostrar su formato de captura." />
        )}
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

        {message ? <p className={message.error ? "text-[13px] text-danger" : "text-[13px] text-[#1f6b50]"}>{message.text}</p> : null}

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
