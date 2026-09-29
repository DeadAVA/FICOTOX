/* Tipos de audit-chain.mjs (sello encadenado de la bitacora). */
export type Row = Record<string, unknown>;

export interface EntradaAuditoria {
  accion: string;
  entidad: string;
  entidadId?: number | string | null;
  referencia?: string | null;
  motivo?: string | null;
  antes?: Row | null;
  despues?: Row | null;
  detalle?: Record<string, unknown> | null;
}

export interface ActorAuditoria {
  sub?: string | number | null;
  nombre?: string | null;
  email?: string | null;
}

export interface RegistroAuditoria {
  fecha_hora: string;
  usuario_id: number | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  referencia: string | null;
  motivo: string | null;
  cambios_json: string;
  datos_anteriores_json: string | null;
  datos_nuevos_json: string | null;
  hash_anterior: string | null;
}

export const VOLATILE: Set<string>;
export const SECRET_KEY_DESARROLLO: string;
export const COLUMNAS_AUDITORIA: string[];
export function stableJson(value: unknown): string;
export function auditSnapshot(row: Row | null | undefined): Row | null;
export function auditDiff(antes: Row | null, despues: Row | null): Record<string, { antes: unknown; despues: unknown }>;
export function construirRegistro(entry: EntradaAuditoria, actor: ActorAuditoria | null | undefined, hashAnterior: string | null | undefined, fechaHora?: string): RegistroAuditoria | null;
export function registroDesdeFila(row: Row): Record<string, unknown>;
export function sellar(registro: object, clave: string): string;
export function primerEslabonRoto(filas: Row[], clave: string): number | null;
export function resolverClaveSello(secretKey: string | undefined | null, instanceDir: string): string;

export interface VerificacionCadena {
  ok: boolean;
  total: number;
  primer_error: number | null;
  filas_faltantes_al_final: number;
  filas_faltantes_intermedias: number;
  triggers_ok: boolean;
}
export function evaluarCadena(filas: Row[], clave: string, ultimoIdAsignado: number | null | undefined, triggers: number): VerificacionCadena;
export function leerClaveSello(secretKey: string | undefined | null, instanceDir: string): { clave: string; origen: "SECRET_KEY" | "auditoria.key" } | null;
