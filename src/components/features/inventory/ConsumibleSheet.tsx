"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { FileCsv, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, FormGrid, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { Badge } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { parseIntOrNull } from "@/lib/client/format";
import { detectCsvDelimiter, mapCsvToPreviewRows, parseCsvText, readCsvFileText, workbookToConsumableRows, type ImportPreviewRow } from "@/lib/client/importing";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export function ConsumibleSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const [form, setForm] = useState({
    producto: String(item?.producto || ""),
    marca: String(item?.marca || ""),
    proveedor: String(item?.proveedor || ""),
    catalogo: String(item?.catalogo_parte_cas || ""),
    fechaIngreso: item?.fecha_ingreso ? String(item.fecha_ingreso).slice(0, 10) : "",
    tamano: String(item?.tamano_capacidad || ""),
    contenedor: String(item?.contenedor || ""),
    piezas: item?.piezas === null || item?.piezas === undefined ? "" : String(item.piezas),
    cantidadPieza: item?.cantidad_por_pieza === null || item?.cantidad_por_pieza === undefined ? "" : String(item.cantidad_por_pieza),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;
  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      producto: form.producto.trim(),
      marca: form.marca.trim() || null,
      proveedor: form.proveedor.trim() || null,
      catalogo_parte_cas: form.catalogo.trim() || null,
      fecha_ingreso: form.fechaIngreso || null,
      tamano_capacidad: form.tamano.trim() || null,
      contenedor: form.contenedor.trim() || null,
      piezas: parseIntOrNull(form.piezas),
      cantidad_por_pieza: parseIntOrNull(form.cantidadPieza),
    };
    if (!payload.producto) {
      setError("El producto es obligatorio");
      return;
    }
    if (!can("consumibles", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/consumables/${item!.id}`, token, payload);
        toast.success("Consumible actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/consumables`, token, payload);
        toast.success("Consumible creado");
      }
      invalidate("consumibles", "dashboard");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar consumible" : "Nuevo consumible"}
      description={editing ? `Registro #${item!.id}` : "Material de uso en laboratorio."}
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="consumible-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear consumible"}
          </Button>
        </>
      }
    >
      <form id="consumible-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Producto" htmlFor="c-producto" required error={error && !form.producto.trim() ? error : undefined}>
          <Input id="c-producto" maxLength={150} value={form.producto} onChange={set("producto")} autoFocus={!editing} invalid={!!error && !form.producto.trim()} />
        </Field>
        <FormGrid>
          <Field label="Marca" htmlFor="c-marca">
            <Input id="c-marca" maxLength={100} value={form.marca} onChange={set("marca")} />
          </Field>
          <Field label="Proveedor" htmlFor="c-proveedor">
            <Input id="c-proveedor" maxLength={150} value={form.proveedor} onChange={set("proveedor")} />
          </Field>
          <Field label="Catálogo / parte / CAS" htmlFor="c-catalogo">
            <Input id="c-catalogo" maxLength={150} value={form.catalogo} onChange={set("catalogo")} mono />
          </Field>
          <Field label="Fecha de ingreso" htmlFor="c-fecha">
            <Input id="c-fecha" type="date" value={form.fechaIngreso} onChange={set("fechaIngreso")} />
          </Field>
          <Field label="Tamaño / capacidad" htmlFor="c-tamano">
            <Input id="c-tamano" maxLength={100} value={form.tamano} onChange={set("tamano")} />
          </Field>
          <Field label="Contenedor" htmlFor="c-contenedor">
            <Input id="c-contenedor" maxLength={100} value={form.contenedor} onChange={set("contenedor")} />
          </Field>
          <Field label="Piezas" htmlFor="c-piezas">
            <Input id="c-piezas" type="number" min="0" inputMode="numeric" value={form.piezas} onChange={set("piezas")} />
          </Field>
          <Field label="Cantidad por pieza" htmlFor="c-cantidad">
            <Input id="c-cantidad" type="number" min="0" inputMode="numeric" value={form.cantidadPieza} onChange={set("cantidadPieza")} />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}

