#!/usr/bin/env node
/*
 * Lanzador de FICOTOX (build standalone de Next.js).
 *
 * Pseudocodigo:
 * 1. Cargar variables de entorno desde FICOTOX_ENV_FILE o .env de la raiz.
 * 2. Resolver ruta de SQLite (SQLITE_PATH o instance/ficotox.sqlite3).
 * 3. Verificar que exista el build standalone (npm run build) y copiar los
 *    recursos estaticos que Next.js no incluye en standalone.
 * 4. Arrancar el servidor Node autocontenido en HOST:PORT.
 * 5. Abrir el navegador apuntando a la IP LAN si el host es 0.0.0.0.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const configuredEnv = (process.env.FICOTOX_ENV_FILE || "").trim();
if (configuredEnv) {
  loadEnvFile(path.resolve(configuredEnv));
} else {
  loadEnvFile(path.join(rootDir, ".env"));
}

const truthy = (name, fallback = "false") => ["1", "true", "yes", "on"].includes(String(process.env[name] ?? fallback).trim().toLowerCase());

function resolveSqlitePath() {
  const configured = (process.env.SQLITE_PATH || "").trim();
  if (configured) return path.resolve(rootDir, configured);
  return path.join(rootDir, "instance", "ficotox.sqlite3");
}

if (!(process.env.DATABASE_URL || "").trim()) {
  const sqlitePath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  process.env.SQLITE_PATH = sqlitePath;
}
process.env.FICOTOX_BASE_DIR = rootDir;

const standaloneDir = path.join(rootDir, ".next", "standalone");
const serverFile = path.join(standaloneDir, "server.js");
if (!fs.existsSync(serverFile)) {
  console.error("No existe el build de produccion. Ejecuta primero: npm run build");
  process.exit(1);
}

// Next.js no copia public/ ni .next/static al standalone: se sincronizan aqui.
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
};
copyDir(path.join(rootDir, "public"), path.join(standaloneDir, "public"));
copyDir(path.join(rootDir, ".next", "static"), path.join(standaloneDir, ".next", "static"));

const host = (process.env.HOST || process.env.FLASK_HOST || "0.0.0.0").trim();
const port = String(process.env.PORT || process.env.FLASK_PORT || "5000").trim();

function detectLanIp() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return "127.0.0.1";
}

const browserHost = ["0.0.0.0", "::", ""].includes(host) ? detectLanIp() : host;
const url = `http://${browserHost}:${port}`;

const child = spawn(process.execPath, [serverFile], {
  cwd: standaloneDir,
  env: { ...process.env, HOSTNAME: host, PORT: port, NODE_ENV: "production" },
  stdio: "inherit",
});

console.log(`FICOTOX escuchando en http://${host}:${port}`);

if (truthy("FICOTOX_OPEN_BROWSER", process.env.FLASK_OPEN_BROWSER ?? "true")) {
  setTimeout(() => {
    const command = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
    spawn(command[0], command[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  }, 1000);
}

child.on("exit", (code) => process.exit(code ?? 0));
