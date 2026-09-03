import jwt
from flask import Blueprint, current_app, g, jsonify, request
from jwt import PyJWKClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.utils.auth import create_access_token, token_required
from app.utils.rbac import ensure_rbac_schema, get_permissions_for_user, get_role_permissions_map
from app.utils.users import ensure_usuarios_schema

auth_bp = Blueprint("auth", __name__)


def _domain_allowed(email: str) -> bool:
    allowed_domain = current_app.config["MICROSOFT_ALLOWED_DOMAIN"].lower()
    return bool(email) and email.lower().endswith(f"@{allowed_domain}")


def _user_query():
    return text(
        """
        SELECT u.id, u.id_rol AS role_id, u.nombre, u.email, u.activo, r.nombre AS rol
        FROM usuarios u
        INNER JOIN roles r ON r.id = u.id_rol
        WHERE LOWER(u.email) = LOWER(:email)
        LIMIT 1
        """
    )


def _issue_session(row):
    if not row["activo"]:
        return jsonify({"message": "Usuario inactivo"}), 403

    db.session.execute(
        text("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = :user_id"),
        {"user_id": row["id"]},
    )
    db.session.commit()

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


def _get_user_by_email(email: str):
    return db.session.execute(_user_query(), {"email": email}).mappings().first()


def _build_microsoft_authority() -> str:
    tenant_id = current_app.config["MICROSOFT_TENANT_ID"]
    return f"https://login.microsoftonline.com/{tenant_id}/v2.0"


def _validate_microsoft_id_token(id_token: str) -> dict:
    authority = _build_microsoft_authority()
    jwks_client = PyJWKClient(f"{authority}/discovery/v2.0/keys")
    signing_key = jwks_client.get_signing_key_from_jwt(id_token)
    return jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=current_app.config["MICROSOFT_CLIENT_ID"],
        issuer=authority,
        options={"require": ["aud", "exp", "iat", "iss", "sub"]},
    )


def _email_from_claims(claims: dict) -> str:
    for key in ("preferred_username", "email", "upn", "unique_name"):
        value = (claims.get(key) or "").strip().lower()
        if "@" in value:
            return value
    return ""


@auth_bp.get("/config")
def auth_config():
    return (
        jsonify(
            {
                "microsoft": {
                    "enabled": current_app.config["MICROSOFT_AUTH_ENABLED"],
                    "clientId": current_app.config["MICROSOFT_CLIENT_ID"],
                    "tenantId": current_app.config["MICROSOFT_TENANT_ID"],
                    "authority": _build_microsoft_authority()
                    if current_app.config["MICROSOFT_AUTH_ENABLED"]
                    else "",
                    "allowedDomain": current_app.config["MICROSOFT_ALLOWED_DOMAIN"],
                },
                "manualLoginEnabled": current_app.config["LOCAL_LOGIN_ENABLED"],
            }
        ),
        200,
    )


@auth_bp.post("/microsoft")
def login_with_microsoft():
    if not current_app.config["MICROSOFT_AUTH_ENABLED"]:
        return jsonify({"message": "Microsoft Entra ID no esta configurado"}), 503

    payload = request.get_json(silent=True) or {}
    id_token = (payload.get("id_token") or "").strip()
    if not id_token:
        return jsonify({"message": "Token de Microsoft requerido"}), 400

    try:
        claims = _validate_microsoft_id_token(id_token)
    except jwt.PyJWTError:
        return jsonify({"message": "No se pudo validar la sesion de Microsoft"}), 401
    except Exception:
        return jsonify({"message": "No se pudo validar Microsoft Entra ID"}), 503

    email = _email_from_claims(claims)
    if not _domain_allowed(email):
        return jsonify({"message": f"Solo se permiten cuentas @{current_app.config['MICROSOFT_ALLOWED_DOMAIN']}"}), 403

    try:
        ensure_usuarios_schema()
        row = _get_user_by_email(email)
    except OperationalError:
        return (
            jsonify(
                {
                    "message": "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite."
                }
            ),
            503,
        )

    if row is None:
        return (
            jsonify(
                {
                    "message": "Tu cuenta pertenece a CICESE, pero todavia no esta dada de alta en FICOTOX."
                }
            ),
            403,
        )

    name = (claims.get("name") or row["nombre"] or email.split("@", 1)[0]).strip()[:100]
    db.session.execute(
        text(
            """
            UPDATE usuarios
            SET nombre = :nombre,
                auth_provider = 'microsoft',
                microsoft_oid = :microsoft_oid,
                microsoft_tid = :microsoft_tid,
                microsoft_preferred_username = :preferred_username
            WHERE id = :user_id
            """
        ),
        {
            "nombre": name,
            "microsoft_oid": claims.get("oid"),
            "microsoft_tid": claims.get("tid"),
            "preferred_username": claims.get("preferred_username"),
            "user_id": row["id"],
        },
    )
    db.session.commit()
    row = _get_user_by_email(email)
    return _issue_session(row)


@auth_bp.post("/login")
def login_with_email():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()

    if not email:
        return jsonify({"message": "El correo es obligatorio"}), 400

    if not current_app.config["LOCAL_LOGIN_ENABLED"]:
        return jsonify({"message": "El acceso local esta desactivado"}), 403

    try:
        ensure_usuarios_schema()
        row = _get_user_by_email(email)
    except OperationalError:
        return (
            jsonify(
                {
                    "message": "No se pudo conectar a la base de datos local. Revisa DATABASE_URL o el archivo SQLite."
                }
            ),
                503,
        )

    if row is None:
        return jsonify({"message": "Usuario no encontrado"}), 404

    return _issue_session(row)


@auth_bp.get("/me")
@token_required
def me():
    ensure_rbac_schema()
    permissions = get_permissions_for_user(g.current_user)
    return jsonify({"user": g.current_user, "permissions": permissions}), 200
