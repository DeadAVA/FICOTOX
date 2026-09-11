/*
 * Catalogo de avatares (compartido servidor + cliente). El dibujo vive en
 * `src/components/ui/AvatarArt.tsx`; aqui solo las claves, para validar lo que
 * se guarda y para asignar uno al azar (pero estable) a quien no ha elegido.
 */
export const AVATAR_KEYS = [
  "medusa",
  "pulpo",
  "tortuga",
  "ballena",
  "pez",
  "cangrejo",
  "estrella",
  "erizo",
  "concha",
  "mejillon",
  "diatomea",
  "dinoflagelado",
  "alga",
  "coral",
  "ola",
  "microscopio",
  "matraz",
  "faro",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_KEYS as readonly string[]).includes(value);
}

/* Avatar por omision: se deriva del correo (o nombre) para que siempre sea el mismo mientras la persona no elija otro. */
export function defaultAvatarFor(seed: string): AvatarKey {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_KEYS[hash % AVATAR_KEYS.length];
}

export function randomAvatar(): AvatarKey {
  return AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)];
}
