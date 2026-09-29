/*
 * Ejemplo de demostracion ejecutado por cada usuario (npm run demo:ejemplo).
 *
 *   node scripts/demo-ejemplo.mjs [http://localhost:3000]
 *
 * Simula un caso real: COFEPRIS entrega una muestra de mejillon para toxinas
 * lipofilicas (DSP). Cada paso inicia sesion como la persona que lo hace y usa
 * la API normal (reautenticacion, tokens de firma y todas las validaciones),
 * asi la bitacora muestra cada accion a nombre de quien la hizo. No escribe
 * nada directo en la base: todo por HTTP, como la interfaz.
 *
 * - Contrasenas: scripts/seed-usuarios.local.json (Jorge, Patricia, Ricardo, Luis y Mariana).
 * - Requiere una base recien limpiada: si ya hay muestras, reactivos o equipos, se detiene sin hacer nada.
 * - Si un paso falla, se detiene y muestra el error.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
// Node avisa que fechas.ts se interpreta como modulo ES; el aviso no aplica aqui (igual que en el seed).
const avisos = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w?.code !== "MODULE_TYPELESS_PACKAGE_JSON") for (const l of avisos) l(w);
});
const { hoyLocal, sumarDias } = await import("../src/lib/shared/fechas.ts");

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = (process.argv[2] || process.env.DEMO_URL || "http://localhost:3000").replace(/\/$/, "");
const API = `${SERVER}/api`;
const usuariosFile = process.env.SEED_USUARIOS_FILE ? path.resolve(root, process.env.SEED_USUARIOS_FILE) : path.join(root, "scripts/seed-usuarios.local.json");
const personas = JSON.parse(fs.readFileSync(usuariosFile, "utf8")).usuarios || [];
const EMAIL = { Jorge: "jorge@ficotox.local", Patricia: "patricia@ficotox.local", Ricardo: "ricardo@ficotox.local", Luis: "luis@ficotox.local", Mariana: "mariana@ficotox.local" };
const password = (quien) => personas.find((p) => p.email === EMAIL[quien])?.password;

const HOY = hoyLocal();
const AYER = sumarDias(HOY, -1);
const hora = () => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Tijuana", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

class PasoFallido extends Error {}
const falla = (msg) => {
  throw new PasoFallido(msg);
};

/* ---------- Sesiones y llamadas (con reautenticacion como la interfaz) ---------- */

const sesiones = new Map();
async function sesion(quien) {
  if (sesiones.has(quien)) return sesiones.get(quien);
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL[quien], password: password(quien) }) });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.token) falla(`${quien} no pudo iniciar sesión: ${data?.message || r.status}`);
  sesiones.set(quien, data.token);
  return data.token;
}

async function api(quien, method, ruta, body, extra = {}) {
  const token = await sesion(quien);
  const enviar = async (headers = {}) => {
    const esForm = body instanceof FormData;
    const r = await fetch(`${API}${ruta}`, { method, headers: { ...(esForm || body === undefined ? {} : { "Content-Type": "application/json" }), Authorization: `Bearer ${token}`, ...extra, ...headers }, body: body === undefined ? undefined : esForm ? body : JSON.stringify(body) });
    const tipo = r.headers.get("content-type") || "";
    return { status: r.status, data: tipo.includes("json") ? await r.json().catch(() => null) : await r.text() };
  };
  let res = await enviar();
  // Accion critica: la persona confirma con su contrasena (como el dialogo de la interfaz).
  if (res.status === 401 && res.data?.codigo === "reauth_required") {
    const re = await fetch(`${API}/auth/reauth`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ accion: res.data.accion, password: password(quien) }) });
    const reData = await re.json().catch(() => null);
    if (!re.ok || !reData?.token) falla(`${quien} no pudo reautenticarse: ${reData?.message || re.status}`);
    // El cuerpo multipart no se puede reenviar dos veces con el mismo FormData en todos los entornos: se reconstruye si hace falta.
    res = await enviar({ "X-Reauth": reData.token });
  }
  return res;
}

async function ok(quien, method, ruta, body, esperado = [200, 201]) {
  const res = await api(quien, method, ruta, body);
  if (!esperado.includes(res.status)) falla(`${method} ${ruta} (${quien}) → ${res.status}: ${res.data?.message || JSON.stringify(res.data).slice(0, 300)}`);
  return res.data;
}

