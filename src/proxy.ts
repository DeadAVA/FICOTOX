import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Equivalente de Flask-CORS (resources /api/*, origins = CORS_ORIGINS):
 * 1. Sin encabezado Origin y CORS_ORIGINS="*": Access-Control-Allow-Origin: *.
 * 2. Con Origin permitido: se refleja el Origin y se agrega Vary: Origin.
 * 3. Preflight OPTIONS: 200 con el Origin, los metodos completos y los
 *    encabezados solicitados (Access-Control-Request-Headers) reflejados.
 * Las rutas con barra final (/api/consumables/) se resuelven con los rewrites
 * de next.config.ts.
 */

const CORS_METHODS = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT";

function allowedOrigin(requestOrigin: string | null): string | null {
  const configured = (process.env.CORS_ORIGINS || "*").trim();
  if (!configured) return null;
  if (configured === "*") return requestOrigin || "*";
  if (!requestOrigin) return null;
  const list = configured.split(",").map((item) => item.trim()).filter(Boolean);
  return list.includes(requestOrigin) ? requestOrigin : null;
}

function applyCorsHeaders(headers: Headers, allowed: string, requestOrigin: string | null) {
  headers.set("Access-Control-Allow-Origin", allowed);
  if (requestOrigin) headers.append("Vary", "Origin");
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = allowedOrigin(origin);

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });
    if (allowed) {
      applyCorsHeaders(response.headers, allowed, origin);
      response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
      const requested = request.headers.get("access-control-request-headers");
      if (requested) response.headers.set("Access-Control-Allow-Headers", requested);
    }
    return response;
  }

  const response = NextResponse.next();
  if (allowed) applyCorsHeaders(response.headers, allowed, origin);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
