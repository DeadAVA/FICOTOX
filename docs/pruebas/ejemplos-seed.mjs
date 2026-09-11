/*
 * Cuatro ejemplos realistas de punta a punta a través de la API (todo queda en
 * auditoría y en movimientos como si lo hubiera hecho el personal):
 *   1. ASP · muestra individual (almeja generosa)        → informe entregado
 *   2. ASP · lote de 3 (mejillón)                        → informe entregado
 *   3. DSP · muestra individual (ostión)                 → informe entregado
 *   4. DSP · lote de 3 (mejillón, uno fuera de límite)   → informe entregado
 * Sólo usa inventario en buen estado (sin CR1/MP2/RE1 en mantenimiento, sin
 * reactivos agotados, sin cartuchos SAX que están casi agotados).
 */
const BASE = process.env.BASE || "http://localhost:3100/api";
const log = (...a) => console.log(...a);

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await res.json().catch(() => null) : null;
  return { status: res.status, data };
}
const must = (res, what) => {
  if (res.status >= 400) throw new Error(`${what}: HTTP ${res.status} ${res.data?.message || JSON.stringify(res.data)}`);
  return res.data;
};
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const TOKEN = must(await api("POST", "/auth/login", { email: "axel@cicese.mx", password: "password" }), "login").token;
const AXEL = "Axel";
const MELISA = "Melisa";

/* ---------- inventario ---------- */
const equipos = must(await api("GET", "/inventory/equipos", null, TOKEN), "equipos").items;
const reactivos = must(await api("GET", "/inventory/reactivos", null, TOKEN), "reactivos").items;
const consumibles = must(await api("GET", "/inventory/consumibles", null, TOKEN), "consumibles").items;
const EQ = (clave) => { const e = equipos.find((x) => x.clave_bitacora === clave); if (!e) throw new Error(`equipo ${clave}`); return e; };
const findR = (re) => { const r = reactivos.find((x) => re.test(String(x.producto || x.nombre || ""))); if (!r) throw new Error(`reactivo ${re}`); return r; };
const findC = (re) => { const c = consumibles.find((x) => re.test(String(x.producto || ""))); if (!c) throw new Error(`consumible ${re}`); return c; };
const ref = (item) => String(item.id);
const R = { metanolAgua: findR(/^Metanol:agua 50:50/i), metanol: findR(/^Metanol grado HPLC/i), naoh: findR(/^NaOH 2\.5/i), hcl: findR(/^HCl 2\.5/i), crmDa: findR(/CRM ácido domoico/i), crmOa: findR(/CRM ácido okadaico/i) };
const C = { tubo: findC(/^Tubo ámbar para centrífuga/i), vial: findC(/^Vial ámbar/i), filtro: findC(/^Filtro de jeringa 0\.45/i), bolsa: findC(/^Bolsa hermética/i) };

/* Folios de bitácora: consecutivo por equipo (el sistema recuerda el último). */
const folios = {};
const folio = (clave) => { folios[clave] = (folios[clave] || 0) + 1; return String(folios[clave]); };
const claveBitacora = (clave) => `${clave}-${EQ(clave).id}/1`;
const equiposUsados = (lista) => lista.map(([clave, uso]) => ({ equipo_id: EQ(clave).id, nombre: EQ(clave).nombre, uso, clave_bitacora: claveBitacora(clave), folio_bitacora: folio(clave) }));

const REQ = [
  "Se presentan en talla comercial.",
  "Se presentan sin alteraciones (estado de descomposición, valvas abiertas/rotas, cuerpos eviscerados).",
  "En el momento de su presentación no han transcurrido más de 24 horas después de haber sido extraídas.",
  "Se presentan en bolsa o botella de plástico transparente, sin alteraciones, como contenedor primario.",
  "El contenedor primario es transportado en una hielera con blue ice/hielo suficiente para mantener la temperatura entre 4 y 10 °C.",
  "Se presentan en cantidad o volumen suficiente para el(los) análisis solicitados.",
  "Se presenta con algún tipo de fijador (en caso positivo especificar el tipo).",
];
const inspeccion = () => ({ checklist: REQ.map((requisito, i) => ({ requisito, estado: i === 6 ? "NA" : "C", observacion: null })), observaciones_generales: null });

