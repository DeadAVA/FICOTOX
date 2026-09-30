#!/usr/bin/env node
/*
 * Detener o reiniciar FICOTOX (Fase 12).
 *
 *   npm run detener      (Windows con servicio: terminal "Ejecutar como administrador")
 *   npm run reiniciar
 *
 * Detener: deja la senal <instancia>/detener y termina al lanzador con su arbol
 * (Windows: schtasks /End + taskkill /T /F; macOS/Linux: SIGTERM), de modo que la
 * supervision del lanzador no lo relance (scripts/lib/operacion.mjs, detenerServidor).
 * Reiniciar: detener y volver a arrancar como estaba (el servicio si esta instalado;
 * si no, el lanzador en segundo plano), y esperar a que /api/health/db responda.
 * Codigos: 0 bien, 1 fallo.
 */
import { arrancarServidor, detenerServidor, entornoDe, esperarSalud, servicioInstalado } from "./lib/operacion.mjs";

const reiniciar = process.argv.includes("--reiniciar");
const entorno = entornoDe();
try {
  const estado = await detenerServidor(entorno);
  if (!estado.estaba) console.log("FICOTOX no estaba encendido.");
  if (!reiniciar) process.exit(0);
  const comoServicio = estado.estaba ? estado.comoServicio : servicioInstalado().instalado;
  const r = arrancarServidor({ comoServicio });
  if (!r.ok) {
    console.error(`⚠️  Arráncalo con: ${r.comando}`);
    process.exit(1);
  }
  const salud = await esperarSalud(process.env, 180);
  if (!salud.ok) {
    console.error(`❌ No respondió en ${salud.url} (${salud.ultimo}). Revisa <instancia>/logs.`);
    process.exit(1);
  }
  console.log(`✅ FICOTOX reiniciado (${r.como}); responde en ${salud.url}.`);
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
