/*
 * Auditoria rediseñada (navegador): lista resumida agrupada por dia, detalle de
 * una entrada (frase, quien, que cambio, registro relacionado y datos tecnicos
 * plegados), navegacion con ↑/↓ y Esc, interruptor de inicios de sesion y el
 * mismo detalle en el Historial de un registro.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3100";
const executablePath = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const datos = process.env.DATOS_APOYO_FILE ? JSON.parse(readFileSync(process.env.DATOS_APOYO_FILE, "utf8")) : {};
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(45_000);
try {
  await page.goto(`${BASE}/login`);
  await page.fill("#login-email", "qa@ficotox.local");
  await page.fill("#login-password", "QaFicotox2026!");
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.goto(`${BASE}/auditoria`);
  const filas = page.locator("[data-audit-fila]");
  await filas.first().waitFor();
  check("la lista se agrupa por día con encabezado", (await page.locator("section h2", { hasText: /^(Hoy|Ayer|\w+ \d+ de \w+)/ }).count()) > 0);
  check("los inicios de sesión están ocultos por omisión", (await filas.filter({ hasText: /inició sesión/ }).count()) === 0);
  await page.getByText("Mostrar inicios de sesión").click();
  await filas.filter({ hasText: /inició sesión/ }).first().waitFor();
  check("con el interruptor se muestran los inicios de sesión", true);
  await page.getByText("Mostrar inicios de sesión").click();
  await page.waitForTimeout(500);

  // Abrir el detalle de una entrada.
  await filas.first().click();
  const detalle = page.locator("[data-audit-detalle]");
  await detalle.waitFor();
  const primero = await detalle.getAttribute("data-audit-detalle");
  const encabezado = (await detalle.locator("header").textContent()) || "";
  check("el detalle muestra la frase, la fecha y quién lo hizo", /QA Ficotox|sistema/i.test(encabezado) && /de 20\d\d/.test(encabezado), encabezado.slice(0, 120));
  check("los datos técnicos están plegados por omisión", !(await detalle.locator("details").evaluate((el) => el.open)));
  await detalle.getByText("Datos técnicos").click();
  await detalle.getByText("Entrada previa").waitFor();
  check("al desplegar los datos técnicos se ven el sello y la entrada previa", true);
  await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
  await filas.first().focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  const segundo = await page.locator("[data-audit-detalle]").getAttribute("data-audit-detalle");
  check("↓ cambia a la entrada siguiente", !!segundo && segundo !== primero, `${primero} → ${segundo}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Esc cierra el detalle", (await page.locator("[data-audit-detalle]").count()) === 0);

  // El mismo detalle en el Historial de un registro.
  if (datos.recepcion_id) {
    await page.goto(`${BASE}/muestras/recepcion/${datos.recepcion_id}`);
    await page.getByText("Historial del registro").first().waitFor();
    const todo = page.getByRole("radio", { name: "Todo", exact: true }).first();
    if (await todo.count()) await todo.click();
    // La bitácora del historial aparece recogida.
    await page.getByRole("button", { name: /^Bitácora · \d+ eventos?/ }).click();
    const evento = page.locator('ol[aria-label="Movimientos"] button').first();
    await evento.scrollIntoViewIfNeeded();
    await evento.click();
    await page.getByRole("dialog").locator("[data-audit-detalle]").waitFor();
    check("el Historial del registro abre el mismo detalle", true);
  }
} catch (error) {
  check("recorrido de auditoría", false, error.message);
  await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
