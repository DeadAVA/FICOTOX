import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida autocontenida (.next/standalone) para desplegar solo con Node.js.
  output: "standalone",
  // Modulos nativos / con requires dinamicos que no deben empaquetarse.
  serverExternalPackages: ["better-sqlite3", "mysql2"],
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
  // El trazado de archivos no debe copiar bases de datos ni codigo legado al standalone.
  outputFileTracingExcludes: {
    "*": ["./instance/**", "./docs/**", "./scripts/**", "./src/**"],
  },
  // Raiz explicita para Turbopack (evita que tome lockfiles fuera del repo).
  turbopack: { root: __dirname },
  // No generar AGENTS.md / CLAUDE.md automaticamente.
  agentRules: false,
  // Permite abrir el dev server por IP local sin bloquear recursos de desarrollo.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
