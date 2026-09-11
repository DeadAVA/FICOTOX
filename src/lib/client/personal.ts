"use client";

import { API_BASE_URL, getJsonAuth } from "./api";
import { getStoredToken, getStoredUser } from "./session";
import { useResource } from "./store";

/*
 * Personal activo del laboratorio con lo que puede hacer, para los selectores
 * de "quién" en los formatos. Se carga una vez por sesión de página y se
 * invalida con la clave "personal" (altas/bajas de usuarios).
 */

export type PersonaCapacidad = "muestras" | "aprobaciones" | "informes" | "inventario";

export interface Persona {
  id: number;
  nombre: string;
  rol: string | null;
  puede: Record<PersonaCapacidad, boolean>;
}

let cache: Persona[] | null = null;
let pending: Promise<Persona[]> | null = null;

export const loadPersonal = (): Promise<Persona[]> => {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  const token = getStoredToken();
  if (!token) return Promise.resolve([]);
  pending = getJsonAuth(`${API_BASE_URL}/auth/personal`, token)
    .then((data) => {
      cache = (data.items || []) as Persona[];
      return cache;
    })
    .catch(() => [] as Persona[])
    .finally(() => {
      pending = null;
    });
  return pending;
};

export const resetPersonal = (): void => {
  cache = null;
};

export function usePersonal(): Persona[] {
  const resource = useResource<Persona[]>("personal", async () => {
    cache = null;
    return loadPersonal();
  });
  return resource.data || cache || [];
}

/* Nombre de la persona con sesión (sin rol ni correo), para prellenar "quién". */
export const activeUserName = (): string => {
  const user = getStoredUser() || {};
  return String(user.nombre || user.email || "").trim();
};
