import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
 * Contrasenas locales con scrypt (sin dependencias externas).
 * Formato almacenado: scrypt$<N>$<salt base64>$<hash base64>
 */

const SCRYPT_N = 16384;
const KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 8;

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

export function validatePasswordStrength(plain: string): string | null {
  if (plain.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }
  return null;
}
