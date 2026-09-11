/* Prueba de extremo a extremo de la extraccion DSP contra el servidor de desarrollo (base de prueba). */
const BASE = process.env.BASE || "http://localhost:3100/api";
let token = "";
const results = [];

const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

// 1. Login
{
  const r = await api("POST", "/auth/login", { email: "qa@ficotox.local", password: "QaFicotox2026!" });
  token = r.data?.access_token || r.data?.token || "";
  check("login local", r.status === 200 && !!token, `status ${r.status} keys=${Object.keys(r.data || {}).join(",")}`);
}

// 2. Folios por serie
{
  const a = await api("GET", "/samples/extraction/next-folio?tipo=E-A");
  const d = await api("GET", "/samples/extraction/next-folio?tipo=E-D");
  const bad = await api("GET", "/samples/extraction/next-folio?tipo=E-X");
  check("next-folio E-A = 2 (ya existe el 1)", a.data?.next_folio === 2, JSON.stringify(a.data));
  check("next-folio E-D = 1 (serie propia)", d.data?.next_folio === 1 && d.data?.clave_revision === "FX-TCF-GME-D", JSON.stringify(d.data));
  check("next-folio tipo invalido -> 400", bad.status === 400, `status ${bad.status}`);
}

// 3. Datos de apoyo
const equipos = (await api("GET", "/inventory/equipos")).data?.items || [];
const procesamientos = (await api("GET", "/samples/processing?search=")).data?.items || [];
const reactivos = (await api("GET", "/inventory/reactivos?search=")).data?.items || [];
const metanol = reactivos.find((r) => /metanol/i.test(String(r.producto || r.nombre || ""))) || reactivos[0];
const equipo = equipos[0];
const proc = procesamientos[0];
check("hay equipo, procesamiento y reactivo de prueba", !!equipo && !!proc && !!metanol, `equipo=${equipo?.nombre} proc=P${proc?.folio_num} reactivo=${metanol?.producto || metanol?.nombre} (${metanol?.cantidad_actual} ${metanol?.unidad || ""})`);
const stockBefore = Number(metanol?.cantidad_actual ?? 0);

// 4. Crear extraccion DSP
const payload = {
  tipo_registro: "E-D",
  fecha_extraccion: "2026-09-09",
  hora_extraccion: "10:30",
  procesamiento_id: proc?.id,
  folio_procesamiento_num: proc?.folio_num,
  muestra_tipo: "unica",
  id_interno: proc?.id_interno || "D26-001",
  tipo_molienda: "congelada",
  pasos: {
    checklist: ["Descongelar en oscuridad", "Adicionar 9 mL de metanol 100 % a muestras y blanco"],
    id_equipo_licuadora: String(equipo?.id),
    id_centrifuga: String(equipo?.id),
    hidrolisis: "si",
    temperatura_calentamiento: 76,
    tiempo_calentamiento_min: 40,
    filtrado: { volumen_filtrado: "1", volumen_recuperado: "0.6", filtro: "0.45 µm" },
    resguardo_extracto: { entregado_fx106: true },
    resguardo_molienda_restante: { congelador_co2: true },
  },
  registro_pesos: [
    { id_muestra: "Blanco", es_blanco: true, replica: "BlancoR1", peso_muestra: 2.01, peso_replica: 2.02, matraz: "M-B", matraz_replica: "M-BR", peso_pre_muestra: 5.1, peso_pre_replica: 5.11, peso_post_muestra: 5.09, peso_post_replica: 5.1 },
    { id_muestra: "D26-001", replica: "D26-001_R1", peso_muestra: 2.03, peso_replica: 1.98, matraz: "M-01", matraz_replica: "M-02", peso_pre_muestra: 5.2, peso_pre_replica: 5.21, peso_post_muestra: 5.19, peso_post_replica: 5.2 },
  ],
  equipos: [{ equipo_id: equipo?.id, nombre: "nombre viejo que debe sustituirse", uso: "Centrífuga · pasos 8 y 12", clave_bitacora: "FX-TCB-CE1-27/1", folio_bitacora: "12" }, { nombre: "Baño de agua sin catálogo", uso: "Baño · paso 18" }],
  uso_inventario: [{ tipo: "reactivo", ref: String(metanol?.id), cantidad: 0.5 }],
  nombre_quien_extrajo: "Prueba QA",
  nombre_quien_superviso: "Supervisor QA",
  estado: "registrada",
};
let createdId = null;
{
  const r = await api("POST", "/samples/extraction", payload);
  createdId = r.data?.id || null;
  check("POST extraccion E-D -> 201 folio 1", r.status === 201 && r.data?.tipo_registro === "E-D" && r.data?.folio_num === 1, `status ${r.status} ${JSON.stringify(r.data)}`);
}

