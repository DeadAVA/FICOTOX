// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = Record<string, any>;

export interface SessionUser {
  id?: number;
  role_id?: number | null;
  nombre?: string;
  email?: string;
  rol?: string;
  sub?: string;
}

export type PermissionFlags = { read?: boolean; create?: boolean; update?: boolean; delete?: boolean };
export type PermissionsMap = Record<string, PermissionFlags>;

export interface AuthConfig {
  microsoft: {
    enabled?: boolean;
    clientId?: string;
    tenantId?: string;
    authority?: string;
    allowedDomain?: string;
  };
  manualLoginEnabled?: boolean;
}

export type PageKey =
  | "dashboard"
  | "reactivos"
  | "consumibles"
  | "equipos"
  | "muestras"
  | "movimientos"
  | "mantenimiento"
  | "documentos"
  | "reportes"
  | "roles"
  | "usuarios";

export type ModuleAction = "read" | "create" | "update" | "delete";
