import json
import re
import unicodedata
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.modules.inventory.consumables import ensure_consumibles_schema
from app.utils.auth import token_required
from app.utils.inventory_usage import ensure_movimientos_schema
from app.utils.rbac import permission_required
from app.utils.schema import add_column_if_missing, is_sqlite

inventory_bp = Blueprint("inventory", __name__)


REACTIVO_COLUMNS = [
    "id_reactivo",
    "codigo_interno",
    "tipo_reactivo",
    "producto",
    "nombre",
    "marca",
    "proveedor",
    "catalogo",
    "numero_parte",
    "cas",
    "catalogo_parte_cas_lote",
    "localizacion",
    "sub_localizacion",
    "caducidad",
    "fecha_apertura",
    "fecha_ingreso",
    "fecha_preparacion",
    "contenedor",
    "capacidad_litros",
    "capacidad_kilos",
    "capacidad",
    "unidad_capacidad",
    "piezas",
    "total_litros_2025",
    "cantidad_total",
    "unidad_total",
    "restante_190126",
    "restante",
    "lote",
    "parte",
    "serie",
    "descripcion",
    "nuevo_usado",
    "estado",
    "metodo",
    "observaciones",
    "item_name",
    "informacion_extra",
    "nombre_crm",
    "lot_number",
    "url",
    "estado_reactivo",
    "volumen",
    "vendor",
    "amount_in_stock",
    "expiration_date",
    "cas_number",
    "bottle_tag_color",
    "date_opened",
    "formula",
    "id_interno",
    "physical_state",
    "estado_fisico",
    "presentacion",
    "tipo_sustancia",
    "extra_json",
    "numero_cas",
    "categoria",
    "cantidad_actual",
    "unidad",
    "ubicacion",
    "fecha_vencimiento",
    "stock_minimo",
]


REACTIVO_SHEET_TYPES = {
    "acidos": "acidos",
    "alcoholes_y_solventes_organicos": "alcoholes_solventes",
    "alcoholes_solventes_organicos": "alcoholes_solventes",
    "alcoholes_y_solventes": "alcoholes_solventes",
    "alcoholes_solventes": "alcoholes_solventes",
    "compuestos_de_amonio": "compuestos_amonio",
    "compuestos_amonio": "compuestos_amonio",
    "compuestos_de_sodio": "compuestos_sodio",
    "compuestos_sodio": "compuestos_sodio",
    "estandares_preparados": "estandares_preparados",
    "materiales_de_referencia": "materiales_referencia",
    "materiales_referencia": "materiales_referencia",
    "miscelaneos": "miscelaneos",
    "columnas_cromatograficas": "columnas_cromatograficas",
}

REACTIVO_SHEET_LABELS = {
    "acidos": "Ácidos",
    "alcoholes_solventes": "Alcoholes y solventes orgánicos",
    "compuestos_amonio": "Compuestos de Amonio",
    "compuestos_sodio": "Compuestos de Sodio",
    "estandares_preparados": "Estándares preparados",
    "materiales_referencia": "Materiales de Referencia",
    "miscelaneos": "Misceláneos",
    "columnas_cromatograficas": "Columnas cromatográficas",
}

MONTH_NAMES = {
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "setiembre", "octubre",
    "noviembre", "diciembre",
}

REACTIVO_IMPORT_ALIASES = {
    "id": "codigo_interno",
    "id_interno": "codigo_interno",
    "codigo_interno": "codigo_interno",
    "producto": "nombre",
    "item_name": "nombre",
    "nombre_del_crm": "nombre",
    "nombre_crm": "nombre",
    "nombre": "nombre",
    "marca": "marca",
    "vendor": "proveedor",
    "proveedor": "proveedor",
    "catalog": "catalogo",
    "catalogo": "catalogo",
    "catalog_": "catalogo",
    "catalog_num": "catalogo",
    "catalog_number": "catalogo",
    "catalogo_parte_cas_lote": "catalogo_parte_cas_lote",
    "catalogo_parte_c_a_s_lote": "catalogo_parte_cas_lote",
    "catalogo_parte_cas": "catalogo_parte_cas_lote",
    "parte": "numero_parte",
    "numero_parte": "numero_parte",
    "parte_num": "numero_parte",
    "lote": "lote",
    "lot_number": "lote",
    "cas": "cas",
    "cas_number": "cas",
    "localizacion": "localizacion",
    "location": "localizacion",
    "sub_location": "sub_localizacion",
    "sub_localizacion": "sub_localizacion",
    "caducidad": "caducidad",
    "fecha_de_caducidad": "caducidad",
    "fecha_caducidad": "caducidad",
    "expiration_date": "caducidad",
    "fecha_de_apertura": "fecha_apertura",
    "fecha_apertura": "fecha_apertura",
    "date_opened": "fecha_apertura",
    "fecha_de_ingreso": "fecha_ingreso",
    "fecha_ingreso": "fecha_ingreso",
    "contenedor": "contenedor",
    "capacidad_litros": "capacidad",
    "capacidad_en_litros": "capacidad",
    "capacidad_kilos": "capacidad",
    "capacidad_en_kilos": "capacidad",
    "piezas": "piezas",
    "total_en_litros_2025": "cantidad_total",
    "amount_in_stock": "cantidad_total",
    "volumen": "cantidad_total",
    "restante_al_19_01_26": "restante",
    "restante_19_01_26": "restante",
    "estado": "estado",
    "metodo": "metodo",
    "url": "url",
    "formula": "formula",
    "physical_state": "estado_fisico",
    "estado_fisico": "estado_fisico",
    "presentacion": "presentacion",
    "tipo_de_sustancia": "tipo_sustancia",
    "tipo_sustancia": "tipo_sustancia",
    "descripcion": "descripcion",
    "observaciones": "observaciones",
    "informacion_extra": "informacion_extra",
    "fecha_de_preparacion": "fecha_preparacion",
    "fecha_preparacion": "fecha_preparacion",
    "nuevo_o_usado": "nuevo_usado",
    "serie": "serie",
    "numero_serie": "serie",
}


