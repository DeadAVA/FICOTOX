from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from sqlalchemy import text
from werkzeug.utils import secure_filename

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required
from app.utils.schema import is_sqlite

documents_bp = Blueprint("documents", __name__)


def _reports_upload_dir() -> Path:
    folder = Path(current_app.instance_path) / "maintenance_reports"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def ensure_reportes_mantenimiento_schema():
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS reportes_mantenimiento (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo VARCHAR(50) NOT NULL UNIQUE,
                id_mantenimiento INTEGER NOT NULL,
                version VARCHAR(20) NOT NULL,
                estado VARCHAR(40) DEFAULT 'borrador',
                id_responsable INTEGER DEFAULT NULL,
                fecha_reporte DATE NOT NULL,
                archivo_url TEXT,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS reportes_mantenimiento (
                id INT NOT NULL AUTO_INCREMENT,
                codigo VARCHAR(50) NOT NULL,
                id_mantenimiento INT NOT NULL,
                version VARCHAR(20) NOT NULL,
                estado ENUM('borrador','en_revision','aprobado','publicado') DEFAULT 'borrador',
                id_responsable INT DEFAULT NULL,
                fecha_reporte DATE NOT NULL,
                archivo_url TEXT,
                creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY codigo (codigo),
                KEY id_mantenimiento (id_mantenimiento),
                KEY id_responsable (id_responsable)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            """
        )
    )
    db.session.commit()


def _next_report_code(mantenimiento_id: int) -> str:
    count = db.session.execute(
        text("SELECT COUNT(*) FROM reportes_mantenimiento WHERE id_mantenimiento = :id"),
        {"id": mantenimiento_id},
    ).scalar() or 0
    return f"RM-{mantenimiento_id:05d}-{int(count) + 1:02d}"


@documents_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def documents_summary():
    ensure_reportes_mantenimiento_schema()
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
    ensure_reportes_mantenimiento_schema()
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


@documents_bp.post("/maintenance-report")
@token_required
@permission_required("documentos", "create")
def create_maintenance_report():
    ensure_reportes_mantenimiento_schema()
    file = request.files.get("archivo")
    if not file:
        return jsonify({"message": "Adjunta un archivo PDF"}), 400
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"message": "El documento debe ser PDF"}), 400

    mantenimiento_id = request.form.get("id_mantenimiento", type=int)
    if not mantenimiento_id:
        return jsonify({"message": "Falta el mantenimiento vinculado"}), 400

    maintenance_exists = db.session.execute(
        text("SELECT id FROM mantenimientos WHERE id = :id LIMIT 1"),
        {"id": mantenimiento_id},
    ).first()
    if not maintenance_exists:
        return jsonify({"message": "Mantenimiento no encontrado"}), 404

    filename = secure_filename(file.filename) or "reporte.pdf"
    stored_name = f"{uuid4().hex}_{filename}"
    file.save(_reports_upload_dir() / stored_name)

    codigo = request.form.get("codigo") or _next_report_code(mantenimiento_id)
    version = request.form.get("version") or "1.0"
    estado = request.form.get("estado") or "publicado"
    fecha_reporte = request.form.get("fecha_reporte")
    if not fecha_reporte:
        return jsonify({"message": "La fecha del reporte es obligatoria"}), 400

    archivo_url = f"/api/documents/files/{stored_name}"
    result = db.session.execute(
        text(
            """
            INSERT INTO reportes_mantenimiento (
              codigo, id_mantenimiento, version, estado, fecha_reporte, archivo_url
            )
            VALUES (
              :codigo, :id_mantenimiento, :version, :estado, :fecha_reporte, :archivo_url
            )
            """
        ),
        {
            "codigo": codigo,
            "id_mantenimiento": mantenimiento_id,
            "version": version,
            "estado": estado,
            "fecha_reporte": fecha_reporte,
            "archivo_url": archivo_url,
        },
    )
    db.session.commit()
    return jsonify({"message": "Reporte PDF registrado", "id": result.lastrowid, "archivo_url": archivo_url}), 201


@documents_bp.get("/files/<path:filename>")
@token_required
@permission_required("documentos", "read")
def get_document_file(filename: str):
    return send_from_directory(_reports_upload_dir(), filename, as_attachment=False)
