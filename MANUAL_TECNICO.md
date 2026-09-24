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
      (app)/layout.tsx       # guardia de sesion + shell (barra lateral)
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
- Iconos Phosphor (`@phosphor-icons/react`); una sola familia tipografica: la del sistema (SF Pro en Apple) con Inter como respaldo, y Geist Mono de respaldo para la monoespaciada, ambas servidas con `next/font`.
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
GET    /api/admin/permissions                          catalogo: modulos, acciones y alcances
GET    /api/admin/roles                                roles con su matriz (permisos) y usuarios vigentes
GET    /api/admin/roles/<id>                           { role, permisos, usuarios }
POST   /api/admin/roles                                { nombre, descripcion, activo, permisos: [{modulo, accion, alcance}], motivo }
PUT    /api/admin/roles/<id>                           idem; motivo obligatorio si cambian permisos o activo
DELETE /api/admin/roles/<id>                           solo si nunca se asigno y no es sistemico

GET    /api/admin/usuarios                             con roles vigentes (alcance "propio": solo la propia cuenta)
GET    /api/admin/usuarios/<id>                        con asignaciones (vigente / futuro / vencido / revocado)
POST   /api/admin/usuarios                             exige rol_id (rol inicial)
PUT    /api/admin/usuarios/<id>                        datos de la cuenta (los roles no se cambian aqui)
DELETE /api/admin/usuarios/<id>                        baja logica con motivo
POST   /api/admin/usuarios/<id>/roles                  asignar { rol_id, vigente_desde, vigente_hasta?, motivo }
POST   /api/admin/usuarios/<id>/roles/<asig>/revocar   revocar { motivo }
```

- Ver cuentas y roles: `usuarios:V`; todo lo demas: `usuarios:G`.
- **Siempre queda un administrador**: un cambio (revocar, desactivar, dar de baja, editar permisos o desactivar un rol) que deje en cero a los usuarios activos con `usuarios:G` vigente, o que deje solo administradores con fecha de fin, responde **409** y no se aplica (`countActiveAdministrators` / `assertAdministratorRemains` en `rbac.ts`).
- **Combinaciones prohibidas**: al asignar un rol y al editar los permisos de un rol se evaluan las reglas de `src/lib/shared/combinaciones-roles.ts` (409 `COMBINACION_PROHIBIDA`; en la edicion de rol, con la lista de personas afectadas).
- Nadie se asigna ni se revoca roles a si mismo (403). Un rol con `es_sistemico = 1` ("Administrador técnico del sistema") no se elimina (403).
- El correo de una cuenta nueva (o un correo que cambia) debe ser del dominio `MICROSOFT_ALLOWED_DOMAIN`; una cuenta existente que conserva su correo se puede editar aunque sea de otro dominio (p. ej. las cuentas locales `@ficotox.local`).

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
GET    /api/samples/reception?anuladas=1
GET    /api/samples/reception/<id>            # incluye procesamientos derivados
POST   /api/samples/reception
PUT    /api/samples/reception/<id>
POST   /api/samples/reception/<id>/anular      # { motivo }
POST   /api/samples/reception/<id>/restaurar   # { motivo }
POST   /api/samples/reception/<id>/disposicion # cierra la muestra (7.4.4)
DELETE /api/samples/reception/<id>             # 405: no se borra, se anula

GET    /api/samples/processing/next-folio
GET    /api/samples/processing?anuladas=1
GET    /api/samples/processing/<id>
POST   /api/samples/processing                 # exige recepcion aceptada
PUT    /api/samples/processing/<id>
POST   /api/samples/processing/<id>/anular     # repone inventario PROC-*
POST   /api/samples/processing/<id>/restaurar
DELETE /api/samples/processing/<id>            # 405

GET    /api/samples/extraction/next-folio?tipo=E-A|E-D
GET    /api/samples/extraction?tipo=E-A|E-D&search=&anuladas=1
GET    /api/samples/extraction/<id>
POST   /api/samples/extraction                 # exige procesamiento vigente
PUT    /api/samples/extraction/<id>
POST   /api/samples/extraction/<id>/anular     # repone inventario EXT-*
POST   /api/samples/extraction/<id>/restaurar
DELETE /api/samples/extraction/<id>            # 405

GET    /api/samples/analysis/next-folio
GET    /api/samples/analysis?estado=&anulados=1&search=
GET    /api/samples/analysis/<id>
POST   /api/samples/analysis                   # cadena derivada de la extraccion
PUT    /api/samples/analysis/<id>              # ensayos:E solo en "registrado"; revisado o aprobado -> 409 (se anula y se registra otro)
POST   /api/samples/analysis/<id>/revisar      # ensayos:R (cargo: X-Actuar-Como si hay varios roles)
POST   /api/samples/analysis/<id>/aprobar      # ensayos:A (regla de dos personas apagada)
POST   /api/samples/analysis/<id>/anular       # 409 si esta en un informe autorizado
POST   /api/samples/analysis/<id>/restaurar
```

