/*
 * Catalogo de roles de la Fase 0 (reinicio limpio).
 *
 *   node tests/api-roles.mjs                 # primera corrida (incluye la guarda de administradores)
 *   node tests/api-roles.mjs --tras-reinicio # tras reiniciar el servidor: los permisos no crecen
 *
 * Comprueba contra la tabla de la especificacion (escrita aqui a mano, a
 * proposito independiente de scripts/roles-catalogo.json):
 * - existen los 10 roles con exactamente esos permisos y no existe "Super Admin";
 * - cada usuario del catalogo inicia sesion, recibe exactamente sus permisos,
 *   obtiene 200 en los modulos que puede leer y 403 en los que no;
 * - "Administrador tecnico del sistema" es sistemico (no se elimina);
 * - no se puede dejar el sistema sin un usuario activo que administre usuarios y roles;
 * - las altas del reinicio estan en la bitacora (actor "sistema") y la cadena esta integra.
 */
import { readFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100/api";
const TRAS_REINICIO = process.argv.includes("--tras-reinicio");
const credenciales = JSON.parse(readFileSync(process.env.CREDENCIALES_ROLES, "utf8"));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${String(detail).slice(0, 400)}` : ""}`);
};

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

for (let i = 0; i < 60; i += 1) {
  try {
    if ((await fetch(`${BASE}/health`)).ok) break;
  } catch {
    /* esperando */
  }
  await new Promise((r) => setTimeout(r, 1000));
}

const MODULOS = ["dashboard", "reactivos", "consumibles", "equipos", "mantenimiento", "movimientos", "muestras", "informes", "aprobaciones", "documentos", "auditoria", "roles", "usuarios"];
const todos = (extra = {}) => ({ ...Object.fromEntries(MODULOS.map((m) => [m, "R"])), ...extra });
const ESPERADO = {
  "Administrador técnico del sistema": { email: "jorge.ramirez@ficotox.local", permisos: { dashboard: "R", usuarios: "RCUD", roles: "RCUD", auditoria: "R" } },
  "Responsable General": { email: "patricia.luna@ficotox.local", permisos: todos({ informes: "RU", aprobaciones: "RU" }) },
  "Coordinador/a de Mejora Continua": { email: "ana.torres@ficotox.local", permisos: todos({ documentos: "RCUD" }) },
  "Coordinador/a del Área Técnica": { email: "ricardo.medina@ficotox.local", permisos: { dashboard: "R", muestras: "RCUD", informes: "RCU", aprobaciones: "RU", reactivos: "RCUD", consumibles: "RCUD", equipos: "RCUD", mantenimiento: "RCUD", movimientos: "RCUD", documentos: "R" } },
  "Coordinador/a de Investigación y Desarrollo": { email: "gabriela.ortiz@ficotox.local", permisos: { dashboard: "R", muestras: "RCU", equipos: "R", reactivos: "RCU", consumibles: "RCU", movimientos: "R", documentos: "R" } },
  "Técnico Analista": { email: "luis.castro@ficotox.local", permisos: { dashboard: "R", muestras: "RCU", informes: "RC", reactivos: "RC", consumibles: "RC", equipos: "R", movimientos: "RC", documentos: "R" } },
  "Técnico Auxiliar": { email: "mariana.delgado@ficotox.local", permisos: { dashboard: "R", muestras: "RCU", reactivos: "RC", consumibles: "RC", movimientos: "RC", documentos: "R" } },
  "Administrador/a Auxiliar": { email: "carmen.aguilar@ficotox.local", permisos: { dashboard: "R", muestras: "R", equipos: "RCU", mantenimiento: "RCU", reactivos: "RCU", consumibles: "RCU", movimientos: "RCU" } },
  "Auditor Interno": { email: "hector.navarro@ficotox.local", permisos: todos() },
  "Estudiante / personal en formación": { email: "diego.salinas@ficotox.local", permisos: { dashboard: "R", muestras: "RC", documentos: "R" } },
};
const flags = (acciones = "") => ({ read: acciones.includes("R"), create: acciones.includes("C"), update: acciones.includes("U"), delete: acciones.includes("D") });
const letras = (f) => `${f?.read ? "R" : ""}${f?.create ? "C" : ""}${f?.update ? "U" : ""}${f?.delete ? "D" : ""}`;

