import os
import sys
from pathlib import Path

from waitress import serve


def _runtime_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _resolve_frontend_dir(base_dir: Path) -> Path:
    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS", base_dir))
        packaged_frontend = meipass / "frontend"
        if packaged_frontend.exists():
            return packaged_frontend

    candidates = [
        base_dir.parent / "frontend",
        base_dir / "frontend",
        Path.cwd() / "frontend",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]


def _resolve_sqlite_path(base_dir: Path) -> Path:
    configured = os.getenv("SQLITE_PATH", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()

    candidates = [
        # Backend en raiz del proyecto: <root>/backend/instance/ficotox.sqlite3
        base_dir.parent / "backend" / "instance" / "ficotox.sqlite3",
        # Backend en la carpeta actual (modo desarrollo).
        base_dir / "instance" / "ficotox.sqlite3",
        # Backend dos niveles arriba (algunas distribuciones movidas/copiadas).
        base_dir.parent.parent / "backend" / "instance" / "ficotox.sqlite3",
        # Fallback portable junto al ejecutable.
        base_dir / "instance" / "ficotox.sqlite3",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    return candidates[-1].resolve()


def _configure_runtime_env(base_dir: Path) -> None:
    env_file = base_dir / ".env"
    if env_file.exists():
        os.environ.setdefault("FICOTOX_ENV_FILE", str(env_file))

    sqlite_path = _resolve_sqlite_path(base_dir)
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    os.environ["SQLITE_PATH"] = str(sqlite_path)
    os.environ["DATABASE_URL"] = f"sqlite:///{sqlite_path.as_posix()}"

    frontend_dir = _resolve_frontend_dir(base_dir)
    os.environ.setdefault("FICOTOX_FRONTEND_DIR", str(frontend_dir))


def main() -> int:
    base_dir = _runtime_base_dir()
    _configure_runtime_env(base_dir)

    # Import diferido para que app.config lea entorno ya configurado.
    from app import create_app

    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    threads = int(os.getenv("FICOTOX_THREADS", "8"))

    app = create_app()
    print(f"FICOTOX escuchando en http://{host}:{port}")
    serve(app, host=host, port=port, threads=threads)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
