import fs from "node:fs";
import path from "node:path";

/*
 * Configuracion de la aplicacion (variables de entorno y rutas de datos).
 * Next.js carga .env / .env.local de la raiz del proyecto. Ademas se respeta
 * FICOTOX_ENV_FILE para las variables que no esten definidas todavia; el
 * lanzador (scripts/start-ficotox.mjs) hace lo mismo para el modo standalone.
 */

export interface AppConfig {
  BASE_DIR: string;
  INSTANCE_DIR: string;
  SECRET_KEY: string;
  DATABASE_URL: string;
  SQLITE_PATH: string | null;
  JWT_SECRET: string;
  JWT_EXPIRES_HOURS: number;
  LOCAL_LOGIN_ENABLED: boolean;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_ALLOWED_DOMAIN: string;
  MICROSOFT_AUTH_ENABLED: boolean;
  CORS_ORIGINS: string;
}

let cached: AppConfig | null = null;

function envBool(name: string, fallback: string): boolean {
  return (process.env[name] ?? fallback).toLowerCase() === "true";
}

// Acceso indirecto para que el trazado de archivos de Turbopack no incluya
// todo el proyecto en la salida standalone (la ruta se decide en tiempo de ejecucion).
const readTextFile = (target: string): string | null => {
  try {
    return String((fs as unknown as Record<string, (p: string, enc: string) => unknown>)["readFile" + "Sync"](target, "utf8"));
  } catch {
    return null;
  }
};

/* Carga un archivo .env sin sobrescribir variables ya definidas (load_dotenv override=False). */
function loadEnvFile(target: string): void {
  const content = readTextFile(target);
  if (content === null) return;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim().replace(/^export\s+/, "");
    const value = rest.join("=").trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name && !(name in process.env)) process.env[name] = value;
  }
}

function loadEnvironment(baseDir: string): void {
  const configured = (process.env.FICOTOX_ENV_FILE || "").trim();
  if (configured) {
    loadEnvFile(path.resolve(baseDir, configured));
    return;
  }
  loadEnvFile(path.join(baseDir, ".env"));
}

function resolveSqlitePath(baseDir: string): string {
  const configured = (process.env.SQLITE_PATH || "").trim();
  if (configured) {
    return path.resolve(baseDir, configured);
  }
  return path.join(baseDir, "instance", "ficotox.sqlite3");
}

function buildDatabaseUrl(baseDir: string): { url: string; sqlitePath: string | null } {
  const explicit = (process.env.DATABASE_URL || "").trim();
  if (explicit) {
    if (explicit.startsWith("sqlite:")) {
      const raw = explicit.replace(/^sqlite:\/*/, "");
      const sqlitePath = path.isAbsolute(raw) ? raw : path.resolve(baseDir, raw);
      return { url: `sqlite:///${sqlitePath}`, sqlitePath };
    }
    return { url: explicit, sqlitePath: null };
  }
  const sqlitePath = resolveSqlitePath(baseDir);
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  return { url: `sqlite:///${sqlitePath}`, sqlitePath };
}

export function getConfig(): AppConfig {
  if (cached) return cached;
  const BASE_DIR = process.env.FICOTOX_BASE_DIR ? path.resolve(process.env.FICOTOX_BASE_DIR) : process.cwd();
  loadEnvironment(BASE_DIR);
  const { url, sqlitePath } = buildDatabaseUrl(BASE_DIR);
  const instanceDir = process.env.FICOTOX_INSTANCE_DIR
    ? path.resolve(BASE_DIR, process.env.FICOTOX_INSTANCE_DIR)
    : sqlitePath
      ? path.dirname(sqlitePath)
      : path.join(BASE_DIR, "instance");

  const clientId = (process.env.MICROSOFT_CLIENT_ID || "").trim();
  const tenantId = (process.env.MICROSOFT_TENANT_ID || "").trim();

  cached = {
    BASE_DIR,
    INSTANCE_DIR: instanceDir,
    SECRET_KEY: process.env.SECRET_KEY || "ficotox-dev-secret",
    DATABASE_URL: url,
    SQLITE_PATH: sqlitePath,
    JWT_SECRET: process.env.JWT_SECRET || "ficotox-jwt-secret",
    JWT_EXPIRES_HOURS: Number.parseInt(process.env.JWT_EXPIRES_HOURS || "12", 10) || 12,
    LOCAL_LOGIN_ENABLED: envBool("LOCAL_LOGIN_ENABLED", "true"),
    MICROSOFT_CLIENT_ID: clientId,
    MICROSOFT_TENANT_ID: tenantId,
    MICROSOFT_ALLOWED_DOMAIN: (process.env.MICROSOFT_ALLOWED_DOMAIN || "cicese.mx").trim().toLowerCase(),
    MICROSOFT_AUTH_ENABLED: envBool("MICROSOFT_AUTH_ENABLED", "true") && !!clientId && !!tenantId,
    CORS_ORIGINS: process.env.CORS_ORIGINS || "*",
  };
  return cached;
}
