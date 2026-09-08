# Manual Tecnico - FICOTOX

## 1. Proposito

Este documento describe la arquitectura, instalacion, configuracion, operacion tecnica y mantenimiento del sistema FICOTOX.

FICOTOX es una aplicacion web para gestion de laboratorio. Esta compuesta por:

- Una aplicacion Next.js (App Router) que sirve la interfaz React y la API REST (`/api/*`).
- Base de datos SQLite por defecto, con soporte opcional para MySQL/MariaDB.
- Autenticacion local por correo y autenticacion Microsoft Entra ID opcional.
- Control de acceso por roles y permisos.

## 2. Estructura del proyecto

```text
ficotox/
  MANUAL_USUARIO.md
  MANUAL_TECNICO.md
  package.json               # scripts npm y dependencias
  next.config.ts             # configuracion Next.js (standalone, rewrites de barra final)
  .env.example               # plantilla de variables de entorno
  public/
    favicon.svg
    vendor/xlsx/             # SheetJS para leer Excel en el navegador
  src/
    app/
      layout.tsx             # fuentes (next/font), globals.css, providers y toasts
      globals.css            # Tailwind v4 + tokens del sistema de diseño (@theme)
      providers.tsx          # SessionProvider, TooltipProvider, ConfirmProvider
      login/page.tsx         # acceso con correo y contrasena (Microsoft opcional)
      (app)/layout.tsx       # guardia de sesion + shell (barra superior)
      (app)/page.tsx         # Inicio
      (app)/muestras/**      # listas por etapa y formatos nueva/[id]
      (app)/inventario/**    # reactivos, consumibles, equipos, mantenimiento
      (app)/movimientos, documentos, administracion/usuarios, administracion/roles
      api/**/route.ts        # route handlers de la API REST
    proxy.ts                 # CORS para /api/* (equivale a middleware)
    components/
      ui/                    # sistema de diseño: Button, Field, Table, Overlay (Sheet, Dialog, Dropdown), Primitives
      shell/                 # AppShell (navegacion superior), CommandPalette (⌘K), Brand
      session/               # SessionProvider (token, usuario, permisos) y RequireModule
      features/inventory/    # hojas laterales de reactivos, consumibles, equipos, mantenimiento, relleno
      features/admin/        # hojas de usuarios y roles
      features/samples/      # formatos de recepcion, procesamiento y extraccion, firma, buscador de insumos
    lib/
      client/                # api, sesion, store (invalidacion), hooks, nav, formato, importaciones, insumos
      server/
        config.ts            # variables de entorno y rutas de datos
        db.ts                # sesiones SQLite/MySQL con SQL parametrizado
        auth.ts              # JWT (HS256)
        rbac.ts              # permisos por modulo/accion
        schema.ts            # migraciones ligeras (ADD COLUMN IF MISSING)
        users.ts             # esquema de usuarios
        inventory-usage.ts   # descuento de inventario + movimientos
        health.ts
        modules/             # auth, admin, dashboard, inventory, consumables, samples/, documents, traceability
  scripts/
    start-ficotox.mjs        # lanzador del build standalone
    backup_ficotox.py        # respaldo de base y codigo
    *.cmd                    # tareas programadas de Windows
  docs/
```

## 3. Stack tecnologico

### Aplicacion

- Node.js LTS (22.13+ o 24).
- Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- `better-sqlite3` (SQLite) y `mysql2` (MySQL/MariaDB).
- `jose` para JWT y validacion de tokens de Microsoft (JWKS).

### Interfaz

- React 19 con Tailwind CSS 4 (tokens en `src/app/globals.css`, ver `docs/DISENO_UI.md`).
- Radix UI (`radix-ui`) para dialogos, hojas laterales, menus y tooltips accesibles; `cmdk` para la paleta de comandos; `sonner` para notificaciones.
- Iconos Phosphor (`@phosphor-icons/react`); tipografias Instrument Sans, Instrument Serif y Geist Mono servidas con `next/font`.
- SheetJS para lectura de archivos Excel en navegador (`public/vendor/xlsx`).
- `@azure/msal-browser` para login Microsoft (carga bajo demanda).

### Base de datos

- SQLite local por defecto.
- MySQL/MariaDB mediante `DATABASE_URL`.

## 4. Arquitectura general

Una sola aplicacion Next.js atiende dos cosas:

1. La interfaz (`/`): una pagina cliente que alterna la vista de login y el dashboard, con navegacion por permisos RBAC. Todas las paginas permanecen montadas y se muestran con `.content-page.active`, igual que la interfaz original.
2. La API (`/api/*`): route handlers con la lógica de negocio en `src/lib/server/modules/`.

Durante cada request de API:

1. `apiRoute` abre una sesion de base de datos (`withSession`).
2. El handler valida el JWT (`requireUser`) y el permiso RBAC (`requirePermission`).
3. Se ejecutan las funciones `ensure*Schema()` para crear o completar tablas.
4. Se ejecuta el SQL parametrizado y se hace `commit()`; si el handler falla, se hace `rollback()`.

Flujo general:

```text
Navegador
  -> src/components (React)
  -> API REST /api/*
  -> src/app/api/**/route.ts -> src/lib/server/modules/*
  -> src/lib/server/db.ts
  -> SQLite o MySQL/MariaDB
```

## 5. Instalacion local

### 5.1 Requisitos

- Node.js LTS 22.13+ o 24 (`better-sqlite3` es un modulo nativo con binarios precompilados para estas versiones; Node 23 no es compatible).
- npm 10+.

### 5.2 Instalar dependencias

```powershell
npm install
```

### 5.3 Crear archivo de configuracion

```powershell
Copy-Item .env.example .env
```

Ajustar secretos y base de datos en `.env`.

### 5.4 Ejecutar en desarrollo

```powershell
npm run dev
```

La aplicacion queda disponible en `http://localhost:3000`.

## 6. Variables de entorno

Se leen desde `.env` en la raiz. `FICOTOX_ENV_FILE` permite indicar otro archivo.

| Variable | Descripcion | Valor por defecto |
| --- | --- | --- |
| `SECRET_KEY` | Secreto general | `ficotox-dev-secret` |
| `JWT_SECRET` | Secreto para firmar JWT | `ficotox-jwt-secret` |
| `JWT_EXPIRES_HOURS` | Duracion del token en horas | `12` |
| `DATABASE_URL` | URL de base externa (`mysql://usuario:password@host:3306/ficotox`) | No definida |
| `SQLITE_PATH` | Ruta de SQLite local | `instance/ficotox.sqlite3` |
| `LOCAL_LOGIN_ENABLED` | Activa login local por correo | `true` |
| `MICROSOFT_AUTH_ENABLED` | Activa login Microsoft si hay client/tenant | `true` |
| `MICROSOFT_CLIENT_ID` | Client ID de Microsoft Entra ID | Vacio |
| `MICROSOFT_TENANT_ID` | Tenant ID de Microsoft Entra ID | Vacio |
| `MICROSOFT_ALLOWED_DOMAIN` | Dominio permitido para Microsoft | `cicese.mx` |
| `CORS_ORIGINS` | Origenes permitidos por CORS (`*` o lista separada por comas) | `*` |
| `HOST` / `PORT` | Host y puerto del lanzador standalone | `0.0.0.0` / `5000` |
| `FICOTOX_OPEN_BROWSER` | Abrir navegador al iniciar el lanzador | `true` |

Se aceptan tambien los nombres anteriores `FLASK_HOST`, `FLASK_PORT` y `FLASK_OPEN_BROWSER`.

Ejemplo SQLite:

```env
SECRET_KEY=change-me
JWT_SECRET=change-me-too
JWT_EXPIRES_HOURS=12
LOCAL_LOGIN_ENABLED=true
MICROSOFT_AUTH_ENABLED=false
SQLITE_PATH=instance/ficotox.sqlite3
CORS_ORIGINS=*
```

Ejemplo MySQL/MariaDB:

```env
DATABASE_URL=mysql://usuario:password@localhost:3306/ficotox
SECRET_KEY=change-me
JWT_SECRET=change-me-too
LOCAL_LOGIN_ENABLED=true
MICROSOFT_AUTH_ENABLED=false
```

## 7. Modulos de la API

Cada modulo vive en `src/lib/server/modules/` y sus rutas en `src/app/api/`.

### 7.1 `auth`

```text
src/lib/server/modules/auth.ts
src/lib/server/auth.ts
```

- Configuracion de autenticacion, login local por correo, login Microsoft Entra ID, emision de JWT y usuario actual.

```text
GET  /api/auth/config
POST /api/auth/login
POST /api/auth/microsoft
GET  /api/auth/me
```

### 7.2 `admin`

```text
src/lib/server/modules/admin.ts
```