/* ---------- recepción ---------- */
async function recepcion(spec) {
  const payload = {
    fecha_recepcion: spec.fecha,
    hora_recepcion: spec.hora,
    recibido_por: AXEL,
    medio_recepcion: "directa",
    solicitante: spec.cliente.nombre,
    muestra_unica: !spec.lote,
    id_interno: spec.lote ? null : spec.id_interno,
    fecha_muestra: spec.fecha_muestra,
    especificaciones: spec.especificaciones || null,
    lote_muestras: spec.lote || [],
    analisis: { tipos: [spec.tipo], metodos: ["cromatografia_liquidos"], tipos_muestra: ["organismo_completo"], observaciones: spec.analisis_obs || null },
    inspeccion: inspeccion(),
    decision_aceptacion: "aceptada",
    aceptacion: { fecha: spec.fecha, responsable: MELISA, temperatura_llegada: spec.temperatura, observaciones: null, comunicacion_cliente: { requerida: false } },
    datos_solicitante: { nombre_entrega: spec.cliente.contacto, firma_conformidad: null, conformidad: true },
    datos_custodio: { nombre_cargo_firma: AXEL, firma_digital: null, lugar_resguardo: "congelador", lugar_otro: "CO1" },
  };
  const created = must(await api("POST", "/samples/reception", payload, TOKEN), `recepción ${spec.id_interno}`);
  const item = must(await api("GET", `/samples/reception/${created.id}`, null, TOKEN), "recepción").item;
  log(`Recepción R ${String(item.folio_num).padStart(7, "0")} · ${spec.id_interno}${spec.lote ? ` (lote de ${spec.lote.length})` : ""} · ${spec.cliente.nombre}`);
  return item;
}

/* ---------- procesamiento (bivalvos) ---------- */
async function procesamiento(rec, spec) {
  const lote = Array.isArray(rec.lote_muestras) ? rec.lote_muestras : [];
  const esLote = lote.length > 0;
  const muestras = esLote ? lote.map((m) => m.id_interno) : [rec.id_interno];
  const idInterno = muestras.join(", ");
  const steps = [
    { step: "Seleccionar organismos de mayor talla (~30)" },
    { step: "Lavar exterior con agua corriente" },
    { step: "Abrir valvas" },
    { step: "Lavar interior con agua corriente" },
    { step: "Desconchar" },
    { step: "Drenar 5 min", equipo_id: EQ("FX-TCB-CR2").id },
    { step: "Moler 1-2 min 100-150g", equipo_id: EQ("FX-TCB-LC1").id },
    { step: "Pesar molienda obtenida", equipo_id: EQ("FX-TCB-BA1").id, peso: spec.peso },
    { step: "Reservar molienda en bolsa hermetica" },
  ].map((s) => ({ ...s, equipo_id: s.equipo_id ?? null, peso: s.peso ?? null }));
  const payload = {
    recepcion_id: rec.id,
    folio_recepcion_num: rec.folio_num,
    fecha_procesamiento: spec.fecha,
    hora_procesamiento: spec.hora,
    muestra_tipo: esLote ? "lote" : "unica",
    id_interno: idInterno,
    lote_seleccion: esLote ? lote.map((m) => ({ ...m, trabajar: true })) : [],
    tipo_organismo: ["bivalvos"],
    parte_organismo: spec.partes || ["cuerpo_completo"],
    bivalvos_steps: steps,
    sardinas_steps: [],
    resguardo: { entregado_extraccion: true, refrigerador_re1: false, congelador_co1: false, congelador_co2: false, congelador_co3: false },
    observaciones_generales: spec.observaciones || null,
    nombre_quien_proceso: AXEL,
    nombre_quien_superviso: MELISA,
    uso_inventario: [{ tipo: "consumible", ref: ref(C.bolsa), cantidad: muestras.length }],
  };
  const created = must(await api("POST", "/samples/processing", payload, TOKEN), "procesamiento");
  const item = must(await api("GET", `/samples/processing/${created.id}`, null, TOKEN), "procesamiento").item;
  log(`  Procesamiento P ${String(item.folio_num).padStart(7, "0")} · ${spec.peso} g de molienda`);
  return { ...item, idInterno, muestras };
}

