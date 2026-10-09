"use client";

import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { CheckCircle, CloudArrowUp, WarningCircle, X } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Field, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { CampoValidado, useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, ApiError, sendFormAuthProgress } from "@/lib/client/api";
import { msg, type Problema } from "@/lib/client/mensajes";
import { abrirPdfBytes, textoDePdf } from "@/lib/client/pdf";
import { invalidate } from "@/lib/client/store";
import { extensionDe, fmtBytes } from "@/lib/shared/adjuntos";
import { EXTENSIONES_BIBLIOTECA } from "@/lib/shared/biblioteca";
import { CamposDocumento, datosVacios, reglasDatos, type DatosForm } from "./CamposDocumento";
import { IconoTipo, revisarArchivo, tituloDesdeArchivo, type Categoria, type RolOpcion } from "./comun";

/*
 * Subir uno o varios archivos (uno por documento): arrastrar y soltar o elegir,
 * titulo prellenado con el nombre del archivo, datos comunes (categoria,
 * etiquetas, descripcion, visibilidad) y barra de progreso por archivo. Antes
 * de subir se revisa formato, tamano y contenido en el navegador; el servidor
 * hace la validacion definitiva. De un PDF se extrae el texto para buscar.
 */

interface Entrada {
  key: number;
  file: File;
  titulo: string;
  clave: string;
  problema: string | null;
  revisado: boolean;
  progreso: number;
  estado: "pendiente" | "subiendo" | "listo" | "error";
  error: string | null;
}

const ACCEPT = EXTENSIONES_BIBLIOTECA.map((e) => `.${e}`).join(",");
const idTitulo = (i: number) => (i === 0 ? "bib-titulo" : `bib-titulo-${i}`);
const idClave = (i: number) => (i === 0 ? "bib-clave" : `bib-clave-${i}`);

let siguiente = 1;