```text
GET    /api/admin/roles
GET    /api/admin/permissions
GET    /api/admin/roles/<id>
POST   /api/admin/roles
PUT    /api/admin/roles/<id>
DELETE /api/admin/roles/<id>

GET    /api/admin/usuarios
GET    /api/admin/usuarios/<id>
POST   /api/admin/usuarios
PUT    /api/admin/usuarios/<id>
DELETE /api/admin/usuarios/<id>
```

### 7.3 `dashboard`

```text
GET /api/dashboard/overview
```

### 7.4 `inventory` y `consumables`

```text
src/lib/server/modules/inventory.ts
src/lib/server/modules/consumables.ts
src/lib/server/inventory-usage.ts
```

```text
GET    /api/inventory/summary
GET    /api/inventory/reactivos
GET    /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos
PUT    /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos/<id>/refill
POST   /api/inventory/reactivos/import
DELETE /api/inventory/reactivos/<id>

GET    /api/inventory/equipos
GET    /api/inventory/equipos/<id>
POST   /api/inventory/equipos
PUT    /api/inventory/equipos/<id>
DELETE /api/inventory/equipos/<id>

GET    /api/inventory/consumibles
GET    /api/inventory/movimientos
GET    /api/inventory/mantenimientos
GET    /api/inventory/mantenimientos/<id>
POST   /api/inventory/mantenimientos
PUT    /api/inventory/mantenimientos/<id>
DELETE /api/inventory/mantenimientos/<id>

GET    /api/consumables
GET    /api/consumables/<id>
POST   /api/consumables
PUT    /api/consumables/<id>
POST   /api/consumables/<id>/refill
DELETE /api/consumables/<id>
POST   /api/consumables/import
```

### 7.5 `samples`

```text
src/lib/server/modules/samples/index.ts
src/lib/server/modules/samples/recepcion.ts
src/lib/server/modules/samples/procesamiento.ts
src/lib/server/modules/samples/extraccion.ts
```

```text
GET /api/samples/summary
GET /api/samples
GET /api/samples/pending

GET    /api/samples/reception/next-folio
GET    /api/samples/reception
GET    /api/samples/reception/<id>
POST   /api/samples/reception
PUT    /api/samples/reception/<id>
DELETE /api/samples/reception/<id>

GET    /api/samples/processing/next-folio
GET    /api/samples/processing
GET    /api/samples/processing/<id>
POST   /api/samples/processing
PUT    /api/samples/processing/<id>
DELETE /api/samples/processing/<id>

GET    /api/samples/extraction/next-folio
GET    /api/samples/extraction
GET    /api/samples/extraction/<id>
POST   /api/samples/extraction
PUT    /api/samples/extraction/<id>
DELETE /api/samples/extraction/<id>
```

Las rutas aceptan tambien barra final (`/api/samples/reception/`), como el backend anterior.

### 7.6 `documents`

```text
GET  /api/documents/summary
GET  /api/documents
POST /api/documents/maintenance-report
GET  /api/documents/files/<filename>
```

Los PDF se guardan en `<instance>/maintenance_reports/` (junto a la base SQLite).

### 7.7 `traceability`

```text
GET /api/traceability/flow
GET /api/traceability/recent-events
```

### 7.8 Salud

```text
GET /api/health
GET /api/health/db
```

## 8. Interfaz

Codigo en `src/components/` y rutas en `src/app/(app)/`. Cada seccion es una ruta real de Next.js (la URL identifica la pantalla y se puede recargar o compartir).

Piezas principales:

- `ui/`: sistema de diseño. `Button`, `Field` (Input, Select, Textarea, Checkbox, Radio, Switch, FormGrid), `Table`, `Overlay` (Sheet lateral, Dialog, `useConfirm`, Dropdown, Tooltip) y `Primitives` (Badge, Card, Stat, Skeleton, EmptyState, ErrorState, StockMeter).
- `shell/AppShell.tsx`: barra superior con la navegacion principal, menu de usuario, navegacion movil y paleta de comandos (`CommandPalette.tsx`, atajo ⌘K / Ctrl+K).
- `session/SessionProvider.tsx`: carga `/api/auth/config`, valida el token con `/api/auth/me`, expone `can(modulo, accion)` y `logout`. `RequireModule` muestra un estado "sin acceso" cuando el rol no puede leer el modulo.
- `features/*`: pantallas por dominio. Los catalogos abren hojas laterales (`*Sheet.tsx`); los formatos de muestra son paginas completas (`ReceptionForm`, `ProcessingForm`, `ExtractionForm`) con `FormLayout` (cabecera fija, indice de secciones).
- `lib/client/store.ts`: `useResource(claves, loader)` carga datos y se recarga cuando alguien llama `invalidate("reactivos", ...)` tras guardar; sustituye al antiguo `loadedPages`.

