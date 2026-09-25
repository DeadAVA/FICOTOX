/* Tipos de secretos.mjs. */
export const JWT_SECRET_INSEGUROS: Set<string>;
export const SECRET_KEY_DESARROLLO: string;
export const SECRET_MIN: number;
export function erroresSecretosProduccion(env: Record<string, string | undefined>): string[];
export function advertenciasLlaveBitacora(env: Record<string, string | undefined>, existeArchivoLlave: boolean): string[];