const pesos = (muestras, base, extra = () => ({})) => [
  { id_muestra: "Blanco", organismo: "Agua desionizada", es_blanco: true, replica: "BlancoR1", peso_muestra: base, peso_replica: Number((base + 0.01).toFixed(2)), ...extra(0) },
  ...muestras.map((id, i) => ({ id_muestra: id, organismo: null, es_blanco: false, replica: `${id}_R1`, peso_muestra: Number((base + 0.02 + i * 0.01).toFixed(2)), peso_replica: Number((base - 0.01 + i * 0.01).toFixed(2)), ...extra(i + 1) })),
];

/* ---------- extracción ASP (sin limpieza SAX) ---------- */
async function extraccionASP(proc, spec) {
  const tubos = (proc.muestras.length + 1) * 2;
  const payload = {
    tipo_registro: "E-A",
    fecha_extraccion: spec.fecha,
    hora_extraccion: spec.hora,
    procesamiento_id: proc.id,
    folio_procesamiento_num: proc.folio_num,
    muestra_tipo: proc.muestras.length > 1 ? "lote" : "unica",
    id_interno: proc.idInterno,
    tipo_molienda: "fresca",
    pasos: {
      checklist: ["Submuestrear por duplicado en tubo protegido de luz", "Pesar agua desionizada para blanco", "Adicionar 16 mL de metanol agua 50 50", "Homogeneizar durante 3 minutos", "Centrifugar a 3000g o mas durante 10 minutos", "Filtrar sobrenadante a vial ambar"],
      id_equipo_licuadora: null,
      id_balanza: String(EQ("FX-TCB-BA1").id),
      folio_verificacion_balanza: spec.folioBalanza,
      folio_verificacion_balanza_blanco: spec.folioBalanza,
      id_probeta: String(EQ("FX-TCB-PR1").id),
      folio_reactivo: ref(R.metanolAgua),
      folio_preparacion_metanol_agua: R.metanolAgua.lote || "FX-TCR-PR-021",
      id_homogeneizador: String(EQ("FX-TCB-HO1").id),
      id_cronometro: String(EQ("FX-TCB-CR2").id),
      id_centrifuga: String(EQ("FX-TCB-CE1").id),
      consumible_filtro: ref(C.filtro),
      consumible_vial: ref(C.vial),
      limpieza: "no",
      filtrado: { volumen_filtrado: "1.5", volumen_recuperado: "1.2", filtro: "0.45 µm" },
      resguardo_extracto: { entregado_fx106: true, refrigerador_re1: false, congelador_co1: false, congelador_co2: false, congelador_co3: false },
      resguardo_molienda_restante: { no_sobro: false, refrigerador_re1: false, congelador_co1: true, congelador_co2: false, congelador_co3: false },
    },
    registro_pesos: pesos(proc.muestras, 4.0),
    equipos: equiposUsados([["FX-TCB-BA1", "Balanza · pasos 3 y 4"], ["FX-TCB-PR1", "Probeta · paso 6"], ["FX-TCB-HO1", "Homogeneizador · paso 7"], ["FX-TCB-CR2", "Cronómetro · paso 7"], ["FX-TCB-CE1", "Centrífuga · paso 8"]]),
    uso_inventario: [
      { tipo: "reactivo", ref: ref(R.metanolAgua), cantidad: Number((tubos * 0.016).toFixed(3)) },
      { tipo: "consumible", ref: ref(C.tubo), cantidad: tubos },
      { tipo: "consumible", ref: ref(C.filtro), cantidad: tubos },
      { tipo: "consumible", ref: ref(C.vial), cantidad: tubos },
    ],
    observaciones_generales: spec.observaciones || "Extracto claro; no fue necesaria la limpieza en cartucho SAX.",
    nombre_quien_extrajo: AXEL,
    nombre_quien_limpieza: null,
    nombre_quien_superviso: MELISA,
    estado: "registrada",
  };
  const created = must(await api("POST", "/samples/extraction", payload, TOKEN), "extracción ASP");
  log(`  Extracción E-A ${String(created.folio_num).padStart(7, "0")} · ${tubos} tubos`);
  return created;
}

