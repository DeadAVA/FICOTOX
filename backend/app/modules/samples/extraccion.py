import json

from flask import Blueprint, g, jsonify, request
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.inventory_usage import consume_consumible, consume_reactivo, restore_inventory_usage
from app.utils.rbac import permission_required
from app.utils.schema import is_sqlite

samples_extraccion_bp = Blueprint("samples_extraccion", __name__, url_prefix="/api/samples/extraction")


def ensure_samples_extraccion_schema():
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS muestras_extraccion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio_num INTEGER NOT NULL UNIQUE,
                tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',
                clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',
                fecha_emision DATE DEFAULT NULL,
                fecha_extraccion DATE DEFAULT NULL,
                hora_extraccion VARCHAR(20) DEFAULT NULL,
                procesamiento_id INTEGER DEFAULT NULL,
                folio_procesamiento_num INTEGER DEFAULT NULL,
                muestra_tipo VARCHAR(20) DEFAULT NULL,
                id_interno VARCHAR(100) DEFAULT NULL,
                tipo_molienda VARCHAR(20) DEFAULT NULL,
                pasos_json TEXT,
                registro_pesos_json TEXT,
                observaciones_generales TEXT,
                nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,
                nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,
                nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
                firma_quien_extrajo TEXT,
                firma_quien_limpieza TEXT,
                firma_quien_superviso TEXT,
                estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
                creado_por INTEGER DEFAULT NULL,
                actualizado_por INTEGER DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS muestras_extraccion (
                id INT NOT NULL AUTO_INCREMENT,
                folio_num INT NOT NULL,
                tipo_registro VARCHAR(4) NOT NULL DEFAULT 'E-A',
                clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GME-A',
                fecha_emision DATE DEFAULT NULL,
                fecha_extraccion DATE DEFAULT NULL,
                hora_extraccion VARCHAR(20) DEFAULT NULL,
                procesamiento_id INT DEFAULT NULL,
                folio_procesamiento_num INT DEFAULT NULL,
                muestra_tipo VARCHAR(20) DEFAULT NULL,
                id_interno VARCHAR(100) DEFAULT NULL,
                tipo_molienda VARCHAR(20) DEFAULT NULL,
                pasos_json LONGTEXT,
                registro_pesos_json LONGTEXT,
                observaciones_generales TEXT,
                nombre_quien_extrajo VARCHAR(180) DEFAULT NULL,
                nombre_quien_limpieza VARCHAR(180) DEFAULT NULL,
                nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
                firma_quien_extrajo LONGTEXT,
                firma_quien_limpieza LONGTEXT,
                firma_quien_superviso LONGTEXT,
                estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
                creado_por INT DEFAULT NULL,
                actualizado_por INT DEFAULT NULL,
                creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_muestras_extraccion_folio_num (folio_num),
                KEY idx_muestras_extraccion_procesamiento_id (procesamiento_id),
                KEY idx_muestras_extraccion_creado_por (creado_por),
                KEY idx_muestras_extraccion_actualizado_por (actualizado_por),
                CONSTRAINT fk_muestras_extraccion_procesamiento FOREIGN KEY (procesamiento_id) REFERENCES muestras_procesamiento(id) ON DELETE SET NULL,
                CONSTRAINT fk_muestras_extraccion_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
                CONSTRAINT fk_muestras_extraccion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            """
        )
    )
    from app.utils.schema import add_column_if_missing
    add_column_if_missing("muestras_extraccion", "nombre_quien_limpieza", "VARCHAR(180) DEFAULT NULL AFTER `nombre_quien_extrajo`")
    add_column_if_missing("muestras_extraccion", "firma_quien_extrajo", "LONGTEXT AFTER `nombre_quien_superviso`")
    add_column_if_missing("muestras_extraccion", "firma_quien_limpieza", "LONGTEXT AFTER `firma_quien_extrajo`")
    add_column_if_missing("muestras_extraccion", "firma_quien_superviso", "LONGTEXT AFTER `firma_quien_limpieza`")
    add_column_if_missing("muestras_extraccion", "uso_inventario_json", "TEXT DEFAULT NULL")
    db.session.commit()


def _to_int_or_none(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _json_text(value):
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def _safe_json_load(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def _next_folio_num():
    row = db.session.execute(text("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_extraccion")).mappings().first()
    return int((row or {}).get("next_folio", 1))


def _normalize_payload(raw):
    payload = raw or {}
    return {
        "folio_num": _to_int_or_none(payload.get("folio_num")),
        "tipo_registro": (payload.get("tipo_registro") or "E-A").strip()[:4],
        "clave_revision": (payload.get("clave_revision") or "FX-TCF-GME-A").strip()[:50],
        "fecha_emision": payload.get("fecha_emision") or None,
        "fecha_extraccion": payload.get("fecha_extraccion") or None,
        "hora_extraccion": (payload.get("hora_extraccion") or "").strip()[:20] or None,
        "procesamiento_id": _to_int_or_none(payload.get("procesamiento_id")),
        "folio_procesamiento_num": _to_int_or_none(payload.get("folio_procesamiento_num")),
        "muestra_tipo": (payload.get("muestra_tipo") or "").strip()[:20] or None,
        "id_interno": (payload.get("id_interno") or "").strip()[:100] or None,
        "tipo_molienda": (payload.get("tipo_molienda") or "").strip()[:20] or None,
        "pasos_json": _json_text(payload.get("pasos") or {}),
        "registro_pesos_json": _json_text(payload.get("registro_pesos") or []),
        "observaciones_generales": (payload.get("observaciones_generales") or "").strip() or None,
        "nombre_quien_extrajo": (payload.get("nombre_quien_extrajo") or "").strip()[:180] or None,
        "nombre_quien_limpieza": (payload.get("nombre_quien_limpieza") or "").strip()[:180] or None,
        "nombre_quien_superviso": (payload.get("nombre_quien_superviso") or "").strip()[:180] or None,
        "firma_quien_extrajo": (payload.get("firma_quien_extrajo") or "").strip() or None,
        "firma_quien_limpieza": (payload.get("firma_quien_limpieza") or "").strip() or None,
        "firma_quien_superviso": (payload.get("firma_quien_superviso") or "").strip() or None,
        "estado": (payload.get("estado") or "registrada").strip()[:30] or "registrada",
        "uso_inventario_json": _json_text(payload.get("uso_inventario") or []),
    }


def _apply_inventory_usage(extraction_id: int, data: dict, user_id: int | None) -> None:
    # Lista principal de insumos declarados en el formulario
    insumos = _safe_json_load(data.get("uso_inventario_json"), [])
    for idx, insumo in enumerate(insumos):
        if not isinstance(insumo, dict):
            continue
        tipo = str(insumo.get("tipo") or "").strip().lower()
        ref = insumo.get("ref") or insumo.get("nombre") or ""
        cantidad = insumo.get("cantidad") or 1
        if not ref:
            continue
        referencia_mov = f"EXT-{extraction_id}-INS-{idx}"
        if tipo == "reactivo":
            consume_reactivo(
                ref, cantidad,
                user_id=user_id,
                motivo=f"Extraccion de muestra folio {data.get('folio_num')}",
                referencia=referencia_mov,
            )
        elif tipo == "consumible":
            consume_consumible(
                ref, cantidad,
                user_id=user_id,
                motivo=f"Extraccion de muestra folio {data.get('folio_num')}",
                referencia=referencia_mov,
            )


def _replace_inventory_usage(extraction_id: int, data: dict, user_id: int | None) -> None:
    restore_inventory_usage(f"EXT-{extraction_id}-INS-")
    _apply_inventory_usage(extraction_id, data, user_id)


def _serialize_row(row):
    item = dict(row)
    item["pasos"] = _safe_json_load(item.pop("pasos_json", None), {})
    item["registro_pesos"] = _safe_json_load(item.pop("registro_pesos_json", None), [])
    item["uso_inventario"] = _safe_json_load(item.pop("uso_inventario_json", None), [])
    return item


@samples_extraccion_bp.get("/next-folio")
@token_required
@permission_required("muestras", "read")
def get_next_folio():
    ensure_samples_extraccion_schema()
    return jsonify({"next_folio": _next_folio_num()}), 200


@samples_extraccion_bp.get("/")
@token_required
@permission_required("muestras", "read")
def list_extraction_samples():
    ensure_samples_extraccion_schema()
    search = (request.args.get("search") or "").strip()
    rows = db.session.execute(
        text(
            """
            SELECT e.id, e.folio_num, e.tipo_registro, e.fecha_extraccion,
                   e.hora_extraccion, e.folio_procesamiento_num, e.id_interno,
                   e.estado, e.creado_en
            FROM muestras_extraccion e
            WHERE :search = ''
               OR e.id_interno LIKE :search_like
               OR CAST(e.folio_num AS CHAR) LIKE :search_like
               OR CAST(COALESCE(e.folio_procesamiento_num, 0) AS CHAR) LIKE :search_like
            ORDER BY e.folio_num DESC
            LIMIT 400
            """
        ),
        {"search": search, "search_like": f"%{search}%"},
    ).mappings().all()
    return jsonify({"items": [dict(r) for r in rows], "total": len(rows)}), 200


@samples_extraccion_bp.get("/<int:extraction_id>")
@token_required
@permission_required("muestras", "read")
def get_extraction_sample(extraction_id: int):
    ensure_samples_extraccion_schema()
    row = db.session.execute(
        text(
            """
            SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
                   fecha_extraccion, hora_extraccion, procesamiento_id,
                   folio_procesamiento_num, muestra_tipo, id_interno,
                   tipo_molienda, pasos_json, registro_pesos_json,
                   observaciones_generales, nombre_quien_extrajo,
                   nombre_quien_limpieza, nombre_quien_superviso,
                   firma_quien_extrajo, firma_quien_limpieza,
                   firma_quien_superviso, uso_inventario_json,
                   estado, creado_en, actualizado_en
            FROM muestras_extraccion
            WHERE id = :id
            """
        ),
        {"id": extraction_id},
    ).mappings().first()
    if not row:
        return jsonify({"message": "Registro no encontrado"}), 404
    return jsonify({"item": _serialize_row(row)}), 200


@samples_extraccion_bp.post("/")
@token_required
@permission_required("muestras", "create")
def create_extraction_sample():
    ensure_samples_extraccion_schema()
    data = _normalize_payload(request.get_json(silent=True))
    if not data["folio_num"]:
        data["folio_num"] = _next_folio_num()

    current_user = getattr(g, "current_user", {}) or {}
    user_id = _to_int_or_none(current_user.get("sub"))

    try:
        result = db.session.execute(
            text(
                """
                INSERT INTO muestras_extraccion (
                    folio_num, tipo_registro, clave_revision, fecha_emision,
                    fecha_extraccion, hora_extraccion, procesamiento_id,
                    folio_procesamiento_num, muestra_tipo, id_interno,
                    tipo_molienda, pasos_json, registro_pesos_json,
                    observaciones_generales, nombre_quien_extrajo,
                    nombre_quien_limpieza, nombre_quien_superviso,
                    firma_quien_extrajo, firma_quien_limpieza,
                    firma_quien_superviso, uso_inventario_json,
                    estado, creado_por, actualizado_por
                ) VALUES (
                    :folio_num, :tipo_registro, :clave_revision, :fecha_emision,
                    :fecha_extraccion, :hora_extraccion, :procesamiento_id,
                    :folio_procesamiento_num, :muestra_tipo, :id_interno,
                    :tipo_molienda, :pasos_json, :registro_pesos_json,
                    :observaciones_generales, :nombre_quien_extrajo,
                    :nombre_quien_limpieza, :nombre_quien_superviso,
                    :firma_quien_extrajo, :firma_quien_limpieza,
                    :firma_quien_superviso, :uso_inventario_json,
                    :estado, :creado_por, :actualizado_por
                )
                """
            ),
            {**data, "creado_por": user_id, "actualizado_por": user_id},
        )
        _apply_inventory_usage(result.lastrowid, data, user_id)
        db.session.commit()
        return jsonify({"message": "Extraccion creada", "id": result.lastrowid}), 201
    except Exception as exc:
        db.session.rollback()
        if "uq_muestras_extraccion_folio_num" in str(exc):
            return jsonify({"message": "El folio de extraccion ya existe"}), 409
        raise


@samples_extraccion_bp.put("/<int:extraction_id>")
@token_required
@permission_required("muestras", "update")
def update_extraction_sample(extraction_id: int):
    ensure_samples_extraccion_schema()
    data = _normalize_payload(request.get_json(silent=True))
    if not data["folio_num"]:
        return jsonify({"message": "El folio de extraccion es obligatorio"}), 400

    current_user = getattr(g, "current_user", {}) or {}
    user_id = _to_int_or_none(current_user.get("sub"))

    try:
        result = db.session.execute(
            text(
                """
                UPDATE muestras_extraccion
                SET folio_num = :folio_num,
                    tipo_registro = :tipo_registro,
                    clave_revision = :clave_revision,
                    fecha_emision = :fecha_emision,
                    fecha_extraccion = :fecha_extraccion,
                    hora_extraccion = :hora_extraccion,
                    procesamiento_id = :procesamiento_id,
                    folio_procesamiento_num = :folio_procesamiento_num,
                    muestra_tipo = :muestra_tipo,
                    id_interno = :id_interno,
                    tipo_molienda = :tipo_molienda,
                    pasos_json = :pasos_json,
                    registro_pesos_json = :registro_pesos_json,
                    observaciones_generales = :observaciones_generales,
                    nombre_quien_extrajo = :nombre_quien_extrajo,
                    nombre_quien_limpieza = :nombre_quien_limpieza,
                    nombre_quien_superviso = :nombre_quien_superviso,
                    firma_quien_extrajo = :firma_quien_extrajo,
                    firma_quien_limpieza = :firma_quien_limpieza,
                    firma_quien_superviso = :firma_quien_superviso,
                    uso_inventario_json = :uso_inventario_json,
                    estado = :estado,
                    actualizado_por = :actualizado_por
                WHERE id = :id
                """
            ),
            {**data, "id": extraction_id, "actualizado_por": user_id},
        )
        if result.rowcount == 0:
            db.session.rollback()
            return jsonify({"message": "Registro no encontrado"}), 404
        _replace_inventory_usage(extraction_id, data, user_id)
        db.session.commit()
        return jsonify({"message": "Extraccion actualizada"}), 200
    except Exception as exc:
        db.session.rollback()
        if "uq_muestras_extraccion_folio_num" in str(exc):
            return jsonify({"message": "El folio de extraccion ya existe"}), 409
        raise


@samples_extraccion_bp.delete("/<int:extraction_id>")
@token_required
@permission_required("muestras", "delete")
def delete_extraction_sample(extraction_id: int):
    ensure_samples_extraccion_schema()
    result = db.session.execute(text("DELETE FROM muestras_extraccion WHERE id = :id"), {"id": extraction_id})
    db.session.commit()
    if result.rowcount == 0:
        return jsonify({"message": "Registro no encontrado"}), 404
    return jsonify({"message": "Extraccion eliminada"}), 200
