import { toBit } from "./rbac";
import { isAvatarKey } from "../shared/avatars";

/* Portado de utils/users.py del backend Flask original. */

export interface UserPayload {
  nombre: string;
  email: string;
  id_rol: number;
  departamento: string | null;
  activo: number;
  /* undefined = no cambiar; null = volver al avatar por omision. */
  avatar?: string | null;
}

export function normalizeUserPayload(payload: Record<string, unknown>): UserPayload {
  const email = String(payload.email || "").trim().toLowerCase().slice(0, 100);
  let name = String(payload.nombre || "").trim().slice(0, 100);
  if (!name && email) {
    name = email.split("@", 1)[0].slice(0, 100);
  }
  return {
    nombre: name,
    email,
    id_rol: Number.parseInt(String(payload.id_rol || 0), 10) || 0,
    departamento: String(payload.departamento || "").trim().slice(0, 100) || null,
    activo: toBit(payload.activo === undefined ? true : payload.activo),
    avatar: payload.avatar === undefined ? undefined : isAvatarKey(payload.avatar) ? payload.avatar : null,
  };
}
