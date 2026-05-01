from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

samples_bp = Blueprint("samples", __name__)


@samples_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def samples_summary():
    summary = db.session.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM muestras) AS total_muestras,
              (SELECT COUNT(*) FROM muestras WHERE estado = 'pendiente') AS pendientes,
              (SELECT COUNT(*) FROM muestras WHERE estado = 'en_proceso') AS en_proceso,
              (SELECT COUNT(*) FROM muestras WHERE estado = 'completada') AS completadas
            """
        )
    ).mappings().first()

    return jsonify(dict(summary or {})), 200


@samples_bp.get("/")
@token_required
@permission_required("muestras", "read")
def list_samples():
    rows = db.session.execute(
        text(
            """
            SELECT m.id, m.codigo, m.cliente, m.tipo, m.prioridad, m.estado,
                   m.fecha_ingreso, u.nombre AS analista
            FROM muestras m
            LEFT JOIN usuarios u ON u.id = m.id_analista
            ORDER BY m.fecha_ingreso DESC, m.id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@samples_bp.get("/pending")
@token_required
@permission_required("muestras", "read")
def list_pending_samples():
    rows = db.session.execute(
        text(
            """
            SELECT id, codigo, cliente, tipo, prioridad, estado, fecha_ingreso
            FROM muestras
            WHERE estado IN ('pendiente', 'en_proceso')
            ORDER BY fecha_ingreso ASC
            LIMIT 100
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
