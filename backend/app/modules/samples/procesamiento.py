import json

from flask import g, jsonify, request, Blueprint
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required

samples_procesamiento_bp = Blueprint("samples_procesamiento", __name__, url_prefix="/api/samples/processing")


def ensure_samples_procesamiento_schema():
	db.session.execute(
		text(
			"""
			CREATE TABLE IF NOT EXISTS muestras_procesamiento (
				id INT NOT NULL AUTO_INCREMENT,
				folio_num INT NOT NULL,
				tipo_registro VARCHAR(2) NOT NULL DEFAULT 'P',
				clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMP',
				fecha_emision DATE DEFAULT NULL,
				fecha_procesamiento DATE DEFAULT NULL,
				hora_procesamiento VARCHAR(20) DEFAULT NULL,
				recepcion_id INT DEFAULT NULL,
				folio_recepcion_num INT DEFAULT NULL,
				muestra_tipo VARCHAR(20) DEFAULT NULL,
				id_interno VARCHAR(100) DEFAULT NULL,
				lote_seleccion_json LONGTEXT,
				tipo_organismo_json LONGTEXT,
				parte_organismo_json LONGTEXT,
				bivalvos_steps_json LONGTEXT,
				sardinas_steps_json LONGTEXT,
				otro_procesamiento TEXT,
				resguardo_json LONGTEXT,
				observaciones_generales TEXT,
				nombre_quien_proceso VARCHAR(180) DEFAULT NULL,
				nombre_quien_superviso VARCHAR(180) DEFAULT NULL,
				estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
				creado_por INT DEFAULT NULL,
				actualizado_por INT DEFAULT NULL,
				creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
				actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				UNIQUE KEY uq_muestras_procesamiento_folio_num (folio_num),
				KEY idx_muestras_procesamiento_recepcion_id (recepcion_id),
				KEY idx_muestras_procesamiento_creado_por (creado_por),
				KEY idx_muestras_procesamiento_actualizado_por (actualizado_por),
				CONSTRAINT fk_muestras_procesamiento_recepcion FOREIGN KEY (recepcion_id) REFERENCES muestras_recepcion(id) ON DELETE SET NULL,
				CONSTRAINT fk_muestras_procesamiento_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
				CONSTRAINT fk_muestras_procesamiento_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
			"""
		)
	)
	db.session.execute(
		text(
			"""
			ALTER TABLE muestras_procesamiento
			ADD COLUMN IF NOT EXISTS lote_seleccion_json LONGTEXT AFTER id_interno
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
	row = db.session.execute(text("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_procesamiento")).mappings().first()
	return int((row or {}).get("next_folio", 1))


def _normalize_payload(raw):
	payload = raw or {}
	return {
		"folio_num": _to_int_or_none(payload.get("folio_num")),
		"tipo_registro": (payload.get("tipo_registro") or "P").strip()[:2],
		"clave_revision": (payload.get("clave_revision") or "FX-TCF-GMP").strip()[:50],
		"fecha_emision": payload.get("fecha_emision") or None,
		"fecha_procesamiento": payload.get("fecha_procesamiento") or None,
		"hora_procesamiento": (payload.get("hora_procesamiento") or "").strip()[:20] or None,
		"recepcion_id": _to_int_or_none(payload.get("recepcion_id")),
		"folio_recepcion_num": _to_int_or_none(payload.get("folio_recepcion_num")),
		"muestra_tipo": (payload.get("muestra_tipo") or "").strip()[:20] or None,
		"id_interno": (payload.get("id_interno") or "").strip()[:100] or None,
		"lote_seleccion_json": _json_text(payload.get("lote_seleccion") or []),
		"tipo_organismo_json": _json_text(payload.get("tipo_organismo") or []),
		"parte_organismo_json": _json_text(payload.get("parte_organismo") or []),
		"bivalvos_steps_json": _json_text(payload.get("bivalvos_steps") or []),
		"sardinas_steps_json": _json_text(payload.get("sardinas_steps") or []),
		"otro_procesamiento": (payload.get("otro_procesamiento") or "").strip() or None,
		"resguardo_json": _json_text(payload.get("resguardo") or {}),
		"observaciones_generales": (payload.get("observaciones_generales") or "").strip() or None,
		"nombre_quien_proceso": (payload.get("nombre_quien_proceso") or "").strip()[:180] or None,
		"nombre_quien_superviso": (payload.get("nombre_quien_superviso") or "").strip()[:180] or None,
		"estado": (payload.get("estado") or "registrada").strip()[:30] or "registrada",
	}


def _serialize_row(row):
	item = dict(row)
	item["tipo_organismo"] = _safe_json_load(item.pop("tipo_organismo_json", None), [])
	item["parte_organismo"] = _safe_json_load(item.pop("parte_organismo_json", None), [])
	item["lote_seleccion"] = _safe_json_load(item.pop("lote_seleccion_json", None), [])
	item["bivalvos_steps"] = _safe_json_load(item.pop("bivalvos_steps_json", None), [])
	item["sardinas_steps"] = _safe_json_load(item.pop("sardinas_steps_json", None), [])
	item["resguardo"] = _safe_json_load(item.pop("resguardo_json", None), {})
	return item


@samples_procesamiento_bp.get("/next-folio")
@token_required
@permission_required("muestras", "read")
def get_next_folio():
	ensure_samples_procesamiento_schema()
	return jsonify({"next_folio": _next_folio_num()}), 200


@samples_procesamiento_bp.get("/")
@token_required
@permission_required("muestras", "read")
def list_processing_samples():
	ensure_samples_procesamiento_schema()
	search = (request.args.get("search") or "").strip()
	rows = db.session.execute(
		text(
			"""
			SELECT p.id, p.folio_num, p.tipo_registro, p.fecha_procesamiento,
				   p.hora_procesamiento, p.folio_recepcion_num, p.id_interno,
				   p.estado, p.nombre_quien_proceso, p.creado_en
			FROM muestras_procesamiento p
			WHERE :search = ''
			   OR p.id_interno LIKE :search_like
			   OR CAST(p.folio_num AS CHAR) LIKE :search_like
			   OR CAST(COALESCE(p.folio_recepcion_num, 0) AS CHAR) LIKE :search_like
			ORDER BY p.folio_num DESC
			LIMIT 400
			"""
		),
		{"search": search, "search_like": f"%{search}%"},
	).mappings().all()
	return jsonify({"items": [dict(r) for r in rows], "total": len(rows)}), 200


@samples_procesamiento_bp.get("/<int:processing_id>")
@token_required
@permission_required("muestras", "read")
def get_processing_sample(processing_id: int):
	ensure_samples_procesamiento_schema()
	row = db.session.execute(
		text(
			"""
			SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
				   fecha_procesamiento, hora_procesamiento, recepcion_id,
				   folio_recepcion_num, muestra_tipo, id_interno,
				   lote_seleccion_json,
				   tipo_organismo_json, parte_organismo_json,
				   bivalvos_steps_json, sardinas_steps_json,
				   otro_procesamiento, resguardo_json,
				   observaciones_generales, nombre_quien_proceso,
				   nombre_quien_superviso, estado, creado_en, actualizado_en
			FROM muestras_procesamiento
			WHERE id = :id
			"""
		),
		{"id": processing_id},
	).mappings().first()
	if not row:
		return jsonify({"message": "Registro no encontrado"}), 404
	return jsonify({"item": _serialize_row(row)}), 200


@samples_procesamiento_bp.post("/")
@token_required
@permission_required("muestras", "create")
def create_processing_sample():
	ensure_samples_procesamiento_schema()
	data = _normalize_payload(request.get_json(silent=True))
	if not data["folio_num"]:
		data["folio_num"] = _next_folio_num()

	current_user = getattr(g, "current_user", {}) or {}
	user_id = _to_int_or_none(current_user.get("sub"))

	try:
		result = db.session.execute(
			text(
				"""
				INSERT INTO muestras_procesamiento (
					folio_num, tipo_registro, clave_revision, fecha_emision,
					fecha_procesamiento, hora_procesamiento, recepcion_id,
					folio_recepcion_num, muestra_tipo, id_interno,
					lote_seleccion_json,
					tipo_organismo_json, parte_organismo_json,
					bivalvos_steps_json, sardinas_steps_json,
					otro_procesamiento, resguardo_json,
					observaciones_generales, nombre_quien_proceso,
					nombre_quien_superviso, estado, creado_por, actualizado_por
				) VALUES (
					:folio_num, :tipo_registro, :clave_revision, :fecha_emision,
					:fecha_procesamiento, :hora_procesamiento, :recepcion_id,
					:folio_recepcion_num, :muestra_tipo, :id_interno,
					:lote_seleccion_json,
					:tipo_organismo_json, :parte_organismo_json,
					:bivalvos_steps_json, :sardinas_steps_json,
					:otro_procesamiento, :resguardo_json,
					:observaciones_generales, :nombre_quien_proceso,
					:nombre_quien_superviso, :estado, :creado_por, :actualizado_por
				)
				"""
			),
			{**data, "creado_por": user_id, "actualizado_por": user_id},
		)
		db.session.commit()
		return jsonify({"message": "Procesamiento creado", "id": result.lastrowid}), 201
	except Exception as exc:
		db.session.rollback()
		if "uq_muestras_procesamiento_folio_num" in str(exc):
			return jsonify({"message": "El folio de procesamiento ya existe"}), 409
		raise


@samples_procesamiento_bp.put("/<int:processing_id>")
@token_required
@permission_required("muestras", "update")
def update_processing_sample(processing_id: int):
	ensure_samples_procesamiento_schema()
	data = _normalize_payload(request.get_json(silent=True))
	if not data["folio_num"]:
		return jsonify({"message": "El folio de procesamiento es obligatorio"}), 400

	current_user = getattr(g, "current_user", {}) or {}
	user_id = _to_int_or_none(current_user.get("sub"))

	try:
		result = db.session.execute(
			text(
				"""
				UPDATE muestras_procesamiento
				SET folio_num = :folio_num,
					tipo_registro = :tipo_registro,
					clave_revision = :clave_revision,
					fecha_emision = :fecha_emision,
					fecha_procesamiento = :fecha_procesamiento,
					hora_procesamiento = :hora_procesamiento,
					recepcion_id = :recepcion_id,
					folio_recepcion_num = :folio_recepcion_num,
					muestra_tipo = :muestra_tipo,
					id_interno = :id_interno,
					lote_seleccion_json = :lote_seleccion_json,
					tipo_organismo_json = :tipo_organismo_json,
					parte_organismo_json = :parte_organismo_json,
					bivalvos_steps_json = :bivalvos_steps_json,
					sardinas_steps_json = :sardinas_steps_json,
					otro_procesamiento = :otro_procesamiento,
					resguardo_json = :resguardo_json,
					observaciones_generales = :observaciones_generales,
					nombre_quien_proceso = :nombre_quien_proceso,
					nombre_quien_superviso = :nombre_quien_superviso,
					estado = :estado,
					actualizado_por = :actualizado_por
				WHERE id = :id
				"""
			),
			{**data, "id": processing_id, "actualizado_por": user_id},
		)
		db.session.commit()
		if result.rowcount == 0:
			return jsonify({"message": "Registro no encontrado"}), 404
		return jsonify({"message": "Procesamiento actualizado"}), 200
	except Exception as exc:
		db.session.rollback()
		if "uq_muestras_procesamiento_folio_num" in str(exc):
			return jsonify({"message": "El folio de procesamiento ya existe"}), 409
		raise


@samples_procesamiento_bp.delete("/<int:processing_id>")
@token_required
@permission_required("muestras", "delete")
def delete_processing_sample(processing_id: int):
	ensure_samples_procesamiento_schema()
	result = db.session.execute(text("DELETE FROM muestras_procesamiento WHERE id = :id"), {"id": processing_id})
	db.session.commit()
	if result.rowcount == 0:
		return jsonify({"message": "Registro no encontrado"}), 404
	return jsonify({"message": "Procesamiento eliminado"}), 200
