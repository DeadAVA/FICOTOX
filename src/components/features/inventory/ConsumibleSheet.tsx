"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { FileCsv, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { DateInput } from "@/components/ui/DateInput";
import { Sheet } from "@/components/ui/Overlay";
import { Badge } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { CONTENEDORES_CONSUMIBLE } from "@/lib/client/constants";
import { detectCsvDelimiter, mapCsvToPreviewRows, parseCsvText, readCsvFileText, workbookToConsumableRows, type ImportPreviewRow } from "@/lib/client/importing";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { msg } from "@/lib/client/mensajes";

export function ConsumibleSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const texto = (valor: unknown) => (valor === null || valor === undefined ? "" : String(valor));
  const [form, setForm] = useState({
    idInterno: texto(item?.id_interno),
    producto: texto(item?.producto),
    marca: texto(item?.marca),
    proveedor: texto(item?.proveedor),
    catalogo: texto(item?.catalogo_parte_cas),
    lote: texto(item?.lote),
    fechaIngreso: item?.fecha_ingreso ? String(item.fecha_ingreso).slice(0, 10) : "",
    tamano: texto(item?.tamano_capacidad),
    contenedor: texto(item?.contenedor),
    piezas: texto(item?.piezas),
    cantidadPieza: texto(item?.cantidad_por_pieza),
    localizacion: texto(item?.localizacion),
    stockMinimo: texto(item?.stock_minimo),
    observaciones: texto(item?.observaciones),
  });
  const [submitting, setSubmitting] = useState(false);
  const editing = !!item?.id;
  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const piezas = Number(form.piezas);
  const porPieza = Number(form.cantidadPieza);
  const total = form.piezas && form.cantidadPieza && Number.isFinite(piezas) && Number.isFinite(porPieza) ? Math.round(piezas * porPieza * 1e6) / 1e6 : null;
  const contenedores = form.contenedor && !CONTENEDORES_CONSUMIBLE.includes(form.contenedor) ? [...CONTENEDORES_CONSUMIBLE, form.contenedor] : CONTENEDORES_CONSUMIBLE;
  const v = useValidacion({
    titulo: editing ? "No se pudo guardar el consumible" : "No se pudo crear el consumible",
    reglas: () => {
      const out = [];
      if (!form.producto.trim()) out.push({ campo: "c-producto", mensaje: msg.indica("el nombre del producto") });
      for (const [campo, valor, etiqueta] of [["c-piezas", form.piezas, "Piezas"], ["c-cantidad", form.cantidadPieza, "Cantidad por pieza"], ["c-minimo", form.stockMinimo, "Stock mínimo"]] as const) {
        if (valor.trim() && (Number.isNaN(Number(valor)) || Number(valor) < 0)) out.push({ campo, mensaje: `«${etiqueta}» debe ser un número mayor o igual a cero` });
      }
      return out;
    },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      id_interno: form.idInterno.trim() || null,
      producto: form.producto.trim(),
      marca: form.marca.trim() || null,
      proveedor: form.proveedor.trim() || null,
      catalogo_parte_cas: form.catalogo.trim() || null,
      lote: form.lote.trim() || null,
      fecha_ingreso: form.fechaIngreso || null,
      tamano_capacidad: form.tamano.trim() || null,
      contenedor: form.contenedor.trim() || null,
      piezas: form.piezas.trim() || null,
      cantidad_por_pieza: form.cantidadPieza.trim() || null,
      localizacion: form.localizacion.trim() || null,
      stock_minimo: form.stockMinimo.trim() || null,
      observaciones: form.observaciones.trim() || null,
    };
    if (!v.validar()) return;
    if (!can("inventario", editing ? "E" : "C", { objeto: "catalogo_inventario" })) {
      v.avisar({ que: "No tienes permiso para guardar consumibles.", hacer: "Pide a la administración que revise tus roles y permisos." });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/consumables/${item!.id}`, token, payload);
        toast.success("Consumible actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/consumables`, token, payload);
        toast.success("Consumible creado");
      }
      invalidate("consumibles", "dashboard", "movimientos");
      onClose();
    } catch (err) {
      v.errorServidor(err);
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
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="consumible-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear consumible"}
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
      <form id="consumible-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Producto" htmlFor="c-producto" required>
          <Input id="c-producto" maxLength={150} value={form.producto} onChange={set("producto")} autoFocus={!editing} />
        </Field>
        <FormGrid>
          <Field label="ID interno" htmlFor="c-id-interno">
            <Input id="c-id-interno" maxLength={100} value={form.idInterno} onChange={set("idInterno")} />
          </Field>
          <Field label="Marca" htmlFor="c-marca">
            <Input id="c-marca" maxLength={100} value={form.marca} onChange={set("marca")} />
          </Field>
          <Field label="Proveedor" htmlFor="c-proveedor">
            <Input id="c-proveedor" maxLength={150} value={form.proveedor} onChange={set("proveedor")} />
          </Field>
          <Field label="Número de catálogo / parte" htmlFor="c-catalogo">
            <Input id="c-catalogo" maxLength={150} value={form.catalogo} onChange={set("catalogo")} mono />
          </Field>
          <Field label="Lote" htmlFor="c-lote">
            <Input id="c-lote" maxLength={100} value={form.lote} onChange={set("lote")} />
          </Field>
          <Field label="Fecha de ingreso" htmlFor="c-fecha" hint="Opcional; déjala vacía si no se conoce.">
            <DateInput id="c-fecha" value={form.fechaIngreso} onChange={(value) => setForm((prev) => ({ ...prev, fechaIngreso: value }))} />
          </Field>
          <Field label="Tamaño / capacidad" htmlFor="c-tamano" hint="Texto libre: «2 mL», «47mm, 0.2um», «Grande».">
            <Input id="c-tamano" maxLength={100} value={form.tamano} onChange={set("tamano")} />
          </Field>
          <Field label="Contenedor" htmlFor="c-contenedor">
            <Select id="c-contenedor" value={form.contenedor} onChange={set("contenedor")}>
              <option value="">Seleccionar</option>
              {contenedores.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Piezas" htmlFor="c-piezas" hint={editing ? "La existencia cambia con movimientos: usa Registrar movimiento." : "Acepta decimales (por ejemplo, 2.5 cajas)."}>
            <Input id="c-piezas" type="number" min="0" step="any" inputMode="decimal" value={form.piezas} onChange={set("piezas")} disabled={editing} />
          </Field>
          <Field label="Cantidad por pieza" htmlFor="c-cantidad">
            <Input id="c-cantidad" type="number" min="0" step="any" inputMode="decimal" value={form.cantidadPieza} onChange={set("cantidadPieza")} />
          </Field>
          <Field label="Localización" htmlFor="c-localizacion">
            <Input id="c-localizacion" maxLength={150} value={form.localizacion} onChange={set("localizacion")} />
          </Field>
          <Field label="Stock mínimo" htmlFor="c-minimo" hint="Opcional. Al llegar a esta cantidad de piezas aparece el aviso de stock bajo (sin mínimo, con 5 o menos).">
            <Input id="c-minimo" type="number" min="0" step="any" inputMode="decimal" value={form.stockMinimo} onChange={set("stockMinimo")} />
          </Field>
        </FormGrid>
        <p className="text-[13.5px] text-ink-2">
          Total: <b className="tnum text-ink">{total !== null ? `${total.toLocaleString("es-MX")} unidades` : "—"}</b> (piezas × cantidad por pieza)
        </p>
        <Field label="Observaciones" htmlFor="c-observaciones">
          <Textarea id="c-observaciones" rows={3} maxLength={1000} value={form.observaciones} onChange={set("observaciones")} />
        </Field>
      </form>
      </ValidacionAmbito>
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
  // Nombre del archivo elegido (en estado: leer el ref durante el render no se actualiza ni es valido en React 19).
  const [nombreArchivo, setNombreArchivo] = useState("");

  const handleFile = async () => {
    const file = fileRef.current?.files?.[0];
    setNombreArchivo(file?.name || "");
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
              <span className="text-[13.5px] font-medium text-ink">{nombreArchivo || "Elegir archivo CSV o Excel"}</span>
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

        {message ? <p className={message.error ? "text-[13px] text-danger" : "text-[13px] text-success-text"}>{message.text}</p> : null}

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
