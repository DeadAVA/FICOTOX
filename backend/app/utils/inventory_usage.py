from __future__ import annotations

from sqlalchemy import text

from app.extensions import db
from app.utils.schema import is_sqlite


def ensure_movimientos_schema() -> None:
    db.session.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS movimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo VARCHAR(20) NOT NULL,
                tabla_origen VARCHAR(40) NOT NULL,
                id_item INTEGER NOT NULL,
                cantidad REAL NOT NULL DEFAULT 0,
                motivo TEXT,
                referencia VARCHAR(120) UNIQUE,
                id_usuario INTEGER DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
            if is_sqlite()
            else
            """
            CREATE TABLE IF NOT EXISTS movimientos (
                id INT NOT NULL AUTO_INCREMENT,
                tipo VARCHAR(20) NOT NULL,
                tabla_origen VARCHAR(40) NOT NULL,
                id_item INT NOT NULL,
                cantidad DECIMAL(12,4) NOT NULL DEFAULT 0,
                motivo TEXT,
                referencia VARCHAR(120) UNIQUE,
                id_usuario INT DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
    )


def _to_float(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None
    return amount if amount > 0 else None


def _resolve_item_id(table_name: str, value) -> int | None:
    if value in (None, ""):
        return None
    value = str(value).strip()
    if not value:
        return None
    if value.isdigit():
        row = db.session.execute(
            text(f"SELECT id FROM {table_name} WHERE id = :id LIMIT 1"),
            {"id": int(value)},
        ).mappings().first()
        if row:
            return int(row["id"])

    if table_name == "reactivos":
        query = """
            SELECT id FROM reactivos
            WHERE id_interno = :value
               OR catalogo_parte_cas_lote = :value
               OR catalogo = :value
               OR lot_number = :value
               OR numero_cas = :value
               OR cas_number = :value
               OR producto = :value
               OR nombre = :value
            LIMIT 1
        """
    else:
        query = """
            SELECT id FROM consumibles
            WHERE catalogo_parte_cas = :value
               OR producto = :value
            LIMIT 1
        """
    row = db.session.execute(text(query), {"value": value}).mappings().first()
    return int(row["id"]) if row else None


def _movement_exists(reference: str) -> bool:
    if not reference:
        return False
    existing = db.session.execute(
        text("SELECT id FROM movimientos WHERE referencia = :referencia LIMIT 1"),
        {"referencia": reference},
    ).scalar()
    return bool(existing)


def consume_reactivo(reference_value, cantidad, *, user_id: int | None, motivo: str, referencia: str) -> bool:
    from app.modules.inventory.endpoints import ensure_reactivos_schema

    ensure_reactivos_schema()
    ensure_movimientos_schema()
    item_id = _resolve_item_id("reactivos", reference_value)
    amount = _to_float(cantidad)
    if not item_id or not amount or _movement_exists(referencia):
        return False

    db.session.execute(
        text(
            """
            UPDATE reactivos
            SET cantidad_actual = COALESCE(cantidad_actual, 0) - :cantidad,
                amount_in_stock = CASE
                    WHEN amount_in_stock IS NULL THEN amount_in_stock
                    ELSE amount_in_stock - :cantidad
                END
            WHERE id = :id
            """
        ),
        {"id": item_id, "cantidad": amount},
    )
    _insert_movement("reactivos", item_id, amount, user_id, motivo, referencia)
    return True


def consume_consumible(reference_value, cantidad, *, user_id: int | None, motivo: str, referencia: str) -> bool:
    from app.modules.inventory.consumables import ensure_consumibles_schema

    ensure_consumibles_schema()
    ensure_movimientos_schema()
    item_id = _resolve_item_id("consumibles", reference_value)
    amount = _to_float(cantidad)
    if not item_id or not amount or _movement_exists(referencia):
        return False

    db.session.execute(
        text(
            """
            UPDATE consumibles
            SET piezas = COALESCE(piezas, 0) - :cantidad
            WHERE id = :id
            """
        ),
        {"id": item_id, "cantidad": amount},
    )
    _insert_movement("consumibles", item_id, amount, user_id, motivo, referencia)
    return True


def _insert_movement(table_name: str, item_id: int, cantidad: float, user_id: int | None, motivo: str, referencia: str) -> None:
    db.session.execute(
        text(
            """
            INSERT INTO movimientos (
                tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario
            )
            VALUES (
                'salida', :tabla_origen, :id_item, :cantidad, :motivo, :referencia, :id_usuario
            )
            """
        ),
        {
            "tabla_origen": table_name,
            "id_item": item_id,
            "cantidad": cantidad,
            "motivo": motivo,
            "referencia": referencia,
            "id_usuario": user_id,
        },
    )