// 5. Leer y verificar
{
  const r = await api("GET", `/samples/extraction/${createdId}`);
  const item = r.data?.item || {};
  check("GET detalle: tipo E-D y clave FX-TCF-GME-D", item.tipo_registro === "E-D" && item.clave_revision === "FX-TCF-GME-D", `${item.tipo_registro} ${item.clave_revision}`);
  check("equipos_json: nombre tomado del catalogo (snapshot)", Array.isArray(item.equipos) && item.equipos[0]?.nombre === equipo?.nombre && item.equipos[0]?.folio_bitacora === "12", JSON.stringify(item.equipos));
  check("equipo sin catalogo se conserva por nombre", item.equipos?.[1]?.nombre === "Baño de agua sin catálogo" && item.equipos?.[1]?.equipo_id === null, JSON.stringify(item.equipos?.[1]));
  check("registro_pesos con blanco, matraces e hidrolisis", item.registro_pesos?.length === 2 && item.registro_pesos[0].es_blanco === true && item.registro_pesos[1].matraz === "M-01" && item.registro_pesos[1].peso_post_replica === 5.2, JSON.stringify(item.registro_pesos?.[1]));
  check("pasos: hidrolisis y temperatura", item.pasos?.hidrolisis === "si" && item.pasos?.temperatura_calentamiento === 76, JSON.stringify({ h: item.pasos?.hidrolisis, t: item.pasos?.temperatura_calentamiento }));
}

// 6. Inventario descontado y movimiento con referencia al folio E-D
{
  const after = ((await api("GET", "/inventory/reactivos?search=")).data?.items || []).find((r) => r.id === metanol?.id);
  const stockAfter = Number(after?.cantidad_actual ?? 0);
  check("stock del reactivo descontado 0.5", Math.abs(stockBefore - stockAfter - 0.5) < 1e-6, `${stockBefore} -> ${stockAfter}`);
  const movs = (await api("GET", "/inventory/movimientos")).data?.items || [];
  const mov = movs.find((m) => String(m.referencia || "").startsWith(`EXT-${createdId}-INS-`));
  check("movimiento de salida con motivo 'Extraccion E-D folio 1'", !!mov && /Extraccion E-D folio 1/.test(String(mov.motivo || "")), JSON.stringify(mov && { referencia: mov.referencia, motivo: mov.motivo, cantidad: mov.cantidad, tipo: mov.tipo }));
}

// 7. Series de folio independientes y conflictos
{
  const dup = await api("POST", "/samples/extraction", { ...payload, folio_num: 1, uso_inventario: [] });
  check("POST E-D folio 1 repetido -> 409", dup.status === 409, `status ${dup.status} ${dup.data?.message}`);
  const dupA = await api("POST", "/samples/extraction", { ...payload, tipo_registro: "E-A", folio_num: 1, uso_inventario: [] });
  check("POST E-A folio 1 (ya existe en ASP) -> 409", dupA.status === 409, `status ${dupA.status} ${dupA.data?.message}`);
  const okA = await api("POST", "/samples/extraction", { ...payload, tipo_registro: "E-A", folio_num: undefined, uso_inventario: [], equipos: [] });
  check("POST E-A sin folio -> 201 con folio 2 (serie ASP)", okA.status === 201 && okA.data?.folio_num === 2 && okA.data?.tipo_registro === "E-A", `status ${okA.status} ${JSON.stringify(okA.data)}`);
  const bad = await api("POST", "/samples/extraction", { ...payload, tipo_registro: "E-X", uso_inventario: [] });
  check("POST tipo E-X -> 400", bad.status === 400, `status ${bad.status} ${bad.data?.message}`);
  const legacy = await api("POST", "/samples/extraction", { ...payload, tipo_registro: undefined, folio_num: 50, uso_inventario: [], equipos: [] });
  check("POST sin tipo_registro -> se asume E-A (compatibilidad)", legacy.status === 201 && legacy.data?.tipo_registro === "E-A", `status ${legacy.status} ${JSON.stringify(legacy.data)}`);
}