/* ---------- extracción DSP (con hidrólisis) ---------- */
async function extraccionDSP(proc, spec) {
  const tubos = (proc.muestras.length + 1) * 2;
  const payload = {
    tipo_registro: "E-D",
    fecha_extraccion: spec.fecha,
    hora_extraccion: spec.hora,
    procesamiento_id: proc.id,
    folio_procesamiento_num: proc.folio_num,
    muestra_tipo: proc.muestras.length > 1 ? "lote" : "unica",
    id_interno: proc.idInterno,
    tipo_molienda: "fresca",
    pasos: {
      checklist: [
        "Submuestrear por duplicado en tubo ambar para centrifuga (2 ± 0.05 g)", "Pesar agua desionizada para el blanco (2 ± 0.05 g)", "Adicionar 9 mL de metanol 100 % a muestras y blanco", "Agitar en vortex durante 3 min", "Centrifugar a 2,000 g o mas durante 10 min a 20 °C", "Transferir sobrenadante a matraz de aforacion de 20 mL", "Adicionar 9 mL de metanol 100 % al pellet", "Homogeneizar por 1 min", "Centrifugar a 2,000 g durante 10 min a 20 °C", "Recuperar sobrenadante, combinar y aforar a 20 mL con metanol 100 %", "Filtrar 1 mL con filtro de 0.45 µm y transferir a vial ambar",
        "Transferir 1 mL del extracto a vial ambar (hidrolisis)", "Agregar 125 µL de NaOH 2.5 M", "Agitar en vortex 30 s y pesar el tubo", "Calentar a 76 °C por 40 min", "Enfriar a temperatura ambiente", "Pesar de nuevo y completar al peso inicial con metanol 100 %", "Agregar 125 µL de HCl 2.5 M", "Agitar en vortex 30 s", "Filtrar con filtro de 0.45 µm a vial ambar",
      ],
      id_equipo_licuadora: null,
      id_balanza: String(EQ("FX-TCB-BA1").id),
      folio_verificacion_balanza: spec.folioBalanza,
      folio_verificacion_balanza_blanco: spec.folioBalanza,
      id_desionizador: String(EQ("FX-TCB-DI1").id),
      id_vortex: String(EQ("FX-TCB-VO1").id),
      id_cronometro: String(EQ("FX-TCB-CR2").id),
      id_centrifuga: String(EQ("FX-TCB-CE1").id),
      id_homogeneizador: String(EQ("FX-TCB-HO1").id),
      id_micropipeta: String(EQ("FX-TCB-MP1").id),
      id_termoblock: String(EQ("FX-TCB-TB1").id),
      id_termometro: String(EQ("FX-TCB-TM1").id),
      consumible_tubo_centrifuga: ref(C.tubo),
      reactivo_metanol_1: ref(R.metanol),
      reactivo_metanol_2: ref(R.metanol),
      reactivo_metanol_aforo: ref(R.metanol),
      cantidad_aforo_ml: 2,
      consumible_filtro: ref(C.filtro),
      consumible_vial: ref(C.vial),
      consumible_vial_hidrolisis: ref(C.vial),
      reactivo_naoh: ref(R.naoh),
      reactivo_hcl: ref(R.hcl),
      consumible_filtro_hidrolisis: ref(C.filtro),
      consumible_vial_final: ref(C.vial),
      hidrolisis: "si",
      temperatura_calentamiento: 76,
      tiempo_calentamiento_min: 40,
      filtrado: { volumen_filtrado: "1", volumen_recuperado: "0.8", filtro: "0.45 µm" },
      resguardo_extracto: { entregado_fx106: true, refrigerador_re1: false, congelador_co1: false, congelador_co2: false, congelador_co3: false },
      resguardo_molienda_restante: { no_sobro: false, refrigerador_re1: false, congelador_co1: true, congelador_co2: false, congelador_co3: false },
    },
    registro_pesos: pesos(proc.muestras, 2.0, (i) => ({ matraz: `M-${String(i + 1).padStart(2, "0")}`, matraz_replica: `M-${String(i + 1).padStart(2, "0")}R`, peso_pre_muestra: Number((5.1 + i * 0.02).toFixed(2)), peso_pre_replica: Number((5.11 + i * 0.02).toFixed(2)), peso_post_muestra: Number((5.1 + i * 0.02).toFixed(2)), peso_post_replica: Number((5.11 + i * 0.02).toFixed(2)) })),
    equipos: equiposUsados([["FX-TCB-BA1", "Balanza · pasos 3, 4, 17 y 20"], ["FX-TCB-DI1", "Desionizador · paso 4"], ["FX-TCB-CE1", "Centrífuga · pasos 8 y 12"], ["FX-TCB-VO1", "Vórtex · pasos 7, 17 y 22"], ["FX-TCB-HO1", "Homogeneizador · paso 11"], ["FX-TCB-CR2", "Cronómetro · pasos 7, 8 y 18"], ["FX-TCB-MP1", "Micropipeta · pasos 16 y 21"], ["FX-TCB-TB1", "Termoblock · paso 18"], ["FX-TCB-TM1", "Termómetro · paso 18"]]),
    uso_inventario: [
      { tipo: "consumible", ref: ref(C.tubo), cantidad: tubos },
      { tipo: "reactivo", ref: ref(R.metanol), cantidad: Number((tubos * 0.02).toFixed(3)) },
      { tipo: "consumible", ref: ref(C.filtro), cantidad: tubos * 2 },
      { tipo: "consumible", ref: ref(C.vial), cantidad: tubos * 3 },
      { tipo: "reactivo", ref: ref(R.naoh), cantidad: Number((tubos * 0.000125).toFixed(6)) },
      { tipo: "reactivo", ref: ref(R.hcl), cantidad: Number((tubos * 0.000125).toFixed(6)) },
    ],
    observaciones_generales: spec.observaciones || "Hidrólisis alcalina completa para reportar ésteres de OA/DTX.",
    nombre_quien_extrajo: AXEL,
    nombre_quien_superviso: MELISA,
    estado: "registrada",
  };
  const created = must(await api("POST", "/samples/extraction", payload, TOKEN), "extracción DSP");
  log(`  Extracción E-D ${String(created.folio_num).padStart(7, "0")} · ${tubos} tubos, con hidrólisis`);
  return created;
}

