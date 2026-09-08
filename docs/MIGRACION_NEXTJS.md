# Plan de migración FICOTOX → Next.js

Fecha: 2026-09-07. Objetivo: migrar backend (Flask) y frontend (HTML/CSS/JS vanilla) a una sola aplicación Next.js **sin agregar ni quitar funcionalidades y conservando la misma apariencia**. Las mejoras se harán después, sobre la nueva base.

## 1. Estado de partida (inventario)

| Área | Antes | Detalle |
| --- | --- | --- |
| Backend | Flask 3 + SQLAlchemy `text()` | 7 blueprints, ~70 endpoints bajo `/api/*`, SQL crudo parametrizado, migraciones ligeras `ensure_*_schema()` en cada request, JWT HS256 (PyJWT), RBAC por módulo/acción, login local por correo y login Microsoft Entra ID (validación JWKS). |
| Base de datos | SQLite por defecto, MySQL/MariaDB opcional | 13 tablas. Sin ORM: cada módulo escribe su `CREATE TABLE IF NOT EXISTS` (variante SQLite y MySQL) y `ALTER TABLE ADD COLUMN` idempotentes. |
| Frontend | `index.html` (2151 líneas) + `app.js` (6968) + `styles.css` (4733) | SPA de una sola URL: vista login y vista dashboard con 11 páginas (`.content-page`) y 12 modales Bootstrap. Bootstrap 5.3.3, Bootstrap Icons 1.11.3, SheetJS (lectura Excel en navegador), MSAL Browser (cargado pero sin botón en la UI). Sesión en `localStorage`. |
| Distribución | PyInstaller (`ficotox-server.spec`, launchers `server_launcher*.py`) | Ejecutable Windows que sirve API + frontend, abre el navegador y detecta IP LAN. |
| Operación | `scripts/backup_ficotox.py` + `.cmd` | Respaldo SQLite/MySQL y del código a OneDrive/Graph. Independiente del framework web. |

## 2. Decisiones de arquitectura (con la investigación que las respalda)

1. **Next.js 16.3 (App Router, `src/`)** — versión estable actual. `middleware.ts` fue renombrado a `proxy.ts` en la 16; se usa `proxy.ts` para CORS sobre `/api/*` respetando `CORS_ORIGINS` como hacía Flask-CORS. Las rutas con barra final (`/api/consumables/`) que el frontend viejo usaba se aceptan con un `rewrite` en `next.config.ts` (`/api/:path+/` → `/api/:path+`) y `skipTrailingSlashRedirect: true`, sin redirect, para que los `POST` no pierdan el cuerpo (hacerlo desde `proxy.ts` fallaba en el build standalone).
2. **Backend como Route Handlers** en `src/app/api/**/route.ts` con **las mismas URLs, métodos, códigos HTTP, mensajes y formas JSON** que Flask. La lógica vive en `src/lib/server/modules/*` (un archivo por módulo, espejo de `backend/app/modules`).
3. **Acceso a datos con SQL crudo** igual que el original (no se introduce ORM ni migraciones nuevas: eso sería "cambiar funcionalidad"). Adaptador propio `src/lib/server/db.ts` con dos drivers: `better-sqlite3` (SQLite, por defecto) y `mysql2` (`DATABASE_URL=mysql://...`). Ambos aceptan parámetros nombrados `:param`, así el SQL se porta casi literal. Las funciones `ensure_*_schema()`, `add_column_if_missing`, `is_sqlite()` se portan tal cual, con las mismas ramas SQLite/MySQL.
   - Cada request obtiene una "sesión" (`withSession`) con semántica equivalente a la sesión de Flask-SQLAlchemy: `commit()` explícito, `rollback()` automático si el handler falla. En SQLite las sesiones se serializan con un mutex (SQLite es single-writer; escala de laboratorio).
   - `better-sqlite3` es un módulo nativo: se declara en `serverExternalPackages` y **requiere Node.js LTS (22.13+ o 24)**. Node 23 (fin de vida) hace *segfault* con la librería; se documenta en `engines`.