// 8. Listado y busqueda
{
  const all = (await api("GET", "/samples/extraction?search=")).data?.items || [];
  const onlyD = (await api("GET", "/samples/extraction?tipo=E-D")).data?.items || [];
  const s1 = (await api("GET", `/samples/extraction?search=${encodeURIComponent("E-D 1")}`)).data?.items || [];
  const s2 = (await api("GET", `/samples/extraction?search=${encodeURIComponent("E-A 1")}`)).data?.items || [];
  const s3 = (await api("GET", "/samples/extraction?search=1")).data?.items || [];
  check("listado sin filtro incluye ambas series", all.some((i) => i.tipo_registro === "E-D") && all.some((i) => i.tipo_registro === "E-A"), `${all.length} items`);
  check("filtro tipo=E-D solo DSP", onlyD.length === 1 && onlyD.every((i) => i.tipo_registro === "E-D"), `${onlyD.length} items`);
  check("busqueda 'E-D 1' -> solo el folio 1 DSP", s1.length === 1 && s1[0].tipo_registro === "E-D" && s1[0].folio_num === 1, JSON.stringify(s1.map((i) => `${i.tipo_registro}-${i.folio_num}`)));
  check("busqueda 'E-A 1' -> solo el folio 1 ASP", s2.length === 1 && s2[0].tipo_registro === "E-A" && s2[0].folio_num === 1, JSON.stringify(s2.map((i) => `${i.tipo_registro}-${i.folio_num}`)));
  check("busqueda '1' -> folio 1 de ambas series", s3.some((i) => i.tipo_registro === "E-D" && i.folio_num === 1) && s3.some((i) => i.tipo_registro === "E-A" && i.folio_num === 1), JSON.stringify(s3.map((i) => `${i.tipo_registro}-${i.folio_num}`)));
  const general = (await api("GET", "/samples")).data?.items || [];
  check("listado general de muestras usa codigo E-D-0000001", general.some((i) => i.codigo === "E-D-0000001") && general.some((i) => i.codigo === "E-A-0000001"), JSON.stringify(general.filter((i) => i.tipo === "Extraccion").map((i) => i.codigo)));
}

// 9. Editar: cambiar folio de bitacora y reemplazar descuento
{
  const before = ((await api("GET", "/inventory/reactivos?search=")).data?.items || []).find((r) => r.id === metanol?.id);
  const r = await api("PUT", `/samples/extraction/${createdId}`, { ...payload, folio_num: 1, equipos: [{ equipo_id: equipo?.id, uso: "Centrífuga", clave_bitacora: "FX-TCB-CE1-27/1", folio_bitacora: "13" }], uso_inventario: [{ tipo: "reactivo", ref: String(metanol?.id), cantidad: 0.25 }] });
  const item = (await api("GET", `/samples/extraction/${createdId}`)).data?.item || {};
  const after = ((await api("GET", "/inventory/reactivos?search=")).data?.items || []).find((r) => r.id === metanol?.id);
  check("PUT actualiza folio de bitacora", r.status === 200 && item.equipos?.[0]?.folio_bitacora === "13", `status ${r.status} ${JSON.stringify(item.equipos)}`);
  check("PUT repone 0.5 y descuenta 0.25 (neto +0.25)", Math.abs(Number(after?.cantidad_actual) - Number(before?.cantidad_actual) - 0.25) < 1e-6, `${before?.cantidad_actual} -> ${after?.cantidad_actual}`);
}


// 10. Regresiones del revisor: PUT sin tipo conserva la serie; clave inconsistente se corrige; busqueda exacta con prefijo
{
  const noType = await api("PUT", `/samples/extraction/${createdId}`, { ...payload, tipo_registro: undefined, folio_num: 1, uso_inventario: [], equipos: [] });
  const item = (await api("GET", `/samples/extraction/${createdId}`)).data?.item || {};
  check("PUT sin tipo_registro conserva E-D", noType.status === 200 && item.tipo_registro === "E-D" && item.clave_revision === "FX-TCF-GME-D", `status ${noType.status} ${item.tipo_registro} ${item.clave_revision}`);
  const badClave = await api("PUT", `/samples/extraction/${createdId}`, { ...payload, folio_num: 1, clave_revision: "FX-TCF-GME-A", uso_inventario: [], equipos: [] });
  const item2 = (await api("GET", `/samples/extraction/${createdId}`)).data?.item || {};
  check("clave_revision de otro formato se fuerza a la del tipo", badClave.status === 200 && item2.clave_revision === "FX-TCF-GME-D", `${item2.clave_revision}`);
  const rev = await api("PUT", `/samples/extraction/${createdId}`, { ...payload, folio_num: 1, clave_revision: "FX-TCF-GME-D/2", uso_inventario: [], equipos: [] });
  const item3 = (await api("GET", `/samples/extraction/${createdId}`)).data?.item || {};
  check("clave con sufijo de revision se acepta", rev.status === 200 && item3.clave_revision === "FX-TCF-GME-D/2", `${item3.clave_revision}`);
  const exact = (await api("GET", `/samples/extraction?search=${encodeURIComponent("E-A 1")}`)).data?.items || [];
  check("busqueda 'E-A 1' es exacta (no trae E-A 50)", exact.length === 1 && exact[0].folio_num === 1 && exact[0].tipo_registro === "E-A", JSON.stringify(exact.map((i) => `${i.tipo_registro}-${i.folio_num}`)));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pruebas OK`);
process.exit(failed.length ? 1 : 0);
