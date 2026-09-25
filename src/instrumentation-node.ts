import { advertenciaLlaveBitacora } from "./lib/server/audit";
import { getConfig } from "./lib/server/config";
import { erroresSecretosProduccion } from "./lib/shared/secretos.mjs";

/*
 * Verificacion de arranque (solo runtime Node.js; ver instrumentation.ts).
 * En produccion no arranca con un JWT_SECRET inseguro; la llave de la bitacora
 * solo genera advertencias (nunca se cambia aqui).
 */
export function verificarArranque(): void {
  getConfig();
  const errores = erroresSecretosProduccion(process.env);
  if (errores.length) {
    console.error(`[seguridad] FICOTOX no arranca en produccion: ${errores.join("; ")}. Define un JWT_SECRET aleatorio de al menos 32 caracteres en .env.`);
    process.exit(1);
  }
  for (const aviso of advertenciaLlaveBitacora()) console.warn(`[seguridad] ${aviso}`);
}
