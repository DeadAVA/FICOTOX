import type { ApiRecord } from "./types";

/* Helpers de consumo de API identicos a los de el app.js de la interfaz original. */

export const API_BASE_URL = "/api";

async function parseJson(response: Response): Promise<ApiRecord> {
  try {
    const data = await response.json();
    return data && typeof data === "object" ? (data as ApiRecord) : {};
  } catch {
    return {};
  }
}

export const postJson = async (url: string, body: unknown): Promise<ApiRecord> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }
  return data;
};

export const getJsonAuth = async (url: string, token: string): Promise<ApiRecord> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "No autorizado");
  }
  return data;
};

export const sendJsonAuth = async (method: string, url: string, token: string, body?: unknown): Promise<ApiRecord> => {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }
  return data;
};

export const sendFormAuth = async (url: string, token: string, formData: FormData, method: string = "POST"): Promise<ApiRecord> => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la carga");
  }
  return data;
};

/* Equivalente de resolveApiEntity(payload, preferredKeys). */
export const resolveApiEntity = (payload: unknown, preferredKeys: string[] = []): ApiRecord => {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const record = payload as ApiRecord;
  const keys = [...preferredKeys, "item", "role", "user", "usuario", "data", "result"];
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as ApiRecord;
    }
  }
  if (Array.isArray(record.items) && record.items.length === 1 && typeof record.items[0] === "object") {
    return record.items[0] as ApiRecord;
  }
  return record;
};
