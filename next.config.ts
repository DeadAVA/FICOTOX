import type { NextConfig } from "next";

/*
 * Fase 10: el proxy (src/proxy.ts, CORS de /api/*) guarda en memoria el cuerpo de
 * las peticiones y por omision lo corta a 10 MB, lo que rompia las subidas de
 * evidencia de 10 a 25 MB. El limite del proxy sigue a EVIDENCIA_MAX_MB (minimo
 * 25) mas margen para el multipart. Se fija al construir: subir EVIDENCIA_MAX_MB
 * por encima de 25 exige volver a correr `npm run build`.
 */
const evidenciaMaxMb = Math.max(25, Number.parseInt(process.env.EVIDENCIA_MAX_MB || "", 10) || 25);
/* Biblioteca de documentos: BIBLIOTECA_MAX_MB (50 por omision); el proxy admite el mayor de los dos limites. */
const bibliotecaMaxMb = Math.max(50, Number.parseInt(process.env.BIBLIOTECA_MAX_MB || "", 10) || 50);

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: (Math.max(evidenciaMaxMb, bibliotecaMaxMb) + 2) * 1024 * 1024,
  },
  // Salida autocontenida (.next/standalone) para desplegar solo con Node.js.
  output: "standalone",
  // Modulos nativos / con requires dinamicos que no deben empaquetarse.
  serverExternalPackages: ["better-sqlite3", "mysql2", "sharp"],
  // El frontend legado llamaba rutas como /api/consumables/ (con barra final).
  // Se reescriben internamente (sin redirect, para no perder el cuerpo de los POST).
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return {
      beforeFiles: [{ source: "/api/:path+/", destination: "/api/:path+" }],
      afterFiles: [],
      fallback: [],
    };
  },
  // Sin marca de Next en las respuestas.
  poweredByHeader: false,
  // El trazado de archivos no debe copiar bases de datos, respaldos ni codigo legado al standalone.
  outputFileTracingExcludes: {
    "*": ["./instance/**", "./instance-restaurada/**", "./backups/**", "./docs/**", "./scripts/**", "./src/**"],
  },
  // Raiz explicita para Turbopack (evita que tome lockfiles fuera del repo).
  turbopack: { root: __dirname },
  // No generar AGENTS.md / CLAUDE.md automaticamente.
  agentRules: false,
  // Permite abrir el dev server por IP local sin bloquear recursos de desarrollo.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
