#!/usr/bin/env node
/*
 * Asigna o restablece la contrasena local de un usuario (solo SQLite).
 *
 *   node scripts/set-password.mjs <correo> <contrasena>
 *
 * Lee SQLITE_PATH de .env (o usa instance/ficotox.sqlite3) y guarda el hash
 * con el mismo formato que src/lib/server/password.ts (scrypt).
 */
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: node scripts/set-password.mjs <correo> <contrasena>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contrasena debe tener al menos 8 caracteres");
  process.exit(1);
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim();
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
    if (!(name in process.env)) process.env[name] = value;
  }
}
loadEnvFile(path.join(rootDir, ".env"));

if ((process.env.DATABASE_URL || "").trim()) {
  console.error("Este script solo aplica a SQLite. Para MySQL cambia la contrasena desde la pantalla de Usuarios.");
  process.exit(1);
}

const configured = (process.env.SQLITE_PATH || "").trim();
const sqlitePath = configured ? path.resolve(rootDir, configured) : path.join(rootDir, "instance", "ficotox.sqlite3");
if (!fs.existsSync(sqlitePath)) {
  console.error(`No existe la base de datos: ${sqlitePath}`);
  process.exit(1);
}

const Database = require("better-sqlite3");
const db = new Database(sqlitePath);
const columns = db.prepare("PRAGMA table_info(usuarios)").all().map((column) => column.name);
if (!columns.includes("password_hash")) {
  db.exec("ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL");
}

const salt = randomBytes(16);
const derived = scryptSync(password, salt, 64, { N: 16384 });
const hash = `scrypt$16384$${salt.toString("base64")}$${derived.toString("base64")}`;

const result = db.prepare("UPDATE usuarios SET password_hash = ? WHERE LOWER(email) = LOWER(?)").run(hash, email);
db.close();

if (result.changes === 0) {
  console.error(`No se encontro el usuario ${email}`);
  process.exit(1);
}
console.log(`Contrasena actualizada para ${email}`);
