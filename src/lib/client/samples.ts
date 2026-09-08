import { SAMPLE_ANALYSIS_LABELS, SAMPLE_MATRIX_LABELS } from "./constants";
import type { ApiRecord } from "./types";

/* Helpers de muestras identicos a los de el app.js de la interfaz original. */

export const formatSampleFolio = (item: ApiRecord): string => {
  const type = String(item.tipo_registro || "R").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

export const formatProcessingFolio = (item: ApiRecord): string => {
  const type = String(item.tipo_registro || "P").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

export const formatExtractionFolio = (item: ApiRecord): string => {
  const type = String(item.tipo_registro || "E-A").toUpperCase();
  const num = Number(item.folio_num || 0);
  return `${type} ${String(num).padStart(7, "0")}`;
};

export const normalizeSampleStatus = (status: unknown): string => String(status || "registrada").toLowerCase().replace(/\s+/g, "_");

export const sampleStatusLabel = (status: unknown): string => {
  const normalized = normalizeSampleStatus(status);
  const labels: Record<string, string> = {
    registrada: "Registrada",
    procesamiento: "En proceso",
    extraccion: "Extracción",
    en_proceso: "En proceso",
    completada: "Completada",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  return labels[normalized] || String(status || "Registrada");
};

export const getSampleAnalysisSummary = (item: ApiRecord): string => {
  const analysis = item.analisis || {};
  const values: string[] = Array.isArray(analysis.tipos) ? analysis.tipos : [];
  const labels = values.map((value) => SAMPLE_ANALYSIS_LABELS[value] || value).filter(Boolean);
  if (analysis.metodo_otro) {
    labels.push(analysis.metodo_otro);
  }
  return labels.length ? labels.join(", ") : "-";
};

export const getSampleTypeSummary = (item: ApiRecord): string => {
  const analysis = item.analisis || {};
  const matrix: string[] = Array.isArray(analysis.tipos_muestra) ? analysis.tipos_muestra : [];
  const matrixLabel = matrix.map((value) => SAMPLE_MATRIX_LABELS[value] || value).filter(Boolean).join(", ");
  if (matrixLabel) {
    return matrixLabel;
  }
  if (item.muestra_unica) {
    return "Muestra única";
  }
  return "Lote";
};

export const samplePriorityLabel = (priority = "normal"): { normalized: string; label: string } => {
  const normalized = String(priority || "normal").toLowerCase();
  const labels: Record<string, string> = { normal: "Normal", alta: "Alta", urgente: "Urgente" };
  return { normalized, label: labels[normalized] || priority };
};

/* Nombre de radio por requisito de inspeccion (btoa(unescape(encodeURIComponent(req))).slice(0, 12)). */
export const inspectionRadioName = (requirement: string): string => `insp-${btoa(unescape(encodeURIComponent(requirement))).slice(0, 12)}`;

export const getExtractionRowsFromProcessing = (processing: ApiRecord | null): ApiRecord[] => {
  if (!processing) {
    return [];
  }
  if ((processing.muestra_tipo || "") === "lote") {
    return Array.isArray(processing.lote_seleccion) ? processing.lote_seleccion : [];
  }
  return [
    {
      id_interno: processing.id_interno || null,
      nombre_organismo: (processing.tipo_organismo || []).join(", ") || null,
      sitio_muestreo: null,
    },
  ].filter((row) => row.id_interno || row.nombre_organismo);
};
