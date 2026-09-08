import { REACTIVO_TYPES, type ReactivoTypeConfig } from "./constants";
import { fmt, parseNumberOrNull } from "./format";
import type { ApiRecord } from "./types";

/* Helpers de reactivos identicos a los de el app.js de la interfaz original. */

export const getReactivoTypeConfig = (type: unknown): ReactivoTypeConfig | null => REACTIVO_TYPES.find((item) => item.value === type) || null;

export const getReactivoTypeLabel = (type: unknown): string => getReactivoTypeConfig(type)?.label || (type as string) || "Sin tipo";

export const formatReactivoName = (item: ApiRecord): string => item.producto || item.item_name || item.nombre_crm || item.nombre || "-";

export const getReactivoExpiry = (item: ApiRecord): unknown => item.caducidad || item.expiration_date || item.fecha_vencimiento || null;

export const getReactivoLocation = (item: ApiRecord): string => [item.localizacion || item.ubicacion, item.sub_localizacion].filter(Boolean).join(" / ") || "-";

export const getReactivoStockInfo = (item: ApiRecord): { current: number | null; max: number | null; unit: string } => {
  const fields: Array<[string, string]> = [
    ["restante_190126", "L"],
    ["amount_in_stock", item.unidad || ""],
    ["cantidad_actual", item.unidad || ""],
    ["total_litros_2025", "L"],
    ["capacidad_litros", "L"],
    ["capacidad_kilos", "kg"],
    ["volumen", "volumen"],
    ["piezas", "piezas"],
  ];
  const source = fields.find(([key]) => parseNumberOrNull(item[key]) !== null);
  const current = source ? parseNumberOrNull(item[source[0]]) : null;
  const unit = source ? source[1] : "";
  const max =
    parseNumberOrNull(item.stock_maximo) ??
    parseNumberOrNull(item.capacidad_litros) ??
    parseNumberOrNull(item.capacidad_kilos) ??
    parseNumberOrNull(item.cantidad_total) ??
    parseNumberOrNull(item.total_litros_2025) ??
    parseNumberOrNull(item.amount_in_stock) ??
    current;
  return { current, max, unit };
};

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== "";

export const getReactivoStockText = (item: ApiRecord): string => {
  if (hasValue(item.restante_190126)) return `${fmt(item.restante_190126)} L restantes`;
  if (hasValue(item.total_litros_2025)) return `${fmt(item.total_litros_2025)} L`;
  if (hasValue(item.amount_in_stock)) return fmt(item.amount_in_stock);
  if (hasValue(item.capacidad_litros)) return `${fmt(item.capacidad_litros)} L`;
  if (hasValue(item.capacidad_kilos)) return `${fmt(item.capacidad_kilos)} kg`;
  if (hasValue(item.volumen)) return `${fmt(item.volumen)} volumen`;
  if (hasValue(item.piezas)) return `${fmt(item.piezas)} piezas`;
  return "-";
};
