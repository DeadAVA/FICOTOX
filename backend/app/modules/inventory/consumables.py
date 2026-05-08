from flask import Blueprint, g, jsonify, request
from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required
from sqlalchemy.sql import text
import csv
import io

bp = Blueprint("consumables", __name__, url_prefix="/api/consumables")


def ensure_consumibles_schema():
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS consumibles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto VARCHAR(180) NOT NULL,
                marca VARCHAR(120) DEFAULT NULL,
                proveedor VARCHAR(180) DEFAULT NULL,
                catalogo_parte_cas VARCHAR(180) DEFAULT NULL,
                fecha_ingreso DATE DEFAULT NULL,
                tamano_capacidad VARCHAR(120) DEFAULT NULL,
                contenedor VARCHAR(120) DEFAULT NULL,
                piezas INTEGER DEFAULT 0,
                cantidad_por_pieza INTEGER DEFAULT NULL,
                creado_por INTEGER DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    )
    db.session.commit()


def _to_int_or_none(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_payload(raw):
    data = raw or {}
    return {
        "producto": (data.get("producto") or "").strip(),
        "marca": (data.get("marca") or None),
        "proveedor": (data.get("proveedor") or None),
        "catalogo_parte_cas": (data.get("catalogo_parte_cas") or None),
        "fecha_ingreso": (data.get("fecha_ingreso") or None),
        "tamano_capacidad": (data.get("tamano_capacidad") or None),
        "contenedor": (data.get("contenedor") or None),
        "piezas": _to_int_or_none(data.get("piezas")),
        "cantidad_por_pieza": _to_int_or_none(data.get("cantidad_por_pieza")),
    }


def _normalize_key(key: str) -> str:
    if key is None:
        return ""
    normalized = str(key).strip().lower().replace("\ufeff", "")
    normalized = (
        normalized.replace("á", "a").replace("é", "e").replace("í", "i")
        .replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    )
    for ch in (" ", "#", "/", ".", "-"):
        normalized = normalized.replace(ch, "_")
    while "__" in normalized:
        normalized = normalized.replace("__", "_")
    return normalized.strip("_")


def _canonicalize_row_keys(row: dict) -> dict:
    aliases = {
        "producto": "producto",
        "marca": "marca",
        "proveedor": "proveedor",
        "catalogo_parte_cas": "catalogo_parte_cas",
        "catalogo_parte_c_a_s": "catalogo_parte_cas",
        "catalogo_parte": "catalogo_parte_cas",
        "fecha_de_ingreso": "fecha_ingreso",
        "fecha_ingreso": "fecha_ingreso",
        "tamano_capacidad": "tamano_capacidad",
        "tama_o_capacidad": "tamano_capacidad",
        "contenedor": "contenedor",
        "piezas": "piezas",
        "cantidad_por_pieza": "cantidad_por_pieza",
        "cantidad_por_pieza_": "cantidad_por_pieza",
    }

    canon = {}
    for key, value in (row or {}).items():
        norm = _normalize_key(key)
        target = aliases.get(norm)
        if not target:
            if "catalogo" in norm and "parte" in norm and "cas" in norm:
                target = "catalogo_parte_cas"
            elif "tam" in norm and "capacidad" in norm:
                target = "tamano_capacidad"
            elif norm in ("producto", "marca", "proveedor", "fecha_ingreso", "contenedor", "piezas"):
                target = norm
        if target:
            canon[target] = value
    return canon


def _decode_csv_bytes(file_bytes: bytes):
    # Intenta primero UTF-8 (con/sin BOM) y luego latin-1/cp1252.
    # Muchos CSV de Excel en Windows llegan en ANSI (cp1252/latin-1).
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="replace")


@bp.route("", methods=["GET"])
@bp.route("/", methods=["GET"])
@token_required
@permission_required("consumibles", "read")
def get_consumables():
    ensure_consumibles_schema()
    search = request.args.get("search", "")
    query = """
        SELECT id, producto, marca, proveedor, catalogo_parte_cas,
               fecha_ingreso, tamano_capacidad, contenedor, piezas,
               cantidad_por_pieza, creado_por, creado_en
        FROM consumibles
        WHERE producto LIKE :search OR marca LIKE :search
        ORDER BY producto ASC
    """
    consumables = db.session.execute(text(query), {"search": f"%{search}%"}).fetchall()
    
    # CORRECCIÓN: Usar row._mapping para compatibilidad con SQLAlchemy moderno
    return jsonify({"items": [dict(row._mapping) for row in consumables], "total": len(consumables)})


