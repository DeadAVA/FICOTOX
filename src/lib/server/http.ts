import { NextResponse } from "next/server";
import { withSession, type Session } from "./db";

/*
 * Utilidades comunes de los route handlers.
 * - HttpError: respuesta JSON con status, equivalente a `return jsonify(...), code`.
 * - apiRoute: abre una sesion de base de datos por request, convierte HttpError
 *   en respuesta y hace rollback si el handler falla (semantica de Flask).
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(String(body.message || `HTTP ${status}`));
  }
}

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function notFound(message = "Ruta no encontrada"): NextResponse {
  return json({ message }, 404);
}

/* Equivalente de request.is_json de Flask: application/json o application/*+json. */
function isJsonRequest(request: Request): boolean {
  const mimetype = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  return mimetype === "application/json" || (mimetype.startsWith("application/") && mimetype.endsWith("+json"));
}

/* Equivalente de request.get_json(silent=True) or {} */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!isJsonRequest(request)) return {};
  try {
    const data: unknown = await request.json();
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

/* Equivalente del convertidor <int:id> de Flask: si no es entero, 404. */
export function intParam(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(404, { message: "Ruta no encontrada" });
  }
  return Number.parseInt(value, 10);
}

export interface RouteContext {
  request: Request;
  params: Record<string, string | string[]>;
  s: Session;
}

type RouteHandler = (ctx: RouteContext) => Promise<Response>;

export function apiRoute(handler: RouteHandler) {
  return async (request: Request, routeCtx?: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> }): Promise<Response> => {
    const params = routeCtx?.params ? await routeCtx.params : {};
    try {
      // Equivalente al arranque de create_app(): asegurar esquemas antes de atender.
      const { ensureInitialSchema } = await import("./bootstrap");
      await ensureInitialSchema();
      return await withSession(async (s) => {
        try {
          return await handler({ request, params, s });
        } catch (error) {
          await s.rollback();
          if (error instanceof HttpError) {
            return json(error.body, error.status);
          }
          throw error;
        }
      });
    } catch (error) {
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return json({ message: "Error interno del servidor" }, 500);
    }
  };
}
