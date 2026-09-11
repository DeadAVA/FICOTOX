"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { API_BASE_URL, sendFormAuth } from "@/lib/client/api";
import { toDateOnly } from "@/lib/client/format";
import { formatActiveUserSignature } from "@/lib/client/session";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { DOCUMENT_AREAS, DOCUMENT_TYPES, parseDocumentKey } from "@/lib/shared/sgc";

/*
 * Alta y edicion de un documento controlado (borrador o en revision).
 * La clave FX-<area><tipo>-<siglas> fija tipo y area; el archivo se
 * adjunta por multipart.
 */
export function DocumentoSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const editing = !!item?.id;
  const elaboro = (item?.elaboro || {}) as ApiRecord;
  const [form, setForm] = useState({
    clave: String(item?.clave || ""),
    titulo: String(item?.titulo || ""),
    tipo: String(item?.tipo || ""),
    area: String(item?.area || ""),
    esExterno: !!item?.es_externo,
    origenExterno: String(item?.origen_externo || ""),
    descripcion: String(item?.descripcion || ""),
    cambios: String(item?.cambios || ""),
    fechaEmision: toDateOnly(item?.fecha_emision),
    fechaVigencia: toDateOnly(item?.fecha_vigencia),
    fechaProximaRevision: toDateOnly(item?.fecha_proxima_revision),
    elaboroNombre: String(elaboro.nombre || formatActiveUserSignature()),
    elaboroCargo: String(elaboro.cargo || ""),
    distribucion: String(item?.distribucion || ""),
  });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const onClave = (event: ChangeEvent<HTMLInputElement>) => {
    const clave = event.target.value.toUpperCase();
    const parsed = parseDocumentKey(clave);
    setForm((prev) => ({ ...prev, clave, tipo: parsed?.tipo || prev.tipo, area: parsed?.area || prev.area, esExterno: parsed?.tipo === "E" ? true : prev.esExterno }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.clave.trim() || !form.titulo.trim()) return setError("Clave y título son obligatorios");
    if (!form.tipo || !form.area) return setError("Tipo y área son obligatorios (se derivan de la clave)");
    if (!can("documentos", editing ? "update" : "create")) return setError("No tienes permiso para esta acción");
    setSubmitting(true);
    setError(null);
    const data = new FormData();
    data.set("clave", form.clave.trim());
    data.set("titulo", form.titulo.trim());
    data.set("tipo", form.tipo);
    data.set("area", form.area);
    data.set("es_externo", form.esExterno ? "1" : "0");
    data.set("origen_externo", form.origenExterno.trim());
    data.set("descripcion", form.descripcion.trim());
    data.set("cambios", form.cambios.trim());
    data.set("fecha_emision", form.fechaEmision);
    data.set("fecha_vigencia", form.fechaVigencia);
    data.set("fecha_proxima_revision", form.fechaProximaRevision);
    data.set("elaboro", JSON.stringify({ nombre: form.elaboroNombre.trim(), cargo: form.elaboroCargo.trim(), fecha: form.fechaEmision || null }));
    data.set("distribucion", form.distribucion.trim());
    if (file) data.set("archivo", file);
    try {
      if (editing) {
        await sendFormAuth(`${API_BASE_URL}/documentos-sgc/${item!.id}`, token, data, "PUT");
        toast.success("Documento actualizado");
      } else {
        await sendFormAuth(`${API_BASE_URL}/documentos-sgc`, token, data);
        toast.success("Documento registrado en borrador");
      }
      invalidate("documentos");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el documento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? `Editar ${item!.clave} rev. ${item!.revision}` : "Nuevo documento controlado"}
      description="Identificación única, revisión, responsables y archivo (FX-GCP-CD)."
      size="lg"
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="documento-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Registrar borrador"}
          </Button>
        </>
      }
    >
      <form id="documento-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormGrid cols={3}>
          <Field label="Clave" htmlFor="d-clave" required hint="FX-<área><tipo>-<siglas>, ej. FX-GCP-CD">
            <Input id="d-clave" maxLength={40} value={form.clave} onChange={onClave} mono placeholder="FX-TCF-GMR" disabled={editing} />
          </Field>
          <Field label="Tipo" htmlFor="d-tipo" required>
            <Select id="d-tipo" value={form.tipo} onChange={set("tipo")}>
              <option value="">Seleccionar</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} · {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Área" htmlFor="d-area" required>
            <Select id="d-area" value={form.area} onChange={set("area")}>
              <option value="">Seleccionar</option>
              {DOCUMENT_AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.value} · {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Título" htmlFor="d-titulo" required>
          <Input id="d-titulo" maxLength={220} value={form.titulo} onChange={set("titulo")} autoFocus={!editing} />
        </Field>
        <Field label="Descripción" htmlFor="d-desc">
          <Textarea id="d-desc" rows={2} value={form.descripcion} onChange={set("descripcion")} />
        </Field>
        <FormGrid cols={3}>
          <Field label="Fecha de emisión" htmlFor="d-emision">
            <Input id="d-emision" type="date" value={form.fechaEmision} onChange={set("fechaEmision")} />
          </Field>
          <Field label="Vigente desde" htmlFor="d-vig" hint="Se fija al aprobar si se deja vacío.">
            <Input id="d-vig" type="date" value={form.fechaVigencia} onChange={set("fechaVigencia")} />
          </Field>
          <Field label="Próxima revisión" htmlFor="d-prox" hint="Por defecto, 3 años después de la emisión.">
            <Input id="d-prox" type="date" value={form.fechaProximaRevision} onChange={set("fechaProximaRevision")} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Elaboró" htmlFor="d-elab">
            <Input id="d-elab" maxLength={180} value={form.elaboroNombre} onChange={set("elaboroNombre")} />
          </Field>
          <Field label="Cargo" htmlFor="d-elab-cargo">
            <Input id="d-elab-cargo" maxLength={120} value={form.elaboroCargo} onChange={set("elaboroCargo")} />
          </Field>
        </FormGrid>
        <Field label={editing ? "Cambios de esta revisión" : "Cambios (si es una nueva revisión)"} htmlFor="d-cambios" hint="Control de cambios: qué se modificó respecto a la revisión anterior.">
          <Textarea id="d-cambios" rows={2} value={form.cambios} onChange={set("cambios")} />
        </Field>
        <Field label="Distribución" htmlFor="d-dist" hint="Puntos de uso donde debe estar disponible.">
          <Input id="d-dist" maxLength={240} value={form.distribucion} onChange={set("distribucion")} />
        </Field>
        <div className="rounded-card border border-line bg-surface-2/50 p-4">
          <Checkbox checked={form.esExterno} onChange={(event) => setForm((prev) => ({ ...prev, esExterno: event.target.checked }))} label="Documento externo" description="Norma, manual de fabricante u otro documento que no emite el laboratorio." />
          {form.esExterno ? <Input className="mt-3" maxLength={180} placeholder="Origen (organismo, fabricante)" value={form.origenExterno} onChange={set("origenExterno")} aria-label="Origen del documento externo" /> : null}
        </div>
        <Field label={editing && item?.archivo_original ? `Archivo (actual: ${item.archivo_original})` : "Archivo"} htmlFor="d-archivo" hint="PDF, Word, Excel, PowerPoint o texto. Obligatorio para enviar a revisión (salvo externos).">
          <input id="d-archivo" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full text-[13px] text-ink-2 file:mr-3 file:rounded-control file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-ink" />
        </Field>
      </form>
    </Sheet>
  );
}
