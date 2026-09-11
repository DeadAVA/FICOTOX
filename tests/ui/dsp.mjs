/* Recorrido en navegador: login -> elegir formato -> extraccion DSP desde un procesamiento -> guardar -> reabrir. */
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3100";
const executablePath = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.setDefaultTimeout(90_000);
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

try {
  // Login
  await page.goto(`${BASE}/login`);
  await page.fill("#login-email", "qa@ficotox.local");
  await page.fill("#login-password", "QaFicotox2026!");
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  check("login en navegador", true, page.url());

  // Chooser desde el boton "Extraer" del procesamiento
  await page.goto(`${BASE}/muestras/extraccion/nueva?procesamiento=2`);
  await page.getByText("¿Qué extracción vas a registrar?").waitFor();
  check("aparece el selector de formato", true);
  await page.getByRole("link", { name: /Registrar extracción DSP/ }).click();
  await page.getByRole("heading", { name: /Nueva extracción DSP/ }).waitFor();
  check("abre el formato DSP", true, page.url());
  // El formato abre paso a paso; para llenarlo con selectores fijos se muestra completo.
  const todo = page.getByRole("radio", { name: "Todo" });
  if ((await todo.getAttribute("aria-checked")) !== "true") await todo.click();
  await page.waitForFunction(() => document.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.includes("Todo"));

  // Folio sugerido de la serie DSP y procesamiento vinculado
  await page.waitForFunction(() => (document.querySelector("#e-folio") || {}).value !== "");
  const folio = await page.inputValue("#e-folio");
  check("folio E-D sugerido (serie propia)", Number(folio) >= 2, `folio=${folio}`);
  const procValue = await page.inputValue("#e-proc");
  check("procesamiento prellenado", procValue === "2", `value=${procValue}`);
  await page.getByText("Registro de peso de las submuestras").waitFor();
  const blanco = await page.getByText("Agua desionizada").count();
  check("tabla de pesos con fila de blanco", blanco >= 1);

  // Equipo con calibracion vencida -> aviso
  const licuadora = page.getByPlaceholder("Licuadora");
  await licuadora.click();
  await licuadora.fill("Centr");
  await page.getByRole("option", { name: /Centrifuga/ }).first().click();
  await page.getByText(/Calibración vencida/).first().waitFor();
  check("aviso de calibración vencida junto al equipo", true);

  // Seccion equipos utilizados: la fila aparece sola; se anota el folio de bitacora
  const folioBitacora = page.getByLabel(/Folio de bitácora de Centrifuga/);
  await folioBitacora.waitFor();
  await folioBitacora.fill("77");
  check("fila automática en Equipos utilizados", true);

  // Información mínima obligatoria: molienda, pasos de extracción y aforo, resguardo y supervisor.
  await page.getByRole("radio", { name: /^Fresca/ }).check();
  await page.getByLabel(/Submuestrear por duplicado/).check();
  await page.getByLabel(/Transferir el sobrenadante a un matraz/).check();
  await page.getByRole("checkbox", { name: /^Entregado a FX-106/ }).check();
  // Quien supervisó: solo personal con permiso de aprobación (Melisa, Coordinador).
  await page.locator("#persona-quien-superviso").selectOption("Melisa");
  // Pesos e hidrolisis
  await page.getByLabel("Peso (g) de D45-2", { exact: true }).fill("2.03");
  await page.getByText("Sí se realizó hidrólisis").click();
  await page.getByText("Peso precalentamiento", { exact: true }).waitFor();
  await page.getByLabel("Peso precalentamiento (g) de D45-2", { exact: true }).fill("5.2");
  check("hidrólisis muestra sus tablas", true);

  // Guardar -> confirmacion por equipo no apto
  await page.getByRole("button", { name: /Registrar extracción DSP/ }).click();
  await page.getByText("Revisar antes de guardar").waitFor();
  check("pide confirmación (equipo vencido e insumos sin inventario)", true);
  await page.getByRole("button", { name: "Guardar de todos modos" }).click();
  await page.waitForURL((url) => url.pathname === "/muestras/extraccion");
  check("guarda y regresa a la lista", true, page.url());

  // La lista muestra la nueva E-D
  const chip = page.locator("text=" + String(folio).padStart(7, "0")).first();
  await chip.waitFor();
  check("la lista muestra el folio nuevo", true);

  // Reabrir y verificar persistencia
  await chip.click();
  await page.getByRole("heading", { name: new RegExp(`Extracción DSP · E-D ${String(folio).padStart(7, "0")}`) }).waitFor();
  await page.waitForFunction(() => (document.querySelector('[aria-label="Folio de bitácora de Centrifuga"]') || {}).value === "77");
  const peso = await page.getByLabel("Peso (g) de D45-2", { exact: true }).inputValue();
  const pre = await page.getByLabel("Peso precalentamiento (g) de D45-2", { exact: true }).inputValue();
  check("reabre con folio de bitácora, pesos e hidrólisis persistidos", peso === "2.03" && pre === "5.2", `peso=${peso} pre=${pre}`);

  // Registro ASP existente (creado antes de este cambio) sigue abriendo
  await page.goto(`${BASE}/muestras/extraccion/2`);
  await page.getByRole("heading", { name: /Extracción ASP · E-A 0000001/ }).waitFor();
  await page.getByText("Limpieza del extracto").first().waitFor();
  check("registro ASP anterior abre con el formato ASP", true);


  // Regresion del revisor: reguardar el ASP viejo no debe duplicar el descuento del protocolo
  {
    const before = await page.evaluate(async () => {
      const token = localStorage.getItem("ficotox_access_token");
      const res = await fetch("/api/samples/extraction/2", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).item;
    });
    await page.goto(`${BASE}/muestras/extraccion/2`);
    await page.getByRole("heading", { name: /Extracción ASP · E-A 0000001/ }).waitFor();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    const dialog = page.getByText("Revisar antes de guardar");
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) await page.getByRole("button", { name: "Guardar de todos modos" }).click();
    await page.waitForURL((url) => url.pathname === "/muestras/extraccion");
    const after = await page.evaluate(async () => {
      const token = localStorage.getItem("ficotox_access_token");
      const res = await fetch("/api/samples/extraction/2", { headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()).item;
    });
    const refs = (rows) => rows.map((r) => `${r.tipo}|${r.ref}`).sort().join(",");
    check("reguardar ASP viejo conserva los mismos insumos (sin duplicar)", before.uso_inventario.length === after.uso_inventario.length && refs(before.uso_inventario) === refs(after.uso_inventario), `antes=${JSON.stringify(before.uso_inventario)} despues=${JSON.stringify(after.uso_inventario)}`);
    check("pasos_json conserva las claves del ASP viejo", Object.keys(before.pasos).filter((k) => before.pasos[k] !== null).every((k) => k in after.pasos), `faltan: ${Object.keys(before.pasos).filter((k) => before.pasos[k] !== null && !(k in after.pasos)).join(",")}`);
  }


  // Regresion del revisor (ronda 2): un insumo manual igual a uno del protocolo se conserva al reabrir
  {
    const created = await page.evaluate(async () => {
      const token = localStorage.getItem("ficotox_access_token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const reactivos = (await (await fetch("/api/inventory/reactivos?search=", { headers })).json()).items;
      const metanol = reactivos.find((r) => /metanol/i.test(String(r.producto || "")));
      const body = {
        tipo_registro: "E-D", procesamiento_id: 2, tipo_molienda: "fresca", id_interno: "D45-2",
        pasos: { checklist: [], reactivo_metanol_1: String(metanol.id) },
        registro_pesos: [{ id_muestra: "Blanco", es_blanco: true, replica: "BlancoR1" }, { id_muestra: "D45-2", replica: "D45-2_R1" }],
        uso_inventario: [
          { tipo: "reactivo", ref: String(metanol.id), cantidad: 0.036, origen: "protocolo", campo: "reactivo_metanol_1" },
          { tipo: "reactivo", ref: String(metanol.id), cantidad: 0.1, origen: "manual" },
        ],
      };
      const res = await fetch("/api/samples/extraction", { method: "POST", headers, body: JSON.stringify(body) });
      return await res.json();
    });
    await page.goto(`${BASE}/muestras/extraccion/${created.id}`);
    await page.getByRole("heading", { name: /Extracción DSP/ }).waitFor();
    const manualInput = page.locator("#sec-insumos input[type=number]");
    await manualInput.first().waitFor();
    const cantidad = await manualInput.first().inputValue();
    check("insumo manual igual al del protocolo sigue en 'Insumos adicionales'", cantidad === "0.1", `cantidad=${cantidad}`);
  }

  // Lista filtrada por tipo
  await page.goto(`${BASE}/muestras/extraccion?tipo=E-D`);
  await page.getByText(/extracciones DSP/).waitFor();
  check("filtro de lista por formato", true);
} catch (error) {
  check("recorrido completo", false, error.message);
  await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
}

const relevant = consoleErrors.filter((text) => !/favicon|404 \(Not Found\)/.test(text));
check("sin errores de consola", relevant.length === 0, relevant.slice(0, 5).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
