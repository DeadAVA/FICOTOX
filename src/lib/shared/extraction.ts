/*
 * Tipos de extraccion soportados. Cada uno corresponde a un formato
 * controlado distinto del SGC (clave FX-TCF-GME-<letra>) y lleva su
 * propia serie de folios. Se usa tanto en el servidor como en el cliente.
 */

export type ExtractionType = "E-A" | "E-D";

export interface ExtractionTypeMeta {
  tipo: ExtractionType;
  clave: string;
  short: string;
  label: string;
  toxina: string;
  descripcion: string;
}

export const EXTRACTION_TYPES: Record<ExtractionType, ExtractionTypeMeta> = {
  "E-A": {
    tipo: "E-A",
    clave: "FX-TCF-GME-A",
    short: "ASP",
    label: "ASP · Ácido domoico",
    toxina: "Ácido domoico (ASP)",
    descripcion: "Submuestra de 4 ± 0.1 g, metanol:agua 50:50 y limpieza opcional en cartucho SAX.",
  },
  "E-D": {
    tipo: "E-D",
    clave: "FX-TCF-GME-D",
    short: "DSP",
    label: "DSP · Toxinas lipofílicas",
    toxina: "Toxinas lipofílicas (DSP / ácido okadaico)",
    descripcion: "Submuestra de 2 ± 0.05 g, doble extracción con metanol 100 %, aforo a 20 mL e hidrólisis alcalina.",
  },
};

export const EXTRACTION_TYPE_LIST: ExtractionTypeMeta[] = Object.values(EXTRACTION_TYPES);

/*
 * Formatos previstos en el flujo del laboratorio que aun no entrega el SGC.
 * Se muestran en gris (filtros y selector) para que se sepa que existen en el
 * plan; cuando llegue el formato se agregan como protocolo (ver docs).
 */
export const PLANNED_EXTRACTION_TYPES: Array<{ tipo: string; short: string; label: string; toxina: string }> = [
  { tipo: "E-P", short: "PSP", label: "PSP · Toxinas paralizantes", toxina: "Toxinas paralizantes (PSP / saxitoxina)" },
  { tipo: "E-G", short: "Pigmentos", label: "Pigmentos", toxina: "Pigmentos fotosintéticos" },
  { tipo: "E-S", short: "Sedimentos", label: "Sedimentos", toxina: "Toxinas en sedimentos" },
];

/* Tipo historico: los registros anteriores a DSP no traian tipo. */
const DEFAULT_EXTRACTION_TYPE: ExtractionType = "E-A";

/* Acepta "E-A", "e-a", "EA", "ASP", "E-D", "DSP"... y regresa el tipo canonico. */
export function normalizeExtractionType(value: unknown): ExtractionType | null {
  const text = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "");
  if (!text) return null;
  if (text === "E-A" || text === "EA" || text === "ASP") return "E-A";
  if (text === "E-D" || text === "ED" || text === "DSP") return "E-D";
  return null;
}

export function extractionTypeMeta(value: unknown): ExtractionTypeMeta {
  return EXTRACTION_TYPES[normalizeExtractionType(value) || DEFAULT_EXTRACTION_TYPE];
}

/*
 * Interpreta una busqueda de folio: "E-D 12", "E-D-12", "ED12", "DSP 12" o
 * solo "12". Regresa el tipo (si venia) y los digitos del folio.
 */
export function parseExtractionFolioSearch(search: string): { tipo: ExtractionType | null; folio: string | null } {
  const text = String(search || "").trim();
  if (!text) return { tipo: null, folio: null };
  const match = text.match(/^(E\s*-?\s*[AD]|ASP|DSP)?\s*-?\s*(\d+)$/i);
  if (!match) return { tipo: null, folio: null };
  const tipo = match[1] ? normalizeExtractionType(match[1]) : null;
  return { tipo, folio: match[2] };
}

/* La clave de revision debe corresponder al formato del tipo (FX-TCF-GME-A, FX-TCF-GME-A/2...). */
export function claveForType(tipo: ExtractionType, clave: unknown): string {
  const base = EXTRACTION_TYPES[tipo].clave;
  const text = String(clave ?? "").trim().toUpperCase();
  return text.startsWith(base) ? text.slice(0, 50) : base;
}
