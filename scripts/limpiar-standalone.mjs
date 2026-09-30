#!/usr/bin/env node
/*
 * Fase 11 · Parte 0: el paquete .next/standalone no debe llevar datos ni secretos.
 * Se ejecuta solo despues de `npm run build` (script "postbuild").
 *
 * - Quita del paquete: .env*, instance/, backups/, instance-restaurada/, tests/,
 *   marimo/ y cualquier *.sqlite3, *.sqlite, *.db, *.key (fuera de node_modules).
 * - Verifica que no quede ninguno; si queda algo, sale con codigo 1 (el build falla).
 *
 * El servidor standalone no los necesita: scripts/start-ficotox.mjs carga el .env
 * de la raiz, fija FICOTOX_BASE_DIR (la raiz del proyecto) y SQLITE_PATH absoluto,
 * asi que la base, la llave y los archivos se leen de la instancia real, fuera del paquete.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paquete = path.join(root, ".next", "standalone");
const CARPETAS = new Set(["instance", "backups", "instance-restaurada", "tests", "marimo"]);
const ARCHIVO_PROHIBIDO = (nombre) => /^\.env(\..*)?$/.test(nombre) || /\.(sqlite3|sqlite|db|key)$/i.test(nombre);

/* Recorre el paquete (sin node_modules) y devuelve lo prohibido. */
function prohibidos(dir, raiz = true) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      if (raiz && CARPETAS.has(e.name)) out.push(ruta);
      else out.push(...prohibidos(ruta, false));
    } else if (ARCHIVO_PROHIBIDO(e.name)) out.push(ruta);
  }
  return out;
}

if (!fs.existsSync(paquete)) {
  console.log("[standalone] no hay .next/standalone; nada que limpiar");
  process.exit(0);
}
const quitar = prohibidos(paquete);
for (const ruta of quitar) fs.rmSync(ruta, { recursive: true, force: true });
const quedan = prohibidos(paquete);
if (quedan.length) {
  console.error(`[standalone] ERROR: el paquete aun contiene datos o secretos:\n${quedan.map((r) => `  - ${path.relative(root, r)}`).join("\n")}`);
  process.exit(1);
}
// Fase 12: version del codigo con que se compilo (la compara npm run verificar-instalacion).
{
  const { versionApp } = await import("../src/lib/shared/respaldo.mjs");
  fs.writeFileSync(path.join(paquete, "ficotox-build.json"), `${JSON.stringify({ ...versionApp(root), compilado_en: new Date().toISOString() })}\n`);
}
console.log(`[standalone] paquete limpio${quitar.length ? ` (se quitaron: ${quitar.map((r) => path.relative(paquete, r)).join(", ")})` : ""}: sin .env, bases, llaves ni respaldos`);
