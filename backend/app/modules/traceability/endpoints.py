from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.modules.samples.extraccion import ensure_samples_extraccion_schema
from app.modules.samples.procesamiento import ensure_samples_procesamiento_schema
from app.modules.samples.recepcion import ensure_samples_recepcion_schema
from app.utils.auth import token_required
from app.utils.inventory_usage import ensure_movimientos_schema
from app.utils.rbac import permission_required

traceability_bp = Blueprint("traceability", __name__)


@traceability_bp.get("/flow")
@token_required
@permission_required("dashboard", "read")
def flow_status():
    ensure_samples_recepcion_schema()
    ensure_samples_procesamiento_schema()
    ensure_samples_extraccion_schema()
    ensure_movimientos_schema()
    data = db.session.execute(
        text(
            """
            SELECT
              (
                (SELECT COUNT(*) FROM muestras_recepcion) +
                (SELECT COUNT(*) FROM muestras_procesamiento) +
                (SELECT COUNT(*) FROM muestras_extraccion)
              ) AS muestras_total,
              (SELECT COUNT(*) FROM movimientos WHERE tabla_origen = 'reactivos') AS enlaces_reactivos,
              0 AS enlaces_equipos,
              (SELECT COUNT(*) FROM movimientos) AS movimientos_total
            """
        )
    ).mappings().first()

    return jsonify(dict(data or {})), 200


@traceability_bp.get("/recent-events")
@token_required
@permission_required("movimientos", "read")
def recent_events():
    ensure_movimientos_schema()
    rows = db.session.execute(
        text(
            """
            SELECT referencia, tipo, tabla_origen, id_item, cantidad, creado_en AS fecha_hora
            FROM movimientos
            ORDER BY creado_en DESC
            LIMIT 50
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
