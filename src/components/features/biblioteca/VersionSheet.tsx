"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CloudArrowUp } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Field, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { CampoValidado, useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, ApiError, sendFormAuthProgress } from "@/lib/client/api";
import { msg, type Problema } from "@/lib/client/mensajes";
import { abrirPdfBytes, textoDePdf } from "@/lib/client/pdf";
import { invalidate } from "@/lib/client/store";
import { extensionDe, fmtBytes } from "@/lib/shared/adjuntos";
import { EXTENSIONES_BIBLIOTECA } from "@/lib/shared/biblioteca";
import { IconoTipo, revisarArchivo } from "./comun";

/*
 * Nueva version de un documento: la anterior se conserva (y se puede abrir en
 * el visor como "Version anterior"). Archivo + nota de la version.
 */
export function VersionSheet({ doc, onClose, maxMb }: { doc: { id: number; titulo: string; version: number | null } | null; onClose: () => void; maxMb: number }) {
  const { token } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [progreso, setProgreso] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const v = useValidacion({
    titulo: "No se pudo subir la versión",
    reglas: (): Problema[] => {
      if (!file) return [{ campo: "version-zona", mensaje: msg.elige("el archivo de la versión nueva") }];
      if (problema) return [{ campo: "version-zona", mensaje: problema }];
      return [];
    },
  });

  const elegir = async (f: File | null) => {
    setFile(f);
    setProblema(f ? await revisarArchivo(f, maxMb) : null);
  };
  const cerrar = () => {
    if (progreso !== null) return;
    setFile(null);
    setProblema(null);
    setNota("");
    onClose();
  };

  const subir = async () => {
    if (!doc || !v.validar() || !file) return;
    const form = new FormData();
    form.append("archivo", file);
    if (nota.trim()) form.append("nota_version", nota.trim());
    if (extensionDe(file.name) === "pdf") {
      try {
        const pdf = await abrirPdfBytes(await file.arrayBuffer());
        form.append("texto", await textoDePdf(pdf));
        void pdf.loadingTask.destroy();
      } catch {
        /* sin texto legible */
      }
    }
    setProgreso(0);
    try {
      const data = await sendFormAuthProgress(`${API_BASE_URL}/biblioteca/${doc.id}/versiones`, token, form, setProgreso);
      toast.success(String(data.message || "Versión subida"));
      invalidate("biblioteca");
      setProgreso(null);
      setFile(null);
      setNota("");
      onClose();
    } catch (err) {
      setProgreso(null);
      if (err instanceof ApiError && (err.data?.campo === "archivo" || ["formato_no_permitido", "contenido_no_valido", "archivo_vacio", "archivo_grande"].includes(err.codigo))) {
        v.avisar({ titulo: "No se pudo subir la versión", que: err.message, hacer: "Elige otro archivo.", problemas: [{ campo: "version-zona", mensaje: err.message }] });
      } else v.errorServidor(err);
    }
  };

  return (
    <Sheet
      open={!!doc}
      onOpenChange={(o) => !o && cerrar()}
      title="Subir nueva versión"
      description={doc ? `${doc.titulo} · ahora en la versión ${doc.version || 1}. La versión anterior se conserva y se puede abrir.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={cerrar} disabled={progreso !== null}>
            Cancelar
          </Button>
          <Button icon={<CloudArrowUp size={16} />} loading={progreso !== null} onClick={subir}>
            Subir versión {(doc?.version || 0) + 1}
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
        <div className="flex flex-col gap-5">
          <CampoValidado id="version-zona">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void elegir(e.dataTransfer.files[0] || null);
              }}
              className="flex flex-col items-center gap-2 rounded-[14px] border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-6 text-center"
            >
              {file ? (
                <div className="flex items-center gap-3 text-left">
                  <IconoTipo extension={extensionDe(file.name)} size={20} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{file.name}</p>
                    <p className={cn("text-[12px]", problema ? "text-danger" : "text-ink-3")}>{problema || fmtBytes(file.size)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-[13.5px] text-ink-2">Arrastra aquí el archivo o elígelo</p>
              )}
              <Button size="sm" variant="secondary" onClick={() => input.current?.click()} disabled={progreso !== null}>
                {file ? "Cambiar archivo" : "Elegir archivo"}
              </Button>
              <input ref={input} id="version-archivo" type="file" accept={EXTENSIONES_BIBLIOTECA.map((e) => `.${e}`).join(",")} className="sr-only" onChange={(e) => void elegir(e.target.files?.[0] || null)} aria-label="Elegir el archivo de la versión nueva" />
            </div>
          </CampoValidado>
          <Field label="Nota de la versión" htmlFor="version-nota" hint="Qué cambió (opcional).">
            <Textarea id="version-nota" rows={2} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
          </Field>
          {progreso !== null ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" data-testid="subida-progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso * 100)} aria-label="Progreso de la subida">
              <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.round(progreso * 100)}%` }} />
            </div>
          ) : null}
        </div>
      </ValidacionAmbito>
    </Sheet>
  );
}