/* ---------- análisis (registrar → revisar → aprobar) ---------- */
async function analisis(spec) {
  const equipo = EQ(spec.equipo);
  const payload = {
    tipo_analisis: spec.tipo,
    metodo: spec.metodo,
    metodo_referencia: spec.referencia,
    extraccion_id: spec.extraccion_id,
    recepcion_id: spec.recepcion_id,
    fecha_analisis: spec.fecha,
    hora_inicio: "09:30",
    hora_fin: "13:45",
    equipo_id: equipo.id,
    equipo_folio_bitacora: folio(spec.equipo),
    condiciones: { temperatura_ambiente: "22.4", humedad: "48", observaciones: null },
    analista_nombre: AXEL,
    resultados: spec.resultados,
    controles: spec.controles,
    uso_inventario: spec.crm ? [{ tipo: "reactivo", ref: ref(spec.crm), cantidad: 0.05 }] : [],
    observaciones: spec.observaciones || null,
  };
  const created = must(await api("POST", "/samples/analysis", payload, TOKEN), "análisis");
  log(`  Análisis A ${String(created.folio_num).padStart(7, "0")} · ${spec.tipo} en ${equipo.nombre}`);
  must(await api("POST", `/samples/analysis/${created.id}/revisar`, { observaciones: "Controles de calidad dentro de criterio; curva de calibración r² ≥ 0.999." }, TOKEN), "revisar análisis");
  must(await api("POST", `/samples/analysis/${created.id}/aprobar`, {}, TOKEN), "aprobar análisis");
  log("    revisado y aprobado");
  return created;
}

