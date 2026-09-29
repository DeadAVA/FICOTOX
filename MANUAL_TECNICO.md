# Manual Tecnico - FICOTOX

## 1. Proposito

Este documento describe la arquitectura, instalacion, configuracion, operacion tecnica y mantenimiento del sistema FICOTOX.

FICOTOX es una aplicacion web para gestion de laboratorio. Esta compuesta por:

- Una aplicacion Next.js (App Router) que sirve la interfaz React y la API REST (`/api/*`).
- Base de datos SQLite por defecto, con soporte opcional para MySQL/MariaDB.
- Autenticacion solo con usuario (correo) y contrasena del sistema (Fase 3: se retiro Microsoft Entra ID).
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
      login/page.tsx         # acceso con correo y contrasena
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
- `jose` para firmar y verificar el JWT de la sesion.

### Interfaz

- React 19 con Tailwind CSS 4 (tokens en `src/app/globals.css`, ver `docs/DISENO_UI.md`).
- Radix UI (`radix-ui`) para dialogos, hojas laterales, menus y tooltips accesibles; `cmdk` para la paleta de comandos; `sonner` para notificaciones.
- Iconos Phosphor (`@phosphor-icons/react`); una sola familia tipografica: la del sistema (SF Pro en Apple) con Inter como respaldo, y Geist Mono de respaldo para la monoespaciada, ambas servidas con `next/font`.
- SheetJS para lectura de archivos Excel en navegador (`public/vendor/xlsx`).
- Sin dependencias de proveedores externos de identidad (Fase 3).

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
| `SECRET_KEY` | Llave del sello de la bitacora (no se cambia; ver 9.5) | `ficotox-dev-secret` (entonces se usa `instance/auditoria.key`) |
| `JWT_SECRET` | Secreto para firmar JWT. **En produccion** es obligatorio, de 32+ caracteres y distinto de los valores de ejemplo, o el servidor no arranca | `ficotox-jwt-secret` (solo desarrollo) |
| `JWT_EXPIRES_HOURS` | Duracion maxima de la sesion en horas | `8` |
| `SESION_INACTIVIDAD_MIN` | Cierre de sesion por inactividad (minutos); aviso 1 min antes | `30` |
| `LOGIN_MAX_INTENTOS` / `LOGIN_VENTANA_MIN` / `LOGIN_BLOQUEO_MIN` | Fallos que bloquean una cuenta, ventana en que se cuentan y duracion del bloqueo | `5` / `15` / `15` |
| `LOGIN_IP_MAX_INTENTOS` | Fallos desde una IP (misma ventana) que bloquean esa IP | `20` |
| `REAUTH_TTL_MIN` | Vigencia del token de reautenticacion | `5` |
| `TRUST_PROXY` | Detras de un proxy propio: tomar la IP de `X-Forwarded-For`/`X-Real-IP` que fija el proxy | `false` |
| `SUPERVISAR_CUENTAS_TEMPORALES` | Lo que captura una cuenta temporal con supervisor queda pendiente de visto bueno (decision pendiente de validar) | `true` |
| `DATABASE_URL` | URL de base externa (`mysql://usuario:password@host:3306/ficotox`) | No definida |
| `SQLITE_PATH` | Ruta de SQLite local | `instance/ficotox.sqlite3` |
| `ALLOWED_EMAIL_DOMAINS` | Dominios de correo admitidos al dar de alta o cambiar el correo de una cuenta (lista separada por comas; vacio = cualquiera). Una cuenta que conserva su correo se edita aunque el dominio ya no este en la lista | Vacio |
| `SOLICITUD_VENCE_DIAS` | Dias que una solicitud de autorizacion espera al segundo usuario antes de vencer | `7` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio del informe desde la plataforma (Fase 6, opcional; todas o ninguna). Sin ellas solo hay envio manual con evidencia. `SMTP_HOST=prueba`: transporte en memoria para pruebas | No definidas |
| `EVIDENCIA_MAX_MB` | Fase 10: tamano maximo de cada adjunto de evidencia instrumental (MB) | `25` |
| `EVIDENCIA_OBLIGATORIA_ANALISIS` | Fase 10: "Enviar a revision" exige al menos un adjunto vigente (409 `evidencia_requerida`); no es retroactivo | `true` |
| `FICOTOX_BACKUP_DIR` | Fase 10: carpeta de los respaldos locales (servidor, scripts y `backup_ficotox.py`) | `backups/` |
| `RESPALDO_RETENCION` | Fase 10: respaldos locales que se conservan (nunca se borra el ultimo verificado) | `30` |
| `RESPALDO_AVISO_HORAS` / `PRUEBA_RESTAURACION_AVISO_DIAS` | Fase 10: avisos "sin respaldo" y "sin prueba de restauracion" (Respaldos, Inicio, campana) | `24` / `90` |
| `CORS_ORIGINS` | Origenes permitidos por CORS (lista separada por comas o `*`); vacio = solo el mismo origen | Vacio (mismo origen) |
| `HOST` / `PORT` | Host y puerto del lanzador standalone | `0.0.0.0` / `5000` |
| `FICOTOX_OPEN_BROWSER` | Abrir navegador al iniciar el lanzador | `true` |

Se aceptan tambien los nombres anteriores `FLASK_HOST`, `FLASK_PORT` y `FLASK_OPEN_BROWSER`.

Ejemplo SQLite:

```env
SECRET_KEY=<64 caracteres aleatorios; openssl rand -hex 32>
JWT_SECRET=<otros 64 caracteres aleatorios>
JWT_EXPIRES_HOURS=8
SESION_INACTIVIDAD_MIN=30
ALLOWED_EMAIL_DOMAINS=cicese.mx,ficotox.local
SQLITE_PATH=instance/ficotox.sqlite3
CORS_ORIGINS=
```

Ejemplo MySQL/MariaDB:

```env
DATABASE_URL=mysql://usuario:password@localhost:3306/ficotox
SECRET_KEY=<64 caracteres aleatorios>
JWT_SECRET=<otros 64 caracteres aleatorios>
ALLOWED_EMAIL_DOMAINS=cicese.mx,ficotox.local
```

## 7. Modulos de la API

Cada modulo vive en `src/lib/server/modules/` y sus rutas en `src/app/api/`.

### 7.1 `auth`

```text
src/lib/server/modules/auth.ts
src/lib/server/auth.ts
```

- Configuracion publica del acceso, login con correo y contrasena del sistema, emision de JWT y usuario actual. (Fase 3: se eliminaron el login y la reautenticacion con Microsoft Entra ID, la dependencia `@azure/msal-browser`, `/api/auth/microsoft`, la validacion JWKS y las variables `MICROSOFT_*` y `LOCAL_LOGIN_ENABLED`.)

```text
GET  /api/auth/config
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/reauth          { accion, password } -> { token, expira_en } (un solo uso, REAUTH_TTL_MIN)
POST /api/auth/password        { actual, nueva } -> sesion nueva (las demas se cierran)
POST /api/auth/logout-all      cerrar sesion en todos los dispositivos (token_version + 1)
PUT  /api/auth/me/cargo        { rol_id | null } cargo predeterminado

GET  /api/supervision                                  { por_supervisar, regresados }
POST /api/supervision/<tabla>/<id>/visto-bueno         { observaciones? } (reautenticacion supervision:visto_bueno)
POST /api/supervision/<tabla>/<id>/regresar            { observaciones } (5+ caracteres)
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
POST   /api/admin/usuarios/<id>/desbloquear            { motivo } (reautenticacion)
POST   /api/admin/usuarios/<id>/password               { motivo } -> { password_temporal } (se muestra una vez; cambio obligatorio)
GET    /api/admin/accesos?desde&hasta&dias             revision de accesos; &formato=csv&seccion=cuentas|eventos
```

