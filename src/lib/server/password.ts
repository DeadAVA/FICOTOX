import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
 * Contrasenas locales con scrypt (sin dependencias externas).
 * Formato almacenado: scrypt$<N>$<salt base64>$<hash base64>
 */

const SCRYPT_N = 16384;
const KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 10;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEY_LENGTH, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const cost = Number.parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  if (!Number.isFinite(cost) || !salt.length || !expected.length) return false;
  const derived = scryptSync(plain, salt, expected.length, { N: cost });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/*
 * Reglas de contrasena (Fase 2): al menos 10 caracteres y distinta del correo
 * (completo o su parte local) y del nombre de la persona.
 */
export function validatePasswordStrength(plain: string, contexto: { email?: string | null; nombre?: string | null } = {}): string | null {
  if (plain.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }
  const normal = (value: unknown) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const clave = normal(plain);
  const email = normal(contexto.email);
  const prohibidas = [email, email.split("@")[0], normal(contexto.nombre), normal(contexto.nombre).replace(/ /g, "")].filter((v) => v.length > 0);
  if (prohibidas.includes(clave) || prohibidas.includes(clave.replace(/ /g, ""))) {
    return "La contraseña no puede ser igual a tu correo ni a tu nombre";
  }
  return null;
}
