/*
 * Alta del catalogo de roles (matriz de la Fase 1) y de un usuario local por rol.
 *
 *   node scripts/seed-roles-usuarios.mjs
 *   node scripts/seed-roles-usuarios.mjs --usuarios otro.json --db ruta/base.sqlite3 --actualizar-permisos
 *
 * - Roles y permisos: scripts/roles-catalogo.json ({ modulo: { accion: alcance } }).
 * - Personas y contrasenas: scripts/seed-usuarios.local.json (ignorado por git;
 *   plantilla en scripts/seed-usuarios.example.json). Tambien SEED_USUARIOS_FILE.
 * - Idempotente:
 *   - Un rol se busca por su clave (o por nombre) y no se duplica. Si existe sin
 *     permisos del modelo de la Fase 1 (p. ej. uno de la Fase 0), se le carga la
 *     matriz del catalogo. Si ya tiene otros permisos, se respeta (aviso) salvo
 *     con --actualizar-permisos.
 *   - Un usuario se busca por correo y no se duplica ni se cambia su contrasena;
 *     si no tiene su rol del catalogo vigente, se le asigna.
 *   - Fase 2: una persona con `"temporal": { "meses": 6, "supervisor": "correo" }`
 *     se da de alta como cuenta temporal (fin de vigencia a N meses y supervisor);
 *     su rol vence con la cuenta. El rol de estudiante / personal en formacion
 *     exige cuenta temporal.
 * - Todo queda en la bitacora (actor "sistema", motivo --motivo o "Catálogo de
 *   roles Fase 1"), sellado con src/lib/shared/audit-chain.mjs, la misma
 *   implementacion que usa el servidor. Al terminar se recalcula la cadena.
 * - Solo SQLite, con el servidor detenido. La base debe tener el esquema de la
 *   Fase 1: si es nueva o anterior, arranca FICOTOX una vez y abre
 *   /api/health/db (crea las tablas y migra usuarios.id_rol), detenlo y repite.
 *   En MySQL, roles y asignaciones se dan de alta desde Administracion.
 * - Contrasenas con hashPassword() de src/lib/server/password.ts (Node 22.18+ o 24).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { construirRegistro, primerEslabonRoto, resolverClaveSello, sellar } from "../src/lib/shared/audit-chain.mjs";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTOR = { sub: null, nombre: "sistema", email: null };

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};
const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
};
const MOTIVO = argValue("--motivo") || "Catálogo de roles Fase 1";
const ACTUALIZAR = process.argv.includes("--actualizar-permisos");

/* ---------- Entorno (mismas reglas que src/lib/server/config.ts) ---------- */

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim().replace(/^export\s+/, "");
    const value = rest.join("=").trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name && !(name in process.env)) process.env[name] = value;
  }
}
const envFile = (process.env.FICOTOX_ENV_FILE || "").trim();
loadEnvFile(envFile ? path.resolve(rootDir, envFile) : path.join(rootDir, ".env"));

const databaseUrl = (process.env.DATABASE_URL || "").trim();
if (databaseUrl && !databaseUrl.startsWith("sqlite:")) fail("Este script solo aplica a SQLite. En MySQL da de alta los roles y asignaciones desde Administracion.");
function resolveSqlitePath() {
  const cli = argValue("--db");
  if (cli) return path.resolve(rootDir, cli);
  if (databaseUrl) {
    const raw = databaseUrl.replace(/^sqlite:\/*/, "");
    return path.isAbsolute(raw) ? raw : path.resolve(rootDir, raw);
  }
  const configured = (process.env.SQLITE_PATH || "").trim();
  return configured ? path.resolve(rootDir, configured) : path.join(rootDir, "instance", "ficotox.sqlite3");
}
const sqlitePath = resolveSqlitePath();
const instanceDir = process.env.FICOTOX_INSTANCE_DIR ? path.resolve(rootDir, process.env.FICOTOX_INSTANCE_DIR) : path.dirname(sqlitePath);

/* ---------- Contrasenas: la misma funcion del servidor ---------- */

// Node avisa que password.ts se interpreta como modulo ES; el aviso no aplica aqui.
const defaultWarning = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning?.code !== "MODULE_TYPELESS_PACKAGE_JSON") for (const listener of defaultWarning) listener(warning);
});
let passwordModule;
try {
  passwordModule = await import("../src/lib/server/password.ts");
} catch (error) {
  fail(`No se pudo cargar src/lib/server/password.ts (${error.message}). Usa Node 22.18+ o 24.`);
}
const { hashPassword, validatePasswordStrength } = passwordModule;

