/*
 * Etiquetas imprimibles (Fase 5): una recepcion de lote con 2 muestras genera 2
 * etiquetas con el folio R y el ID interno de cada muestra; "Imprimir" deja en
 * la bitacora "imprimir_etiquetas" (window.print se sustituye en la prueba).
 */
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
const api = async (method, ruta, body, token) => {
  const res = await fetch(`${BASE}/api${ruta}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const token = (await api("POST", "/auth/login", { email: "qa@ficotox.local", password: "QaFicotox2026!" })).data?.token;
const ids = [`ETQ-${stamp}-A`, `ETQ-${stamp}-B`];
const creada = await api(
  "POST",
  "/samples/reception",
  {
    fecha_recepcion: "2026-09-07",
    hora_recepcion: "10:00",
    recibido_por: "QA",
    medio_recepcion: "directa",
    solicitante: "Cliente etiquetas",
    muestra_unica: false,
    lote_muestras: [
      { id_interno: ids[0], nombre_organismo: "Mejillón", fecha_muestra: "2026-09-05" },
      { id_interno: ids[1], nombre_organismo: "Ostión", fecha_muestra: "2026-09-06" },
    ],
    analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] },
    datos_custodio: { lugar_resguardo: "congelador", lugar_otro: "CO1" },
  },
  token,
);
check("recepcion de lote con 2 muestras creada", creada.status === 201 && !!creada.data?.id, `${creada.status} ${creada.data?.message || ""}`);
const recepcionId = creada.data?.id;

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await context.addInitScript(() => {
  window.print = () => {
    window.__impreso = true;
  };
});
const page = await context.newPage();
page.setDefaultTimeout(45_000);
try {
  await page.goto(`${BASE}/login`);
  await page.fill("#login-email", "qa@ficotox.local");
  await page.fill("#login-password", "QaFicotox2026!");
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.goto(`${BASE}/muestras/recepcion/${recepcionId}/etiquetas`);
  await page.locator("[data-etiqueta]").first().waitFor();
  const etiquetas = await page.locator("[data-etiqueta]").allTextContents();
  check("una etiqueta por muestra del lote (2)", etiquetas.length === 2, String(etiquetas.length));
  check("cada etiqueta lleva el folio R y su ID interno", etiquetas.every((t) => /R \d{7}/.test(t)) && etiquetas[0].includes(ids[0]) && etiquetas[1].includes(ids[1]), etiquetas.join(" | ").slice(0, 200));
  check("la etiqueta muestra organismo, fechas dd/mm/aaaa y resguardo", etiquetas[0].includes("Mejillón") && etiquetas[0].includes("05/09/2026") && etiquetas[0].includes("07/09/2026") && etiquetas[0].includes("Congelador CO1"), etiquetas[0]);

  await page.getByRole("radio", { name: "Hoja completa" }).click();
  check("opcion de hoja completa", (await page.locator("#etiquetas-impresion.etiquetas-hoja").count()) === 1);

  await page.getByRole("button", { name: "Imprimir" }).click();
  await page.waitForFunction(() => window.__impreso === true);
  const bitacora = await api("GET", `/audit?entidad=muestras_recepcion&entidad_id=${recepcionId}&accion=imprimir_etiquetas`, undefined, token);
  const items = bitacora.data?.items || [];
  check("imprimir deja 'imprimir_etiquetas' en la bitacora", items.some((i) => i.accion === "imprimir_etiquetas"), `${bitacora.status} ${items.length}`);
} catch (error) {
  check("recorrido de etiquetas", false, error.message);
  await page.screenshot({ path: path.join(path.dirname(new URL(import.meta.url).pathname), "fail.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} pasos OK`);
process.exit(failed ? 1 : 0);
