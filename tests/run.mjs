/*
 * Corredor de pruebas: regenera la base de prueba, levanta `next dev` en el
 * puerto 3100 apuntando a ella, corre las pruebas de API y (si hay un Chrome
 * de Playwright disponible) las de navegador, y apaga el servidor.
 *
 *   npm test              # API + navegador
 *   npm test -- --api     # solo API
 *   CHROME_PATH=/ruta/a/chrome npm test
 *
 * Antes de escribir nada comprueba dos cosas: que el puerto este libre (para no
 * atacar un servidor ajeno que ya lo ocupe) y que el servidor levantado este
 * usando la copia de prueba y no `instance/ficotox.sqlite3`.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resetTestDb } from "./reset-test-db.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const PORT = Number(process.env.TEST_PORT || 3100);
const onlyApi = process.argv.includes("--api");
const chrome = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");

const run = (file, extraEnv = {}) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [file], { cwd: root, stdio: "inherit", env: { ...process.env, ...extraEnv } });
    child.on("exit", (code) => resolve(code ?? 1));
  });

/*
 * El puerto debe estar libre: si algo lo ocupa, puede ser un servidor sobre la
 * base real. Se escucha sin fijar host para cubrir tambien IPv6 (`[::]`), que es
 * donde queda `next dev` por omision.
 */
const puertoLibre = () =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(PORT);
  });

const waitFor = async (url, ms = 60_000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json().catch(() => ({}));
    } catch {
      /* todavia no */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
};

if (!(await puertoLibre())) {
  console.error(`\nEl puerto ${PORT} ya esta ocupado. Cierralo antes de correr las pruebas:\n  lsof -ti :${PORT} | xargs kill\nNo se ejecuta nada: el proceso que lo ocupa podria estar usando la base real.`);
  process.exit(1);
}

const testDb = resetTestDb();
const esperado = path.basename(testDb);
console.log(`Base de prueba: ${testDb}`);

let server = null;
const stop = () => {
  if (server && !server.killed) server.kill("SIGTERM");
  server = null;
};
process.on("exit", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

/* Levanta el servidor sobre la copia y no devuelve hasta confirmar que es esa base. */
const arrancarServidor = async () => {
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: root, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, SQLITE_PATH: testDb, PORT: String(PORT) } });
  const salud = await waitFor(`http://localhost:${PORT}/api/health/db`);
  if (!salud) throw new Error("El servidor de pruebas no respondio");
  if (salud.archivo !== esperado) {
    throw new Error(`El servidor del puerto ${PORT} esta usando "${salud.archivo}" y no la base de prueba "${esperado}". Se aborta para no tocar datos reales.`);
  }
};

let failed = 0;
try {
  await arrancarServidor();
  const api = { BASE: `http://localhost:${PORT}/api`, TEST_DB_PATH: testDb, BETTER_SQLITE3: path.join(root, "node_modules/better-sqlite3") };
  for (const file of ["api-dsp.mjs", "api-sgc.mjs"]) {
    console.log(`\n=== ${file}`);
    failed += (await run(path.join(here, file), api)) ? 1 : 0;
  }

  // Reinicio: los permisos de un rol no deben crecer solos al arrancar de nuevo.
  console.log("\n=== api-permisos.mjs (tras reiniciar el servidor)");
  stop();
  await new Promise((r) => setTimeout(r, 1500));
  await arrancarServidor();
  failed += (await run(path.join(here, "api-permisos.mjs"), api)) ? 1 : 0;

  if (!onlyApi) {
    if (!existsSync(chrome)) {
      console.log(`\n(navegador omitido: no se encontro Chrome en ${chrome}; define CHROME_PATH)`);
    } else {
      for (const file of ["dsp.mjs", "sgc.mjs"]) {
        console.log(`\n=== ui/${file}`);
        failed += (await run(path.join(here, "ui", file), { BASE: `http://localhost:${PORT}`, CHROME_PATH: chrome })) ? 1 : 0;
      }
    }
  }

  // Al final: rompe la bitacora a proposito, asi que nada puede correr despues.
  console.log("\n=== api-integridad.mjs");
  failed += (await run(path.join(here, "api-integridad.mjs"), api)) ? 1 : 0;
} finally {
  stop();
}
console.log(failed ? `\n${failed} suite(s) con fallos` : "\nTodas las suites pasaron");
process.exit(failed ? 1 : 0);
