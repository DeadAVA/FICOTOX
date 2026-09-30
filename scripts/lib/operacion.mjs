/*
 * Fase 12: utilidades comunes de los scripts de operacion (migrar, configurar,
 * instancia-nueva, actualizar, verificar-instalacion): entorno (.env), apertura
 * de la base en ambos motores, llave de la bitacora y deteccion del servidor
 * encendido (servidor.lock). Nunca imprimen secretos.
 */
import { spawn, spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { leerClaveSello, resolverClaveSello } from "../../src/lib/shared/audit-chain.mjs";
import { bloqueoVivo } from "../../src/lib/shared/bloqueo.mjs";
import { resolverEntorno } from "../../src/lib/shared/respaldo.mjs";
import { adaptadorMysql, adaptadorSqlite } from "../../src/lib/server/migraciones/motor.mjs";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
export const Sqlite = require("better-sqlite3");

export const entornoDe = (env = process.env) => resolverEntorno(root, env);

/* Servidor encendido sobre esa instancia: servidor.lock con un pid vivo y posterior al arranque del sistema (lo escribe instrumentation-node.ts). */
export function servidorEncendido(instanceDir) {
  return bloqueoVivo(path.join(instanceDir, "servidor.lock"));
}

/* Abre la base de la instalacion. Devuelve { db (adaptador), cerrar, motor }. */
export async function abrirBase(entorno, env = process.env) {
  if (entorno.motor === "sqlite") {
    const conexion = new Sqlite(entorno.sqlitePath);
    conexion.pragma("busy_timeout = 10000");
    return { db: adaptadorSqlite(conexion), cerrar: async () => conexion.close(), motor: "sqlite", conexion };
  }
  const mysql = require("mysql2/promise");
  const url = new URL(String(env.DATABASE_URL).replace(/^mysql\+pymysql:/, "mysql:").replace(/^mariadb:/, "mysql:"));
  const conexion = await mysql.createConnection({ host: url.hostname || "localhost", port: url.port ? Number(url.port) : 3306, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.replace(/^\//, ""), charset: "utf8mb4", timezone: "Z" });
  await conexion.query("SET time_zone = '+00:00'");
  return { db: adaptadorMysql(conexion), cerrar: async () => conexion.end(), motor: "mysql", conexion };
}

/* Llave de la bitacora: la configurada, o se crea (como el servidor) si `crear`. */
export const claveBitacora = (entorno, crear = false) => (crear ? resolverClaveSello(entorno.secretKey, entorno.instanceDir) : leerClaveSello(entorno.secretKey, entorno.instanceDir)?.clave || null);

export const argumento = (args, nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null;
};

/* ---------- Servicio del sistema (Fase 12; ver scripts/servicio-ficotox.mjs) ---------- */

export const plataforma = () => process.env.FICOTOX_PLATAFORMA_PRUEBA || process.platform;
const corre = (comando, args) => {
  const r = spawnSync(comando, args, { encoding: "utf8" });
  return { ok: r.status === 0, salida: `${r.stdout || ""}${r.stderr || ""}` };
};

/* ¿Esta instalado el arranque automatico? { instalado, detalle }. */
export function servicioInstalado() {
  const p = plataforma();
  if (process.env.FICOTOX_PRUEBAS === "1" && process.env.FICOTOX_PRUEBA_SERVICIO) return { instalado: process.env.FICOTOX_PRUEBA_SERVICIO === "si", detalle: "(prueba)" };
  if (p === "win32") {
    const r = corre("schtasks", ["/Query", "/TN", "FICOTOX", "/XML"]);
    return { instalado: r.ok && /BootTrigger/.test(r.salida), detalle: r.ok ? "tarea programada FICOTOX (al iniciar el sistema)" : "no existe la tarea FICOTOX" };
  }
  if (p === "darwin") {
    const instalado = fs.existsSync("/Library/LaunchDaemons/mx.cicese.ficotox.plist");
    return { instalado, detalle: instalado ? "LaunchDaemon mx.cicese.ficotox" : "no existe /Library/LaunchDaemons/mx.cicese.ficotox.plist" };
  }
  const r = corre("systemctl", ["is-enabled", "ficotox"]);
  return { instalado: r.ok && /enabled/.test(r.salida), detalle: r.ok ? "unidad systemd ficotox (enabled)" : "la unidad ficotox no está habilitada" };
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* Proceso vivo (EPERM: existe pero es de otro usuario, p. ej. el servicio). */
const vivo = (pid) => {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
};

/*
 * Detiene el servidor de la instancia sin que el lanzador lo relance (Fase 12).
 * 1. Crea <instancia>/detener: con ese archivo, el lanzador no toma ninguna salida como caida.
 * 2. Windows con servicio: schtasks /End. Despues, el lanzador (pid en lanzador.lock) y
 *    todo su arbol: `taskkill /T /F` en Windows (alli terminar un proceso no es una senal),
 *    SIGTERM en macOS/Linux (el lanzador reenvia la senal al servidor).
 * 3. Sin lanzador vivo (servidor arrancado de otra forma): se termina el servidor.
 * Espera a que servidor y lanzador terminen. Devuelve { estaba, comoServicio }.
 */
/* ¿El pid es un proceso de Node? Antes de terminar un proceso por su pid guardado (podria haberlo reutilizado otro programa). */
function esNode(pid) {
  if (process.env.FICOTOX_PRUEBAS === "1" && process.env.FICOTOX_PLATAFORMA_PRUEBA === "win32") return true; // taskkill emulado en pruebas
  const r = plataforma() === "win32" ? corre("tasklist", ["/FI", `PID eq ${pid}`, "/NH"]) : corre("ps", ["-p", String(pid), "-o", "comm="]);
  // Next renombra el proceso del servidor ("next-server (vX)").
  return r.ok ? /node|next-server/i.test(r.salida) : true;
}

export async function detenerServidor(entorno, { avisar = console.log } = {}) {
  let servidor = servidorEncendido(entorno.instanceDir);
  let pidLanzador = bloqueoVivo(path.join(entorno.instanceDir, "lanzador.lock"))?.pid || null;
  // Un bloqueo cuyo pid hoy es de otro programa (no Node) es huerfano: nunca se termina ese proceso.
  if (servidor && !esNode(servidor.pid)) servidor = null;
  if (pidLanzador && !esNode(pidLanzador)) pidLanzador = null;
  const lanzadorVivo = Boolean(pidLanzador);
  if (!servidor && !lanzadorVivo) {
    // Nada corre: los bloqueos que queden son huerfanos (apagado brusco, taskkill /F) y solo estorban al siguiente arranque.
    for (const f of ["servidor.lock", "lanzador.lock", "detener"]) {
      if (fs.existsSync(path.join(entorno.instanceDir, f))) {
        fs.rmSync(path.join(entorno.instanceDir, f), { force: true });
        avisar(`se retiró ${f} (huérfano: su proceso ya no existe)`);
      }
    }
    return { estaba: false, comoServicio: false };
  }
  const servicio = servicioInstalado().instalado;
  fs.mkdirSync(entorno.instanceDir, { recursive: true });
  fs.writeFileSync(path.join(entorno.instanceDir, "detener"), `${new Date().toISOString()}\n`);
  if (servicio && plataforma() === "win32") corre("schtasks", ["/End", "/TN", "FICOTOX"]);
  if (lanzadorVivo) {
    if (plataforma() === "win32") corre("taskkill", ["/PID", String(pidLanzador), "/T", "/F"]);
    else {
      try {
        process.kill(pidLanzador, "SIGTERM");
      } catch {
        /* ya termino */
      }
    }
  } else if (servidor) {
    try {
      process.kill(Number(servidor.pid), "SIGTERM");
    } catch {
      /* ya termino */
    }
  }
  const siguenVivos = () => servidorEncendido(entorno.instanceDir) || (pidLanzador && vivo(pidLanzador));
  for (let i = 0; i < 60 && siguenVivos(); i++) await esperar(500);
  if (siguenVivos()) {
    // Sin detener: la senal no debe quedar, o la siguiente caida real no se relanzaria.
    fs.rmSync(path.join(entorno.instanceDir, "detener"), { force: true });
    throw new Error(`No se pudo detener el servidor (pid ${servidor?.pid ?? "?"}, lanzador ${pidLanzador ?? "?"}).${plataforma() === "win32" ? " Si corre como servicio, abre PowerShell con «Ejecutar como administrador» y repite npm run detener." : " Detén el servicio a mano y repite."}`);
  }
  // Windows (taskkill /F): ni el lanzador ni el servidor alcanzaron a limpiar. Con los dos procesos
  // ya terminados, sus bloqueos y la senal de parada sobran (asi el siguiente arranque no los encuentra).
  for (const f of ["detener", "servidor.lock", "lanzador.lock"]) fs.rmSync(path.join(entorno.instanceDir, f), { force: true });
  avisar(`servidor detenido (pid ${servidor?.pid ?? "?"}${pidLanzador ? `, lanzador ${pidLanzador}` : ""})`);
  return { estaba: true, comoServicio: servicio };
}

/* Arranca el servidor: por el servicio si esta instalado; si no, el lanzador en segundo plano. */
export function arrancarServidor({ comoServicio }) {
  const p = plataforma();
  if (comoServicio && p === "win32") return corre("schtasks", ["/Run", "/TN", "FICOTOX"]).ok ? { ok: true, como: "servicio" } : { ok: false, comando: "schtasks /Run /TN FICOTOX" };
  if (comoServicio && p === "darwin") return corre("sudo", ["-n", "launchctl", "kickstart", "system/mx.cicese.ficotox"]).ok ? { ok: true, como: "servicio" } : { ok: false, comando: "sudo launchctl kickstart system/mx.cicese.ficotox" };
  if (comoServicio) return corre("sudo", ["-n", "systemctl", "start", "ficotox"]).ok ? { ok: true, como: "servicio" } : { ok: false, comando: "sudo systemctl start ficotox" };
  const hijo = spawn(process.execPath, [path.join(root, "scripts", "start-ficotox.mjs")], { cwd: root, detached: true, stdio: "ignore", env: { ...process.env, FICOTOX_OPEN_BROWSER: "false" } });
  hijo.unref();
  return { ok: true, como: `proceso en segundo plano (pid ${hijo.pid})` };
}

/*
 * GET a /api/health/db en esta computadora. Con HTTPS no se usa la validacion por
 * nombre (el certificado del laboratorio no dice 127.0.0.1): se exige que el
 * servidor presente exactamente el certificado configurado (TLS_CERT, por huella SHA-256).
 */
function consultarSalud(url, huellaCert) {
  const cliente = url.startsWith("https") ? https : http;
  return new Promise((resolve, reject) => {
    const req = cliente.get(url, { rejectUnauthorized: false, timeout: 5000 }, (res) => {
      if (huellaCert) {
        const presentado = res.socket.getPeerCertificate()?.fingerprint256;
        if (presentado !== huellaCert) {
          res.destroy();
          reject(new Error("el servidor presentó un certificado distinto de TLS_CERT"));
          return;
        }
      }
      let cuerpo = "";
      res.on("data", (d) => (cuerpo += d));
      res.on("end", () => {
        let datos = {};
        try {
          datos = JSON.parse(cuerpo);
        } catch {
          /* no es JSON */
        }
        resolve({ status: res.statusCode, ok: res.statusCode === 200 && datos.ok === true });
      });
    });
    req.on("timeout", () => req.destroy(new Error("tiempo agotado")));
    req.on("error", reject);
  });
}

/* Espera a que /api/health/db responda ok. */
export async function esperarSalud(env = process.env, segundos = 120) {
  const cert = String(env.TLS_CERT || "").trim();
  const tls = Boolean(cert);
  let huellaCert = null;
  if (tls) {
    try {
      huellaCert = new X509Certificate(fs.readFileSync(path.resolve(root, cert))).fingerprint256;
    } catch (error) {
      return { ok: false, url: "https://127.0.0.1", ultimo: `no se pudo leer TLS_CERT (${error.message})` };
    }
  }
  // 127.0.0.1 si escucha en todas las interfaces; si HOST es una IP concreta, esa.
  const hostEnv = String(env.HOST || "").trim();
  const host = !hostEnv || ["0.0.0.0", "::"].includes(hostEnv) ? "127.0.0.1" : hostEnv.includes(":") ? `[${hostEnv}]` : hostEnv;
  const url = `${tls ? "https" : "http"}://${host}:${String(env.PORT || "5000").trim()}/api/health/db`;
  const limite = Date.now() + segundos * 1000;
  let ultimo = "sin respuesta";
  while (Date.now() < limite) {
    try {
      const r = await consultarSalud(url, huellaCert);
      if (r.ok) return { ok: true, url };
      ultimo = `HTTP ${r.status}`;
    } catch (error) {
      ultimo = error.code || error.message;
    }
    await esperar(2000);
  }
  return { ok: false, url, ultimo };
}
