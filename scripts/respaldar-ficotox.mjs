#!/usr/bin/env node
/*
 * Respaldo de FICOTOX desde la terminal (Fase 10).
 *
 *   npm run respaldar                         # respaldo local con la llave de la bitacora
 *   npm run respaldar -- --sin-llave          # sin la llave (p. ej. para copiarlo fuera)
 *   npm run respaldar -- --json               # salida JSON (la usa scripts/backup_ficotox.py)
 *   npm run respaldar -- --etiqueta "antes de actualizar"
 *
 * Usa la misma implementacion que el servidor (src/lib/shared/respaldo.mjs):
 * snapshot en linea de SQLite (funciona con el servidor encendido), archivos de
 * la instancia, manifest.json y la llave separada en llave/. Despues aplica la
 * retencion (RESPALDO_RETENCION, 30 por omision; nunca borra el ultimo respaldo
 * verificado). Lee .env (o FICOTOX_ENV_FILE) como el servidor. No escribe en la
 * bitacora: el registro de un respaldo por terminal es su manifest; los que se
 * crean desde la interfaz si quedan en la bitacora.
 * MySQL/MariaDB: usa mysqldump (scripts/backup_ficotox.py lo hace).
 */
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { aplicarRetencion, crearRespaldo, resolverEntorno } from "../src/lib/shared/respaldo.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (nombre) => args.includes(nombre);
const valor = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};

const entorno = resolverEntorno(root);
if (entorno.motor !== "sqlite") {
  console.error("Esta instalación usa MySQL/MariaDB: respalda la base con mysqldump (scripts/backup_ficotox.py --target database).");
  process.exit(2);
}
const Sqlite = createRequire(import.meta.url)("better-sqlite3");
try {
  const { id, carpeta, manifest } = await crearRespaldo({ Sqlite, sqlitePath: entorno.sqlitePath, instanceDir: entorno.instanceDir, respaldosDir: entorno.respaldosDir, secretKey: entorno.secretKey, baseDir: root, incluirLlave: !flag("--sin-llave"), etiqueta: valor("--etiqueta") });
  const eliminados = flag("--sin-retencion") ? [] : aplicarRetencion(entorno.respaldosDir, entorno.retencion);
  if (flag("--json")) {
    console.log(JSON.stringify({ id, carpeta, incluye_llave: manifest.llave.incluida, archivos: manifest.archivos.length, bitacora: manifest.bitacora, eliminados }));
  } else {
    console.log(`Respaldo creado: ${carpeta}`);
    console.log(`  Base: ${manifest.base.tamano} bytes, integrity_check ${manifest.base.integrity_check}`);
    console.log(`  Archivos: ${manifest.archivos.length} · bitácora: ${manifest.bitacora.entradas} entradas (última #${manifest.bitacora.ultimo_id ?? "—"})`);
    console.log(`  Llave de la bitácora: ${manifest.llave.incluida ? `incluida en ${path.join(carpeta, "llave")} (guárdala aparte, en un medio controlado)` : "no incluida"}`);
    if (eliminados.length) console.log(`  Retención (${entorno.retencion}): se eliminaron ${eliminados.join(", ")}`);
  }
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
