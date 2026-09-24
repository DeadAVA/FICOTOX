/*
 * Alta de los roles provisionales (Fase 0) y de un usuario local por rol.
 *
 *   node scripts/seed-roles-usuarios.mjs
 *   node scripts/seed-roles-usuarios.mjs --usuarios otro-archivo.json --db ruta/a/base.sqlite3
 *
 * - Roles y permisos: scripts/roles-catalogo.json (R/C/U/D por modulo; lo que no
 *   aparece queda sin permiso).
 * - Personas y contrasenas: scripts/seed-usuarios.local.json (ignorado por git;
 *   plantilla en scripts/seed-usuarios.example.json). Tambien SEED_USUARIOS_FILE.
 * - Idempotente: un rol (por nombre) o un usuario (por correo) que ya existe no
 *   se duplica ni se modifica (tampoco su contrasena ni sus permisos).
 * - Cada alta queda en la bitacora de auditoria con actor "sistema" y motivo
 *   "Reinicio Fase 0", encadenada y sellada igual que en el servidor. La logica
 *   de registrarAuditoria/sellar se replica aqui porque src/lib/server/audit.ts
 *   no se puede importar desde Node (sus imports internos no llevan extension):
 *   si cambia el formato sellado alla, hay que cambiarlo aqui. Al terminar se
 *   recalcula la cadena completa, y tests/api-roles.mjs verifica con el
 *   servidor la cadena que deja este script (la base de prueba se genera con el).
 * - Solo SQLite, con el servidor detenido. La base debe tener ya sus tablas:
 *   si es nueva, arranca FICOTOX una vez y abre /api/health/db (el arranque
 *   crea el esquema), detenlo y vuelve a correr este script.
 * - Contrasenas con hashPassword() de src/lib/server/password.ts (requiere
 *   Node 22.18+ o 24, que ejecutan TypeScript sin compilar).
 */
import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOTIVO = "Reinicio Fase 0";
const ACTOR = "sistema";

const fail = (message) => {
  console.error(`\n${message}`);
  process.exit(1);
};

const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
};

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
if (databaseUrl && !databaseUrl.startsWith("sqlite:")) {
  fail("Este script solo aplica a SQLite. En MySQL da de alta los roles y usuarios desde Administracion.");
}
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
if (!fs.existsSync(usuariosFile)) {
  fail(`No existe ${path.relative(rootDir, usuariosFile)}.\nCopia scripts/seed-usuarios.example.json como scripts/seed-usuarios.local.json y escribe las contrasenas.`);
}
const personas = JSON.parse(fs.readFileSync(usuariosFile, "utf8")).usuarios || [];
const rolesPorNombre = new Map(catalogo.roles.map((rol) => [rol.nombre, rol]));
const errores = [];
for (const persona of personas) {
  if (!rolesPorNombre.has(persona.rol)) errores.push(`${persona.email}: el rol "${persona.rol}" no esta en roles-catalogo.json`);
  if (!persona.nombre || !persona.email) errores.push(`Falta nombre o correo en ${JSON.stringify(persona)}`);
  const debil = validatePasswordStrength(String(persona.password || ""));
  if (debil || persona.password === "CAMBIAR") errores.push(`${persona.email}: ${debil || "escribe una contrasena real"}`);
}
if (errores.length) fail(`Revisa ${path.relative(rootDir, usuariosFile)}:\n- ${errores.join("\n- ")}`);

/* ---------- Base ---------- */

if (!fs.existsSync(sqlitePath)) {
  fail(`No existe la base ${sqlitePath}.\nArranca FICOTOX una vez (npm run dev y abre /api/health/db) para que cree el esquema, detenlo y vuelve a correr este script.`);
}
const Database = require("better-sqlite3");
const db = new Database(sqlitePath);
const tablas = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
const faltan = ["roles", "permisos", "rol_permisos", "usuarios", "auditoria"].filter((tabla) => !tablas.has(tabla));
if (faltan.length) {
  db.close();
  fail(`La base no tiene el esquema (faltan: ${faltan.join(", ")}).\nArranca FICOTOX una vez y abre /api/health/db para crearlo; luego detenlo y repite.`);
}
const permisoIds = new Map(db.prepare("SELECT id, clave FROM permisos WHERE activo = 1").all().map((row) => [row.clave, row.id]));
const sinModulo = catalogo.modulos.filter((clave) => !permisoIds.has(clave));
if (sinModulo.length) fail(`Faltan modulos en la tabla permisos: ${sinModulo.join(", ")}`);

