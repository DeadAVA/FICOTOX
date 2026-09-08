import { IMPORT_COLUMNS, REACTIVO_SHEET_TYPE_LABELS } from "./constants";
import { parseIntOrNull } from "./format";

/* Lectura de CSV/Excel en el navegador, identica a el app.js de la interfaz original. */

declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, options: Record<string, unknown>) => { SheetNames: string[]; Sheets: Record<string, unknown> };
      utils: {
        sheet_to_json: (sheet: unknown, options: Record<string, unknown>) => unknown[];
      };
    };
  }
}

export interface ImportPreviewRow {
  _rowIndex: number;
  _valid: boolean;
  producto: string | null;
  marca: string | null;
  proveedor: string | null;
  catalogo_parte_cas: string | null;
  fecha_ingreso: string | null;
  tamano_capacidad: string | null;
  contenedor: string | null;
  piezas: number | null;
  cantidad_por_pieza: number | null;
}

export const normalizeImportCell = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).replace(/\s+/g, " ").trim();
  if (["", "-", "--", "n/a", "na", "null", "undefined"].includes(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed ? trimmed : null;
};

export const normalizeImportInteger = (value: unknown): number | null => {
  const normalized = normalizeImportCell(value);
  if (!normalized) {
    return null;
  }
  const clean = String(normalized).replace(/[^0-9-]/g, "");
  return parseIntOrNull(clean);
};

export const normalizeImportDate = (value: unknown): string | null => {
  const normalized = normalizeImportCell(value);
  if (!normalized) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const slashMatch = normalized.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
};

export const normalizeImportKey = (key: unknown): string => {
  const base = String(key || "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[�]/g, "")
    .replace(/[\s#./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (base === "cantidad_por_pieza_" || base === "cantidad_por_pieza") {
    return "cantidad_por_pieza";
  }
  if (base.includes("catalogo") && base.includes("parte") && base.includes("cas")) {
    return "catalogo_parte_cas";
  }
  if ((base.includes("tamano") || base.includes("tama") || base.includes("capacidad")) && base.includes("capacidad")) {
    return "tamano_capacidad";
  }
  return base;
};

export const detectCsvDelimiter = (text: string): string => {
  const sample = String(text || "").split(/\r?\n/).slice(0, 5).join("\n");
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  if (semicolons > commas) {
    return ";";
  }
  return ",";
};

export const parseCsvText = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
};

export const mapCsvToPreviewRows = (csvRows: string[][]): { detected: string[]; rows: ImportPreviewRow[] } => {
  if (!csvRows || csvRows.length === 0) {
    return { detected: [], rows: [] };
  }

  const rawHeaders = csvRows[0].map((h) => String(h || "").trim());
  const normalizedHeaders = rawHeaders.map(normalizeImportKey);

  const detected = normalizedHeaders.filter((h) => (IMPORT_COLUMNS as readonly string[]).includes(h));
  const rows = csvRows
    .slice(1)
    .map((cells, index) => {
      const rawRow: Record<string, string | null> = {};
      normalizedHeaders.forEach((header, idx) => {
        rawRow[header] = normalizeImportCell(cells[idx]);
      });

      const row: ImportPreviewRow = {
        _rowIndex: index + 2,
        _valid: false,
        producto: normalizeImportCell(rawRow.producto),
        marca: normalizeImportCell(rawRow.marca),
        proveedor: normalizeImportCell(rawRow.proveedor),
        catalogo_parte_cas: normalizeImportCell(rawRow.catalogo_parte_cas),
        fecha_ingreso: normalizeImportDate(rawRow.fecha_ingreso),
        tamano_capacidad: normalizeImportCell(rawRow.tamano_capacidad),
        contenedor: normalizeImportCell(rawRow.contenedor),
        piezas: normalizeImportInteger(rawRow.piezas),
        cantidad_por_pieza: normalizeImportInteger(rawRow.cantidad_por_pieza),
      };
      row._valid = !!row.producto;
      return row;
    })
    .filter((row) => {
      // Quita filas completamente vacias y deja visibles las invalidas para que se puedan depurar.
      return IMPORT_COLUMNS.some((col) => row[col] !== null && row[col] !== "");
    });

  return { detected, rows };
};

export const isConsumablesSheetName = (sheetName: string): boolean => {
  const normalized = normalizeImportKey(sheetName);
  return normalized === "consumibles" || normalized.includes("consumible");
};

export const hasConsumablesHeaderSignature = (detectedHeaders: string[]): boolean => {
  const detected = Array.isArray(detectedHeaders) ? detectedHeaders : [];
  if (!detected.includes("producto")) {
    return false;
  }
  const distinctiveFields = ["catalogo_parte_cas", "tamano_capacidad", "contenedor", "piezas", "cantidad_por_pieza"];
  return distinctiveFields.some((field) => detected.includes(field));
};

export const getReactivoSheetType = (sheetName: string): string => {
  const normalized = normalizeImportKey(sheetName);
  if (normalized === "consumibles" || normalized.includes("consumible")) return "";
  const aliases: Record<string, string> = {
    acidos: "acidos",
    alcoholes_y_solventes_organicos: "alcoholes_solventes",
    alcoholes_solventes_organicos: "alcoholes_solventes",
    alcoholes_y_solventes: "alcoholes_solventes",
    alcoholes_solventes: "alcoholes_solventes",
    compuestos_de_amonio: "compuestos_amonio",
    compuestos_amonio: "compuestos_amonio",
    compuestos_de_sodio: "compuestos_sodio",
    compuestos_sodio: "compuestos_sodio",
    estandares_preparados: "estandares_preparados",
    materiales_de_referencia: "materiales_referencia",
    materiales_referencia: "materiales_referencia",
    miscelaneos: "miscelaneos",
    columnas_cromatograficas: "columnas_cromatograficas",
  };
  return aliases[normalized] || "";
};

export interface ReactivoImportSheet {
  name: string;
  type: string;
  label: string;
  valid: boolean;
  rows: Record<string, unknown>[];
}

export const workbookToReactivoSheets = async (file: File): Promise<ReactivoImportSheet[]> => {
  /*
   * Importacion Excel de reactivos.
   * 1. Validar extension .xlsx/.xls.
   * 2. Leer workbook con SheetJS.
   * 3. Convertir cada hoja a JSON conservando tipos basicos.
   * 4. Clasificar hojas por nombre; el backend revalida antes de guardar.
   */
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!["xlsx", "xls"].includes(ext)) {
    throw new Error("Formato inválido. Solo se aceptan archivos .xlsx o .xls");
  }
  if (!window.XLSX) {
    throw new Error("No se pudo cargar el lector de Excel");
  }

  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = window.XLSX!.utils.sheet_to_json(sheet, { defval: "", raw: true }) as Record<string, unknown>[];
    const sheetType = getReactivoSheetType(sheetName);
    return {
      name: sheetName,
      type: sheetType,
      label: REACTIVO_SHEET_TYPE_LABELS[sheetType] || "",
      valid: !!sheetType,
      rows,
    };
  });
};

