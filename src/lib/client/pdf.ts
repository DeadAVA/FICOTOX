/*
 * pdf.js en el navegador para la biblioteca (visor, miniaturas y texto para
 * buscar). Todo se sirve desde el propio servidor (public/vendor/pdfjs:
 * worker, cmaps, fuentes estandar y wasm; ver scripts/vendor-pdfjs.mjs).
 * Se importa solo en el cliente y bajo demanda.
 */
import { API_BASE_URL } from "./api";
import { TEXTO_MAX } from "../shared/biblioteca";

type Pdfjs = typeof import("pdfjs-dist");
export type PdfDocumento = import("pdfjs-dist").PDFDocumentProxy;

let cargando: Promise<Pdfjs> | null = null;

export function cargarPdfjs(): Promise<Pdfjs> {
  if (!cargando) {
    cargando = import("pdfjs-dist").then((m) => {
      m.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      return m;
    });
  }
  return cargando;
}

const PDF_OPCIONES = {
  cMapUrl: "/vendor/pdfjs/cmaps/",
  cMapPacked: true,
  standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
  wasmUrl: "/vendor/pdfjs/wasm/",
  isEvalSupported: false,
} as const;

/* URL del archivo de una version (modo ver: en linea, sin bitacora, con Range). */
export const urlArchivoVersion = (versionId: number | string, modo: "ver" | "descargar" = "ver") => `${API_BASE_URL}/biblioteca/versiones/${versionId}/archivo?modo=${modo}`;

/*
 * Abre un PDF de la biblioteca con carga progresiva: pdf.js pide rangos
 * (Range) y solo baja las paginas que se ven.
 */
export async function abrirPdfVersion(versionId: number | string, token: string): Promise<PdfDocumento> {
  return abrirPdfUrl(urlArchivoVersion(versionId), token);
}

/* Abre un PDF protegido por URL (mismo visor para la biblioteca y los informes). */
export async function abrirPdfUrl(url: string, token: string): Promise<PdfDocumento> {
  const pdfjs = await cargarPdfjs();
  const tarea = pdfjs.getDocument({ url, httpHeaders: { Authorization: `Bearer ${token}` }, disableAutoFetch: true, rangeChunkSize: 256 * 1024, ...PDF_OPCIONES });
  return tarea.promise;
}

/* URL del PDF final de un informe para el visor (en linea, sin bitacora). */
export const urlPdfInforme = (informeId: number | string) => `${API_BASE_URL}/informes/${informeId}/pdf?modo=ver`;

/* PDF desde bytes (archivo elegido para subir). */
export async function abrirPdfBytes(datos: ArrayBuffer): Promise<PdfDocumento> {
  const pdfjs = await cargarPdfjs();
  return pdfjs.getDocument({ data: new Uint8Array(datos.slice(0)), ...PDF_OPCIONES }).promise;
}

/* Miniatura de la primera pagina como data URL (PNG), del ancho pedido en px CSS. */
export async function miniaturaPrimeraPagina(pdf: PdfDocumento, ancho = 220): Promise<string> {
  const pagina = await pdf.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const escala = (ancho * Math.min(2, window.devicePixelRatio || 1)) / base.width;
  const vista = pagina.getViewport({ scale: escala });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(vista.width);
  canvas.height = Math.ceil(vista.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin lienzo");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvas, canvasContext: ctx, viewport: vista }).promise;
  return canvas.toDataURL("image/png");
}

/* Texto de todas las paginas (para buscar dentro del PDF), acotado a TEXTO_MAX caracteres. */
export async function textoDePdf(pdf: PdfDocumento, max = TEXTO_MAX): Promise<string> {
  let texto = "";
  for (let n = 1; n <= pdf.numPages && texto.length < max; n += 1) {
    const contenido = await (await pdf.getPage(n)).getTextContent();
    texto += contenido.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return texto.replace(/[ \t]+/g, " ").slice(0, max);
}