Las rutas aceptan tambien barra final (`/api/samples/reception/`), como el backend anterior.

Reglas de estado (`src/lib/server/samples-flow.ts`): `assertEditable` rechaza con 409 la edicion de registros bloqueados (`anulada`/`anulado`, recepciones `rechazada` y `cerrada`, analisis `aprobado`; el valor de "anulado" por tabla esta en `ANULADO_VALUE`); `restaurarRegistro` exige que la etapa de origen siga vigente; `assertOrigin` valida que el registro de origen exista y este vigente (y aceptado, en el caso de la recepcion); `advanceState` solo avanza hacia adelante (`registrada -> aceptada -> en_proceso -> analizada -> informada -> cerrada`); `anularRegistro` exige motivo, bloquea si hay dependientes vigentes, repone el inventario por prefijo de referencia y escribe la bitacora. Los catalogos oficiales (tipos de analisis, metodos, tipos de muestra, requisitos de inspeccion, decisiones de aceptacion, disposiciones, estados) viven en `src/lib/shared/sgc.ts`.

### 7.5.1 `informes`

```text
src/lib/server/modules/informes.ts
src/lib/server/informe-pdf.ts
```

```text
GET  /api/informes?estado=&anulados=1&search=
GET  /api/informes/summary
GET  /api/informes/next-folio
GET  /api/informes/recepcion/<id>      # cliente, items y analisis aprobados reportables
GET  /api/informes/<id>
POST /api/informes                     # borrador (informes:C); elaborado_cargo = rol con el que se actua
PUT  /api/informes/<id>                # informes:E, solo borrador (en revision ya no se edita)
POST /api/informes/<id>/revisar        # informes:R; revisado_cargo/revisado_rol_id del rol con el que se actua
POST /api/informes/<id>/autorizar      # informes:A; todos los analisis aprobados; autorizado_cargo del rol con el que se actua; congela resultados, genera PDF y marca el original de una enmienda como "sustituido" (PDF regenerado con la leyenda)
POST /api/informes/<id>/entregar       # informes:A; solo autorizados (entregado_cargo en entrega_json)
POST /api/informes/<id>/enmienda       # nueva version (v+1) en borrador, sustituye_a
POST /api/informes/<id>/anular         # informes:AN; regenera PDF con marca ANULADO
GET  /api/informes/<id>/pdf            # PDF definitivo o vista previa en borrador
```

El PDF se genera con `pdfkit` (`informe-pdf.ts`) con el contenido de 7.8.2: identificacion del laboratorio y del informe (folio `IR`, version, pagina x de y), cliente, items ensayados, metodos y fechas, resultados con unidades, limites y conformidad, declaraciones, firmas de elaboro/reviso/autorizo con el cargo con el que actuo cada quien (imagenes embebidas) y las marcas de enmienda o anulacion. Se guarda en `<instance>/informes/` con su `pdf_sha256`.

### 7.5.2 `documentos-sgc`