- **Fase 2 · cuentas**: `tipo_cuenta` (`permanente|temporal`), `vigente_desde`, `vigente_hasta`, `supervisor_id`, `motivo_ultimo_cambio` (en el alta y en `PUT`; `motivo_cuenta` es obligatorio si cambian). Temporal exige fecha de fin y supervisor. El supervisor es una persona activa, vigente, con cuenta permanente y un rol con R o A en `ensayos` o `muestras` (por permisos); nadie se supervisa a si mismo. El rol de estudiante (`clave = estudiante`) solo va en cuentas temporales. Un rol no puede quedar vigente fuera de la vigencia de la cuenta (400); al acortar la cuenta, sus roles se acotan. Cambiar vigencia o supervisor deja `cambiar_vigencia` en la bitacora, y cada rol ajustado su propio evento: `acotar_rol` (nueva fecha de fin) o `revocar_rol` si el rol empezaba despues del nuevo fin (no quedan rangos invertidos). Extender despues la cuenta no devuelve esos roles: se reasignan.

- Ver cuentas y roles: `usuarios:V`; todo lo demas: `usuarios:G`.
- **Siempre queda un administrador**: un cambio (revocar, desactivar, dar de baja, editar permisos o desactivar un rol) que deje en cero a los usuarios activos con `usuarios:G` vigente, o que deje solo administradores con fecha de fin, responde **409** y no se aplica (`countActiveAdministrators` / `assertAdministratorRemains` en `rbac.ts`).
- **Combinaciones prohibidas**: al asignar un rol y al editar los permisos de un rol se evaluan las reglas de `src/lib/shared/combinaciones-roles.ts` (409 `COMBINACION_PROHIBIDA`; en la edicion de rol, con la lista de personas afectadas).
- Nadie se asigna ni se revoca roles a si mismo (403). Un rol con `es_sistemico = 1` ("Administrador técnico del sistema") no se elimina (403).
- El correo de una cuenta nueva (o un correo que cambia) debe ser de un dominio de `ALLOWED_EMAIL_DOMAINS` (vacio = cualquiera); una cuenta existente que conserva su correo se puede editar aunque su dominio ya no este en la lista.

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
POST   /api/samples/analysis/<id>/aprobar      # ensayos:A (segregacion: quien lo elaboro no lo revisa ni aprueba)
POST   /api/samples/analysis/<id>/anular       # 409 si esta en un informe autorizado
POST   /api/samples/analysis/<id>/restaurar
POST   /api/samples/analysis/<id>/enviar-revision  # Fase 10: 409 evidencia_requerida sin adjunto vigente
GET    /api/samples/analysis/<id>/adjuntos     # Fase 10: evidencia instrumental (items con integridad, edicion {permitido, motivo})
POST   /api/samples/analysis/<id>/adjuntos     # Fase 10: multipart archivo, tipo_evidencia, descripcion
GET    /api/adjuntos/<id>/archivo[?inline=1]   # Fase 10: descarga (X-Integridad-Adjunto: ok | alterado | faltante)
POST   /api/adjuntos/<id>/anular               # Fase 10: { motivo } + reautenticacion adjuntos:anular
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
POST /api/informes/<id>/autorizar      # informes:A + autorizacion_informe; todos los analisis aprobados; solo firma (Fase 6: ya no genera PDF ni mueve la recepcion)
POST /api/informes/<id>/liberar        # Fase 6: informes:A + liberacion_informe + reautenticacion; congela resultados, genera el PDF final con SHA-256, recepcion -> liberada, original de una enmienda -> "sustituido"
GET  /api/informes/<id>/envios         # Fase 6: informes:V; envios y smtp_disponible
POST /api/informes/<id>/envios         # informes:A; multipart: destinatario_nombre, destinatario_correo, enviado_en, observaciones, evidencia (PDF/imagen/.eml/.msg)
POST /api/informes/<id>/envios/smtp    # informes:A; solo si SMTP_* configurado (si no, 404 smtp_no_configurado)
POST /api/informes/<id>/envios/<eid>/confirmar   # informes:A; { confirmacion_en, confirmacion_nota }
GET  /api/informes/<id>/envios/<eid>/evidencia   # informes:V; archivo de evidencia (X-Evidencia-Sha256)
POST /api/informes/<id>/enmienda       # nueva version (v+1) en borrador, sustituye_a
POST /api/informes/<id>/anular         # informes:AN; regenera PDF con marca ANULADO
GET  /api/informes/<id>/pdf            # PDF final o vista previa (no liberado); X-Integridad-Pdf: ok | alterado | faltante | sin_pdf_final
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

Los tokens se emiten en login y se firman con `JWT_SECRET` usando HS256. Desde la Fase 1 **el token solo identifica a la persona** (`sub`, `email`, `nombre`, `iat`, `exp`): los roles y permisos se calculan en cada peticion desde la base, asi que revocar o vencer un rol tiene efecto inmediato sin volver a iniciar sesion. Una cuenta desactivada o fuera de vigencia recibe 401 aunque su token siga vigente; desde la Fase 2 el token lleva `tv` (token_version) para revocarlo.

El acceso local requiere correo y contrasena. Las contrasenas se guardan en `usuarios.password_hash` con scrypt (`src/lib/server/password.ts`, formato `scrypt$N$salt$hash`) y se validan en `POST /api/auth/login`; un correo inexistente o una contrasena incorrecta responden 401 con el mismo mensaje. Los usuarios se crean con contrasena desde la pantalla de Usuarios (minimo 10 caracteres; Fase 2) y `scripts/set-password.mjs <correo> <contrasena>` permite asignarla desde la terminal en instalaciones SQLite.

Los endpoints protegidos llaman a `requireUser(request)`, que:

1. Lee el header `Authorization`.
2. Valida formato `Bearer <token>`.
3. Decodifica el JWT.
4. Responde 401 con "Token expirado" o "Token invalido" segun corresponda.

### 9.2 Permisos (Fase 1)

Detalle completo, matriz y decisiones pendientes: **`docs/CATALOGO_PERMISOS.md`**.

- **Modelo**: un permiso es `(rol, modulo, accion, alcance)` en la tabla `rol_acciones` (`src/lib/shared/permisos.ts`). Modulos: `usuarios, documentos, muestras, ensayos, informes, equipos, inventario, calidad, compras`. Acciones: `V C E R A AN G` (C/E/R/A/AN implican V; G implica todas). Alcances aplicados: `total, propio, estado, recepcion, preparacion, borrador, bitacora, uso, mantenimiento, movimientos`; `supervisado` se aplica desde la Fase 2 (9.2.1); diferidos (se comportan como `total`, salvo en usuarios, donde son solo V de la propia cuenta, y en calidad, donde son sin acceso): `asignado, proyecto, tecnico, investigacion, autorizados, administrativo, limitado, incidencias, auditoria`.
- **Varios roles por persona** (`usuario_roles`, con vigencia, motivo y revocacion; nada se borra). Permisos efectivos = union de los roles vigentes hoy de roles activos. `usuarios.id_rol` se migro al arrancar ("Migración Fase 1", en la bitacora) y ya no se lee.
- **Servidor**: cada endpoint llama `requirePermission(s, user, modulo, accion, contexto?)` (`src/lib/server/rbac.ts`), que carga la persona (activa) y sus roles vigentes desde la base, exige la accion y, con contexto, el alcance (`{ objeto, borrador, propio }`). Devuelve los alcances y los roles que otorgan la accion. `soloEstado(permiso)` recorta las respuestas de muestras con alcance `estado`. No queda ninguna verificacion por nombre de rol ni el modulo `aprobaciones`.
- **Cargo con el que se actua**: `cargoActuante(request, permiso)` elige el rol (uno solo, o el que llega en `X-Actuar-Como`; si hay varios y no llega, 409 `ELEGIR_CARGO` con las opciones). El cliente (`src/lib/client/api.ts` + `ActuarComoProvider`) pide "Actuar como" y repite la peticion. Se guarda en `creado_rol_id/creado_cargo`, `revisado_*`, `aprobado_*`, `autorizado_*`, `elaborado_*`, `anulado_*`, `entrega_json` y en la bitacora (`actuo_como`).
- **Captura con recursos**: una extraccion o un analisis con equipos usados exige ademas `equipos:C` (alcance `uso` o mayor); con insumos, `inventario:C` (alcance `movimientos` o mayor).
- **El arranque no crea roles ni concede permisos**: solo asegura tablas y el catalogo de modulos. Los roles se cargan con `scripts/seed-roles-usuarios.mjs` o desde Administracion > Roles.
- **Vencimientos**: `barrerVencimientos()` (bootstrap, una vez por minuto antes de atender peticiones) deja `vencer_rol` en la bitacora para cada asignacion cuya vigencia termino.
- **Interfaz**: `useSession().can(modulo, accion = "V", contexto?)` y `alcance(modulo, accion)`; los permisos se vuelven a pedir cada minuto y al volver a la ventana. Una persona sin roles vigentes solo ve "Sin permisos asignados".

