import path from "node:path";
import { getConfig } from "./config";
import { isOperationalError } from "./db";
import { json, type RouteContext } from "./http";

/* Health checks portados del backend Flask original. */

export async function healthCheck(): Promise<Response> {
  return json({ ok: true, service: "ficotox-backend" });
}

export async function healthDbCheck({ s }: RouteContext): Promise<Response> {
  try {
    await s.query("SELECT 1");
    // El nombre del archivo (no la ruta) permite a las pruebas confirmar que no
    // estan apuntando a la base real antes de escribir nada.
    const sqlitePath = getConfig().SQLITE_PATH;
    return json({ ok: true, database: "reachable", archivo: sqlitePath ? path.basename(sqlitePath) : "mysql" });
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