/* Firma de otra persona: confirma con SU contrasena y devuelve el token de un solo uso. */
async function tokenFirma(sesionDe, firmante) {
  const id = await idDe(firmante);
  const r = await ok(sesionDe, "POST", "/firmas/confirmar", { usuario_id: id, password: password(firmante) });
  return r.token_firma;
}

const cuentas = new Map();
async function idDe(quien) {
  if (!cuentas.size) for (const c of (await ok("Ricardo", "GET", "/cuentas/activas")).items || []) cuentas.set(c.email, c.id);
  return cuentas.get(EMAIL[quien]);
}

const paso = (quien, accion, resultado) => console.log(`[${quien}] ${accion} → ${resultado}`);

/* ---------- Firma (PNG sencillo distinto por persona) y evidencia (PDF) ---------- */

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(tipo, datos) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const firmas = new Map();
function firma(quien) {
  if (firmas.has(quien)) return firmas.get(quien);
  const W = 240;
  const H = 80;
  const semilla = [...quien].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const pix = Buffer.alloc(H * (W * 4 + 1), 0);
  const punto = (x, y) => {
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const px = Math.round(x) + dx;
        const py = Math.round(y) + dy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const i = py * (W * 4 + 1) + 1 + px * 4;
        pix[i] = 20;
        pix[i + 1] = 40;
        pix[i + 2] = 90;
        pix[i + 3] = 255;
      }
  };
  // Trazo tipo rubrica: suma de senos con frecuencias propias de cada persona.
  const f1 = 2 + (semilla % 5);
  const f2 = 5 + (semilla % 7);
  for (let x = 12; x < W - 12; x += 0.5) {
    const t = x / W;
    punto(x, H / 2 + Math.sin(t * Math.PI * f1) * 18 + Math.sin(t * Math.PI * f2 + semilla) * 8);
  }
  for (let x = 30; x < W - 40; x += 0.5) punto(x, H - 14 + Math.sin(x / 9) * 1.5);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(pix)), chunk("IEND", Buffer.alloc(0))]);
  const url = `data:image/png;base64,${png.toString("base64")}`;
  firmas.set(quien, url);
  return url;
}

async function pdfEvidencia(folio) {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "LETTER", margin: 56 });
  const partes = [];
  doc.on("data", (b) => partes.push(b));
  const fin = new Promise((resolve) => doc.on("end", resolve));
  doc.fontSize(16).text("Correo enviado", { underline: true }).moveDown();
  doc.fontSize(11).text(`De: Patricia <patricia@ficotox.local>`).text(`Para: Lic. Héctor Mendívil <hector.mendivil@ejemplo.mx>`).text(`Fecha: ${HOY} ${hora()}`).text(`Asunto: Informe de resultados ${folio}`).moveDown();
  doc.text("Estimado Lic. Mendívil:").moveDown(0.5);
  doc.text(`Adjuntamos el informe de resultados ${folio} de la muestra D26-001 (mejillón, Bahía de Todos Santos · El Sauzal), análisis de toxinas lipofílicas (DSP).`).moveDown(0.5);
  doc.text("Quedamos atentos a cualquier comentario.").moveDown(0.5).text("Laboratorio FICOTOX");
  doc.end();
  await fin;
  return Buffer.concat(partes);
}