La accion `AN` significa anular o dar de baja con motivo: ningun endpoint de registros tecnicos o de inventario borra filas (la unica excepcion son los roles que nunca se asignaron, que si se eliminan y quedan en la bitacora como `eliminar`). Un reactivo o consumible dado de baja no se puede **elegir de nuevo** (409), pero un registro que ya lo declaraba se sigue pudiendo reabrir y guardar.

### 9.2.1 Seguridad de cuentas y sesiones (Fase 2)

Codigo: `src/lib/server/seguridad.ts` (intentos, bloqueo, reautenticacion), `rbac.ts` (`cargarAutorizacion`), `supervision.ts`, `src/lib/shared/secretos.mjs`, `src/instrumentation.ts`; en el cliente `src/lib/client/api.ts`, `src/components/session/Reautenticar.tsx`, `SesionInactiva.tsx`, `CambiarPassword.tsx`.

- **Fechas de filtros**: los filtros por dia de la bitacora y de la revision de accesos usan el dia local del servidor (`inicioDiaLocal`/`finDiaLocal` en `rbac.ts`), aunque `fecha_hora` se guarda en UTC.
- **Validacion por peticion** (`cargarAutorizacion`): la cuenta existe, esta activa, dentro de su vigencia (`vigente_desde/hasta`) y el claim `tv` del JWT coincide con `usuarios.token_version`. Si no: 401 `sesion_revocada` o `cuenta_no_vigente` ("Tu acceso no está vigente; contacta al administrador"). Con `debe_cambiar_password` solo se permiten `/auth/me` y `/auth/password` (403 `cambiar_password`).
- **`token_version`** sube con: cerrar sesion en todos los dispositivos, baja de la cuenta, cambio o restablecimiento de contrasena y bloqueo. Todo token anterior deja de valer.
- **Bloqueo** (tabla `intentos_acceso`): `LOGIN_MAX_INTENTOS` fallos (login o reautenticacion) en `LOGIN_VENTANA_MIN` bloquean la cuenta `LOGIN_BLOQUEO_MIN` (`usuarios.bloqueado_hasta`); `LOGIN_IP_MAX_INTENTOS` fallos desde una IP la bloquean (429 `ip_bloqueada`). El mensaje es el mismo exista o no la cuenta (los correos inexistentes tambien se bloquean por correo). `usuarios:G` desbloquea con motivo. Reactivar una cuenta dada de baja tambien exige reautenticacion; un guardado de usuario con varios cambios criticos pide una sola. Eventos `login_fallido`, `reauth_fallida`, `bloquear`, `desbloquear`. Un intento rechazado por un bloqueo vigente (de la cuenta o de la IP) **no cuenta** como fallo: un bloqueo de IP no bloquea cuentas ajenas ni se prolonga solo. **IP**: con el lanzador de produccion (`scripts/start-ficotox.mjs`) y sin proxy, `scripts/ip-real.mjs` (precargado con `--import`) sobrescribe `X-Forwarded-For` con la direccion del socket, asi que cada equipo cuenta por separado y el cliente no puede elegir su IP. Detras de un proxy propio usa `TRUST_PROXY=true` para que la IP sea la que fija el proxy. Con `next dev`/`next start` directos, Next solo rellena el encabezado si falta: un cliente podria falsificarlo (eludir el limite por IP o bloquear otra IP; el bloqueo por cuenta no cambia), por eso en produccion se usa el lanzador o un proxy.
- **Reautenticacion** (tabla `reautenticaciones`, solo el hash SHA-256 del token): `exigirReauth(s, request, user, "modulo:accion")` en toda accion A y AN (anular, restaurar, dar de baja, cancelar, cerrar muestra, aprobar, autorizar, liberar), reactivar (G), visto bueno y en usuarios (asignar/revocar roles, alta de cuenta, cambiar vigencia o supervisor, permisos de un rol, desbloquear, restablecer o fijar la contrasena de otra persona, baja). Sin encabezado `X-Reauth`: 401 `reauth_required` con la `accion`; token vencido, usado, de otra persona o de otra accion: 401 `reauth_invalido`. El token se marca usado dentro de la transaccion (si el handler falla, el rollback lo libera). (Fase 3: solo con la contrasena del sistema.) En la interfaz la contrasena se pide en el mismo dialogo de confirmacion (`usePrompt({ critico: true })`, `SignDialog critico`); si no, `ReautenticarProvider` la pide sin salir del formulario.
- **Sesiones**: JWT de `JWT_EXPIRES_HOURS` (8 h). Riesgo aceptado: el cierre por inactividad es del navegador; un token copiado sigue valiendo en el servidor hasta que expira (8 h) o sube `token_version` (cerrar en todos los dispositivos, baja, contrasena, bloqueo). Cierre por inactividad en el cliente (`SESION_INACTIVIDAD_MIN`, aviso 1 min antes, actividad compartida entre pestanas): se descarta el token y la pagina queda bajo una pantalla de bloqueo; al volver a entrar se conserva lo capturado.
- **Contrasenas**: minimo 10 caracteres, distinta del correo, de su parte local y del nombre. Restablecer genera una temporal y obliga a cambiarla. Nunca se escriben contrasenas ni hashes en la bitacora (`password_hash` es campo volatil).
- **Alcance `supervisado`** (`supervision.ts`): lo que crea o edita una persona cuya operacion solo cubre `supervisado`, o cuya cuenta es temporal con supervisor, queda `supervision_estado = 'pendiente'` con el `supervisor_id` de su cuenta. Mientras esta pendiente o regresado no sirve de origen de la etapa siguiente, no se cierra, no se revisa, aprueba ni autoriza, y un mantenimiento no se marca completado (409 `supervision_pendiente`). Solo el supervisor asignado da el visto bueno (reautenticacion) o lo regresa con observaciones; ambos quedan en la bitacora. Tablas: las 4 del flujo de muestras, `informes`, `equipos`, `mantenimientos`, `reactivos`, `consumibles`.
- **Origen obligatorio** (`assertOrigin(..., { requerido })`): procesamiento <- recepcion aceptada; extraccion <- procesamiento; analisis <- extraccion (plancton/otro, al menos procesamiento); informe <- recepcion. Se valida al crear y al editar (400 `origen_requerido`, 409 si el origen esta anulado, rechazado o pendiente de supervision).
- **Secretos**: en produccion (`NODE_ENV=production`) `src/instrumentation.ts` (que importa `instrumentation-node.ts` solo en el runtime Node.js) y `scripts/start-ficotox.mjs` detienen el arranque si `JWT_SECRET` falta, es un valor por defecto o mide menos de 32 caracteres.
- **CORS**: sin `CORS_ORIGINS` solo se atiende el mismo origen (sin encabezados CORS).