```text
GET  /api/documentos-sgc?tipo=&estado=&search=
GET  /api/documentos-sgc/lista-maestra         # solo vigentes, con revision_vencida
GET  /api/documentos-sgc/summary
GET  /api/documentos-sgc/<id>                  # con revisiones de la misma clave
POST /api/documentos-sgc                       # multipart (archivo) o JSON
PUT  /api/documentos-sgc/<id>                  # solo borrador / en_revision
POST /api/documentos-sgc/<id>/enviar-revision
POST /api/documentos-sgc/<id>/aprobar          # documentos:A; solo en_revision y con archivo (salvo externos); la vigente anterior pasa a obsoleta
POST /api/documentos-sgc/<id>/nueva-revision   # { cambios }; solo desde una revision vigente u obsoleta
POST /api/documentos-sgc/<id>/obsoletar        # { motivo }
POST /api/documentos-sgc/<id>/cancelar         # { motivo }
GET  /api/documentos-sgc/<id>/archivo          # descarga con Authorization
DELETE                                         # 405
```

Los archivos se guardan en `<instance>/documentos_sgc/` con SHA-256. La clave se valida con `DOCUMENT_KEY_RE` (`FX-<area><tipo>-<siglas>`) y de ella se derivan tipo y area (el cuerpo no puede contradecirla). La revision la asigna el servidor: solo el primer registro de una clave puede declarar la revision con la que llega; despues es `MAX + 1` y no puede haber dos revisiones en curso.

### 7.5.3 `audit`

```text
src/lib/server/audit.ts
src/lib/server/modules/audit.ts
```

```text
GET /api/audit?entidad=&entidad_id=&accion=&usuario=&search=&desde=&hasta=&limit=
GET /api/audit/<id>
GET /api/audit/summary
GET /api/audit/verify          # recorre la cadena de hashes
```

`registrarAuditoria(s, user, { accion, entidad, entidadId, referencia, motivo, antes, despues, detalle })` calcula el diff entre `antes` y `despues` (omite campos volatiles y sustituye las imagenes de firma por `[firma]`), guarda los dos snapshots y encadena el sello `hash = HMAC-SHA256(SECRET_KEY, contenido + hash_anterior)`. La llave vive fuera de la base: `SECRET_KEY` cuando esta configurada, y si no, una llave aleatoria de 32 bytes que el sistema crea la primera vez en `<instance>/auditoria.key` (permisos 600) para que la proteccion no dependa de recordar configurar el entorno. Asi, quien solo tenga el archivo de la base no puede recalcular la cadena despues de alterarla. **Respalda la llave junto con la base: si cambia o se pierde, la verificacion de lo ya escrito falla.** La tabla `auditoria` tiene triggers que abortan cualquier `UPDATE` o `DELETE` (SQLite `RAISE(ABORT)`, MySQL `SIGNAL`). El historial de un registro (`entidad` + `entidad_id`) lo puede leer quien tenga permiso de lectura del modulo al que pertenece la entidad (`muestras_* -> muestras`, `informes`, `documentos_sgc -> documentos`, `reactivos`, `usuarios`, ...); el log completo, `summary` y `verify` requieren `auditoria:read`. `verify` devuelve `{ ok, total, primer_error, filas_faltantes_al_final, filas_faltantes_intermedias, triggers_ok }`: recalcula la cadena, comprueba que no falten filas al final (`sqlite_sequence` / `AUTO_INCREMENT` contra `MAX(id)`) ni en medio (huecos de id) y que los dos triggers de proteccion sigan presentes; los triggers se reponen en cada escritura si alguien los retiro.

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
- `shell/AccountSheet.tsx`: "Mi cuenta" (datos de la sesion y eleccion de avatar; `PUT /api/auth/me/avatar`). `ui/AvatarArt.tsx` y `ui/AvatarPicker.tsx`: catalogo ilustrado y selector; las claves viven en `lib/shared/avatars.ts` y se guardan en `usuarios.avatar`.
- `shell/AppShell.tsx`: barra lateral translucida en cuatro grupos (`NAV_GROUPS`), colapsable y con panel movil, boton Buscar y menu de usuario; `CommandPalette.tsx` (⌘K / Ctrl+K) y `HomeSearch.tsx` (buscador del Inicio) comparten el motor `lib/client/search.ts` (`useGlobalSearch`); `SearchHit.tsx` es la fila de resultado comun; `Brand.tsx` dibuja la marca (diatomea).
- `session/SessionProvider.tsx`: carga `/api/auth/config`, valida el token con `/api/auth/me`, expone `can(modulo, accion)` y `logout`. `RequireModule` muestra un estado "sin acceso" cuando el rol no puede leer el modulo.
- `features/*`: pantallas por dominio. Los catalogos abren hojas laterales (`*Sheet.tsx`); los formatos de muestra son paginas completas (`ReceptionForm`, `ProcessingForm`, `ExtractionForm`) con `FormLayout` (cabecera fija, indice de secciones).
- `lib/client/store.ts`: `useResource(claves, loader)` carga datos y se recarga cuando alguien llama `invalidate("reactivos", ...)` tras guardar; sustituye al antiguo `loadedPages`.

