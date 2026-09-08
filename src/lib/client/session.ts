import type { PermissionsMap, SessionUser } from "./types";

/* Mismas claves de localStorage que usaba el app.js de la interfaz original. */
export const SESSION_TOKEN_KEY = "ficotox_access_token";
export const SESSION_USER_KEY = "ficotox_user";
export const SESSION_PERMISSIONS_KEY = "ficotox_permissions";

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const getStoredToken = (): string | null => {
  const saved = storage()?.getItem(SESSION_TOKEN_KEY);
  return saved && saved.trim() ? saved.trim() : null;
};

export const getStoredUser = (): SessionUser | null => {
  const raw = storage()?.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
};

export const formatActiveUserSignature = (): string => {
  const user = getStoredUser() || {};
  const name = String(user.nombre || "").trim();
  const role = String(user.rol || "").trim();
  const email = String(user.email || "").trim();
  return [name || email || "Usuario activo", role, email && name ? email : ""].filter(Boolean).join(" - ");
};

export const setSession = (token: string, user: SessionUser): void => {
  storage()?.setItem(SESSION_TOKEN_KEY, token);
  storage()?.setItem(SESSION_USER_KEY, JSON.stringify(user));
};

export const setStoredPermissions = (permissions: PermissionsMap): void => {
  storage()?.setItem(SESSION_PERMISSIONS_KEY, JSON.stringify(permissions || {}));
};

export const getStoredPermissions = (): PermissionsMap => {
  const raw = storage()?.getItem(SESSION_PERMISSIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PermissionsMap;
  } catch {
    return {};
  }
};

export const clearSession = (): void => {
  storage()?.removeItem(SESSION_TOKEN_KEY);
  storage()?.removeItem(SESSION_USER_KEY);
  storage()?.removeItem(SESSION_PERMISSIONS_KEY);
};
