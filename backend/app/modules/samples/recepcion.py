import json

from flask import Blueprint, g, jsonify, request
from sqlalchemy import text

from app.extensions import db
from app.utils.auth import token_required
from app.utils.rbac import permission_required
from app.utils.schema import add_column_if_missing
from app.utils.schema import is_sqlite

samples_recepcion_bp = Blueprint("samples_recepcion", __name__, url_prefix="/api/samples/reception")


def ensure_samples_recepcion_schema():
	db.session.execute(
		text(
			"""
			CREATE TABLE IF NOT EXISTS muestras_recepcion (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				folio_num INTEGER NOT NULL UNIQUE,
				tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',
				clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',
				fecha_emision DATE DEFAULT NULL,
				fecha_recepcion DATE DEFAULT NULL,
				hora_recepcion VARCHAR(20) DEFAULT NULL,
				recibido_por VARCHAR(150) DEFAULT NULL,
				medio_recepcion VARCHAR(50) DEFAULT NULL,
				solicitante VARCHAR(180) DEFAULT NULL,
				muestra_unica INTEGER DEFAULT 0,
				fecha_muestra DATE DEFAULT NULL,
				id_interno VARCHAR(100) DEFAULT NULL,
				especificaciones TEXT,
				lote_muestras_json TEXT,
				analisis_json TEXT,
				inspeccion_json TEXT,
				datos_solicitante_json TEXT,
				datos_custodio_json TEXT,
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
			CREATE TABLE IF NOT EXISTS muestras_recepcion (
				id INT NOT NULL AUTO_INCREMENT,
				folio_num INT NOT NULL,
				tipo_registro VARCHAR(2) NOT NULL DEFAULT 'R',
				clave_revision VARCHAR(50) DEFAULT 'FX-TCF-GMR',
				fecha_emision DATE DEFAULT NULL,
				fecha_recepcion DATE DEFAULT NULL,
				hora_recepcion VARCHAR(20) DEFAULT NULL,
				recibido_por VARCHAR(150) DEFAULT NULL,
				medio_recepcion VARCHAR(50) DEFAULT NULL,
				solicitante VARCHAR(180) DEFAULT NULL,
				muestra_unica TINYINT(1) DEFAULT 0,
				fecha_muestra DATE DEFAULT NULL,
				id_interno VARCHAR(100) DEFAULT NULL,
				especificaciones TEXT,
				lote_muestras_json LONGTEXT,
				analisis_json LONGTEXT,
				inspeccion_json LONGTEXT,
				datos_solicitante_json LONGTEXT,
				datos_custodio_json LONGTEXT,
				estado VARCHAR(30) NOT NULL DEFAULT 'registrada',
				creado_por INT DEFAULT NULL,
				actualizado_por INT DEFAULT NULL,
				creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
				actualizado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				UNIQUE KEY uq_muestras_recepcion_folio_num (folio_num),
				KEY idx_muestras_recepcion_creado_por (creado_por),
				KEY idx_muestras_recepcion_actualizado_por (actualizado_por),
				CONSTRAINT fk_muestras_recepcion_creado_por FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
				CONSTRAINT fk_muestras_recepcion_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
			"""
		)
	)
	add_column_if_missing(
		"muestras_recepcion",
		"recibido_por",
		"VARCHAR(150) DEFAULT NULL",
	)
	add_column_if_missing(
		"muestras_recepcion",
		"medio_recepcion",
		"VARCHAR(50) DEFAULT NULL",
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
	row = db.session.execute(text("SELECT COALESCE(MAX(folio_num), 0) + 1 AS next_folio FROM muestras_recepcion")).mappings().first()
	return int((row or {}).get("next_folio", 1))


def _serialize_row(row):
	item = dict(row)
	item["lote_muestras"] = _safe_json_load(item.pop("lote_muestras_json", None), [])
	item["analisis"] = _safe_json_load(item.pop("analisis_json", None), {})
	item["inspeccion"] = _safe_json_load(item.pop("inspeccion_json", None), {})
	item["datos_solicitante"] = _safe_json_load(item.pop("datos_solicitante_json", None), {})
	item["datos_custodio"] = _safe_json_load(item.pop("datos_custodio_json", None), {})
	return item


def _normalize_payload(raw):
	payload = raw or {}
	return {
		"folio_num": _to_int_or_none(payload.get("folio_num")),
		"tipo_registro": (payload.get("tipo_registro") or "R").strip()[:2],
		"clave_revision": (payload.get("clave_revision") or "FX-TCF-GMR").strip()[:50],
		"fecha_emision": payload.get("fecha_emision") or None,
		"fecha_recepcion": payload.get("fecha_recepcion") or None,
		"hora_recepcion": (payload.get("hora_recepcion") or "").strip()[:20] or None,
		"recibido_por": (payload.get("recibido_por") or "").strip()[:150] or None,
		"medio_recepcion": (payload.get("medio_recepcion") or "").strip()[:50] or None,
		"solicitante": (payload.get("solicitante") or "").strip()[:180] or None,
		"muestra_unica": 1 if payload.get("muestra_unica") else 0,
		"fecha_muestra": payload.get("fecha_muestra") or None,
		"id_interno": (payload.get("id_interno") or "").strip()[:100] or None,
		"especificaciones": (payload.get("especificaciones") or "").strip() or None,
		"lote_muestras_json": _json_text(payload.get("lote_muestras") or []),
		"analisis_json": _json_text(payload.get("analisis") or {}),
		"inspeccion_json": _json_text(payload.get("inspeccion") or {}),
		"datos_solicitante_json": _json_text(payload.get("datos_solicitante") or {}),
		"datos_custodio_json": _json_text(payload.get("datos_custodio") or {}),
		"estado": (payload.get("estado") or "registrada").strip()[:30] or "registrada",
	}


@samples_recepcion_bp.get("/next-folio")
@token_required
@permission_required("muestras", "read")
def get_next_folio():
	ensure_samples_recepcion_schema()
	return jsonify({"next_folio": _next_folio_num()}), 200


@samples_recepcion_bp.get("/")
@token_required
@permission_required("muestras", "read")
def list_reception_samples():
	ensure_samples_recepcion_schema()
	search = (request.args.get("search") or "").strip()

	rows = db.session.execute(
		text(
			"""
			SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
				     fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
				     solicitante, id_interno, estado, creado_en
			FROM muestras_recepcion
			WHERE :search = ''
			   OR solicitante LIKE :search_like
			   OR recibido_por LIKE :search_like
			   OR id_interno LIKE :search_like
			ORDER BY folio_num DESC
			LIMIT 400
			"""
		),
		{"search": search, "search_like": f"%{search}%"},
	).mappings().all()

	return jsonify({"items": [dict(r) for r in rows], "total": len(rows)}), 200


@samples_recepcion_bp.get("/<int:sample_id>")
@token_required
@permission_required("muestras", "read")
def get_reception_sample(sample_id: int):
	ensure_samples_recepcion_schema()
	row = db.session.execute(
		text(
			"""
			SELECT id, folio_num, tipo_registro, clave_revision, fecha_emision,
				   fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
				   solicitante, muestra_unica,
				   fecha_muestra, id_interno, especificaciones,
				   lote_muestras_json, analisis_json, inspeccion_json,
				   datos_solicitante_json, datos_custodio_json,
				   estado, creado_en, actualizado_en
			FROM muestras_recepcion
			WHERE id = :id
			"""
		),
		{"id": sample_id},
	).mappings().first()

	if not row:
		return jsonify({"message": "Registro no encontrado"}), 404

	return jsonify({"item": _serialize_row(row)}), 200


@samples_recepcion_bp.post("/")
@token_required
@permission_required("muestras", "create")
def create_reception_sample():
	ensure_samples_recepcion_schema()
	data = _normalize_payload(request.get_json(silent=True))

	if not data["folio_num"]:
		data["folio_num"] = _next_folio_num()

	current_user = getattr(g, "current_user", {}) or {}
	user_id = _to_int_or_none(current_user.get("sub"))

	try:
		result = db.session.execute(
			text(
				"""
				INSERT INTO muestras_recepcion (
					folio_num, tipo_registro, clave_revision, fecha_emision,
						fecha_recepcion, hora_recepcion, recibido_por, medio_recepcion,
						solicitante, muestra_unica,
					fecha_muestra, id_interno, especificaciones,
					lote_muestras_json, analisis_json, inspeccion_json,
					datos_solicitante_json, datos_custodio_json, estado,
					creado_por, actualizado_por
				) VALUES (
					:folio_num, :tipo_registro, :clave_revision, :fecha_emision,
						:fecha_recepcion, :hora_recepcion, :recibido_por, :medio_recepcion,
						:solicitante, :muestra_unica,
					:fecha_muestra, :id_interno, :especificaciones,
					:lote_muestras_json, :analisis_json, :inspeccion_json,
					:datos_solicitante_json, :datos_custodio_json, :estado,
					:creado_por, :actualizado_por
				)
				"""
			),
			{**data, "creado_por": user_id, "actualizado_por": user_id},
		)
		db.session.commit()
		return jsonify({"message": "Recepcion de muestra creada", "id": result.lastrowid}), 201
	except Exception as exc:
		db.session.rollback()
		if "uq_muestras_recepcion_folio_num" in str(exc):
			return jsonify({"message": "El folio ya existe"}), 409
		raise


@samples_recepcion_bp.put("/<int:sample_id>")
@token_required
@permission_required("muestras", "update")
def update_reception_sample(sample_id: int):
	ensure_samples_recepcion_schema()
	data = _normalize_payload(request.get_json(silent=True))
	if not data["folio_num"]:
		return jsonify({"message": "El folio es obligatorio"}), 400

	current_user = getattr(g, "current_user", {}) or {}
	user_id = _to_int_or_none(current_user.get("sub"))

	try:
		result = db.session.execute(
			text(
				"""
				UPDATE muestras_recepcion
				SET folio_num = :folio_num,
					tipo_registro = :tipo_registro,
					clave_revision = :clave_revision,
					fecha_emision = :fecha_emision,
					fecha_recepcion = :fecha_recepcion,
					hora_recepcion = :hora_recepcion,
					recibido_por = :recibido_por,
					medio_recepcion = :medio_recepcion,
					solicitante = :solicitante,
					muestra_unica = :muestra_unica,
					fecha_muestra = :fecha_muestra,
					id_interno = :id_interno,
					especificaciones = :especificaciones,
					lote_muestras_json = :lote_muestras_json,
					analisis_json = :analisis_json,
					inspeccion_json = :inspeccion_json,
					datos_solicitante_json = :datos_solicitante_json,
					datos_custodio_json = :datos_custodio_json,
					estado = :estado,
					actualizado_por = :actualizado_por
				WHERE id = :id
				"""
			),
			{**data, "id": sample_id, "actualizado_por": user_id},
		)
		db.session.commit()
		if result.rowcount == 0:
			return jsonify({"message": "Registro no encontrado"}), 404
		return jsonify({"message": "Recepcion de muestra actualizada"}), 200
	except Exception as exc:
		db.session.rollback()
		if "uq_muestras_recepcion_folio_num" in str(exc):
			return jsonify({"message": "El folio ya existe"}), 409
		raise


@samples_recepcion_bp.delete("/<int:sample_id>")
@token_required
@permission_required("muestras", "delete")
def delete_reception_sample(sample_id: int):
	ensure_samples_recepcion_schema()
	result = db.session.execute(text("DELETE FROM muestras_recepcion WHERE id = :id"), {"id": sample_id})
	db.session.commit()
	if result.rowcount == 0:
		return jsonify({"message": "Registro no encontrado"}), 404
	return jsonify({"message": "Recepcion de muestra eliminada"}), 200