Sesion en el navegador: `ficotox_access_token`, `ficotox_user`, `ficotox_permissions` en `localStorage`.

Helpers de API en `src/lib/client/api.ts`: `getJsonAuth`, `sendJsonAuth`, `sendFormAuth`, `postJson`.

## 9. Seguridad y autenticacion

### 9.1 JWT

Los tokens se emiten en login y se firman con `JWT_SECRET` usando HS256. Desde la Fase 1 **el token solo identifica a la persona** (`sub`, `email`, `nombre`, `iat`, `exp`): los roles y permisos se calculan en cada peticion desde la base, asi que revocar o vencer un rol tiene efecto inmediato sin volver a iniciar sesion. Una cuenta desactivada recibe 403 aunque su token siga vigente.

El acceso local requiere correo y contrasena. Las contrasenas se guardan en `usuarios.password_hash` con scrypt (`src/lib/server/password.ts`, formato `scrypt$N$salt$hash`) y se validan en `POST /api/auth/login`; un correo inexistente o una contrasena incorrecta responden 401 con el mismo mensaje. Los usuarios se crean con contrasena desde la pantalla de Usuarios (minimo 8 caracteres) y `scripts/set-password.mjs <correo> <contrasena>` permite asignarla desde la terminal en instalaciones SQLite.

Los endpoints protegidos llaman a `requireUser(request)`, que:

1. Lee el header `Authorization`.
2. Valida formato `Bearer <token>`.
3. Decodifica el JWT.
4. Responde 401 con "Token expirado" o "Token invalido" segun corresponda.

### 9.2 Permisos (Fase 1)

Detalle completo, matriz y decisiones pendientes: **`docs/CATALOGO_PERMISOS.md`**.

