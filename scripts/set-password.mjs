#!/usr/bin/env node
/*
 * Restablece la contrasena local de un usuario desde la terminal (solo SQLite).
 * Es el recurso de emergencia cuando nadie con usuarios:G puede entrar; en la
 * operacion normal se usa Administracion > Usuarios > Restablecer contrasena.
 *
 *   node scripts/set-password.mjs <correo> "<contrasena temporal>" --motivo "<por que>"
 *
 * Fase 12:
 * - exige el servidor detenido (servidor.lock) y la base migrada;
 * - aplica la misma politica de contrasenas que la aplicacion (validatePasswordStrength);
 * - deja la contrasena como TEMPORAL: debe cambiarse al entrar (debe_cambiar_password=1)
 *   y cierra las sesiones abiertas de esa cuenta (token_version + 1);
 * - queda en la bitacora como "sistema" con el motivo (sellado con la misma llave);
 * - sin DDL: la columna la crean las migraciones.
 * Lee .env (o FICOTOX_ENV_FILE) como el servidor. Requiere Node 22.18+ o 24.
 */
import { COLUMNAS_AUDITORIA, construirRegistro, sellar } from "../src/lib/shared/audit-chain.mjs";
import { argumento, claveBitacora, entornoDe, servidorEncendido, Sqlite } from "./lib/operacion.mjs";

const args = process.argv.slice(2);
const [email, password] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--motivo");
const motivo = String(argumento(args, "--motivo") || "").trim();
const salir = (mensaje) => {
  console.error(mensaje);
  process.exit(1);
};
if (!email || !password || motivo.length < 5) salir('Uso: node scripts/set-password.mjs <correo> "<contraseña temporal>" --motivo "<por qué>" (el motivo queda en la bitácora)');

const entorno = entornoDe();
if (entorno.motor !== "sqlite") salir("Este script solo aplica a SQLite. En MySQL restablece la contraseña desde Administración › Usuarios.");
const vivo = servidorEncendido(entorno.instanceDir);
if (vivo) salir(`El servidor está encendido (pid ${vivo.pid}). Detenlo antes de restablecer la contraseña desde la terminal.`);

// password.ts es TypeScript (Node lo carga sin compilar): se calla solo el aviso de tipo de modulo.
const avisosPorOmision = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (aviso) => {
  if (aviso?.code !== "MODULE_TYPELESS_PACKAGE_JSON") for (const l of avisosPorOmision) l(aviso);
});
let passwordModule;
try {
  passwordModule = await import("../src/lib/server/password.ts");
} catch (error) {
  salir(`No se pudo cargar src/lib/server/password.ts (${error.message}). Usa Node 22.18+ o 24.`);
}
const { hashPassword, validatePasswordStrength } = passwordModule;

const db = new Sqlite(entorno.sqlitePath, { fileMustExist: true });
try {
  const columnas = db.prepare("PRAGMA table_info(usuarios)").all().map((c) => c.name);
  if (!columnas.includes("debe_cambiar_password") || !db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migraciones'").get()) salir("La base no está migrada: corre primero npm run migrar.");
  const usuario = db.prepare("SELECT id, nombre, email FROM usuarios WHERE LOWER(email) = LOWER(?)").get(email);
  if (!usuario) salir(`No se encontró el usuario ${email}`);
  const debil = validatePasswordStrength(String(password), { email: usuario.email, nombre: usuario.nombre });
  if (debil) salir(debil);
  const clave = claveBitacora(entorno);
  if (!clave) salir("No hay llave de la bitácora (SECRET_KEY o auditoria.key): no se puede registrar el cambio.");
  const insertar = db.prepare(`INSERT INTO auditoria (${COLUMNAS_AUDITORIA.join(", ")}) VALUES (${COLUMNAS_AUDITORIA.map((c) => `@${c}`).join(", ")})`);
  db.transaction(() => {
    db.prepare("UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 1, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?").run(hashPassword(String(password)), usuario.id);
    const previo = db.prepare("SELECT hash FROM auditoria ORDER BY id DESC LIMIT 1").get();
    const registro = construirRegistro({ accion: "restablecer_password", entidad: "usuarios", entidadId: usuario.id, referencia: usuario.email, motivo, detalle: { via: "scripts/set-password.mjs", debe_cambiar_password: true } }, { sub: null, nombre: "sistema", email: null }, previo?.hash || null);
    insertar.run({ ...registro, hash: sellar(registro, clave) });
  })();
} finally {
  db.close();
}
console.log(`Contraseña temporal asignada a ${email}: deberá cambiarla al entrar. Quedó en la bitácora (motivo: ${motivo}).`);
