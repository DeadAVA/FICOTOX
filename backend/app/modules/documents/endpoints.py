from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

documents_bp = Blueprint("documents", __name__)


@documents_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def documents_summary():
    summary = db.session.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM reportes_mantenimiento) AS total_documentos,
              (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'borrador') AS borrador,
              (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'en_revision') AS en_revision,
              (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'aprobado') AS aprobados,
              (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'publicado') AS publicados
            """
        )
    ).mappings().first()

    return jsonify(dict(summary or {})), 200


@documents_bp.get("/")
@token_required
@permission_required("documentos", "read")
def list_documents():
    rows = db.session.execute(
        text(
            """
            SELECT rm.id, rm.codigo, rm.version, rm.estado, rm.fecha_reporte,
                   rm.archivo_url, m.tipo AS tipo_mantenimiento
            FROM reportes_mantenimiento rm
            LEFT JOIN mantenimientos m ON m.id = rm.id_mantenimiento
            ORDER BY rm.fecha_reporte DESC, rm.id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