/* ---------- informe (crear → revisar → autorizar → entregar) ---------- */
async function informe(rec, an, spec) {
  const payload = {
    recepcion_id: rec.id,
    analisis_ids: [an.id],
    cliente: { nombre: spec.cliente.nombre, contacto: spec.cliente.contacto, direccion: spec.cliente.direccion },
    declaraciones: { desviaciones: null, opiniones: spec.opinion || null },
    elaborado_nombre: AXEL,
  };
  const created = must(await api("POST", "/informes", payload, TOKEN), "informe");
  must(await api("POST", `/informes/${created.id}/revisar`, {}, TOKEN), "revisar informe");
  must(await api("POST", `/informes/${created.id}/autorizar`, {}, TOKEN), "autorizar informe");
  must(await api("POST", `/informes/${created.id}/entregar`, { fecha: spec.entrega, medio: "correo", a_quien: spec.cliente.contacto, observaciones: "Se envió el PDF firmado al correo del solicitante." }, TOKEN), "entregar informe");
  log(`  Informe IR ${String(created.folio_num).padStart(7, "0")} · revisado, autorizado (PDF) y entregado`);
  return created;
}

const CLIENTES = {
  ostricola: { nombre: "Granja Ostrícola Sol Azul", contacto: "Rocío Valenzuela", direccion: "Bahía San Quintín, B.C." },
  bahiaFalsa: { nombre: "Cooperativa Pesquera Bahía Falsa S.C. de R.L.", contacto: "Juan Manuel Peralta", direccion: "Ejido Chapala, San Quintín, B.C." },
  acuicola: { nombre: "Acuacultura del Pacífico S.A. de C.V.", contacto: "Ing. Paola Reyes", direccion: "Carretera Transpeninsular km 103, Ensenada, B.C." },
  cofepris: { nombre: "COFEPRIS · Comisión Estatal de Baja California", contacto: "Lic. Héctor Mendívil", direccion: "Blvd. Benito Juárez 2400, Mexicali, B.C." },
};
const ctrlASP = (id) => ({ blanco: { resultado: "< LD", aceptable: "si" }, material_referencia: { nombre: "CRM-DA-g (NRC Canada)", lote: "DA-g-24-02", valor_esperado: "100 ± 5 µg/g", valor_obtenido: "98.6", aceptable: "si" }, duplicado: { id_muestra: id, diferencia: "3.1 %", aceptable: "si" } });
const ctrlDSP = (id) => ({ blanco: { resultado: "< LD", aceptable: "si" }, material_referencia: { nombre: "CRM-OA-d (NRC Canada)", lote: "OA-d-24-01", valor_esperado: "100 ± 6 µg/kg", valor_obtenido: "97.2", aceptable: "si" }, duplicado: { id_muestra: id, diferencia: "4.1 %", aceptable: "si" } });
const rASP = (id, valor, cumple = "cumple", obs = null) => ({ id_muestra: id, resultado: valor, unidad: "µg/g", limite_deteccion: 0.5, limite_cuantificacion: 1.5, limite_regulatorio: 20, incertidumbre: Number((valor * 0.15).toFixed(2)), cumple, observacion: obs });
const rDSP = (id, valor, cumple = "cumple", obs = null) => ({ id_muestra: id, resultado: valor, unidad: "µg/kg", limite_deteccion: 5, limite_cuantificacion: 15, limite_regulatorio: 160, incertidumbre: Number((valor * 0.12).toFixed(1)), cumple, observacion: obs });

