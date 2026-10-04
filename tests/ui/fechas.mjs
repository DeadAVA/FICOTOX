/*
 * Fechas en el navegador (Fase 3): el campo de fecha propio muestra y acepta
 * dd/mm/aaaa sin importar el idioma del navegador (se prueba con locale en-US),
 * con calendario navegable con teclado; y una fecha guardada como 2026-09-07 se
 * ve 07/09/2026 en la lista y en el formulario (sin el corrimiento de un dia).
 */
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3100";
const executablePath = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const stamp = Date.now().toString().slice(-6);

const login = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "qa@ficotox.local", password: "QaFicotox2026!" }) }).then((r) => r.json());
const idInterno = `FECHA-UI-${stamp}`;
const inspeccion = { checklist: Array.from({ length: 7 }, (_, i) => ({ requisito: `Requisito ${i + 1}`, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null };
const creada = await fetch(`${BASE}/api/samples/reception`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.token}` },
  body: JSON.stringify({ fecha_recepcion: "2026-09-07", hora_recepcion: "23:30", recibido_por: "QA", medio_recepcion: "directa", solicitante: "Cliente fechas UI", muestra_unica: true, id_interno: idInterno, fecha_muestra: "2026-09-06", analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] }, inspeccion, decision_aceptacion: "aceptada", aceptacion: { fecha: "2026-09-07", responsable: "QA" } }),
}).then((r) => r.json());
check("recepcion de apoyo creada con fecha 2026-09-07", !!creada.id);

const browser = await chromium.launch({ executablePath, headless: true });
// Navegador en ingles de EE. UU. y en otra zona horaria: el formato no debe cambiar.
const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "en-US", timezoneId: "America/New_York" });
const page = await context.newPage();
page.setDefaultTimeout(45_000);
try {
  await page.goto(`${BASE}/login`);
  await page.fill("#login-email", "qa@ficotox.local");
  await page.fill("#login-password", "QaFicotox2026!");
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  // Lista y ficha: la misma fecha.
  await page.goto(`${BASE}/muestras/recepcion`);
  await page.getByPlaceholder("Buscar por folio, solicitante o ID interno").fill(idInterno);
  // Lista en cuadricula: la fecha va corta ("7 sep 2026") y la completa en el title.
  const fila = page.locator("[data-recepcion]").filter({ hasText: idInterno }).first();
  await fila.waitFor();
  check("la lista muestra 07/09/2026 (no 06/09/2026)", (await fila.textContent()).includes("7 sep 2026") && (await fila.locator('[title="07/09/2026"]').count()) > 0, (await fila.textContent()).slice(0, 160));
  await page.goto(`${BASE}/muestras/recepcion/${creada.id}`);
  await page.locator("#r-fecha").waitFor();
  const enFicha = await page.inputValue("#r-fecha");
  check("el formulario muestra la misma fecha 07/09/2026", enFicha === "07/09/2026", enFicha);

  // Campo de fecha: dd/mm/aaaa escrito a mano y con el calendario.
  await page.goto(`${BASE}/muestras/recepcion/nueva`);
  await page.locator("#r-fecha").waitFor();
  await page.locator("#r-fecha").fill("");
  await page.locator("#r-fecha").pressSequentially("07092026");
  await page.locator("#r-fecha").blur();
  const escrito = await page.inputValue("#r-fecha");
  check("se escribe dd/mm/aaaa (las barras se ponen solas) aunque el navegador este en ingles", escrito === "07/09/2026", escrito);
  check("el campo no es un <input type=date> del navegador", (await page.locator("#r-fecha").getAttribute("type")) !== "date");
  await page.locator("#r-fecha").fill("31/02/2026");
  await page.locator("#r-fecha").blur();
  const invalida = await page.inputValue("#r-fecha");
  check("una fecha imposible (31/02/2026) no se acepta: vuelve a la ultima valida", invalida === "07/09/2026", invalida);

  // Calendario con teclado.
  const boton = page.getByRole("button", { name: /calendario/i }).first();
  await boton.click();
  const dialogo = page.getByRole("dialog").last();
  await dialogo.waitFor();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const conTeclado = await page.inputValue("#r-fecha");
  check("calendario accesible: flecha a la derecha + Enter elige el dia siguiente (08/09/2026)", conTeclado === "08/09/2026", conTeclado);

  // Formulario de reactivos (campos de fecha definidos por catalogo): tambien dd/mm/aaaa, sin <input type=date>.
  await page.goto(`${BASE}/inventario/reactivos`);
  await page.getByRole("button", { name: "Nuevo reactivo" }).first().click();
  await page.getByRole("dialog").getByText("Ácidos", { exact: true }).click();
  await page.locator("#reactivo-caducidad").waitFor();
  check("el formulario de reactivos no tiene ningun <input type=date> del navegador", (await page.locator("input[type=date]").count()) === 0);
  await page.locator("#reactivo-caducidad").pressSequentially("31122027");
  await page.locator("#reactivo-caducidad").blur();
  const caducidad = await page.inputValue("#reactivo-caducidad");
  check("la caducidad del reactivo se escribe dd/mm/aaaa", caducidad === "31/12/2027", caducidad);
} catch (error) {
  check("recorrido de fechas", false, error.message);
  await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
// Ningun componente de la interfaz usa el campo de fecha nativo del navegador.
const nativos = execSync(`grep -rnE '^[[:space:]]*[^/*[:space:]].*type="date"' src || true`, { cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..") }).toString().trim();
check("ningun archivo de src/ usa type=\"date\"", nativos === "", nativos);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