/* Fase 10: cromatograma de la corrida (PDF generado) como evidencia instrumental del analisis. */
async function pdfCromatograma(folio) {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ size: "LETTER", margin: 56 });
  const partes = [];
  doc.on("data", (b) => partes.push(b));
  const fin = new Promise((resolve) => doc.on("end", resolve));
  doc.fontSize(16).text(`Cromatograma · ${folio}`, { underline: true }).moveDown(0.5);
  doc.fontSize(10).text(`LC-MS/MS FX-TCB-MS1 · ${HOY} ${hora()} · muestra D26-001 (mejillón) · ácido okadaico, MRM 803.5 > 255.1`).moveDown();
  // Ejes y un pico gaussiano sencillo.
  const x0 = 80, y0 = 420, ancho = 440, alto = 220;
  doc.moveTo(x0, y0).lineTo(x0 + ancho, y0).stroke().moveTo(x0, y0).lineTo(x0, y0 - alto).stroke();
  doc.fontSize(8).text("Tiempo de retención (min)", x0 + ancho / 2 - 50, y0 + 8).text("Intensidad", x0 - 60, y0 - alto / 2);
  doc.moveTo(x0, y0 - 4);
  for (let i = 0; i <= ancho; i += 2) {
    const t = i / ancho;
    const y = y0 - 4 - 200 * Math.exp(-(((t - 0.55) / 0.03) ** 2)) - 3 * Math.sin(i / 7);
    doc.lineTo(x0 + i, y);
  }
  doc.stroke();
  doc.fontSize(9).text("Pico: tR 6.62 min · área 1.84e5 · 48.9 µg/kg eq. AO", x0 + ancho * 0.55 - 40, y0 - alto - 12);
  doc.end();
  await fin;
  return Buffer.concat(partes);
}

/* ---------- Escenario ---------- */