4. **Autenticación**: `jose` para firmar/verificar JWT HS256 con los mismos claims (`sub`, `role_id`, `email`, `nombre`, `rol`, `iat`, `exp`) y `JWT_SECRET`/`JWT_EXPIRES_HOURS`; los tokens emitidos por Flask siguen siendo válidos. Login Microsoft: `createRemoteJWKSet` + `jwtVerify` contra `https://login.microsoftonline.com/<tenant>/v2.0`, misma validación de `aud`, `iss`, dominio permitido y existencia del usuario.
5. **Frontend en React (TypeScript)** conservando exactamente el DOM: mismas clases CSS, mismos `id` (el CSS los usa: `#sampleModal`, `#processingForm`, etc.), mismos textos, mismas claves de `localStorage` (`ficotox_access_token`, `ficotox_user`, `ficotox_permissions`). `styles.css` se copia íntegro a `globals.css`. Bootstrap y Bootstrap Icons se instalan desde npm en **las mismas versiones** que los archivos vendorizados (5.3.3 / 1.11.3). Los modales usan un componente propio `ui/AppModal.tsx` que reproduce el markup y el comportamiento de Bootstrap (`.modal.fade.show > .modal-dialog > .modal-content`, backdrop, `modal-open`, Escape, transición de 150 ms) conservando el `id` en `.modal`, que el CSS necesita (`#sampleModal`, `#processingModal`, `#extractionModal`); `react-bootstrap` se descartó porque no conserva ese `id`. SheetJS se conserva vendorizado en `public/vendor/xlsx` y se carga con `next/script` (idéntico comportamiento de lectura de Excel). MSAL pasa a `@azure/msal-browser` con import dinámico, solo si se invoca el login Microsoft.
6. **Navegación**: se mantiene una sola ruta `/` con estado en cliente (vista login ↔ dashboard, página activa, sidebar móvil), tal como funciona hoy (la URL no cambia al navegar y al recargar se vuelve a la primera página permitida). Todas las páginas permanecen montadas y se muestran con `.content-page.active`, lo que reproduce el caché `loadedPages` del original. Convertir cada módulo en ruta propia queda como mejora futura.
7. **Archivos y rutas de datos**: `instance/ficotox.sqlite3` y `instance/maintenance_reports/` en la raíz del proyecto (la base existente se movió desde `backend/instance/` al retirar el legado). `SQLITE_PATH`, `DATABASE_URL` y el resto de variables conservan nombre; Next.js lee `.env` de la raíz.
8. **Distribución**: PyInstaller deja de aplicar. Se usa `output: "standalone"` de Next.js y un lanzador `scripts/start-ficotox.mjs` que replica el comportamiento del launcher (puerto, host, abrir navegador, IP LAN). Los scripts de respaldo se actualizan a las nuevas rutas manteniendo compatibilidad con las viejas.
9. **Código legado**: `backend/` y `frontend/` se conservaron sin tocar durante la revisión para comparar lado a lado y se eliminaron tras la aprobación (ver 6.3).

## 3. Mapa de equivalencias

| Flask | Next.js |
| --- | --- |
| `backend/app/config.py` | `src/lib/server/config.ts` |
| `backend/app/extensions.py` (db, cors) | `src/lib/server/db.ts`, `src/proxy.ts` |
| `backend/app/utils/auth.py` | `src/lib/server/auth.ts` |
| `backend/app/utils/rbac.py` | `src/lib/server/rbac.ts` |
| `backend/app/utils/schema.py` | `src/lib/server/schema.ts` |
| `backend/app/utils/users.py` | `src/lib/server/users.ts` |
| `backend/app/utils/inventory_usage.py` | `src/lib/server/inventory-usage.ts` |
| `backend/app/modules/<m>/*.py` | `src/lib/server/modules/<m>.ts` + `src/app/api/**/route.ts` |
| `backend/app/__init__.py` (health, static) | `src/app/api/health/*`, `src/app/layout.tsx` |
| `frontend/index.html` | `src/components/**/*.tsx` |
| `frontend/app.js` | `src/lib/client/*` (api, sesión, formato, constantes, insumos) + componentes |
| `frontend/styles.css` | `src/app/globals.css` |