export function SubirSheet({ open, onClose, categorias, roles, maxMb, categoriaInicial }: { open: boolean; onClose: () => void; categorias: Categoria[]; roles: RolOpcion[] | null; maxMb: number; categoriaInicial?: string }) {
  const { token } = useSession();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [datos, setDatos] = useState<DatosForm>(() => datosVacios(categoriaInicial || ""));
  const [enviando, setEnviando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const una = entradas.length <= 1;

  const v = useValidacion({
    titulo: entradas.length > 1 ? "No se pudieron subir los documentos" : "No se pudo subir el documento",
    reglas: (): Problema[] => {
      const out: Problema[] = [];
      if (!entradas.length) out.push({ campo: "subida-zona", mensaje: msg.elige("el archivo"), grupo: "Archivo" });
      entradas.forEach((e, i) => {
        if (e.estado === "listo") return;
        if (e.problema) out.push({ campo: `subida-archivo-${i}`, mensaje: e.problema, grupo: e.file.name });
        if (!e.titulo.trim()) out.push({ campo: idTitulo(i), mensaje: msg.indica("el título"), grupo: entradas.length > 1 ? e.file.name : "Documento" });
      });
      return [...out, ...reglasDatos(datos, "bib")];
    },
  });

  const agregar = (lista: FileList | File[] | null) => {
    if (!lista) return;
    const nuevas: Entrada[] = Array.from(lista).map((file) => ({ key: siguiente++, file, titulo: tituloDesdeArchivo(file.name), clave: "", problema: null, revisado: false, progreso: 0, estado: "pendiente", error: null }));
    setEntradas((prev) => [...prev, ...nuevas]);
    for (const e of nuevas) {
      void revisarArchivo(e.file, maxMb).then((problema) => setEntradas((prev) => prev.map((x) => (x.key === e.key ? { ...x, problema, revisado: true } : x))));
    }
  };
  const quitar = (key: number) => setEntradas((prev) => prev.filter((e) => e.key !== key));
  const cambiar = (key: number, cambios: Partial<Entrada>) => setEntradas((prev) => prev.map((e) => (e.key === key ? { ...e, ...cambios } : e)));

  const cerrar = () => {
    if (enviando) return;
    setEntradas([]);
    setDatos(datosVacios(categoriaInicial || ""));
    onClose();
  };

  const subirUna = async (e: Entrada): Promise<boolean> => {
    const form = new FormData();
    form.append("archivo", e.file);
    form.append("titulo", e.titulo.trim());
    if (e.clave.trim()) form.append("clave", e.clave.trim());
    if (datos.categoria_id) form.append("categoria_id", datos.categoria_id);
    if (datos.etiquetas.trim()) form.append("etiquetas", datos.etiquetas);
    if (datos.descripcion.trim()) form.append("descripcion", datos.descripcion.trim());
    if (datos.fecha_documento) form.append("fecha_documento", datos.fecha_documento);
    form.append("visibilidad", datos.visibilidad);
    if (datos.visibilidad === "roles") form.append("roles", datos.roles.join(","));
    // Texto del PDF para buscar dentro (si no se puede leer, se sube igual).
    if (extensionDe(e.file.name) === "pdf") {
      try {
        const pdf = await abrirPdfBytes(await e.file.arrayBuffer());
        form.append("texto", await textoDePdf(pdf));
        void pdf.loadingTask.destroy();
      } catch {
        /* PDF sin texto legible */
      }
    }
    cambiar(e.key, { estado: "subiendo", progreso: 0, error: null });
    try {
      await sendFormAuthProgress(`${API_BASE_URL}/biblioteca`, token, form, (f) => cambiar(e.key, { progreso: f }));
      cambiar(e.key, { estado: "listo", progreso: 1 });
      return true;
    } catch (err) {
      cambiar(e.key, { estado: "error", error: err instanceof Error ? err.message : "No se pudo subir" });
      // El servidor indica el campo: se marca y se explica con el mismo pop-up.
      const campo = err instanceof ApiError ? String(err.data?.campo || "") : "";
      const idx = entradas.findIndex((x) => x.key === e.key);
      const destino = campo === "titulo" ? idTitulo(idx) : campo === "categoria" ? "bib-categoria" : campo === "roles" ? "bib-roles" : campo === "archivo" || (err instanceof ApiError && ["formato_no_permitido", "contenido_no_valido", "archivo_vacio", "archivo_grande"].includes(err.codigo)) ? `subida-archivo-${idx}` : "";
      if (destino) v.avisar({ titulo: "No se pudo subir el documento", que: `${e.file.name}: ${err instanceof Error ? err.message : ""}`, hacer: "Corrige el dato marcado y vuelve a intentarlo.", problemas: [{ campo: destino, mensaje: err instanceof Error ? err.message : "Revisa este dato", grupo: e.file.name }] });
      else v.errorServidor(err);
      return false;
    }
  };

  const subir = async () => {
    if (!v.validar()) return;
    setEnviando(true);
    let ok = 0;
    let fallo = false;
    for (const e of entradas) {
      if (e.estado === "listo") continue;
      if (await subirUna(e)) ok += 1;
      else {
        fallo = true;
        break;
      }
    }
    setEnviando(false);
    if (ok) invalidate("biblioteca");
    if (!fallo) {
      toast.success(ok === 1 ? "Documento subido a la biblioteca" : `${ok} documentos subidos a la biblioteca`);
      setEntradas([]);
      setDatos(datosVacios(categoriaInicial || ""));
      onClose();
    }
  };

  const soltar = (event: DragEvent) => {
    event.preventDefault();
    setArrastrando(false);
    agregar(event.dataTransfer.files);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && cerrar()}
      title="Subir documento"
      description={`Uno o varios archivos (uno por documento). PDF, imagen, Word, Excel, PowerPoint, CSV, texto, Markdown o ZIP, hasta ${maxMb} MB.`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button icon={<CloudArrowUp size={16} />} loading={enviando} onClick={subir}>
            {entradas.length > 1 ? `Subir ${entradas.filter((e) => e.estado !== "listo").length} documentos` : "Subir documento"}
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
        <div className="flex flex-col gap-5">
          <CampoValidado id="subida-zona">
            <div
              data-testid="subida-zona"
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltar}
              className={cn("flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-4 py-7 text-center transition-colors", arrastrando ? "border-brand bg-brand-faint" : "border-line-strong bg-surface-2/60")}
            >
              <CloudArrowUp size={30} weight="duotone" className="text-brand" />
              <p className="text-[14px] font-medium text-ink">Arrastra aquí los archivos</p>
              <p className="text-[12.5px] text-ink-3">o</p>
              <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={enviando}>
                Elegir archivos
              </Button>
              <input
                ref={input}
                id="bib-archivos"
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  agregar(e.target.files);
                  e.target.value = "";
                }}
                aria-label="Elegir archivos para subir"
              />
            </div>
          </CampoValidado>

          {entradas.length ? (
            <ul className="flex flex-col gap-3" aria-label="Archivos por subir">
              {entradas.map((e, i) => (
                <li key={e.key}>
                  <CampoValidado id={`subida-archivo-${i}`} className="on-panel flex flex-col gap-3 rounded-[12px] bg-surface-2 p-3.5 ring-1 ring-line">
                    <div className="flex items-start gap-3">
                      <IconoTipo extension={extensionDe(e.file.name)} size={20} className="h-10 w-10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink" title={e.file.name}>
                          {e.file.name}
                        </p>
                        <p className="text-[12px] text-ink-3">
                          {fmtBytes(e.file.size)}
                          {e.estado === "listo" ? " · Subido" : e.estado === "error" ? ` · ${e.error}` : !e.revisado ? " · Revisando…" : e.problema ? "" : " · Listo para subir"}
                        </p>
                        {e.problema && e.estado !== "listo" ? (
                          <p className="mt-1 flex items-center gap-1 text-[12.5px] text-danger">
                            <WarningCircle size={14} weight="bold" /> {e.problema}
                          </p>
                        ) : null}
                      </div>
                      {e.estado === "listo" ? (
                        <CheckCircle size={20} weight="fill" className="shrink-0 text-success" aria-label="Subido" />
                      ) : (
                        <IconButton label={`Quitar ${e.file.name}`} size="sm" onClick={() => quitar(e.key)} disabled={enviando}>
                          <X size={14} weight="bold" />
                        </IconButton>
                      )}
                    </div>
                    {e.estado !== "listo" ? (
                      <div className={cn("grid gap-3", una ? "" : "sm:grid-cols-[minmax(0,1fr)_200px]")}>
                        <Field label="Título" htmlFor={idTitulo(i)} required>
                          <Input id={idTitulo(i)} maxLength={220} value={e.titulo} onChange={(ev) => cambiar(e.key, { titulo: ev.target.value })} disabled={enviando} />
                        </Field>
                        {!una ? (
                          <Field label="Clave" htmlFor={idClave(i)}>
                            <Input id={idClave(i)} mono maxLength={60} value={e.clave} onChange={(ev) => cambiar(e.key, { clave: ev.target.value })} disabled={enviando} />
                          </Field>
                        ) : null}
                      </div>
                    ) : null}
                    {e.estado === "subiendo" || e.estado === "listo" ? (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" data-testid="subida-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(e.progreso * 100)} aria-label={`Progreso de ${e.file.name}`}>
                        <div className={cn("h-full rounded-full transition-[width] duration-200", e.estado === "listo" ? "bg-success" : "bg-brand")} style={{ width: `${Math.round(e.progreso * 100)}%` }} />
                      </div>
                    ) : null}
                  </CampoValidado>
                </li>
              ))}
            </ul>
          ) : null}

          {una ? (
            <CamposDocumentoUno datos={datos} setDatos={setDatos} clave={entradas[0]?.clave || ""} onClave={(c) => entradas[0] && cambiar(entradas[0].key, { clave: c })} categorias={categorias} roles={roles} />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-medium text-ink-2">Datos comunes para todos los archivos</p>
              <CamposDocumento p="bib" datos={datos} onChange={(c) => setDatos((d) => ({ ...d, ...c }))} categorias={categorias} roles={roles} conClave={false} />
            </div>
          )}
        </div>
      </ValidacionAmbito>
    </Sheet>
  );
}

/* Con un solo archivo la clave va junto con los demas datos (id bib-clave). */
function CamposDocumentoUno({ datos, setDatos, clave, onClave, categorias, roles }: { datos: DatosForm; setDatos: (fn: (d: DatosForm) => DatosForm) => void; clave: string; onClave: (c: string) => void; categorias: Categoria[]; roles: RolOpcion[] | null }) {
  return (
    <CamposDocumento
      p="bib"
      datos={{ ...datos, clave }}
      onChange={(c) => {
        if (c.clave !== undefined) onClave(c.clave);
        const { clave: _c, ...resto } = c;
        void _c;
        if (Object.keys(resto).length) setDatos((d) => ({ ...d, ...resto }));
      }}
      categorias={categorias}
      roles={roles}
    />
  );
}
