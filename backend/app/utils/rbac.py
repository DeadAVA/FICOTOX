from functools import wraps

from flask import g, jsonify
from sqlalchemy import text

from app.extensions import db

DEFAULT_PERMISSIONS = [
    ("dashboard", "Dashboard", "Acceso al panel principal"),
    ("reactivos", "Reactivos", "Gestion de catalogo de reactivos"),
    ("consumibles", "Consumibles", "Gestion de consumibles"),
    ("equipos", "Equipos", "Gestion de equipos"),
    ("muestras", "Muestras", "Gestion de muestras"),
    ("movimientos", "Movimientos", "Gestion de movimientos de inventario"),
    ("mantenimiento", "Mantenimiento", "Gestion de mantenimientos"),
    ("documentos", "Documentos SGC", "Gestion documental"),
    ("roles", "Roles", "Administracion de roles y permisos"),
    ("usuarios", "Usuarios", "Administracion de usuarios"),
]


def _bool(value) -> int:
    return 1 if bool(value) else 0


def ensure_rbac_schema() -> None:
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS permisos (
              id INT NOT NULL AUTO_INCREMENT,
              clave VARCHAR(80) NOT NULL,
              nombre VARCHAR(120) NOT NULL,
              descripcion TEXT,
              activo TINYINT(1) NOT NULL DEFAULT 1,
              PRIMARY KEY (id),
              UNIQUE KEY uk_permisos_clave (clave)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
    )

    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rol_permisos (
              id INT NOT NULL AUTO_INCREMENT,
              id_rol INT NOT NULL,
              id_permiso INT NOT NULL,
              can_read TINYINT(1) NOT NULL DEFAULT 0,
              can_create TINYINT(1) NOT NULL DEFAULT 0,
              can_update TINYINT(1) NOT NULL DEFAULT 0,
              can_delete TINYINT(1) NOT NULL DEFAULT 0,
              PRIMARY KEY (id),
              UNIQUE KEY uk_rol_permiso (id_rol, id_permiso),
              CONSTRAINT fk_rol_permisos_rol
                FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE,
              CONSTRAINT fk_rol_permisos_permiso
                FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
    )

    for clave, nombre, descripcion in DEFAULT_PERMISSIONS:
        db.session.execute(
            text(
                """
                INSERT INTO permisos (clave, nombre, descripcion, activo)
                VALUES (:clave, :nombre, :descripcion, 1)
                ON DUPLICATE KEY UPDATE
                  nombre = VALUES(nombre),
                  descripcion = VALUES(descripcion)
                """
            ),
            {
                "clave": clave,
                "nombre": nombre,
                "descripcion": descripcion,
            },
        )

    permission_rows = db.session.execute(
        text("SELECT id, clave FROM permisos WHERE activo = 1")
    ).mappings().all()
    permission_ids = [row["id"] for row in permission_rows]

    roles = db.session.execute(
        text("SELECT id, nombre, es_sistemico FROM roles")
    ).mappings().all()

    for role in roles:
        has_permissions = db.session.execute(
            text("SELECT COUNT(*) FROM rol_permisos WHERE id_rol = :role_id"),
            {"role_id": role["id"]},
        ).scalar() or 0

        if has_permissions > 0:
            continue

        role_name = (role.get("nombre") or "").strip().lower()
        is_admin_like = role_name in {
            "superadmin",
            "admin",
            "administrador",
            "direccion",
        } or bool(role.get("es_sistemico"))

        for permission_id in permission_ids:
            db.session.execute(
                text(
                    """
                    INSERT INTO rol_permisos (
                      id_rol, id_permiso, can_read, can_create, can_update, can_delete
                    )
                    VALUES (
                      :id_rol, :id_permiso, :can_read, :can_create, :can_update, :can_delete
                    )
                    """
                ),
                {
                    "id_rol": role["id"],
                    "id_permiso": permission_id,
                    "can_read": 1,
                    "can_create": _bool(is_admin_like),
                    "can_update": _bool(is_admin_like),
                    "can_delete": _bool(is_admin_like),
                },
            )

    db.session.commit()


def _resolve_role_id(user: dict) -> int | None:
    role_id = user.get("role_id")
    if role_id is not None:
        return int(role_id)

    role_name = (user.get("rol") or "").strip()
    if not role_name:
        return None

    row = db.session.execute(
        text("SELECT id FROM roles WHERE nombre = :nombre LIMIT 1"),
        {"nombre": role_name},
    ).mappings().first()
    if row is None:
        return None

    user["role_id"] = row["id"]
    return int(row["id"])


def get_role_permissions_map(role_id: int | None) -> dict:
    if role_id is None:
        return {}

    rows = db.session.execute(
        text(
            """
            SELECT p.clave,
                   rp.can_read,
                   rp.can_create,
                   rp.can_update,
                   rp.can_delete
            FROM rol_permisos rp
            INNER JOIN permisos p ON p.id = rp.id_permiso
            WHERE rp.id_rol = :role_id
              AND p.activo = 1
            """
        ),
        {"role_id": role_id},
    ).mappings().all()

    result = {}
    for row in rows:
        result[row["clave"]] = {
            "read": bool(row["can_read"]),
            "create": bool(row["can_create"]),
            "update": bool(row["can_update"]),
            "delete": bool(row["can_delete"]),
        }
    return result


def get_permissions_for_user(user: dict | None) -> dict:
    if not user:
        return {}
    role_id = _resolve_role_id(user)
    return get_role_permissions_map(role_id)


def permission_required(module_key: str, action: str = "read"):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                return jsonify({"message": "Token requerido"}), 401

            ensure_rbac_schema()
            role_id = _resolve_role_id(user)
            permissions_map = get_role_permissions_map(role_id)

            module_permissions = permissions_map.get(module_key, {})
            allowed = bool(module_permissions.get(action, False))
            if not allowed:
                return (
                    jsonify(
                        {
                            "message": f"Permiso denegado para {module_key}:{action}",
                            "required": {"module": module_key, "action": action},
                        }
                    ),
                    403,
                )

            g.current_permissions = permissions_map
            return view_func(*args, **kwargs)

        return wrapper

    return decorator
