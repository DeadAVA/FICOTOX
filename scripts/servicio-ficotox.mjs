#!/usr/bin/env node
/*
 * Servicio de FICOTOX (Fase 12): que el servidor arranque solo al encender la
 * computadora del laboratorio y se reinicie si se cae.
 *
 *   npm run instalar-servicio [-- --simular]     (Windows: consola "Ejecutar como administrador")
 *   npm run quitar-servicio   [-- --simular]
 *
 * Si el servidor se cae, lo relanza el propio lanzador (scripts/start-ficotox.mjs,
 * con espera creciente); el sistema solo vuelve a lanzar al lanzador si este falla:
 * - Windows: tarea programada "FICOTOX" al iniciar el sistema (cuenta SYSTEM, sin
 *   sesion abierta), con reintentos cada minuto si no logra iniciar (definicion XML
 *   con RestartOnFailure) y regla del firewall de Windows para el puerto (perfiles
 *   privado y dominio; no publico).
 * - macOS: LaunchDaemon (/Library/LaunchDaemons/mx.cicese.ficotox.plist) con KeepAlive (Crashed).
 * - Linux: unidad systemd (/etc/systemd/system/ficotox.service) con Restart=on-failure
 *   (salvo el codigo 78: error de arranque que no se arregla solo).
 *   En macOS/Linux el script genera el archivo en <instancia>/servicio/ e imprime
 *   los comandos exactos (requieren sudo); no los ejecuta por su cuenta.
 * - --simular: solo muestra lo que haria (archivos y comandos), sin cambiar nada.
 * El servicio corre scripts/start-ficotox.mjs (build standalone, migraciones al
 * arrancar, registros en <instancia>/logs) sin abrir el navegador.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detenerServidor, entornoDe, root } from "./lib/operacion.mjs";

const accion = process.argv[2];
const simular = process.argv.includes("--simular");
const plataforma = process.env.FICOTOX_PLATAFORMA_PRUEBA || process.platform;
const entorno = entornoDe();
const puerto = String(process.env.PORT || "5000").trim();
const NOMBRE = "FICOTOX";
// Ruta estable de node: en macOS/Linux, la de Homebrew o del sistema si apunta al mismo binario
// (la de Cellar lleva la version y se rompe con `brew upgrade`).
const nodo = (() => {
  if (plataforma === "win32") return process.execPath;
  const actual = fs.realpathSync(process.execPath);
  for (const candidato of ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]) {
    try {
      if (fs.realpathSync(candidato) === actual) return candidato;
    } catch {
      /* no existe */
    }
  }
  return process.execPath;
})();
const lanzador = path.join(root, "scripts", "start-ficotox.mjs");
const carpeta = path.join(entorno.instanceDir, "servicio");

if (!["instalar", "quitar"].includes(accion)) {
  console.error("Uso: node scripts/servicio-ficotox.mjs instalar|quitar [--simular]");
  process.exit(2);
}

