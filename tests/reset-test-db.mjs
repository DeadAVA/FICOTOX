/*
 * Regenera instance/test/ficotox-test.sqlite3 y agrega el usuario QA con el que
 * corren las pruebas. Nunca modifica instance/ficotox.sqlite3.
 *
 * Origen: `instance/fixtures/ficotox-base.sqlite3` (una copia congelada de la
 * base antes de cargar datos de demostracion; las pruebas de API suponen folios
 * y catalogos de ese estado). Si no existe, se usa la base real. Se puede forzar
 * con SOURCE_DB=ruta.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const Database = require(path.join(root, "node_modules/better-sqlite3"));
const FIXTURE = path.join(root, "instance/fixtures/ficotox-base.sqlite3");
const source = process.env.SOURCE_DB || (existsSync(FIXTURE) ? FIXTURE : path.join(root, "instance/ficotox.sqlite3"));
// La copia vive en su propia carpeta: el servidor guarda PDFs y archivos junto a la base (dirname de SQLITE_PATH), asi los artefactos de prueba no se mezclan con los reales.
export const TEST_DB = process.env.TEST_DB || path.join(root, "instance/test/ficotox-test.sqlite3");
export const QA_USER = { email: "qa@ficotox.local", password: "QaFicotox2026!" };

const hash = (plain) => {
  const salt = randomBytes(16);
  return `scrypt$16384$${salt.toString("base64")}$${scryptSync(plain, salt, 64, { N: 16384 }).toString("base64")}`;
};

export function resetTestDb() {
  if (!existsSync(source)) throw new Error(`No existe la base de origen: ${source}`);
  const dir = path.dirname(TEST_DB);
  if (dir !== path.dirname(source) && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const suffix of ["", "-wal", "-shm", "-journal"]) if (existsSync(TEST_DB + suffix)) rmSync(TEST_DB + suffix);
  copyFileSync(source, TEST_DB);
  const db = new Database(TEST_DB);
  db.pragma("journal_mode = DELETE");
  db.prepare("DELETE FROM usuarios WHERE email = ?").run(QA_USER.email);
  db.prepare("INSERT INTO usuarios (nombre, email, activo, id_rol, auth_provider, password_hash) VALUES (?, ?, 1, 1, 'local', ?)").run("QA Ficotox", QA_USER.email, hash(QA_USER.password));
  db.close();
  return TEST_DB;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Base de prueba regenerada:", resetTestDb());
}
