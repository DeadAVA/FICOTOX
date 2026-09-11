/*
 * Carga de datos de demostración a través de la API (nunca escribe en la base
 * directamente: todo queda en la bitácora de auditoría como si lo hubiera
 * hecho el personal).
 *
 *   FICOTOX_EMAIL=admin@cicese.mx FICOTOX_PASSWORD=... node scripts/demo-seed.mjs
 *   BASE=http://localhost:3000/api   (por omisión)
 *
 * Es idempotente en lo posible: usuarios, roles, equipos, reactivos, consumibles
 * y documentos se buscan antes de crearse; las muestras se crean con IDs
 * internos fijos y se omiten si ya existen.
 *
 * Qué deja:
 *   - 3 personas de laboratorio (analista, coordinación técnica, dirección) con
 *     sus roles, para cumplir la regla de dos personas.
 *   - Equipos con clave de bitácora (BA1, LC1, CE1, VO1, ...), uno con
 *     calibración vencida y mantenimientos programados/vencidos/completados.
 *   - Soluciones preparadas (metanol:agua 50:50, NaOH 2.5 M, HCl 2.5 M, ácido
 *     acético 10 %) y consumibles del protocolo con existencia suficiente.
 *   - Documentos del SGC (manual, procedimientos, formatos) aprobados y vigentes,
 *     más uno en borrador y uno en revisión.
 *   - Nueve recepciones en distintos puntos del flujo: desde "registrada" hasta
 *     "cerrada" (con informe entregado y disposición final), incluidas una
 *     rechazada, una aceptada con desviación y una anulada.
 */

const BASE = process.env.BASE || "http://localhost:3000/api";
const ADMIN_EMAIL = process.env.FICOTOX_EMAIL;
const ADMIN_PASSWORD = process.env.FICOTOX_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Define FICOTOX_EMAIL y FICOTOX_PASSWORD (cuenta con rol Super Admin).");
  process.exit(1);
}

const log = (...args) => console.log(...args);
const warn = (...args) => console.log("  !", ...args);

