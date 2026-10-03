/*
 * Biblioteca (navegador): subir desde la hoja (arrastrar/elegir archivo, título
 * prellenado, validación en rojo), buscar, filtrar por tipo, vista de lista y
 * cuadrícula, y el visor de un PDF de varias páginas (página N de M, cambiar
 * de página, zoom, buscar texto con resaltado, información con versiones,
 * abrir una versión anterior). También imagen, docx y xlsx en el visor.
 */
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { docxSimple, pdfConTexto, pngSimple, xlsxDosHojas } from "../lib/archivos.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const BASE = process.env.BASE || "http://localhost:3100";
const API = `${BASE}/api`;
const executablePath = process.env.CHROME_PATH || path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const stamp = Date.now().toString(36).slice(-5);
const token = (await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "qa@ficotox.local", password: "QaFicotox2026!" }) })).json()).token;
async function subirApi(bytes, titulo, ext, campos = {}) {
  const fd = new FormData();
  fd.append("archivo", new Blob([bytes]), `${titulo}.${ext}`);
  for (const [k, v] of Object.entries({ titulo, categoria_id: 2, ...campos })) fd.append(k, String(v));
  const r = await fetch(`${API}/biblioteca`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
  return (await r.json()).item?.id;
}
async function versionApi(docId, bytes, nombre) {
  const fd = new FormData();
  fd.append("archivo", new Blob([bytes]), nombre);
  fd.append("nota_version", "Revisión 2 de la prueba");
  await fetch(`${API}/biblioteca/${docId}/versiones`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
}

const pdfDoc = await subirApi(await pdfConTexto(5, `Manual ${stamp}`), `Manual de laboratorio ${stamp}`, "pdf", { etiquetas: "manual" });
await versionApi(pdfDoc, await pdfConTexto(5, `Manual ${stamp} revisado`), `manual-${stamp}-r2.pdf`);
const pngDoc = await subirApi(pngSimple(320, 200), `Fotografía ${stamp}`, "png");
const docxDoc = await subirApi(docxSimple(`Instructivo ${stamp}`), `Instructivo ${stamp}`, "docx");
const xlsxDoc = await subirApi(xlsxDosHojas(), `Resultados ${stamp}`, "xlsx");

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.setDefaultTimeout(45_000);
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
try {
  await page.goto(`${BASE}/login`);
  await page.fill("#login-email", "qa@ficotox.local");
  await page.fill("#login-password", "QaFicotox2026!");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  /* ---------- Lista: subir, buscar y filtrar ---------- */
  await page.goto(`${BASE}/calidad/biblioteca`);
  await page.locator('[data-testid="biblioteca-tarjeta"], [data-testid="biblioteca-fila"]').first().waitFor();
  check("el menú Calidad muestra «Biblioteca»", (await page.locator('nav a[href="/calidad/biblioteca"]').count()) > 0);
  await page.getByTestId("biblioteca-subir").click();
  const nuevo = await pdfConTexto(3, `Subido desde la hoja ${stamp}`);
  await page.locator("#bib-archivos").setInputFiles({ name: `Procedimiento de hoja ${stamp}.pdf`, mimeType: "application/pdf", buffer: nuevo });
  await page.locator("#bib-titulo").waitFor();
  check("subir: el título se prellena con el nombre del archivo", (await page.locator("#bib-titulo").inputValue()) === `Procedimiento de hoja ${stamp}`);
  await page.locator("#bib-titulo").fill("");
  await page.getByRole("button", { name: "Subir documento", exact: true }).last().click();
  const popup = page.locator('[data-validacion="faltan"]');
  await popup.waitFor();
  check("subir sin título: validación en rojo y pop-up", (await page.locator("#bib-titulo").getAttribute("aria-invalid")) === "true");
  await popup.getByRole("button", { name: "Entendido" }).click();
  await page.locator("#bib-titulo").fill(`Procedimiento de hoja ${stamp}`);
  await page.getByRole("button", { name: "Subir documento", exact: true }).last().click();
  await page.locator(`text=Procedimiento de hoja ${stamp}`).first().waitFor();
  check("subir desde la hoja: el documento aparece en la biblioteca", true);
  await page.getByPlaceholder("Buscar por título, clave, etiqueta o texto del PDF").fill(`Instructivo ${stamp}`);
  await page.waitForTimeout(900);
  const visibles = await page.locator('[data-testid="biblioteca-tarjeta"], [data-testid="biblioteca-fila"]').allTextContents();
  check("buscar por título: solo el documento buscado", visibles.length === 1 && visibles[0].includes(`Instructivo ${stamp}`), `${visibles.length}`);
  await page.getByPlaceholder("Buscar por título, clave, etiqueta o texto del PDF").fill(stamp);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Filtros/ }).first().click();
  await page.getByRole("switch", { name: "PDF" }).click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  const pdfs = await page.locator('[data-testid="biblioteca-tarjeta"], [data-testid="biblioteca-fila"]').count();
  check("filtrar por tipo de archivo (PDF)", pdfs === 2, `${pdfs}`);
  await page.getByTestId("biblioteca-vista-lista").click();
  await page.locator('[data-testid="biblioteca-fila"]').first().waitFor();
  check("vista de lista", (await page.locator('[data-testid="biblioteca-fila"]').count()) === 2);
  await page.getByTestId("biblioteca-vista-cuadricula").click();

  /* ---------- Visor de PDF ---------- */
  await page.goto(`${BASE}/calidad/biblioteca/${pdfDoc}`);
  await page.getByTestId("visor-pdf").waitFor();
  await page.locator('[data-pagina="1"] canvas').first().waitFor();
  const total = (await page.getByTestId("visor-total-paginas").textContent())?.replace(/\D/g, "");
  check("visor PDF: página 1 de 5", total === "5" && (await page.getByTestId("visor-pagina-actual").inputValue()) === "1", `total ${total}`);
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid="visor-pagina-actual"]')?.value === "2");
  await page.getByTestId("visor-pagina-actual").fill("4");
  await page.getByTestId("visor-pagina-actual").press("Enter");
  await page.waitForFunction(() => document.querySelector('[data-testid="visor-pagina-actual"]')?.value === "4");
  check("cambiar de página (botón y campo «página N»)", true);
  const zoom0 = await page.getByTestId("visor-zoom").textContent().catch(() => page.getByTestId("visor-zoom").inputValue());
  await page.getByRole("button", { name: "Acercar" }).click();
  await page.waitForTimeout(400);
  const zoom1 = await page.getByTestId("visor-zoom").textContent().catch(() => page.getByTestId("visor-zoom").inputValue());
  check("zoom (Acercar cambia el porcentaje)", String(zoom0) !== String(zoom1), `${zoom0} → ${zoom1}`);
  await page.getByRole("button", { name: /Buscar en el documento/ }).first().click();
  await page.getByTestId("visor-buscar").fill("saxitoxina");
  await page.getByTestId("visor-buscar").press("Enter");
  await page.waitForFunction(() => /\d+ de \d+/.test(document.querySelector('[data-testid="visor-resultados"]')?.textContent || ""));
  const resultados = await page.getByTestId("visor-resultados").textContent();
  await page.locator(".visor-resaltado").first().waitFor();
  check("buscar texto dentro del PDF con resaltado", /de 5/.test(String(resultados)), String(resultados));
  check("el texto del PDF es seleccionable (capa de texto)", (await page.locator(".visor-textlayer span, .textLayer span").count()) > 0);

  /* ---------- Información y versión anterior ---------- */
  await page.getByRole("button", { name: /Información/ }).first().click();
  const info = page.getByTestId("visor-info");
  await info.waitFor();
  check("panel de información con la lista de versiones (2)", (await info.locator("[data-version]").count()) === 2 && /SHA-256/i.test((await info.textContent()) || ""));
  await info.locator('[data-version="1"]').click();
  await page.getByTestId("visor-version-anterior").waitFor();
  check("abrir una versión anterior: marcada «Versión anterior»", /Versión anterior/.test((await page.getByTestId("visor-version-anterior").textContent()) || ""));

  /* ---------- Imagen, docx y xlsx ---------- */
  await page.goto(`${BASE}/calidad/biblioteca/${pngDoc}`);
  await page.getByTestId("visor-imagen").waitFor();
  check("visor de imagen", true);
  await page.goto(`${BASE}/calidad/biblioteca/${docxDoc}`);
  await page.getByTestId("visor-docx").getByText(`Instructivo ${stamp}`).waitFor();
  check("visor de docx (convertido a HTML y saneado)", (await page.getByTestId("visor-docx").locator("script").count()) === 0);
  await page.goto(`${BASE}/calidad/biblioteca/${xlsxDoc}`);
  await page.getByTestId("visor-hoja").getByText("D26-102").waitFor();
  check("visor de xlsx: tabla con pestañas por hoja", (await page.getByTestId("visor-hoja").getByRole("tab").count()) === 2);
  check("sin errores de JavaScript en la página", errores.length === 0, errores.slice(0, 2).join(" | "));
} catch (error) {
  check("recorrido de la biblioteca", false, error.message.split("\n")[0]);
  await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
process.exit(failed ? 1 : 0);
