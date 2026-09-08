import { isOperationalError } from "./db";
import { json, type RouteContext } from "./http";

/* Health checks portados del backend Flask original. */

export async function healthCheck(): Promise<Response> {
  return json({ ok: true, service: "ficotox-backend" });
}

export async function healthDbCheck({ s }: RouteContext): Promise<Response> {
  try {
    await s.query("SELECT 1");
    return json({ ok: true, database: "reachable" });
  } catch (error) {
    if (isOperationalError(error)) {
      return json(
        {
          ok: false,
          database: "unreachable",
          message: "No se pudo conectar a la base de datos local. Revisa .env o permisos del archivo SQLite.",
        },
        503,
      );
    }
    throw error;
  }
}
