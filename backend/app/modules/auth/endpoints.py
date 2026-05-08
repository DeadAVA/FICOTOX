from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.utils.auth import create_access_token, token_required
from app.utils.rbac import ensure_rbac_schema, get_permissions_for_user, get_role_permissions_map

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login_with_email():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()

    if not email:
        return jsonify({"message": "El correo es obligatorio"}), 400

    user_query = text(
        """
        SELECT u.id, u.id_rol AS role_id, u.nombre, u.email, u.activo, r.nombre AS rol
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.id_rol
        WHERE u.email = :email
        LIMIT 1
        """
    )
    try:
        row = db.session.execute(user_query, {"email": email}).mappings().first()
    except OperationalError:
        return (
            jsonify(
                {
                    "message": "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite."
                }
            ),
            503,
        )

    if row is None and current_app.config["AUTH_AUTO_REGISTER"]:
        try:
            users_count = db.session.execute(text("SELECT COUNT(*) FROM usuarios")).scalar() or 0
            base_role_name = "Super Admin" if users_count == 0 else "Consulta"
            role_row = db.session.execute(
                text("SELECT id FROM roles WHERE nombre = :role_name LIMIT 1"),
                {"role_name": base_role_name},
            ).mappings().first()
        except OperationalError:
            return (
                jsonify(
                    {
                        "message": "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite."
                    }
                ),
                503,
            )

        if role_row is None:
            db.session.execute(
                text(
                    """
                    INSERT INTO roles (nombre, descripcion, es_sistemico, activo)
                    VALUES (:role_name, :descripcion, :es_sistemico, 1)
                    """
                ),
                {
                    "role_name": base_role_name,
                    "descripcion": "Acceso total inicial" if base_role_name == "Super Admin" else "Rol base de solo lectura",
                    "es_sistemico": 1 if base_role_name == "Super Admin" else 0,
                },
            )
            db.session.commit()
            role_row = db.session.execute(
                text("SELECT id FROM roles WHERE nombre = :role_name LIMIT 1"),
                {"role_name": base_role_name},
            ).mappings().first()

        if role_row is None:
            return jsonify({"message": f"No existe el rol base {base_role_name}"}), 500

        cols = ["nombre", "email", "id_rol", "activo"]
        vals = [":nombre", ":email", ":id_rol", "1"]
        params = {
            "nombre": email.split("@")[0],
            "email": email,
            "id_rol": role_row["id"],
        }

        insert_sql = f"INSERT INTO usuarios ({', '.join(cols)}) VALUES ({', '.join(vals)})"
        db.session.execute(text(insert_sql), params)
        db.session.commit()
        row = db.session.execute(user_query, {"email": email}).mappings().first()

    if row is None:
        return jsonify({"message": "Usuario no encontrado"}), 404

    if not row["activo"]:
        return jsonify({"message": "Usuario inactivo"}), 403

    token = create_access_token(
        {
            "sub": str(row["id"]),
            "role_id": row["role_id"],
            "email": row["email"],
            "nombre": row["nombre"],
            "rol": row["rol"],
        }
    )

    ensure_rbac_schema()
    permissions = get_role_permissions_map(row["role_id"])

    return (
        jsonify(
            {
                "token": token,
                "user": {
                    "id": row["id"],
                    "role_id": row["role_id"],
                    "nombre": row["nombre"],
                    "email": row["email"],
                    "rol": row["rol"],
                },
                "permissions": permissions,
            }
        ),
        200,
    )


@auth_bp.get("/me")
@token_required
def me():
    ensure_rbac_schema()
    permissions = get_permissions_for_user(g.current_user)
    return jsonify({"user": g.current_user, "permissions": permissions}), 200