## 4. Pasos de ejecución

1. Scaffold Next.js 16.3 + dependencias; configuración (`next.config.ts`, `proxy.ts`, `.env.example`, `engines`).
2. Portar capa servidor: config, db, schema, rbac, users, auth, inventory-usage.
3. Portar módulos y rutas API una a una (auth, admin, dashboard, inventory, consumables, samples, documents, traceability, health).
4. Verificar API contra el backend Flask original corriendo en paralelo sobre copias de la misma base (comparación de respuestas JSON endpoint por endpoint).
5. Portar frontend: layout, login, shell (sidebar/topbar), 11 páginas, 12 modales, firmas, buscador de insumos, importaciones Excel/CSV.
6. Build de producción, lint, typecheck y smoke test en navegador (capturas comparativas).
7. Actualizar documentación (README, MANUAL_TECNICO, scripts).
8. Revisión por agente independiente; iterar hasta aprobación.

## 5. Criterios de aceptación

- Todos los endpoints responden igual (ruta, método, status, JSON) que Flask.
- Cada pantalla y modal se ve y se comporta igual (mismo HTML/CSS, mismos textos, mismas validaciones y mensajes).
- Sesiones existentes (tokens JWT) y bases SQLite existentes funcionan sin migración.
- `npm run build` sin errores ni warnings de tipos/lint.

## 6. Resultado de la migración (2026-09-07)

### 6.1 Verificaciones realizadas

- `npm run typecheck`, `npm run lint` y `npm run build` sin errores ni advertencias (ESLint ignora `public/vendor/`).
- Al arrancar (primer request), la app ejecuta las mismas funciones `ensure*Schema()` que `create_app()` de Flask, en el mismo orden, así una base SQLite o MySQL vacía queda creada antes de atender cualquier endpoint.
- Los enteros se ligan como INTEGER en SQLite (como hace Python); un valor numérico en una columna de texto (por ejemplo `lote: 7` o la columna `ID` de un Excel) se guarda `"7"`, igual que antes.
- CORS reproduce Flask-CORS: refleja el `Origin` permitido con `Vary: Origin` (o `*` sin `Origin`), y el preflight responde 200 reflejando `Access-Control-Request-Headers` con la lista completa de métodos.
- Un cuerpo JSON sin `Content-Type: application/json` se ignora (`request.get_json(silent=True)`), igual que en Flask.
- **API**: con el backend Flask original y la app Next.js corriendo en paralelo sobre copias idénticas de la base, se compararon las respuestas JSON (status y cuerpo) de los 61 endpoints de lectura y de 72 pasos de mutación (crear/editar/rellenar/importar/eliminar en cada módulo, incluidos procesamiento y extracción con descuento de inventario). Solo difieren los casos listados en 6.2.
- **Tokens**: un JWT emitido por Flask es aceptado por Next.js y viceversa (mismo secreto y claims).
- **Interfaz**: recorrido automatizado con Playwright (login, las 11 páginas, subpestañas de muestras, los 12 modales en modo nuevo y edición, logout) en ambas aplicaciones. 0 errores de consola y 0 requests fallidos en Next.js. Las capturas son idénticas píxel a píxel salvo (a) filas creadas en el mismo segundo que se ordenan distinto, (b) el parpadeo del cursor y la barra de scroll, y (c) el caso de escapado descrito en 6.2. Los modales tienen el mismo alto de contenido y la misma longitud de texto en ambas versiones.
- El DOM de cada página se comparó normalizado: es el mismo HTML (mismas clases, `id`, textos y atributos; solo cambia el orden de las clases en algunos `<p>` de feedback).