- **Modelo**: un permiso es `(rol, modulo, accion, alcance)` en la tabla `rol_acciones` (`src/lib/shared/permisos.ts`). Modulos: `usuarios, documentos, muestras, ensayos, informes, equipos, inventario, calidad, compras`. Acciones: `V C E R A AN G` (C/E/R/A/AN implican V; G implica todas). Alcances aplicados: `total, propio, estado, recepcion, preparacion, borrador, bitacora, uso, mantenimiento, movimientos`; diferidos (se comportan como `total`, salvo en usuarios, donde son solo V): `asignado, supervisado, proyecto, tecnico, investigacion, autorizados, administrativo, limitado, incidencias, auditoria`.
- **Varios roles por persona** (`usuario_roles`, con vigencia, motivo y revocacion; nada se borra). Permisos efectivos = union de los roles vigentes hoy de roles activos. `usuarios.id_rol` se migro al arrancar ("Migración Fase 1", en la bitacora) y ya no se lee.
- **Servidor**: cada endpoint llama `requirePermission(s, user, modulo, accion, contexto?)` (`src/lib/server/rbac.ts`), que carga la persona (activa) y sus roles vigentes desde la base, exige la accion y, con contexto, el alcance (`{ objeto, borrador, propio }`). Devuelve los alcances y los roles que otorgan la accion. `soloEstado(permiso)` recorta las respuestas de muestras con alcance `estado`. No queda ninguna verificacion por nombre de rol ni el modulo `aprobaciones`.
- **Cargo con el que se actua**: `cargoActuante(request, permiso)` elige el rol (uno solo, o el que llega en `X-Actuar-Como`; si hay varios y no llega, 409 `ELEGIR_CARGO` con las opciones). El cliente (`src/lib/client/api.ts` + `ActuarComoProvider`) pide "Actuar como" y repite la peticion. Se guarda en `creado_rol_id/creado_cargo`, `revisado_*`, `aprobado_*`, `autorizado_*`, `elaborado_*`, `anulado_*`, `entrega_json` y en la bitacora (`actuo_como`).
- **Captura con recursos**: una extraccion o un analisis con equipos usados exige ademas `equipos:C` (alcance `uso` o mayor); con insumos, `inventario:C` (alcance `movimientos` o mayor).
- **El arranque no crea roles ni concede permisos**: solo asegura tablas y el catalogo de modulos. Los roles se cargan con `scripts/seed-roles-usuarios.mjs` o desde Administracion > Roles.
- **Vencimientos**: `barrerVencimientos()` (bootstrap, una vez por minuto antes de atender peticiones) deja `vencer_rol` en la bitacora para cada asignacion cuya vigencia termino.
- **Interfaz**: `useSession().can(modulo, accion = "V", contexto?)` y `alcance(modulo, accion)`; los permisos se vuelven a pedir cada minuto y al volver a la ventana. Una persona sin roles vigentes solo ve "Sin permisos asignados".

La accion `AN` significa anular o dar de baja con motivo: ningun endpoint de registros tecnicos o de inventario borra filas (la unica excepcion son los roles que nunca se asignaron, que si se eliminan y quedan en la bitacora como `eliminar`). Un reactivo o consumible dado de baja no se puede **elegir de nuevo** (409), pero un registro que ya lo declaraba se sigue pudiendo reabrir y guardar.

### 9.3 Microsoft Entra ID

El login Microsoft valida el `id_token` con las claves JWKS del tenant (`jose`), `audience` contra `MICROSOFT_CLIENT_ID`, `issuer` contra el tenant, el dominio permitido y la existencia del usuario en `usuarios`.

## 10. Base de datos

### 10.1 Tablas principales

`roles`, `permisos` (catalogo de modulos), `rol_acciones` (permisos de la Fase 1), `usuario_roles` (asignaciones con vigencia), `rol_permisos` (modelo anterior, sin uso), `usuarios`, `reactivos`, `consumibles`, `equipos`, `mantenimientos`, `movimientos`, `muestras_recepcion`, `muestras_procesamiento`, `muestras_extraccion`, `muestras_analisis`, `informes`, `documentos_sgc`, `auditoria`, `reportes_mantenimiento`.

Columnas de baja logica y anulacion (`src/lib/server/inventory-baja.ts`, `src/lib/server/samples-flow.ts`): `activo`, `baja_motivo`, `baja_en`, `baja_por` en reactivos, consumibles y equipos; `anulado_en`, `anulado_por`, `motivo_anulacion`, `estado_previo` en las tablas de muestras. `muestras_recepcion` agrega `decision_aceptacion`, `aceptacion_json` (inspeccion, comunicacion al cliente) y `disposicion_json`. Las listas filtran `activo = 1` / `estado <> 'anulada'` salvo `?bajas=1` / `?anuladas=1`.

### 10.2 Migraciones ligeras

No se usan migraciones versionadas. Cada modulo tiene funciones `ensure*Schema()` que crean tablas si no existen y agregan columnas faltantes con `addColumnIfMissing` (`src/lib/server/schema.ts`), con variantes para SQLite y MySQL.