/* ---------- Entradas ---------- */

const catalogo = JSON.parse(fs.readFileSync(path.join(rootDir, "scripts/roles-catalogo.json"), "utf8"));
const usuariosFile = path.resolve(rootDir, argValue("--usuarios") || process.env.SEED_USUARIOS_FILE || "scripts/seed-usuarios.local.json");
if (!fs.existsSync(usuariosFile)) fail(`No existe ${path.relative(rootDir, usuariosFile)}.\nCopia scripts/seed-usuarios.example.json como scripts/seed-usuarios.local.json y escribe las contrasenas.`);
const personas = JSON.parse(fs.readFileSync(usuariosFile, "utf8")).usuarios || [];
const rolesPorNombre = new Map(catalogo.roles.map((rol) => [rol.nombre, rol]));
const errores = [];
for (const persona of personas) {
  if (!rolesPorNombre.has(persona.rol)) errores.push(`${persona.email}: el rol "${persona.rol}" no esta en roles-catalogo.json`);
  if (!persona.nombre || !persona.email) errores.push(`Falta nombre o correo en ${JSON.stringify(persona)}`);
  const debil = validatePasswordStrength(String(persona.password || ""), { email: persona.email, nombre: persona.nombre });
  const rolCat = rolesPorNombre.get(persona.rol);
  if (rolCat?.clave === "estudiante" && !persona.temporal) errores.push(`${persona.email}: el rol "${persona.rol}" requiere cuenta temporal ("temporal": { "meses": N, "supervisor": "correo" })`);
  if (persona.temporal && (!Number(persona.temporal.meses) || !persona.temporal.supervisor)) errores.push(`${persona.email}: "temporal" necesita "meses" y "supervisor"`);
  if (debil || persona.password === "CAMBIAR") errores.push(`${persona.email}: ${debil || "escribe una contrasena real"}`);
}
if (errores.length) fail(`Revisa ${path.relative(rootDir, usuariosFile)}:\n- ${errores.join("\n- ")}`);

/* Filas { modulo, accion, alcance } de un rol del catalogo. */
const filasCatalogo = (rol) => Object.entries(rol.permisos).flatMap(([modulo, acciones]) => Object.entries(acciones).map(([accion, alcance]) => ({ modulo, accion, alcance })));
const firma = (filas) => filas.map((f) => `${f.modulo}:${f.accion}:${f.alcance}`).sort().join("|");

/* ---------- Base ---------- */

if (!fs.existsSync(sqlitePath)) fail(`No existe la base ${sqlitePath}.\nArranca FICOTOX una vez (npm run dev y abre /api/health/db) para que cree el esquema, detenlo y vuelve a correr este script.`);
const Database = require("better-sqlite3");
const db = new Database(sqlitePath);
const tablas = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
const faltan = ["roles", "rol_acciones", "usuario_roles", "usuarios", "auditoria"].filter((tabla) => !tablas.has(tabla));
const columnasUsuarios = tablas.has("usuarios") ? db.prepare("PRAGMA table_info(usuarios)").all().map((c) => c.name) : [];
if (personas.some((p) => p.temporal) && !columnasUsuarios.includes("tipo_cuenta")) {
  db.close();
  fail("La base no tiene las columnas de cuentas temporales de la Fase 2 (usuarios.tipo_cuenta).\nArranca FICOTOX una vez y abre /api/health/db para crearlas; luego detenlo y repite.");
}
const columnasRoles = tablas.has("roles") ? db.prepare("PRAGMA table_info(roles)").all().map((c) => c.name) : [];
if (faltan.length || !columnasRoles.includes("clave")) {
  db.close();
  fail(`La base no tiene el esquema de la Fase 1 (faltan: ${[...faltan, ...(columnasRoles.includes("clave") ? [] : ["roles.clave"])].join(", ")}).\nArranca FICOTOX una vez y abre /api/health/db para crearlo; luego detenlo y repite.`);
}