Sesion en el navegador: `ficotox_access_token`, `ficotox_user`, `ficotox_permissions` en `localStorage`.

Helpers de API en `src/lib/client/api.ts`: `getJsonAuth`, `sendJsonAuth`, `sendFormAuth`, `postJson`.

## 9. Seguridad y autenticacion

### 9.1 JWT

Los tokens se emiten en login y se firman con `JWT_SECRET` usando HS256 (mismos claims que antes: `sub`, `role_id`, `email`, `nombre`, `rol`, `iat`, `exp`). Los tokens emitidos por el backend Flask siguen siendo validos si `JWT_SECRET` no cambia.

El acceso local requiere correo y contrasena. Las contrasenas se guardan en `usuarios.password_hash` con scrypt (`src/lib/server/password.ts`, formato `scrypt$N$salt$hash`) y se validan en `POST /api/auth/login`; un correo inexistente o una contrasena incorrecta responden 401 con el mismo mensaje. Los usuarios se crean con contrasena desde la pantalla de Usuarios (minimo 8 caracteres) y `scripts/set-password.mjs <correo> <contrasena>` permite asignarla desde la terminal en instalaciones SQLite.

Los endpoints protegidos llaman a `requireUser(request)`, que:

1. Lee el header `Authorization`.
2. Valida formato `Bearer <token>`.
3. Decodifica el JWT.
4. Responde 401 con "Token expirado" o "Token invalido" segun corresponda.

### 9.2 RBAC

`src/lib/server/rbac.ts` define los permisos por modulo: `dashboard`, `reactivos`, `consumibles`, `equipos`, `muestras`, `movimientos`, `mantenimiento`, `documentos`, `roles`, `usuarios`, con acciones `read`, `create`, `update`, `delete`.

Los endpoints combinan:

```ts
const user = await requireUser(request);
await requirePermission(s, user, "modulo", "accion");
```

### 9.3 Microsoft Entra ID

El login Microsoft valida el `id_token` con las claves JWKS del tenant (`jose`), `audience` contra `MICROSOFT_CLIENT_ID`, `issuer` contra el tenant, el dominio permitido y la existencia del usuario en `usuarios`.

## 10. Base de datos

### 10.1 Tablas principales

`roles`, `permisos`, `rol_permisos`, `usuarios`, `reactivos`, `consumibles`, `equipos`, `mantenimientos`, `movimientos`, `muestras_recepcion`, `muestras_procesamiento`, `muestras_extraccion`, `reportes_mantenimiento`.

### 10.2 Migraciones ligeras

No se usan migraciones versionadas. Cada modulo tiene funciones `ensure*Schema()` que crean tablas si no existen y agregan columnas faltantes con `addColumnIfMissing` (`src/lib/server/schema.ts`), con variantes para SQLite y MySQL.

### 10.3 Capa de datos

`src/lib/server/db.ts` abre una sesion por request. Los parametros se escriben como `:nombre` en ambos motores. En SQLite las sesiones se serializan (una sola conexion `better-sqlite3`); en MySQL cada sesion usa una conexion del pool.

## 11. Movimientos e inventario

`src/lib/server/inventory-usage.ts` es la unica capa que descuenta inventario y registra movimientos (`consumeReactivo`, `consumeConsumible`, `restoreInventoryUsage`), con la misma logica que antes:

1. Resolver el insumo por id, codigo, catalogo, lote, CAS o nombre.
2. Validar cantidad positiva y referencia unica.
3. Descontar inventario.
4. Insertar movimiento tipo `salida`.

## 12. Importaciones

- Reactivos: el navegador lee el Excel con SheetJS y envia las hojas a `POST /api/inventory/reactivos/import`; el servidor normaliza encabezados, mapea alias, hace insert/update y devuelve resumen y errores por fila.
- Consumibles: el navegador lee CSV/XLSX/XLS, muestra vista previa y envia las filas validas a `POST /api/consumables/import` (tambien acepta un CSV por `multipart/form-data`).

## 13. Verificacion tecnica

```powershell
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm run build          # build de produccion
```