Excepcion: `muestras_extraccion` cambio su unicidad de `UNIQUE(folio_num)` a `UNIQUE(tipo_registro, folio_num)` (cada formato de extraccion, `E-A` ASP y `E-D` DSP, lleva su propia serie de folios). `ensureSamplesExtraccionSchema()` detecta la restriccion vieja y la migra una sola vez: en SQLite copia el archivo a `instance/backups/ficotox-<fecha>-pre-folio-por-tipo.sqlite3` y reconstruye la tabla dentro de la transaccion; en MySQL reemplaza el indice unico. Si la reconstruccion falla, la transaccion se revierte y la tabla queda intacta.

Columnas agregadas en esta version: `muestras_extraccion.equipos_json` (equipos utilizados con clave y folio de bitacora) y `equipos.clave_bitacora`.

### 10.2.1 Tipos de extraccion

Los tipos, claves y helpers de folio viven en `src/lib/shared/extraction.ts` (compartido entre servidor y cliente). En el cliente, cada formato es un "protocolo" (`src/components/features/samples/extraction/asp.tsx`, `dsp.tsx`) que declara pasos, insumos de cantidad fija, equipos y secciones; `ExtractionForm.tsx` es comun. Para agregar un formato nuevo (PSP, pigmentos...) se amplia la union `ExtractionType`, `EXTRACTION_TYPES` y `normalizeExtractionType` en `extraction.ts`, se registra el protocolo en `ExtractionForm.tsx` y se escribe el protocolo; los route handlers y el esquema no cambian.

`GET /api/samples/extraction?tipo=E-D` filtra por formato; con `search=E-D 12` busca exactamente ese folio de esa serie y con `search=12` por coincidencia en ambas. `GET /api/samples/extraction/next-folio?tipo=E-D` regresa el siguiente folio de esa serie. Al crear, `tipo_registro` se valida (`400` si no es un tipo soportado; si falta se asume `E-A` por compatibilidad); al editar, si falta se conserva el tipo almacenado. `clave_revision` se fuerza al formato del tipo (admite sufijo de revision). `409` si el folio ya existe en esa serie.

Las filas de `uso_inventario_json` generadas por el protocolo llevan `origen: "protocolo"` y `campo`; al reabrir, el formulario las recalcula y solo conserva como manuales las que no vienen del protocolo (las anteriores a este cambio, sin `origen`, se casan por tipo y referencia).

### 10.2.2 Esquemas y transacciones

