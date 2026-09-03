import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_environment() -> None:
    configured_env = os.getenv("FICOTOX_ENV_FILE", "").strip()
    if configured_env:
        load_dotenv(Path(configured_env), override=False)
        return

    default_env = BASE_DIR / ".env"
    if default_env.exists():
        load_dotenv(default_env, override=False)
        return

    fallback_env = Path.cwd() / ".env"
    if fallback_env.exists():
        load_dotenv(fallback_env, override=False)


_load_environment()


def _build_database_uri() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url

    sqlite_path = Path(os.getenv("SQLITE_PATH", BASE_DIR / "instance" / "ficotox.sqlite3"))
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{sqlite_path.as_posix()}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "ficotox-dev-secret")
    SQLALCHEMY_DATABASE_URI = _build_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET = os.getenv("JWT_SECRET", "ficotox-jwt-secret")
    JWT_EXPIRES_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "12"))
    LOCAL_LOGIN_ENABLED = os.getenv("LOCAL_LOGIN_ENABLED", "true").lower() == "true"

    MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "").strip()
    MICROSOFT_TENANT_ID = os.getenv("MICROSOFT_TENANT_ID", "").strip()
    MICROSOFT_ALLOWED_DOMAIN = os.getenv("MICROSOFT_ALLOWED_DOMAIN", "cicese.mx").strip().lower()
    MICROSOFT_AUTH_ENABLED = (
        os.getenv("MICROSOFT_AUTH_ENABLED", "true").lower() == "true"
        and bool(MICROSOFT_CLIENT_ID)
        and bool(MICROSOFT_TENANT_ID)
    )

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
