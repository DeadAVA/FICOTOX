from flask import Blueprint, g, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import _bool, ensure_rbac_schema, permission_required
from app.utils.schema import add_column_if_missing, drop_column_if_exists, is_sqlite

admin_bp = Blueprint("admin", __name__)


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
              creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY email (email),
              KEY id_rol (id_rol),
              CONSTRAINT usuarios_ibfk_1 FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            """
        )
    )
    drop_column_if_exists("usuarios", "password_hash")
    for column_name, column_definition in [
        ("departamento", "VARCHAR(100) DEFAULT NULL"),
        ("activo", "TINYINT(1) DEFAULT 1"),
        ("creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
        ("ultimo_acceso", "TIMESTAMP NULL DEFAULT NULL"),
    ]:
        add_column_if_missing("usuarios", column_name, column_definition)
    db.session.commit()


def _normalize_user_payload(payload: dict) -> dict:
    return {
        "nombre": (payload.get("nombre") or "").strip()[:100],
        "email": (payload.get("email") or "").strip().lower()[:100],
        "id_rol": int(payload.get("id_rol") or 0),
        "departamento": (payload.get("departamento") or "").strip()[:100] or None,
        "activo": _bool(payload.get("activo", True)),
    }


def _save_role_permissions(role_id: int, permissions: list[dict]) -> None:
    db.session.execute(
        text("DELETE FROM rol_permisos WHERE id_rol = :role_id"),
        {"role_id": role_id},
    )

    for permission in permissions:
        permission_id = permission.get("permiso_id")
        if not permission_id:
            continue

        db.session.execute(
            text(
                """
                INSERT INTO rol_permisos (
                  id_rol, id_permiso, can_read, can_create, can_update, can_delete
                )
                VALUES (
                  :role_id, :permiso_id, :can_read, :can_create, :can_update, :can_delete
                )
                """
            ),
            {
                "role_id": role_id,
                "permiso_id": permission_id,
                "can_read": _bool(permission.get("can_read")),
                "can_create": _bool(permission.get("can_create")),
                "can_update": _bool(permission.get("can_update")),
                "can_delete": _bool(permission.get("can_delete")),
            },
        )


@admin_bp.get("/roles")
@token_required
@permission_required("roles", "read")
def list_roles():
    ensure_rbac_schema()

    rows = db.session.execute(
        text(
            """
            SELECT r.id, r.nombre, r.descripcion, r.es_sistemico, r.activo,
                   COALESCE(u.total_usuarios, 0) AS total_usuarios
            FROM roles r
            LEFT JOIN (
              SELECT id_rol, COUNT(*) AS total_usuarios
              FROM usuarios
              GROUP BY id_rol
            ) u ON u.id_rol = r.id
            ORDER BY id ASC
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@admin_bp.get("/permissions")
@token_required
@permission_required("roles", "read")
def list_permissions():
    ensure_rbac_schema()

    rows = db.session.execute(
        text(
            """
            SELECT id, clave, nombre, descripcion, activo
            FROM permisos
            WHERE activo = 1
            ORDER BY id ASC
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@admin_bp.get("/roles/<int:role_id>")
@token_required
@permission_required("roles", "read")
def get_role_detail(role_id: int):
    ensure_rbac_schema()

    role = db.session.execute(
        text(
            """
            SELECT id, nombre, descripcion, es_sistemico, activo
            FROM roles
            WHERE id = :role_id
            LIMIT 1
            """
        ),
        {"role_id": role_id},
    ).mappings().first()

    if role is None:
        return jsonify({"message": "Rol no encontrado"}), 404

    permissions = db.session.execute(
        text(
            """
            SELECT p.id AS permiso_id, p.clave, p.nombre, p.descripcion,
                   COALESCE(rp.can_read, 0) AS can_read,
                   COALESCE(rp.can_create, 0) AS can_create,
                   COALESCE(rp.can_update, 0) AS can_update,
                   COALESCE(rp.can_delete, 0) AS can_delete
            FROM permisos p
            LEFT JOIN rol_permisos rp
              ON rp.id_permiso = p.id AND rp.id_rol = :role_id
            WHERE p.activo = 1
            ORDER BY p.id ASC
            """
        ),
        {"role_id": role_id},
    ).mappings().all()

    return (
        jsonify(
            {
                "role": dict(role),
                "permissions": [dict(row) for row in permissions],
            }
        ),
        200,
    )


@admin_bp.post("/roles")
@token_required
@permission_required("roles", "create")
def create_role():
    ensure_rbac_schema()

    payload = request.get_json(silent=True) or {}
    nombre = (payload.get("nombre") or "").strip()
    descripcion = (payload.get("descripcion") or "").strip()
    activo = _bool(payload.get("activo", True))
    permissions = payload.get("permissions") or []

    if not nombre:
        return jsonify({"message": "El nombre del rol es obligatorio"}), 400

    duplicate = db.session.execute(
        text("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(:nombre) LIMIT 1"),
        {"nombre": nombre},
    ).scalar()
    if duplicate:
        return jsonify({"message": "Ya existe un rol con ese nombre"}), 409

    try:
        result = db.session.execute(
            text(
                """
                INSERT INTO roles (nombre, descripcion, es_sistemico, activo)
                VALUES (:nombre, :descripcion, 0, :activo)
                """
            ),
            {
                "nombre": nombre,
                "descripcion": descripcion or None,
                "activo": activo,
            },
        )
        role_id = result.lastrowid
        _save_role_permissions(role_id, permissions)
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({"message": "No se pudo crear el rol"}), 500

    return jsonify({"message": "Rol creado", "id": role_id}), 201


@admin_bp.put("/roles/<int:role_id>")
@token_required
@permission_required("roles", "update")
def update_role(role_id: int):
    ensure_rbac_schema()

    role = db.session.execute(
        text("SELECT id, es_sistemico FROM roles WHERE id = :role_id LIMIT 1"),
        {"role_id": role_id},
    ).mappings().first()
    if role is None:
        return jsonify({"message": "Rol no encontrado"}), 404

    payload = request.get_json(silent=True) or {}
    nombre = (payload.get("nombre") or "").strip()
    descripcion = (payload.get("descripcion") or "").strip()
    activo = _bool(payload.get("activo", True))
    permissions = payload.get("permissions") or []

    if not nombre:
        return jsonify({"message": "El nombre del rol es obligatorio"}), 400

    duplicate = db.session.execute(
        text(
            """
            SELECT id FROM roles
            WHERE LOWER(nombre) = LOWER(:nombre)
              AND id <> :role_id
            LIMIT 1
            """
        ),
        {"nombre": nombre, "role_id": role_id},
    ).scalar()
    if duplicate:
        return jsonify({"message": "Ya existe un rol con ese nombre"}), 409

    db.session.execute(
        text(
            """
            UPDATE roles
            SET nombre = :nombre,
                descripcion = :descripcion,
                activo = :activo
            WHERE id = :role_id
            """
        ),
        {
            "nombre": nombre,
            "descripcion": descripcion or None,
            "activo": activo,
            "role_id": role_id,
        },
    )
    _save_role_permissions(role_id, permissions)
    db.session.commit()

    return jsonify({"message": "Rol actualizado"}), 200


@admin_bp.delete("/roles/<int:role_id>")
@token_required
@permission_required("roles", "delete")
def delete_role(role_id: int):
    ensure_rbac_schema()

    role = db.session.execute(
        text(
            """
            SELECT id, es_sistemico
            FROM roles
            WHERE id = :role_id
            LIMIT 1
            """
        ),
        {"role_id": role_id},
    ).mappings().first()

    if role is None:
        return jsonify({"message": "Rol no encontrado"}), 404

    if role["es_sistemico"]:
        return jsonify({"message": "No se puede eliminar un rol sistemico"}), 403

    used_by_users = db.session.execute(
        text("SELECT COUNT(*) FROM usuarios WHERE id_rol = :role_id"),
        {"role_id": role_id},
    ).scalar() or 0
    if used_by_users > 0:
        return (
            jsonify(
                {
                    "message": "No se puede eliminar el rol porque tiene usuarios asignados"
                }
            ),
            409,
        )

    db.session.execute(
        text("DELETE FROM rol_permisos WHERE id_rol = :role_id"),
        {"role_id": role_id},
    )
    db.session.execute(
        text("DELETE FROM roles WHERE id = :role_id"),
        {"role_id": role_id},
    )
    db.session.commit()

    return jsonify({"message": "Rol eliminado"}), 200


@admin_bp.get("/usuarios")
@token_required
@permission_required("usuarios", "read")
def list_usuarios():
    ensure_usuarios_schema()

    rows = db.session.execute(
        text(
            """
            SELECT u.id, u.nombre, u.email, u.activo, u.id_rol, r.nombre AS rol,
                   u.departamento, u.creado_en, u.ultimo_acceso
            FROM usuarios u
            LEFT JOIN roles r ON r.id = u.id_rol
            ORDER BY u.id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@admin_bp.get("/usuarios/<int:user_id>")
@token_required
@permission_required("usuarios", "read")
def get_usuario(user_id: int):
    ensure_usuarios_schema()
    row = db.session.execute(
        text(
            """
            SELECT u.id, u.nombre, u.email, u.activo, u.id_rol, r.nombre AS rol,
                   u.departamento, u.creado_en, u.ultimo_acceso
            FROM usuarios u
            LEFT JOIN roles r ON r.id = u.id_rol
            WHERE u.id = :user_id
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).mappings().first()
    if row is None:
        return jsonify({"message": "Usuario no encontrado"}), 404
    return jsonify({"item": dict(row)}), 200


@admin_bp.post("/usuarios")
@token_required
@permission_required("usuarios", "create")
def create_usuario():
    ensure_usuarios_schema()
    data = _normalize_user_payload(request.get_json(silent=True) or {})

    if not data["nombre"]:
        return jsonify({"message": "El nombre es obligatorio"}), 400
    if not data["email"]:
        return jsonify({"message": "El email es obligatorio"}), 400
    if not data["id_rol"]:
        return jsonify({"message": "Selecciona un rol"}), 400

    role_exists = db.session.execute(
        text("SELECT id FROM roles WHERE id = :id_rol LIMIT 1"),
        {"id_rol": data["id_rol"]},
    ).scalar()
    if not role_exists:
        return jsonify({"message": "El rol seleccionado no existe"}), 400

    try:
        result = db.session.execute(
            text(
                """
                INSERT INTO usuarios (nombre, email, activo, id_rol, departamento)
                VALUES (:nombre, :email, :activo, :id_rol, :departamento)
                """
            ),
            data,
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe un usuario con ese email"}), 409

    return jsonify({"message": "Usuario creado", "id": result.lastrowid}), 201


@admin_bp.put("/usuarios/<int:user_id>")
@token_required
@permission_required("usuarios", "update")
def update_usuario(user_id: int):
    ensure_usuarios_schema()
    data = _normalize_user_payload(request.get_json(silent=True) or {})

    if not data["nombre"]:
        return jsonify({"message": "El nombre es obligatorio"}), 400
    if not data["email"]:
        return jsonify({"message": "El email es obligatorio"}), 400
    if not data["id_rol"]:
        return jsonify({"message": "Selecciona un rol"}), 400

    role_exists = db.session.execute(
        text("SELECT id FROM roles WHERE id = :id_rol LIMIT 1"),
        {"id_rol": data["id_rol"]},
    ).scalar()
    if not role_exists:
        return jsonify({"message": "El rol seleccionado no existe"}), 400

    try:
        result = db.session.execute(
            text(
                """
                UPDATE usuarios
                SET nombre = :nombre,
                    email = :email,
                    activo = :activo,
                    id_rol = :id_rol,
                    departamento = :departamento
                WHERE id = :user_id
                """
            ),
            {**data, "user_id": user_id},
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe un usuario con ese email"}), 409

    if result.rowcount == 0:
        return jsonify({"message": "Usuario no encontrado"}), 404
    return jsonify({"message": "Usuario actualizado"}), 200


@admin_bp.delete("/usuarios/<int:user_id>")
@token_required
@permission_required("usuarios", "delete")
def delete_usuario(user_id: int):
    ensure_usuarios_schema()
    current_user = getattr(g, "current_user", {}) or {}
    if str(current_user.get("sub")) == str(user_id):
        return jsonify({"message": "No puedes eliminar tu propio usuario activo"}), 403

    try:
        result = db.session.execute(text("DELETE FROM usuarios WHERE id = :user_id"), {"user_id": user_id})
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "No se puede eliminar porque el usuario tiene registros relacionados"}), 409

    if result.rowcount == 0:
        return jsonify({"message": "Usuario no encontrado"}), 404
    return jsonify({"message": "Usuario eliminado"}), 200
