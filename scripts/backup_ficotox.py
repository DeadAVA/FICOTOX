import argparse
import fnmatch
import os
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse
from zipfile import ZIP_DEFLATED, ZipFile


EXCLUDED_DIRS = {".git", ".venv", "__pycache__", "instance", "backups", "node_modules"}
EXCLUDED_FILES = {".env"}
EXCLUDED_FILE_PATTERNS = ("*.pyc", "*.sqlite", "*.sqlite3", "*.db")


def read_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def config_value(dotenv: dict[str, str], name: str, default: str = "") -> str:
    return os.environ.get(name) or dotenv.get(name) or default


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def detect_onedrive_dir() -> Path | None:
    candidates = [
        os.environ.get("FICOTOX_ONEDRIVE_SYNC_DIR", ""),
        os.environ.get("OneDriveCommercial", ""),
        os.environ.get("OneDriveConsumer", ""),
        os.environ.get("OneDrive", ""),
    ]

    user_profile = os.environ.get("USERPROFILE")
    if user_profile:
        candidates.append(str(Path(user_profile) / "OneDrive"))

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return Path(candidate)

    return None


def copy_to_onedrive(file_path: Path, remote_folder: str, remote: str, sync_dir: str) -> Path | None:
    if remote:
        if not shutil.which("rclone"):
            raise RuntimeError("FICOTOX_ONEDRIVE_REMOTE esta configurado, pero rclone no esta instalado o no esta en PATH.")

        subprocess.run(["rclone", "copy", str(file_path), f"{remote}/{remote_folder}"], check=True)
        return None

    onedrive_dir = Path(sync_dir) if sync_dir else detect_onedrive_dir()
    if onedrive_dir:
        destination = onedrive_dir / remote_folder
        ensure_dir(destination)
        copied_path = destination / file_path.name
        shutil.copy2(file_path, copied_path)
        return copied_path

    print("ADVERTENCIA: no se encontro OneDrive. Configura FICOTOX_ONEDRIVE_SYNC_DIR o FICOTOX_ONEDRIVE_REMOTE.")
    return None


def should_include_code_file(root: Path, file_path: Path) -> bool:
    relative_parts = file_path.relative_to(root).parts
    if any(part in EXCLUDED_DIRS for part in relative_parts):
        return False

    if file_path.name in EXCLUDED_FILES:
        return False

    return not any(fnmatch.fnmatch(file_path.name, pattern) for pattern in EXCLUDED_FILE_PATTERNS)


def make_code_backup(project_root: Path, destination_dir: Path) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    zip_path = destination_dir / f"ficotox-code-{timestamp}.zip"

    with tempfile.TemporaryDirectory(prefix="ficotox-code-backup-") as temp_dir:
        staging_dir = Path(temp_dir) / "ficotox"
        ensure_dir(staging_dir)

        for file_path in project_root.rglob("*"):
            if not file_path.is_file() or not should_include_code_file(project_root, file_path):
                continue

            relative_path = file_path.relative_to(project_root)
            target_path = staging_dir / relative_path
            ensure_dir(target_path.parent)
            shutil.copy2(file_path, target_path)

        with ZipFile(zip_path, "w", ZIP_DEFLATED) as archive:
            for file_path in staging_dir.rglob("*"):
                if file_path.is_file():
                    archive.write(file_path, file_path.relative_to(staging_dir))

    return zip_path


def make_sqlite_backup(dotenv: dict[str, str], backend_dir: Path, destination_dir: Path) -> Path:
    sqlite_path = Path(config_value(dotenv, "SQLITE_PATH", "instance/ficotox.sqlite3"))
    if not sqlite_path.is_absolute():
        sqlite_path = backend_dir / sqlite_path

    if not sqlite_path.exists():
        raise FileNotFoundError(f"No existe la base SQLite esperada: {sqlite_path}")

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = destination_dir / f"ficotox-db-sqlite-{timestamp}.sqlite3"
    shutil.copy2(sqlite_path, backup_path)
    return backup_path


def make_mysql_backup(database_url: str, destination_dir: Path) -> Path:
    if not shutil.which("mysqldump"):
        raise RuntimeError("DATABASE_URL usa MySQL/MariaDB, pero mysqldump no esta instalado o no esta en PATH.")

    normalized_url = database_url.replace("mysql+pymysql://", "mysql://", 1)
    parsed = urlparse(normalized_url)
    database = parsed.path.lstrip("/")
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    port = parsed.port or 3306
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = destination_dir / f"ficotox-db-mysql-{timestamp}.sql"

    env = os.environ.copy()
    env["MYSQL_PWD"] = password
    command = [
        "mysqldump",
        f"--host={parsed.hostname}",
        f"--port={port}",
        f"--user={user}",
        "--single-transaction",
        "--routines",
        "--triggers",
        database,
    ]

    with backup_path.open("w", encoding="utf-8") as output:
        subprocess.run(command, check=True, stdout=output, env=env)

    return backup_path


def make_database_backup(dotenv: dict[str, str], backend_dir: Path, destination_dir: Path) -> Path:
    database_url = config_value(dotenv, "DATABASE_URL")
    if database_url.startswith("mysql"):
        return make_mysql_backup(database_url, destination_dir)

    return make_sqlite_backup(dotenv, backend_dir, destination_dir)


def main() -> int:
    parser = argparse.ArgumentParser(description="Crea respaldos locales y los copia a Microsoft OneDrive.")
    parser.add_argument("--target", choices=("database", "code", "all"), default="all")
    parser.add_argument("--project-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--onedrive-remote", default=os.environ.get("FICOTOX_ONEDRIVE_REMOTE", ""))
    parser.add_argument("--onedrive-sync-dir", default=os.environ.get("FICOTOX_ONEDRIVE_SYNC_DIR", ""))
    parser.add_argument("--local-backup-dir", default=os.environ.get("FICOTOX_BACKUP_DIR", ""))
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    backend_dir = project_root / "backend"
    dotenv = read_dotenv(backend_dir / ".env")
    local_backup_dir = Path(args.local_backup_dir).resolve() if args.local_backup_dir else project_root / "backups"
    database_backup_dir = local_backup_dir / "database"
    code_backup_dir = local_backup_dir / "code"
    ensure_dir(database_backup_dir)
    ensure_dir(code_backup_dir)

    created: list[Path] = []

    if args.target in {"database", "all"}:
        database_backup = make_database_backup(dotenv, backend_dir, database_backup_dir)
        copied_path = copy_to_onedrive(database_backup, "FICOTOX/database", args.onedrive_remote, args.onedrive_sync_dir)
        created.append(database_backup)
        if copied_path:
            created.append(copied_path)

    if args.target in {"code", "all"}:
        code_backup = make_code_backup(project_root, code_backup_dir)
        copied_path = copy_to_onedrive(code_backup, "FICOTOX/code", args.onedrive_remote, args.onedrive_sync_dir)
        created.append(code_backup)
        if copied_path:
            created.append(copied_path)

    print("Respaldos creados:")
    for path in created:
        print(f" - {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
