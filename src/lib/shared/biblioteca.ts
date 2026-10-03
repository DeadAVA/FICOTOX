/*
 * Biblioteca de documentos (reemplaza el flujo de control documental de
 * Documentos SGC por decision del laboratorio): catalogo compartido entre
 * servidor e interfaz. La validacion de contenido (firma de bytes, contenido
 * activo) es la misma de los adjuntos de la Fase 10 (shared/adjuntos.ts).
 */

export const EXTENSIONES_BIBLIOTECA = ["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff", "docx", "xlsx", "xls", "pptx", "csv", "txt", "md", "zip"] as const;
export type ExtensionBiblioteca = (typeof EXTENSIONES_BIBLIOTECA)[number];

/* Tipo MIME con que se sirve cada extension (nunca el que manda el navegador). */
export const MIME_BIBLIOTECA: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  zip: "application/zip",
};

/* Como se lee cada tipo en el visor. */
export type VistaBiblioteca = "pdf" | "imagen" | "docx" | "hoja" | "texto" | "markdown" | "ficha";
export function vistaDe(ext: string): VistaBiblioteca {
  switch (String(ext || "").toLowerCase()) {
    case "pdf":
      return "pdf";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return "imagen";
    case "docx":
      return "docx";
    case "xlsx":
    case "xls":
    case "csv":
      return "hoja";
    case "txt":
      return "texto";
    case "md":
      return "markdown";
    default:
      // pptx, zip, tif/tiff (los navegadores no muestran TIFF): ficha con "Descargar".
      return "ficha";
  }
}

/* Grupo de tipo de archivo para los filtros. */
export const TIPOS_ARCHIVO = [
  { value: "pdf", label: "PDF", extensiones: ["pdf"] },
  { value: "imagen", label: "Imagen", extensiones: ["png", "jpg", "jpeg", "webp", "tif", "tiff"] },
  { value: "word", label: "Word", extensiones: ["docx"] },
  { value: "hoja", label: "Hoja de cálculo", extensiones: ["xlsx", "xls", "csv"] },
  { value: "presentacion", label: "Presentación", extensiones: ["pptx"] },
  { value: "texto", label: "Texto", extensiones: ["txt", "md"] },
  { value: "zip", label: "Comprimido", extensiones: ["zip"] },
] as const;
export const tipoArchivoDe = (ext: string): string => TIPOS_ARCHIVO.find((t) => (t.extensiones as readonly string[]).includes(String(ext || "").toLowerCase()))?.value || "otro";

export const CATEGORIAS_SEMILLA = ["Manual de Calidad", "Procedimientos", "Instructivos", "Formatos", "Normas y regulación", "Artículos y referencias", "Otros"] as const;

export const BIBLIOTECA_MAX_MB_DEFAULT = 50;
export const MOTIVO_MIN_BIBLIOTECA = 5;
/* Texto extraido de un PDF que se guarda para buscar (caracteres). */
export const TEXTO_MAX = 400_000;

/* Etiquetas: separadas por coma, sin repetir, en minusculas para buscar. */
export function normalizarEtiquetas(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor.map(String) : String(valor || "").split(",");
  const out: string[] = [];
  for (const e of lista) {
    const t = e.trim().replace(/\s+/g, " ").slice(0, 40);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, 20);
}