const CLAVE = resolverClaveSello(process.env.SECRET_KEY, instanceDir);
const insertarAuditoria = db.prepare(
  `INSERT INTO auditoria (fecha_hora, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id, referencia, motivo, cambios_json, datos_anteriores_json, datos_nuevos_json, hash_anterior, hash)
   VALUES (@fecha_hora, @usuario_id, @usuario_nombre, @usuario_email, @accion, @entidad, @entidad_id, @referencia, @motivo, @cambios_json, @datos_anteriores_json, @datos_nuevos_json, @hash_anterior, @hash)`,
);
function auditar(entry) {
  const previous = db.prepare("SELECT hash FROM auditoria ORDER BY id DESC LIMIT 1").get();
  const registro = construirRegistro({ motivo: MOTIVO, ...entry }, ACTOR, previous?.hash || null);
  if (registro) insertarAuditoria.run({ ...registro, hash: sellar(registro, CLAVE) });
}

const hoy = new Date().toLocaleDateString("en-CA");
const avatares = ["medusa", "pulpo", "tortuga", "ballena", "pez", "cangrejo", "estrella", "erizo", "concha", "mejillon", "diatomea", "dinoflagelado", "alga", "coral", "ola", "microscopio", "matraz", "faro"];
const resumen = { rolesCreados: [], rolesCargados: [], rolesIguales: [], rolesDistintos: [], usuariosCreados: [], usuariosExistentes: [], asignaciones: [] };

const filasDe = (roleId) => db.prepare("SELECT modulo, accion, alcance FROM rol_acciones WHERE id_rol = ?").all(roleId);
function guardarFilas(roleId, filas) {
  db.prepare("DELETE FROM rol_acciones WHERE id_rol = ?").run(roleId);
  const insert = db.prepare("INSERT INTO rol_acciones (id_rol, modulo, accion, alcance) VALUES (?, ?, ?, ?)");
  for (const f of filas) insert.run(roleId, f.modulo, f.accion, f.alcance);
}

