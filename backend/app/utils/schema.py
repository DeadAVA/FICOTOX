from sqlalchemy import text

from app.extensions import db


def get_table_columns(table_name: str) -> set[str]:
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
    if column_name in get_table_columns(table_name):
        return

    db.session.execute(
        text(f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {column_definition}")
    )


def drop_column_if_exists(table_name: str, column_name: str) -> None:
    if column_name not in get_table_columns(table_name):
        return

    db.session.execute(text(f"ALTER TABLE `{table_name}` DROP COLUMN `{column_name}`"))