@bp.route("", methods=["POST"])
@bp.route("/", methods=["POST"])
@token_required
@permission_required("consumibles", "create")
def create_consumable():
    ensure_consumibles_schema()
    data = _normalize_payload(request.get_json(silent=True))
    if not data["producto"]:
        return jsonify({"message": "El campo 'producto' es obligatorio"}), 400

    current_user = getattr(g, "current_user", {}) or {}
    data["creado_por"] = _to_int_or_none(current_user.get("sub"))

    query = """
        INSERT INTO consumibles (producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza, creado_por)
        VALUES (:producto, :marca, :proveedor, :catalogo_parte_cas, :fecha_ingreso, :tamano_capacidad, :contenedor, :piezas, :cantidad_por_pieza, :creado_por)
    """
    result = db.session.execute(text(query), data)
    db.session.commit()
    return jsonify({"message": "Consumible creado", "id": result.lastrowid}), 201


@bp.route("/<int:consumable_id>", methods=["PUT"])
@token_required
@permission_required("consumibles", "update")
def update_consumable(consumable_id):
    ensure_consumibles_schema()
    data = _normalize_payload(request.get_json(silent=True))
    if not data["producto"]:
        return jsonify({"message": "El campo 'producto' es obligatorio"}), 400
    data["id"] = consumable_id
    
    query = """
        UPDATE consumibles
        SET producto = :producto, marca = :marca, proveedor = :proveedor, catalogo_parte_cas = :catalogo_parte_cas,
            fecha_ingreso = :fecha_ingreso, tamano_capacidad = :tamano_capacidad, contenedor = :contenedor,
            piezas = :piezas, cantidad_por_pieza = :cantidad_por_pieza
        WHERE id = :id
    """
    result = db.session.execute(text(query), data)
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Consumible no encontrado"}), 404
    return jsonify({"message": "Consumible actualizado"}), 200


@bp.route("/<int:consumable_id>", methods=["DELETE"])
@token_required
@permission_required("consumibles", "delete")
def delete_consumable(consumable_id):
    ensure_consumibles_schema()
    query = "DELETE FROM consumibles WHERE id = :id"
    result = db.session.execute(text(query), {"id": consumable_id})
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Consumible no encontrado"}), 404
    return jsonify({"message": "Consumible eliminado"}), 200


@bp.route("/import", methods=["POST"])
@token_required
@permission_required("consumibles", "create")
def import_consumables():
    ensure_consumibles_schema()
    inserted = 0

    # Permite importar filas preprocesadas desde frontend (preview + depuración).
    json_payload = request.get_json(silent=True)
    if json_payload and isinstance(json_payload.get("rows"), list):
        rows = json_payload.get("rows", [])
        for row in rows:
            if not isinstance(row, dict):
                continue

            data = _normalize_payload(row)
            if not data["producto"]:
                continue

            query = """
                INSERT INTO consumibles (producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza)
                VALUES (:producto, :marca, :proveedor, :catalogo_parte_cas, :fecha_ingreso, :tamano_capacidad, :contenedor, :piezas, :cantidad_por_pieza)
            """
            db.session.execute(text(query), data)
            inserted += 1
    else:
        if "file" not in request.files:
            return jsonify({"message": "No se proporciono archivo"}), 400

        file = request.files["file"]
        if not file.filename or not file.filename.lower().endswith(".csv"):
            return jsonify({"message": "Formato invalido. Solo CSV"}), 400

        file_bytes = file.stream.read()
        decoded = _decode_csv_bytes(file_bytes)
        stream = io.StringIO(decoded, newline=None)
        sample = decoded.splitlines()[0] if decoded else ""
        delimiter = ";" if sample.count(";") > sample.count(",") else ","
        reader = csv.DictReader(stream, delimiter=delimiter)

        for row in reader:
            data = _normalize_payload(_canonicalize_row_keys(row))
            if not data["producto"]:
                continue

            query = """
                INSERT INTO consumibles (producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza)
                VALUES (:producto, :marca, :proveedor, :catalogo_parte_cas, :fecha_ingreso, :tamano_capacidad, :contenedor, :piezas, :cantidad_por_pieza)
            """
            db.session.execute(text(query), data)
            inserted += 1

    db.session.commit()
    return jsonify({"message": "Importacion completada", "insertados": inserted}), 200