### 9.3 Separacion de funciones y segundo usuario (Fase 3)

Codigo: `src/lib/shared/segregacion.ts` (catalogo versionado de reglas), `src/lib/server/segregacion.ts` (quien elaboro, segun la bitacora; 409 `segregacion`), `src/lib/shared/acciones-criticas.ts` (catalogo de acciones criticas), `src/lib/server/solicitudes.ts` (tabla `solicitudes_autorizacion`, bandeja, aprobar/rechazar/cancelar/vencer) y `src/lib/server/solicitudes-ejecutar.ts` (lo que se ejecuta al aprobar cada tipo).

- **Reglas de segregacion** (se evaluan en el servidor por persona, sin importar cuantos roles tenga ni con que cargo actue). "Elaboro" = quien creo el registro y cualquiera que haya editado su contenido (`crear`/`editar` en su bitacora, mas `creado_por`/`elaborado_por`).
  1. Analisis: quien lo elaboro no lo revisa ni lo aprueba (revisor y aprobador pueden ser la misma persona).
  2. Informe: quien lo elaboro, o elaboro cualquiera de sus analisis, no lo revisa ni lo autoriza.
  3. Procesamiento y extraccion: el nombre firmado como "supervisó" no puede ser el de quien proceso, extrajo o hizo la limpieza (se comparan sin acentos ni mayusculas).
  4. Supervision: el supervisor no da visto bueno a lo que el mismo capturo.
  5. Documentos SGC: quien elaboro no revisa ni aprueba; quien reviso no aprueba (el modelo tiene un solo paso de revision, asi que "revisor de calidad, revisor tecnico y aprobador no todos la misma persona" se aplica como revisor distinto del aprobador).
  6. Segundo usuario: quien solicita una accion critica no la aprueba.
  Al violarse: 409 `{ codigo: "segregacion", regla, message }`. Las fichas de analisis e informe traen `segregacion: { revisar, aprobar|autorizar }` para que la interfaz deshabilite los botones con la explicacion. Se eliminaron `TWO_PERSON_RULE`, `samePersonException` y `permitir_misma_persona`.
- **Excepcion de segregacion**: `POST /api/solicitudes { tipo: "excepcion_segregacion", entidad, entidad_id, accion, motivo }` (analisis, informes, documentos). Solo la pide quien tiene el permiso de esa accion, con el registro en el estado donde aplica y a quien la segregacion se la impide de verdad (si no, 403 o 409 `excepcion_innecesaria`); una pendiente no bloquea el registro (otra persona puede revisarlo o aprobarlo) y hay una sola por persona y accion. La aprueba quien tiene A en calidad; al aprobarse queda en `excepciones_json` del registro para esa persona y esa accion, en la bitacora de la accion (`excepcion_segregacion`) y, en un informe, en el PDF ("Revisión autorizada por excepción, solicitud #N").
- **Acciones criticas** (no se ejecutan: crean una solicitud, 202 `solicitud_creada`): anular o restaurar una recepcion, procesamiento, extraccion o analisis que ya no esta en borrador/registrado (AN del mismo modulo); anular un informe autorizado, liberado o enviado (AN en informes); excepcion de segregacion (A en calidad); asignar un rol, incluido el rol inicial de una cuenta nueva (A en usuarios); reactivar una cuenta; ampliar la vigencia de una cuenta temporal (A en usuarios). Revocar roles, dar de baja cuentas, bloquear y acortar vigencias son inmediatos. En borrador/registrado anular sigue siendo inmediato. Para que no se evite, una recepcion aceptada o rechazada no vuelve a "registrada" quitando la decision al editarla (409 `decision_registrada`), y la migracion de la Fase 1 (`migrarRolesUnicos`) no toca cuentas cuyos roles ya pasaron por solicitudes (un rol inicial pendiente o rechazado no se asigna al reiniciar).
- **Flujo**: la solicitud se crea con reautenticacion del solicitante; una sola pendiente por registro, sin contar las excepciones de segregacion (en cuentas de usuario, una por tipo y, en asignar rol, una por rol); nadie aprueba su propia solicitud ni un cambio de acceso sobre su propia cuenta; un informe con solicitud pendiente no se envia ni se enmienda, y un analisis con solicitud pendiente no se incluye, revisa ni autoriza en un informe; mientras esta pendiente el registro no se edita, no se revisa/aprueba y no sirve de origen (409 `solicitud_pendiente`). Un segundo usuario con el permiso de la accion la aprueba (`POST /api/solicitudes/<id>/aprobar { motivo }`, reautenticacion `solicitudes:aprobar`) y el servidor ejecuta la accion en la misma transaccion, con la bitacora enlazada (`solicitud_id`, `solicitado_por`); o la rechaza (`/rechazar`). El solicitante la cancela (`/cancelar`). Resolver es atomico: si otra persona la resolvio al mismo tiempo (el `UPDATE ... WHERE estado = 'pendiente'` no afecta filas) se responde 409 y no se ejecuta dos veces. Vencen a los `SOLICITUD_VENCE_DIAS` dias: una vencida deja de bloquear en cuanto pasa el plazo y se marca `vencida` en el barrido del bootstrap o al intentar resolverla. Nada se borra. Eventos: `solicitar`, `aprobar_solicitud`, `rechazar_solicitud`, `cancelar_solicitud`, `vencer_solicitud`.
- **Bandeja**: `GET /api/solicitudes` (pendientes que la persona puede aprobar y las suyas; `estado=todas` para historial; `entidad`+`entidad_id` para la pestana "Solicitudes" del historial de un registro). Aviso "Por autorizar" en el Inicio y pagina `/solicitudes`.
- **Cambios de acceso**: el Responsable General tiene usuarios = V A (migracion `migrarPermisosFase3` al arrancar, una sola vez: si ya esta en la bitacora no se repite, asi que un administrador puede quitarlo despues). En usuarios, `G` no implica A (Fase 3.1): aprobar cambios de acceso exige `usuarios:A` explicito; en los demas modulos G implica todo. Nadie edita los permisos de un rol que tiene vigente (409 `rol_propio`). Guardas: nunca queda el sistema sin usuarios:G vigente (y uno sin fecha de fin) ni sin usuarios:A vigente (independientes desde la Fase 3.1). El script de alta (seed) asigna roles sin solicitud y lo deja dicho en la bitacora (`sin_solicitud`).

### 9.4 Fechas (Fase 3)

Todas las fechas pasan por `src/lib/shared/fechas.ts`. Una fecha sin hora ("AAAA-MM-DD": recepcion, emision, vigencias, caducidad) es texto y se formatea sin `Date` (`formatearFecha` -> dd/mm/aaaa). Una fecha con hora (ISO o TIMESTAMP de la base, en UTC) se muestra en America/Tijuana (`formatearFechaHora`). "Hoy", vencimientos, "hace N dias" y los filtros por dia (`inicioDiaLocal`/`finDiaLocal`) usan el dia del laboratorio, sin importar la zona del servidor o del navegador. Los campos de fecha usan `src/components/ui/DateInput.tsx` (dd/mm/aaaa siempre, calendario con teclado) en lugar de `<input type="date">`.

### 9.4.1 Autorizaciones del personal FX-THF-AP (Fase 4)

