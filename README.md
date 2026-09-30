# FICOTOX

Sistema web de gestión operativa para laboratorio: inventario, muestras, trazabilidad y documentación, con autenticación por usuario y contraseña del sistema y respaldo automático. Pensado para operar de forma local (SQLite) o con base de datos centralizada (MySQL/MariaDB).

> Web-based operations system for laboratory management: inventory, sample tracking, traceability and documentation, with system username/password authentication and automated backups.

---

## Funcionalidad

- **Gestión de inventario** — Reactivos, consumibles, equipos y mantenimientos.
- **Gestión de muestras** — Recepción, procesamiento y extracción, con registro automático de movimientos.
- **Trazabilidad** — Historial de movimientos y consulta de documentos del sistema de gestión de calidad (SGC).
- **Usuarios, roles y permisos** — Varios roles por persona con vigencia, permisos finos por módulo (ver/capturar/editar/revisar/aprobar/anular/administrar) con alcance, combinaciones prohibidas y cargo en las firmas. Autenticación con correo y contraseña del sistema; las acciones críticas piden reautenticación y, algunas, la aprobación de un segundo usuario, con separación de funciones.
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
│   ├── lib/server/          # config, db, auth (JWT), rbac, migraciones y modulos de negocio
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

Producción (guía paso a paso para el laboratorio: [`docs/INSTALACION.md`](./docs/INSTALACION.md)):

```bash
npm ci
npm run configurar                       # .env seguro: JWT_SECRET, SECRET_KEY (solo si no existe), HOST, PORT, dominios, SMTP
npm run build
npm run instancia-nueva -- --confirmar   # base vacía con migraciones + Administrador técnico y Responsable General (mueve la anterior)
npm run instalar-servicio                # arranque automático, reinicio si falla y regla de firewall (quitar-servicio lo retira)
npm run verificar-instalacion            # ✅/⚠️/❌ y reporte en <instancia>/verificaciones/
```

| Comando | Qué hace |
| --- | --- |
| `npm run start:standalone` | Lanza `.next/standalone` en HOST:PORT (0.0.0.0:5000); HTTPS si `TLS_CERT`/`TLS_KEY`; registros en `<instancia>/logs`. |
| `npm run migrar [-- --estado \| --simular]` | Migraciones versionadas del esquema (el servidor también las aplica al arrancar, con respaldo previo). |
| `npm run actualizar [-- --git]` | Respaldo → detener → build (si falla, deja todo como estaba) → migrar → arrancar → verificar. |
| `npm run detener` / `npm run reiniciar` | Detiene (o reinicia) al lanzador y al servidor sin que se relance; en Windows úsalo en lugar de `schtasks /End`. |
| `npm run respaldar` / `npm run restaurar` | Respaldo local y prueba de restauración con acta (Fase 10). |
| `npm run prueba-carga` | Prueba de carga (10 usuarios; requiere build). |
| `npm run test:mysql` | Pruebas contra MySQL/MariaDB (Docker o `MYSQL_TEST_URL`). |
| `npm run sqlite-a-mysql` | Pasa una base SQLite a MySQL (ver `docs/DECISION_BASE_DE_DATOS.md`). |

Variables de entorno relevantes: `SECRET_KEY`, `JWT_SECRET`, `JWT_EXPIRES_HOURS`, `DATABASE_URL`, `SQLITE_PATH`, `ALLOWED_EMAIL_DOMAINS`, `CORS_ORIGINS` (ver `.env.example` y `src/lib/server/config.ts`).

La base SQLite vive en `instance/ficotox.sqlite3` (el esquema lo crean y actualizan las migraciones de `src/lib/server/migraciones/`) y los PDF de reportes en `instance/maintenance_reports/`.

### Roles y usuarios iniciales

El arranque ya no crea ningún rol ni concede permisos. Los 10 roles del laboratorio (matriz de la Fase 1 en `scripts/roles-catalogo.json`: acciones V/C/E/R/A/AN/G con alcance por módulo) y un usuario local por rol, con su asignación de rol, se dan de alta con:

```bash
cp scripts/seed-usuarios.example.json scripts/seed-usuarios.local.json   # ignorado por git: escribir aquí las contraseñas
npm run migrar         # crea o actualiza el esquema (versionado)
npm run seed:roles     # node scripts/seed-roles-usuarios.mjs (idempotente; solo SQLite; servidor detenido)
```

Es idempotente y también carga la matriz en roles que ya existían sin ella. Cada alta y asignación queda en la bitácora de auditoría. Una persona puede tener varios roles con vigencia; se asignan y revocan desde Administración › Usuarios. Detalle en `docs/CATALOGO_PERMISOS.md` y `MANUAL_TECNICO.md` §9.2 y §15.3.

## Documentación

- [`MANUAL_USUARIO.md`](./MANUAL_USUARIO.md) — guía de uso para operadores del sistema.
- [`MANUAL_TECNICO.md`](./MANUAL_TECNICO.md) — referencia técnica de instalación y mantenimiento.
- [`docs/EXPLICACION_PROYECTO.md`](./docs/EXPLICACION_PROYECTO.md) — arquitectura y flujo completo del sistema.
- [`docs/DISENO_UI.md`](./docs/DISENO_UI.md) — sistema de diseño: tokens, tipografía, navegación y estados.
- [`docs/MIGRACION_NEXTJS.md`](./docs/MIGRACION_NEXTJS.md) — plan, decisiones y resultado de la migración desde Flask.
- [`docs/CATALOGO_PERMISOS.md`](./docs/CATALOGO_PERMISOS.md) — matriz de roles y permisos, alcances, combinaciones prohibidas y decisiones pendientes.
- [`docs/INSTALACION.md`](./docs/INSTALACION.md) — instalación, operación, actualización y solución de problemas en la computadora del laboratorio.
- [`docs/DECISION_BASE_DE_DATOS.md`](./docs/DECISION_BASE_DE_DATOS.md) — SQLite o MySQL: medidas, recomendación, umbrales y procedimiento de cambio.
- [`docs/RESPALDO_Y_RECUPERACION.md`](./docs/RESPALDO_Y_RECUPERACION.md) — respaldos, restauración y prueba documentada.

---

## English summary

FICOTOX is a full-stack laboratory management system built with Next.js (React UI + REST route handlers) covering inventory, sample tracking, traceability, and document control, with system username/password authentication, SQLite/MySQL persistence, and automated OneDrive backups. It runs as a dev server or as a self-contained Node.js standalone build. See `MANUAL_TECNICO.md` and `docs/EXPLICACION_PROYECTO.md` for architecture details.
