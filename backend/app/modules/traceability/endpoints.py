from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

traceability_bp = Blueprint("traceability", __name__)


@traceability_bp.get("/flow")
@token_required
@permission_required("dashboard", "read")
def flow_status():
    data = db.session.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM muestras) AS muestras_total,
              (SELECT COUNT(*) FROM reactivos_usados) AS enlaces_reactivos,
              (SELECT COUNT(*) FROM equipos_utilizados) AS enlaces_equipos,
              (SELECT COUNT(*) FROM movimientos) AS movimientos_total
            """
        )
    ).mappings().first()

    return jsonify(dict(data or {})), 200


@traceability_bp.get("/recent-events")
@token_required
@permission_required("movimientos", "read")
def recent_events():
    rows = db.session.execute(
        text(
            """
            SELECT referencia, tipo, tabla_origen, id_item, cantidad, fecha_hora
            FROM movimientos
            ORDER BY fecha_hora DESC
            LIMIT 50
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
