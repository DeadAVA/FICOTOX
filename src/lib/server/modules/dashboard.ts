import { requireUser } from "../auth";
import { isOperationalError, isSqlite } from "../db";
import { json, type RouteContext } from "../http";
import { ensureMovimientosSchema } from "../inventory-usage";
import { requirePermission } from "../rbac";
import { ensureConsumiblesSchema } from "./consumables";
import { ensureEquiposSchema, ensureMantenimientosSchema, ensureReactivosSchema } from "./inventory";
import { ensureSamplesExtraccionSchema } from "./samples/extraccion";
import { ensureSamplesProcesamientoSchema } from "./samples/procesamiento";
import { ensureSamplesRecepcionSchema } from "./samples/recepcion";

/* Portado de modules/dashboard/endpoints.py del backend Flask original. */

export async function dashboardOverview({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "dashboard", "read");

  try {
    await ensureReactivosSchema(s);
    await ensureConsumiblesSchema(s);
    await ensureEquiposSchema(s);
    await ensureMantenimientosSchema(s);
    await ensureMovimientosSchema(s);
    await ensureSamplesRecepcionSchema(s);
    await ensureSamplesProcesamientoSchema(s);
    await ensureSamplesExtraccionSchema(s);

    const maintenanceDateFilter = isSqlite()
      ? "date('now') AND date('now', '+30 days')"
      : "CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
    const overdueDateFilter = isSqlite() ? "date('now')" : "CURDATE()";

    const counters = await s.queryOne(
      `
      SELECT
        (SELECT COUNT(*) FROM reactivos) AS total_reactivos,
        (SELECT COUNT(*) FROM consumibles) AS total_consumibles,
        (SELECT COUNT(*) FROM equipos) AS total_equipos,
        (
          (SELECT COUNT(*) FROM muestras_recepcion) +
          (SELECT COUNT(*) FROM muestras_procesamiento) +
          (SELECT COUNT(*) FROM muestras_extraccion)
        ) AS total_muestras,
        (
          SELECT COALESCE(SUM(cantidad), 0)
          FROM movimientos
          WHERE tipo = 'entrada' AND tabla_origen = 'reactivos'
        ) AS entradas_reactivos,
        (
          SELECT COALESCE(SUM(cantidad), 0)
          FROM movimientos
          WHERE tipo = 'entrada' AND tabla_origen = 'consumibles'
        ) AS entradas_consumibles,
        (
          SELECT COALESCE(SUM(cantidad), 0)
          FROM movimientos
          WHERE tipo = 'salida' AND tabla_origen = 'reactivos'
        ) AS salidas_reactivos,
        (
          SELECT COALESCE(SUM(cantidad), 0)
          FROM movimientos
          WHERE tipo = 'salida' AND tabla_origen = 'consumibles'
        ) AS salidas_consumibles,
        (
          SELECT COUNT(*)
          FROM mantenimientos
          WHERE fecha_programada BETWEEN __DATE_RANGE__
            AND estado IN ('programado', 'en_proceso')
        ) AS mantenimientos_proximos,
        (SELECT COUNT(*) FROM mantenimientos WHERE estado = 'completado') AS mantenimientos_realizados,
        (
          SELECT COUNT(*)
          FROM mantenimientos
          WHERE estado IN ('programado', 'en_proceso')
        ) AS mantenimientos_pendientes,
        (
          SELECT COUNT(*)
          FROM mantenimientos
          WHERE estado = 'vencido'
             OR (fecha_programada < __TODAY__ AND estado IN ('programado', 'en_proceso'))
        ) AS mantenimientos_vencidos
      `
        .replace("__DATE_RANGE__", maintenanceDateFilter)
        .replace("__TODAY__", overdueDateFilter),
    );

    const recentMovements = await s.query(
      `
      SELECT
        m.id,
        m.referencia,
        m.tipo,
        m.tabla_origen,
        m.cantidad,
        m.motivo,
        m.creado_en AS fecha_hora,
        COALESCE(r.nombre, c.producto) AS item_nombre,
        u.nombre AS usuario
      FROM movimientos m
      LEFT JOIN reactivos r
        ON m.tabla_origen = 'reactivos' AND r.id = m.id_item
      LEFT JOIN consumibles c
        ON m.tabla_origen = 'consumibles' AND c.id = m.id_item
      LEFT JOIN usuarios u
        ON u.id = m.id_usuario
      ORDER BY m.creado_en DESC
      LIMIT 8
      `,
    );

    const recentMaintenances = await s.query(
      `
      SELECT
        mt.id,
        mt.tipo,
        mt.estado,
        mt.fecha_programada,
        e.nombre AS equipo,
        u.nombre AS responsable
      FROM mantenimientos mt
      LEFT JOIN equipos e ON e.id = mt.id_equipo
      LEFT JOIN usuarios u ON u.id = mt.id_responsable
      ORDER BY mt.fecha_programada ASC, mt.id DESC
      LIMIT 8
      `,
    );

    return json({
      counters: counters || {},
      recent_movements: recentMovements,
      recent_maintenances: recentMaintenances,
    });
  } catch (error) {
    if (isOperationalError(error)) {
      return json({ message: "No se pudo consultar la base de datos para el dashboard." }, 503);
    }
    throw error;
  }
}
