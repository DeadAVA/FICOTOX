/*
 * Regenera instance/test/ficotox-test.sqlite3 a partir de la base congelada
 * `instance/fixtures/ficotox-base.sqlite3` (base vacia + roles y usuarios de la
 * Fase 0; se genera con `npm run test:fixture`). Nunca modifica
 * instance/ficotox.sqlite3.
 *
 * Solo en la copia de prueba:
 * - crea el rol "QA pruebas automatizadas" (G en todos los modulos) y el usuario
 *   qa@ficotox.local con ese rol vigente, con el que corren las suites;
 * - asigna contrasenas aleatorias a los usuarios del catalogo de roles y las
 *   deja en instance/test/credenciales-roles.json para tests/api-roles.mjs.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const Database = require(path.join(root, "node_modules/better-sqlite3"));
export const FIXTURE = path.join(root, "instance/fixtures/ficotox-base.sqlite3");
const REAL_DB = path.join(root, "instance/ficotox.sqlite3");
const source = process.env.SOURCE_DB || FIXTURE;
// La copia vive en su propia carpeta: el servidor guarda PDFs y archivos junto a la base (dirname de SQLITE_PATH), asi los artefactos de prueba no se mezclan con los reales.
export const TEST_DB = process.env.TEST_DB || path.join(root, "instance/test/ficotox-test.sqlite3");
export const CREDENCIALES = path.join(path.dirname(TEST_DB), "credenciales-roles.json");
export const QA_USER = { email: "qa@ficotox.local", password: "QaFicotox2026!" };
export const QA_ROLE = "QA pruebas automatizadas";

const hash = (plain) => {
  const salt = randomBytes(16);
  return `scrypt$16384$${salt.toString("base64")}$${scryptSync(plain, salt, 64, { N: 16384 }).toString("base64")}`;
};

export function resetTestDb() {
  if (!existsSync(source)) throw new Error(`No existe la base de origen: ${source}. Generala con: npm run test:fixture`);
  if (path.resolve(TEST_DB) === path.resolve(REAL_DB)) throw new Error("TEST_DB no puede ser la base real");
  const dir = path.dirname(TEST_DB);
  if (dir !== path.dirname(source) && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const suffix of ["", "-wal", "-shm", "-journal"]) if (existsSync(TEST_DB + suffix)) rmSync(TEST_DB + suffix);
  copyFileSync(source, TEST_DB);
  // Si la base congelada se sello con una llave propia (sin SECRET_KEY), la copia la necesita.
  const key = path.join(path.dirname(source), "auditoria.key");
  if (existsSync(key)) copyFileSync(key, path.join(dir, "auditoria.key"));

  const db = new Database(TEST_DB);
  db.pragma("journal_mode = DELETE");
  db.transaction(() => {
    const qaPrevio = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(QA_USER.email);
    if (qaPrevio) {
      db.prepare("DELETE FROM usuario_roles WHERE usuario_id = ?").run(qaPrevio.id);
      db.prepare("DELETE FROM usuarios WHERE id = ?").run(qaPrevio.id);
    }
    let rol = db.prepare("SELECT id FROM roles WHERE nombre = ?").get(QA_ROLE);
    if (!rol) rol = { id: Number(db.prepare("INSERT INTO roles (nombre, descripcion, clave, es_sistemico, activo) VALUES (?, 'Solo en la base de prueba', 'qa_pruebas', 0, 1)").run(QA_ROLE).lastInsertRowid) };
    // Modelo de la Fase 1: G (todas las acciones, alcance total) en cada modulo del catalogo.
    db.prepare("DELETE FROM rol_acciones WHERE id_rol = ?").run(rol.id);
    for (const { clave } of db.prepare("SELECT clave FROM permisos WHERE activo = 1").all()) {
      db.prepare("INSERT INTO rol_acciones (id_rol, modulo, accion, alcance) VALUES (?, ?, 'G', 'total')").run(rol.id, clave);
    }
    const qaId = Number(db.prepare("INSERT INTO usuarios (nombre, email, activo, id_rol, auth_provider, password_hash) VALUES (?, ?, 1, ?, 'local', ?)").run("QA Ficotox", QA_USER.email, rol.id, hash(QA_USER.password)).lastInsertRowid);
    db.prepare("INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, vigente_hasta, motivo, asignado_por, asignado_en) VALUES (?, ?, '2000-01-01', NULL, 'Rol de pruebas automatizadas (solo base de prueba)', NULL, ?)").run(qaId, rol.id, new Date().toISOString());

    const credenciales = {};
    for (const { id, email } of db.prepare("SELECT id, email FROM usuarios WHERE email LIKE '%@ficotox.local' AND email <> ?").all(QA_USER.email)) {
      credenciales[email] = `Prueba-${randomBytes(9).toString("base64url")}`;
      db.prepare("UPDATE usuarios SET password_hash = ? WHERE id = ?").run(hash(credenciales[email]), id);
    }
    writeFileSync(CREDENCIALES, JSON.stringify(credenciales, null, 2));
  })();
  db.close();
  return TEST_DB;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Base de prueba regenerada:", resetTestDb());
}