async function main() {
  console.log(`Servidor: ${SERVER}\n`);
  for (const q of Object.keys(EMAIL)) if (!password(q)) falla(`Falta la contraseña de ${q} (${EMAIL[q]}) en ${path.relative(root, usuariosFile)}`);

  // Requisito previo: base recien limpiada.
  const [muestras, reactivos, equipos] = await Promise.all([ok("Ricardo", "GET", "/samples/reception?anuladas=1"), ok("Ricardo", "GET", "/inventory/reactivos?search="), ok("Ricardo", "GET", "/inventory/equipos")]);
  const hay = { muestras: (muestras.items || []).length, reactivos: (reactivos.items || []).length, equipos: (equipos.items || []).length };
  if (hay.muestras || hay.reactivos || hay.equipos) {
    console.error(`La base no está recién limpiada (muestras ${hay.muestras}, reactivos ${hay.reactivos}, equipos ${hay.equipos}). No se hizo nada.`);
    process.exit(2);
  }
  const luisId = await idDe("Luis");
  const ricardoId = await idDe("Ricardo");
  const marianaId = await idDe("Mariana");

  /* 1. Ricardo · inventario */
  const R = {};
  const nuevosReactivos = [
    ["metanol", { tipo_reactivo: "alcoholes_solventes", producto: "Metanol grado HPLC", nombre: "Metanol grado HPLC", marca: "J.T. Baker", proveedor: "Sigma-Aldrich", caducidad: "2027-06-30", cantidad_actual: 4, unidad: "litros", stock_minimo: 1 }],
    ["naoh", { tipo_reactivo: "compuestos_sodio", producto: "NaOH 2.5 M", nombre: "NaOH 2.5 M", marca: "Preparado en laboratorio", caducidad: "2027-03-31", cantidad_actual: 0.5, unidad: "litros", stock_minimo: 0.1 }],
    ["hcl", { tipo_reactivo: "acidos", producto: "HCl 2.5 M", nombre: "HCl 2.5 M", marca: "Preparado en laboratorio", caducidad: "2027-03-31", cantidad_actual: 0.5, unidad: "litros", stock_minimo: 0.1 }],
    ["agua", { tipo_reactivo: "miscelaneos", producto: "Agua desionizada", nombre: "Agua desionizada", caducidad: "2027-12-31", cantidad_actual: 20, unidad: "litros", stock_minimo: 5 }],
    ["crm", { tipo_reactivo: "materiales_referencia", nombre_crm: "CRM ácido okadaico (NRC CRM-OA-d)", producto: "CRM ácido okadaico (NRC CRM-OA-d)", nombre: "CRM ácido okadaico (NRC CRM-OA-d)", lot_number: "OA-d-2025", caducidad: "2027-09-30", cantidad_actual: 2, unidad: "ml", stock_minimo: 0.5 }],
  ];
  for (const [clave, datos] of nuevosReactivos) R[clave] = (await ok("Ricardo", "POST", "/inventory/reactivos", datos)).id;
  paso("Ricardo", "da de alta 5 reactivos (metanol, NaOH, HCl, agua desionizada y CRM de ácido okadaico)", "OK");
  const C = {};
  for (const [clave, producto, piezas] of [["tubo", "Tubo ámbar para centrífuga 15 mL", 100], ["vial", "Vial ámbar 2 mL", 100], ["filtro", "Filtro de jeringa 0.45 µm", 50]]) C[clave] = (await ok("Ricardo", "POST", "/consumables", { producto, piezas, stock_maximo: piezas })).id;
  paso("Ricardo", "da de alta 3 consumibles (tubos, viales y filtros)", "OK");
  const E = {};
  const nuevosEquipos = [
    ["BA1", "Balanza analítica BA1", "FX-TCB-BA1-10/1"],
    ["LC1", "Licuadora LC1", "FX-TCB-LC1-12/1"],
    ["CR1", "Cronómetro CR1", "FX-TCB-CR1-15/1"],
    ["CE1", "Centrífuga CE1", "FX-TCB-CE1-27/1"],
    ["VO1", "Vórtex VO1", "FX-TCB-VO1-47/1"],
    ["TB1", "Termobloque TB1", "FX-TCB-TB1-67/1"],
    ["MP1", "Micropipeta MP1", "FX-TCB-MP1-50/1"],
    ["MS1", "UPLC-MS/MS", "FX-TCB-MS1-01/1"],
  ];
  for (const [clave, nombre, bitacora] of nuevosEquipos) {
    const r = await ok("Ricardo", "POST", "/inventory/equipos", { nombre, estado: "operativo", fecha_prox_calibracion: "2027-03-31", clave_bitacora: bitacora, autorizar_a: [luisId], folio_fx_thf_ap: "FX-THF-AP-DEMO" });
    if (!(r.autorizados || []).some((a) => Number(a.usuario_id) === Number(luisId))) falla(`El equipo ${nombre} no quedó autorizado a Luis`);
    E[clave] = r.id;
  }
  paso("Ricardo", "da de alta 8 equipos operativos (calibración al 31/03/2027) y los autoriza a Luis", "OK");
  const folioSugerido = async (equipoId) => {
    const lista = (await ok("Luis", "GET", "/inventory/equipos")).items || [];
    const eq = lista.find((e) => Number(e.id) === Number(equipoId));
    return String((Number.parseInt(String(eq?.ultimo_folio_bitacora || "0"), 10) || 0) + 1);
  };

  /* 2. Mariana · recepcion */
  const inspeccion = {
    checklist: [
      "Se presentan en talla comercial.",
      "Se presentan sin alteraciones (estado de descomposición, valvas abiertas/rotas, cuerpos eviscerados).",
      "En el momento de su presentación no han transcurrido más de 24 horas después de haber sido extraídas.",
      "Se presentan en bolsa o botella de plástico transparente, sin alteraciones, como contenedor primario.",
      "El contenedor primario es transportado en una hielera con blue ice/hielo suficiente para mantener la temperatura entre 4 y 10 °C.",
      "Se presentan en cantidad o volumen suficiente para el(los) análisis solicitados.",
      "Se presenta con algún tipo de fijador (en caso positivo especificar el tipo).",
    ].map((requisito) => ({ requisito, estado: "C", observacion: null })),
    observaciones_generales: "Muestra en hielera con blue ice; llegó a 6 °C.",
  };
  const recepcion = (extra = {}) => ({
    fecha_recepcion: HOY,
    hora_recepcion: hora(),
    recibido_por: "Mariana",
    medio_recepcion: "directa",
    solicitante: "COFEPRIS · Comisión Estatal de Baja California",
    muestra_unica: true,
    id_interno: "D26-001",
    fecha_muestra: AYER,
    especificaciones: "Mejillón (Mytilus galloprovincialis), 1.0 kg. Bahía de Todos Santos · El Sauzal.",
    analisis: { tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"] },
    inspeccion,
    datos_solicitante: { nombre_entrega: "Lic. Héctor Mendívil", correo: "hector.mendivil@ejemplo.mx", conformidad: true, firma_conformidad: firma("Héctor Mendívil") },
    datos_custodio: { nombre_cargo_firma: "Mariana · Técnico Auxiliar", lugar_resguardo: "refrigerador", lugar_otro: "RE1", firma_digital: firma("Mariana") },
    decision_aceptacion: "aceptada",
    aceptacion: { fecha: HOY, responsable: "Mariana", temperatura_llegada: "6 °C", observaciones: "Cumple los 7 requisitos de la inspección visual." },
    firmantes: { recibio: { usuario_id: marianaId } },
    ...extra,
  });
  const rec = await ok("Mariana", "POST", "/samples/reception", recepcion());
  const RID = rec.id;
  const recItem = (await ok("Mariana", "GET", `/samples/reception/${RID}`)).item;
  if (recItem.estado !== "aceptada") falla(`La recepción quedó en ${recItem.estado}`);
  const folioR = `R ${String(recItem.folio_num).padStart(7, "0")}`;
  paso("Mariana", `registra la recepción ${folioR} (D26-001, mejillón) y la acepta`, "aceptada");
  const etiquetas = await ok("Mariana", "GET", `/samples/reception/${RID}/etiquetas`);
  await ok("Mariana", "POST", `/samples/reception/${RID}/etiquetas`, { formato: "etiqueta", copias: 1 });
  paso("Mariana", `imprime ${(etiquetas.items || []).length} etiqueta(s) de ${folioR}`, "registrado en la bitácora");

  /* 3. Ricardo · asigna a Luis */
  await ok("Ricardo", "POST", `/samples/reception/${RID}/asignaciones`, { usuario_id: luisId, motivo: "Análisis DSP" });
  paso("Ricardo", `asigna ${folioR} a Luis ("Análisis DSP")`, "asignada");

  /* 4. Luis · procesamiento */
  const procesamiento = await ok("Luis", "POST", "/samples/processing", {
    recepcion_id: RID,
    folio_recepcion_num: recItem.folio_num,
    fecha_procesamiento: HOY,
    hora_procesamiento: hora(),
    muestra_tipo: "unica",
    id_interno: "D26-001",
    tipo_organismo: ["bivalvos"],
    parte_organismo: ["cuerpo_completo"],
    bivalvos_steps: [
      { step: "Seleccionar organismos de mayor talla (~30)", equipo_id: null, peso: null },
      { step: "Lavar exterior con agua corriente", equipo_id: null, peso: null },
      { step: "Abrir valvas", equipo_id: null, peso: null },
      { step: "Lavar interior con agua corriente", equipo_id: null, peso: null },
      { step: "Desconchar", equipo_id: null, peso: null },
      { step: "Drenar 5 min", equipo_id: E.CR1, peso: null },
      { step: "Moler 1-2 min 100-150g", equipo_id: E.LC1, peso: null },
      { step: "Pesar molienda obtenida", equipo_id: E.BA1, peso: 120 },
      { step: "Reservar molienda en bolsa hermetica", equipo_id: null, peso: 120 },
    ],
    resguardo: { entregado_extraccion: true },
    observaciones_generales: "Organismos en buen estado; molienda homogénea de 120 g.",
    nombre_quien_proceso: "Luis",
    nombre_quien_superviso: "Ricardo",
    firma_quien_proceso: firma("Luis"),
    firma_quien_superviso: firma("Ricardo"),
    firmantes: { proceso: { usuario_id: luisId }, superviso: { usuario_id: ricardoId, token_firma: await tokenFirma("Luis", "Ricardo") } },
  });
  const PID = procesamiento.id;
  const procItem = (await ok("Luis", "GET", `/samples/processing/${PID}`)).item;
  procesamiento.folio_num = procItem.folio_num;
  paso("Luis", `procesa la muestra (P ${String(procItem.folio_num).padStart(7, "0")}, 120 g; supervisó Ricardo con su contraseña)`, (await ok("Luis", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 5. Luis · extraccion E-D */
  const equiposExt = [];
  for (const [clave, uso] of [["BA1", "Balanza · pasos 3, 4, 17 y 20"], ["CE1", "Centrífuga · pasos 8 y 12"], ["VO1", "Vórtex · pasos 7, 17 y 22"], ["TB1", "Termoblock · paso 18"], ["MP1", "Micropipeta · pasos 16 y 21"]]) {
    const def = nuevosEquipos.find(([c]) => c === clave);
    equiposExt.push({ equipo_id: E[clave], uso, clave_bitacora: def[2], folio_bitacora: await folioSugerido(E[clave]) });
  }
  const pasosDsp = ["Homogeneizar en licuadora 30-45 s reincorporando el liquido de descongelacion", "Submuestrear por duplicado en tubo ambar para centrifuga (2 ± 0.05 g)", "Pesar agua desionizada para el blanco (2 ± 0.05 g)", "Adicionar 9 mL de metanol 100 % a muestras y blanco", "Agitar en vortex durante 3 min", "Centrifugar a 2,000 g o mas durante 10 min a 20 °C", "Transferir sobrenadante a matraz de aforacion de 20 mL", "Adicionar 9 mL de metanol 100 % al pellet", "Homogeneizar por 1 min", "Centrifugar a 2,000 g durante 10 min a 20 °C", "Recuperar sobrenadante, combinar y aforar a 20 mL con metanol 100 %", "Filtrar 1 mL con filtro de 0.45 µm y transferir a vial ambar", "Transferir 1 mL del extracto a vial ambar (hidrolisis)", "Agregar 125 µL de NaOH 2.5 M", "Agitar en vortex 30 s y pesar el tubo", "Calentar a 76 °C por 40 min", "Enfriar a temperatura ambiente", "Pesar de nuevo y completar al peso inicial con metanol 100 %", "Agregar 125 µL de HCl 2.5 M", "Agitar en vortex 30 s", "Filtrar 1 mL con filtro de 0.45 µm y transferir a vial ambar (hidrolizado)"];
  const extraccion = await ok("Luis", "POST", "/samples/extraction", {
    tipo_registro: "E-D",
    fecha_extraccion: HOY,
    hora_extraccion: hora(),
    procesamiento_id: PID,
    folio_procesamiento_num: procesamiento.folio_num,
    muestra_tipo: "unica",
    id_interno: "D26-001",
    tipo_molienda: "fresca",
    pasos: {
      checklist: pasosDsp,
      id_balanza: String(E.BA1),
      id_vortex: String(E.VO1),
      id_centrifuga: String(E.CE1),
      id_micropipeta: String(E.MP1),
      id_termoblock: String(E.TB1),
      hidrolisis: "si",
      temperatura_calentamiento: 76,
      tiempo_calentamiento_min: 40,
      cantidad_aforo_ml: 2,
      filtrado: { volumen_filtrado: "1", volumen_recuperado: "0.8", filtro: "0.45 µm" },
      resguardo_extracto: { entregado_fx106: true },
      resguardo_molienda_restante: { congelador_co1: true },
    },
    registro_pesos: [
      { id_muestra: "Blanco", es_blanco: true, replica: null, peso_muestra: 2.0, matraz: "M3", peso_pre_muestra: 5.12, peso_post_muestra: 5.1 },
      { id_muestra: "D26-001", replica: "D26-001_R1", peso_muestra: 2.01, peso_replica: 2.02, matraz: "M1", matraz_replica: "M2", peso_pre_muestra: 5.21, peso_pre_replica: 5.23, peso_post_muestra: 5.19, peso_post_replica: 5.21 },
    ],
    equipos: equiposExt,
    // 3 tubos (muestra, replica y blanco): metanol 20 mL por tubo, NaOH y HCl 125 µL por tubo.
    uso_inventario: [
      { tipo: "reactivo", ref: String(R.metanol), cantidad: 0.06 },
      { tipo: "reactivo", ref: String(R.naoh), cantidad: 0.000375 },
      { tipo: "reactivo", ref: String(R.hcl), cantidad: 0.000375 },
      { tipo: "consumible", ref: String(C.tubo), cantidad: 3 },
      { tipo: "consumible", ref: String(C.vial), cantidad: 9 },
      { tipo: "consumible", ref: String(C.filtro), cantidad: 6 },
    ],
    observaciones_generales: "Extracción e hidrólisis sin incidencias. Extracto entregado a FX-106; molienda restante en CO1.",
    nombre_quien_extrajo: "Luis",
    nombre_quien_superviso: "Ricardo",
    firma_quien_extrajo: firma("Luis"),
    firma_quien_superviso: firma("Ricardo"),
    firmantes: { extrajo: { usuario_id: luisId }, superviso: { usuario_id: ricardoId, token_firma: await tokenFirma("Luis", "Ricardo") } },
  });
  paso("Luis", `extrae E-D ${String(extraccion.folio_num).padStart(7, "0")} (hidrólisis, 5 equipos, insumos descontados; supervisó Ricardo)`, (await ok("Luis", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 6. Luis · analisis */
  const analisis = await ok("Luis", "POST", "/samples/analysis", {
    tipo_analisis: "toxinas_lipofilicas",
    metodo: "hplc_ms_ms",
    extraccion_id: extraccion.id,
    fecha_analisis: HOY,
    hora_inicio: hora(),
    equipo_id: E.MS1,
    equipo_clave_bitacora: "FX-TCB-MS1-01/1",
    equipo_folio_bitacora: await folioSugerido(E.MS1),
    condiciones: { temperatura_ambiente: "22 °C", humedad: "45 %", observaciones: "Curva de calibración aceptable (r² 0.998)." },
    resultados: [{ id_muestra: "D26-001", resultado: 48.9, unidad: "µg/kg", limite_deteccion: 5, incertidumbre: 5.9, limite_regulatorio: 160, cumple: "cumple", observacion: "Equivalentes de ácido okadaico" }],
    controles: {
      blanco: { resultado: "< LD", aceptable: "si" },
      material_referencia: { ref: String(R.crm), nombre: "CRM ácido okadaico (NRC CRM-OA-d)", lote: "OA-d-2025", caducidad: "2027-09-30", valor_esperado: "49.0", valor_obtenido: "47.8", aceptable: "si" },
      duplicado: { id_muestra: "D26-001_R1", diferencia: "3.1 %", aceptable: "si" },
    },
    uso_inventario: [{ tipo: "reactivo", ref: String(R.crm), cantidad: 0.05 }],
    observaciones: "Resultado por debajo del límite regulatorio (160 µg/kg).",
    analista_nombre: "Luis",
    analista_firma: firma("Luis"),
    firmantes: { analista: { usuario_id: luisId } },
  });
  const AID = analisis.id;
  paso("Luis", `registra el análisis A ${String(analisis.folio_num).padStart(7, "0")} (DSP 48.9 µg/kg, Cumple)`, (await ok("Luis", "GET", `/samples/reception/${RID}`)).item.estado);
  // Fase 10: evidencia instrumental obligatoria antes de enviar a revisión.
  const evidencia = new FormData();
  evidencia.set("archivo", new Blob([await pdfCromatograma(`A ${String(analisis.folio_num).padStart(7, "0")}`)], { type: "application/pdf" }), "cromatograma-D26-001.pdf");
  evidencia.set("tipo_evidencia", "cromatograma");
  evidencia.set("descripcion", "Cromatograma LC-MS/MS de la muestra D26-001");
  const adj = await ok("Luis", "POST", `/samples/analysis/${AID}/adjuntos`, evidencia);
  paso("Luis", "adjunta el cromatograma (evidencia instrumental)", `SHA-256 ${String(adj.item?.sha256 || "").slice(0, 12)}…`);
  await ok("Luis", "POST", `/samples/analysis/${AID}/enviar-revision`, {});
  paso("Luis", "envía el análisis a revisión", (await ok("Luis", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 7. Ricardo · revisa y aprueba */
  await ok("Ricardo", "POST", `/samples/analysis/${AID}/revisar`, { firma: firma("Ricardo"), observaciones: "Controles dentro de criterio; blanco < LD." });
  await ok("Ricardo", "POST", `/samples/analysis/${AID}/aprobar`, { firma: firma("Ricardo") });
  paso("Ricardo", "revisa y aprueba el análisis (con su contraseña)", (await ok("Ricardo", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 8. Luis · informe */
  const informe = await ok("Luis", "POST", "/informes", { recepcion_id: RID, analisis_ids: [AID], cliente: { nombre: "COFEPRIS · Comisión Estatal de Baja California", contacto: "Lic. Héctor Mendívil", correo: "hector.mendivil@ejemplo.mx", direccion: "Mexicali, Baja California" }, elaborado_firma: firma("Luis") });
  const IID = informe.id;
  const folioIR = `IR ${String(informe.folio_num).padStart(7, "0")}`;
  paso("Luis", `crea el informe ${folioIR} con el análisis`, (await ok("Luis", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 9. Ricardo · revisa el informe */
  await ok("Ricardo", "POST", `/informes/${IID}/revisar`, { firma: firma("Ricardo"), observaciones: "Datos del cliente y resultados verificados." });
  paso("Ricardo", `revisa el informe ${folioIR}`, (await ok("Ricardo", "GET", `/informes/${IID}`)).item.estado);

  /* 10. Patricia · autoriza y libera */
  await ok("Patricia", "POST", `/informes/${IID}/autorizar`, { firma: firma("Patricia") });
  const lib = await ok("Patricia", "POST", `/informes/${IID}/liberar`, {});
  if (!lib.item?.pdf_sha256) falla("El informe liberado no tiene PDF con SHA-256");
  paso("Patricia", `autoriza y libera ${folioIR} (PDF ${String(lib.item.pdf_sha256).slice(0, 12)}…)`, lib.item.estado);

  /* 11. Patricia · envio y confirmacion */
  const form = new FormData();
  form.set("destinatario_nombre", "Lic. Héctor Mendívil");
  form.set("destinatario_correo", "hector.mendivil@ejemplo.mx");
  form.set("enviado_en", new Date().toISOString());
  form.set("observaciones", "Enviado desde el correo institucional del laboratorio.");
  form.set("evidencia", new Blob([await pdfEvidencia(folioIR)], { type: "application/pdf" }), "correo-enviado.pdf");
  const envio = await ok("Patricia", "POST", `/informes/${IID}/envios`, form);
  await ok("Patricia", "POST", `/informes/${IID}/envios/${envio.envio_id}/confirmar`, { confirmacion_en: HOY, confirmacion_nota: "El cliente confirmó la recepción por teléfono" });
  paso("Patricia", `registra el envío de ${folioIR} al Lic. Héctor Mendívil con evidencia y la confirmación`, (await ok("Patricia", "GET", `/informes/${IID}`)).item.estado);

  /* 12. Ricardo · disposicion final */
  await ok("Ricardo", "POST", `/samples/reception/${RID}/disposicion`, { tipo: "rpbi", fecha: HOY, responsable: "Ricardo", firma: firma("Ricardo"), remanentes: "Molienda restante y extracto", observaciones: "Dispuesto como RPBI conforme al procedimiento." });
  paso("Ricardo", `registra la disposición final de ${folioR} (RPBI)`, (await ok("Ricardo", "GET", `/samples/reception/${RID}`)).item.estado);

  /* 13. Control de segundo usuario: recepcion duplicada */
  const dup = await ok("Mariana", "POST", "/samples/reception", recepcion({ hora_recepcion: hora() }));
  const folioDup = `R ${String((await ok("Mariana", "GET", `/samples/reception/${dup.id}`)).item.folio_num).padStart(7, "0")}`;
  paso("Mariana", `registra y acepta por error una recepción duplicada (${folioDup})`, "aceptada");
  const sol = await ok("Ricardo", "POST", `/samples/reception/${dup.id}/anular`, { motivo: `Registro duplicado de ${folioR}` }, [202]);
  paso("Ricardo", `solicita anular ${folioDup} ("Registro duplicado de ${folioR}")`, `solicitud #${sol.solicitud?.id} pendiente`);
  await ok("Patricia", "POST", `/solicitudes/${sol.solicitud?.id}/aprobar`, { motivo: "Confirmado: es la misma muestra ya registrada" });
  paso("Patricia", `aprueba la anulación de ${folioDup}`, (await ok("Patricia", "GET", `/samples/reception/${dup.id}`)).item.estado);

  // Resumen final.
  const final = { recepcion: (await ok("Ricardo", "GET", `/samples/reception/${RID}`)).item.estado, informe: (await ok("Patricia", "GET", `/informes/${IID}`)).item.estado, duplicada: (await ok("Ricardo", "GET", `/samples/reception/${dup.id}`)).item.estado };
  if (final.recepcion !== "cerrada" || final.informe !== "enviado" || final.duplicada !== "anulada") falla(`Estados finales inesperados: ${JSON.stringify(final)}`);
  console.log(`\nDemostración completa: ${folioR} ${final.recepcion}, ${folioIR} ${final.informe}, ${folioDup} ${final.duplicada}.`);
}

main().catch((error) => {
  console.error(`\nERROR: ${error instanceof PasoFallido ? error.message : error.stack || error}`);
  process.exit(1);
});
