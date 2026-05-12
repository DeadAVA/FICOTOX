import re

from sqlalchemy import text

from app.extensions import db

_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def is_sqlite() -> bool:
    return db.engine.dialect.name == "sqlite"


def _quote(identifier: str) -> str:
    if not _IDENTIFIER_RE.fullmatch(identifier or ""):
        raise ValueError(f"Identificador SQL invalido: {identifier!r}")
    return f'"{identifier}"' if is_sqlite() else f"`{identifier}`"


def _sqlite_column_definition(column_definition: str) -> str:
    definition = column_definition or "TEXT"
    definition = re.sub(r"\s+AFTER\s+`?[\w_]+`?", "", definition, flags=re.IGNORECASE)
    definition = re.sub(r"\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP", "", definition, flags=re.IGNORECASE)
    definition = re.sub(r"\bLONGTEXT\b", "TEXT", definition, flags=re.IGNORECASE)
    definition = re.sub(r"\bTINYINT\s*\(\s*1\s*\)", "INTEGER", definition, flags=re.IGNORECASE)
    definition = re.sub(r"\bDECIMAL\s*\([^)]+\)", "REAL", definition, flags=re.IGNORECASE)
    definition = re.sub(r"\bENUM\s*\([^)]+\)", "TEXT", definition, flags=re.IGNORECASE)
    definition = re.sub(r"`", "", definition)
    return definition.strip()


def get_table_columns(table_name: str) -> set[str]:
    table_name = _quote(table_name).strip('"`')
    if is_sqlite():
        rows = db.session.execute(text(f'PRAGMA table_info("{table_name}")')).mappings().all()
        return {row["name"] for row in rows}

    return set(
        db.session.execute(
            text(
                """
                SELECT COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = :table_name
                """
            ),
            {"table_name": table_name},
        ).scalars().all()
    )


def add_column_if_missing(table_name: str, column_name: str, column_definition: str) -> None:
    """Agrega una columna si no existe, con validacion de identificadores.

    Pseudocodigo:
    1. Validar nombre de tabla/columna contra patron seguro.
    2. Revisar columnas actuales.
    3. Adaptar definicion si el motor es SQLite.
    4. Ejecutar ALTER TABLE con identificadores escapados.
    """
    if column_name in get_table_columns(table_name):
        return

    if is_sqlite():
        column_definition = _sqlite_column_definition(column_definition)

    db.session.execute(
        text(f"ALTER TABLE {_quote(table_name)} ADD COLUMN {_quote(column_name)} {column_definition}")
    )


def drop_column_if_exists(table_name: str, column_name: str) -> None:
    """Elimina una columna solo si existe.

    Nota: se usa para migraciones internas controladas; no debe recibir input de usuario.
    """
    if column_name not in get_table_columns(table_name):
        return

    db.session.execute(text(f"ALTER TABLE {_quote(table_name)} DROP COLUMN {_quote(column_name)}"))
