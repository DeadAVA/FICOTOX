"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { File, FileArchive, FileCsv, FileDoc, FileImage, FileMd, FilePdf, FilePpt, FileText, FileXls } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { abrirPdfVersion, miniaturaPrimeraPagina, urlArchivoVersion } from "@/lib/client/pdf";
import type { ApiRecord } from "@/lib/client/types";
import { extensionDe, problemaDeContenido } from "@/lib/shared/adjuntos";
import { EXTENSIONES_BIBLIOTECA } from "@/lib/shared/biblioteca";

/*
 * Piezas comunes de la biblioteca: tipos, icono por tipo de archivo,
 * miniatura de la primera pagina de un PDF (pdf.js en el navegador, perezosa y
 * en cache por huella), descarga protegida y revision local de un archivo
 * antes de subirlo (la validacion definitiva la hace el servidor).
 */

export interface Categoria {
  id: number;
  nombre: string;
  orden: number;
  activa: number;
}

export interface DocBiblioteca extends ApiRecord {
  id: number;
  titulo: string;
  descripcion: string | null;
  categoria_id: number | null;
  categoria: string | null;
  clave: string | null;
  etiquetas: string[];
  fecha_documento: string | null;
  visibilidad: "todos" | "roles";
  version_actual_id: number | null;
  version: number | null;
  extension: string | null;
  tamano_bytes: number | null;
  sha256: string | null;
  subido_en: string | null;
  nombre_original: string | null;
  archivado_en: string | null;
  creado_por_nombre: string | null;
  puede: { editar: boolean; archivar: boolean; subir_version: boolean };
}

export interface RolOpcion {
  id: number;
  nombre: string;
}

const ICONOS: Record<string, typeof File> = {
  pdf: FilePdf,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  webp: FileImage,
  tif: FileImage,
  tiff: FileImage,
  docx: FileDoc,
  xlsx: FileXls,
  xls: FileXls,
  csv: FileCsv,
  pptx: FilePpt,
  txt: FileText,
  md: FileMd,
  zip: FileArchive,
};
const TONO: Record<string, string> = {
  pdf: "text-danger-text bg-danger-soft",
  docx: "text-brand-strong bg-brand-soft",
  xlsx: "text-success-text bg-success-soft",
  xls: "text-success-text bg-success-soft",
  csv: "text-success-text bg-success-soft",
  pptx: "text-warning-text bg-warning-soft",
};

export function IconoTipo({ extension, size = 22, className }: { extension: string | null | undefined; size?: number; className?: string }) {
  const ext = String(extension || "").toLowerCase();
  const Icono = ICONOS[ext] || File;
  return (
    <span className={cn("inline-flex items-center justify-center rounded-[10px]", TONO[ext] || "bg-surface-3 text-ink-2", className)} aria-hidden="true">
      <Icono size={size} weight="duotone" />
    </span>
  );
}

export const etiquetaTipo = (extension: string | null | undefined) => String(extension || "—").toUpperCase();

/* ---------- Miniatura de PDF ---------- */

const CLAVE_MINI = "ficotox.biblioteca.mini.";
const leerMini = (sha: string): string | null => {
  try {
    return window.localStorage.getItem(CLAVE_MINI + sha);
  } catch {
    return null;
  }
};
const guardarMini = (sha: string, url: string) => {
  try {
    window.localStorage.setItem(CLAVE_MINI + sha, url);
  } catch {
    /* sin espacio o sin almacenamiento: se vuelve a generar la próxima vez */
  }
};

/*
 * Primera pagina de un PDF: se genera solo cuando la tarjeta entra en pantalla
 * (IntersectionObserver), con carga progresiva (Range), y se guarda por huella
 * SHA-256 para no volver a generarla. Otros tipos muestran su icono.
 */
export function MiniaturaDocumento({ doc, token, className }: { doc: DocBiblioteca; token: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const esPdf = String(doc.extension || "").toLowerCase() === "pdf" && !!doc.version_actual_id && !!doc.sha256;
  const [url, setUrl] = useState<string | null>(() => (esPdf && typeof window !== "undefined" ? leerMini(String(doc.sha256)) : null));
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (!esPdf || url || fallo || !token) return;
    const nodo = ref.current;
    if (!nodo) return;
    let cancelado = false;
    const generar = async () => {
      try {
        const pdf = await abrirPdfVersion(Number(doc.version_actual_id), token);
        const data = await miniaturaPrimeraPagina(pdf, 240);
        void pdf.loadingTask.destroy();
        if (cancelado) return;
        guardarMini(String(doc.sha256), data);
        setUrl(data);
      } catch {
        if (!cancelado) setFallo(true);
      }
    };
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          obs.disconnect();
          void generar();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(nodo);
    return () => {
      cancelado = true;
      obs.disconnect();
    };
  }, [esPdf, url, fallo, token, doc.version_actual_id, doc.sha256]);

  return (
    <div ref={ref} className={cn("relative flex items-center justify-center overflow-hidden bg-surface-2", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <IconoTipo extension={doc.extension} size={34} className={cn("h-16 w-16", esPdf && !fallo && "animate-pulse")} />
      )}
    </div>
  );
}

/* ---------- Descarga protegida (queda en la bitacora) ---------- */

export async function descargarVersion(versionId: number, token: string, nombre: string): Promise<void> {
  try {
    const res = await fetch(urlArchivoVersion(versionId, "descargar"), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      let message = `No se pudo descargar (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) message = String(data.message);
      } catch {
        /* sin cuerpo JSON */
      }
      throw new Error(message);
    }
    const objectUrl = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = nombre || "documento";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    if (res.headers.get("x-integridad-archivo") === "alterado") toast.warning("El archivo no coincide con su huella SHA-256: se registró una alerta de integridad.");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "No se pudo descargar");
  }
}

/* ---------- Revision local antes de subir ---------- */

/* Problema del archivo (formato, tamano, contenido) o null; lee el archivo completo si es texto y el inicio si no. */
export async function revisarArchivo(file: globalThis.File, maxMb: number): Promise<string | null> {
  const ext = extensionDe(file.name);
  if (!(EXTENSIONES_BIBLIOTECA as readonly string[]).includes(ext)) return `Formato no permitido (.${ext || "sin extensión"}). Se aceptan: ${EXTENSIONES_BIBLIOTECA.join(", ")}`;
  if (file.size > maxMb * 1024 * 1024) return `El archivo pesa más de ${maxMb} MB`;
  const texto = ["csv", "txt", "md"].includes(ext);
  const bytes = new Uint8Array(await file.slice(0, texto ? file.size : 64 * 1024).arrayBuffer());
  return problemaDeContenido(ext, bytes);
}

/* Titulo sugerido a partir del nombre del archivo (sin extension, guiones a espacios). */
export function tituloDesdeArchivo(nombre: string): string {
  const sinExt = nombre.replace(/\.[^.]+$/, "");
  return sinExt.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
}

/* Roles para la visibilidad: solo si la persona puede leer el catalogo de roles (si no, null). */
export async function cargarRoles(token: string): Promise<RolOpcion[] | null> {
  try {
    const data = await getJsonAuth(`${API_BASE_URL}/admin/roles`, token);
    const items = (data.items || data.roles || []) as ApiRecord[];
    return items.filter((r) => r.activo === undefined || Number(r.activo) !== 0).map((r) => ({ id: Number(r.id), nombre: String(r.nombre) }));
  } catch {
    return null;
  }
}