/* Importacion de consumibles: CSV/XLSX leido en el navegador, vista previa y alta de filas validas. */
export function ImportConsumiblesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token } = useSession();
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setRows([]);
      setDetected([]);
      return;
    }
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        const result = await workbookToConsumableRows(file);
        setDetected(result.detected);
        setRows(result.rows);
        if (!result.validSheets) setMessage({ text: "El Excel no contiene hojas de consumibles reconocidas", error: true });
        else if (!result.rows.length) setMessage({ text: "Las hojas de consumibles no contienen filas válidas", error: true });
        else setMessage({ text: `${result.validSheets} hoja(s) leídas · ${result.ignoredSheets.length} descartadas`, error: false });
        return;
      }
      const text = await readCsvFileText(file);
      const mapped = mapCsvToPreviewRows(parseCsvText(text, detectCsvDelimiter(text)));
      setDetected(mapped.detected);
      setRows(mapped.rows);
      setMessage(mapped.rows.length ? { text: "Archivo cargado", error: false } : { text: "El archivo no contiene filas para importar", error: true });
    } catch {
      setRows([]);
      setDetected([]);
      setMessage({ text: "No se pudo leer el archivo", error: true });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const valid = rows.filter((row) => row._valid);
    if (!valid.length) {
      setMessage({ text: "No hay filas válidas para importar", error: true });
      return;
    }
    setSubmitting(true);
    try {
      const result = await sendJsonAuth("POST", `${API_BASE_URL}/consumables/import`, token, {
        rows: valid.map((row) => ({
          producto: row.producto,
          marca: row.marca,
          proveedor: row.proveedor,
          catalogo_parte_cas: row.catalogo_parte_cas,
          fecha_ingreso: row.fecha_ingreso,
          tamano_capacidad: row.tamano_capacidad,
          contenedor: row.contenedor,
          piezas: row.piezas,
          cantidad_por_pieza: row.cantidad_por_pieza,
        })),
      });
      toast.success(`Importación completada: ${Number(result.insertados || 0)} registros`);
      invalidate("consumibles", "dashboard");
      onClose();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "No se pudo importar el archivo", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = rows.filter((row) => row._valid).length;

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title="Importar consumibles"
      description="Acepta CSV, XLSX y XLS. Revisa la vista previa antes de dar de alta."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="import-consumibles-form" loading={submitting} disabled={!validCount}>
            Dar de alta {validCount ? `${validCount} filas` : ""}
          </Button>
        </>
      }
    >
      <form id="import-consumibles-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label="Archivo" htmlFor="import-consumibles-file" hint="Columnas esperadas: producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza.">
          <label htmlFor="import-consumibles-file" className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface-2/50 px-4 py-4 transition-colors hover:border-brand hover:bg-brand-faint">
            <FileCsv size={26} className="text-brand" />
            <span className="flex flex-col">
              <span className="text-[13.5px] font-medium text-ink">{fileRef.current?.files?.[0]?.name || "Elegir archivo CSV o Excel"}</span>
              <span className="text-[12.5px] text-ink-3">Se lee en tu navegador antes de enviarlo.</span>
            </span>
            <input ref={fileRef} id="import-consumibles-file" type="file" className="sr-only" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFile} />
          </label>
        </Field>

        {detected.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12.5px] text-ink-3">Campos detectados</span>
            {detected.map((field) => (
              <Badge key={field} tone="neutral">
                {field}
              </Badge>
            ))}
          </div>
        ) : null}

        {message ? <p className={message.error ? "text-[13px] text-danger" : "text-[13px] text-[#1f6b50]"}>{message.text}</p> : null}

        {rows.length ? (
          <TableShell footer={`${validCount} filas válidas · ${rows.length - validCount} descartables`}>
            <Table>
              <THead>
                <tr>
                  <Th>Producto</Th>
                  <Th>Marca</Th>
                  <Th>Proveedor</Th>
                  <Th>Catálogo</Th>
                  <Th>Ingreso</Th>
                  <Th align="right">Piezas</Th>
                  <Th align="right">Cant./pieza</Th>
                  <Th>Estado</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {rows.map((row, index) => (
                  <Tr key={`${row._rowIndex}-${index}`}>
                    <Td className="font-medium">{row.producto || "-"}</Td>
                    <Td muted>{row.marca || "-"}</Td>
                    <Td muted>{row.proveedor || "-"}</Td>
                    <Td mono>{row.catalogo_parte_cas || "-"}</Td>
                    <Td muted>{row.fecha_ingreso || "-"}</Td>
                    <Td align="right">{row.piezas ?? "-"}</Td>
                    <Td align="right">{row.cantidad_por_pieza ?? "-"}</Td>
                    <Td>
                      <Badge tone={row._valid ? "success" : "warning"}>{row._valid ? "Lista" : "Inválida"}</Badge>
                    </Td>
                    <Td align="right">
                      <IconButton label="Quitar fila" size="sm" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
                        <X size={14} />
                      </IconButton>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableShell>
        ) : null}
      </form>
    </Sheet>
  );
}
