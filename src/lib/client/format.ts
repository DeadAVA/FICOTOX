/* Utilidades de formato identicas a las de el app.js de la interfaz original. */

export const fmt = (value: unknown): string => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("es-MX") : "0";
};

export const fmtDate = (value: unknown): string => {
  if (!value) {
    return "-";
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const parseNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const parseIntOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? num : null;
};

export const parseFloatOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const toDateOnly = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const isoDate = (value: unknown): string => {
  if (!value) {
    return "";
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

export const normalizeText = (value: unknown): string => String(value || "").toLowerCase();

export const getUserInitials = (name = "", email = ""): string => {
  const source = (name || email || "U").trim();
  const parts = source.includes("@") ? [source[0]] : source.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "U";
};

export const escapeHtml = (value: unknown): string =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/* Fecha local de hoy como YYYY-MM-DD (sin el corrimiento de zona horaria de `new Date("YYYY-MM-DD")`). */
export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/*
 * Tono de una fecha límite (caducidad, calibración): "danger" si ya pasó
 * (estrictamente antes de hoy, igual que el servidor), "warning" si vence en
 * los próximos `days` días. Compara cadenas YYYY-MM-DD para no depender de la zona horaria.
 */
export const deadlineTone = (value: unknown, days = 30): "danger" | "warning" | null => {
  if (!value) return null;
  const date = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = todayIso();
  if (date < today) return "danger";
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  const limitIso = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;
  return date <= limitIso ? "warning" : null;
};