async function api(method, path, body, { token, form } = {}) {
  const headers = { ...(form ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${BASE}${path}`, { method, headers, body: form ? body : body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json().catch(() => null) : null;
  return { status: res.status, data };
}

function must(res, what) {
  if (res.status >= 400) throw new Error(`${what}: HTTP ${res.status} ${res.data?.message || ""}`);
  return res.data;
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysAhead = (n) => daysAgo(-n);

/* ---------- 1. Sesión de administración ---------- */
const login = async (email, password) => must(await api("POST", "/auth/login", { email, password }), `login ${email}`);
const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
const T = admin.token;
log(`Sesión: ${admin.user?.nombre || ADMIN_EMAIL} (${admin.user?.rol || "rol"})`);

/* ---------- 2. Roles y personas ---------- */
const permisos = must(await api("GET", "/admin/permissions", null, { token: T }), "permisos").items;
const permId = (clave) => permisos.find((p) => p.clave === clave)?.id;
const perm = (clave, r = true, c = false, u = false, d = false) => (permId(clave) ? [{ permiso_id: permId(clave), can_read: r, can_create: c, can_update: u, can_delete: d }] : []);

const ROLES = {
  "Analista de laboratorio": {
    descripcion: "Captura recepciones, procesamientos, extracciones y análisis; consulta y descuenta inventario.",
    permissions: [...perm("dashboard"), ...perm("muestras", true, true, true, false), ...perm("reactivos", true, false, true), ...perm("consumibles", true, false, true), ...perm("equipos"), ...perm("mantenimiento"), ...perm("movimientos"), ...perm("documentos"), ...perm("informes", true, true, true)],
  },
  "Coordinación técnica": {
    descripcion: "Revisa y aprueba análisis, revisa informes, controla documentos y administra inventario.",
    permissions: [...perm("dashboard"), ...perm("muestras", true, true, true, true), ...perm("reactivos", true, true, true, true), ...perm("consumibles", true, true, true, true), ...perm("equipos", true, true, true, true), ...perm("mantenimiento", true, true, true, true), ...perm("movimientos"), ...perm("documentos", true, true, true, true), ...perm("informes", true, true, true, true), ...perm("aprobaciones", true, false, true), ...perm("auditoria")],
  },
  "Dirección del laboratorio": {
    descripcion: "Autoriza informes y aprueba documentos; consulta todo.",
    permissions: [...perm("dashboard"), ...perm("muestras"), ...perm("reactivos"), ...perm("consumibles"), ...perm("equipos"), ...perm("mantenimiento"), ...perm("movimientos"), ...perm("documentos", true, false, true), ...perm("informes", true, false, true), ...perm("aprobaciones", true, false, true), ...perm("auditoria"), ...perm("usuarios"), ...perm("roles")],
  },
};

const rolesExistentes = must(await api("GET", "/admin/roles", null, { token: T }), "roles").items;
const roleIds = {};
for (const [nombre, def] of Object.entries(ROLES)) {
  const found = rolesExistentes.find((r) => r.nombre === nombre);
  if (found) {
    roleIds[nombre] = found.id;
    continue;
  }
  const created = must(await api("POST", "/admin/roles", { nombre, ...def }, { token: T }), `rol ${nombre}`);
  roleIds[nombre] = created.id || created.role?.id;
  log(`Rol creado: ${nombre}`);
}

const PEOPLE = [
  { nombre: "Ana Lucía Ramírez", email: "ana.ramirez@cicese.mx", password: "Analista2026!", rol: "Analista de laboratorio", departamento: "LN-FICOTOX", cargo: "Analista" },
  { nombre: "Daniela Cortés", email: "daniela.cortes@cicese.mx", password: "Coordinacion2026!", rol: "Coordinación técnica", departamento: "LN-FICOTOX", cargo: "Coordinadora técnica" },
  { nombre: "Ernesto Gómez", email: "ernesto.gomez@cicese.mx", password: "Direccion2026!", rol: "Dirección del laboratorio", departamento: "LN-FICOTOX", cargo: "Director del laboratorio" },
];
const usuarios = must(await api("GET", "/admin/usuarios", null, { token: T }), "usuarios").items;
const tokens = {};
for (const p of PEOPLE) {
  if (!usuarios.find((u) => u.email === p.email)) {
    must(await api("POST", "/admin/usuarios", { nombre: p.nombre, email: p.email, activo: true, id_rol: roleIds[p.rol], departamento: p.departamento, password: p.password }, { token: T }), `usuario ${p.email}`);
    log(`Usuario creado: ${p.nombre} (${p.rol})`);
  }
  const s = await api("POST", "/auth/login", { email: p.email, password: p.password });
  if (s.status !== 200) {
    warn(`No pude entrar como ${p.email} (¿ya existía con otra contraseña?). Usaré la cuenta administradora en su lugar.`);
    tokens[p.email] = T;
  } else tokens[p.email] = s.data.token;
}
const ANA = tokens["ana.ramirez@cicese.mx"];
const DANI = tokens["daniela.cortes@cicese.mx"];
const ERN = tokens["ernesto.gomez@cicese.mx"];
const firma = (p) => `${p.nombre} - ${p.cargo}`;
const [ana, dani, ern] = PEOPLE;

/* ---------- 3. Equipos con clave de bitácora ---------- */
const EQUIPOS = [
  { nombre: "Balanza analítica", marca: "Ohaus", modelo: "PX224", numero_serie: "B443921507", ubicacion: "FX-105 · mesa de pesado", clave_bitacora: "FX-TCB-BA1", estado: "operativo", cal: daysAhead(140) },
  { nombre: "Licuadora de laboratorio", marca: "Oster", modelo: "BLSTPB-WBL", numero_serie: "LC1-2023-01", ubicacion: "FX-105 · procesamiento", clave_bitacora: "FX-TCB-LC1", estado: "operativo", cal: null },
  { nombre: "Licuadora de laboratorio", marca: "Oster", modelo: "BLSTPB-WBL", numero_serie: "LC2-2023-02", ubicacion: "FX-105 · procesamiento", clave_bitacora: "FX-TCB-LC2", estado: "mantenimiento", cal: null },
  { nombre: "Centrífuga refrigerada", marca: "Eppendorf", modelo: "5810 R", numero_serie: "5810FR123456", ubicacion: "FX-105", clave_bitacora: "FX-TCB-CE1", estado: "operativo", cal: daysAhead(200) },
  { nombre: "Vórtex", marca: "Scientific Industries", modelo: "Vortex-Genie 2", numero_serie: "2-296231", ubicacion: "FX-105", clave_bitacora: "FX-TCB-VO1", estado: "operativo", cal: null },
  { nombre: "Desionizador de agua", marca: "Merck Millipore", modelo: "Milli-Q IQ 7000", numero_serie: "F9NA12345", ubicacion: "FX-105", clave_bitacora: "FX-TCB-DI1", estado: "operativo", cal: daysAhead(60) },
  { nombre: "Homogeneizador", marca: "IKA", modelo: "T 18 digital ULTRA-TURRAX", numero_serie: "01.234567", ubicacion: "FX-105", clave_bitacora: "FX-TCB-HO1", estado: "operativo", cal: null },
  { nombre: "Cronómetro", marca: "Traceable", modelo: "1030", numero_serie: "CR1-0045", ubicacion: "FX-105", clave_bitacora: "FX-TCB-CR1", estado: "operativo", cal: daysAgo(12) },
  { nombre: "Micropipeta 100–1000 µL", marca: "Eppendorf", modelo: "Research plus", numero_serie: "N12345A", ubicacion: "FX-105", clave_bitacora: "FX-TCB-MP1", estado: "operativo", cal: daysAhead(95) },
  { nombre: "Micropipeta 20–200 µL", marca: "Eppendorf", modelo: "Research plus", numero_serie: "N12346B", ubicacion: "FX-105", clave_bitacora: "FX-TCB-MP2", estado: "calibracion_pendiente", cal: daysAgo(3) },
  { nombre: "Termoblock", marca: "Thermo Scientific", modelo: "Digital Dry Bath", numero_serie: "TB1-88213", ubicacion: "FX-105", clave_bitacora: "FX-TCB-TB1", estado: "operativo", cal: daysAhead(180) },
  { nombre: "Termómetro digital", marca: "Traceable", modelo: "4000", numero_serie: "TM1-2211", ubicacion: "FX-105", clave_bitacora: "FX-TCB-TM1", estado: "operativo", cal: daysAhead(30) },
  { nombre: "Probeta graduada 25 mL", marca: "Kimble", modelo: "Clase A", numero_serie: "PR1", ubicacion: "FX-105", clave_bitacora: "FX-TCB-PR1", estado: "operativo", cal: null },
  { nombre: "UPLC-MS/MS", marca: "Waters", modelo: "Acquity I-Class · Xevo TQ-S micro", numero_serie: "K21QSM123", ubicacion: "FX-106 · instrumental", clave_bitacora: "FX-TCB-CL1", estado: "operativo", cal: daysAhead(250) },
  { nombre: "HPLC-UV/FLD", marca: "Agilent", modelo: "1260 Infinity II", numero_serie: "DEACD12345", ubicacion: "FX-106 · instrumental", clave_bitacora: "FX-TCB-CL2", estado: "operativo", cal: daysAhead(210) },
  { nombre: "Microscopio invertido", marca: "Zeiss", modelo: "Axio Vert.A1", numero_serie: "3848000123", ubicacion: "FX-104 · fitoplancton", clave_bitacora: "FX-TCB-MI1", estado: "operativo", cal: null },
  { nombre: "Refrigerador de muestras", marca: "Torrey", modelo: "R-14", numero_serie: "RE1-9981", ubicacion: "FX-105", clave_bitacora: "FX-TCB-RE1", estado: "operativo", cal: daysAhead(45) },
  { nombre: "Congelador -20 °C", marca: "Torrey", modelo: "CV-20", numero_serie: "CO1-1101", ubicacion: "FX-105", clave_bitacora: "FX-TCB-CO1", estado: "operativo", cal: daysAhead(45) },
  { nombre: "Ultracongelador -80 °C", marca: "Thermo Scientific", modelo: "TSX", numero_serie: "CO2-77120", ubicacion: "FX-105", clave_bitacora: "FX-TCB-CO2", estado: "operativo", cal: daysAhead(45) },
];
let equipos = must(await api("GET", "/inventory/equipos", null, { token: DANI }), "equipos").items;
for (const e of EQUIPOS) {
  if (equipos.find((x) => x.clave_bitacora === e.clave_bitacora)) continue;
  must(await api("POST", "/inventory/equipos", { nombre: e.nombre, marca: e.marca, modelo: e.modelo, numero_serie: e.numero_serie, ubicacion: e.ubicacion, clave_bitacora: e.clave_bitacora, estado: e.estado, fecha_prox_calibracion: e.cal }, { token: DANI }), `equipo ${e.clave_bitacora}`);
}
equipos = must(await api("GET", "/inventory/equipos", null, { token: DANI }), "equipos").items;
const EQ = (clave) => equipos.find((x) => x.clave_bitacora === clave);
log(`Equipos: ${equipos.length}`);

/* ---------- 4. Mantenimientos ---------- */
const mantenimientos = must(await api("GET", "/inventory/mantenimientos", null, { token: DANI }), "mantenimientos").items;
if (mantenimientos.length < 4) {
  const MANT = [
    { clave: "FX-TCB-BA1", tipo: "calibracion", fecha_programada: daysAgo(40), fecha_realizado: daysAgo(38), estado: "completado", tecnico_proveedor: "Metrología Baja S.A. de C.V.", observaciones: "Calibración con pesas clase E2; certificado MB-2026-0412." },
    { clave: "FX-TCB-CE1", tipo: "preventivo", fecha_programada: daysAhead(12), estado: "programado", tecnico_proveedor: "Servicio Eppendorf", observaciones: "Revisión de rotor y sensores de temperatura." },
    { clave: "FX-TCB-LC2", tipo: "correctivo", fecha_programada: daysAgo(2), estado: "en_proceso", tecnico_proveedor: "Taller interno", observaciones: "Cambio de acoplamiento del motor." },
    { clave: "FX-TCB-CR1", tipo: "calibracion", fecha_programada: daysAgo(15), estado: "vencido", tecnico_proveedor: "Metrología Baja S.A. de C.V.", observaciones: "Pendiente de reprogramar con el proveedor." },
    { clave: "FX-TCB-CL1", tipo: "preventivo", fecha_programada: daysAhead(25), estado: "programado", tecnico_proveedor: "Waters México", observaciones: "Mantenimiento semestral del sistema UPLC-MS/MS." },
    { clave: "FX-TCB-MP2", tipo: "calibracion", fecha_programada: daysAhead(5), estado: "programado", tecnico_proveedor: "Metrología Baja S.A. de C.V.", observaciones: "Calibración gravimétrica ISO 8655." },
  ];
  for (const m of MANT) {
    const eq = EQ(m.clave);
    if (!eq) continue;
    must(await api("POST", "/inventory/mantenimientos", { id_equipo: eq.id, tipo: m.tipo, fecha_programada: m.fecha_programada, fecha_realizado: m.fecha_realizado || null, estado: m.estado, tecnico_proveedor: m.tecnico_proveedor, observaciones: m.observaciones }, { token: DANI }), `mantenimiento ${m.clave}`);
  }
  log("Mantenimientos creados");
}

/* ---------- 5. Reactivos y consumibles del protocolo ---------- */
let reactivos = must(await api("GET", "/inventory/reactivos?search=", null, { token: DANI }), "reactivos").items;
const findReactivo = (re) => reactivos.find((r) => re.test(String(r.producto || r.nombre || r.item_name || "")));
const SOLUCIONES = [
  { item_name: "Metanol:agua 50:50 (v/v)", vendor: "Preparación interna", lot_number: "PR-2026-014", amount_in_stock: 2, expiration_date: daysAhead(20), localizacion: "FX-105", sub_localizacion: "Campana · gaveta 2", tipo_sustancia: "Solución preparada", physical_state: "Líquido", presentacion: "Frasco ámbar 1 L", observaciones: "Folio de preparación FX-TCR-PR-014" },
  { item_name: "NaOH 2.5 M", vendor: "Preparación interna", lot_number: "PR-2026-011", amount_in_stock: 0.5, expiration_date: daysAhead(45), localizacion: "FX-105", sub_localizacion: "Gaveta de bases", tipo_sustancia: "Solución preparada", physical_state: "Líquido", presentacion: "Frasco 500 mL", observaciones: "Folio de preparación FX-TCR-PR-011" },
  { item_name: "HCl 2.5 M", vendor: "Preparación interna", lot_number: "PR-2026-012", amount_in_stock: 0.5, expiration_date: daysAhead(45), localizacion: "FX-105", sub_localizacion: "Gaveta de ácidos", tipo_sustancia: "Solución preparada", physical_state: "Líquido", presentacion: "Frasco 500 mL", observaciones: "Folio de preparación FX-TCR-PR-012" },
  { item_name: "Ácido acético 10 %", vendor: "Preparación interna", lot_number: "PR-2026-013", amount_in_stock: 1, expiration_date: daysAhead(30), localizacion: "FX-105", sub_localizacion: "Gaveta de ácidos", tipo_sustancia: "Solución preparada", physical_state: "Líquido", presentacion: "Frasco 1 L", observaciones: "Folio de preparación FX-TCR-PR-013" },
];
for (const sol of SOLUCIONES) {
  if (reactivos.find((r) => String(r.producto || r.item_name || "") === sol.item_name)) continue;
  must(await api("POST", "/inventory/reactivos", { tipo_reactivo: "miscelaneos", producto: sol.item_name, ...sol, unidad: "L" }, { token: DANI }), `reactivo ${sol.item_name}`);
}
reactivos = must(await api("GET", "/inventory/reactivos?search=", null, { token: DANI }), "reactivos").items;
const REFILL_REACTIVOS = [
  { re: /^Metanol HPLC/i, cantidad: 4, motivo: "Entrada: 1 garrafón de 4 L (orden de compra OC-2026-088)" },
  { re: /^Agua desionizada/i, cantidad: 20, motivo: "Producción del desionizador DI1 (20 L)" },
];
for (const rf of REFILL_REACTIVOS) {
  const r = findReactivo(rf.re);
  if (!r) continue;
  if (Number(r.cantidad_actual || 0) >= 6) continue;
  must(await api("POST", `/inventory/reactivos/${r.id}/refill`, { cantidad: rf.cantidad, motivo: rf.motivo }, { token: DANI }), `refill ${r.producto}`);
}
log(`Reactivos: ${reactivos.length}`);

let consumibles = must(await api("GET", "/consumables?search=", null, { token: DANI }), "consumibles").items;
const findConsumible = (re) => consumibles.find((c) => re.test(String(c.producto || "")));
const CONSUMIBLES = [
  { producto: "Vial ámbar para automuestreador 2 mL", marca: "Agilent", proveedor: "Agilent", catalogo_parte_cas: "5182-0716", tamano_capacidad: "2 mL", contenedor: "Caja 100", piezas: 400, stock_maximo: 600 },
  { producto: "Filtro de jeringa 0.45 µm Nylon 13 mm", marca: "Millex", proveedor: "Merck", catalogo_parte_cas: "SLHNX13NL", tamano_capacidad: "13 mm", contenedor: "Caja 100", piezas: 300, stock_maximo: 500 },
  { producto: "Bolsa hermética con cierre 18 × 20 cm", marca: "Ziploc", proveedor: "Costco", catalogo_parte_cas: "ZP-1820", tamano_capacidad: "18 × 20 cm", contenedor: "Paquete 100", piezas: 180, stock_maximo: 300 },
  { producto: "Tubo Falcon 15 mL", marca: "Corning", proveedor: "Sigma-Aldrich", catalogo_parte_cas: "CLS430791", tamano_capacidad: "15 mL", contenedor: "Bolsa 50", piezas: 250, stock_maximo: 500 },
  { producto: "Jeringa desechable 3 mL", marca: "BD", proveedor: "Proquiver", catalogo_parte_cas: "309657", tamano_capacidad: "3 mL", contenedor: "Caja 100", piezas: 150, stock_maximo: 300 },
];
for (const c of CONSUMIBLES) {
  if (consumibles.find((x) => x.producto === c.producto)) continue;
  must(await api("POST", "/consumables", { ...c, fecha_ingreso: daysAgo(20) }, { token: DANI }), `consumible ${c.producto}`);
}
consumibles = must(await api("GET", "/consumables?search=", null, { token: DANI }), "consumibles").items;
const REFILL_CONSUMIBLES = [
  { re: /^Cartucho Bond Elut SAX/i, cantidad: 50, motivo: "Entrada: caja de 50 cartuchos (OC-2026-091)" },
  { re: /^Tubo ambar para centrifuga/i, cantidad: 100, motivo: "Entrada: 2 cajas de 50 (OC-2026-091)" },
  { re: /^Punta para micropipeta 1000/i, cantidad: 480, motivo: "Entrada: 5 racks de 96 puntas" },
  { re: /^Punta para micropipeta 5000/i, cantidad: 200, motivo: "Entrada: 2 cajas" },
];
for (const rf of REFILL_CONSUMIBLES) {
  const c = findConsumible(rf.re);
  if (!c || Number(c.piezas || 0) >= 40) continue;
  must(await api("POST", `/consumables/${c.id}/refill`, { cantidad: rf.cantidad, motivo: rf.motivo }, { token: DANI }), `refill ${c.producto}`);
}
consumibles = must(await api("GET", "/consumables?search=", null, { token: DANI }), "consumibles").items;
log(`Consumibles: ${consumibles.length}`);

const ref = (item) => String(item.id);
const R = {
  metanolAgua: findReactivo(/^Metanol:agua 50:50/i),
  metanol: findReactivo(/^Metanol HPLC/i),
  aguaDes: findReactivo(/^Agua desionizada/i),
  acetico10: findReactivo(/^Ácido acético 10/i),
  naoh: findReactivo(/^NaOH 2\.5/i),
  hcl: findReactivo(/^HCl 2\.5/i),
};
const C = {
  tuboAmbar: findConsumible(/^Tubo ambar para centrifuga/i),
  vial: findConsumible(/^Vial ámbar para automuestreador/i),
  filtro: findConsumible(/^Filtro de jeringa 0\.45/i),
  bolsa: findConsumible(/^Bolsa hermética/i),
  falcon: findConsumible(/^Tubo Falcon 15/i),
  cartucho: findConsumible(/^Cartucho Bond Elut SAX/i),
  puntas: findConsumible(/^Punta para micropipeta 1000/i),
};

/* ---------- 6. Documentos del SGC ---------- */
const DOCS = [
  { clave: "FX-MC", titulo: "Manual de calidad del LN-FICOTOX", descripcion: "Política y objetivos de calidad, estructura, procesos técnicos y de gestión conforme a ISO/IEC 17025:2017.", estado: "vigente" },
  { clave: "FX-GCP-CD", titulo: "Procedimiento para el control de documentos", descripcion: "Elaboración, revisión, aprobación, distribución y obsolescencia de los documentos del SGC.", estado: "vigente" },
  { clave: "FX-GCP-CR", titulo: "Procedimiento para el control de registros", descripcion: "Identificación, almacenamiento, protección, retención y disposición de los registros.", estado: "vigente" },
  { clave: "FX-TCF-GMR", titulo: "Formato de recepción de muestras", descripcion: "Registro de ingreso, inspección visual y decisión de aceptación de la muestra.", estado: "vigente" },
  { clave: "FX-TCF-GMP", titulo: "Formato de procesamiento de muestras", descripcion: "Preparación de moluscos bivalvos y peces: lavado, desconche, molienda y resguardo.", estado: "vigente" },
  { clave: "FX-TCF-GME-A", titulo: "Formato de extracción de muestra · ASP", descripcion: "Extracción de ácido domoico con metanol:agua 50:50 y limpieza opcional en cartucho SAX.", estado: "vigente" },
  { clave: "FX-TCF-GME-D", titulo: "Formato de extracción de muestra · DSP", descripcion: "Doble extracción con metanol 100 %, aforo a 20 mL e hidrólisis alcalina.", estado: "vigente" },
  { clave: "FX-TCI-DSP", titulo: "Instructivo de análisis de toxinas lipofílicas por UPLC-MS/MS", descripcion: "Condiciones cromatográficas, calibración, controles de calidad y criterios de aceptación.", estado: "en_revision" },
  { clave: "FX-TCI-PSP", titulo: "Instructivo de análisis de toxinas paralizantes", descripcion: "Borrador en elaboración para el método de PSP por HPLC-FLD.", estado: "borrador" },
];
const docsExistentes = must(await api("GET", "/documentos-sgc", null, { token: DANI }), "documentos").items;
for (const d of DOCS) {
  if (docsExistentes.find((x) => x.clave === d.clave)) continue;
  const form = new FormData();
  form.append("clave", d.clave);
  form.append("titulo", d.titulo);
  form.append("descripcion", d.descripcion);
  form.append("fecha_emision", daysAgo(90));
  form.append("elaboro", JSON.stringify({ nombre: dani.nombre, cargo: dani.cargo }));
  form.append("archivo", new Blob([`${d.clave}\n${d.titulo}\n\n${d.descripcion}\n\nDocumento de demostración.`], { type: "text/plain" }), `${d.clave}.txt`);
  const created = must(await api("POST", "/documentos-sgc", form, { token: DANI, form: true }), `documento ${d.clave}`);
  const id = created.id;
  if (d.estado === "en_revision" || d.estado === "vigente") must(await api("POST", `/documentos-sgc/${id}/enviar-revision`, { reviso: { nombre: dani.nombre, cargo: dani.cargo } }, { token: DANI }), `revisión ${d.clave}`);
  if (d.estado === "vigente") must(await api("POST", `/documentos-sgc/${id}/aprobar`, { aprobo: { nombre: ern.nombre, cargo: ern.cargo }, fecha_vigencia: daysAhead(365 * 3) }, { token: ERN }), `aprobar ${d.clave}`);
}
log("Documentos del SGC listos");

/* ---------- 7. Flujo de muestras ---------- */
const REQ = [
  "Se presentan en talla comercial.",
  "Se presentan sin alteraciones (estado de descomposición, valvas abiertas/rotas, cuerpos eviscerados).",
  "En el momento de su presentación no han transcurrido más de 24 horas después de haber sido extraídas.",
  "Se presentan en bolsa o botella de plástico transparente, sin alteraciones, como contenedor primario.",
  "El contenedor primario es transportado en una hielera con blue ice/hielo suficiente para mantener la temperatura entre 4 y 10 °C.",
  "Se presentan en cantidad o volumen suficiente para el(los) análisis solicitados.",
  "Se presenta con algún tipo de fijador (en caso positivo especificar el tipo).",
];
const inspeccion = (overrides = {}, general = null) => ({
  checklist: REQ.map((requisito, i) => ({ requisito, estado: overrides[i]?.estado || (i === 6 ? "NA" : "C"), observacion: overrides[i]?.observacion || null })),
  observaciones_generales: general,
});

const recepcionesExistentes = must(await api("GET", "/samples/reception?search=", null, { token: ANA }), "recepciones").items;
const yaExiste = (idInterno) => recepcionesExistentes.find((r) => String(r.id_interno || "").includes(idInterno));

const custodio = (lugar, detalle) => ({ nombre_cargo_firma: ana.nombre, cargo: ana.cargo, firma_digital: null, lugar_resguardo: lugar, lugar_otro: detalle || null });

async function recepcion(spec) {
  if (yaExiste(spec.id_interno)) {
    log(`Recepción ${spec.id_interno} ya existe; se omite`);
    return null;
  }
  const decision = spec.decision || null;
  const nc = spec.inspeccion?.checklist?.some((row) => row.estado === "NC");
  const payload = {
    fecha_recepcion: spec.fecha,
    hora_recepcion: spec.hora || "09:15",
    recibido_por: ana.nombre,
    medio_recepcion: spec.medio || "directa",
    solicitante: spec.solicitante,
    muestra_unica: !spec.lote,
    id_interno: spec.lote ? null : spec.id_interno,
    fecha_muestra: spec.fecha_muestra || daysAgo(1),
    especificaciones: spec.especificaciones || null,
    lote_muestras: spec.lote || [],
    analisis: { tipos: spec.tipos, metodos: spec.metodos, tipos_muestra: spec.tipos_muestra, observaciones: spec.analisis_obs || null },
    inspeccion: spec.inspeccion || inspeccion(),
    decision_aceptacion: decision,
    aceptacion: decision
      ? {
          fecha: spec.fecha,
          responsable: dani.nombre,
          temperatura_llegada: spec.temperatura || "6 °C",
          observaciones: spec.aceptacion_obs || null,
          comunicacion_cliente: nc || decision !== "aceptada" ? { requerida: true, fecha: spec.fecha, medio: "telefono", persona: spec.contacto, respuesta: spec.respuesta_cliente || "De acuerdo con continuar" } : { requerida: false },
        }
      : {},
    datos_solicitante: { nombre_entrega: spec.contacto, firma_conformidad: null, conformidad: true },
    datos_custodio: custodio(spec.resguardo || "refrigerador", spec.resguardo_detalle || (spec.resguardo === "congelador" ? "CO1" : "RE1")),
  };
  const created = must(await api("POST", "/samples/reception", payload, { token: ANA }), `recepción ${spec.id_interno}`);
  const item = must(await api("GET", `/samples/reception/${created.id}`, null, { token: ANA }), "recepción creada").item;
  log(`Recepción R ${String(item.folio_num).padStart(7, "0")} · ${spec.id_interno} · ${spec.solicitante} · ${decision || "sin decisión"}`);
  return item;
}

async function procesamiento(rec, spec) {
  const detalle = must(await api("GET", `/samples/reception/${rec.id}`, null, { token: ANA }), "detalle recepción").item;
  const lote = Array.isArray(detalle.lote_muestras) ? detalle.lote_muestras : [];
  const esLote = lote.length > 0;
  const idInterno = esLote ? lote.map((m) => m.id_interno).join(", ") : detalle.id_interno;
  const bivalvos = spec.organismo === "bivalvos";
  const steps = bivalvos
    ? [
        { step: "Seleccionar organismos de mayor talla (~30)" },
        { step: "Lavar exterior con agua corriente" },
        { step: "Abrir valvas" },
        { step: "Lavar interior con agua corriente" },
        { step: "Desconchar" },
        { step: "Drenar 5 min", equipo_id: EQ("FX-TCB-CR1")?.id },
        { step: "Moler 1-2 min 100-150g", equipo_id: EQ("FX-TCB-LC1")?.id },
        { step: "Pesar molienda obtenida", equipo_id: EQ("FX-TCB-BA1")?.id, peso: spec.peso },
        { step: "Reservar molienda en bolsa hermetica" },
      ]
    : [
        { step: "Seleccionar aprox. 10 organismos" },
        { step: "Partir organismos por la mitad" },
        { step: "Moler 1-2 min 100-150g", equipo_id: EQ("FX-TCB-LC1")?.id },
        { step: "Pesar molienda obtenida", equipo_id: EQ("FX-TCB-BA1")?.id, peso: spec.peso },
        { step: "Reservar molienda en bolsa hermetica" },
      ];
  const payload = {
    recepcion_id: rec.id,
    folio_recepcion_num: detalle.folio_num,
    fecha_procesamiento: spec.fecha,
    hora_procesamiento: spec.hora || "11:00",
    muestra_tipo: esLote ? "lote" : "unica",
    id_interno: idInterno,
    lote_seleccion: esLote ? lote.map((m) => ({ ...m, trabajar: true })) : [],
    tipo_organismo: [spec.organismo],
    parte_organismo: spec.partes || ["cuerpo_completo"],
    bivalvos_steps: bivalvos ? steps.map((s) => ({ ...s, equipo_id: s.equipo_id ?? null, peso: s.peso ?? null })) : [],
    sardinas_steps: bivalvos ? [] : steps.map((s) => ({ ...s, equipo_id: s.equipo_id ?? null, peso: s.peso ?? null })),
    resguardo: { entregado_extraccion: !!spec.entregado, refrigerador_re1: !spec.entregado, congelador_co1: false, congelador_co2: false, congelador_co3: false },
    observaciones_generales: spec.observaciones || null,
    nombre_quien_proceso: firma(ana),
    nombre_quien_superviso: firma(dani),
    uso_inventario: C.bolsa ? [{ tipo: "consumible", ref: ref(C.bolsa), cantidad: esLote ? lote.length : 1 }] : [],
  };
  const created = must(await api("POST", "/samples/processing", payload, { token: ANA }), `procesamiento de ${rec.id}`);
  const item = must(await api("GET", `/samples/processing/${created.id}`, null, { token: ANA }), "procesamiento creado").item;
  log(`  Procesamiento P ${String(item.folio_num).padStart(7, "0")}`);
  return { ...item, idInterno, muestras: esLote ? lote.map((m) => m.id_interno) : [detalle.id_interno] };
}

const pesosRows = (muestras, base, extra = () => ({})) => [
  { id_muestra: "Blanco", organismo: "Agua desionizada", es_blanco: true, replica: "BlancoR1", peso_muestra: base, peso_replica: base + 0.01, ...extra("Blanco", 0) },
  ...muestras.map((id, i) => ({ id_muestra: id, organismo: null, es_blanco: false, replica: `${id}_R1`, peso_muestra: Number((base + 0.02 + i * 0.01).toFixed(2)), peso_replica: Number((base - 0.01 + i * 0.01).toFixed(2)), ...extra(id, i + 1) })),
];

const equiposUsados = (claves, usos) =>
  claves.map((clave, i) => {
    const eq = EQ(clave);
    return { equipo_id: eq?.id ?? null, nombre: eq?.nombre || clave, uso: usos[i] || null, clave_bitacora: eq ? `${clave}-${eq.id}/1` : clave, folio_bitacora: String(120 + i * 7) };
  });

async function extraccionDSP(proc, spec) {
  const n = proc.muestras.length + 1; // muestras + blanco
  const tubos = n * 2; // con réplica
  const hidrolisis = spec.hidrolisis !== false;
  const payload = {
    tipo_registro: "E-D",
    fecha_extraccion: spec.fecha,
    hora_extraccion: spec.hora || "12:30",
    procesamiento_id: proc.id,
    folio_procesamiento_num: proc.folio_num,
    muestra_tipo: proc.muestras.length > 1 ? "lote" : "unica",
    id_interno: proc.idInterno,
    tipo_molienda: spec.molienda || "fresca",
    pasos: {
      checklist: [
        ...(spec.molienda === "congelada" ? ["Descongelar en oscuridad", "Homogeneizar en licuadora 30-45 s reincorporando el liquido de descongelacion"] : []),
        "Submuestrear por duplicado en tubo ambar para centrifuga (2 ± 0.05 g)",
        "Pesar agua desionizada para el blanco (2 ± 0.05 g)",
        "Adicionar 9 mL de metanol 100 % a muestras y blanco",
        "Agitar en vortex durante 3 min",
        "Centrifugar a 2,000 g o mas durante 10 min a 20 °C",
        "Transferir sobrenadante a matraz de aforacion de 20 mL",
        "Adicionar 9 mL de metanol 100 % al pellet",
        "Homogeneizar por 1 min",
        "Centrifugar a 2,000 g durante 10 min a 20 °C",
        "Recuperar sobrenadante, combinar y aforar a 20 mL con metanol 100 %",
        "Filtrar 1 mL con filtro de 0.45 µm y transferir a vial ambar",
        ...(hidrolisis ? ["Transferir 1 mL del extracto a vial ambar (hidrolisis)", "Agregar 125 µL de NaOH 2.5 M", "Agitar en vortex 30 s y pesar el tubo", "Calentar a 76 °C por 40 min", "Enfriar a temperatura ambiente", "Pesar de nuevo y completar al peso inicial con metanol 100 %", "Agregar 125 µL de HCl 2.5 M", "Agitar en vortex 30 s", "Filtrar 1 mL con filtro de 0.45 µm y transferir a vial ambar (hidrolizado)"] : []),
      ],
      id_equipo_licuadora: spec.molienda === "congelada" ? String(EQ("FX-TCB-LC1")?.id) : null,
      id_balanza: String(EQ("FX-TCB-BA1")?.id),
      folio_verificacion_balanza: "VB-2026-118",
      folio_verificacion_balanza_blanco: "VB-2026-118",
      id_desionizador: String(EQ("FX-TCB-DI1")?.id),
      id_vortex: String(EQ("FX-TCB-VO1")?.id),
      id_cronometro: String(EQ("FX-TCB-CR1")?.id),
      id_centrifuga: String(EQ("FX-TCB-CE1")?.id),
      id_homogeneizador: String(EQ("FX-TCB-HO1")?.id),
      id_micropipeta: hidrolisis ? String(EQ("FX-TCB-MP2")?.id) : null,
      id_termoblock: hidrolisis ? String(EQ("FX-TCB-TB1")?.id) : null,
      id_termometro: hidrolisis ? String(EQ("FX-TCB-TM1")?.id) : null,
      consumible_tubo_centrifuga: C.tuboAmbar ? ref(C.tuboAmbar) : null,
      reactivo_metanol_1: R.metanol ? ref(R.metanol) : null,
      reactivo_metanol_2: R.metanol ? ref(R.metanol) : null,
      reactivo_metanol_aforo: R.metanol ? ref(R.metanol) : null,
      cantidad_aforo_ml: 2,
      consumible_filtro: C.filtro ? ref(C.filtro) : null,
      consumible_vial: C.vial ? ref(C.vial) : null,
      consumible_vial_hidrolisis: hidrolisis && C.vial ? ref(C.vial) : null,
      reactivo_naoh: hidrolisis && R.naoh ? ref(R.naoh) : null,
      reactivo_hcl: hidrolisis && R.hcl ? ref(R.hcl) : null,
      consumible_filtro_hidrolisis: hidrolisis && C.filtro ? ref(C.filtro) : null,
      consumible_vial_final: hidrolisis && C.vial ? ref(C.vial) : null,
      hidrolisis: hidrolisis ? "si" : "no",
      temperatura_calentamiento: hidrolisis ? 76 : null,
      tiempo_calentamiento_min: hidrolisis ? 40 : null,
      filtrado: { volumen_filtrado: "1", volumen_recuperado: "0.6", filtro: "0.45 µm" },
      resguardo_extracto: { entregado_fx106: true, refrigerador_re1: false, congelador_co1: false, congelador_co2: false, congelador_co3: false },
      resguardo_molienda_restante: { no_sobro: false, refrigerador_re1: false, congelador_co1: true, congelador_co2: false, congelador_co3: false },
    },
    registro_pesos: pesosRows(proc.muestras, 2.0, (id, i) => ({ matraz: `M-${String(i + 1).padStart(2, "0")}`, matraz_replica: `M-${String(i + 1).padStart(2, "0")}R`, peso_pre_muestra: Number((5.1 + i * 0.02).toFixed(2)), peso_pre_replica: Number((5.11 + i * 0.02).toFixed(2)), peso_post_muestra: Number((5.09 + i * 0.02).toFixed(2)), peso_post_replica: Number((5.1 + i * 0.02).toFixed(2)) })),
    equipos: equiposUsados(["FX-TCB-BA1", "FX-TCB-DI1", "FX-TCB-CE1", "FX-TCB-VO1", "FX-TCB-HO1", "FX-TCB-CR1", ...(hidrolisis ? ["FX-TCB-MP2", "FX-TCB-TB1", "FX-TCB-TM1"] : [])], ["Balanza · pasos 3, 4, 17 y 20", "Desionizador · paso 4", "Centrífuga · pasos 8 y 12", "Vórtex · pasos 7, 17 y 22", "Homogeneizador · paso 11", "Cronómetro · pasos 7 y 18", "Micropipeta · pasos 16 y 21", "Termoblock · paso 18", "Termómetro · paso 18"]),
    uso_inventario: [
      ...(C.tuboAmbar ? [{ tipo: "consumible", ref: ref(C.tuboAmbar), cantidad: tubos }] : []),
      ...(R.metanol ? [{ tipo: "reactivo", ref: ref(R.metanol), cantidad: Number((tubos * 0.02).toFixed(3)) }] : []),
      ...(C.filtro ? [{ tipo: "consumible", ref: ref(C.filtro), cantidad: hidrolisis ? tubos * 2 : tubos }] : []),
      ...(C.vial ? [{ tipo: "consumible", ref: ref(C.vial), cantidad: hidrolisis ? tubos * 3 : tubos }] : []),
      ...(hidrolisis && R.naoh ? [{ tipo: "reactivo", ref: ref(R.naoh), cantidad: Number((tubos * 0.000125).toFixed(6)) }] : []),
      ...(hidrolisis && R.hcl ? [{ tipo: "reactivo", ref: ref(R.hcl), cantidad: Number((tubos * 0.000125).toFixed(6)) }] : []),
    ],
    observaciones_generales: spec.observaciones || null,
    nombre_quien_extrajo: firma(ana),
    nombre_quien_superviso: firma(dani),
    estado: "registrada",
  };
  const created = must(await api("POST", "/samples/extraction", payload, { token: ANA }), `extracción DSP de P${proc.folio_num}`);
  log(`  Extracción E-D ${String(created.folio_num).padStart(7, "0")} (${tubos} tubos${hidrolisis ? ", con hidrólisis" : ""})`);
  return created;
}

async function extraccionASP(proc, spec) {
  const n = proc.muestras.length + 1;
  const tubos = n * 2;
  const limpieza = !!spec.limpieza;
  const payload = {
    tipo_registro: "E-A",
    fecha_extraccion: spec.fecha,
    hora_extraccion: spec.hora || "12:00",
    procesamiento_id: proc.id,
    folio_procesamiento_num: proc.folio_num,
    muestra_tipo: proc.muestras.length > 1 ? "lote" : "unica",
    id_interno: proc.idInterno,
    tipo_molienda: spec.molienda || "fresca",
    pasos: {
      checklist: [
        ...(spec.molienda === "congelada" ? ["Descongelar en oscuridad", "Homogeneizar 30-45s sin descartar liquido de descongelacion"] : []),
        "Submuestrear por duplicado en tubo protegido de luz",
        "Pesar agua desionizada para blanco",
        "Adicionar 16 mL de metanol agua 50 50",
        "Homogeneizar durante 3 minutos",
        "Centrifugar a 3000g o mas durante 10 minutos",
        "Filtrar sobrenadante a vial ambar",
        ...(limpieza ? ["Evaluar limpieza del extracto", "Lavar cartucho con agua desionizada", "Descartar líquido", "Limpieza del extracto", "Lavar con agua destilada", "Descartar líquido hasta sequedad", "Colocar tubos Falcon", "Adicionar ácido acético", "Agitar en vortex", "Transferir alícuota a vial ámbar"] : []),
      ],
      id_equipo_licuadora: spec.molienda === "congelada" ? String(EQ("FX-TCB-LC1")?.id) : null,
      id_balanza: String(EQ("FX-TCB-BA1")?.id),
      folio_verificacion_balanza: "VB-2026-121",
      folio_verificacion_balanza_blanco: "VB-2026-121",
      id_probeta: String(EQ("FX-TCB-PR1")?.id),
      folio_reactivo: R.metanolAgua ? ref(R.metanolAgua) : null,
      folio_preparacion_metanol_agua: "FX-TCR-PR-014",
      id_homogeneizador: String(EQ("FX-TCB-HO1")?.id),
      id_cronometro: String(EQ("FX-TCB-CR1")?.id),
      id_centrifuga: String(EQ("FX-TCB-CE1")?.id),
      consumible_filtro: C.filtro ? ref(C.filtro) : null,
      consumible_vial: C.vial ? ref(C.vial) : null,
      limpieza: limpieza ? "si" : "no",
      limp_consumible_cartucho: limpieza && C.cartucho ? ref(C.cartucho) : null,
      limp_micropipeta_1: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_reactivo_metanol: limpieza && R.metanol ? ref(R.metanol) : null,
      limp_micropipeta_2: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_reactivo_desionizada: limpieza && R.aguaDes ? ref(R.aguaDes) : null,
      limp_micropipeta_4: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_micropipeta_5: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_reactivo_destilada: limpieza && R.aguaDes ? ref(R.aguaDes) : null,
      limp_consumible_falcon15: limpieza && C.falcon ? ref(C.falcon) : null,
      limp_micropipeta_8: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_reactivo_acetico: limpieza && R.acetico10 ? ref(R.acetico10) : null,
      folio_preparacion_acetico: limpieza ? "FX-TCR-PR-013" : null,
      limp_vortex: limpieza ? String(EQ("FX-TCB-VO1")?.id) : null,
      limp_micropipeta_10: limpieza ? String(EQ("FX-TCB-MP1")?.id) : null,
      limp_total_puntas_ref: limpieza && C.puntas ? ref(C.puntas) : null,
      limp_total_puntas_cantidad: limpieza ? tubos * 6 : 0,
      filtrado: { volumen_filtrado: "1.5", volumen_recuperado: "1.1", filtro: "0.45 µm" },
      resguardo_extracto: { entregado_fx106: true, refrigerador_re1: false, congelador_co1: false, congelador_co2: false, congelador_co3: false },
      resguardo_molienda_restante: { no_sobro: false, refrigerador_re1: true, congelador_co1: false, congelador_co2: false, congelador_co3: false },
    },
    registro_pesos: pesosRows(proc.muestras, 4.0),
    equipos: equiposUsados(["FX-TCB-BA1", "FX-TCB-PR1", "FX-TCB-HO1", "FX-TCB-CR1", "FX-TCB-CE1", ...(limpieza ? ["FX-TCB-MP1", "FX-TCB-VO1"] : [])], ["Balanza · pasos 3 y 4", "Probeta · paso 6", "Homogeneizador · paso 7", "Cronómetro · paso 7", "Centrífuga · paso 8", "Micropipeta · limpieza", "Vórtex · limpieza 9"]),
    uso_inventario: [
      ...(R.metanolAgua ? [{ tipo: "reactivo", ref: ref(R.metanolAgua), cantidad: Number((tubos * 0.016).toFixed(3)) }] : []),
      ...(C.filtro ? [{ tipo: "consumible", ref: ref(C.filtro), cantidad: tubos }] : []),
      ...(C.vial ? [{ tipo: "consumible", ref: ref(C.vial), cantidad: tubos }] : []),
      ...(limpieza && C.cartucho ? [{ tipo: "consumible", ref: ref(C.cartucho), cantidad: tubos }] : []),
      ...(limpieza && R.metanol ? [{ tipo: "reactivo", ref: ref(R.metanol), cantidad: 0.006 }] : []),
      ...(limpieza && R.aguaDes ? [{ tipo: "reactivo", ref: ref(R.aguaDes), cantidad: 0.012 }] : []),
      ...(limpieza && C.falcon ? [{ tipo: "consumible", ref: ref(C.falcon), cantidad: 1 }] : []),
      ...(limpieza && R.acetico10 ? [{ tipo: "reactivo", ref: ref(R.acetico10), cantidad: 0.003 }] : []),
      ...(limpieza && C.puntas ? [{ tipo: "consumible", ref: ref(C.puntas), cantidad: tubos * 6 }] : []),
    ],
    observaciones_generales: spec.observaciones || null,
    nombre_quien_extrajo: firma(ana),
    nombre_quien_limpieza: limpieza ? firma(ana) : null,
    nombre_quien_superviso: firma(dani),
    estado: "registrada",
  };
  const created = must(await api("POST", "/samples/extraction", payload, { token: ANA }), `extracción ASP de P${proc.folio_num}`);
  log(`  Extracción E-A ${String(created.folio_num).padStart(7, "0")} (${tubos} tubos${limpieza ? ", con limpieza SAX" : ""})`);
  return created;
}

async function analisis(spec) {
  const payload = {
    tipo_analisis: spec.tipo,
    metodo: spec.metodo,
    metodo_referencia: spec.referencia,
    extraccion_id: spec.extraccion_id || null,
    recepcion_id: spec.recepcion_id || null,
    fecha_analisis: spec.fecha,
    hora_inicio: "09:30",
    hora_fin: "13:45",
    equipo_id: EQ(spec.equipo)?.id || null,
    equipo_folio_bitacora: spec.folio_bitacora || "88",
    condiciones: { temperatura_ambiente: "22.4", humedad: "48", observaciones: null },
    analista_nombre: ana.nombre,
    analista_cargo: ana.cargo,
    resultados: spec.resultados,
    controles: spec.controles,
    uso_inventario: [],
    observaciones: spec.observaciones || null,
  };
  const created = must(await api("POST", "/samples/analysis", payload, { token: ANA }), `análisis ${spec.tipo}`);
  log(`  Análisis A ${String(created.folio_num).padStart(7, "0")} (${spec.tipo})`);
  if (spec.revisar) {
    must(await api("POST", `/samples/analysis/${created.id}/revisar`, { cargo: dani.cargo, observaciones: "Controles de calidad dentro de criterio; curva de calibración r² = 0.9992." }, { token: DANI }), "revisar análisis");
    log("    revisado por coordinación técnica");
  }
  if (spec.aprobar) {
    must(await api("POST", `/samples/analysis/${created.id}/aprobar`, { cargo: ern.cargo }, { token: ERN }), "aprobar análisis");
    log("    aprobado por dirección");
  }
  return created;
}

async function informe(rec, analisisIds, spec) {
  const disponible = must(await api("GET", `/informes/recepcion/${rec.id}`, null, { token: ANA }), "reportables");
  const payload = {
    recepcion_id: rec.id,
    analisis_ids: analisisIds,
    cliente: { nombre: spec.cliente, contacto: spec.contacto, direccion: spec.direccion },
    declaraciones: { desviaciones: spec.desviaciones || null, opiniones: null, observaciones_internas: null },
    elaborado_nombre: ana.nombre,
    elaborado_cargo: ana.cargo,
  };
  const created = must(await api("POST", "/informes", payload, { token: ANA }), "informe");
  log(`  Informe IR ${String(created.folio_num).padStart(7, "0")} (borrador, ${disponible.analisis?.length || 0} análisis disponibles)`);
  if (spec.revisar) {
    must(await api("POST", `/informes/${created.id}/revisar`, { cargo: dani.cargo }, { token: DANI }), "revisar informe");
    log("    en revisión (coordinación técnica)");
  }
  if (spec.autorizar) {
    must(await api("POST", `/informes/${created.id}/autorizar`, { cargo: ern.cargo }, { token: ERN }), "autorizar informe");
    log("    autorizado por dirección (PDF con SHA-256)");
  }
  if (spec.entregar) {
    must(await api("POST", `/informes/${created.id}/entregar`, { fecha: spec.entregar, medio: "correo", a_quien: spec.contacto, observaciones: "Se envió el PDF firmado al correo del solicitante." }, { token: DANI }), "entregar informe");
    log("    entregado al cliente");
  }
  return created;
}

const CLIENTES = {
  bahiaFalsa: { nombre: "Cooperativa Pesquera Bahía Falsa S.C. de R.L.", contacto: "Juan Manuel Peralta", direccion: "Ejido Chapala, San Quintín, B.C." },
  ostricola: { nombre: "Granja Ostrícola Sol Azul", contacto: "Rocío Valenzuela", direccion: "Bahía San Quintín, B.C." },
  cofepris: { nombre: "COFEPRIS · Comisión Estatal de Baja California", contacto: "Lic. Héctor Mendívil", direccion: "Blvd. Benito Juárez 2400, Mexicali, B.C." },
  acuicola: { nombre: "Acuacultura del Pacífico S.A. de C.V.", contacto: "Ing. Paola Reyes", direccion: "Carretera Transpeninsular km 103, Ensenada, B.C." },
  cicese: { nombre: "Depto. de Oceanografía Biológica · CICESE", contacto: "Dra. Mariana Lozano", direccion: "Carretera Ensenada-Tijuana 3918, Ensenada, B.C." },
};

/* R1 · DSP en mejillón, lote de 3, flujo completo hasta cerrada */
{
  const cli = CLIENTES.bahiaFalsa;
  const rec = await recepcion({
    id_interno: "D26-101",
    solicitante: cli.nombre,
    contacto: cli.contacto,
    fecha: daysAgo(30),
    fecha_muestra: daysAgo(31),
    lote: [
      { trabajar: true, id_interno: "D26-101", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.2 kg", sitio_muestreo: "Bahía Falsa · zona A", fecha_muestra: daysAgo(31), informacion_adicional: "Cosecha comercial" },
      { trabajar: true, id_interno: "D26-102", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.1 kg", sitio_muestreo: "Bahía Falsa · zona B", fecha_muestra: daysAgo(31), informacion_adicional: null },
      { trabajar: true, id_interno: "D26-103", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.3 kg", sitio_muestreo: "Bahía Falsa · zona C", fecha_muestra: daysAgo(31), informacion_adicional: null },
    ],
    tipos: ["toxinas_lipofilicas"],
    metodos: ["cromatografia_liquidos"],
    tipos_muestra: ["organismo_completo"],
    decision: "aceptada",
    temperatura: "5.8 °C",
    resguardo: "refrigerador",
    resguardo_detalle: "RE1",
  });
  if (rec) {
    const proc = await procesamiento(rec, { organismo: "bivalvos", fecha: daysAgo(29), peso: 142.6, entregado: true, observaciones: "Organismos de talla comercial, valvas cerradas." });
    const ext = await extraccionDSP(proc, { fecha: daysAgo(28), molienda: "fresca", hidrolisis: true });
    const an = await analisis({
      tipo: "toxinas_lipofilicas",
      metodo: "hplc_ms_ms",
      referencia: "FX-TCI-DSP rev. 2 (EU-RL LC-MS/MS v5)",
      extraccion_id: ext.id,
      fecha: daysAgo(26),
      equipo: "FX-TCB-CL1",
      folio_bitacora: "204",
      resultados: [
        { id_muestra: "D26-101", resultado: 61.3, unidad: "µg/kg", limite_deteccion: 5, limite_cuantificacion: 15, limite_regulatorio: 160, incertidumbre: 7.4, cumple: "cumple", observacion: "Ácido okadaico + DTX-2 (equivalentes tras hidrólisis)" },
        { id_muestra: "D26-102", resultado: 48.9, unidad: "µg/kg", limite_deteccion: 5, limite_cuantificacion: 15, limite_regulatorio: 160, incertidumbre: 6.1, cumple: "cumple", observacion: null },
        { id_muestra: "D26-103", resultado: 172.5, unidad: "µg/kg", limite_deteccion: 5, limite_cuantificacion: 15, limite_regulatorio: 160, incertidumbre: 19.8, cumple: "no_cumple", observacion: "Supera el límite regulatorio; se notificó a la autoridad." },
      ],
      controles: { blanco: { resultado: "< LD", aceptable: "si" }, material_referencia: { nombre: "CRM-OA-c (NRC Canada)", lote: "OAc-23-01", valor_esperado: "100 ± 6", valor_obtenido: "97.2", aceptable: "si" }, duplicado: { id_muestra: "D26-102", diferencia: "4.1 %", aceptable: "si" } },
      revisar: true,
      aprobar: true,
    });
    await informe(rec, [an.id], { ...cli, cliente: cli.nombre, revisar: true, autorizar: true, entregar: daysAgo(0) });
    must(await api("POST", `/samples/reception/${rec.id}/disposicion`, { tipo: "rpbi", fecha: daysAgo(10), responsable: ana.nombre, remanentes: "310 g de molienda y 3 extractos", observaciones: "Se retuvo 1 alícuota de D26-103 para investigación (congelador CO2)." }, { token: ANA }), "disposición");
    log("  Disposición final registrada · recepción cerrada");
  }
}

/* R2 · ASP en almeja, muestra única, con limpieza SAX, informe autorizado sin entregar */
{
  const cli = CLIENTES.ostricola;
  const rec = await recepcion({ id_interno: "A26-044", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(18), fecha_muestra: daysAgo(18), especificaciones: "Almeja generosa (Panopea generosa), 8 organismos", tipos: ["acido_domoico"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"], decision: "aceptada", temperatura: "4.9 °C", resguardo: "refrigerador", resguardo_detalle: "RE1" });
  if (rec) {
    const proc = await procesamiento(rec, { organismo: "bivalvos", partes: ["sifon_callo"], fecha: daysAgo(17), peso: 118.2, entregado: true });
    const ext = await extraccionASP(proc, { fecha: daysAgo(16), limpieza: true, observaciones: "Extracto turbio: se aplicó limpieza en cartucho SAX." });
    const an = await analisis({
      tipo: "acido_domoico",
      metodo: "hplc_uv_vis",
      referencia: "FX-TCI-ASP rev. 1 (AOAC 991.26)",
      extraccion_id: ext.id,
      fecha: daysAgo(14),
      equipo: "FX-TCB-CL2",
      folio_bitacora: "97",
      resultados: [{ id_muestra: "A26-044", resultado: 3.4, unidad: "µg/g", limite_deteccion: 0.5, limite_cuantificacion: 1.5, limite_regulatorio: 20, incertidumbre: 0.6, cumple: "cumple", observacion: null }],
      controles: { blanco: { resultado: "< LD", aceptable: "si" }, material_referencia: { nombre: "CRM-ASP-Mus-d", lote: "ASP-22-03", valor_esperado: "44 ± 3", valor_obtenido: "43.1", aceptable: "si" }, duplicado: { id_muestra: "A26-044", diferencia: "2.8 %", aceptable: "si" } },
      revisar: true,
      aprobar: true,
    });
    await informe(rec, [an.id], { ...cli, cliente: cli.nombre, revisar: true, autorizar: true });
  }
}

/* R3 · DSP en ostión, lote de 5, análisis registrado pendiente de revisión */
{
  const cli = CLIENTES.acuicola;
  const rec = await recepcion({
    id_interno: "D26-120",
    solicitante: cli.nombre,
    contacto: cli.contacto,
    fecha: daysAgo(6),
    fecha_muestra: daysAgo(6),
    lote: [1, 2, 3, 4, 5].map((i) => ({ trabajar: true, id_interno: `D26-12${i - 1}`, nombre_organismo: "Ostión japonés (Crassostrea gigas)", cantidad_volumen: "12 organismos", sitio_muestreo: `Línea ${i} · Estero de Punta Banda`, fecha_muestra: daysAgo(6), informacion_adicional: null })),
    tipos: ["toxinas_lipofilicas"],
    metodos: ["cromatografia_liquidos"],
    tipos_muestra: ["organismo_completo"],
    decision: "aceptada",
    temperatura: "6.5 °C",
    resguardo: "refrigerador",
    resguardo_detalle: "RE1",
  });
  if (rec) {
    const proc = await procesamiento(rec, { organismo: "bivalvos", fecha: daysAgo(5), peso: 148.9, entregado: true });
    const ext = await extraccionDSP(proc, { fecha: daysAgo(4), molienda: "fresca", hidrolisis: true });
    await analisis({
      tipo: "toxinas_lipofilicas",
      metodo: "hplc_ms_ms",
      referencia: "FX-TCI-DSP rev. 2 (EU-RL LC-MS/MS v5)",
      extraccion_id: ext.id,
      fecha: daysAgo(2),
      equipo: "FX-TCB-CL1",
      folio_bitacora: "211",
      resultados: ["D26-120", "D26-121", "D26-122", "D26-123", "D26-124"].map((id, i) => ({ id_muestra: id, resultado: Number((22 + i * 9.7).toFixed(1)), unidad: "µg/kg", limite_deteccion: 5, limite_cuantificacion: 15, limite_regulatorio: 160, incertidumbre: Number((3 + i).toFixed(1)), cumple: "cumple", observacion: null })),
      controles: { blanco: { resultado: "< LD", aceptable: "si" }, material_referencia: { nombre: "CRM-OA-c (NRC Canada)", lote: "OAc-23-01", valor_esperado: "100 ± 6", valor_obtenido: "101.4", aceptable: "si" }, duplicado: { id_muestra: "D26-122", diferencia: "5.6 %", aceptable: "si" } },
    });
  }
}

/* R4 · ASP en sardina, extracción registrada, sin análisis todavía */
{
  const cli = CLIENTES.cofepris;
  const rec = await recepcion({ id_interno: "A26-051", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(3), fecha_muestra: daysAgo(3), medio: "recoleccion", especificaciones: "Sardina monterrey (Sardinops sagax), 25 organismos", tipos: ["acido_domoico"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"], decision: "aceptada", temperatura: "5.2 °C", resguardo: "congelador", resguardo_detalle: "CO1" });
  if (rec) {
    const proc = await procesamiento(rec, { organismo: "sardinas", fecha: daysAgo(2), peso: 131.0, entregado: true });
    await extraccionASP(proc, { fecha: daysAgo(1), molienda: "congelada", limpieza: false });
  }
}

/* R5 · PSP en mejillón, aceptada (el formato de extracción PSP aún no existe en el sistema) */
{
  const cli = CLIENTES.bahiaFalsa;
  await recepcion({ id_interno: "P26-017", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(2), fecha_muestra: daysAgo(2), especificaciones: "Mejillón, 30 organismos", tipos: ["toxinas_paralizantes"], metodos: ["bioensayo_raton"], tipos_muestra: ["organismo_completo"], decision: "aceptada", temperatura: "6.0 °C", resguardo: "congelador", resguardo_detalle: "CO1" });
}

/* R6 · Rechazada por no conformidades (comunicación al cliente) y devuelta */
{
  const cli = CLIENTES.acuicola;
  const rec = await recepcion({
    id_interno: "D26-130",
    solicitante: cli.nombre,
    contacto: cli.contacto,
    fecha: daysAgo(9),
    fecha_muestra: daysAgo(11),
    especificaciones: "Ostión, 10 organismos",
    tipos: ["toxinas_lipofilicas"],
    metodos: ["cromatografia_liquidos"],
    tipos_muestra: ["organismo_completo"],
    inspeccion: inspeccion({ 1: { estado: "NC", observacion: "4 organismos con valvas abiertas y olor a descomposición" }, 2: { estado: "NC", observacion: "Extraídas hace 48 h según el solicitante" }, 4: { estado: "NC", observacion: "Sin hielo; temperatura de llegada 14 °C" } }, "La muestra no cumple los requisitos de conservación."),
    decision: "rechazada",
    temperatura: "14 °C",
    respuesta_cliente: "Enviará una nueva muestra la próxima semana",
    resguardo: "otro",
    resguardo_detalle: "Se devuelve al solicitante",
  });
  if (rec) {
    must(await api("POST", `/samples/reception/${rec.id}/disposicion`, { tipo: "devuelto_cliente", fecha: daysAgo(9), responsable: ana.nombre, remanentes: "Muestra completa", observaciones: "Entregada al solicitante el mismo día." }, { token: ANA }), "disposición rechazada");
    log("  Devuelta al cliente");
  }
}

/* R7 · Aceptada con desviación (temperatura fuera de rango), procesada */
{
  const cli = CLIENTES.cicese;
  const rec = await recepcion({
    id_interno: "D26-140",
    solicitante: cli.nombre,
    contacto: cli.contacto,
    fecha: daysAgo(4),
    fecha_muestra: daysAgo(4),
    especificaciones: "Mejillón de línea experimental, 20 organismos",
    tipos: ["toxinas_lipofilicas"],
    metodos: ["cromatografia_liquidos"],
    tipos_muestra: ["organismo_completo"],
    inspeccion: inspeccion({ 4: { estado: "NC", observacion: "Hielera con poco hielo; temperatura de llegada 11.5 °C" } }),
    decision: "aceptada_con_desviacion",
    temperatura: "11.5 °C",
    aceptacion_obs: "El solicitante pide continuar; el informe llevará el descargo por la temperatura de llegada.",
    respuesta_cliente: "Solicita continuar con el análisis",
    resguardo: "refrigerador",
    resguardo_detalle: "RE1",
  });
  if (rec) await procesamiento(rec, { organismo: "bivalvos", fecha: daysAgo(3), peso: 121.4, entregado: false, observaciones: "Molienda en refrigerador RE1 hasta la extracción." });
}

/* R8 · Recibida hoy, sin decisión de aceptación todavía */
{
  const cli = CLIENTES.ostricola;
  await recepcion({ id_interno: "D26-150", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(0), hora: "08:40", fecha_muestra: daysAgo(0), especificaciones: "Ostión, 15 organismos", tipos: ["toxinas_lipofilicas", "acido_domoico"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"], resguardo: "refrigerador", resguardo_detalle: "RE1" });
}

/* R9 · Plancton en agua de mar (microscopía): análisis directo sin extracción, aprobado */
{
  const cli = CLIENTES.cofepris;
  const rec = await recepcion({ id_interno: "F26-008", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(12), fecha_muestra: daysAgo(12), especificaciones: "Agua de mar superficial, 1 L, fijada con lugol", tipos: ["plancton"], metodos: ["microscopia"], tipos_muestra: ["agua_mar"], inspeccion: inspeccion({ 0: { estado: "NA" }, 1: { estado: "NA" }, 6: { estado: "C", observacion: "Lugol ácido 1 %" } }), decision: "aceptada", temperatura: "8 °C", resguardo: "refrigerador", resguardo_detalle: "RE1" });
  if (rec) {
    await analisis({
      tipo: "plancton",
      metodo: "microscopia",
      referencia: "FX-TCI-FIT rev. 1 (Utermöhl)",
      recepcion_id: rec.id,
      fecha: daysAgo(10),
      equipo: "FX-TCB-MI1",
      folio_bitacora: "31",
      resultados: [
        { id_muestra: "F26-008", resultado: 12400, resultado_texto: "Pseudo-nitzschia spp.", unidad: "cél/L", cumple: "na", observacion: "Por debajo del umbral de alerta (100,000 cél/L)" },
        { id_muestra: "F26-008", resultado: 800, resultado_texto: "Dinophysis spp.", unidad: "cél/L", cumple: "na", observacion: "Umbral de alerta 500 cél/L: se recomienda muestreo de moluscos" },
      ],
      controles: { blanco: { resultado: null, aceptable: "na" }, material_referencia: { nombre: null, aceptable: "na" }, duplicado: { id_muestra: "F26-008", diferencia: "8 %", aceptable: "si" } },
      revisar: true,
      aprobar: true,
    });
  }
}

/* R10 · Anulada con motivo (captura duplicada) */
{
  const cli = CLIENTES.ostricola;
  const rec = await recepcion({ id_interno: "D26-150-DUP", solicitante: cli.nombre, contacto: cli.contacto, fecha: daysAgo(0), hora: "08:52", fecha_muestra: daysAgo(0), especificaciones: "Ostión, 15 organismos", tipos: ["toxinas_lipofilicas"], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"], resguardo: "refrigerador", resguardo_detalle: "RE1" });
  if (rec) {
    must(await api("POST", `/samples/reception/${rec.id}/anular`, { motivo: "Captura duplicada de la recepción D26-150; se conserva la primera." }, { token: DANI }), "anular");
    log("  Anulada con motivo");
  }
}

log("\nCarga de demostración terminada.");