/* ---------- Bitacora (replica de registrarAuditoria / sellar) ---------- */

const VOLATILE = new Set(["actualizado_en", "actualizado_por", "creado_en", "creado_por", "password_hash"]);
const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
};
const stableJson = (value) => JSON.stringify(sortKeys(value));
const snapshot = (row) => {
  const out = {};
  for (const [key, raw] of Object.entries(row)) {
    if (VOLATILE.has(key)) continue;
    let value = typeof raw === "bigint" ? Number(raw) : raw;
    if (key.endsWith("_json") && typeof raw === "string") {
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    }
    out[key] = value;
  }
  return out;
};
function claveSello() {
  const configurada = (process.env.SECRET_KEY || "").trim();
  if (configurada && configurada !== "ficotox-dev-secret") return configurada;
  const archivo = path.join(instanceDir, "auditoria.key");
  let clave = fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8").trim() : "";
  if (!clave) {
    clave = randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, `${clave}\n`, { mode: 0o600 });
  }
  return clave;
}
const CLAVE = claveSello();
const sellar = (record) => createHmac("sha256", CLAVE).update(stableJson(record)).digest("hex");

function registrarAlta(entidad, id, referencia, row, detalle) {
  const previous = db.prepare("SELECT hash FROM auditoria ORDER BY id DESC LIMIT 1").get();
  const record = {
    fecha_hora: new Date().toISOString(),
    usuario_id: null,
    usuario_nombre: ACTOR,
    usuario_email: null,
    accion: "crear",
    entidad,
    entidad_id: String(id),
    referencia: String(referencia).slice(0, 160),
    motivo: MOTIVO,
    cambios_json: stableJson(detalle ? { _detalle: detalle } : {}),
    datos_anteriores_json: null,
    datos_nuevos_json: stableJson(snapshot(row)),
    hash_anterior: previous?.hash || null,
  };
  db.prepare(
    `INSERT INTO auditoria (fecha_hora, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id, referencia, motivo, cambios_json, datos_anteriores_json, datos_nuevos_json, hash_anterior, hash)
     VALUES (@fecha_hora, @usuario_id, @usuario_nombre, @usuario_email, @accion, @entidad, @entidad_id, @referencia, @motivo, @cambios_json, @datos_anteriores_json, @datos_nuevos_json, @hash_anterior, @hash)`,
  ).run({ ...record, hash: sellar(record) });
}

/* Recalcula la cadena completa, como GET /api/audit/verify (sin los triggers). */
function cadenaIntegra() {
  let previous = null;
  for (const row of db.prepare("SELECT * FROM auditoria ORDER BY id ASC").all()) {
    const record = {
      fecha_hora: row.fecha_hora,
      usuario_id: row.usuario_id === null || row.usuario_id === undefined ? null : Number(row.usuario_id),
      usuario_nombre: row.usuario_nombre ?? null,
      usuario_email: row.usuario_email ?? null,
      accion: row.accion,
      entidad: row.entidad,
      entidad_id: row.entidad_id ?? null,
      referencia: row.referencia ?? null,
      motivo: row.motivo ?? null,
      cambios_json: row.cambios_json ?? null,
      datos_anteriores_json: row.datos_anteriores_json ?? null,
      datos_nuevos_json: row.datos_nuevos_json ?? null,
      hash_anterior: row.hash_anterior ?? null,
    };
    if (sellar(record) !== row.hash || (row.hash_anterior ?? null) !== previous) return { ok: false, id: row.id };
    previous = row.hash;
  }
  return { ok: true };
}

/* ---------- Alta ---------- */