Segunda capa, ademas del rol: la persona que actua (usuario de la sesion) debe tener autorizacion vigente para la actividad, el metodo y los equipos del formato. Codigo: `src/lib/shared/autorizaciones.ts` (catalogo y requisitos por formato, compartido con la interfaz) y `src/lib/server/autorizaciones.ts` (tabla, validacion, alta/revocacion, vencimientos y avisos).

- **Tabla `autorizaciones_personal`**: `id`, `usuario_id`, `tipo` (`metodo` | `equipo` | `actividad`), `clave`, `vigente_desde`, `vigente_hasta` (nullable), `folio_fx_thf_ap` (folio del formato en papel), `otorgada_por`, `otorgada_rol`, `otorgada_en`, `motivo`, `revocada_en`, `revocada_por`, `motivo_revocacion`, `vencimiento_registrado_en`. Nada se borra: revocar llena las columnas de revocacion. Esquema en `ensureAutorizacionesSchema` (bootstrap).
- **Catalogo**: metodos `ASP`, `DSP`, `PSP`, `pigmentos`, `plancton`, `otro` (mapeados desde `tipo_analisis`); actividades `recepcion`, `procesamiento`, `extraccion`, `analisis`, `revision_resultados`, `aprobacion_resultados`, `revision_informe`, `autorizacion_informe`; equipos: cualquier equipo activo del inventario (`clave` = id del equipo; se muestra su clave de bitacora o nombre).
- **Vigente**: no revocada y el dia local del laboratorio (`hoyLocal`) cae entre `vigente_desde` y `vigente_hasta` (estados calculados: vigente, por_iniciar, vencida, revocada).
- **Requisitos al guardar** (`exigirAutorizaciones`): recepcion (crear/editar) -> `recepcion`; procesamiento -> `procesamiento`; extraccion -> `extraccion` + metodo del tipo (E-A -> ASP, E-D -> DSP) + cada equipo de `equipos_json` que exista en `equipos` (`requisitosEquipos`); analisis -> `analisis` + metodo del tipo de analisis + `equipo_id` si esta en el inventario; revisar/aprobar analisis -> `revision_resultados`/`aprobacion_resultados` + metodo; revisar/autorizar informe -> `revision_informe`/`autorizacion_informe`. Sin autorizacion vigente: 403 `{ codigo: "no_autorizado", message: "No tienes autorización vigente para extracción DSP (FX-THF-AP)", faltan: [...] }`. Los insumos y equipos fuera del inventario no se validan.
- **Administracion**: otorgan y revocan quienes tienen `ensayos:A` o `calidad:A` (Coord. Area Tecnica, Mejora Continua, Responsable General; no el Administrador tecnico). Nadie a si mismo (409 `segregacion`, clave `autorizacion_propia`). Motivo obligatorio y reautenticacion (`autorizaciones:otorgar` / `autorizaciones:revocar`). No se registra una igual si ya hay una vigente o por iniciar (409). Bitacora sobre la cuenta (`entidad = usuarios`): `otorgar_autorizacion`, `revocar_autorizacion` y `vencer_autorizacion` (barrido del bootstrap, una vez por autorizacion vencida).
- **Rutas**: `GET/POST /api/admin/usuarios/<id>/autorizaciones` (listar: la persona, quien ve usuarios o quien administra; `puede_administrar` en la respuesta), `POST /api/admin/usuarios/<id>/autorizaciones/<aid>/revocar`, `GET /api/autorizaciones/mias` (`{ items, obligatorias }`, para Mi cuenta y los avisos de los formatos), `GET /api/autorizaciones/catalogo` (actividades, metodos y equipos activos).
- **Avisos**: `autorizacionesPorVencer` (30 dias) para el Inicio: las propias y, para quien administra, las de todo el personal activo.
- **`AUTORIZACIONES_OBLIGATORIAS`** (true por omision): en `false` no se valida al guardar; solo para cargar datos iniciales. Volver a `true` al terminar.
- **Seed**: `scripts/seed-roles-usuarios.mjs` crea autorizaciones de ejemplo (folio `FX-THF-AP-DEMO`), otorgadas por la Coord. Area Tecnica (las suyas, por la Responsable General); los equipos no se siembran: se autorizan al darlos de alta.

### 9.4.2 Flujo de muestras: asignacion, estados y firmas (Fase 5)

Codigo: `src/lib/server/asignaciones.ts`, `src/lib/server/firmas.ts`, `src/lib/server/samples-flow.ts` (estados y transiciones), `src/lib/server/modules/samples/*` y `src/lib/server/modules/samples/etiquetas.ts`.