/* ===== 1. ASP · muestra individual ===== */
{
  const cli = CLIENTES.ostricola;
  const rec = await recepcion({ id_interno: "A26-001", cliente: cli, tipo: "acido_domoico", fecha: daysAgo(12), hora: "09:15", fecha_muestra: daysAgo(12), temperatura: "4.9 °C", especificaciones: "Almeja generosa (Panopea generosa), 8 organismos, sifón y callo. Sitio: Bahía San Quintín, parcela 4." });
  const proc = await procesamiento(rec, { fecha: daysAgo(11), hora: "10:30", peso: 118.2, partes: ["sifon_callo"], observaciones: "Organismos vivos a la llegada; se procesó sifón y callo." });
  const ext = await extraccionASP(proc, { fecha: daysAgo(10), hora: "12:00", folioBalanza: "VB-2026-118" });
  const an = await analisis({ tipo: "acido_domoico", metodo: "hplc_uv_vis", referencia: "FX-TCI-ASP rev. 1 (AOAC 991.26)", extraccion_id: ext.id, recepcion_id: rec.id, fecha: daysAgo(9), equipo: "FX-TCB-CL2", crm: R.crmDa, resultados: [rASP("A26-001", 3.4)], controles: ctrlASP("A26-001") });
  await informe(rec, an, { cliente: cli, entrega: daysAgo(8), opinion: "La muestra cumple con el límite regulatorio de 20 µg/g de ácido domoico." });
}

