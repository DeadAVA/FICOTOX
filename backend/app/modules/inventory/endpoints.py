from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

inventory_bp = Blueprint("inventory", __name__)


@inventory_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def inventory_summary():
    summary = db.session.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM reactivos) AS total_reactivos,
              (SELECT COUNT(*) FROM consumibles) AS total_consumibles,
              (SELECT COUNT(*) FROM equipos) AS total_equipos,
              (
                SELECT COUNT(*)
                FROM reactivos
                WHERE cantidad_actual <= stock_minimo
              ) AS reactivos_stock_bajo,
              (
                -- CORRECCIÓN: consumibles no tiene 'cantidad_actual' ni 'stock_minimo'
                -- Usamos 'piezas <= 5' como un ejemplo de stock bajo temporal.
                SELECT COUNT(*)
                FROM consumibles
                WHERE piezas <= 5 
              ) AS consumibles_stock_bajo,
              (
                SELECT COUNT(*)
                FROM equipos
                WHERE estado = 'calibracion_pendiente'
              ) AS equipos_calibracion_pendiente
            """
        )
    ).mappings().first()

    return jsonify(dict(summary or {})), 200


@inventory_bp.get("/reactivos")
@token_required
@permission_required("reactivos", "read")
def list_reactivos():
    rows = db.session.execute(
        text(
            """
            SELECT id, nombre, numero_cas, categoria, cantidad_actual, unidad,
                   ubicacion, fecha_vencimiento, stock_minimo
            FROM reactivos
            ORDER BY nombre ASC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/equipos")
@token_required
@permission_required("equipos", "read")
def list_equipos():
    rows = db.session.execute(
        text(
            """
            SELECT id, nombre, marca, modelo, numero_serie, ubicacion,
                   fecha_prox_calibracion, estado
            FROM equipos
            ORDER BY nombre ASC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/consumibles")
@token_required
@permission_required("consumibles", "read")
def list_consumibles():
    # CORRECCIÓN: Usar los campos reales de la tabla consumibles
    rows = db.session.execute(
        text(
            """
            SELECT id, producto, marca, proveedor, catalogo_parte_cas, 
                   fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza
            FROM consumibles
            ORDER BY producto ASC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/movimientos")
@token_required
@permission_required("movimientos", "read")
def list_movimientos():
    rows = db.session.execute(
        text(
            """
            SELECT id, referencia, tipo, tabla_origen, id_item, cantidad, motivo, fecha_hora
            FROM movimientos
            ORDER BY fecha_hora DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/mantenimientos")
@token_required
@permission_required("mantenimiento", "read")
def list_mantenimientos():
    rows = db.session.execute(
        text(
            """
            SELECT mt.id, mt.tipo, mt.fecha_programada, mt.estado, mt.observaciones,
                   e.nombre AS equipo, u.nombre AS responsable
            FROM mantenimientos mt
            LEFT JOIN equipos e ON e.id = mt.id_equipo
            LEFT JOIN usuarios u ON u.id = mt.id_responsable
            ORDER BY mt.fecha_programada ASC, mt.id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200