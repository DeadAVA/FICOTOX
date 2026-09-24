import type { ApiRecord } from "./types";

/* Helpers de consumo de API identicos a los de el app.js de la interfaz original. */

export const API_BASE_URL = "/api";

/*
 * "Actuar como" (Fase 1): si una accion la permiten varios roles vigentes de la
 * persona, el servidor responde 409 con codigo ELEGIR_CARGO y las opciones; el
 * cliente pide elegir (ActuarComoProvider) y repite la peticion con el
 * encabezado X-Actuar-Como. Si la persona cancela, la accion no se realiza.
 */
export interface OpcionCargo {
  rol_id: number;
  nombre: string;
}
type ElegirCargo = (opciones: OpcionCargo[], mensaje: string) => Promise<number | null>;
let elegirCargo: ElegirCargo | null = null;

export function registrarSelectorDeCargo(fn: ElegirCargo | null): void {
  elegirCargo = fn;
}

async function conCargo(send: (extra: Record<string, string>) => Promise<Response>): Promise<Response> {
  const response = await send({});
  if (response.status !== 409 || !elegirCargo) return response;
  const data = await response.clone().json().catch(() => ({}) as ApiRecord);
  if (data?.codigo !== "ELEGIR_CARGO" || !Array.isArray(data.opciones)) return response;
  const rolId = await elegirCargo(data.opciones as OpcionCargo[], String(data.message || ""));
  if (rolId === null) throw new Error("Acción cancelada: no se eligió con qué cargo actuar");
  return send({ "X-Actuar-Como": String(rolId) });
}

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
  const response = await conCargo((extra) =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...extra,
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "No se pudo completar la solicitud");
  }
  return data;
};

export const sendFormAuth = async (url: string, token: string, formData: FormData, method: string = "POST"): Promise<ApiRecord> => {
  const response = await conCargo((extra) =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...extra,
      },
      body: formData,
    }),
  );
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