const ejecutar = (comando, args, { tolerar = false } = {}) => {
  console.log(`$ ${[comando, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`);
  if (simular) return { status: 0, stdout: "", stderr: "" };
  const r = spawnSync(comando, args, { encoding: "utf8" });
  if (r.status !== 0 && !tolerar) {
    const salida = `${r.stdout || ""}${r.stderr || ""}`.trim();
    const sinPermiso = /acceso denegado|access is denied|0x80070005|requested operation requires elevation|se requiere elevaci/i.test(salida);
    console.error(
      sinPermiso
        ? "❌ Sin permisos de administrador: abre la terminal con «Ejecutar como administrador» (clic derecho sobre PowerShell o Símbolo del sistema) y repite el comando."
        : `❌ Falló (${r.status ?? r.error?.code}): ${salida || r.error?.message || ""}`,
    );
    process.exit(1);
  }
  return r;
};
const escribirArchivo = (archivo, contenido, codificacion = "utf8") => {
  console.log(`${simular ? "(simulación) " : ""}archivo: ${archivo}`);
  if (simular) return;
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, contenido, codificacion);
};
const xml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------- Windows ---------------- */
function windows() {
  const cmd = path.join(carpeta, "ficotox-servicio.cmd");
  const definicion = path.join(carpeta, "ficotox-tarea.xml");
  if (accion === "quitar") {
    ejecutar("schtasks", ["/End", "/TN", NOMBRE], { tolerar: true });
    ejecutar("schtasks", ["/Delete", "/TN", NOMBRE, "/F"], { tolerar: true });
    ejecutar("netsh", ["advfirewall", "firewall", "delete", "rule", `name=${NOMBRE}`], { tolerar: true });
    console.log(simular ? "(simulación) Se retirarían la tarea y la regla del firewall. No se cambió nada." : "✅ Servicio y regla de firewall retirados (la base, los archivos y los respaldos no se tocan).");
    return;
  }
  escribirArchivo(cmd, ["@echo off", "rem Generado por npm run instalar-servicio (FICOTOX, Fase 12).", `cd /d "${root}"`, "set FICOTOX_OPEN_BROWSER=false", `"${nodo}" "${lanzador}"`, ""].join("\r\n"));
  // Tarea al iniciar el sistema, cuenta SYSTEM, sin limite de tiempo, reintento cada minuto hasta 999 veces.
  const tarea = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>FICOTOX: servidor del laboratorio (npm run instalar-servicio)</Description></RegistrationInfo>
  <Triggers><BootTrigger><Enabled>true</Enabled><Delay>PT30S</Delay></BootTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>S-1-5-18</UserId><RunLevel>HighestAvailable</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author"><Exec><Command>${xml(cmd)}</Command><WorkingDirectory>${xml(root)}</WorkingDirectory></Exec></Actions>
</Task>
`;
  escribirArchivo(definicion, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tarea, "utf16le")]));
  ejecutar("schtasks", ["/Create", "/TN", NOMBRE, "/XML", definicion, "/F"]);
  ejecutar("netsh", ["advfirewall", "firewall", "delete", "rule", `name=${NOMBRE}`], { tolerar: true });
  ejecutar("netsh", ["advfirewall", "firewall", "add", "rule", `name=${NOMBRE}`, "dir=in", "action=allow", "protocol=TCP", `localport=${puerto}`, "profile=private,domain"]);
  ejecutar("schtasks", ["/Run", "/TN", NOMBRE]);
  if (simular) {
    console.log(`(simulación) Se instalaría el servicio y se abriría TCP ${puerto} en el firewall (redes privadas y de dominio). No se cambió nada.`);
    return;
  }
  console.log(`✅ Servicio instalado: arranca al encender la computadora; si el servidor se cae, el lanzador lo relanza, y la tarea se reintenta cada minuto si no logra iniciar. Firewall abierto para TCP ${puerto} (redes privadas y de dominio).`);
  console.log("   Ver estado: schtasks /Query /TN FICOTOX /V /FO LIST · Registros: <instancia>\\logs");
  console.log("   La IP de esta computadora: ipconfig (dirección IPv4 del adaptador de la red del laboratorio).");
}

/* ---------------- macOS ---------------- */
function macos() {
  const etiqueta = "mx.cicese.ficotox";
  const destino = `/Library/LaunchDaemons/${etiqueta}.plist`;
  const generado = path.join(carpeta, `${etiqueta}.plist`);
  if (accion === "quitar") {
    console.log("Para retirar el servicio (la base y los archivos no se tocan):");
    console.log(`  sudo launchctl bootout system/${etiqueta}`);
    console.log(`  sudo rm ${destino}`);
    return;
  }
  const usuario = os.userInfo().username;
  escribirArchivo(
    generado,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${etiqueta}</string>
  <key>UserName</key><string>${xml(usuario)}</string>
  <key>WorkingDirectory</key><string>${xml(root)}</string>
  <key>ProgramArguments</key><array><string>${xml(nodo)}</string><string>${xml(lanzador)}</string></array>
  <key>EnvironmentVariables</key><dict><key>FICOTOX_OPEN_BROWSER</key><string>false</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>Crashed</key><true/></dict>
  <key>ThrottleInterval</key><integer>60</integer>
</dict></plist>
`,
  );
  console.log("\nPara instalarlo (arranca al encender la Mac, aun sin sesión abierta, y se reinicia si se cae):");
  console.log(`  sudo cp "${generado}" ${destino}`);
  console.log(`  sudo chown root:wheel ${destino} && sudo chmod 644 ${destino}`);
  console.log(`  sudo launchctl bootstrap system ${destino}`);
  console.log(`Estado: sudo launchctl print system/${etiqueta} · Registros: <instancia>/logs`);
  console.log(`Firewall de macOS: Ajustes › Red › Firewall › Opciones › permitir conexiones entrantes a «node» (${nodo}).`);
  console.log("La IP de esta computadora: ipconfig getifaddr en0");
}

/* ---------------- Linux ---------------- */
function linux() {
  const destino = "/etc/systemd/system/ficotox.service";
  const generado = path.join(carpeta, "ficotox.service");
  if (accion === "quitar") {
    console.log("Para retirar el servicio (la base y los archivos no se tocan):");
    console.log("  sudo systemctl disable --now ficotox");
    console.log(`  sudo rm ${destino} && sudo systemctl daemon-reload`);
    return;
  }
  escribirArchivo(
    generado,
    `[Unit]
Description=FICOTOX (servidor del laboratorio)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${root}
Environment=FICOTOX_OPEN_BROWSER=false
ExecStart=${nodo} ${lanzador}
Restart=on-failure
RestartSec=60
# 78: error de arranque que no se arregla solo (configuracion, migracion, instancia ocupada).
RestartPreventExitStatus=78
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
`,
  );
  console.log("\nPara instalarlo (arranca al encender y se reinicia si se cae):");
  console.log(`  sudo cp "${generado}" ${destino}`);
  console.log("  sudo systemctl daemon-reload && sudo systemctl enable --now ficotox");
  console.log("Estado: systemctl status ficotox · Registros: <instancia>/logs (y journalctl -u ficotox)");
  console.log(`Firewall: sudo ufw allow from <red del laboratorio, p. ej. 192.168.1.0/24> to any port ${puerto} proto tcp`);
  console.log("La IP de esta computadora: hostname -I");
}

console.log(`FICOTOX · ${accion === "instalar" ? "instalar" : "quitar"} servicio (${plataforma})${simular ? " — simulación" : ""}\n`);
if (accion === "instalar" && !fs.existsSync(path.join(root, ".next", "standalone", "server.js"))) {
  console.error("❌ No existe el build de producción. Ejecuta primero: npm run build");
  process.exit(1);
}
// Windows: antes de retirar la tarea se detiene el lanzador con su arbol (schtasks /End puede dejar vivo al hijo del .cmd).
if (plataforma === "win32" && accion === "quitar" && !simular) {
  try {
    await detenerServidor(entorno);
  } catch (error) {
    console.error(`⚠️  ${error.message}`);
  }
}
if (plataforma === "win32") windows();
else if (plataforma === "darwin") macos();
else linux();
