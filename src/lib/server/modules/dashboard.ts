import { requireUser } from "../auth";
import { isOperationalError } from "../db";
import { json, type RouteContext } from "../http";

import { cargarAutorizacion, permisoDe, recortarPorModulo } from "../rbac";

import { hoyLocal, sumarDias } from "../../shared/fechas";

/* Portado de modules/dashboard/endpoints.py del backend Flask original. */

export async function dashboardOverview({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const auth = await cargarAutorizacion(s, user);

  try {

    // Dia local del laboratorio como parametro (date('now')/CURDATE() darian el dia UTC del servidor).
    const maintenanceDateFilter = ":hoy AND :en30";
    const overdueDateFilter = ":hoy";
    const fechas = { hoy: hoyLocal(), en30: sumarDias(hoyLocal(), 30) };

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
      fechas,
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

    const inventario = "inventario" as const;
    const equipos = "equipos" as const;
    return json({
      counters: recortarPorModulo(auth, counters || {}, {
        total_reactivos: inventario, total_consumibles: inventario, entradas_reactivos: inventario, entradas_consumibles: inventario, salidas_reactivos: inventario, salidas_consumibles: inventario,
        total_equipos: equipos, mantenimientos_proximos: equipos, mantenimientos_realizados: equipos, mantenimientos_pendientes: equipos, mantenimientos_vencidos: equipos,
        total_muestras: "muestras",
      }),
      recent_movements: permisoDe(auth, "inventario", "V") ? recentMovements : [],
      recent_maintenances: permisoDe(auth, "equipos", "V") ? recentMaintenances : [],
    });
  } catch (error) {
    if (isOperationalError(error)) {
      return json({ message: "No se pudo consultar la base de datos para el dashboard." }, 503);
    }
    throw error;
  }
}