export interface ConsumablesWorkbookResult {
  detected: string[];
  rows: ImportPreviewRow[];
  validSheets: number;
  ignoredSheets: string[];
}

export const workbookToConsumableRows = async (file: File): Promise<ConsumablesWorkbookResult> => {
  if (!window.XLSX) {
    throw new Error("No se pudo cargar el lector de Excel");
  }
  const buffer = await file.arrayBuffer();
  const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
  const workbookHasSingleSheet = workbook.SheetNames.length === 1;
  let mergedRows: ImportPreviewRow[] = [];
  const detectedSet = new Set<string>();
  const ignoredSheets: string[] = [];
  let validSheets = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return;
    }
    const jsonRows = window.XLSX!.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
    const matrix = jsonRows.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return "";
        if (cell instanceof Date) return cell.toISOString().slice(0, 10);
        return String(cell);
      }),
    );

    const mapped = mapCsvToPreviewRows(matrix);
    const hasConsumibleHeaders = hasConsumablesHeaderSignature(mapped.detected);
    const isConsumibleSheet = isConsumablesSheetName(sheetName) || (workbookHasSingleSheet && hasConsumibleHeaders);
    if (!isConsumibleSheet) {
      ignoredSheets.push(sheetName);
      return;
    }

    validSheets += 1;
    mapped.detected.forEach((field) => detectedSet.add(field));
    mergedRows = mergedRows.concat(mapped.rows);
  });

  return { detected: Array.from(detectedSet), rows: mergedRows, validSheets, ignoredSheets };
};

export const readCsvFileText = async (file: File): Promise<string> => {
  const readWithEncoding = (f: File, enc: string) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(fr.error);
      fr.readAsText(f, enc);
    });
  let text = await readWithEncoding(file, "UTF-8");
  if (text.includes("�")) {
    text = await readWithEncoding(file, "windows-1252");
  }
  return text;
};
