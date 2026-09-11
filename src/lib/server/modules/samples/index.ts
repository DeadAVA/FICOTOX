import { requireUser } from "../../auth";
import { isSqlite } from "../../db";
import { json, type RouteContext } from "../../http";
import { requirePermission } from "../../rbac";
import { ensureSamplesExtraccionSchema } from "./extraccion";
import { ensureSamplesProcesamientoSchema } from "./procesamiento";
import { ensureSamplesRecepcionSchema } from "./recepcion";

/* Portado de modules/samples/endpoints.py del backend Flask original. */

// Folio legible "R-0000012" / "E-D-0000003": el prefijo sale de tipo_registro
// (las extracciones tienen varios tipos). SQLite usa printf; MySQL, LPAD.
function folioExpression(fallbackPrefix: string): string {
  return isSqlite()
    ? `COALESCE(NULLIF(tipo_registro, ''), '${fallbackPrefix}') || '-' || printf('%07d', folio_num)`
    : `CONCAT(COALESCE(NULLIF(tipo_registro, ''), '${fallbackPrefix}'), '-', LPAD(folio_num, 7, '0'))`;
}

async function ensureAll(ctx: RouteContext): Promise<void> {
  await ensureSamplesRecepcionSchema(ctx.s);
  await ensureSamplesProcesamientoSchema(ctx.s);
  await ensureSamplesExtraccionSchema(ctx.s);
}

export async function samplesSummary(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request);
  await requirePermission(ctx.s, user, "dashboard", "read");
  await ensureAll(ctx);

  const summary = await ctx.s.queryOne(
    `
    SELECT
      (
        (SELECT COUNT(*) FROM muestras_recepcion) +
        (SELECT COUNT(*) FROM muestras_procesamiento) +
        (SELECT COUNT(*) FROM muestras_extraccion)
      ) AS total_muestras,
      0 AS pendientes,
      (
        (SELECT COUNT(*) FROM muestras_recepcion WHERE estado = 'en_proceso') +
        (SELECT COUNT(*) FROM muestras_procesamiento WHERE estado = 'en_proceso') +
        (SELECT COUNT(*) FROM muestras_extraccion WHERE estado = 'en_proceso')
      ) AS en_proceso,
      (
        (SELECT COUNT(*) FROM muestras_recepcion WHERE estado = 'completada') +
        (SELECT COUNT(*) FROM muestras_procesamiento WHERE estado = 'completada') +
        (SELECT COUNT(*) FROM muestras_extraccion WHERE estado = 'completada')
      ) AS completadas
    `,
  );
  return json(summary || {});
}

export async function listSamples(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request);
  await requirePermission(ctx.s, user, "muestras", "read");
  await ensureAll(ctx);

  const rows = await ctx.s.query(
    `
    SELECT id, codigo, cliente, tipo, prioridad, estado, fecha_ingreso, analista
    FROM (
      SELECT id, ${folioExpression("R")} AS codigo, solicitante AS cliente,
             'Recepcion' AS tipo, '-' AS prioridad, estado, fecha_recepcion AS fecha_ingreso,
             NULL AS analista
      FROM muestras_recepcion
      UNION ALL
      SELECT id, ${folioExpression("P")} AS codigo, id_interno AS cliente,
             'Procesamiento' AS tipo, '-' AS prioridad, estado, fecha_procesamiento AS fecha_ingreso,
             nombre_quien_proceso AS analista
      FROM muestras_procesamiento
      UNION ALL
      SELECT id, ${folioExpression("E-A")} AS codigo, id_interno AS cliente,
             'Extraccion' AS tipo, '-' AS prioridad, estado, fecha_extraccion AS fecha_ingreso,
             nombre_quien_extrajo AS analista
      FROM muestras_extraccion
    ) m
    ORDER BY fecha_ingreso DESC, id DESC
    LIMIT 200
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function listPendingSamples(ctx: RouteContext): Promise<Response> {
  const user = await requireUser(ctx.request);
  await requirePermission(ctx.s, user, "muestras", "read");
  await ensureAll(ctx);

  const rows = await ctx.s.query(
    `
    SELECT id, codigo, cliente, tipo, prioridad, estado, fecha_ingreso
    FROM (
      SELECT id, ${folioExpression("R")} AS codigo, solicitante AS cliente,
             'Recepcion' AS tipo, '-' AS prioridad, estado, fecha_recepcion AS fecha_ingreso
      FROM muestras_recepcion
      UNION ALL
      SELECT id, ${folioExpression("P")} AS codigo, id_interno AS cliente,
             'Procesamiento' AS tipo, '-' AS prioridad, estado, fecha_procesamiento AS fecha_ingreso
      FROM muestras_procesamiento
      UNION ALL
      SELECT id, ${folioExpression("E-A")} AS codigo, id_interno AS cliente,
             'Extraccion' AS tipo, '-' AS prioridad, estado, fecha_extraccion AS fecha_ingreso
      FROM muestras_extraccion
    ) m
    WHERE estado IN ('pendiente', 'en_proceso', 'registrada')
    ORDER BY fecha_ingreso ASC
    LIMIT 100
    `,
  );
  return json({ items: rows, total: rows.length });
}
