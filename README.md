# FICOTOX

Sistema web de gestión operativa para laboratorio: inventario, muestras, trazabilidad y documentación, con autenticación local o corporativa (Microsoft Entra ID) y respaldo automático. Pensado para operar de forma local (SQLite) o con base de datos centralizada (MySQL/MariaDB).

> Web-based operations system for laboratory management: inventory, sample tracking, traceability and documentation, with local or corporate (Microsoft Entra ID) authentication and automated backups.

---

## Funcionalidad

- **Gestión de inventario** — Reactivos, consumibles, equipos y mantenimientos.
- **Gestión de muestras** — Recepción, procesamiento y extracción, con registro automático de movimientos.
- **Trazabilidad** — Historial de movimientos y consulta de documentos del sistema de gestión de calidad (SGC).
- **Usuarios, roles y permisos** — Autenticación local con correo y contraseña, o vía Microsoft Entra ID (SSO corporativo).
- **Interfaz** — Navegación superior, paleta de comandos (⌘K / Ctrl+K), paneles laterales para catálogos y formatos de muestra a pantalla completa (ver `docs/DISENO_UI.md`).
- **Respaldo y sincronización** — Respaldo local automatizado con sincronización opcional a OneDrive/Graph.
- **Distribución autocontenida** — Build `standalone` de Next.js para desplegar con solo Node.js.

## Arquitectura

Aplicación única Next.js (App Router) que sirve la interfaz React y la API REST:

```
Navegador
  → Frontend React (src/components)
  → Route Handlers /api/* (src/app/api)
  → Capa de datos con SQL parametrizado (src/lib/server)
  → SQLite (por defecto) o MySQL/MariaDB (DATABASE_URL)
```

## Estructura del proyecto

```
FICOTOX/
├── src/
│   ├── app/                 # layout, rutas de la interfaz y route handlers /api/*
│   ├── components/          # ui (sistema de diseño), shell, session y features por dominio
│   ├── lib/client/          # API client, sesion, store, hooks, formato, importaciones Excel/CSV
│   ├── lib/server/          # config, db, auth (JWT), rbac, esquema y modulos de negocio
│   └── proxy.ts             # CORS para /api/* (equivale a middleware)
├── public/vendor/xlsx/      # SheetJS (lectura de Excel en el navegador)
├── scripts/                 # lanzador standalone, respaldo y tareas programadas
├── docs/                    # documentación técnica y operativa
├── MANUAL_TECNICO.md
└── MANUAL_USUARIO.md
```

## Puesta en marcha (desarrollo)

Requisitos: Node.js LTS (22.13+ o 24). `better-sqlite3` es un módulo nativo; Node 23 (fin de vida) no es compatible.

```bash
cp .env.example .env         # ajustar secretos y base de datos
npm install
npm run dev                  # http://localhost:3000
```

Producción:

```bash
npm run build
npm run start:standalone     # lanza .next/standalone en HOST:PORT (por defecto 0.0.0.0:5000)
```

Variables de entorno relevantes: `SECRET_KEY`, `JWT_SECRET`, `JWT_EXPIRES_HOURS`, `DATABASE_URL`, `SQLITE_PATH`, `LOCAL_LOGIN_ENABLED`, `MICROSOFT_*`, `CORS_ORIGINS` (ver `.env.example` y `src/lib/server/config.ts`).

La base SQLite vive en `instance/ficotox.sqlite3` (se crea sola si no existe) y los PDF de reportes en `instance/maintenance_reports/`.

## Documentación

- [`MANUAL_USUARIO.md`](./MANUAL_USUARIO.md) — guía de uso para operadores del sistema.
- [`MANUAL_TECNICO.md`](./MANUAL_TECNICO.md) — referencia técnica de instalación y mantenimiento.
- [`docs/EXPLICACION_PROYECTO.md`](./docs/EXPLICACION_PROYECTO.md) — arquitectura y flujo completo del sistema.
- [`docs/DISENO_UI.md`](./docs/DISENO_UI.md) — sistema de diseño: tokens, tipografía, navegación y estados.
- [`docs/MIGRACION_NEXTJS.md`](./docs/MIGRACION_NEXTJS.md) — plan, decisiones y resultado de la migración desde Flask.

---

## English summary

FICOTOX is a full-stack laboratory management system built with Next.js (React UI + REST route handlers) covering inventory, sample tracking, traceability, and document control, with local or Microsoft Entra ID authentication, SQLite/MySQL persistence, and automated OneDrive backups. It runs as a dev server or as a self-contained Node.js standalone build. See `MANUAL_TECNICO.md` and `docs/EXPLICACION_PROYECTO.md` for architecture details.
