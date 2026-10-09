export interface Bloqueo {
  pid: number;
  puerto: string | null;
  iniciado_en: string | null;
}
export function arranqueDelSistema(): number;
export function leerBloqueo(archivo: string): Bloqueo | null;
export function bloqueoVivo(archivo: string, opciones?: { propio?: number | null }): Bloqueo | null;
