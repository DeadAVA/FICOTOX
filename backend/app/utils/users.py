from sqlalchemy import text

from app.extensions import db
from app.utils.rbac import _bool, ensure_rbac_schema
from app.utils.schema import add_column_if_missing, drop_column_if_exists, is_sqlite


def ensure_usuarios_schema() -> None:
    ensure_rbac_schema()
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nombre VARCHAR(100) NOT NULL,
              email VARCHAR(100) NOT NULL UNIQUE,
              activo INTEGER DEFAULT 1,
              id_rol INTEGER NOT NULL,
              departamento VARCHAR(100) DEFAULT NULL,
              auth_provider VARCHAR(30) DEFAULT NULL,
              microsoft_oid VARCHAR(80) DEFAULT NULL,
              microsoft_tid VARCHAR(80) DEFAULT NULL,
              microsoft_preferred_username VARCHAR(150) DEFAULT NULL,
              creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              ultimo_acceso TIMESTAMP DEFAULT NULL
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS usuarios (
              id INT NOT NULL AUTO_INCREMENT,
              nombre VARCHAR(100) NOT NULL,
              email VARCHAR(100) NOT NULL,
              activo TINYINT(1) DEFAULT 1,
              id_rol INT NOT NULL,
              departamento VARCHAR(100) DEFAULT NULL,
              auth_provider VARCHAR(30) DEFAULT NULL,
              microsoft_oid VARCHAR(80) DEFAULT NULL,
              microsoft_tid VARCHAR(80) DEFAULT NULL,
              microsoft_preferred_username VARCHAR(150) DEFAULT NULL,
              creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
              ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
              PRIMARY KEY (id),
              UNIQUE KEY email (email),
              KEY id_rol (id_rol),
              KEY idx_usuarios_microsoft_oid (microsoft_oid),
              CONSTRAINT usuarios_ibfk_1 FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            """
        )
    )
    drop_column_if_exists("usuarios", "password_hash")
    for column_name, column_definition in [
        ("departamento", "VARCHAR(100) DEFAULT NULL"),
        ("activo", "TINYINT(1) DEFAULT 1"),
        ("auth_provider", "VARCHAR(30) DEFAULT NULL"),
        ("microsoft_oid", "VARCHAR(80) DEFAULT NULL"),
        ("microsoft_tid", "VARCHAR(80) DEFAULT NULL"),
        ("microsoft_preferred_username", "VARCHAR(150) DEFAULT NULL"),
        ("creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
        ("ultimo_acceso", "TIMESTAMP NULL DEFAULT NULL"),
    ]:
        add_column_if_missing("usuarios", column_name, column_definition)

    db.session.commit()


def normalize_user_payload(payload: dict) -> dict:
    email = (payload.get("email") or "").strip().lower()[:100]
    name = (payload.get("nombre") or "").strip()[:100]
    if not name and email:
        name = email.split("@", 1)[0][:100]

    return {
        "nombre": name,
        "email": email,
        "id_rol": int(payload.get("id_rol") or 0),
        "departamento": (payload.get("departamento") or "").strip()[:100] or None,
        "activo": _bool(payload.get("activo", True)),
    }
