from flask import Blueprint, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import _bool, ensure_rbac_schema, permission_required

admin_bp = Blueprint("admin", __name__)


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
    ensure_rbac_schema()

    rows = db.session.execute(
        text(
            """
            SELECT u.id, u.nombre, u.email, u.activo, r.nombre AS rol,
                   u.departamento, u.creado_en
            FROM usuarios u
            LEFT JOIN roles r ON r.id = u.id_rol
            ORDER BY u.id DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200
