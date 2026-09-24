/*
 * Regenera la base congelada de las pruebas, `instance/fixtures/ficotox-base.sqlite3`:
 * una base vacia creada por el arranque del servidor, mas los roles y usuarios
 * del reinicio de la Fase 0 (scripts/seed-roles-usuarios.mjs).
 *
 *   npm run test:fixture
 *
 * 1. Levanta `next dev` en un puerto libre (TEST_FIXTURE_PORT, 3101) sobre una
 *    base nueva en instance/test-fixture/ y abre /api/health/db para que el
 *    arranque cree el esquema; comprueba que el servidor usa esa base.
 * 2. Lo detiene y corre el script de roles con contrasenas aleatorias (las
 *    pruebas las vuelven a generar en cada corrida: reset-test-db.mjs).
 * 3. Copia la base (y la llave de la bitacora, si se genero una) a instance/fixtures/.
 * Nunca toca instance/ficotox.sqlite3.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.TEST_FIXTURE_PORT || 3101);
const BUILD_DIR = path.join(root, "instance/test-fixture");
const BUILD_DB = path.join(BUILD_DIR, "ficotox-fixture.sqlite3");
export const FIXTURE_DIR = path.join(root, "instance/fixtures");
export const FIXTURE = path.join(FIXTURE_DIR, "ficotox-base.sqlite3");

const puertoLibre = () =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(false));
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(PORT);
  });

const waitFor = async (url, ms = 90_000) => {
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

const runNode = (args, env) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
    child.on("exit", (code) => resolve(code ?? 1));
  });

export async function buildFixture() {
  if (!(await puertoLibre())) throw new Error(`El puerto ${PORT} esta ocupado; no se puede generar la base de prueba.`);
  rmSync(BUILD_DIR, { recursive: true, force: true });
  mkdirSync(BUILD_DIR, { recursive: true });

  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], { cwd: root, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, SQLITE_PATH: BUILD_DB, PORT: String(PORT) } });
  const stopped = new Promise((resolve) => server.once("exit", resolve));
  try {
    const salud = await waitFor(`http://localhost:${PORT}/api/health/db`);
    if (!salud) throw new Error("El servidor no respondio al crear la base de prueba");
    if (salud.archivo !== path.basename(BUILD_DB)) throw new Error(`El servidor usa "${salud.archivo}" y no la base nueva; se aborta.`);
  } finally {
    server.kill("SIGTERM");
    await stopped;
  }

  const personas = JSON.parse(readFileSync(path.join(root, "scripts/seed-usuarios.example.json"), "utf8")).usuarios.map((p) => ({ ...p, password: `Prueba-${randomBytes(9).toString("base64url")}` }));
  const usuariosFile = path.join(BUILD_DIR, "usuarios.json");
  writeFileSync(usuariosFile, JSON.stringify({ usuarios: personas }));
  const code = await runNode(["scripts/seed-roles-usuarios.mjs", "--db", BUILD_DB, "--usuarios", usuariosFile], { FICOTOX_INSTANCE_DIR: BUILD_DIR });
  if (code !== 0) throw new Error("El script de roles y usuarios fallo al generar la base de prueba");

  mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const suffix of ["", "-wal", "-shm", "-journal"]) if (existsSync(FIXTURE + suffix)) rmSync(FIXTURE + suffix);
  copyFileSync(BUILD_DB, FIXTURE);
  const key = path.join(BUILD_DIR, "auditoria.key");
  const fixtureKey = path.join(FIXTURE_DIR, "auditoria.key");
  if (existsSync(key)) copyFileSync(key, fixtureKey);
  else if (existsSync(fixtureKey)) rmSync(fixtureKey);
  rmSync(BUILD_DIR, { recursive: true, force: true });
  return FIXTURE;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Base de prueba congelada regenerada:", await buildFixture());
}
