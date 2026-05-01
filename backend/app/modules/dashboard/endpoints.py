from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/overview")
@token_required
@permission_required("dashboard", "read")
def dashboard_overview():
    try:
        counters = db.session.execute(
            text(
                """
                SELECT
                  (SELECT COUNT(*) FROM reactivos) AS total_reactivos,
                  (SELECT COUNT(*) FROM consumibles) AS total_consumibles,
                  (SELECT COUNT(*) FROM equipos) AS total_equipos,
                  (SELECT COUNT(*) FROM muestras) AS total_muestras,
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
                    WHERE fecha_programada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
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
                       OR (fecha_programada < CURDATE() AND estado IN ('programado', 'en_proceso'))
                  ) AS mantenimientos_vencidos
                """
            )
        ).mappings().first()

        recent_movements = db.session.execute(
            text(
                """
                SELECT
                  m.id,
                  m.referencia,
                  m.tipo,
                  m.tabla_origen,
                  m.cantidad,
                  m.motivo,
                  m.fecha_hora,
                  COALESCE(r.nombre, c.producto) AS item_nombre,
                  u.nombre AS usuario
                FROM movimientos m
                LEFT JOIN reactivos r
                  ON m.tabla_origen = 'reactivos' AND r.id = m.id_item
                LEFT JOIN consumibles c
                  ON m.tabla_origen = 'consumibles' AND c.id = m.id_item
                LEFT JOIN usuarios u
                  ON u.id = m.id_usuario
                ORDER BY m.fecha_hora DESC
                LIMIT 8
                """
            )
        ).mappings().all()

        recent_maintenances = db.session.execute(
            text(
                """
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
                """
            )
        ).mappings().all()

        return (
          jsonify(
            {
              "counters": dict(counters or {}),
              "recent_movements": [dict(row) for row in recent_movements],
              "recent_maintenances": [dict(row) for row in recent_maintenances],
            }
          ),
          200,
        )
    except OperationalError:
        return (
            jsonify(
                {
                    "message": "No se pudo consultar la base de datos para el dashboard."
                }
            ),
            503,
        )