/* ===== 2. ASP · lote de 3 ===== */
{
  const cli = CLIENTES.bahiaFalsa;
  const lote = [
    { trabajar: true, id_interno: "A26-002", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.2 kg", sitio_muestreo: "Bahía Falsa · zona A", fecha_muestra: daysAgo(9), informacion_adicional: "Cosecha comercial" },
    { trabajar: true, id_interno: "A26-003", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.1 kg", sitio_muestreo: "Bahía Falsa · zona B", fecha_muestra: daysAgo(9), informacion_adicional: null },
    { trabajar: true, id_interno: "A26-004", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.3 kg", sitio_muestreo: "Bahía Falsa · zona C", fecha_muestra: daysAgo(9), informacion_adicional: null },
  ];
  const rec = await recepcion({ id_interno: "A26-002…004", cliente: cli, tipo: "acido_domoico", fecha: daysAgo(9), hora: "08:40", fecha_muestra: daysAgo(9), temperatura: "5.6 °C", lote });
  const proc = await procesamiento(rec, { fecha: daysAgo(8), hora: "11:00", peso: 142.6, observaciones: "Tres zonas de cultivo; organismos de talla comercial con valvas cerradas." });
  const ext = await extraccionASP(proc, { fecha: daysAgo(7), hora: "12:15", folioBalanza: "VB-2026-121" });
  const an = await analisis({ tipo: "acido_domoico", metodo: "hplc_uv_vis", referencia: "FX-TCI-ASP rev. 1 (AOAC 991.26)", extraccion_id: ext.id, recepcion_id: rec.id, fecha: daysAgo(6), equipo: "FX-TCB-CL2", crm: R.crmDa, resultados: [rASP("A26-002", 1.8), rASP("A26-003", 2.6), rASP("A26-004", 4.9)], controles: ctrlASP("A26-003") });
  await informe(rec, an, { cliente: cli, entrega: daysAgo(5), opinion: "Las tres zonas cumplen con el límite regulatorio; se recomienda mantener el monitoreo semanal." });
}

/* ===== 3. DSP · muestra individual ===== */
{
  const cli = CLIENTES.acuicola;
  const rec = await recepcion({ id_interno: "D26-001", cliente: cli, tipo: "toxinas_lipofilicas", fecha: daysAgo(7), hora: "10:05", fecha_muestra: daysAgo(7), temperatura: "6.2 °C", especificaciones: "Ostión japonés (Crassostrea gigas), 12 organismos, cuerpo completo. Sitio: Estero de Punta Banda, línea 3." });
  const proc = await procesamiento(rec, { fecha: daysAgo(6), hora: "10:45", peso: 121.4, observaciones: "Ostiones de talla comercial; se drenó 5 min antes de moler." });
  const ext = await extraccionDSP(proc, { fecha: daysAgo(5), hora: "12:30", folioBalanza: "VB-2026-124" });
  const an = await analisis({ tipo: "toxinas_lipofilicas", metodo: "hplc_ms_ms", referencia: "FX-TCI-DSP rev. 2 (EU-RL LC-MS/MS v5)", extraccion_id: ext.id, recepcion_id: rec.id, fecha: daysAgo(4), equipo: "FX-TCB-CL1", crm: R.crmOa, resultados: [rDSP("D26-001", 42.7, "cumple", "OA + DTX-2 (equivalentes tras hidrólisis)")], controles: ctrlDSP("D26-001") });
  await informe(rec, an, { cliente: cli, entrega: daysAgo(3), opinion: "La muestra cumple con el límite regulatorio de 160 µg/kg de equivalentes de ácido okadaico." });
}

/* ===== 4. DSP · lote de 3 (una fuera de límite) ===== */
{
  const cli = CLIENTES.cofepris;
  const lote = [
    { trabajar: true, id_interno: "D26-002", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.0 kg", sitio_muestreo: "Bahía de Todos Santos · Rincón de Ballenas", fecha_muestra: daysAgo(4), informacion_adicional: "Muestreo oficial de vigilancia" },
    { trabajar: true, id_interno: "D26-003", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.1 kg", sitio_muestreo: "Bahía de Todos Santos · Islas Todos Santos", fecha_muestra: daysAgo(4), informacion_adicional: null },
    { trabajar: true, id_interno: "D26-004", nombre_organismo: "Mejillón (Mytilus galloprovincialis)", cantidad_volumen: "1.2 kg", sitio_muestreo: "Bahía de Todos Santos · El Sauzal", fecha_muestra: daysAgo(4), informacion_adicional: null },
  ];
  const rec = await recepcion({ id_interno: "D26-002…004", cliente: cli, tipo: "toxinas_lipofilicas", fecha: daysAgo(4), hora: "09:50", fecha_muestra: daysAgo(4), temperatura: "5.1 °C", lote, analisis_obs: "Vigilancia oficial: se requiere respuesta en 72 h." });
  const proc = await procesamiento(rec, { fecha: daysAgo(3), hora: "10:20", peso: 138.9, observaciones: "Se procesaron las tres estaciones el mismo día." });
  const ext = await extraccionDSP(proc, { fecha: daysAgo(3), hora: "13:00", folioBalanza: "VB-2026-127" });
  const an = await analisis({ tipo: "toxinas_lipofilicas", metodo: "hplc_ms_ms", referencia: "FX-TCI-DSP rev. 2 (EU-RL LC-MS/MS v5)", extraccion_id: ext.id, recepcion_id: rec.id, fecha: daysAgo(2), equipo: "FX-TCB-CL1", crm: R.crmOa, resultados: [rDSP("D26-002", 61.3), rDSP("D26-003", 48.9), rDSP("D26-004", 172.5, "no_cumple", "Supera el límite regulatorio; se notificó a la autoridad el mismo día.")], controles: ctrlDSP("D26-003"), observaciones: "D26-004 se reanalizó por duplicado para confirmar el resultado." });
  await informe(rec, an, { cliente: cli, entrega: daysAgo(1), opinion: "La estación El Sauzal (D26-004) supera el límite regulatorio de 160 µg/kg; se recomienda veda precautoria en esa zona." });
}

log("\nListo. Folios de bitácora usados:", folios);
