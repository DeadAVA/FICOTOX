from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request


def create_access_token(payload: dict) -> str:
    """Crea un JWT firmado con expiracion configurable."""
    expire_at = datetime.now(timezone.utc) + timedelta(
        hours=current_app.config["JWT_EXPIRES_HOURS"]
    )

    body = {
        **payload,
        "exp": expire_at,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(body, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def token_required(view_func):
    """Protege endpoints que requieren usuario autenticado.

    Pseudocodigo:
    1. Leer header Authorization.
    2. Validar formato Bearer.
    3. Decodificar JWT y manejar expiracion/token invalido.
    4. Exponer usuario actual en flask.g para RBAC y auditoria.
    """
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"message": "Token requerido"}), 401

        token = auth_header.replace("Bearer ", "", 1).strip()
        if not token:
            return jsonify({"message": "Token requerido"}), 401

        try:
            g.current_user = decode_access_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token invalido"}), 401

        return view_func(*args, **kwargs)

    return wrapper
