import json

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
    "tipo_reactivo",
    "producto",
    "nombre",
    "marca",
    "proveedor",
    "catalogo_parte_cas_lote",
    "localizacion",
    "sub_localizacion",
    "caducidad",
    "fecha_apertura",
    "fecha_ingreso",
    "contenedor",
    "capacidad_litros",
    "capacidad_kilos",
    "piezas",
    "lote",
    "parte",
    "serie",
    "descripcion",
    "nuevo_usado",
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
    "catalogo",
    "amount_in_stock",
    "expiration_date",
    "cas_number",
    "bottle_tag_color",
    "date_opened",
    "formula",
    "id_interno",
    "physical_state",
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
        ("producto", "VARCHAR(180) DEFAULT NULL"),
        ("marca", "VARCHAR(120) DEFAULT NULL"),
        ("proveedor", "VARCHAR(180) DEFAULT NULL"),
        ("catalogo_parte_cas_lote", "VARCHAR(180) DEFAULT NULL"),
        ("localizacion", "VARCHAR(180) DEFAULT NULL"),
        ("sub_localizacion", "VARCHAR(180) DEFAULT NULL"),
        ("caducidad", "DATE DEFAULT NULL"),
        ("fecha_apertura", "DATE DEFAULT NULL"),
        ("fecha_ingreso", "DATE DEFAULT NULL"),
        ("contenedor", "VARCHAR(120) DEFAULT NULL"),
        ("capacidad_litros", "DECIMAL(12,4) DEFAULT NULL"),
        ("capacidad_kilos", "DECIMAL(12,4) DEFAULT NULL"),
        ("piezas", "INT DEFAULT NULL"),
        ("lote", "VARCHAR(120) DEFAULT NULL"),
        ("parte", "VARCHAR(120) DEFAULT NULL"),
        ("serie", "VARCHAR(120) DEFAULT NULL"),
        ("descripcion", "TEXT"),
        ("nuevo_usado", "VARCHAR(30) DEFAULT NULL"),
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
    numero_cas = (payload.get("cas_number") or payload.get("numero_cas") or payload.get("catalogo_parte_cas_lote") or "").strip()[:120] or None
    ubicacion = (payload.get("localizacion") or payload.get("ubicacion") or payload.get("sub_localizacion") or "").strip()[:180] or None
    fecha_vencimiento = payload.get("caducidad") or payload.get("expiration_date") or payload.get("fecha_vencimiento") or None
    amount = _to_float_or_none(payload.get("amount_in_stock"))
    piezas = _to_int_or_none(payload.get("piezas"))
    capacidad_litros = _to_float_or_none(payload.get("capacidad_litros"))
    capacidad_kilos = _to_float_or_none(payload.get("capacidad_kilos"))
    cantidad_actual = amount if amount is not None else piezas if piezas is not None else capacidad_litros if capacidad_litros is not None else capacidad_kilos
    unidad = payload.get("unidad") or ("piezas" if piezas is not None else "L" if capacidad_litros is not None else "kg" if capacidad_kilos is not None else None)

    data = {column: payload.get(column) for column in REACTIVO_COLUMNS}
    data.update(
        {
            "tipo_reactivo": tipo,
            "producto": producto,
            "nombre": producto,
            "numero_cas": numero_cas,
            "categoria": tipo,
            "cantidad_actual": cantidad_actual,
            "unidad": unidad,
            "ubicacion": ubicacion,
            "fecha_vencimiento": fecha_vencimiento,
            "stock_minimo": _to_float_or_none(payload.get("stock_minimo")) or 0,
            "capacidad_litros": capacidad_litros,
            "capacidad_kilos": capacidad_kilos,
            "piezas": piezas,
            "amount_in_stock": amount,
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
            SELECT id, tipo_reactivo, producto, nombre, marca, proveedor,
                   catalogo_parte_cas_lote, localizacion, sub_localizacion,
                   caducidad, fecha_apertura, fecha_ingreso, contenedor,
                   capacidad_litros, capacidad_kilos, piezas, lote, parte,
                   serie, descripcion, nuevo_usado, metodo, observaciones,
                   item_name, informacion_extra, nombre_crm, lot_number, url,
                   estado_reactivo, volumen, vendor, catalogo, amount_in_stock,
                   expiration_date, cas_number, bottle_tag_color, date_opened,
                   formula, id_interno, physical_state, presentacion,
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
            SELECT id, referencia, tipo, tabla_origen, id_item, cantidad, motivo, fecha_hora
            FROM movimientos
            ORDER BY fecha_hora DESC
            LIMIT 200
            """
        )
    ).mappings().all()

    return jsonify({"items": [dict(row) for row in rows], "total": len(rows)}), 200


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
