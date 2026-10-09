/*
 * Fase 11 · Parte 0: el build standalone no lleva datos, llaves ni .env, y el
 * servidor que se arranca con scripts/start-ficotox.mjs usa la instancia de
 * afuera del paquete (SQLITE_PATH), no una copia empaquetada.
 *
 *   npm run build && node tests/standalone.mjs     (tambien lo corre `npm test` si hay build)
 *
 * Usa una base temporal (copia de la base congelada de pruebas) con un nombre
 * propio y un puerto libre; nunca la base real.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paquete = path.join(root, ".next", "standalone");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
if (!fs.existsSync(path.join(paquete, "server.js"))) {
  console.log("(sin build standalone: ejecuta `npm run build`; prueba omitida)");
  process.exit(0);
}

/* 1. Contenido del paquete. */
const encontrados = [];
const recorrer = (dir, raiz = true) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      if (raiz && ["instance", "backups", "instance-restaurada", "tests", "marimo"].includes(e.name)) encontrados.push(ruta);
      else recorrer(ruta, false);
    } else if (/^\.env(\..*)?$/.test(e.name) || /\.(sqlite3|sqlite|db|key)$/i.test(e.name) || e.name === "auditoria.key") encontrados.push(ruta);
  }
};
recorrer(paquete);
check("el paquete standalone no trae .env, bases (.sqlite3), llaves (.key), instance/, backups/ ni tests/", encontrados.length === 0, encontrados.map((r) => path.relative(root, r)).join(", "));

/* 2. Arranca con una instancia de afuera y la usa. */
const dir = path.join(root, "instance", "test", `standalone-${Date.now()}`);
fs.mkdirSync(dir, { recursive: true });
const origen = [path.join(root, "instance", "fixtures", "ficotox-base.sqlite3"), path.join(root, "instance", "test", "ficotox-test.sqlite3")].find((f) => fs.existsSync(f));
const base = path.join(dir, "standalone-prueba.sqlite3");
if (origen) fs.copyFileSync(origen, base);
const puerto = await new Promise((resolve) => {
  const srv = net.createServer();
  srv.listen(0, "127.0.0.1", () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});
const hijo = spawn(process.execPath, [path.join(root, "scripts", "start-ficotox.mjs")], {
  cwd: root,
  stdio: ["ignore", "ignore", "pipe"],
  // Grupo de procesos propio: al terminar se detienen el lanzador y el servidor que arranca.
  detached: true,
  env: { ...process.env, FICOTOX_ENV_FILE: path.join(dir, "sin.env"), SQLITE_PATH: base, DATABASE_URL: "", FICOTOX_INSTANCE_DIR: "", HOST: "127.0.0.1", PORT: String(puerto), FICOTOX_OPEN_BROWSER: "false", JWT_SECRET: randomBytes(32).toString("hex"), SECRET_KEY: randomBytes(32).toString("hex"), NODE_ENV: "production" },
});
let salud = null;
for (let i = 0; i < 60 && !salud; i += 1) {
  await new Promise((r) => setTimeout(r, 500));
  salud = await fetch(`http://127.0.0.1:${puerto}/api/health/db`).then((r) => r.json()).catch(() => null);
}
check("el standalone arranca y lee la base indicada fuera del paquete", salud?.ok === true && salud?.archivo === "standalone-prueba.sqlite3", JSON.stringify(salud));
check("la instancia (archivo de bloqueo) esta fuera del paquete, junto a esa base", fs.existsSync(path.join(dir, "servidor.lock")) && !fs.existsSync(path.join(paquete, "instance")), dir);
try {
  process.kill(-hijo.pid, "SIGTERM");
} catch {
  hijo.kill("SIGTERM");
}
await new Promise((r) => setTimeout(r, 800));
fs.rmSync(dir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