- **Asignacion (`asignaciones_muestra`)**: `id`, `recepcion_id`, `usuario_id`, `asignado_por`, `asignado_en`, `motivo`, `revocado_en`, `revocado_por`, `motivo_revocacion`. Asigna y revoca quien tiene `muestras:A`; solo recepciones aceptadas (o con desviacion) y no terminadas. Bitacora sobre la recepcion: `asignar_muestra` (con `aviso_autorizaciones` si a la persona le faltan autorizaciones FX-THF-AP de los analisis solicitados; es aviso, no bloqueo) y `revocar_asignacion`.
- **Regla operativa** (`exigirAsignacion`): crear o editar procesamiento, extraccion o analisis, enviar a revision y enmendar exigen estar asignado a la recepcion, salvo coordinacion (`muestras:A` o `ensayos:A`). Sin asignacion: 403 `{ codigo: "no_asignado" }`.
- **Alcance `asignado`** (ya no diferido): `alcancePermite` lo acepta salvo `ctx.asignado === false`; limita tambien la vista (`LIMITAN_VISTA`). Con solo ese alcance en muestras, la lista de recepciones filtra a las asignadas o registradas por la persona (`filtroAsignadas`) y la ficha/edicion responde 403 `no_asignado` si no lo esta (`exigirVistaAsignada`). Filtro `?mias=1` en las listas de recepcion, procesamiento, extraccion y analisis. En el Inicio, "En curso" muestra solo lo asignado (o registrado por la persona) a quien tiene alcance `asignado` o captura ensayos sin ser coordinacion.
- **Estados de la recepcion** (`RECEPTION_STATE_ORDER` / `RECEPTION_STATE_RANK` en `src/lib/shared/sgc.ts`, solo hacia adelante con `advanceState`): `registrada` → `aceptada` | `aceptada_con_desviacion` | `rechazada` → `en_procesamiento` (procesamiento guardado) → `en_extraccion` (extraccion guardada, `avanzarRecepcion`) → `en_analisis` (analisis guardado) → `en_revision_tecnica` (analisis enviado a revision o revisado) → `validada` (`validarRecepcionSiCompleta`: todos los analisis no anulados ni sustituidos aprobados) → `informe_elaborado` (informe creado) → `liberada` (informe liberado, Fase 6) → `cerrada` (disposicion final; guarda `estado_antes_cierre`). `liberada` se agrega a los estados bloqueados. Al arrancar se mapean estados anteriores (`RECEPTION_LEGACY_STATES`): `en_proceso` → `en_procesamiento`, `analizada` → `validada`, `informada` → `liberada`, y `aceptada` con decision `aceptada_con_desviacion` → `aceptada_con_desviacion`. Procesamiento y extraccion conservan sus estados propios.
- **Analisis** (columnas nuevas en `muestras_analisis`: `version` (1), `sustituye_a`, `motivo_enmienda`, `enviado_revision_por`, `enviado_revision_en`, `devolucion_observaciones`; unicidad migrada de `UNIQUE(folio_num)` a `UNIQUE(folio_num, version)`, en SQLite reconstruyendo la tabla): `registrado` → `en_revision` (`POST .../enviar-revision`, ensayos:C; desde ahi editar da 409 `analisis_bloqueado`) → `revisado` → `aprobado`. Revisar solo acepta `en_revision` (Fase 6). `POST .../devolver { motivo }` (ensayos:R; `en_revision` → `registrado`). `POST .../enmendar { motivo }` sobre un aprobado crea la version + 1 (mismo folio, `sustituye_a`, sin firmas de revision/aprobacion y sin insumos: la enmienda no vuelve a descontar inventario); al aprobarse, la original pasa a `sustituido` (bitacora `sustituir`). `folioLabel` muestra "A 0000012 v2". Bitacora: `enviar_revision`, `devolver`, `enmendar`, `sustituir`.
- **Decisiones de la recepcion** (acciones criticas nuevas, aprueba `muestras:A`): `decision_recepcion` (rechazo o aceptacion con desviacion: sin `muestras:A` el registro se guarda sin esa decision y se crea la solicitud; con `muestras:A` se aplica directo con reautenticacion `muestras:A`), `cambiar_folio` (`POST /api/samples/reception/<id>/folio { folio_num, motivo }`; editar el folio con PUT da 409 `folio_bloqueado`) y `reabrir_recepcion` (`POST .../reabrir { motivo }`: rechazada → registrada sin decision; cerrada → `estado_antes_cierre`). Bitacora `cambiar_folio`, `reabrir`, `aceptar`/`rechazar`.
- **Firmas ligadas a cuentas** (`firmas.ts`): el formato envia `firmantes: { <rol>: { usuario_id, token_firma? } }` con roles `recibio` (recepcion), `proceso`/`superviso` (procesamiento), `extrajo`/`limpio`/`superviso` (extraccion) y `analista` (analisis). Se guardan `<rol>_usuario_id` y `<rol>_cargo` (primer rol vigente) y el nombre visible en la columna de siempre. Si el firmante no es la persona de la sesion, `POST /api/firmas/confirmar { usuario_id, password }` devuelve un token de un solo uso (tabla `firmas_tokens`: `token_hash`, `usuario_id`, `solicitado_por`, `creado_en`, `expira_en` a 10 minutos, `usado_en`; bitacora `confirmar_firma`, o `reauth_fallida` si la contrasena no es correcta); sin token: 403 `firma_sin_confirmar`. Los firmantes tecnicos (proceso, extrajo, limpio, analista) deben tener la autorizacion FX-THF-AP de la actividad y metodo (403 `no_autorizado`). `GET /api/cuentas/activas` lista las cuentas para elegir firmantes o asignar. Un nombre escrito sin cuenta (clientes anteriores de la API) se conserva como texto sin `usuario_id`.
- **Regla 3 por cuenta**: `evaluarSupervisionCaptura` compara `superviso_usuario_id` con `proceso_usuario_id` / `extrajo_usuario_id` / `limpio_usuario_id` cuando ambas firmas estan ligadas; si alguna no tiene cuenta, compara los nombres escritos como respaldo.
- **Etiquetas**: `GET /api/samples/reception/<id>/etiquetas` (datos por muestra del lote) y `POST` (bitacora `imprimir_etiquetas`); pagina `/muestras/recepcion/<id>/etiquetas` (50 × 25 mm u hoja completa, `window.print`).
- **Rutas nuevas**: `GET/POST /api/samples/reception/<id>/asignaciones`, `POST .../asignaciones/<aid>/revocar`, `POST /api/samples/reception/<id>/folio`, `POST .../reabrir`, `GET/POST .../etiquetas`, `POST /api/samples/analysis/<id>/enviar-revision`, `.../devolver`, `.../enmendar`, `POST /api/firmas/confirmar`, `GET /api/cuentas/activas`, `GET /api/autorizaciones/personas`. `POST /api/inventory/equipos` acepta `autorizar_a` (ids) y `folio_fx_thf_ap` para otorgar la autorizacion del equipo en el mismo paso (quien puede otorgar; reautenticacion `autorizaciones:otorgar`).

### 9.4.3 Informes: autorizar, liberar y enviar por correo (Fase 6)

Codigo: `src/lib/server/modules/informes.ts` (liberar, integridad, requiere enmienda) y `src/lib/server/envios.ts` (envios y evidencia).