/* Una lectura representativa por modulo (aprobaciones se prueba aparte: solo tiene acciones de escritura). */
const LECTURA = {
  dashboard: "/dashboard/overview",
  reactivos: "/inventory/reactivos?search=",
  consumibles: "/consumables?search=",
  equipos: "/inventory/equipos",
  mantenimiento: "/inventory/mantenimientos",
  movimientos: "/inventory/movimientos?search=",
  muestras: "/samples/reception?search=",
  informes: "/informes",
  documentos: "/documentos-sgc",
  auditoria: "/audit?limit=1",
  roles: "/admin/roles",
  usuarios: "/admin/usuarios",
};

// ---------- Catalogo de roles (visto por QA) ----------
const qaLogin = await api("POST", "/auth/login", { email: "qa@ficotox.local", password: "QaFicotox2026!" });
const QA = qaLogin.data?.token;
check("login QA (rol de prueba con todos los permisos)", qaLogin.status === 200 && !!QA, `status ${qaLogin.status}`);

const roles = (await api("GET", "/admin/roles", undefined, QA)).data?.items || [];
check('no existe el rol "Super Admin"', !roles.some((r) => /super\s*admin/i.test(String(r.nombre))), roles.map((r) => r.nombre).join(" | "));
const faltantes = Object.keys(ESPERADO).filter((nombre) => !roles.some((r) => r.nombre === nombre));
check("existen los 10 roles del catalogo", faltantes.length === 0, faltantes.length ? `faltan: ${faltantes.join(", ")}` : "");
const ajenos = roles.filter((r) => !(r.nombre in ESPERADO) && r.nombre !== "QA pruebas automatizadas" && !TRAS_REINICIO);
check("no hay otros roles en la base recien reiniciada (salvo el de QA)", ajenos.length === 0, ajenos.map((r) => r.nombre).join(", "));

for (const [nombre, esperado] of Object.entries(ESPERADO)) {
  const rol = roles.find((r) => r.nombre === nombre);
  if (!rol) continue;
  const detalle = (await api("GET", `/admin/roles/${rol.id}`, undefined, QA)).data;
  const reales = Object.fromEntries((detalle?.permissions || []).map((p) => [p.clave, letras({ read: p.can_read, create: p.can_create, update: p.can_update, delete: p.can_delete })]));
  const diferencias = MODULOS.filter((m) => (reales[m] || "") !== (esperado.permisos[m] || "")).map((m) => `${m}: ${reales[m] || "-"} (esperado ${esperado.permisos[m] || "-"})`);
  check(`${nombre}: permisos exactos${TRAS_REINICIO ? " tras reiniciar" : ""}`, diferencias.length === 0, diferencias.join("; "));
  const sistemico = !!Number(detalle?.role?.es_sistemico);
  check(`${nombre}: es_sistemico = ${nombre === "Administrador técnico del sistema"}`, sistemico === (nombre === "Administrador técnico del sistema"));
}

// ---------- Cada usuario: login, permisos, 200/403 ----------
const tokens = {};
for (const [nombre, esperado] of Object.entries(ESPERADO)) {
  const login = await api("POST", "/auth/login", { email: esperado.email, password: credenciales[esperado.email] });
  const token = login.data?.token;
  tokens[nombre] = token;
  check(`${nombre}: ${esperado.email} inicia sesion`, login.status === 200 && !!token && login.data?.user?.rol === nombre, `status ${login.status} rol=${login.data?.user?.rol}`);
  if (!token) continue;
  const perms = login.data?.permissions || {};
  const diferencias = MODULOS.filter((m) => letras(perms[m]) !== letras(flags(esperado.permisos[m])));
  check(`${nombre}: la sesion trae exactamente sus permisos`, diferencias.length === 0, diferencias.map((m) => `${m}=${letras(perms[m]) || "-"}`).join(", "));

  const resultados = [];
  for (const [modulo, ruta] of Object.entries(LECTURA)) {
    const r = await api("GET", ruta, undefined, token);
    const puede = flags(esperado.permisos[modulo]).read;
    if (r.status !== (puede ? 200 : 403)) resultados.push(`${modulo} ${ruta} -> ${r.status} (esperado ${puede ? 200 : 403})`);
  }
  // aprobaciones:update (revisar un analisis inexistente): sin permiso 403; con permiso llega a buscarlo (404).
  const revisar = await api("POST", "/samples/analysis/999999/revisar", {}, token);
  const puedeAprobar = flags(esperado.permisos.aprobaciones).update;
  if (revisar.status !== (puedeAprobar ? 404 : 403)) resultados.push(`aprobaciones -> ${revisar.status} (esperado ${puedeAprobar ? 404 : 403})`);
  const sinLectura = MODULOS.filter((m) => m !== "aprobaciones" && !flags(esperado.permisos[m]).read);
  check(`${nombre}: 200 donde puede leer y 403 en los ${sinLectura.length} modulos que no tiene`, resultados.length === 0, resultados.join("; "));
  // Los roles que leen todo tambien reciben 403 en algo que no tienen: crear un equipo.
  if (!sinLectura.length) {
    const r = await api("POST", "/inventory/equipos", { nombre: "No debe crearse" }, token);
    check(`${nombre}: crear un equipo (equipos:create no concedido) -> 403`, r.status === 403, `status ${r.status}`);
  }
}