const alta = db.transaction(() => {
  const roleIds = new Map();
  for (const rol of catalogo.roles) {
    const filas = filasCatalogo(rol);
    const existente = db.prepare("SELECT * FROM roles WHERE clave = ? OR LOWER(nombre) = LOWER(?) ORDER BY (clave = ?) DESC LIMIT 1").get(rol.clave, rol.nombre, rol.clave);
    if (!existente) {
      const { lastInsertRowid } = db.prepare("INSERT INTO roles (nombre, descripcion, clave, es_sistemico, activo) VALUES (?, ?, ?, ?, 1)").run(rol.nombre, rol.descripcion || null, rol.clave, rol.es_sistemico ? 1 : 0);
      const roleId = Number(lastInsertRowid);
      guardarFilas(roleId, filas);
      roleIds.set(rol.nombre, roleId);
      auditar({ accion: "crear", entidad: "roles", entidadId: roleId, referencia: rol.nombre, despues: db.prepare("SELECT * FROM roles WHERE id = ?").get(roleId), detalle: { permisos: filas } });
      resumen.rolesCreados.push(rol.nombre);
      continue;
    }
    const roleId = Number(existente.id);
    roleIds.set(rol.nombre, roleId);
    const actuales = filasDe(roleId);
    const necesitaClave = existente.clave !== rol.clave || Number(existente.es_sistemico) !== (rol.es_sistemico ? 1 : 0);
    const cargar = !actuales.length || (ACTUALIZAR && firma(actuales) !== firma(filas));
    if (!necesitaClave && !cargar) {
      (firma(actuales) === firma(filas) ? resumen.rolesIguales : resumen.rolesDistintos).push(rol.nombre);
      continue;
    }
    if (necesitaClave) db.prepare("UPDATE roles SET clave = ?, es_sistemico = ? WHERE id = ?").run(rol.clave, rol.es_sistemico ? 1 : 0, roleId);
    if (cargar) guardarFilas(roleId, filas);
    auditar({
      accion: "editar",
      entidad: "roles",
      entidadId: roleId,
      referencia: rol.nombre,
      antes: { ...existente, permisos: actuales },
      despues: { ...db.prepare("SELECT * FROM roles WHERE id = ?").get(roleId), permisos: cargar ? filas : actuales },
    });
    if (cargar) resumen.rolesCargados.push(rol.nombre);
    else (firma(actuales) === firma(filas) ? resumen.rolesIguales : resumen.rolesDistintos).push(rol.nombre);
  }

  for (const persona of personas) {
    const email = String(persona.email).trim().toLowerCase();
    const roleId = roleIds.get(persona.rol);
    let usuario = db.prepare("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1").get(email);
    if (usuario) {
      resumen.usuariosExistentes.push(email);
    } else {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO usuarios (nombre, email, activo, id_rol, departamento, auth_provider, password_hash, avatar) VALUES (?, ?, 1, ?, NULL, 'local', ?, ?)")
        .run(String(persona.nombre).trim().slice(0, 100), email, roleId, hashPassword(String(persona.password)), avatares[Math.floor(Math.random() * avatares.length)]);
      usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(Number(lastInsertRowid));
      auditar({ accion: "crear", entidad: "usuarios", entidadId: usuario.id, referencia: email, despues: usuario, detalle: { rol: persona.rol } });
      resumen.usuariosCreados.push(`${email} (${persona.rol})`);
    }
    const vigente = db
      .prepare("SELECT id FROM usuario_roles WHERE usuario_id = ? AND rol_id = ? AND revocado_en IS NULL AND (vigente_hasta IS NULL OR vigente_hasta >= ?) LIMIT 1")
      .get(usuario.id, roleId, hoy);
    // Cuenta temporal (Fase 2): fin de vigencia y supervisor; el rol vence con la cuenta.
    let hasta = usuario.vigente_hasta || null;
    if (persona.temporal && String(usuario.tipo_cuenta || "permanente") !== "temporal") {
      const supervisor = db.prepare("SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1").get(String(persona.temporal.supervisor).trim());
      if (!supervisor) throw new Error(`${email}: el supervisor ${persona.temporal.supervisor} no existe (dalo de alta antes en el archivo)`);
      const fin = new Date();
      fin.setMonth(fin.getMonth() + Number(persona.temporal.meses));
      hasta = fin.toLocaleDateString("en-CA");
      const antes = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(usuario.id);
      db.prepare("UPDATE usuarios SET tipo_cuenta = 'temporal', vigente_hasta = ?, supervisor_id = ?, motivo_ultimo_cambio = ? WHERE id = ?").run(hasta, supervisor.id, MOTIVO, usuario.id);
      auditar({ accion: "cambiar_vigencia", entidad: "usuarios", entidadId: usuario.id, referencia: email, antes, despues: db.prepare("SELECT * FROM usuarios WHERE id = ?").get(usuario.id), detalle: { tipo_cuenta: "temporal", vigente_hasta: hasta, supervisor_id: supervisor.id } });
    }
    if (vigente) continue;
    const { lastInsertRowid } = db
      .prepare("INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, vigente_hasta, motivo, asignado_por, asignado_en) VALUES (?, ?, ?, ?, ?, NULL, ?)")
      .run(usuario.id, roleId, hoy, hasta, MOTIVO, new Date().toISOString());
    auditar({ accion: "asignar_rol", entidad: "usuarios", entidadId: usuario.id, referencia: email, detalle: { rol: persona.rol, rol_id: roleId, asignacion_id: Number(lastInsertRowid), vigente_desde: hoy, vigente_hasta: hasta } });
    resumen.asignaciones.push(`${email} → ${persona.rol}`);
  }
});

try {
  alta.immediate();
} catch (error) {
  db.close();
  fail(`No se hizo ningun cambio: ${error.message}`);
}
const roto = primerEslabonRoto(db.prepare("SELECT * FROM auditoria ORDER BY id ASC").all(), CLAVE);
db.close();

const lista = (titulo, items) => console.log(`${titulo} (${items.length})${items.length ? `:${items.map((x) => `\n  - ${x}`).join("")}` : ""}`);
console.log(`Base: ${sqlitePath}`);
lista("Roles creados", resumen.rolesCreados);
lista("Roles a los que se cargó la matriz del catálogo", resumen.rolesCargados);
if (resumen.rolesIguales.length) console.log(`Roles que ya tenían la matriz del catálogo: ${resumen.rolesIguales.length}`);
if (resumen.rolesDistintos.length) console.log(`AVISO: roles con permisos distintos al catálogo (se respetan; usa --actualizar-permisos para reemplazarlos): ${resumen.rolesDistintos.join(", ")}`);
lista("Usuarios creados", resumen.usuariosCreados);
if (resumen.usuariosExistentes.length) console.log(`Usuarios que ya existían (sin cambios de contraseña): ${resumen.usuariosExistentes.length}`);
lista("Roles asignados", resumen.asignaciones);
console.log(roto === null ? "Bitacora: cadena de sellos integra." : `Bitacora: la cadena NO cuadra a partir de la entrada ${roto} (¿cambio SECRET_KEY o auditoria.key?).`);
process.exit(roto === null ? 0 : 1);
