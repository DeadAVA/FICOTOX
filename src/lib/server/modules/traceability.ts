import { requireUser } from "../auth";
import { json, type RouteContext } from "../http";
import { ensureMovimientosSchema } from "../inventory-usage";
import { requirePermission } from "../rbac";
import { ensureSamplesExtraccionSchema } from "./samples/extraccion";
import { ensureSamplesProcesamientoSchema } from "./samples/procesamiento";
import { ensureSamplesRecepcionSchema } from "./samples/recepcion";

/* Portado de modules/traceability/endpoints.py del backend Flask original. */

export async function flowStatus({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "dashboard", "read");
  await ensureSamplesRecepcionSchema(s);
  await ensureSamplesProcesamientoSchema(s);
  await ensureSamplesExtraccionSchema(s);
  await ensureMovimientosSchema(s);

  const data = await s.queryOne(
    `
    SELECT
      (
        (SELECT COUNT(*) FROM muestras_recepcion) +
        (SELECT COUNT(*) FROM muestras_procesamiento) +
        (SELECT COUNT(*) FROM muestras_extraccion)
      ) AS muestras_total,
      (SELECT COUNT(*) FROM movimientos WHERE tabla_origen = 'reactivos') AS enlaces_reactivos,
      0 AS enlaces_equipos,
      (SELECT COUNT(*) FROM movimientos) AS movimientos_total
    `,
  );
  return json(data || {});
}

export async function recentEvents({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "movimientos", "read");
  await ensureMovimientosSchema(s);

  const rows = await s.query(
    `
    SELECT referencia, tipo, tabla_origen, id_item, cantidad, creado_en AS fecha_hora
    FROM movimientos
    ORDER BY creado_en DESC
    LIMIT 50
    `,
  );
  return json({ items: rows, total: rows.length });
}
