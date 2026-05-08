from flask import Blueprint, jsonify
from sqlalchemy import text

from app.extensions import db
from app.modules.samples.extraccion import ensure_samples_extraccion_schema
from app.modules.samples.procesamiento import ensure_samples_procesamiento_schema
from app.modules.samples.recepcion import ensure_samples_recepcion_schema
from app.utils.auth import token_required
from app.utils.rbac import permission_required

samples_bp = Blueprint("samples", __name__)


@samples_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def samples_summary():
    ensure_samples_recepcion_schema()
    ensure_samples_procesamiento_schema()
    ensure_samples_extraccion_schema()
    summary = db.session.execute(
        text(
            """
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
            """
        )
    ).mappings().first()

    return jsonify(dict(summary or {})), 200


@samples_bp.get("/")
@token_required
@permission_required("muestras", "read")
def list_samples():
    ensure_samples_recepcion_schema()
    ensure_samples_procesamiento_schema()
    ensure_samples_extraccion_schema()
    rows = db.session.execute(
        text(
            """
            SELECT id, codigo, cliente, tipo, prioridad, estado, fecha_ingreso, analista
            FROM (
              SELECT id, 'R-' || printf('%07d', folio_num) AS codigo, solicitante AS cliente,
                     'Recepcion' AS tipo, '-' AS prioridad, estado, fecha_recepcion AS fecha_ingreso,
                     NULL AS analista
              FROM muestras_recepcion
              UNION ALL
              SELECT id, 'P-' || printf('%07d', folio_num) AS codigo, id_interno AS cliente,
                     'Procesamiento' AS tipo, '-' AS prioridad, estado, fecha_procesamiento AS fecha_ingreso,
                     nombre_quien_proceso AS analista
              FROM muestras_procesamiento
              UNION ALL
              SELECT id, 'E-A-' || printf('%07d', folio_num) AS codigo, id_interno AS cliente,
                     'Extraccion' AS tipo, '-' AS prioridad, estado, fecha_extraccion AS fecha_ingreso,
                     nombre_quien_extrajo AS analista
              FROM muestras_extraccion
            ) m
            ORDER BY fecha_ingreso DESC, id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@samples_bp.get("/pending")
@token_required
@permission_required("muestras", "read")
def list_pending_samples():
    ensure_samples_recepcion_schema()
    ensure_samples_procesamiento_schema()
    ensure_samples_extraccion_schema()
    rows = db.session.execute(
        text(
            """
            SELECT id, codigo, cliente, tipo, prioridad, estado, fecha_ingreso
            FROM (
              SELECT id, 'R-' || printf('%07d', folio_num) AS codigo, solicitante AS cliente,
                     'Recepcion' AS tipo, '-' AS prioridad, estado, fecha_recepcion AS fecha_ingreso
              FROM muestras_recepcion
              UNION ALL
              SELECT id, 'P-' || printf('%07d', folio_num) AS codigo, id_interno AS cliente,
                     'Procesamiento' AS tipo, '-' AS prioridad, estado, fecha_procesamiento AS fecha_ingreso
              FROM muestras_procesamiento
              UNION ALL
              SELECT id, 'E-A-' || printf('%07d', folio_num) AS codigo, id_interno AS cliente,
                     'Extraccion' AS tipo, '-' AS prioridad, estado, fecha_extraccion AS fecha_ingreso
              FROM muestras_extraccion
            ) m
            WHERE estado IN ('pendiente', 'en_proceso', 'registrada')
            ORDER BY fecha_ingreso ASC
            LIMIT 100
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