def _to_float_or_none(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int_or_none(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_str_or_none(value, max_length=None):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    return value[:max_length] if max_length else value


def _normalize_import_key(value) -> str:
    if value is None:
        return ""
    text_value = str(value).strip().lower().replace("\ufeff", "")
    text_value = unicodedata.normalize("NFD", text_value)
    text_value = "".join(ch for ch in text_value if unicodedata.category(ch) != "Mn")
    text_value = re.sub(r"[^a-z0-9]+", "_", text_value)
    return re.sub(r"_+", "_", text_value).strip("_")


def _reactivo_type_from_sheet(sheet_name: str):
    normalized = _normalize_import_key(sheet_name)
    if normalized == "consumibles" or "consumible" in normalized:
        return None
    return REACTIVO_SHEET_TYPES.get(normalized)


def _is_monthly_movement_column(header: str) -> bool:
    normalized = _normalize_import_key(header)
    parts = set(normalized.split("_"))
    has_month = bool(parts & MONTH_NAMES)
    has_movement_word = any(word in normalized for word in ("descuento", "subtotal", "fecha_del_descuento", "fecha_descuento"))
    return has_month and has_movement_word


def _clean_import_value(value):
    if value in (None, ""):
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()[:10]
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return value


def _map_reactivo_import_row(sheet_type: str, row: dict):
    """Mapea una fila heterogenea de Excel hacia el modelo canonico.

    Pseudocodigo:
    1. Normalizar cada encabezado: acentos fuera, minusculas, separadores a "_".
    2. Ignorar columnas vacias y columnas de movimientos mensuales.
    3. Resolver alias conocidos hacia campos canonicos de reactivos.
    4. Completar campos derivados usados por pantallas viejas y nuevas.
    """
    mapped = {"tipo_reactivo": sheet_type, "categoria": sheet_type}
    ignored_columns = []

    for raw_key, raw_value in (row or {}).items():
        key = _normalize_import_key(raw_key)
        if not key:
            ignored_columns.append(str(raw_key or ""))
            continue
        if _is_monthly_movement_column(key):
            ignored_columns.append(str(raw_key))
            continue

        target = REACTIVO_IMPORT_ALIASES.get(key)
        if not target:
            if "catalogo" in key and "parte" in key and "cas" in key:
                target = "catalogo_parte_cas_lote"
            elif key.startswith("capacidad") and "litro" in key:
                target = "capacidad"
                mapped["unidad_capacidad"] = "litros"
            elif key.startswith("capacidad") and ("kilo" in key or "kg" in key):
                target = "capacidad"
                mapped["unidad_capacidad"] = "kilos"
            elif "restante" in key and ("19" in key or "01" in key or "26" in key):
                target = "restante"
            elif "total" in key and "litro" in key:
                target = "cantidad_total"
                mapped["unidad_total"] = "kilos" if sheet_type == "compuestos_sodio" else "litros"
            else:
                ignored_columns.append(str(raw_key))
                continue

        value = _clean_import_value(raw_value)
        if value is None:
            continue

        mapped[target] = value

        if target == "capacidad" and "unidad_capacidad" not in mapped:
            mapped["unidad_capacidad"] = "kilos" if sheet_type == "compuestos_sodio" else "litros"
        if target == "cantidad_total" and "unidad_total" not in mapped:
            mapped["unidad_total"] = "kilos" if sheet_type == "compuestos_sodio" else "litros"
        if key == "amount_in_stock":
            mapped["amount_in_stock"] = value
        if key == "volumen":
            mapped["volumen"] = value

    if mapped.get("codigo_interno"):
        mapped["id_reactivo"] = mapped.get("codigo_interno")
        mapped["id_interno"] = mapped.get("codigo_interno")
    if mapped.get("catalogo"):
        mapped["catalogo"] = str(mapped["catalogo"])
    if mapped.get("numero_parte"):
        mapped["parte"] = mapped["numero_parte"]
    if mapped.get("cas"):
        mapped["cas_number"] = mapped.get("cas")
        mapped["numero_cas"] = mapped.get("cas")
    if mapped.get("nombre"):
        mapped["producto"] = mapped["nombre"]
        mapped["item_name"] = mapped["nombre"]
        mapped["nombre_crm"] = mapped["nombre"]
    if mapped.get("cantidad_total") is not None:
        if sheet_type in ("acidos", "alcoholes_solventes", "compuestos_amonio"):
            mapped["total_litros_2025"] = mapped["cantidad_total"]
        mapped["amount_in_stock"] = mapped["cantidad_total"]
    if mapped.get("restante") is not None:
        mapped["restante_190126"] = mapped["restante"]
    if mapped.get("capacidad") is not None:
        if mapped.get("unidad_capacidad") == "kilos":
            mapped["capacidad_kilos"] = mapped["capacidad"]
        else:
            mapped["capacidad_litros"] = mapped["capacidad"]
    if mapped.get("estado"):
        mapped["estado_reactivo"] = mapped["estado"]
    if mapped.get("estado_fisico"):
        mapped["physical_state"] = mapped["estado_fisico"]
    if mapped.get("lote") and not mapped.get("lot_number"):
        mapped["lot_number"] = mapped["lote"]

    return mapped, ignored_columns


def _has_reactivo_identity(data: dict) -> bool:
    return any(data.get(key) for key in ("nombre", "producto", "codigo_interno", "id_reactivo", "id_interno", "lote", "catalogo_parte_cas_lote", "catalogo"))


def _find_existing_reactivo_id(data: dict):
    """Busca un reactivo existente para hacer upsert durante importacion.

    Prioridad de coincidencia:
    1. Codigo interno / ID del Excel.
    2. Catalogo, lote o cadena catalogo-parte-CAS-lote.
    3. Nombre + lote cuando no existe un identificador fuerte.
    """
    category = data.get("tipo_reactivo") or data.get("categoria")
    checks = [
        ("codigo_interno", data.get("codigo_interno") or data.get("id_interno") or data.get("id_reactivo")),
        ("id_reactivo", data.get("id_reactivo")),
        ("id_interno", data.get("id_interno")),
        ("catalogo_parte_cas_lote", data.get("catalogo_parte_cas_lote")),
        ("catalogo", data.get("catalogo")),
    ]
    for column, value in checks:
        if not value:
            continue
        row = db.session.execute(
            text(f"SELECT id FROM reactivos WHERE tipo_reactivo = :category AND {column} = :value LIMIT 1"),
            {"category": category, "value": str(value)},
        ).mappings().first()
        if row:
            return row["id"]

    if data.get("nombre") and data.get("lote"):
        row = db.session.execute(
            text("SELECT id FROM reactivos WHERE tipo_reactivo = :category AND nombre = :nombre AND lote = :lote LIMIT 1"),
            {"category": category, "nombre": data.get("nombre"), "lote": data.get("lote")},
        ).mappings().first()
        if row:
            return row["id"]
    return None


def ensure_reactivos_schema():
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS reactivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre VARCHAR(180) DEFAULT NULL,
                numero_cas VARCHAR(120) DEFAULT NULL,
                categoria VARCHAR(120) DEFAULT NULL,
                cantidad_actual REAL DEFAULT 0,
                unidad VARCHAR(40) DEFAULT NULL,
                ubicacion VARCHAR(180) DEFAULT NULL,
                fecha_vencimiento DATE DEFAULT NULL,
                stock_minimo REAL DEFAULT 0
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS reactivos (
                id INT NOT NULL AUTO_INCREMENT,
                nombre VARCHAR(180) DEFAULT NULL,
                numero_cas VARCHAR(120) DEFAULT NULL,
                categoria VARCHAR(120) DEFAULT NULL,
                cantidad_actual DECIMAL(12,4) DEFAULT 0,
                unidad VARCHAR(40) DEFAULT NULL,
                ubicacion VARCHAR(180) DEFAULT NULL,
                fecha_vencimiento DATE DEFAULT NULL,
                stock_minimo DECIMAL(12,4) DEFAULT 0,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            """
        )
    )

    column_definitions = [
        ("tipo_reactivo", "VARCHAR(80) DEFAULT NULL"),
        ("id_reactivo", "VARCHAR(120) DEFAULT NULL"),
        ("codigo_interno", "VARCHAR(120) DEFAULT NULL"),
        ("producto", "VARCHAR(180) DEFAULT NULL"),
        ("marca", "VARCHAR(120) DEFAULT NULL"),
        ("proveedor", "VARCHAR(180) DEFAULT NULL"),
        ("catalogo", "VARCHAR(120) DEFAULT NULL"),
        ("numero_parte", "VARCHAR(120) DEFAULT NULL"),
        ("cas", "VARCHAR(120) DEFAULT NULL"),
        ("catalogo_parte_cas_lote", "VARCHAR(180) DEFAULT NULL"),
        ("localizacion", "VARCHAR(180) DEFAULT NULL"),
        ("sub_localizacion", "VARCHAR(180) DEFAULT NULL"),
        ("caducidad", "DATE DEFAULT NULL"),
        ("fecha_apertura", "DATE DEFAULT NULL"),
        ("fecha_ingreso", "DATE DEFAULT NULL"),
        ("fecha_preparacion", "DATE DEFAULT NULL"),
        ("contenedor", "VARCHAR(120) DEFAULT NULL"),
        ("capacidad_litros", "DECIMAL(12,4) DEFAULT NULL"),
        ("capacidad_kilos", "DECIMAL(12,4) DEFAULT NULL"),
        ("capacidad", "DECIMAL(12,4) DEFAULT NULL"),
        ("unidad_capacidad", "VARCHAR(40) DEFAULT NULL"),
        ("piezas", "INT DEFAULT NULL"),
        ("total_litros_2025", "DECIMAL(12,4) DEFAULT NULL"),
        ("cantidad_total", "DECIMAL(12,4) DEFAULT NULL"),
        ("unidad_total", "VARCHAR(40) DEFAULT NULL"),
        ("restante_190126", "DECIMAL(12,4) DEFAULT NULL"),
        ("restante", "DECIMAL(12,4) DEFAULT NULL"),
        ("lote", "VARCHAR(120) DEFAULT NULL"),
        ("parte", "VARCHAR(120) DEFAULT NULL"),
        ("serie", "VARCHAR(120) DEFAULT NULL"),
        ("descripcion", "TEXT"),
        ("nuevo_usado", "VARCHAR(30) DEFAULT NULL"),
        ("estado", "VARCHAR(80) DEFAULT NULL"),
        ("metodo", "VARCHAR(120) DEFAULT NULL"),
        ("observaciones", "TEXT"),
        ("item_name", "VARCHAR(180) DEFAULT NULL"),
        ("informacion_extra", "TEXT"),
        ("nombre_crm", "VARCHAR(180) DEFAULT NULL"),
        ("lot_number", "VARCHAR(120) DEFAULT NULL"),
        ("url", "VARCHAR(255) DEFAULT NULL"),
        ("estado_reactivo", "VARCHAR(40) DEFAULT NULL"),
        ("volumen", "VARCHAR(80) DEFAULT NULL"),
        ("vendor", "VARCHAR(180) DEFAULT NULL"),
        ("catalogo", "VARCHAR(120) DEFAULT NULL"),
        ("amount_in_stock", "DECIMAL(12,4) DEFAULT NULL"),
        ("expiration_date", "DATE DEFAULT NULL"),
        ("cas_number", "VARCHAR(120) DEFAULT NULL"),
        ("bottle_tag_color", "VARCHAR(80) DEFAULT NULL"),
        ("date_opened", "DATE DEFAULT NULL"),
        ("formula", "VARCHAR(180) DEFAULT NULL"),
        ("id_interno", "VARCHAR(120) DEFAULT NULL"),
        ("physical_state", "VARCHAR(80) DEFAULT NULL"),
        ("estado_fisico", "VARCHAR(80) DEFAULT NULL"),
        ("presentacion", "VARCHAR(120) DEFAULT NULL"),
        ("tipo_sustancia", "VARCHAR(120) DEFAULT NULL"),
        ("extra_json", "LONGTEXT"),
        ("creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
        ("actualizado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
    ]
    for column_name, column_definition in column_definitions:
        add_column_if_missing("reactivos", column_name, column_definition)
    db.session.commit()


def _normalize_reactivo_payload(raw):
    payload = raw or {}
    tipo = (payload.get("tipo_reactivo") or "").strip()[:80] or None
    producto = (payload.get("producto") or payload.get("item_name") or payload.get("nombre_crm") or payload.get("nombre") or "").strip()[:180] or None
    codigo_interno = _to_str_or_none(payload.get("codigo_interno") or payload.get("id_reactivo") or payload.get("id_interno"), 120)
    numero_cas = (payload.get("cas") or payload.get("cas_number") or payload.get("numero_cas") or payload.get("catalogo_parte_cas_lote") or "").strip()[:120] or None
    ubicacion = (payload.get("localizacion") or payload.get("ubicacion") or payload.get("sub_localizacion") or "").strip()[:180] or None
    fecha_vencimiento = payload.get("caducidad") or payload.get("expiration_date") or payload.get("fecha_vencimiento") or None
    amount = _to_float_or_none(payload.get("amount_in_stock"))
    piezas = _to_int_or_none(payload.get("piezas"))
    capacidad = _to_float_or_none(payload.get("capacidad"))
    unidad_capacidad = _to_str_or_none(payload.get("unidad_capacidad"), 40)
    capacidad_litros = _to_float_or_none(payload.get("capacidad_litros"))
    capacidad_kilos = _to_float_or_none(payload.get("capacidad_kilos"))
    if capacidad is not None and not capacidad_litros and not capacidad_kilos:
        if unidad_capacidad == "kilos":
            capacidad_kilos = capacidad
        else:
            capacidad_litros = capacidad
    if capacidad is None:
        capacidad = capacidad_kilos if capacidad_kilos is not None else capacidad_litros
        unidad_capacidad = "kilos" if capacidad_kilos is not None else "litros" if capacidad_litros is not None else unidad_capacidad
    cantidad_total = _to_float_or_none(payload.get("cantidad_total"))
    total_litros_2025 = _to_float_or_none(payload.get("total_litros_2025"))
    if cantidad_total is None:
        cantidad_total = total_litros_2025 if total_litros_2025 is not None else amount
    if total_litros_2025 is None and payload.get("unidad_total") == "litros":
        total_litros_2025 = cantidad_total
    unidad_total = _to_str_or_none(payload.get("unidad_total"), 40)
    restante = _to_float_or_none(payload.get("restante"))
    restante_190126 = _to_float_or_none(payload.get("restante_190126"))
    if restante is None:
        restante = restante_190126
    if restante_190126 is None:
        restante_190126 = restante
    volumen = _to_float_or_none(payload.get("volumen"))
    cantidad_actual = (
        restante_190126
        if restante_190126 is not None
        else amount
        if amount is not None
        else total_litros_2025
        if total_litros_2025 is not None
        else piezas
        if piezas is not None
        else capacidad_litros
        if capacidad_litros is not None
        else capacidad_kilos
        if capacidad_kilos is not None
        else volumen
    )
    unidad = payload.get("unidad") or unidad_total or (
        "L"
        if restante_190126 is not None or total_litros_2025 is not None or capacidad_litros is not None
        else "kg"
        if capacidad_kilos is not None
        else "piezas"
        if piezas is not None
        else "volumen"
        if volumen is not None
        else None
    )

    data = {column: payload.get(column) for column in REACTIVO_COLUMNS}
    data.update(
        {
            "id_reactivo": _to_str_or_none(payload.get("id_reactivo") or codigo_interno, 120),
            "codigo_interno": codigo_interno,
            "tipo_reactivo": tipo,
            "producto": producto,
            "nombre": producto,
            "catalogo": _to_str_or_none(payload.get("catalogo"), 120),
            "numero_parte": _to_str_or_none(payload.get("numero_parte"), 120),
            "cas": numero_cas,
            "numero_cas": numero_cas,
            "categoria": tipo,
            "cantidad_actual": cantidad_actual,
            "unidad": unidad,
            "ubicacion": ubicacion,
            "fecha_vencimiento": fecha_vencimiento,
            "stock_minimo": _to_float_or_none(payload.get("stock_minimo")) or 0,
            "capacidad": capacidad,
            "unidad_capacidad": unidad_capacidad,
            "capacidad_litros": capacidad_litros,
            "capacidad_kilos": capacidad_kilos,
            "piezas": piezas,
            "cantidad_total": cantidad_total,
            "unidad_total": unidad_total,
            "total_litros_2025": total_litros_2025,
            "restante": restante,
            "restante_190126": restante_190126,
            "amount_in_stock": amount,
            "estado": _to_str_or_none(payload.get("estado") or payload.get("estado_reactivo"), 80),
            "estado_fisico": _to_str_or_none(payload.get("estado_fisico") or payload.get("physical_state"), 80),
            "extra_json": json.dumps(payload.get("extra") or {}, ensure_ascii=False),
        }
    )

    for key, value in list(data.items()):
        if isinstance(value, str):
            data[key] = value.strip() or None
    return data


@inventory_bp.get("/summary")
@token_required
@permission_required("dashboard", "read")
def inventory_summary():
    ensure_reactivos_schema()
    ensure_consumibles_schema()
    ensure_equipos_schema()
    summary = db.session.execute(
        text(
            """
            SELECT
              (SELECT COUNT(*) FROM reactivos) AS total_reactivos,
              (SELECT COUNT(*) FROM consumibles) AS total_consumibles,
              (SELECT COUNT(*) FROM equipos) AS total_equipos,
              (
                SELECT COUNT(*)
                FROM reactivos
                WHERE cantidad_actual <= stock_minimo
              ) AS reactivos_stock_bajo,
              (
                -- CORRECCIÓN: consumibles no tiene 'cantidad_actual' ni 'stock_minimo'
                -- Usamos 'piezas <= 5' como un ejemplo de stock bajo temporal.
                SELECT COUNT(*)
                FROM consumibles
                WHERE piezas <= 5 
              ) AS consumibles_stock_bajo,
              (
                SELECT COUNT(*)
                FROM equipos
                WHERE estado = 'calibracion_pendiente'
              ) AS equipos_calibracion_pendiente
            """
        )
    ).mappings().first()

    return jsonify(dict(summary or {})), 200


@inventory_bp.get("/reactivos")
@token_required
@permission_required("reactivos", "read")
def list_reactivos():
    ensure_reactivos_schema()
    search = (request.args.get("search") or "").strip()
    rows = db.session.execute(
        text(
            """
            SELECT id, id_reactivo, codigo_interno, tipo_reactivo, producto,
                   nombre, marca, proveedor, catalogo, numero_parte, cas,
                   catalogo_parte_cas_lote, localizacion, sub_localizacion,
                   caducidad, fecha_apertura, fecha_ingreso, fecha_preparacion,
                   contenedor, capacidad_litros, capacidad_kilos, capacidad,
                   unidad_capacidad, piezas, total_litros_2025, cantidad_total,
                   unidad_total, restante_190126, restante, lote, parte,
                   serie, descripcion, nuevo_usado, metodo, observaciones,
                   item_name, informacion_extra, nombre_crm, lot_number, url,
                   estado_reactivo, volumen, vendor, catalogo, amount_in_stock,
                   expiration_date, cas_number, bottle_tag_color, date_opened,
                   formula, id_interno, physical_state, estado_fisico, presentacion,
                   tipo_sustancia, numero_cas, categoria, cantidad_actual,
                   unidad, ubicacion, fecha_vencimiento, stock_minimo
            FROM reactivos
            WHERE :search = ''
               OR nombre LIKE :search_like
               OR producto LIKE :search_like
               OR item_name LIKE :search_like
               OR nombre_crm LIKE :search_like
               OR tipo_reactivo LIKE :search_like
               OR id_interno LIKE :search_like
               OR catalogo_parte_cas_lote LIKE :search_like
            ORDER BY COALESCE(nombre, producto, item_name, nombre_crm) ASC
            LIMIT 500
            """
        ),
        {"search": search, "search_like": f"%{search}%"},
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/reactivos/<int:reactivo_id>")
@token_required
@permission_required("reactivos", "read")
def get_reactivo(reactivo_id: int):
    ensure_reactivos_schema()
    row = db.session.execute(
        text("SELECT * FROM reactivos WHERE id = :id"),
        {"id": reactivo_id},
    ).mappings().first()
    if not row:
        return jsonify({"message": "Reactivo no encontrado"}), 404
    return jsonify({"item": dict(row)}), 200


@inventory_bp.post("/reactivos")
@token_required
@permission_required("reactivos", "create")
def create_reactivo():
    ensure_reactivos_schema()
    data = _normalize_reactivo_payload(request.get_json(silent=True))
    if not data["tipo_reactivo"] or not data["nombre"]:
        return jsonify({"message": "Tipo de reactivo y producto son obligatorios"}), 400

    columns = ", ".join(REACTIVO_COLUMNS)
    values = ", ".join([f":{column}" for column in REACTIVO_COLUMNS])
    result = db.session.execute(
        text(f"INSERT INTO reactivos ({columns}) VALUES ({values})"),
        data,
    )
    db.session.commit()
    return jsonify({"message": "Reactivo creado", "id": result.lastrowid}), 201


@inventory_bp.put("/reactivos/<int:reactivo_id>")
@token_required
@permission_required("reactivos", "update")
def update_reactivo(reactivo_id: int):
    ensure_reactivos_schema()
    data = _normalize_reactivo_payload(request.get_json(silent=True))
    if not data["tipo_reactivo"] or not data["nombre"]:
        return jsonify({"message": "Tipo de reactivo y producto son obligatorios"}), 400

    assignments = ", ".join([f"{column} = :{column}" for column in REACTIVO_COLUMNS])
    result = db.session.execute(
        text(f"UPDATE reactivos SET {assignments} WHERE id = :id"),
        {**data, "id": reactivo_id},
    )
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Reactivo no encontrado"}), 404
    return jsonify({"message": "Reactivo actualizado"}), 200


@inventory_bp.post("/reactivos/import")
@token_required
@permission_required("reactivos", "create")
def import_reactivos():
    """Importa hojas de reactivos preleidas desde el frontend.

    Pseudocodigo de alto nivel:
    1. Recibir todas las hojas del workbook.
    2. Clasificar cada hoja por nombre; ignorar consumibles y hojas desconocidas.
    3. Mapear fila por fila; los errores de una fila no detienen la hoja.
    4. Normalizar al esquema canonico y hacer insert/update.
    5. Regresar resumen operativo para la interfaz.
    """
    ensure_reactivos_schema()
    payload = request.get_json(silent=True) or {}
    sheets = payload.get("sheets")
    if not isinstance(sheets, list):
        return jsonify({"message": "Formato inválido. Envía una lista de hojas."}), 400

    summary = {
        "total_hojas_leidas": len(sheets),
        "hojas_procesadas": [],
        "hojas_ignoradas": [],
        "reactivos_insertados": 0,
        "reactivos_actualizados": 0,
        "filas_ignoradas": 0,
        "errores": [],
    }

    columns = ", ".join(REACTIVO_COLUMNS)
    values = ", ".join([f":{column}" for column in REACTIVO_COLUMNS])
    assignments = ", ".join([f"{column} = :{column}" for column in REACTIVO_COLUMNS])

    for sheet in sheets:
        sheet_name = str((sheet or {}).get("name") or "").strip()
        rows = (sheet or {}).get("rows") or []
        sheet_type = _reactivo_type_from_sheet(sheet_name)

        if not sheet_type:
            summary["hojas_ignoradas"].append({"hoja": sheet_name or "Sin nombre", "motivo": "No corresponde a reactivos"})
            continue
        if not isinstance(rows, list) or not rows:
            summary["hojas_ignoradas"].append({"hoja": sheet_name, "motivo": "Hoja vacía"})
            continue

        processed_sheet = {
            "hoja": sheet_name,
            "categoria": REACTIVO_SHEET_LABELS.get(sheet_type, sheet_type),
            "filas": 0,
            "insertados": 0,
            "actualizados": 0,
            "ignorados": 0,
        }

        for index, row in enumerate(rows, start=2):
            try:
                if not isinstance(row, dict):
                    processed_sheet["ignorados"] += 1
                    summary["filas_ignoradas"] += 1
                    summary["errores"].append({"hoja": sheet_name, "fila": index, "error": "Fila inválida"})
                    continue

                mapped, _ignored_columns = _map_reactivo_import_row(sheet_type, row)
                if not _has_reactivo_identity(mapped):
                    processed_sheet["ignorados"] += 1
                    summary["filas_ignoradas"] += 1
                    continue

                data = _normalize_reactivo_payload(mapped)
                if not data["tipo_reactivo"] or not data["nombre"]:
                    processed_sheet["ignorados"] += 1
                    summary["filas_ignoradas"] += 1
                    summary["errores"].append({
                        "hoja": sheet_name,
                        "fila": index,
                        "error": "Falta nombre de producto, Item Name o Nombre del CRM",
                    })
                    continue

                existing_id = _find_existing_reactivo_id(data)
                if existing_id:
                    db.session.execute(
                        text(f"UPDATE reactivos SET {assignments} WHERE id = :id"),
                        {**data, "id": existing_id},
                    )
                    summary["reactivos_actualizados"] += 1
                    processed_sheet["actualizados"] += 1
                else:
                    db.session.execute(
                        text(f"INSERT INTO reactivos ({columns}) VALUES ({values})"),
                        data,
                    )
                    summary["reactivos_insertados"] += 1
                    processed_sheet["insertados"] += 1

                processed_sheet["filas"] += 1

            except Exception as exc:  # noqa: BLE001 - reporte por fila sin romper importación completa
                processed_sheet["ignorados"] += 1
                summary["filas_ignoradas"] += 1
                summary["errores"].append({"hoja": sheet_name, "fila": index, "error": str(exc)})
                continue

        summary["hojas_procesadas"].append(processed_sheet)

    db.session.commit()
    return jsonify({"message": "Importación de reactivos completada", "summary": summary}), 200


@inventory_bp.delete("/reactivos/<int:reactivo_id>")
@token_required
@permission_required("reactivos", "delete")
def delete_reactivo(reactivo_id: int):
    ensure_reactivos_schema()
    result = db.session.execute(text("DELETE FROM reactivos WHERE id = :id"), {"id": reactivo_id})
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Reactivo no encontrado"}), 404
    return jsonify({"message": "Reactivo eliminado"}), 200


def ensure_equipos_schema():
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS equipos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre VARCHAR(150) NOT NULL,
                marca VARCHAR(100) DEFAULT NULL,
                modelo VARCHAR(100) DEFAULT NULL,
                numero_serie VARCHAR(100) DEFAULT NULL UNIQUE,
                ubicacion VARCHAR(150) DEFAULT NULL,
                id_responsable INTEGER DEFAULT NULL,
                fecha_prox_calibracion DATE DEFAULT NULL,
                estado VARCHAR(40) NOT NULL DEFAULT 'operativo',
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS equipos (
                id INT NOT NULL AUTO_INCREMENT,
                nombre VARCHAR(150) NOT NULL,
                marca VARCHAR(100) DEFAULT NULL,
                modelo VARCHAR(100) DEFAULT NULL,
                numero_serie VARCHAR(100) DEFAULT NULL,
                ubicacion VARCHAR(150) DEFAULT NULL,
                id_responsable INT DEFAULT NULL,
                fecha_prox_calibracion DATE DEFAULT NULL,
                estado ENUM('operativo','mantenimiento','fuera_servicio','calibracion_pendiente') NOT NULL DEFAULT 'operativo',
                creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY numero_serie (numero_serie),
                KEY id_responsable (id_responsable)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            """
        )
    )
    for column_name, column_definition in [
        ("marca", "VARCHAR(100) DEFAULT NULL"),
        ("modelo", "VARCHAR(100) DEFAULT NULL"),
        ("numero_serie", "VARCHAR(100) DEFAULT NULL"),
        ("ubicacion", "VARCHAR(150) DEFAULT NULL"),
        ("id_responsable", "INT DEFAULT NULL"),
        ("fecha_prox_calibracion", "DATE DEFAULT NULL"),
        ("estado", "ENUM('operativo','mantenimiento','fuera_servicio','calibracion_pendiente') NOT NULL DEFAULT 'operativo'"),
        ("creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
    ]:
        add_column_if_missing("equipos", column_name, column_definition)
    db.session.commit()


def ensure_mantenimientos_schema():
    ensure_equipos_schema()
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS mantenimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_equipo INTEGER NOT NULL,
                tipo VARCHAR(40) NOT NULL,
                fecha_programada DATE NOT NULL,
                fecha_realizado DATE DEFAULT NULL,
                tecnico_proveedor VARCHAR(150) DEFAULT NULL,
                estado VARCHAR(40) DEFAULT 'programado',
                observaciones TEXT,
                id_responsable INTEGER DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS mantenimientos (
                id INT NOT NULL AUTO_INCREMENT,
                id_equipo INT NOT NULL,
                tipo ENUM('preventivo','correctivo','calibracion') NOT NULL,
                fecha_programada DATE NOT NULL,
                fecha_realizado DATE DEFAULT NULL,
                tecnico_proveedor VARCHAR(150) DEFAULT NULL,
                estado ENUM('programado','en_proceso','completado','vencido') DEFAULT 'programado',
                observaciones TEXT,
                id_responsable INT DEFAULT NULL,
                creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY id_equipo (id_equipo),
                KEY id_responsable (id_responsable)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            """
        )
    )
    for column_name, column_definition in [
        ("fecha_realizado", "DATE DEFAULT NULL"),
        ("tecnico_proveedor", "VARCHAR(150) DEFAULT NULL"),
        ("estado", "ENUM('programado','en_proceso','completado','vencido') DEFAULT 'programado'"),
        ("observaciones", "TEXT"),
        ("id_responsable", "INT DEFAULT NULL"),
        ("creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"),
    ]:
        add_column_if_missing("mantenimientos", column_name, column_definition)
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


def _normalize_equipo_payload(raw):
    payload = raw or {}
    return {
        "nombre": _to_str_or_none(payload.get("nombre"), 150),
        "marca": _to_str_or_none(payload.get("marca"), 100),
        "modelo": _to_str_or_none(payload.get("modelo"), 100),
        "numero_serie": _to_str_or_none(payload.get("numero_serie"), 100),
        "ubicacion": _to_str_or_none(payload.get("ubicacion"), 150),
        "id_responsable": _to_int_or_none(payload.get("id_responsable")),
        "fecha_prox_calibracion": payload.get("fecha_prox_calibracion") or None,
        "estado": payload.get("estado") or "operativo",
    }


def _normalize_mantenimiento_payload(raw):
    payload = raw or {}
    return {
        "id_equipo": _to_int_or_none(payload.get("id_equipo")),
        "tipo": payload.get("tipo") or "preventivo",
        "fecha_programada": payload.get("fecha_programada") or None,
        "fecha_realizado": payload.get("fecha_realizado") or None,
        "tecnico_proveedor": _to_str_or_none(payload.get("tecnico_proveedor"), 150),
        "estado": payload.get("estado") or "programado",
        "observaciones": _to_str_or_none(payload.get("observaciones")),
        "id_responsable": _to_int_or_none(payload.get("id_responsable")),
    }


@inventory_bp.get("/equipos")
@token_required
@permission_required("equipos", "read")
def list_equipos():
    ensure_equipos_schema()
    search = (request.args.get("search") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    rows = db.session.execute(
        text(
            """
            SELECT e.id, e.nombre, e.marca, e.modelo, e.numero_serie, e.ubicacion,
                   e.id_responsable, u.nombre AS responsable,
                   e.fecha_prox_calibracion, e.estado, e.creado_en
            FROM equipos e
            LEFT JOIN usuarios u ON u.id = e.id_responsable
            WHERE (:search = ''
                   OR e.nombre LIKE :search_like
                   OR e.marca LIKE :search_like
                   OR e.modelo LIKE :search_like
                   OR e.numero_serie LIKE :search_like
                   OR e.ubicacion LIKE :search_like)
              AND (:estado = '' OR e.estado = :estado)
            ORDER BY e.nombre ASC
            LIMIT 500
            """
        ),
        {"search": search, "search_like": f"%{search}%", "estado": estado},
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/equipos/<int:equipo_id>")
@token_required
@permission_required("equipos", "read")
def get_equipo(equipo_id: int):
    ensure_equipos_schema()
    row = db.session.execute(
        text(
            """
            SELECT e.id, e.nombre, e.marca, e.modelo, e.numero_serie, e.ubicacion,
                   e.id_responsable, u.nombre AS responsable,
                   e.fecha_prox_calibracion, e.estado, e.creado_en
            FROM equipos e
            LEFT JOIN usuarios u ON u.id = e.id_responsable
            WHERE e.id = :id
            LIMIT 1
            """
        ),
        {"id": equipo_id},
    ).mappings().first()
    if not row:
        return jsonify({"message": "Equipo no encontrado"}), 404
    return jsonify({"item": dict(row)}), 200


@inventory_bp.post("/equipos")
@token_required
@permission_required("equipos", "create")
def create_equipo():
    ensure_equipos_schema()
    data = _normalize_equipo_payload(request.get_json(silent=True))
    if not data["nombre"]:
        return jsonify({"message": "El nombre del equipo es obligatorio"}), 400

    try:
        result = db.session.execute(
            text(
                """
                INSERT INTO equipos (
                  nombre, marca, modelo, numero_serie, ubicacion,
                  id_responsable, fecha_prox_calibracion, estado
                )
                VALUES (
                  :nombre, :marca, :modelo, :numero_serie, :ubicacion,
                  :id_responsable, :fecha_prox_calibracion, :estado
                )
                """
            ),
            data,
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe un equipo con ese numero de serie"}), 409

    return jsonify({"message": "Equipo creado", "id": result.lastrowid}), 201


@inventory_bp.put("/equipos/<int:equipo_id>")
@token_required
@permission_required("equipos", "update")
def update_equipo(equipo_id: int):
    ensure_equipos_schema()
    data = _normalize_equipo_payload(request.get_json(silent=True))
    if not data["nombre"]:
        return jsonify({"message": "El nombre del equipo es obligatorio"}), 400

    try:
        result = db.session.execute(
            text(
                """
                UPDATE equipos
                SET nombre = :nombre,
                    marca = :marca,
                    modelo = :modelo,
                    numero_serie = :numero_serie,
                    ubicacion = :ubicacion,
                    id_responsable = :id_responsable,
                    fecha_prox_calibracion = :fecha_prox_calibracion,
                    estado = :estado
                WHERE id = :id
                """
            ),
            {**data, "id": equipo_id},
        )
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Ya existe un equipo con ese numero de serie"}), 409

    if result.rowcount == 0:
        return jsonify({"message": "Equipo no encontrado"}), 404
    return jsonify({"message": "Equipo actualizado"}), 200


@inventory_bp.delete("/equipos/<int:equipo_id>")
@token_required
@permission_required("equipos", "delete")
def delete_equipo(equipo_id: int):
    ensure_equipos_schema()
    try:
        result = db.session.execute(text("DELETE FROM equipos WHERE id = :id"), {"id": equipo_id})
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "No se puede eliminar porque tiene mantenimientos o registros relacionados"}), 409

    if result.rowcount == 0:
        return jsonify({"message": "Equipo no encontrado"}), 404
    return jsonify({"message": "Equipo eliminado"}), 200


@inventory_bp.get("/consumibles")
@token_required
@permission_required("consumibles", "read")
def list_consumibles():
    ensure_consumibles_schema()
    # CORRECCIÓN: Usar los campos reales de la tabla consumibles
    rows = db.session.execute(
        text(
            """
            SELECT id, producto, marca, proveedor, catalogo_parte_cas, 
                   fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza
            FROM consumibles
            ORDER BY producto ASC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/movimientos")
@token_required
@permission_required("movimientos", "read")
def list_movimientos():
    ensure_movimientos_schema()
    rows = db.session.execute(
        text(
            """
            SELECT m.id, m.referencia, m.tipo, m.tabla_origen, m.id_item, m.cantidad,
                   m.motivo, m.creado_en AS fecha_hora,
                   COALESCE(r.nombre, r.producto, r.item_name, r.nombre_crm, c.producto) AS item_nombre,
                   COALESCE(r.codigo_interno, r.id_interno, r.catalogo, r.catalogo_parte_cas_lote, c.catalogo_parte_cas) AS item_codigo
            FROM movimientos m
            LEFT JOIN reactivos r ON m.tabla_origen = 'reactivos' AND m.id_item = r.id
            LEFT JOIN consumibles c ON m.tabla_origen = 'consumibles' AND m.id_item = c.id
            ORDER BY m.creado_en DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    if is_sqlite():
        stats_sql = """
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN tabla_origen = 'reactivos' THEN 1 ELSE 0 END) AS reactivos,
              SUM(CASE WHEN tabla_origen = 'consumibles' THEN 1 ELSE 0 END) AS consumibles,
              SUM(CASE WHEN DATE(creado_en) = DATE('now', 'localtime') THEN 1 ELSE 0 END) AS hoy,
              SUM(CASE WHEN strftime('%Y-%W', creado_en) = strftime('%Y-%W', 'now', 'localtime') THEN 1 ELSE 0 END) AS semana,
              SUM(CASE WHEN strftime('%Y-%m', creado_en) = strftime('%Y-%m', 'now', 'localtime') THEN 1 ELSE 0 END) AS mes
            FROM movimientos
        """
    else:
        stats_sql = """
            SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN tabla_origen = 'reactivos' THEN 1 ELSE 0 END) AS reactivos,
              SUM(CASE WHEN tabla_origen = 'consumibles' THEN 1 ELSE 0 END) AS consumibles,
              SUM(CASE WHEN DATE(creado_en) = CURDATE() THEN 1 ELSE 0 END) AS hoy,
              SUM(CASE WHEN YEARWEEK(creado_en, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS semana,
              SUM(CASE WHEN DATE_FORMAT(creado_en, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN 1 ELSE 0 END) AS mes
            FROM movimientos
        """
    stats = db.session.execute(text(stats_sql)).mappings().first() or {}
    summary = {key: int(stats.get(key) or 0) for key in ("total", "reactivos", "consumibles", "hoy", "semana", "mes")}

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows), "summary": summary}), 200


@inventory_bp.get("/mantenimientos")
@token_required
@permission_required("mantenimiento", "read")
def list_mantenimientos():
    ensure_mantenimientos_schema()
    search = (request.args.get("search") or "").strip()
    tipo = (request.args.get("tipo") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    rows = db.session.execute(
        text(
            """
            SELECT mt.id, mt.id_equipo, mt.tipo, mt.fecha_programada, mt.fecha_realizado,
                   mt.tecnico_proveedor, mt.estado, mt.observaciones, mt.id_responsable,
                   e.nombre AS equipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo,
                   u.nombre AS responsable,
                   rm.codigo AS reporte_codigo, rm.archivo_url AS reporte_pdf_url
            FROM mantenimientos mt
            LEFT JOIN equipos e ON e.id = mt.id_equipo
            LEFT JOIN usuarios u ON u.id = mt.id_responsable
            LEFT JOIN (
                SELECT r1.id_mantenimiento, r1.codigo, r1.archivo_url
                FROM reportes_mantenimiento r1
                INNER JOIN (
                    SELECT id_mantenimiento, MAX(id) AS id
                    FROM reportes_mantenimiento
                    GROUP BY id_mantenimiento
                ) latest ON latest.id = r1.id
            ) rm ON rm.id_mantenimiento = mt.id
            WHERE (:search = ''
                   OR e.nombre LIKE :search_like
                   OR e.marca LIKE :search_like
                   OR e.modelo LIKE :search_like
                   OR mt.tecnico_proveedor LIKE :search_like
                   OR mt.observaciones LIKE :search_like)
              AND (:tipo = '' OR mt.tipo = :tipo)
              AND (:estado = '' OR mt.estado = :estado)
            ORDER BY mt.fecha_programada ASC, mt.id DESC
            LIMIT 500
            """
        ),
        {"search": search, "search_like": f"%{search}%", "tipo": tipo, "estado": estado},
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


@inventory_bp.get("/mantenimientos/<int:mantenimiento_id>")
@token_required
@permission_required("mantenimiento", "read")
def get_mantenimiento(mantenimiento_id: int):
    ensure_mantenimientos_schema()
    row = db.session.execute(
        text(
            """
            SELECT mt.id, mt.id_equipo, mt.tipo, mt.fecha_programada, mt.fecha_realizado,
                   mt.tecnico_proveedor, mt.estado, mt.observaciones, mt.id_responsable,
                   e.nombre AS equipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo,
                   u.nombre AS responsable,
                   rm.codigo AS reporte_codigo, rm.archivo_url AS reporte_pdf_url
            FROM mantenimientos mt
            LEFT JOIN equipos e ON e.id = mt.id_equipo
            LEFT JOIN usuarios u ON u.id = mt.id_responsable
            LEFT JOIN (
                SELECT r1.id_mantenimiento, r1.codigo, r1.archivo_url
                FROM reportes_mantenimiento r1
                INNER JOIN (
                    SELECT id_mantenimiento, MAX(id) AS id
                    FROM reportes_mantenimiento
                    GROUP BY id_mantenimiento
                ) latest ON latest.id = r1.id
            ) rm ON rm.id_mantenimiento = mt.id
            WHERE mt.id = :id
            LIMIT 1
            """
        ),
        {"id": mantenimiento_id},
    ).mappings().first()
    if not row:
        return jsonify({"message": "Mantenimiento no encontrado"}), 404
    return jsonify({"item": dict(row)}), 200


@inventory_bp.post("/mantenimientos")
@token_required
@permission_required("mantenimiento", "create")
def create_mantenimiento():
    ensure_mantenimientos_schema()
    data = _normalize_mantenimiento_payload(request.get_json(silent=True))
    if not data["id_equipo"]:
        return jsonify({"message": "Selecciona un equipo"}), 400
    if not data["fecha_programada"]:
        return jsonify({"message": "La fecha programada es obligatoria"}), 400

    result = db.session.execute(
        text(
            """
            INSERT INTO mantenimientos (
              id_equipo, tipo, fecha_programada, fecha_realizado,
              tecnico_proveedor, estado, observaciones, id_responsable
            )
            VALUES (
              :id_equipo, :tipo, :fecha_programada, :fecha_realizado,
              :tecnico_proveedor, :estado, :observaciones, :id_responsable
            )
            """
        ),
        data,
    )
    db.session.commit()
    return jsonify({"message": "Mantenimiento programado", "id": result.lastrowid}), 201


@inventory_bp.put("/mantenimientos/<int:mantenimiento_id>")
@token_required
@permission_required("mantenimiento", "update")
def update_mantenimiento(mantenimiento_id: int):
    ensure_mantenimientos_schema()
    data = _normalize_mantenimiento_payload(request.get_json(silent=True))
    if not data["id_equipo"]:
        return jsonify({"message": "Selecciona un equipo"}), 400
    if not data["fecha_programada"]:
        return jsonify({"message": "La fecha programada es obligatoria"}), 400

    result = db.session.execute(
        text(
            """
            UPDATE mantenimientos
            SET id_equipo = :id_equipo,
                tipo = :tipo,
                fecha_programada = :fecha_programada,
                fecha_realizado = :fecha_realizado,
                tecnico_proveedor = :tecnico_proveedor,
                estado = :estado,
                observaciones = :observaciones,
                id_responsable = :id_responsable
            WHERE id = :id
            """
        ),
        {**data, "id": mantenimiento_id},
    )
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Mantenimiento no encontrado"}), 404
    return jsonify({"message": "Mantenimiento actualizado"}), 200


@inventory_bp.delete("/mantenimientos/<int:mantenimiento_id>")
@token_required
@permission_required("mantenimiento", "delete")
def delete_mantenimiento(mantenimiento_id: int):
    ensure_mantenimientos_schema()
    try:
        result = db.session.execute(text("DELETE FROM mantenimientos WHERE id = :id"), {"id": mantenimiento_id})
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "No se puede eliminar porque tiene reportes relacionados"}), 409

    if result.rowcount == 0:
        return jsonify({"message": "Mantenimiento no encontrado"}), 404
    return jsonify({"message": "Mantenimiento eliminado"}), 200
