"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getJsonAuth, postJson } from "@/lib/client/api";
import { logoutMicrosoft } from "@/lib/client/msal";
import { clearSession, getStoredPermissions, getStoredToken, setSession, setStoredPermissions } from "@/lib/client/session";
import type { ApiRecord, AuthConfig, ModuleAction, PermissionsMap, SessionUser } from "@/lib/client/types";

/*
 * Sesion de la aplicacion: token, usuario, permisos y configuracion de acceso.
 * - `status` pasa por "checking" -> "authenticated" | "anonymous".
 * - `can(modulo, accion)` resuelve el RBAC del rol.
 */

export type SessionStatus = "checking" | "authenticated" | "anonymous";

export interface SessionValue {
  status: SessionStatus;
  token: string;
  user: SessionUser | null;
  permissions: PermissionsMap;
  authConfig: AuthConfig;
  can: (moduleKey: string, action?: ModuleAction) => boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  acceptLogin: (data: ApiRecord) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const DEFAULT_AUTH_CONFIG: AuthConfig = { microsoft: { enabled: false }, manualLoginEnabled: true };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>("checking");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const started = useRef(false);

  const enter = useCallback((nextToken: string, nextUser: SessionUser, nextPermissions: PermissionsMap) => {
    setStoredPermissions(nextPermissions);
    setToken(nextToken);
    setUser(nextUser);
    setPermissions(nextPermissions);
    setStatus("authenticated");
  }, []);

  const leave = useCallback(() => {
    clearSession();
    setToken("");
    setUser(null);
    setPermissions({});
    setStatus("anonymous");
  }, []);

  const refreshMe = useCallback(async () => {
    const stored = getStoredToken();
    if (!stored) {
      leave();
      return;
    }
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/auth/me`, stored);
      enter(stored, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap);
    } catch {
      leave();
    }
  }, [enter, leave]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/config`);
        const data = (await response.json().catch(() => ({}))) as ApiRecord;
        if (response.ok) setAuthConfig(data as AuthConfig);
      } catch {
        setAuthConfig(DEFAULT_AUTH_CONFIG);
      }
      const stored = getStoredToken();
      if (!stored) {
        setStatus("anonymous");
        return;
      }
      setPermissions(getStoredPermissions());
      await refreshMe();
    })();
  }, [refreshMe]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const data = await postJson(`${API_BASE_URL}/auth/login`, { email, password });
      setSession(data.token as string, (data.user || {}) as SessionUser);
      enter(data.token as string, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap);
    },
    [enter],
  );

  const acceptLogin = useCallback(
    (data: ApiRecord) => {
      setSession(data.token as string, (data.user || {}) as SessionUser);
      enter(data.token as string, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap);
    },
    [enter],
  );

  const logout = useCallback(() => {
    leave();
    logoutMicrosoft();
    router.replace("/login");
  }, [leave, router]);

  const can = useCallback((moduleKey: string, action: ModuleAction = "read") => !!(permissions[moduleKey] && permissions[moduleKey][action]), [permissions]);

  const value = useMemo<SessionValue>(
    () => ({ status, token, user, permissions, authConfig, can, loginWithEmail, acceptLogin, logout, refreshMe }),
    [status, token, user, permissions, authConfig, can, loginWithEmail, acceptLogin, logout, refreshMe],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
