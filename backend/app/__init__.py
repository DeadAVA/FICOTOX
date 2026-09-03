import logging
import os
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import Config
from app.extensions import cors, db
from app.utils.rbac import ensure_rbac_schema

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    app.json.ensure_ascii = False

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app.modules.admin.endpoints import admin_bp
    from app.modules.auth.endpoints import auth_bp
    from app.modules.dashboard.endpoints import dashboard_bp
    from app.modules.documents.endpoints import documents_bp
    from app.modules.inventory.endpoints import inventory_bp
    from app.modules.samples.extraccion import ensure_samples_extraccion_schema, samples_extraccion_bp
    from app.modules.samples.procesamiento import ensure_samples_procesamiento_schema, samples_procesamiento_bp
    from app.modules.samples.endpoints import samples_bp
    from app.modules.samples.recepcion import ensure_samples_recepcion_schema, samples_recepcion_bp
    from app.modules.traceability.endpoints import traceability_bp
    from app.modules.inventory.consumables import bp as consumables_bp
    from app.modules.inventory.consumables import ensure_consumibles_schema
    from app.modules.inventory.endpoints import ensure_equipos_schema, ensure_mantenimientos_schema, ensure_reactivos_schema
    from app.utils.inventory_usage import ensure_movimientos_schema
    from app.utils.users import ensure_usuarios_schema

    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(samples_bp, url_prefix="/api/samples")
    app.register_blueprint(samples_recepcion_bp)
    app.register_blueprint(samples_procesamiento_bp)
    app.register_blueprint(samples_extraccion_bp)
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(traceability_bp, url_prefix="/api/traceability")
    app.register_blueprint(consumables_bp)

    try:
        with app.app_context():
            # Pseudocodigo:
            # 1. Asegurar esquemas base y permisos.
            # 2. Asegurar tablas operativas por modulo.
            # 3. Confirmar cambios en una sola transaccion de arranque.
            ensure_rbac_schema()
            ensure_usuarios_schema()
            ensure_samples_recepcion_schema()
            ensure_samples_procesamiento_schema()
            ensure_samples_extraccion_schema()
            ensure_reactivos_schema()
            ensure_consumibles_schema()
            ensure_equipos_schema()
            ensure_mantenimientos_schema()
            ensure_movimientos_schema()
            db.session.commit()
    except Exception as exc:
        db.session.rollback()
        # No detenemos el arranque para que /api/health/db pueda reportar el problema,
        # pero si dejamos la causa en logs para diagnostico real.
        logger.exception("No se pudieron asegurar los esquemas iniciales: %s", exc)

    @app.get("/api/health")
    def health_check():
        return jsonify({"ok": True, "service": "ficotox-backend"}), 200

    @app.get("/api/health/db")
    def health_db_check():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify({"ok": True, "database": "reachable"}), 200
        except OperationalError:
            return (
                jsonify(
                    {
                        "ok": False,
                        "database": "unreachable",
                        "message": "No se pudo conectar a la base de datos local. Revisa backend/.env o permisos del archivo SQLite.",
                    }
                ),
                503,
            )

    frontend_dir = Path(
        os.getenv("FICOTOX_FRONTEND_DIR", str(Path(app.root_path).parent.parent / "frontend"))
    )

    @app.get("/")
    def serve_frontend_index():
        return send_from_directory(frontend_dir, "index.html")

    @app.get("/<path:filename>")
    def serve_frontend_assets(filename: str):
        file_path = frontend_dir / filename
        if file_path.exists() and file_path.is_file():
            return send_from_directory(frontend_dir, filename)

        return jsonify({"message": "Ruta no encontrada"}), 404

    return app