const avatares = ["medusa", "pulpo", "tortuga", "ballena", "pez", "cangrejo", "estrella", "erizo", "concha", "mejillon", "diatomea", "dinoflagelado", "alga", "coral", "ola", "microscopio", "matraz", "faro"];
const resumen = { rolesCreados: [], rolesExistentes: [], usuariosCreados: [], usuariosExistentes: [] };

const alta = db.transaction(() => {
  const roleIds = new Map();
  for (const rol of catalogo.roles) {
    const existente = db.prepare("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?) LIMIT 1").get(rol.nombre);
    if (existente) {
      roleIds.set(rol.nombre, existente.id);
      resumen.rolesExistentes.push(rol.nombre);
      continue;
    }
    const { lastInsertRowid } = db
      .prepare("INSERT INTO roles (nombre, descripcion, es_sistemico, activo) VALUES (?, ?, ?, 1)")
      .run(rol.nombre, rol.descripcion || null, rol.es_sistemico ? 1 : 0);
    const roleId = Number(lastInsertRowid);
    roleIds.set(rol.nombre, roleId);
    const permisos = [];
    for (const [clave, acciones] of Object.entries(rol.permisos)) {
      const flags = { can_read: acciones.includes("R") ? 1 : 0, can_create: acciones.includes("C") ? 1 : 0, can_update: acciones.includes("U") ? 1 : 0, can_delete: acciones.includes("D") ? 1 : 0 };
      db.prepare("INSERT INTO rol_permisos (id_rol, id_permiso, can_read, can_create, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)").run(roleId, permisoIds.get(clave), flags.can_read, flags.can_create, flags.can_update, flags.can_delete);
      permisos.push({ permiso_id: permisoIds.get(clave), clave, ...flags });
    }
    registrarAlta("roles", roleId, rol.nombre, db.prepare("SELECT * FROM roles WHERE id = ?").get(roleId), { permisos });
    resumen.rolesCreados.push(rol.nombre);
  }

  for (const persona of personas) {
    const email = String(persona.email).trim().toLowerCase();
    if (db.prepare("SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1").get(email)) {
      resumen.usuariosExistentes.push(email);
      continue;
    }
    const { lastInsertRowid } = db
      .prepare("INSERT INTO usuarios (nombre, email, activo, id_rol, departamento, auth_provider, password_hash, avatar) VALUES (?, ?, 1, ?, NULL, 'local', ?, ?)")
      .run(String(persona.nombre).trim().slice(0, 100), email, roleIds.get(persona.rol), hashPassword(String(persona.password)), avatares[Math.floor(Math.random() * avatares.length)]);
    const userId = Number(lastInsertRowid);
    registrarAlta("usuarios", userId, email, db.prepare("SELECT * FROM usuarios WHERE id = ?").get(userId), { rol: persona.rol });
    resumen.usuariosCreados.push(`${email} (${persona.rol})`);
  }
});

try {
  alta.immediate();
} catch (error) {
  db.close();
  fail(`No se hizo ningun cambio: ${error.message}`);
}
const cadena = cadenaIntegra();
db.close();

console.log(`Base: ${sqlitePath}`);
console.log(`Roles creados (${resumen.rolesCreados.length}): ${resumen.rolesCreados.join(", ") || "-"}`);
if (resumen.rolesExistentes.length) console.log(`Roles que ya existian (sin cambios): ${resumen.rolesExistentes.join(", ")}`);
console.log(`Usuarios creados (${resumen.usuariosCreados.length}):${resumen.usuariosCreados.map((u) => `\n  - ${u}`).join("") || " -"}`);
if (resumen.usuariosExistentes.length) console.log(`Usuarios que ya existian (sin cambios): ${resumen.usuariosExistentes.join(", ")}`);
console.log(cadena.ok ? "Bitacora: cadena de sellos integra." : `Bitacora: la cadena NO cuadra a partir de la entrada ${cadena.id} (¿cambio SECRET_KEY o auditoria.key?).`);
process.exit(cadena.ok ? 0 : 1);
