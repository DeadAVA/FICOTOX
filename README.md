# FICOTOX

Sistema web de gestión operativa para laboratorio: inventario, muestras, trazabilidad y documentación, con autenticación local o corporativa (Microsoft Entra ID) y respaldo automático. Pensado para operar de forma local (SQLite) o con base de datos centralizada (MySQL/MariaDB).

> Web-based operations system for laboratory management: inventory, sample tracking, traceability and documentation, with local or corporate (Microsoft Entra ID) authentication and automated backups.

---

## Funcionalidad

- **Gestión de inventario** — Reactivos, consumibles, equipos y mantenimientos.
- **Gestión de muestras** — Recepción, procesamiento y extracción, con registro automático de movimientos.
- **Trazabilidad** — Historial de movimientos y consulta de documentos del sistema de gestión de calidad (SGC).
- **Usuarios, roles y permisos** — Autenticación local o vía Microsoft Entra ID (SSO corporativo).
- **Respaldo y sincronización** — Respaldo local automatizado con sincronización opcional a OneDrive/Graph.
- **Distribución como ejecutable** — Empaquetado del backend con PyInstaller para despliegue sin dependencias de Python.

## Arquitectura

Arquitectura de 3 capas:

```
Navegador
  → Frontend estático (HTML / CSS / JavaScript)
  → API REST Flask (blueprints por módulo)
  → SQLAlchemy
  → SQLite (por defecto) o MySQL/MariaDB (DATABASE_URL)
```

## Estructura del proyecto

```
FICOTOX/
├── backend/            # API Flask (app factory, blueprints, modelos)
│   ├── app/
│   ├── run.py                    # arranque en desarrollo
│   └── server_launcher*.py       # arranque tipo servidor / binario
├── frontend/           # Interfaz estática (HTML/CSS/JS)
├── docs/               # Documentación técnica y operativa
├── scripts/            # Respaldo y tareas programadas
├── ficotox-server.spec # Configuración de empaquetado (PyInstaller)
├── MANUAL_TECNICO.md
└── MANUAL_USUARIO.md
```

## Puesta en marcha (desarrollo)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
python run.py
```

Variables de entorno relevantes: `SECRET_KEY`, `JWT_SECRET`, `JWT_EXPIRES_HOURS`, `DATABASE_URL`, `SQLITE_PATH` (ver `backend/app/config.py`).

## Documentación

- [`MANUAL_USUARIO.md`](./MANUAL_USUARIO.md) — guía de uso para operadores del sistema.
- [`MANUAL_TECNICO.md`](./MANUAL_TECNICO.md) — referencia técnica de instalación y mantenimiento.
- [`docs/EXPLICACION_PROYECTO.md`](./docs/EXPLICACION_PROYECTO.md) — arquitectura y flujo completo del sistema.

---

## English summary

FICOTOX is a full-stack laboratory management system (Flask API + static frontend) covering inventory, sample tracking, traceability, and document control, with local or Microsoft Entra ID authentication, SQLite/MySQL persistence, and automated OneDrive backups. It can run as a dev server or be packaged into a standalone Windows executable via PyInstaller. See `MANUAL_TECNICO.md` and `docs/EXPLICACION_PROYECTO.md` for architecture details.
