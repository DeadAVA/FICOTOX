// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = Record<string, any>;

export interface SessionUser {
  id?: number;
  role_id?: number | null;
  nombre?: string;
  email?: string;
  rol?: string;
  sub?: string;
  /* Clave del catalogo de avatares; null = el que se deriva del correo. */
  avatar?: string | null;
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
