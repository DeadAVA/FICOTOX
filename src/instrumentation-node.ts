import fs from "node:fs";
import path from "node:path";
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
  escribirBloqueo();
}

/*
 * Fase 10: archivo de bloqueo <instancia>/servidor.lock con el pid del
 * servidor. scripts/restaurar-ficotox.mjs se niega a restaurar sobre la
 * instancia real mientras exista un bloqueo de un proceso vivo. Se quita al salir.
 */
function escribirBloqueo(): void {
  const archivo = path.join(/*turbopackIgnore: true*/ getConfig().INSTANCE_DIR, "servidor.lock");
  try {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, JSON.stringify({ pid: process.pid, puerto: process.env.PORT || null, iniciado_en: new Date().toISOString() }));
  } catch (error) {
    console.warn(`[respaldos] No se pudo escribir ${archivo}: ${(error as Error).message}`);
    return;
  }
  const quitar = () => {
    try {
      if (JSON.parse(fs.readFileSync(archivo, "utf8")).pid === process.pid) fs.rmSync(archivo, { force: true });
    } catch {
      /* ya no existe */
    }
  };
  // Si el proceso termina por una senal sin pasar por "exit", el bloqueo queda huerfano: el script lo ignora porque su pid ya no existe.
  process.once("exit", quitar);
}