Cada `ensure*Schema()` se ejecuta **una sola vez por proceso** (registro compartido en `src/lib/server/schema.ts`: `schemaReady` / `markSchemaReady`). El arranque (`bootstrap.ts`) las corre todas y confirma en una transaccion propia; si falla, llama a `resetSchemaMemo()` para repetir el DDL en el siguiente intento. Ninguna de ellas hace `commit` por su cuenta: antes lo hacian a mitad del handler, y eso impedia deshacer los cambios de datos cuando la operacion fallaba despues (por ejemplo, al reponer inventario y abortar la edicion).

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
npm test               # pruebas de API + navegador (ver docs/VALIDACION.md)
npm run test:api       # solo API
```

`npm test` copia la base congelada `instance/fixtures/ficotox-base.sqlite3` (base vacia + roles y usuarios de la Fase 0) a `instance/test/ficotox-test.sqlite3`, crea **solo en esa copia** el rol "QA pruebas automatizadas" (todos los permisos) y el usuario `qa@ficotox.local`, levanta `next dev` en el puerto 3100 sobre la copia, crea los datos de apoyo (`tests/datos-apoyo.mjs`) y corre `tests/api-*.mjs` (flujo completo por HTTP) y `tests/ui/*.mjs` (Playwright contra el Chrome de Playwright mas reciente o `CHROME_PATH`). La base real nunca se toca. Detalle en `docs/VALIDACION.md`.

Con el servidor levantado:

```text
GET http://localhost:3000/api/health      -> {"ok": true, "service": "ficotox-backend"}
GET http://localhost:3000/api/health/db   -> {"ok": true, "database": "reachable", "archivo": "ficotox.sqlite3"}
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

### 15.1 Base de pruebas

`instance/fixtures/ficotox-base.sqlite3` es una base vacia (creada por el arranque) con los 10 roles y usuarios de la Fase 0. Se genera con `npm run test:fixture` (`tests/build-fixture.mjs`: levanta `next dev` en el puerto 3101 sobre una base nueva, corre el script de roles con contrasenas aleatorias y copia el resultado); `npm test` la genera sola si no existe y `npm test -- --rebuild-fixture` la rehace. `tests/reset-test-db.mjs` la copia a `instance/test/`, agrega el rol y el usuario de QA y asigna contrasenas aleatorias a los usuarios del catalogo (`instance/test/credenciales-roles.json`, que usan `tests/api-roles.mjs` y `tests/ui/roles.mjs`). Ya no hay respaldo automatico a la base real: si falta el fixture, se genera. `SOURCE_DB=ruta` fuerza otra base de origen. La carpeta `instance/fixtures/` no se versiona.

### 15.2 Datos de demostracion

`scripts/demo-seed.mjs` llena una instancia **a traves de la API** (todo queda en la bitacora, con usuarios y fechas reales):

```bash
FICOTOX_EMAIL=jorge.ramirez@ficotox.local FICOTOX_PASSWORD='...' node scripts/demo-seed.mjs   # BASE=http://localhost:3000/api por omision
```

Requiere los roles del catalogo (`npm run seed:roles`) y una cuenta con `usuarios:G` (p. ej. el Administrador técnico del sistema), que solo da de alta a tres personas con roles del catalogo (dos "Coordinador/a del Área Técnica" y una "Responsable General"); cada paso lo hace la persona con el permiso que corresponde. Crea 19 equipos con clave de bitacora (`FX-TCB-BA1`, `LC1`, `CE1`, `VO1`...), mantenimientos, soluciones preparadas y consumibles del protocolo, documentos del SGC vigentes y nueve recepciones en distintos puntos del flujo (hasta informe entregado y disposicion final; una rechazada, una con desviacion, una anulada). Es idempotente: busca antes de crear. Respaldar la base antes de correrlo sobre una instancia real.

### 15.3 Reinicio limpio y alta de roles (Fase 0; script actualizado en la Fase 1)

Procedimiento aplicado el 2026-09-24 (rama `fase-0-reinicio`); repetible en otra instalacion SQLite:

1. **Detener el servidor** (`lsof -iTCP:3000 -iTCP:5000 -sTCP:LISTEN`; en macOS el puerto 5000 lo ocupa AirPlay/ControlCenter, no FICOTOX).
2. **Respaldar** en `instance/backups/pre-reinicio-<AAAAMMDD-HHMM>/`: la base con `sqlite3 instance/ficotox.sqlite3 ".backup '<dir>/ficotox.sqlite3'"`, `instance/auditoria.key` si existe, `instance/informes/`, `instance/maintenance_reports/` e `instance/documentos_sgc/`. Si la llave del sello es `SECRET_KEY` (no hay `auditoria.key`), **no cambiarla**: la bitacora anterior solo se puede verificar con ella.
3. **Verificar** la copia: `PRAGMA integrity_check` = `ok`, mismo `COUNT(*)` de `auditoria` (y del resto de tablas) y mismo ultimo `hash` que el original; PDFs identicos (`diff -r`). Dejar la evidencia en `LEEME.txt` dentro del respaldo.
4. **Mover** (no borrar) los originales fuera de `instance/`, a `backups/pre-reinicio-<AAAAMMDD-HHMM>/instance-original/` (carpeta ignorada por git). La bitacora anterior se conserva solo en el respaldo; la nueva inicia su propia cadena.
5. **Crear el esquema**: arrancar FICOTOX (`npm run dev`), abrir `http://localhost:3000/api/health/db` y detenerlo. El arranque ya no crea ningun rol.
6. **Alta de roles y usuarios**: copiar `scripts/seed-usuarios.example.json` a `scripts/seed-usuarios.local.json` (ignorado por git), escribir las contrasenas (minimo 8 caracteres) y correr, con el servidor detenido:

   ```bash
   npm run seed:roles            # node scripts/seed-roles-usuarios.mjs [--usuarios archivo.json] [--db base.sqlite3]
   ```

   Crea los 10 roles de `scripts/roles-catalogo.json` con su matriz de la Fase 1 (y `roles.clave`), un usuario local por rol y su asignacion en `usuario_roles`, con `hashPassword()` de `src/lib/server/password.ts` (requiere Node 22.18+ o 24). Es idempotente: un rol (por clave o nombre) o usuario (por correo) existente no se duplica; a un rol existente sin permisos del modelo nuevo (p. ej. de la Fase 0) se le carga la matriz; si ya tiene otros permisos se respeta (aviso) salvo con `--actualizar-permisos`; si una persona no tiene vigente su rol del catalogo, se le asigna. Cada cambio queda en la bitacora (actor `sistema`, motivo `--motivo`, por omision "Catálogo de roles Fase 1") sellado con `src/lib/shared/audit-chain.mjs`, **la misma implementacion que usa el servidor**, y al final recalcula la cadena completa. Requiere el esquema de la Fase 1 (arrancar el servidor una vez). Solo SQLite (en MySQL, ver abajo).
7. **Comprobar**: iniciar sesion con cada usuario, revisar el menu y pulsar **Verificar integridad** en Auditoria.

**MySQL/MariaDB.** El script solo aplica a SQLite y el arranque ya no crea ningun rol, asi que en una instalacion MySQL nueva nadie puede entrar a Administracion hasta crear a mano el primer administrador (despues de que el arranque cree el esquema):

```sql
INSERT INTO roles (nombre, descripcion, clave, es_sistemico, activo)
VALUES ('Administrador técnico del sistema', 'Administra cuentas, roles y asignaciones; consulta la bitácora.', 'admin_tecnico', 1, 1);
SET @rol = LAST_INSERT_ID();
INSERT INTO rol_acciones (id_rol, modulo, accion, alcance) VALUES
  (@rol, 'usuarios', 'G', 'total'), (@rol, 'documentos', 'V', 'tecnico'), (@rol, 'muestras', 'V', 'estado'),
  (@rol, 'equipos', 'V', 'total'), (@rol, 'calidad', 'V', 'bitacora');
-- hash: node -e 'import("./src/lib/server/password.ts").then(m=>console.log(m.hashPassword(process.argv[1])))' 'contraseña'
INSERT INTO usuarios (nombre, email, activo, id_rol, auth_provider, password_hash)
VALUES ('Nombre Apellido', 'correo@cicese.mx', 1, @rol, 'local', '<hash scrypt$...>');
INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, motivo, asignado_en)
VALUES (LAST_INSERT_ID(), @rol, CURDATE(), 'Alta manual del primer administrador', NOW());
```

Esas altas no quedan en la bitacora (se hicieron fuera de la aplicacion); anotarlas en el registro de la instalacion. El resto de los roles de `scripts/roles-catalogo.json` se da de alta desde Administracion > Roles, con bitacora. Soporte MySQL en el script: sigue fuera de alcance (documentado).

Las cuentas del catalogo son locales (`@ficotox.local`); no pueden entrar con Microsoft. Para dar de alta personal real, usar correos `@cicese.mx` desde Administracion > Usuarios.

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
5. Registrar el destino en `src/lib/client/nav.ts` (`NAV_GROUPS`, barra lateral) y, si aplica, en los destinos/acciones de `src/lib/client/search.ts` (busqueda y paleta).
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

- Revisar permisos del rol en la pantalla **Roles**. Un permiso ausente es "no concedido": el arranque no rellena permisos.
- `documentos` esta apagado por `FEATURES.documentos`; aunque el rol tenga el permiso, no aparece en el menu.

## 19. Comandos utiles

```powershell
npm run dev
npm run build
npm run start:standalone
npm run typecheck
npm run lint
npm test                 # regenera la base de prueba si falta (--rebuild-fixture para forzarlo)
npm run test:fixture     # rehace instance/fixtures/ficotox-base.sqlite3
npm run seed:roles       # alta idempotente de roles y usuarios (scripts/seed-usuarios.local.json)
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