Con el servidor levantado:

```text
GET http://localhost:3000/api/health      -> {"ok": true, "service": "ficotox-backend"}
GET http://localhost:3000/api/health/db   -> {"ok": true, "database": "reachable"}
```

## 14. Despliegue

### 14.1 Desarrollo

```powershell
npm run dev
```

### 14.2 Produccion

```powershell
npm run build
npm run start:standalone
```

`scripts/start-ficotox.mjs` carga `.env`, resuelve la base SQLite, copia `public/` y `.next/static` al build standalone y arranca `node .next/standalone/server.js` en `HOST:PORT` (por defecto `0.0.0.0:5000`), abriendo el navegador con la IP LAN como hacia el lanzador anterior.

Para copiar a otra PC: llevar la carpeta del proyecto con `node_modules`, `.next`, `public`, `scripts` y `.env`, instalar Node.js LTS y ejecutar `npm run start:standalone`.

Recomendaciones:

- Secretos robustos, HTTPS y `CORS_ORIGINS` restringido.
- MySQL/MariaDB administrado para entornos con varios usuarios concurrentes.
- Respaldar la base de datos y `instance/maintenance_reports/`.

## 15. Respaldo y recuperacion

Ver `docs/backups.md` y `scripts/backup_ficotox.py` (lee `.env` de la raiz y respalda `instance/ficotox.sqlite3` o la base MySQL).

## 16. Convenciones de desarrollo

- Proteger endpoints con `requireUser` y `requirePermission`.
- Mantener los permisos sincronizados con `DEFAULT_PERMISSIONS`.
- Usar `addColumnIfMissing` para cambios ligeros de tablas.
- No construir SQL con datos de usuario; usar parametros `:nombre`.
- Usar los componentes de `src/components/ui/` y los tokens de `globals.css` en lugar de estilos sueltos; no usar `window.confirm` ni `alert` (existen `useConfirm` y `toast`).
- Al tocar inventario, verificar movimientos y dashboard; al tocar muestras, revisar recepcion, procesamiento y extraccion.

## 17. Agregar un nuevo modulo

1. Crear `src/lib/server/modules/<modulo>.ts` con sus handlers y `ensure<Modulo>Schema()`.
2. Crear las rutas en `src/app/api/<modulo>/**/route.ts` con `apiRoute(handler)`.
3. Agregar el permiso en `DEFAULT_PERMISSIONS` (`src/lib/server/rbac.ts`).
4. Crear la ruta en `src/app/(app)/<modulo>/page.tsx` envuelta en `RequireModule`, con `useResource` para cargar datos y una hoja lateral en `src/components/features/<modulo>/` para el alta y la edicion.
5. Registrar el destino en `src/lib/client/nav.ts` (barra superior) y, si aplica, en la paleta de comandos (`CommandPalette.tsx`).
6. Reutilizar los componentes de `src/components/ui/`; los tokens de color y tipografia viven en `src/app/globals.css`.

## 18. Solucion de problemas

### El servidor no inicia

- Node.js LTS instalado (`node --version`), dependencias instaladas, `.env` presente.
- `npm run typecheck` y `npm run build` sin errores.
- Si `better-sqlite3` falla al cargar, reinstalar con la version de Node correcta (`npm rebuild better-sqlite3`).

### `/api/health/db` responde `unreachable`

- Revisar `DATABASE_URL` o `SQLITE_PATH` y permisos de la carpeta `instance/`.

### Login local no funciona

- `LOCAL_LOGIN_ENABLED=true`, usuario existente, activo, con rol y permisos.

### Login Microsoft no funciona

- `MICROSOFT_AUTH_ENABLED=true`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`, dominio permitido, usuario registrado, conectividad a JWKS de Microsoft.

### Un usuario no ve un modulo

- Revisar permisos del rol en la pantalla **Roles**.

## 19. Comandos utiles

```powershell
npm run dev
npm run build
npm run start:standalone
npm run typecheck
npm run lint
```

Buscar rutas:

```powershell
rg -n "export const (GET|POST|PUT|DELETE)" src/app/api
```

## 20. Riesgos tecnicos conocidos

- Las migraciones son ligeras y no versionadas.
- SQLite es adecuado para uso local; produccion multiusuario deberia usar MySQL/MariaDB.
- Los secretos por defecto solo deben usarse en desarrollo.
- `better-sqlite3` requiere Node.js LTS con binarios precompilados.
