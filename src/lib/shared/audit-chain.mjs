/*
 * Sello encadenado de la bitacora de auditoria (ISO/IEC 17025 7.5.2 y 7.11).
 * Unica implementacion, compartida por el servidor (src/lib/server/audit.ts) y
 * por los scripts de terminal (scripts/seed-roles-usuarios.mjs). Es JavaScript
 * plano (.mjs) para que Node lo importe sin compilar; los tipos estan en
 * audit-chain.d.mts. Solo para servidor y scripts: usa node:crypto y node:fs.
 *
 * Cada entrada sella con HMAC-SHA256 su contenido mas el sello de la anterior.
 * La llave es SECRET_KEY (si no es el valor de desarrollo) o, si no, un
 * archivo `auditoria.key` junto a la base, creado al azar la primera vez.
 */
import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/* Campos que cambian solos en cada guardado y no aportan al historial. */
export const VOLATILE = new Set(["actualizado_en", "actualizado_por", "creado_en", "creado_por", "password_hash"]);

/* Valor de SECRET_KEY de desarrollo: con el, la llave sale de auditoria.key. */
export const SECRET_KEY_DESARROLLO = "ficotox-dev-secret";

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

/* Representacion estable (claves ordenadas) para comparar y para el sello. */
export function stableJson(value) {
  return JSON.stringify(sortKeys(value));
}

function isSignature(value) {
  return typeof value === "string" && value.length > 200 && value.startsWith("data:image");
}

function scrubSignatures(value) {
  if (isSignature(value)) return "[firma]";
  if (Array.isArray(value)) return value.map(scrubSignatures);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) out[key] = scrubSignatures(entry);
    return out;
  }
  return value;
}

/* Normaliza un registro para el historial: JSON de texto -> objeto, firmas -> marcador. */
export function auditSnapshot(row) {
  if (!row) return null;
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
    out[key] = scrubSignatures(value);
  }
  return out;
}

/* Diferencias campo por campo: { campo: { antes, despues } }. */
export function auditDiff(antes, despues) {
  const cambios = {};
  const keys = new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})]);
  for (const key of keys) {
    const a = antes ? antes[key] : undefined;
    const d = despues ? despues[key] : undefined;
    if (stableJson(a ?? null) !== stableJson(d ?? null)) cambios[key] = { antes: a ?? null, despues: d ?? null };
  }
  return cambios;
}

/*
 * Registro sellable de una entrada. Devuelve null si es una edicion sin
 * cambios ni detalle (no deja rastro). `actor` es { sub, nombre, email } o null.
 */
export function construirRegistro(entry, actor, hashAnterior, fechaHora = new Date().toISOString()) {
  const antes = auditSnapshot(entry.antes);
  const despues = auditSnapshot(entry.despues);
  const cambios = entry.accion === "editar" || (antes && despues) ? auditDiff(antes, despues) : {};
  if (entry.accion === "editar" && antes && despues && !Object.keys(cambios).length && !entry.detalle) return null;
  return {
    fecha_hora: fechaHora,
    usuario_id: actor?.sub ? Number.parseInt(String(actor.sub), 10) || null : null,
    usuario_nombre: actor?.nombre ? String(actor.nombre).slice(0, 150) : null,
    usuario_email: actor?.email ? String(actor.email).slice(0, 150) : null,
    accion: entry.accion,
    entidad: entry.entidad,
    entidad_id: entry.entidadId === undefined || entry.entidadId === null ? null : String(entry.entidadId),
    referencia: entry.referencia ? String(entry.referencia).slice(0, 160) : null,
    motivo: entry.motivo ? String(entry.motivo) : null,
    cambios_json: stableJson({ ...cambios, ...(entry.detalle ? { _detalle: entry.detalle } : {}) }),
    datos_anteriores_json: antes ? stableJson(antes) : null,
    datos_nuevos_json: despues ? stableJson(despues) : null,
    hash_anterior: hashAnterior || null,
  };
}

/* Registro sellable reconstruido desde una fila de la tabla (para verificar). */
export function registroDesdeFila(row) {
  return {
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
}

/* Sello de una entrada (HMAC-SHA256 con la llave de la bitacora). */
export function sellar(registro, clave) {
  return createHmac("sha256", clave).update(stableJson(registro)).digest("hex");
}

/* Primer id alterado de una cadena (filas en orden de id) o null si esta integra. */
export function primerEslabonRoto(filas, clave) {
  let previous = null;
  for (const row of filas) {
    if (sellar(registroDesdeFila(row), clave) !== row.hash || (row.hash_anterior ?? null) !== previous) return Number(row.id);
    previous = String(row.hash);
  }
  return null;
}

/*
 * Verificacion completa de la cadena (Fase 10: la comparten el servidor y el
 * script de restauracion). `filas` en orden de id; `ultimoIdAsignado` es el
 * ultimo id que dio el motor (sqlite_sequence / AUTO_INCREMENT - 1) o null;
 * `triggers` cuantos de los dos triggers de proteccion hay.
 */
export function evaluarCadena(filas, clave, ultimoIdAsignado, triggers) {
  const maxId = filas.length ? Number(filas[filas.length - 1].id) : 0;
  const minId = filas.length ? Number(filas[0].id) : 0;
  const faltantes = ultimoIdAsignado !== null && ultimoIdAsignado !== undefined && ultimoIdAsignado > maxId ? ultimoIdAsignado - maxId : 0;
  // Los ids son consecutivos: cualquier hueco significa que se borro una entrada.
  const huecos = filas.length ? maxId - minId + 1 - filas.length : 0;
  const primerError = primerEslabonRoto(filas, clave);
  const triggersOk = triggers === 2;
  return {
    ok: primerError === null && faltantes === 0 && huecos === 0 && triggersOk,
    total: filas.length,
    primer_error: primerError,
    filas_faltantes_al_final: faltantes,
    filas_faltantes_intermedias: huecos,
    triggers_ok: triggersOk,
  };
}

/* Llave configurada sin crear nada: SECRET_KEY (si no es la de desarrollo) o el contenido de auditoria.key, o null. */
export function leerClaveSello(secretKey, instanceDir) {
  const configurada = String(secretKey || "").trim();
  if (configurada && configurada !== SECRET_KEY_DESARROLLO) return { clave: configurada, origen: "SECRET_KEY" };
  try {
    const clave = fs.readFileSync(path.join(instanceDir, "auditoria.key"), "utf8").trim();
    return clave ? { clave, origen: "auditoria.key" } : null;
  } catch {
    return null;
  }
}

/* Llave del sello: SECRET_KEY configurada o `<instanceDir>/auditoria.key` (se crea si falta). */
export function resolverClaveSello(secretKey, instanceDir) {
  const configurada = String(secretKey || "").trim();
  if (configurada && configurada !== SECRET_KEY_DESARROLLO) return configurada;
  const archivo = path.join(instanceDir, "auditoria.key");
  let clave = "";
  try {
    clave = fs.readFileSync(archivo, "utf8").trim();
  } catch {
    clave = "";
  }
  if (!clave) {
    clave = randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, `${clave}\n`, { mode: 0o600 });
  }
  return clave;
}

/* SQL de insercion comun (parametros :nombre, validos en el servidor y con better-sqlite3 usando @nombre). */
export const COLUMNAS_AUDITORIA = ["fecha_hora", "usuario_id", "usuario_nombre", "usuario_email", "accion", "entidad", "entidad_id", "referencia", "motivo", "cambios_json", "datos_anteriores_json", "datos_nuevos_json", "hash_anterior", "hash"];
