import { API_BASE_URL, getJsonAuth } from "./api";
import { getStoredToken } from "./session";
import type { ApiRecord } from "./types";

/*
 * Cache de insumos (reactivos, consumibles y equipos) para los buscadores de
 * los formularios de procesamiento y extraccion. Se carga una sola vez por
 * sesion de pagina, igual que en el app.js de la interfaz original.
 */

export type InsumoTipo = "reactivo" | "consumible" | "equipo";

export interface InsumoOption {
  ref: string;
  label: string;
  cantidad_actual?: number | null;
  piezas?: number | null;
  unidad?: string;
}

let reactivosCache: InsumoOption[] | null = null;
let consumiblesCache: InsumoOption[] | null = null;
let equiposCache: InsumoOption[] | null = null;
let loadingPromise: Promise<void> | null = null;

export const isInsumoCacheLoaded = (): boolean => reactivosCache !== null;

export const loadInsumoOptions = (): Promise<void> => {
  if (reactivosCache !== null) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  const token = getStoredToken();
  if (!token) return Promise.resolve();
  loadingPromise = Promise.all([
    getJsonAuth(`${API_BASE_URL}/inventory/reactivos?search=`, token).catch(() => ({}) as ApiRecord),
    getJsonAuth(`${API_BASE_URL}/consumables/?search=`, token).catch(() => ({}) as ApiRecord),
    getJsonAuth(`${API_BASE_URL}/inventory/equipos?search=`, token).catch(() => ({}) as ApiRecord),
  ])
    .then(([rData, cData, eData]) => {
      reactivosCache = ((rData.items || []) as ApiRecord[]).map((r) => ({
        ref: String(r.id),
        label: [r.producto, r.catalogo].filter(Boolean).join(" · ") || String(r.id),
        cantidad_actual: r.cantidad_actual ?? null,
        unidad: r.unidad || "",
      }));
      consumiblesCache = ((Array.isArray(cData) ? cData : cData.items || []) as ApiRecord[]).map((c) => ({
        ref: String(c.id),
        piezas: c.piezas ?? null,
        unidad: "piezas",
        label: [c.producto, c.catalogo_parte_cas].filter(Boolean).join(" · ") || String(c.id),
      }));
      equiposCache = ((eData.items || []) as ApiRecord[]).map((e) => ({
        ref: e.nombre || String(e.id),
        label: [e.nombre, e.marca, e.modelo].filter(Boolean).join(" · ") || String(e.id),
      }));
      loadingPromise = null;
    })
    .catch(() => {
      loadingPromise = null;
    });
  return loadingPromise;
};

export const getInsumoOptions = (tipo: string): InsumoOption[] => {
  if (tipo === "reactivo") return reactivosCache || [];
  if (tipo === "equipo") return equiposCache || [];
  return consumiblesCache || [];
};

export const findInsumoOption = (tipo: string, ref: unknown): InsumoOption | null => {
  const value = String(ref || "").trim();
  if (!value) return null;
  return getInsumoOptions(tipo).find((item) => String(item.ref) === value || item.label === value) || null;
};

export const findReactivoByRef = (ref: string): InsumoOption | null => {
  return (reactivosCache || []).find((r) => r.ref === ref) || null;
};

export const normalizeInsumoText = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const findInsumoByAutoQuery = (tipo: string, query: unknown): InsumoOption | null => {
  const tokens = normalizeInsumoText(query).split(" ").filter(Boolean);
  if (!tokens.length) return null;
  const indexed = getInsumoOptions(tipo).map((item) => ({ item, text: normalizeInsumoText(item.label) }));
  const exact = indexed.filter(({ text }) => tokens.every((token) => text.includes(token)));
  if (exact.length) return exact[0].item;
  const alphaTokens = tokens.filter((token) => !/^\d+$/.test(token));
  const candidates = indexed
    .filter(({ text }) => alphaTokens.every((token) => text.includes(token)))
    .map(({ item, text }) => ({
      item,
      score: tokens.reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.item || null;
};

export const normalizeInventoryUnit = (unit: unknown): string => {
  const value = String(unit || "").trim().toLowerCase();
  if (!value) return "";
  if (["l", "lt", "ltr", "litro", "litros"].includes(value)) return "litros";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  return value;
};

export const formatInventoryAmount = (value: unknown): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("es-MX", { maximumFractionDigits: 4 });
};

export interface FixedInsumoSpec {
  cantidadFija?: string | number | null;
  cantidadUnidad?: string | null;
}

export interface ResolvedFixedAmount {
  amount: number;
  protocolAmount: number;
  protocolUnit: string;
  stockUnit: string;
}

export const resolveFixedInventoryAmount = (spec: FixedInsumoSpec | null | undefined, item: InsumoOption | null = null): ResolvedFixedAmount | null => {
  const protocolAmount = Number.parseFloat(String(spec?.cantidadFija ?? ""));
  if (!protocolAmount) {
    return null;
  }
  const protocolUnit = normalizeInventoryUnit(spec?.cantidadUnidad);
  const stockUnit = normalizeInventoryUnit(item?.unidad);

  let amount = protocolAmount;
  if (protocolUnit && stockUnit && protocolUnit !== stockUnit) {
    if (protocolUnit === "ml" && stockUnit === "litros") {
      amount = protocolAmount / 1000;
    } else if (protocolUnit === "litros" && stockUnit === "ml") {
      amount = protocolAmount * 1000;
    }
  }

  return {
    amount,
    protocolAmount,
    protocolUnit,
    stockUnit: stockUnit || item?.unidad || "",
  };
};

export interface InventarioRow {
  key: number;
  tipo: string;
  ref: string;
  nombre?: string;
  cantidad: number;
}

/* Filtra las filas manuales que ya vienen cubiertas por los insumos fijos del protocolo. */
export const filterManualInventario = (rows: ApiRecord[], protocolRows: Array<{ tipo: string; ref: string; cantidad: number }>): ApiRecord[] => {
  const protocolCounts = new Map<string, number>();
  protocolRows.forEach((row) => {
    const key = `${row.tipo}|${row.ref}|${row.cantidad}`;
    protocolCounts.set(key, (protocolCounts.get(key) || 0) + 1);
  });
  return (rows || []).filter((row) => {
    const key = `${row.tipo || "consumible"}|${row.ref || row.nombre || ""}|${row.cantidad ?? 1}`;
    const count = protocolCounts.get(key) || 0;
    if (count <= 0) return true;
    protocolCounts.set(key, count - 1);
    return false;
  });
};