- **Estados**: `borrador` → `en_revision` → `autorizado` → `liberado` → `enviado` (mas `anulado` y `sustituido`). Autorizar solo firma. Liberar (`liberarInforme`: `informes:A`, autorizacion FX-THF-AP `liberacion_informe`, reautenticacion `informes:A`; puede ser quien autorizo) congela `resultados_json`, genera el PDF final en `<instance>/informes/` con `pdf_sha256`, lleva la recepcion a `liberada` y, si es enmienda, marca el original `sustituido`. Columnas nuevas: `liberado_por`, `liberado_nombre`, `liberado_cargo`, `liberado_rol_id`, `liberado_en`, `requiere_enmienda` (0/1), `requiere_enmienda_motivo`. Solo el borrador se edita (409 en cualquier otro estado). La ruta `/entregar` se elimino; al arrancar, `entregado` → `enviado` (tambien en `estado_previo`). Bitacora `liberar`.
- **Integridad del PDF**: `integridadPdf(row)` compara el SHA-256 del archivo con `pdf_sha256`; la ficha trae `pdf_integridad` (`ok` | `alterado` | `faltante` | null) y la descarga responde `X-Integridad-Pdf`. Si no coincide, la bitacora registra `alerta_integridad` (esperado y obtenido).
- **Envios (`envios_informe`)**: `id`, `informe_id`, `version`, `destinatario_nombre`, `destinatario_correo`, `enviado_en`, `enviado_por`, `enviado_rol`, `medio` (`manual` | `smtp`), `evidencia_archivo`, `evidencia_sha256`, `message_id`, `observaciones`, `confirmacion_en`, `confirmacion_nota`, `registrado_en`. Nada se borra. Solo informes `liberado` o `enviado` (409 `no_liberado`; 409 `requiere_enmienda`). La evidencia (PDF, imagen, .eml/.msg, hasta 15 MB) se guarda en `<instance>/informes/envios/` con su SHA-256; en SMTP la evidencia es un JSON con el Message-ID, la respuesta del servidor y el sobre. El primer envio pasa el informe a `enviado`. La confirmacion de recepcion se registra una vez por envio. Bitacora `enviar` y `confirmar_envio` con el correo parcialmente oculto (`correoOculto`: `h***@dominio`). El envio no modifica el informe.
- **SMTP opcional** (dependencia `nodemailer`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, todas o ninguna (`smtpConfig()`); sin ellas la opcion no aparece (`smtp_disponible: false`). Puerto 465 usa TLS directo. `SMTP_HOST=prueba` usa un transporte en memoria (`streamTransport`), sin red: lo usan las pruebas.
- **Correo de contacto** del cliente (`cliente_json.correo`), prellenado desde `datos_solicitante.correo` de la recepcion si existe.
- **Requiere enmienda**: al aprobarse la enmienda de un analisis incluido en informes `autorizado`, `liberado` o `enviado`, `marcarRequiereEnmienda` los marca (bitacora `requiere_enmienda`); no se liberan ni envian (409) hasta crear y liberar su enmienda. En la enmienda del informe, `analisisVigentes` cambia cada analisis sustituido por su version aprobada. Lista con `?estado=requiere_enmienda` y aviso `informes_enmienda` en el Inicio.
- **Pendientes de la Fase 5 resueltos**: revisar un analisis solo en `en_revision` (409 `no_enviado` si esta `registrado`); crear un informe lleva la recepcion a `informe_elaborado` solo si ya esta `validada` o el informe incluye analisis aprobados; con `firmantes.analista` basta (el nombre lo pone la cuenta); la lista de analisis trae `version` para mostrar "vN"; en "En curso" las recepciones `liberadas` van al final con la nota "Falta disposición final".

### 9.4.4 Evidencia instrumental de los analisis (Fase 10)

Codigo: `src/lib/shared/adjuntos.ts` (catalogo, extensiones, firmas de bytes, saneado de nombres), `src/lib/server/adjuntos.ts` (tabla, almacenamiento, integridad, herencia) y `src/lib/server/modules/samples/analisis-adjuntos.ts` (reglas del analisis y endpoints); interfaz en `src/components/features/samples/EvidenciaPanel.tsx` (seccion "Evidencia instrumental" del formato, en la ranura `interactive` de `FormPage`, activa aunque el formato este en solo lectura).

- **Tabla generica `adjuntos`** (reutilizable en incidencias y otros registros; en esta fase solo `entidad = 'analisis'`): `id`, `entidad`, `entidad_id`, `tipo_evidencia`, `descripcion` (≥ 5), `nombre_original` (saneado, solo dato), `nombre_almacenado` (`analisis/<entidad_id>/<uuid>.<ext>`, relativo a `<instance>/evidencias/`), `mime`, `extension`, `tamano_bytes`, `sha256`, `subido_por`, `subido_rol`, `subido_en`, `heredado_de`, `anulado_en`, `anulado_por`, `anulado_rol`, `motivo_anulacion`. Indices `(entidad, entidad_id)` y `sha256`. Nada se borra: anular llena las columnas y el archivo se conserva.
- **Tipos**: cromatograma, reporte_equipo, hoja_calculo, curva_calibracion, certificado_material_referencia, foto, otro. **Extensiones**: pdf, png, jpg, jpeg, tif, tiff, csv, txt, xlsx, xls, zip, cdf.
- **Limite del proxy**: `src/proxy.ts` (CORS de `/api/*`) hace que Next guarde el cuerpo en memoria y por omision lo corte a 10 MB; `next.config.ts` fija `experimental.proxyClientMaxBodySize` en `max(25, EVIDENCIA_MAX_MB) + 2` MB **al construir**: subir `EVIDENCIA_MAX_MB` por encima de 25 exige `npm run build`.
- **Validacion** (`leerArchivo`): 413 por `Content-Length` y por bytes reales (`EVIDENCIA_MAX_MB`); 400 si la extension no esta permitida, si el archivo esta vacio, si la firma de bytes no corresponde (pdf `%PDF-`, png, jpg, tif, zip/xlsx `PK`, xls OLE, cdf `CDF`/HDF5; csv/txt sin bytes nulos) o si el contenido es HTML, SVG, script o ejecutable aunque se renombre (en csv y txt se revisa todo el contenido; ademas se sirven como texto plano, en descarga y con nosniff). El nombre original se sanea (sin rutas, controles ni marcas bidi).
- **Escritura** (`guardarArchivo`): temporal `.<uuid>.<ext>.<pid>.tmp` en la misma carpeta, SHA-256 calculado por bloques mientras se escribe, `fsync` y `rename` atomico; despues el registro y la bitacora en la transaccion de la peticion. Si la transaccion falla (incluido el 409 de duplicado), el handler hace rollback y `descartarArchivo` borra el archivo. Duplicado: mismo `sha256` vigente en el mismo registro → 409 "Ese archivo ya está adjunto" (en otro registro si se permite).
- **Reglas** (mismas funciones que la edicion): `exigirAnalisisEditable` (ensayos:E con su alcance, solo en `registrado` → si no 409 "El análisis ya se envió a revisión", sin anulacion ni solicitud pendiente), `exigirAsignacion` (o coordinacion) y `exigirAutorizaciones(requisitosAnalisis(tipo))`. En MySQL la fila del analisis se lee `FOR UPDATE` (un adjunto que llega despues de "Enviar a revision" responde 409). Cuenta supervisada: `aplicarSupervision` deja el analisis pendiente del visto bueno otra vez (no se elude el visto bueno). Anular exige motivo (≥ 5) y reautenticacion `adjuntos:anular`. Adjuntar y anular cuentan como "elaboro" para la segregacion (`elaboradoresDe`).
- **Ver y descargar**: ensayos:V con su alcance (con solo `estado` → 403; con solo `asignado`, lo asignado). Aprobado, sustituido o anulado: solo lectura, siempre descargable. Anular el analisis no anula sus adjuntos.
- **Descarga**: `Content-Disposition` (attachment, o inline con `?inline=1` solo para pdf, png y jpg; TIFF siempre se descarga) con el nombre saneado (ASCII + `filename*` UTF-8), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Adjunto-Sha256`. Recalcula el SHA-256: si no coincide, `X-Integridad-Adjunto: alterado` y entrada `alerta_integridad`; si falta el archivo, 404 con `X-Integridad-Adjunto: faltante` y alerta. Cada descarga queda como `descargar` en la bitacora del analisis.
- **Evidencia obligatoria**: con `EVIDENCIA_OBLIGATORIA_ANALISIS=true`, `enviar-revision` sin adjunto vigente → 409 `evidencia_requerida`. No aplica a analisis ya enviados o aprobados antes de la Fase 10.
- **Enmiendas**: `enmendarAnalysis` llama `heredarAdjuntos`: filas nuevas con `heredado_de` que apuntan al mismo archivo (sin copiarlo); anular en la version nueva no toca la anterior.
- **Bitacora** (sobre `muestras_analisis`): `adjuntar`, `anular_adjunto`, `descargar` y `alerta_integridad` con `adjunto_id`, tipo, descripcion, nombre y SHA-256; frases en `audit-humanize.ts` ("Luis adjuntó el cromatograma … al análisis A 0000001").
- `GET /api/samples/analysis/<id>` incluye `adjuntos: { vigentes, anulados, obligatoria }`.

### 9.5 Llave de la bitacora

**Nunca vacies ni cambies una `SECRET_KEY` existente** (aunque sea un valor de ejemplo como `change-me`) sin seguir la migracion de abajo: la instalacion que la uso ya sello su bitacora con ella. El `.env.example` la trae vacia solo para instalaciones nuevas.

La bitacora se sella con HMAC-SHA256 encadenado (`src/lib/shared/audit-chain.mjs`). La llave es `SECRET_KEY` si esta definida y no es `ficotox-dev-secret`; si no, `instance/auditoria.key` (se crea al azar la primera vez). **La llave nunca se cambia sola**: al arrancar y en `/auditoria` (`GET /api/audit/verify` -> `llave: { origen, advertencias }`) solo se advierte si falta o es corta. Respalda `.env` o `instance/auditoria.key` junto con la base.

Migrar la llave (solo si es imprescindible, con el servidor detenido):

1. Respaldar la base y el `.env` / `auditoria.key` actuales.
2. Verificar la cadena con la llave actual (`/auditoria` en verde).
3. Dejar constancia: la cadena anterior se conserva sellada con la llave vieja; guarda esa llave en custodia (sin ella no se puede volver a verificar lo anterior).
4. Configurar la llave nueva y, antes de atender peticiones, agregar una entrada de corte que declare el cambio. Mientras no exista una herramienta de "resellado" versionada, **no cambies la llave** en una instalacion con datos: la verificacion de toda la cadena anterior fallaria.

## 10. Base de datos

### 10.1 Tablas principales

`roles`, `permisos` (catalogo de modulos), `rol_acciones` (permisos de la Fase 1), `usuario_roles` (asignaciones con vigencia), `rol_permisos` (modelo anterior, sin uso), `usuarios`, `reactivos`, `consumibles`, `equipos`, `mantenimientos`, `movimientos`, `muestras_recepcion`, `muestras_procesamiento`, `muestras_extraccion`, `muestras_analisis`, `adjuntos` (Fase 10), `informes`, `documentos_sgc`, `auditoria`, `reportes_mantenimiento`.

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

`npm test` copia la base congelada `instance/fixtures/ficotox-base.sqlite3` (base vacia + roles y usuarios de la Fase 0) a `instance/test/ficotox-test.sqlite3`, crea **solo en esa copia** el rol "QA pruebas automatizadas" (todos los permisos) y el usuario `qa@ficotox.local`, levanta `next dev` en el puerto 3100 sobre la copia, crea los datos de apoyo (`tests/datos-apoyo.mjs`) y corre `tests/api-*.mjs` (flujo completo por HTTP), `tests/respaldos.mjs` (respaldo y restauracion, Fase 10) y `tests/ui/*.mjs` (Playwright contra el Chrome de Playwright mas reciente o `CHROME_PATH`). El servidor de prueba usa `EVIDENCIA_MAX_MB=25` y `FICOTOX_BACKUP_DIR=instance/test/backups`. La base real nunca se toca. Detalle en `docs/VALIDACION.md`.

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

### 15.0 Respaldo y restauracion (Fase 10)

Procedimiento completo (que se respalda, frecuencia, llave, RTO, responsables, paso a paso, acta): **`docs/RESPALDO_Y_RECUPERACION.md`**.

- **Una sola implementacion**: `src/lib/shared/respaldo.mjs` (JavaScript plano con tipos en `respaldo.d.mts`, como `audit-chain.mjs`). La usan el servidor (`src/lib/server/modules/respaldos.ts`), `scripts/respaldar-ficotox.mjs` (`npm run respaldar`), `scripts/restaurar-ficotox.mjs` (`npm run restaurar`) y, a traves del primero, `scripts/backup_ficotox.py`. Quien llama le pasa el constructor de `better-sqlite3`.
- **Formato**: `backups/<AAAAMMDD-HHMMSS>/` con `datos/ficotox.sqlite3` (API de respaldo en linea de SQLite; `integrity_check` del snapshot), `archivos/{informes,evidencias,documentos_sgc,maintenance_reports}/`, `manifest.json` (formato, fecha, host, version y commit, `esquema_version` = `ESQUEMA_VERSION`, motor, conteos de `TABLAS_PRINCIPALES`, bitacora: entradas, ultimo id y sello, archivos con tamano y SHA-256, llave: incluida, origen y huella, y `sello` = HMAC-SHA256 del manifest con la llave de la bitacora) y `llave/llave-bitacora.txt`. Se escribe en `.<id>.tmp` y se renombra al final. Nunca `JWT_SECRET` ni otros secretos.
- **Retencion**: `aplicarRetencion` conserva `RESPALDO_RETENCION` y nunca borra el ultimo respaldo con un acta `aprobada`.
- **Restauracion**: modo prueba por omision (`instance-restaurada/<fecha>/` junto a la instancia); modo real solo con `--destino instance --confirmar`, con el servidor detenido (puerto `PORT` libre y sin `<instance>/servidor.lock` de un pid vivo, que escribe `src/instrumentation-node.ts` al arrancar), respaldo previo automatico y entrada `restaurar_respaldo` (actor sistema) sellada con `audit-chain.mjs`. Antes de copiar, la verificacion 1 exige `base.ruta = datos/ficotox.sqlite3` y que cada archivo sea `archivos/<carpeta respaldada>/…` sin `..` ni rutas absolutas y que origen y destino queden dentro del respaldo y de la carpeta de preparacion; la 4 comprueba ademas el sello del manifest (quien altere la base o los archivos y recalcule las huellas no puede recalcular el sello sin la llave; si la llave viaja dentro del respaldo, el sello solo protege frente a quien no la tenga, por eso la llave se guarda aparte) y lo compara con la llave configurada en la instalacion. La 1 rechaza enlaces simbolicos, directorios y manifests malformados sin abortar el acta. En modo real, una `instance/auditoria.key` distinta de la del respaldo exige `--aceptar-llave-del-respaldo`. Un acta cuenta como verificacion de un respaldo solo si guarda su ruta y la huella de su `manifest.json`. Verificaciones 1–8 y acta en `backups/pruebas-restauracion/<fecha>.md|.json`; salida 1 si falla una verificacion y 2 si el uso es incorrecto o se rechaza el modo real. La verificacion de la cadena es `evaluarCadena` de `audit-chain.mjs`, la misma que usa `verifyAuditChain`.
- **API**: `GET /api/respaldos` (usuarios:G o calidad:V; respaldos, actas, ultima prueba, avisos, `puede_crear`), `POST /api/respaldos` (usuarios:G + reautenticacion `respaldos:crear`; bitacora `respaldar`), `GET /api/respaldos/actas/<AAAAMMDD-HHMMSS>[?formato=json]`. Avisos (`avisosRespaldo`) en la pantalla, el Inicio y la campana para usuarios:G y calidad:A.
- **Esquema**: al cambiar tablas o columnas de forma incompatible hacia atras, subir `ESQUEMA_VERSION` en `respaldo.mjs` (la restauracion de un respaldo mas nuevo que la app aborta; uno mas viejo avisa que el arranque migrara).

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
INSERT INTO usuarios (nombre, email, activo, id_rol, password_hash)
VALUES ('Nombre Apellido', 'correo@cicese.mx', 1, @rol, '<hash scrypt$...>');
INSERT INTO usuario_roles (usuario_id, rol_id, vigente_desde, motivo, asignado_en)
VALUES (LAST_INSERT_ID(), @rol, CURDATE(), 'Alta manual del primer administrador', NOW());
```

Esas altas no quedan en la bitacora (se hicieron fuera de la aplicacion); anotarlas en el registro de la instalacion. El resto de los roles de `scripts/roles-catalogo.json` se da de alta desde Administracion > Roles, con bitacora. Soporte MySQL en el script: sigue fuera de alcance (documentado).

Las cuentas del catalogo son locales (`@ficotox.local`). Para dar de alta personal real, usar correos `@cicese.mx` desde Administracion > Usuarios.

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

- Usuario existente, activo, dentro de su vigencia, con rol y permisos, y sin bloqueo por intentos.

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
npm run respaldar        # Fase 10: respaldo local (base, archivos, manifest y llave aparte)
npm run restaurar -- --respaldo <id> --responsable "..."   # Fase 10: prueba de restauracion con acta
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
- Fase 3 (limites aceptados de la separacion de funciones):
  - La regla 3 compara nombres escritos ("procesó" / "supervisó"), no cuentas de usuario: dos personas con el mismo nombre o una firma escrita distinta la burlan. Se resolvera cuando la firma quede ligada a la cuenta (asignacion de muestras, Fase 5).
  - Quien tiene `usuarios:G` puede cambiar los permisos de un rol ya asignado sin segundo usuario (queda en la bitacora con motivo y reautenticacion), salvo un rol que el mismo tenga vigente (Fase 3.1). Riesgo aceptado para una fase posterior.
  - Documentos SGC (modulo apagado hasta la Fase 7): enviar a revision cuenta como revisar, y "revisor distinto del aprobador" es mas estricto que el texto de la norma; se revisa junto con el flujo completo de documentos.
- Fase 5: la enmienda de un analisis no vuelve a descontar inventario. La regla 3 solo compara cuentas cuando ambas firmas estan ligadas; los registros con nombres escritos (sin cuenta) se comparan por nombre.
- MySQL: cada conexion fija `time_zone = '+00:00'` (`src/lib/server/db.ts`) para que los TIMESTAMP se guarden y lean en UTC, como en SQLite.