### 6.2 Diferencias conocidas (deliberadas o por corrección de errores)

| Caso | Flask | Next.js | Motivo |
| --- | --- | --- | --- |
| Folio duplicado al crear o editar recepción, procesamiento o extracción | 500 (error interno por violación de UNIQUE) | 409 `{"message": "El folio ya existe"}` | El 500 era un fallo no controlado; se conserva el comportamiento visible (no se guarda) con un código correcto. |
| `id_rol` no numérico al crear/editar usuario | 500 (`int("abc")` sin controlar) | 400 `{"message": "Selecciona un rol"}` | Mismo caso: error no controlado convertido en validación. |
| Ruta desconocida bajo `/api` o método no soportado en ruta desconocida | 405 o 404 según la ruta comodín de Flask | 404 `{"message": "Ruta no encontrada"}` | Next.js no tiene la ruta comodín del frontend; el frontend nunca llama rutas inexistentes. |
| Barra final en rutas | Solo las rutas registradas con barra final la aceptaban; sin barra en `/api/samples` y `/api/documents` Flask respondía 308 | Todas las rutas aceptan con y sin barra final | Rewrite genérico en `next.config.ts`; ninguna respuesta del frontend cambia. |
| Error interno no controlado | Página HTML 500 de Flask | 500 JSON `{"message": "Error interno del servidor"}` | Formato uniforme de la API; el frontend solo usa el status. |
| Archivo `.env` | Se leía `FICOTOX_ENV_FILE`, si no `backend/.env`, si no `.env` del directorio actual (el primero que exista) | Se lee `.env` de la raíz (`FICOTOX_ENV_FILE` lo sustituye) | Al retirar `backend/` solo queda el `.env` de la raíz. |
| Extracción sin molienda/procesamiento seleccionado | La UI fallaba al enviar (`null` sin comprobar) | Envía `null` y el servidor responde con la validación normal | Corrección de un error de JS del frontend original. |
| Nombre de reactivo con `&` (p. ej. `GTX1&GTX4-c`) | Se mostraba `GTX1>X4-c` (el nombre no se escapaba y el navegador interpretaba `&GT`) | Se muestra el nombre real | React escapa siempre el texto; el valor guardado no cambia. |
| Archivo de documento inexistente | 404 con HTML de Flask | 404 JSON `{"message": "Ruta no encontrada"}` | Formato uniforme de la API; el frontend solo usa el status. |
| Folios en MySQL | `printf('%03d')` (función de SQLite que fallaba en MySQL) | `LPAD(...)` en la rama MySQL | Corrige la consulta para MySQL sin cambiar SQLite. |
| `extra_json` guardado | `json.dumps` con espacios (`{"a": 1}`) | `JSON.stringify` compacto (`{"a":1}`) | Mismo contenido; solo cambia el espaciado de la cadena almacenada. |
| Badges de estado en tablas | Se calculaban al renderizar | Se recalculan al cambiar los datos | Misma apariencia; efecto natural de React. |
| Distribución | Ejecutable PyInstaller | Build `standalone` + `scripts/start-ficotox.mjs` | Cambio de plataforma; mismo comportamiento (puerto, host, IP LAN, abrir navegador). |

### 6.3 Retiro del legado (hecho tras la aprobación)

- Eliminados `backend/`, `frontend/`, `ficotox-server.spec`, `scripts/build-backend-exe.cmd`, `build/`, `dist/` y `docs/reporte_ficotox.md` (describía la versión Flask). Siguen disponibles en el historial de git.
- La base SQLite existente se movió de `backend/instance/ficotox.sqlite3` a `instance/ficotox.sqlite3`. `backend/.env` y `backend/instance/` ya no se buscan como respaldo; `FICOTOX_ENV_FILE` sigue permitiendo indicar otro archivo de configuración.

