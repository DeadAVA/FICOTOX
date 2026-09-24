"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, getJsonAuth, postJson } from "@/lib/client/api";
import { logoutMicrosoft } from "@/lib/client/msal";
import { resetSearchIndex } from "@/lib/client/search-index";
import { clearSession, getStoredPermissions, getStoredToken, setSession, setStoredPermissions } from "@/lib/client/session";
import type { ApiRecord, AuthConfig, ModuleAction, PermissionsMap, RolSesion, SessionUser } from "@/lib/client/types";
import { alcancePermite, type Accion, type Alcance, type ContextoAlcance, type Modulo } from "@/lib/shared/permisos";

/*
 * Sesion de la aplicacion: token, usuario, permisos y configuracion de acceso.
 * - `status` pasa por "checking" -> "authenticated" | "anonymous".
 * - `can(modulo, accion, contexto?)` resuelve los permisos efectivos (union de
 *   los roles vigentes; Fase 1). El servidor es quien decide: esto solo muestra
 *   u oculta menus y botones. Los permisos se vuelven a pedir al servidor cada
 *   minuto y al volver a la ventana, para reflejar roles revocados o vencidos.
 */

export type SessionStatus = "checking" | "authenticated" | "anonymous";

export interface SessionValue {
  status: SessionStatus;
  token: string;
  user: SessionUser | null;
  permissions: PermissionsMap;
  roles: RolSesion[];
  authConfig: AuthConfig;
  can: (modulo: Modulo, accion?: ModuleAction, ctx?: ContextoAlcance) => boolean;
  /* Alcance mas amplio con el que la persona tiene (modulo, accion), o null. */
  alcance: (modulo: Modulo, accion?: Accion) => Alcance | null;
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
  const [roles, setRoles] = useState<RolSesion[]>([]);
  const [authConfig, setAuthConfig] = useState<AuthConfig>(DEFAULT_AUTH_CONFIG);
  const started = useRef(false);

  const enter = useCallback((nextToken: string, nextUser: SessionUser, nextPermissions: PermissionsMap, nextRoles: RolSesion[] = []) => {
    setStoredPermissions(nextPermissions);
    setToken(nextToken);
    setUser(nextUser);
    setPermissions(nextPermissions);
    setRoles(nextRoles);
    setStatus("authenticated");
  }, []);

  const leave = useCallback(() => {
    clearSession();
    resetSearchIndex();
    setToken("");
    setUser(null);
    setPermissions({});
    setRoles([]);
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
      enter(stored, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap, (data.roles || []) as RolSesion[]);
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
      enter(data.token as string, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap, (data.roles || []) as RolSesion[]);
    },
    [enter],
  );

  const acceptLogin = useCallback(
    (data: ApiRecord) => {
      setSession(data.token as string, (data.user || {}) as SessionUser);
      enter(data.token as string, (data.user || {}) as SessionUser, (data.permissions || {}) as PermissionsMap, (data.roles || []) as RolSesion[]);
    },
    [enter],
  );

  const logout = useCallback(() => {
    leave();
    logoutMicrosoft();
    router.replace("/login");
  }, [leave, router]);

  // Revocar o vencer un rol tiene efecto inmediato en el servidor; aqui se refleja al volver a la ventana y cada minuto.
  useEffect(() => {
    if (status !== "authenticated") return;
    const refresh = () => {
      if (document.visibilityState === "visible") void refreshMe();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [status, refreshMe]);

  const can = useCallback(
    (modulo: Modulo, accion: ModuleAction = "V", ctx?: ContextoAlcance) => {
      if (!permissions[modulo]?.[accion]) return false;
      if (!ctx) return true;
      // Con contexto: basta que un rol vigente lo permita con alguno de sus alcances.
      return roles.some((rol) => {
        const alcance = rol.permisos[modulo]?.[accion];
        return !!alcance && alcancePermite(alcance, ctx);
      }) || alcancePermite(permissions[modulo]![accion]!, ctx);
    },
    [permissions, roles],
  );

  const alcance = useCallback((modulo: Modulo, accion: Accion = "V") => permissions[modulo]?.[accion] ?? null, [permissions]);

  const value = useMemo<SessionValue>(
    () => ({ status, token, user, permissions, roles, authConfig, can, alcance, loginWithEmail, acceptLogin, logout, refreshMe }),
    [status, token, user, permissions, roles, authConfig, can, alcance, loginWithEmail, acceptLogin, logout, refreshMe],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
