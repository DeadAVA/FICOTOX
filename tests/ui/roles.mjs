/*
 * Menu por rol (Fase 0): cada usuario del catalogo inicia sesion en el navegador
 * y la barra lateral muestra solo los destinos de sus modulos. La tabla de
 * permisos se repite aqui a proposito (independiente del catalogo del script).
 * Documentos sigue apagado (FEATURES.documentos = false): nunca aparece.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3100";
const executablePath = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const credenciales = JSON.parse(readFileSync(process.env.CREDENCIALES_ROLES, "utf8"));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const INVENTARIO = { reactivos: "/inventario/reactivos", consumibles: "/inventario/consumibles", equipos: "/inventario/equipos", mantenimiento: "/inventario/mantenimiento", movimientos: "/movimientos" };
const TODOS = ["dashboard", "reactivos", "consumibles", "equipos", "mantenimiento", "movimientos", "muestras", "informes", "aprobaciones", "documentos", "auditoria", "roles", "usuarios"];
const USUARIOS = [
  ["Administrador técnico del sistema", "jorge.ramirez@ficotox.local", ["dashboard", "usuarios", "roles", "auditoria"]],
  ["Responsable General", "patricia.luna@ficotox.local", TODOS],
  ["Coordinador/a de Mejora Continua", "ana.torres@ficotox.local", TODOS],
  ["Coordinador/a del Área Técnica", "ricardo.medina@ficotox.local", ["dashboard", "muestras", "informes", "aprobaciones", "reactivos", "consumibles", "equipos", "mantenimiento", "movimientos", "documentos"]],
  ["Coordinador/a de Investigación y Desarrollo", "gabriela.ortiz@ficotox.local", ["dashboard", "muestras", "equipos", "reactivos", "consumibles", "movimientos", "documentos"]],
  ["Técnico Analista", "luis.castro@ficotox.local", ["dashboard", "muestras", "informes", "reactivos", "consumibles", "equipos", "movimientos", "documentos"]],
  ["Técnico Auxiliar", "mariana.delgado@ficotox.local", ["dashboard", "muestras", "reactivos", "consumibles", "movimientos", "documentos"]],
  ["Administrador/a Auxiliar", "carmen.aguilar@ficotox.local", ["dashboard", "muestras", "equipos", "mantenimiento", "reactivos", "consumibles", "movimientos"]],
  ["Auditor Interno", "hector.navarro@ficotox.local", TODOS],
  ["Estudiante / personal en formación", "diego.salinas@ficotox.local", ["dashboard", "muestras", "documentos"]],
];

/* Enlaces esperados en la barra lateral segun los modulos con lectura. */
function enlacesEsperados(modulos) {
  const lee = new Set(modulos);
  const out = new Set(["/ayuda"]);
  if (lee.has("dashboard")) out.add("/");
  if (lee.has("muestras")) ["/muestras/recepcion", "/muestras/procesamiento", "/muestras/extraccion", "/muestras/analisis"].forEach((h) => out.add(h));
  if (lee.has("informes")) out.add("/informes");
  for (const [modulo, href] of Object.entries(INVENTARIO)) if (lee.has(modulo)) out.add(href);
  if (lee.has("auditoria")) out.add("/auditoria");
  if (lee.has("usuarios")) out.add("/administracion/usuarios");
  if (lee.has("roles")) out.add("/administracion/roles");
  return out;
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  for (const [rol, email, modulos] of USUARIOS) {
    const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    const errores = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errores.push(msg.text());
    });
    page.on("pageerror", (err) => errores.push(`pageerror: ${err.message}`));
    try {
      await page.goto(`${BASE}/login`);
      await page.fill("#login-email", email);
      await page.fill("#login-password", credenciales[email]);
      await page.click("button[type=submit]");
      await page.waitForURL((url) => !url.pathname.startsWith("/login"));
      const nav = page.locator('aside[aria-label="Navegación principal"] nav');
      await nav.locator("a").first().waitFor();
      await page.waitForLoadState("networkidle");
      const hrefs = new Set((await nav.locator("a").evaluateAll((links) => links.map((a) => new URL(a.href).pathname))).concat(await page.locator('aside[aria-label="Navegación principal"] a[href="/ayuda"]').evaluateAll((l) => l.map((a) => new URL(a.href).pathname))));
      const esperados = enlacesEsperados(modulos);
      const sobran = [...hrefs].filter((h) => !esperados.has(h));
      const faltan = [...esperados].filter((h) => !hrefs.has(h));
      check(`${rol}: menu con solo sus modulos`, !sobran.length && !faltan.length, `sobran=[${sobran.join(", ")}] faltan=[${faltan.join(", ")}]`);
      check(`${rol}: Documentos no aparece (modulo apagado)`, ![...hrefs].includes("/documentos"));
      const relevantes = errores.filter((text) => !/favicon|404 \(Not Found\)/.test(text));
      check(`${rol}: sin errores de consola en el Inicio`, relevantes.length === 0, relevantes.slice(0, 3).join(" | "));
    } catch (error) {
      check(`${rol}: recorrido`, false, error.message);
      await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
