import os
import sys
import socket
import threading
import webbrowser
from pathlib import Path


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

    # Forzamos siempre DATABASE_URL para que localhost y ejecutable usen
    # exactamente la misma base SQLite resolviendo una sola ruta.
    os.environ["DATABASE_URL"] = f"sqlite:///{sqlite_path.as_posix()}"

    frontend_dir = _resolve_frontend_dir(base_dir)
    os.environ.setdefault("FICOTOX_FRONTEND_DIR", str(frontend_dir))


def _truthy_env(name: str, default: str = "false") -> bool:
    value = os.getenv(name, default).strip().lower()
    return value in {"1", "true", "yes", "on"}


def _detect_lan_ip() -> str:
    # Obtiene IP LAN preferente sin depender de DNS local.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except OSError:
        pass

    try:
        hostname_ip = socket.gethostbyname(socket.gethostname())
        if hostname_ip and not hostname_ip.startswith("127."):
            return hostname_ip
    except OSError:
        pass

    return "127.0.0.1"


def _public_host_for_browser(host: str) -> str:
    normalized = host.strip()
    if normalized in {"0.0.0.0", "::", ""}:
        return _detect_lan_ip()
    return normalized


def _should_open_browser(debug: bool) -> bool:
    if not _truthy_env("FLASK_OPEN_BROWSER", "true"):
        return False

    # En modo debug con reloader, solo abrir en el proceso final.
    if debug and not getattr(sys, "frozen", False):
        return os.getenv("WERKZEUG_RUN_MAIN") == "true"

    return True


def _open_browser_async(url: str) -> None:
    timer = threading.Timer(1.0, lambda: webbrowser.open(url, new=2))
    timer.daemon = True
    timer.start()


def main() -> int:
    base_dir = _runtime_base_dir()
    _configure_runtime_env(base_dir)

    # Import diferido: Config lee variables de entorno al importar app.config.
    from app import create_app

    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").strip().lower() == "true"

    app = create_app()
    print(f"FICOTOX (Flask) escuchando en http://{host}:{port}")

    if _should_open_browser(debug):
        open_host = _public_host_for_browser(host)
        _open_browser_async(f"http://{open_host}:{port}")

    # Evita procesos duplicados cuando se ejecuta como binario empaquetado.
    use_reloader = not getattr(sys, "frozen", False)
    app.run(host=host, port=port, debug=debug, use_reloader=use_reloader)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