if (!TRAS_REINICIO) {
  // ---------- Guarda: siempre queda al menos un administrador ----------
  const J = tokens["Administrador técnico del sistema"];
  const usuarios = (await api("GET", "/admin/usuarios", undefined, J)).data?.items || [];
  const jorge = usuarios.find((u) => u.email === "jorge.ramirez@ficotox.local");
  const qa = usuarios.find((u) => u.email === "qa@ficotox.local");
  const payload = (u, cambios) => ({ nombre: u.nombre, email: u.email, id_rol: u.id_rol, departamento: u.departamento, activo: !!u.activo, ...cambios });

  const qaOff = await api("PUT", `/admin/usuarios/${qa.id}`, payload(qa, { activo: false }), J);
  check("el administrador edita una cuenta @ficotox.local existente (QA inactivo)", qaOff.status === 200, `status ${qaOff.status} ${qaOff.data?.message}`);
  const selfOff = await api("PUT", `/admin/usuarios/${jorge.id}`, payload(jorge, { activo: false }), J);
  check("desactivar al unico administrador -> 409", selfOff.status === 409, `status ${selfOff.status} ${selfOff.data?.message}`);
  const otroRol = roles.find((r) => r.nombre === "Auditor Interno");
  const cambioRol = await api("PUT", `/admin/usuarios/${jorge.id}`, payload(jorge, { id_rol: otroRol.id }), J);
  check("quitarle el rol de administrador al unico administrador -> 409", cambioRol.status === 409, `status ${cambioRol.status}`);
  const adminRol = roles.find((r) => r.nombre === "Administrador técnico del sistema");
  const detalle = (await api("GET", `/admin/roles/${adminRol.id}`, undefined, J)).data;
  const sinUsuarios = detalle.permissions.map((p) => ({ ...p, can_update: p.clave === "usuarios" ? false : p.can_update }));
  const recorte = await api("PUT", `/admin/roles/${adminRol.id}`, { nombre: adminRol.nombre, descripcion: adminRol.descripcion, activo: true, permissions: sinUsuarios }, J);
  check("quitar usuarios:update al rol del unico administrador -> 409", recorte.status === 409, `status ${recorte.status}`);
  const detalleDespues = (await api("GET", `/admin/roles/${adminRol.id}`, undefined, J)).data;
  check("tras el rechazo el rol conserva sus permisos (rollback)", letras({ read: 1, update: detalleDespues.permissions.find((p) => p.clave === "usuarios")?.can_update }) === "RU");
  const borrarSistemico = await api("DELETE", `/admin/roles/${adminRol.id}`, undefined, J);
  check("el rol de administrador (sistemico) no se elimina", borrarSistemico.status === 403, `status ${borrarSistemico.status}`);
  const qaOn = await api("PUT", `/admin/usuarios/${qa.id}`, payload(qa, { activo: true }), J);
  check("QA reactivado", qaOn.status === 200, `status ${qaOn.status}`);

  // ---------- Bitacora del reinicio ----------
  const entradas = (await api("GET", "/audit?accion=crear&limit=1000", undefined, QA)).data?.items || [];
  const delReinicio = entradas.filter((e) => e.usuario_nombre === "sistema" && e.motivo === "Reinicio Fase 0");
  const rolesAuditados = new Set(delReinicio.filter((e) => e.entidad === "roles").map((e) => e.referencia));
  const usuariosAuditados = new Set(delReinicio.filter((e) => e.entidad === "usuarios").map((e) => e.referencia));
  check("bitacora: alta de los 10 roles por 'sistema' con motivo 'Reinicio Fase 0'", Object.keys(ESPERADO).every((n) => rolesAuditados.has(n)), [...rolesAuditados].join(" | "));
  check("bitacora: alta de los 10 usuarios", Object.values(ESPERADO).every((e) => usuariosAuditados.has(e.email)), [...usuariosAuditados].join(" | "));
}

const verificacion = await api("GET", "/audit/verify", undefined, QA);
check("Verificar integridad: cadena en verde", verificacion.status === 200 && verificacion.data?.ok === true, JSON.stringify(verificacion.data));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} pruebas OK`);
process.exit(failed.length ? 1 : 0);
