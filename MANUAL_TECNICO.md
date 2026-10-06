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
        migraciones/         # migraciones versionadas (Fase 12; motor.mjs, pasos.mjs, NNNN_*.mjs)
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
- SheetJS para lectura de archivos Excel en navegador (`public/vendor/xlsx`); en la Biblioteca tambien muestra hojas de calculo.
- Visor de la Biblioteca: **pdf.js** (`pdfjs-dist`) servido desde el propio servidor en `public/vendor/pdfjs` (worker, cmaps, fuentes estandar y wasm; se regenera con `npm run vendor:pdfjs` al actualizar `pdfjs-dist`, sin CDN); **mammoth** convierte Word `.docx` a HTML; **marked** + **dompurify** muestran Markdown saneado. Se cargan bajo demanda solo en el cliente.
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
3. Se ejecuta el SQL parametrizado y se hace `commit()`; si el handler falla, se hace `rollback()`.

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
| `BIBLIOTECA_MAX_MB` | Biblioteca: tamano maximo de cada archivo que se sube (MB) | `50` |
| `EVIDENCIA_OBLIGATORIA_ANALISIS` | Fase 10: "Enviar a revision" exige al menos un adjunto vigente (409 `evidencia_requerida`); no es retroactivo | `true` |
| `FICOTOX_BACKUP_DIR` | Fase 10: carpeta de los respaldos locales (servidor, scripts y `backup_ficotox.py`) | `backups/` |
| `RESPALDO_RETENCION` | Fase 10: respaldos locales que se conservan (nunca se borra el ultimo verificado) | `30` |
| `RESPALDO_AVISO_HORAS` / `PRUEBA_RESTAURACION_AVISO_DIAS` | Fase 10: avisos "sin respaldo" y "sin prueba de restauracion" en `npm run verificar-instalacion` (la pantalla Respaldos y sus avisos en el Inicio y la campana se retiraron) | `24` / `90` |
| `CORS_ORIGINS` | Origenes permitidos por CORS (lista separada por comas o `*`); vacio = solo el mismo origen | Vacio (mismo origen) |
| `HOST` / `PORT` | Host y puerto del lanzador standalone | `0.0.0.0` / `5000` |
| `FICOTOX_OPEN_BROWSER` | Abrir navegador al iniciar el lanzador (el servicio lo apaga) | `true` |
| `FICOTOX_INSTANCE_DIR` | Fase 12: carpeta de la instancia (base, archivos, llave, `logs/`, `verificaciones/`, `servicio/`) | carpeta de `SQLITE_PATH` o `instance/` |
| `MIGRAR_AL_ARRANCAR` | Fase 12: aplicar al arrancar las migraciones pendientes (con respaldo `pre-migracion`); `false` = no arranca si hay pendientes | `true` |
| `MIGRAR_MYSQL_RESPALDO_HECHO` | Fase 12, solo MySQL: declara que ya se respaldo con `mysqldump` (sin ella, el servidor no migra al arrancar) | `false` |
| `TLS_CERT` / `TLS_KEY` / `TLS_CA` | Fase 12: HTTPS opcional (PEM; rutas relativas a la raiz). Los dos primeros juntos o ninguno | No definidas (HTTP) |
| `LOG_DIR` / `LOG_MAX_MB` / `LOG_RETENCION_DIAS` | Fase 12: registros del servidor (carpeta, tamano de rotacion, dias que se conservan) | `<instancia>/logs` / `10` / `90` |

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
GET    /api/admin/accesos                              RETIRADA (410): la revision de accesos esta en Administracion › Usuarios
```

**Administracion en la interfaz (minimalista; mismas reglas):**

- `/administracion/usuarios`: lista sencilla (iniciales, nombre y correo, hasta 2 roles y "+N", estado —Activo, De baja, Bloqueado, Temporal, Acceso vencido—, ultimo acceso relativo y `SolicitudBadge`), accesos rapidos (vencen en 7 dias, bloqueadas, temporales, accesos vencidos, solicitudes pendientes) y `FilterMenu` (Estado, Tipo de cuenta, Rol, Vigencia, Otros). `GET /api/admin/usuarios` agrega por cuenta `solicitud_pendiente` y `autorizaciones_vigentes` (solo lectura). Acepta `?vigencia=vence7`, `?estado=bloqueados`, `?solicitudes=1` (avisos del Inicio y la campana) y `?abrir=<id>` (desde la ventana de un rol). Al pulsar una persona se abre `UsuarioVentana` (`src/components/features/admin/UsuarioVentana.tsx`) con pestañas General, Roles y Autorizaciones; `UserSheet` (AdminSheets) queda solo para el alta y "Editar datos".
- `/administracion/roles`: lista (nombre, personas, "Del sistema", "Inactivo") y `RolVentana` (`RolVentana.tsx`): "Que puede hacer" en palabras (`src/lib/client/permisos-legibles.ts`), personas con el rol y el editor de permisos en la misma ventana ampliada (columnas Ver…Administrar y alcances en palabras). El PUT sigue enviando la matriz completa.
- Ambas usan la ventana compartida `src/components/ui/VentanaCentrada.tsx` (la misma de Auditoria).
- `/administracion/accesos` redirige a Usuarios; `/administracion/respaldos`, al Inicio.

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

### 7.5.2 `biblioteca` (reemplaza `documentos-sgc`)

**Decision confirmada por el laboratorio**: Calidad › Documentos funciona como biblioteca de consulta y reemplaza el flujo de control documental de la seccion 6 de la especificacion. Codigo: `src/lib/server/modules/biblioteca.ts`, catalogo compartido `src/lib/shared/biblioteca.ts`.

```text
GET   /api/biblioteca?search=&categoria=&tipo=&archivados=&orden=  # documentos:V (con "autorizados", solo visibles para todos o su rol)
POST  /api/biblioteca                                     # multipart: archivo + datos (+ texto del PDF); documentos:C
GET   /api/biblioteca/<id>                                # ficha con versiones
PUT   /api/biblioteca/<id>                                # datos; documentos:E del propio o documentos:G
POST  /api/biblioteca/<id>/versiones                      # version nueva; documentos:C
POST  /api/biblioteca/<id>/archivar | /restaurar          # { motivo }; documentos:AN o G + reautenticacion
GET   /api/biblioteca/versiones/<vid>/archivo?modo=ver|descargar   # con Range; "descargar" queda en la bitacora
GET   /api/biblioteca/versiones/<vid>/verificar           # integridad (SHA-256) de esa version
POST  /api/biblioteca/versiones/<vid>/texto               # texto del PDF extraido en el navegador (solo si falta)
GET|POST /api/biblioteca/categorias, PUT /api/biblioteca/categorias/<cid>   # documentos:G para escribir
```

- **Tablas** (migracion `0013_biblioteca.mjs`): `biblioteca_categorias` (con las categorias iniciales), `biblioteca_documentos` (titulo, clave, categoria, etiquetas, descripcion, visibilidad `todos`/`roles`, archivado con motivo, `origen_sgc_clave`/`origen_sgc_id`), `biblioteca_visibilidad_roles` y `biblioteca_versiones` (`nombre_almacenado` relativo a `<instancia>/biblioteca`, como `<documento_id>/<uuid>.<ext>`; `sha256`, tamano, extension, texto para buscar). Entidad de la bitacora `biblioteca_documentos`.
- **Copia de la migracion 13**: los documentos de `documentos_sgc` con archivo pasan a la Biblioteca (por clave: la revision vigente o la mas reciente es el documento y las anteriores con archivo, sus versiones), copiando el archivo y conservando su SHA-256. Es idempotente (`origen_sgc_*`) y no toca las tablas anteriores.
- **Archivos**: misma infraestructura de los adjuntos de la Fase 10 (validacion por firma de bytes y contenido activo, escritura atomica, SHA-256, verificacion al abrir o descargar). Un archivo faltante o alterado genera alerta en la bitacora e incidencia automatica. Tamano maximo `BIBLIOTECA_MAX_MB`. Nada se borra: se archiva con motivo y las versiones se conservan.
- **Retirado** (sin borrar datos): las rutas de escritura de `/api/documentos-sgc`, `lista-maestra`, `por-leer`, `summary` y `propuestas` responden **410** `{ message: "Funcionalidad retirada: Calidad › Documentos ahora es la Biblioteca", codigo: "retirado" }` (`src/lib/server/retirado.ts`), igual que `POST /api/calidad/nc/<id>/propuesta-documental`. Siguen `GET /api/documentos-sgc/<id>` y `/archivo` (documentos:V) para el historial. Las tablas `documentos_sgc`, `distribucion_documento` y `propuestas_documento` y la carpeta `<instancia>/documentos_sgc/` se conservan. `/api/documents` (reportes de mantenimiento) no cambia; su lista pasó de la pestaña de `/documentos` a Inventario › Mantenimiento (`ReportesMantenimiento.tsx`).

### 7.5.3 `audit`

```text
src/lib/server/audit.ts
src/lib/server/modules/audit.ts
```

```text
GET /api/audit?entidad=&entidad_id=&accion=&usuario=&usuarios=&acciones=&entidades=&search=&desde=&hasta=&sin_accesos=&antes_de=&limit=
GET /api/audit/<id>
GET /api/audit/summary
GET /api/audit/verify          # recorre la cadena de hashes; si falla: alerta_integridad + incidencia automatica
# formato=csv (y cualquier formato) -> 410 «Funcionalidad retirada»: la bitacora no se exporta
```

`registrarAuditoria(s, user, { accion, entidad, entidadId, referencia, motivo, antes, despues, detalle })` calcula el diff entre `antes` y `despues` (omite campos volatiles y sustituye las imagenes de firma por `[firma]`), guarda los dos snapshots y encadena el sello `hash = HMAC-SHA256(SECRET_KEY, contenido + hash_anterior)`. La llave vive fuera de la base: `SECRET_KEY` cuando esta configurada, y si no, una llave aleatoria de 32 bytes que el sistema crea la primera vez en `<instance>/auditoria.key` (permisos 600) para que la proteccion no dependa de recordar configurar el entorno. Asi, quien solo tenga el archivo de la base no puede recalcular la cadena despues de alterarla. **Respalda la llave junto con la base: si cambia o se pierde, la verificacion de lo ya escrito falla.** La tabla `auditoria` tiene triggers que abortan cualquier `UPDATE` o `DELETE` (SQLite `RAISE(ABORT)`, MySQL `SIGNAL`). El historial de un registro (`entidad` + `entidad_id`) lo puede leer quien tenga permiso de lectura del modulo al que pertenece la entidad (`muestras_* -> muestras`, `informes`, `documentos_sgc -> documentos`, `reactivos`, `usuarios`, ...); el log completo, `summary` y `verify` requieren `auditoria:read`. `verify` devuelve `{ ok, total, primer_error, filas_faltantes_al_final, filas_faltantes_intermedias, triggers_ok }`: recalcula la cadena, comprueba que no falten filas al final (`sqlite_sequence` / `AUTO_INCREMENT` contra `MAX(id)`) ni en medio (huecos de id) y que los dos triggers de proteccion sigan presentes; los triggers se reponen en cada escritura si alguien los retiro.

**Auditoria en lenguaje simple** (`/auditoria` y el Historial de cada registro; solo presentacion):

- **La bitacora no se exporta** (decision confirmada por el laboratorio): `GET /api/audit?formato=…` responde **410** (`exportacionBitacoraRetirada`, `src/lib/server/retirado.ts`), (la antigua `GET /api/admin/accesos`, con su exportacion, tambien responde 410). No hay scripts ni comandos de exportacion. Las entradas antiguas `exportar` se muestran como "descargó una copia de…".
- **Catalogo de lenguaje simple** en `src/lib/client/audit-humanize.ts`: para cada accion y entidad, la frase de la lista, el parrafo "Que paso" y, por dato (`FIELD`), su nombre con articulo y su formato (fechas dd/mm/aaaa, Si/No, unidades, nombres de persona por id con `/api/cuentas/activas`, catalogos). Los datos sin etiqueta no se muestran; nunca se muestran ids, sellos, checksums, commits, rutas, JSON ni nombres internos (siguen en la base).
- **Componentes**: `src/components/features/audit/Actividades.tsx` (lista agrupada por dia, repeticiones seguidas de la misma persona, accion y registro en 10 minutos como "· N veces" —solo visual—, y `ActividadDialog`: ventana centrada con fondo difuminado, Esc/×/clic fuera, ↑/↓, foco atrapado) y `categorias.tsx` (tipos de actividad del filtro).
- **Filtros** (`FilterMenu` como en Muestras): Periodo (por omision 30 dias), Personas (`usuarios=` correos), Tipo de actividad (`acciones=`), Area (`entidades=`) y Vista › Mostrar inicios de sesion (`sin_accesos`). El buscador incluye el nombre de la persona.
- **Integridad**: la insignia se retiro. `GET /api/audit/verify` corre en segundo plano al abrir Auditoria; si la cadena falla registra una sola vez `alerta_integridad` (entidad `auditoria`, referencia con la clave del hecho) y la incidencia automatica `alerta_integridad:bitacora:…`; mientras esa incidencia este abierta (reportada o en evaluacion) aparece el aviso en el Inicio y la campana de quien tiene `calidad:V`. Respaldos y `verificar-instalacion` muestran el estado como antes.
- El detalle pide `GET /api/audit/:id` (requiere `calidad:V`) solo para mostrar los datos principales de un registro nuevo y las unidades; en el Historial sin `calidad:V` esa seccion no aparece.

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
- `shell/AppShell.tsx`: barra lateral translucida en cuatro grupos (`NAV_GROUPS`), colapsable y con panel movil, boton Buscar y menu de usuario; `CommandPalette.tsx` (⌘K / Ctrl+K, ventana centrada) y la barra del Inicio son el MISMO componente, `Busqueda.tsx` (`modo="ventana"` o `"pagina"`), con el hook `lib/client/busqueda.ts` y la fila comun `BusquedaFila.tsx` (ver 8.1); `Brand.tsx` dibuja la marca (diatomea).
- `session/SessionProvider.tsx`: carga `/api/auth/config`, valida el token con `/api/auth/me`, expone `can(modulo, accion)` y `logout`. `RequireModule` muestra un estado "sin acceso" cuando el rol no puede leer el modulo.
- `features/*`: pantallas por dominio. Los catalogos abren hojas laterales (`*Sheet.tsx`); los formatos de muestra son paginas completas (`ReceptionForm`, `ProcessingForm`, `ExtractionForm`) con `FormLayout` (cabecera fija, indice de secciones).
- `lib/client/store.ts`: `useResource(claves, loader)` carga datos y se recarga cuando alguien llama `invalidate("reactivos", ...)` tras guardar; sustituye al antiguo `loadedPages`.

Sesion en el navegador: `ficotox_access_token`, `ficotox_user`, `ficotox_permissions` en `localStorage`.

Helpers de API en `src/lib/client/api.ts`: `getJsonAuth`, `sendJsonAuth`, `sendFormAuth`, `postJson`.

### 8.1 Busqueda universal

Un solo endpoint de servidor atiende el buscador del Inicio y la ventana ⌘K (mismo componente `Busqueda.tsx`, mismo hook `useBusqueda`, mismos recientes). No queda logica de busqueda en el cliente: solo se pregunta, se cancela lo viejo (`AbortController`, pausa de 160 ms) y se pinta.

- `GET /api/busqueda?q=` → `{ q, grupos: [{ clave, titulo, total, resultados[5], mas: { href, etiqueta } }] }` (`src/lib/server/modules/busqueda.ts`, `busqueda/buscar.ts`). Grupos: muestras, informes, inventario, calidad, biblioteca, personas, roles, solicitudes, pantallas y acciones.
- `GET | POST | DELETE /api/busqueda/recientes`: lo que la persona busco y abrio (tabla `busqueda_recientes`). El `GET` devuelve 8, **valida contra el indice de hoy** (lo que ya no existe o no se puede ver se borra) y toma titulo y enlace del indice; el `POST` de un resultado solo recibe su `clave` (no se puede guardar un enlace ajeno).
- **Permisos en el servidor**: `busqueda/indice.ts` NO consulta tablas por su cuenta; llama a los mismos manejadores que sirven las listas (`listReceptionSamples`, `listInformes`, `listarIncidencias`, `listUsuarios`…) con las cabeceras de la peticion, asi cada fuente aplica exactamente los permisos y alcances de su lista (asignado, propio, autorizados, supervisado, incidencias, estado) y lo prohibido responde 403 y queda vacio. Las pantallas, vistas y acciones salen de `busqueda/catalogo.ts`, que evalua `permite()` y `mapaPermisos()` con los permisos efectivos de la persona.
- **Indice por persona** en memoria: 20 s de vida y se descarta en cuanto cualquier escritura exitosa de la API lo invalida (`apiRoute` llama a `invalidarIndice()`, `busqueda/version.ts`; guardar recientes no cuenta). Biblioteca consulta ademas `GET /api/biblioteca?search=` en cada busqueda para encontrar el texto dentro de los PDF.
- **Motor** (`busqueda/buscar.ts`): sin mayusculas ni acentos, distancia de edicion 1 o 2 sobre palabras de 5+ letras, singular/plural, sinonimos (`SINONIMOS`: muestra → recepcion, lipofilicas → DSP, domoico → ASP…), folios (`R 1`, `r-1`, `0000001`, `1`; prefijos r, p, e-a, e-d, a, ir, inc, nc), claves exactas (ID interno, lote, clave de bitacora, clave de documento) y varias palabras (todas deben aparecer). Orden: 1) folio o clave exacta, 2) pendientes de la persona (`pendientesDe`, misma fuente que el Inicio y la campana, y solicitudes o supervision por atender), 3) lo que abrio antes, 4) el resto por calidad de coincidencia y recencia. "Reponer <producto>" se arma al vuelo para reactivos y consumibles (`?reponer=<id>` abre la reposicion).
- **Navegacion**: los resultados llevan a `?abrir=<id>` (ventana de detalle sobre la lista: reactivos, consumibles, equipos, mantenimientos, solicitudes, usuarios, roles), a la ficha (muestras e informes), al visor (Biblioteca) o a la ventana de Calidad (`ventanaDe`). "Ver todos en …" usa `?buscar=` en cada lista. Los **comandos** (`modo oscuro`, `mi cuenta`, `cambiar contrasena`, `cerrar sesion`, `reportar incidencia`) los ejecuta `Busqueda.tsx`.
- **Agregar un tipo de resultado**: una funcion `fuente…` en `busqueda/indice.ts` que llame al manejador de su lista y devuelva `Hit[]` (con `grupo`, `href`, `lista` y `palabras`/`claves` a indexar), registrada en `construirIndice`; si es un grupo nuevo, sumarlo a `GrupoClave`/`GRUPO_TITULO` (`lib/shared/busqueda.ts`) y su icono en `BusquedaFila.tsx`. **Agregar una pantalla o accion**: una linea en `PANTALLAS`, `VISTAS` o `ACCIONES` de `busqueda/catalogo.ts` con su `permiso`; si no es un enlace sino algo que hace la interfaz, un `comando` nuevo en `Comando` y su `case` en `Busqueda.tsx`.

## 9. Seguridad y autenticacion

### 9.1 JWT

Los tokens se emiten en login y se firman con `JWT_SECRET` usando HS256. Desde la Fase 1 **el token solo identifica a la persona** (`sub`, `email`, `nombre`, `iat`, `exp`): los roles y permisos se calculan en cada peticion desde la base, asi que revocar o vencer un rol tiene efecto inmediato sin volver a iniciar sesion. Una cuenta desactivada o fuera de vigencia recibe 401 aunque su token siga vigente; desde la Fase 2 el token lleva `tv` (token_version) para revocarlo.

El acceso local requiere correo y contrasena. Las contrasenas se guardan en `usuarios.password_hash` con scrypt (`src/lib/server/password.ts`, formato `scrypt$N$salt$hash`) y se validan en `POST /api/auth/login`; un correo inexistente o una contrasena incorrecta responden 401 con el mismo mensaje. Los usuarios se crean con contrasena desde la pantalla de Usuarios (minimo 10 caracteres; Fase 2) y `scripts/set-password.mjs <correo> "<temporal>" --motivo "..."` (Fase 12: servidor detenido; contrasena temporal con cambio obligatorio y entrada «sistema» en la bitacora) permite asignarla desde la terminal en instalaciones SQLite.

Los endpoints protegidos llaman a `requireUser(request)`, que:

1. Lee el header `Authorization`.
2. Valida formato `Bearer <token>`.
3. Decodifica el JWT.
4. Responde 401 con "Token expirado" o "Token invalido" segun corresponda.

### 9.2 Permisos (Fase 1)

Detalle completo, matriz y decisiones pendientes: **`docs/CATALOGO_PERMISOS.md`**.

- **Modelo**: un permiso es `(rol, modulo, accion, alcance)` en la tabla `rol_acciones` (`src/lib/shared/permisos.ts`). Modulos: `usuarios, documentos, muestras, ensayos, informes, equipos, inventario, calidad, compras`. Acciones: `V C E R A AN G` (C/E/R/A/AN implican V; G implica todas). Alcances aplicados: `total, propio, estado, recepcion, preparacion, borrador, bitacora, uso, mantenimiento, movimientos`; `supervisado` se aplica desde la Fase 2 (9.2.1); diferidos (se comportan como `total`, salvo en usuarios, donde son solo V de la propia cuenta, y en calidad, donde son sin acceso): `asignado, proyecto, tecnico, investigacion, autorizados, administrativo, limitado, auditoria`. Desde la Fase 11 `incidencias` se aplica (9.4.5): solo vale con objeto `incidencia`, `nc` o `accion_correctiva` (`ALCANCES_SOLO_CON_OBJETO`); sin contexto (bitacora, respaldos, `can("calidad")`) no cuenta.
- **Varios roles por persona** (`usuario_roles`, con vigencia, motivo y revocacion; nada se borra). Permisos efectivos = union de los roles vigentes hoy de roles activos. `usuarios.id_rol` se migro al arrancar ("Migración Fase 1", en la bitacora) y ya no se lee.
- **Servidor**: cada endpoint llama `requirePermission(s, user, modulo, accion, contexto?)` (`src/lib/server/rbac.ts`), que carga la persona (activa) y sus roles vigentes desde la base, exige la accion y, con contexto, el alcance (`{ objeto, borrador, propio }`). Devuelve los alcances y los roles que otorgan la accion. `soloEstado(permiso)` recorta las respuestas de muestras con alcance `estado`. No queda ninguna verificacion por nombre de rol ni el modulo `aprobaciones`.
- **Cargo con el que se actua**: `cargoActuante(request, permiso)` elige el rol (uno solo, o el que llega en `X-Actuar-Como`; si hay varios y no llega, 409 `ELEGIR_CARGO` con las opciones). El cliente (`src/lib/client/api.ts` + `ActuarComoProvider`) pide "Actuar como" y repite la peticion. Se guarda en `creado_rol_id/creado_cargo`, `revisado_*`, `aprobado_*`, `autorizado_*`, `elaborado_*`, `anulado_*`, `entrega_json` y en la bitacora (`actuo_como`).
- **Captura con recursos**: una extraccion o un analisis con equipos usados exige ademas `equipos:C` (alcance `uso` o mayor); con insumos, `inventario:C` (alcance `movimientos` o mayor).
- **El arranque no crea roles ni concede permisos**: solo aplica las migraciones pendientes (Fase 12; el catalogo de modulos lo crea la migracion base). Los roles se cargan con `scripts/seed-roles-usuarios.mjs` o desde Administracion > Roles.
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
  5. ~~Documentos SGC~~: **retirada** (`VERSION_SEGREGACION` `2026-10-03.1`) con la Biblioteca, que no tiene revision ni aprobacion. El numero se conserva porque bitacoras anteriores lo citan.
  6. Segundo usuario: quien solicita una accion critica no la aprueba.
  Al violarse: 409 `{ codigo: "segregacion", regla, message }`. Las fichas de analisis e informe traen `segregacion: { revisar, aprobar|autorizar }` para que la interfaz deshabilite los botones con la explicacion. Se eliminaron `TWO_PERSON_RULE`, `samePersonException` y `permitir_misma_persona`.
- **Excepcion de segregacion**: `POST /api/solicitudes { tipo: "excepcion_segregacion", entidad, entidad_id, accion, motivo }` (analisis, informes, incidencias, no conformidades y suspensiones; documentos ya no). Solo la pide quien tiene el permiso de esa accion, con el registro en el estado donde aplica y a quien la segregacion se la impide de verdad (si no, 403 o 409 `excepcion_innecesaria`); una pendiente no bloquea el registro (otra persona puede revisarlo o aprobarlo) y hay una sola por persona y accion. La aprueba quien tiene A en calidad; al aprobarse queda en `excepciones_json` del registro para esa persona y esa accion, en la bitacora de la accion (`excepcion_segregacion`) y, en un informe, en el PDF ("Revisión autorizada por excepción, solicitud #N").
- **Acciones criticas** (no se ejecutan: crean una solicitud, 202 `solicitud_creada`): anular o restaurar una recepcion, procesamiento, extraccion o analisis que ya no esta en borrador/registrado (AN del mismo modulo); anular un informe autorizado, liberado o enviado (AN en informes); excepcion de segregacion (A en calidad); asignar un rol, incluido el rol inicial de una cuenta nueva (A en usuarios); reactivar una cuenta; ampliar la vigencia de una cuenta temporal (A en usuarios). `obsoletar_documento` (Fase 7) se **retiro** del catalogo (`VERSION_ACCIONES_CRITICAS` `2026-10-03.1`, `ACCIONES_RETIRADAS`): una solicitud vieja se serializa con la etiqueta «Accion retirada» y `retirada: true`, nadie la puede aprobar ni rechazar (410 `retirado`) y su solicitante la puede cancelar; si no, vence. Revocar roles, dar de baja cuentas, bloquear y acortar vigencias son inmediatos. En borrador/registrado anular sigue siendo inmediato. Para que no se evite, una recepcion aceptada o rechazada no vuelve a "registrada" quitando la decision al editarla (409 `decision_registrada`), y la migracion de la Fase 1 (`migrarRolesUnicos`) no toca cuentas cuyos roles ya pasaron por solicitudes (un rol inicial pendiente o rechazado no se asigna al reiniciar).
- **Flujo**: la solicitud se crea con reautenticacion del solicitante; una sola pendiente por registro, sin contar las excepciones de segregacion (en cuentas de usuario, una por tipo y, en asignar rol, una por rol); nadie aprueba su propia solicitud ni un cambio de acceso sobre su propia cuenta; un informe con solicitud pendiente no se envia ni se enmienda, y un analisis con solicitud pendiente no se incluye, revisa ni autoriza en un informe; mientras esta pendiente el registro no se edita, no se revisa/aprueba y no sirve de origen (409 `solicitud_pendiente`). Un segundo usuario con el permiso de la accion la aprueba (`POST /api/solicitudes/<id>/aprobar { motivo }`, reautenticacion `solicitudes:aprobar`) y el servidor ejecuta la accion en la misma transaccion, con la bitacora enlazada (`solicitud_id`, `solicitado_por`); o la rechaza (`/rechazar`). El solicitante la cancela (`/cancelar`). Resolver es atomico: si otra persona la resolvio al mismo tiempo (el `UPDATE ... WHERE estado = 'pendiente'` no afecta filas) se responde 409 y no se ejecuta dos veces. Vencen a los `SOLICITUD_VENCE_DIAS` dias: una vencida deja de bloquear en cuanto pasa el plazo y se marca `vencida` en el barrido del bootstrap o al intentar resolverla. Nada se borra. Eventos: `solicitar`, `aprobar_solicitud`, `rechazar_solicitud`, `cancelar_solicitud`, `vencer_solicitud`.
- **Bandeja**: `GET /api/solicitudes` (pendientes que la persona puede aprobar y las suyas; `estado=todas` para historial; `entidad`+`entidad_id` para la pestana "Solicitudes" del historial de un registro). Aviso "Por autorizar" en el Inicio y pagina `/solicitudes`.
- **Cambios de acceso**: el Responsable General tiene usuarios = V A (migracion `migrarPermisosFase3` al arrancar, una sola vez: si ya esta en la bitacora no se repite, asi que un administrador puede quitarlo despues). En usuarios, `G` no implica A (Fase 3.1): aprobar cambios de acceso exige `usuarios:A` explicito; en los demas modulos G implica todo. Nadie edita los permisos de un rol que tiene vigente (409 `rol_propio`). Guardas: nunca queda el sistema sin usuarios:G vigente (y uno sin fecha de fin) ni sin usuarios:A vigente (independientes desde la Fase 3.1). El script de alta (seed) asigna roles sin solicitud y lo deja dicho en la bitacora (`sin_solicitud`).

### 9.4 Fechas (Fase 3)

Todas las fechas pasan por `src/lib/shared/fechas.ts`. Una fecha sin hora ("AAAA-MM-DD": recepcion, emision, vigencias, caducidad) es texto y se formatea sin `Date` (`formatearFecha` -> dd/mm/aaaa). Una fecha con hora (ISO o TIMESTAMP de la base, en UTC) se muestra en America/Tijuana (`formatearFechaHora`). "Hoy", vencimientos, "hace N dias" y los filtros por dia (`inicioDiaLocal`/`finDiaLocal`) usan el dia del laboratorio, sin importar la zona del servidor o del navegador. Los campos de fecha usan `src/components/ui/DateInput.tsx` (dd/mm/aaaa siempre, calendario con teclado) en lugar de `<input type="date">`.

### 9.4.1 Autorizaciones del personal FX-THF-AP (Fase 4)

Segunda capa, ademas del rol: la persona que actua (usuario de la sesion) debe tener autorizacion vigente para la actividad, el metodo y los equipos del formato. Codigo: `src/lib/shared/autorizaciones.ts` (catalogo y requisitos por formato, compartido con la interfaz) y `src/lib/server/autorizaciones.ts` (tabla, validacion, alta/revocacion, vencimientos y avisos).

- **Tabla `autorizaciones_personal`**: `id`, `usuario_id`, `tipo` (`metodo` | `equipo` | `actividad`), `clave`, `vigente_desde`, `vigente_hasta` (nullable), `folio_fx_thf_ap` (folio del formato en papel), `otorgada_por`, `otorgada_rol`, `otorgada_en`, `motivo`, `revocada_en`, `revocada_por`, `motivo_revocacion`, `vencimiento_registrado_en`. Nada se borra: revocar llena las columnas de revocacion. Esquema en la migracion base (`0009_base_fase9.mjs`).
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

- **Tabla generica `adjuntos`** (`entidad` = `analisis`; desde la Fase 11 tambien `incidencia` y `accion_correctiva`, con las mismas validaciones, 9.4.5): `id`, `entidad`, `entidad_id`, `tipo_evidencia`, `descripcion` (≥ 5), `nombre_original` (saneado, solo dato), `nombre_almacenado` (`analisis/<entidad_id>/<uuid>.<ext>`, relativo a `<instance>/evidencias/`), `mime`, `extension`, `tamano_bytes`, `sha256`, `subido_por`, `subido_rol`, `subido_en`, `heredado_de`, `anulado_en`, `anulado_por`, `anulado_rol`, `motivo_anulacion`. Indices `(entidad, entidad_id)` y `sha256`. Nada se borra: anular llena las columnas y el archivo se conserva.
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

### 9.4.5 Incidencias, no conformidades y acciones correctivas (Fase 11)

Codigo: `src/lib/shared/calidad.ts` (catalogos, folios, `accionVencida`), `src/lib/server/modules/calidad/` (`comun.ts` esquema y acceso, `incidencias.ts`, `nc.ts`, `automaticas.ts`, `bloqueos.ts`, `adjuntos.ts`, `registros.ts`, `nc-pdf.ts`, `tablero.ts`, `acceso-historial.ts`), `src/lib/server/adjuntos-operaciones.ts` (subir, servir y anular adjuntos, compartido con los analisis) y rutas `src/app/api/calidad/**`. Interfaz en `src/components/features/calidad/` y `src/app/(app)/calidad/`.

- **Tablas** (migracion `0011_calidad.mjs`, SQL para ambos motores): `incidencias` (folio `INC 0000001`; tipo, `fecha_hora_ocurrencia`, descripcion ≥ 20, `accion_inmediata`, `impacto_resultados` si/no/desconocido, estado, `reportada_por/nombre/rol/en`, `origen_automatico` + `clave_automatica`, evaluacion, `nc_id`, anulacion, `excepciones_json`), `incidencia_registros` (entidad, entidad_id, referencia; varias por incidencia), `no_conformidades` (folio `NC 0000001`; origen, clasificacion, requisito, descripcion, `responsable_id`, estado y fecha de cada etapa, impacto, causa, `requiere_accion_correctiva` + justificacion, riesgos, `requiere_cambio_documental` + `propuesta_documento_id`, `verificacion_programada`, `reaperturas`, cierre, `archivo_pdf` + `pdf_sha256`, anulacion), `nc_registros_afectados`, `nc_verificaciones`, `acciones_correctivas` (responsable, fecha compromiso, estado pendiente/en_proceso/implementada/cancelada, implementacion, cancelacion y reasignacion con motivo), `nc_comunicaciones`, `suspensiones` (tipo metodo/equipo, clave, `estado_previo_equipo`, reanudacion) y `retenciones_informe`. `propuestas_documento.nc_id` liga la propuesta documental (Fase 7) con la NC. Nada se borra.
- **Estados**: incidencia `reportada → en_evaluacion → cerrada_sin_nc | escalada_a_nc` (+ `anulada`); NC `abierta → en_analisis → acciones_en_curso → en_verificacion → cerrada` (+ `anulada`), solo hacia adelante (`POST /nc/:id/avanzar`, 409 si se salta o retrocede); "no eficaz" regresa a `en_analisis` y suma `reaperturas` (bitacora `reabrir`); para volver a `acciones_en_curso` hace falta al menos una accion creada despues de esa verificacion (409 `reapertura_sin_accion`). Lo que permitio avanzar no se vacia despues (409 `dato_de_etapa`). Al reanudar un equipo se restaura su estado previo y se aplica la regla de mantenimientos del inventario (`syncEquipoEstado`). La lista y la ficha del informe marcan "Retenido" y bloquean liberar y enviar como "requiere enmienda". Requisitos: `en_analisis` exige responsable e impacto; `acciones_en_curso`, metodo + causa raiz (≥ 10), `requiere_accion_correctiva = si` y al menos una accion; `en_verificacion`, todas implementadas o canceladas y al menos una implementada. Transiciones con `UPDATE … WHERE estado = :actual` y lectura `FOR UPDATE` en MySQL (`filaBloqueada`); doble cierre → 409.
- **Verificacion por NC** (no por accion): la eficacia se juzga sobre la causa raiz, que es de la NC; una sola verificacion evita cerrar con acciones sueltas verificadas y la causa sin eliminar. Regla 8: nadie que sea responsable de una accion no cancelada de la NC la verifica.
- **Permisos** (`accesoCalidad`, servidor): reportar calidad:C (cualquier alcance, **sin supervision**: `crearIncidencia` no llama `aplicarSupervision`); ver calidad:V total o, con `incidencias`, solo lo propio (incidencias `reportada_por`, NC donde es responsable o responsable de una accion; lo ajeno responde 404 por lista, ficha, busqueda, filtro por registro, CSV, historial, campana y adjuntos); evaluar R; crear NC R o G; editar G o el responsable con C+ (`puedeEditar`); implementar el responsable de la accion o G; verificar R; suspender y retener R; reanudar y liberar A + reautenticacion `calidad:A`; cerrar A + reautenticacion; anular AN + reautenticacion `calidad:AN` → solicitud `anular_calidad` (segundo usuario). Reglas 7–10 en `REGLAS_SEGREGACION` (version `2026-09-29.1`; la 8 cuenta responsables actuales y anteriores de las acciones —columna `responsables_previos`— y a quien las marco implementadas; la 9, al responsable actual y a los anteriores de la NC), con la excepcion de segregacion existente (`excepciones_json` en incidencias, NC y suspensiones). El Admin tecnico (calidad V bitacora) no ve incidencias ni NC; `/api/solicitudes?entidad=<tabla de calidad>` usa `exigirVerRegistroCalidad` (la misma visibilidad de la ficha; suspensiones, solo V total). Ligar un registro al reportar exige V de su modulo (`MODULO_REGISTRO`). En la ficha de una NC, quien tiene alcance `incidencias` ve de las incidencias ajenas agrupadas solo folio y estado.
- **Incidencias automaticas** (`automaticas.ts`, en la misma transaccion del evento; si falla, no se crean): recepcion `aceptada_con_desviacion` o `rechazada` (crear, editar o ejecutar la solicitud; la reporta quien decidio), equipo no operativo o con calibracion vencida en extraccion o analisis, y `alerta_integridad` de PDF de informe, adjunto o respaldo (actor `null` = "Sistema"). Sin duplicados: `clave_automatica` unica entre las no anuladas (recepcion y equipo, que pueden repetirse tras reabrir) o entre todas (`alerta_integridad`: la clave identifica un hecho inmutable; anulada como falso positivo, no renace). El PDF final de una NC alterado genera `alerta_integridad` e incidencia, como el del informe. Las incidencias automaticas guardan el cargo con que actuo la persona (`reportada_rol`).
- **Bloqueos** (`bloqueos.ts`): `exigirSinSuspension` en crear/editar extracciones y analisis (409 `suspendido`, "Método DSP suspendido por NC 0000001"); equipo suspendido → `fuera_servicio` y `updateEquipo` no lo reactiva (409); `exigirSinRetencion` en liberar el informe y en `informeEnviable` (409 `informe_retenido`). Suspender y reanudar bloquean en MySQL solo las filas de `suspensiones` (sin el JOIN) y reanudar bloquea antes la fila del equipo, en el mismo orden que suspender. Un equipo declarado solo por nombre en un analisis se resuelve contra el catalogo (nombre o clave de bitacora) antes de revisar la suspension. Suspender lo que la misma NC ya suspende → 409; otra NC puede suspenderlo tambien y sigue suspendido hasta reanudar todas (el estado previo del equipo se hereda en la cadena).
- **Cierre** (`exigirCerrable`): evaluacion de impacto completa; la rama "no requiere accion" solo vale sin acciones no canceladas ni verificaciones (y `editarNc` no regresa la decision a "no" si ya las hay, 409 `decision_con_acciones`); con accion correctiva, sin pendientes, en verificacion y la ultima verificacion eficaz; sin accion, justificacion (≥ 10) desde abierta o en analisis; sin suspensiones ni retenciones activas; comunicacion registrada si `notificar_cliente = si`. Regla 9. El PDF (`nc-pdf.ts`, pdfkit; nueve secciones, la 9 con las fechas de etapa y los eventos de la bitacora de la NC con persona, cargo y motivo; clave `NC_FORMATO_CLAVE`, por omision "FX-MC-NC (por confirmar)") se escribe en `<instance>/calidad/nc/` con su SHA-256 tras el UPDATE y se borra si la transaccion falla; `GET /nc/:id/pdf` sirve el final con `X-Integridad-Pdf` (`ok`/`alterado`) a quien tiene calidad:V total, o uno a pedido (`?actual=1`, y siempre para el alcance `incidencias`, generado con su vista: incidencias ajenas solo por folio y estado).
- **API**: `GET|POST /api/calidad/incidencias` (`estado` incl. `por_evaluar`, `tipo`, `desde`, `hasta`, `search`, `entidad`+`entidad_id`, `mias`, `anuladas`, `formato=csv`), `GET /incidencias/:id`, `POST /incidencias/:id/{evaluacion,evaluar,anular}`, `GET|POST /incidencias/:id/adjuntos`; `GET|POST /api/calidad/nc`, `GET|PUT /nc/:id`, `POST /nc/:id/{avanzar,acciones,verificar,afectados,comunicaciones,retenciones,suspensiones,cerrar,propuesta-documental,anular}`, `GET /nc/:id/pdf`; `GET /api/calidad/acciones`, `PUT /acciones/:id`, `POST /acciones/:id/{iniciar,implementar,cancelar}`, `GET|POST /acciones/:id/adjuntos`; `POST /retenciones/:id/liberar`, `POST /suspensiones/:id/reanudar`, `GET /suspensiones/activas` (avisos de los formatos), `GET /indicadores` (V total). Los adjuntos se descargan y anulan por `/api/adjuntos/:id/…` (despacho por `entidad`).
- **Avisos** (`avisosCalidad`, Inicio y campana): incidencias por evaluar (R, sin las propias), mis acciones (proximas 7 dias y vencidas), verificaciones pendientes (R, regla 8), informes retenidos, metodos y equipos suspendidos y acciones cuyo responsable ya no es vigente.
- **Bitacora**: acciones `reportar, evaluar, cerrar_sin_nc, escalar, avanzar, implementar, iniciar_accion, cancelar, reasignar, verificar, reabrir, suspender, reanudar, retener, liberar_retencion, comunicar, afectar` con frases en `audit-humanize.ts` ("Luis reportó la incidencia INC 0000001", "Ana verificó la eficacia de NC 0000001: no eficaz"). Con alcance `incidencias` la bitacora completa responde 403; en ella, quien no tiene calidad:V total ve los eventos de calidad sin datos ni motivo.
- **Respaldos**: `archivos/calidad/` y las tablas de calidad en el manifest (`ESQUEMA_VERSION` 11); la verificacion 7 de la restauracion revisa los PDF de NC.

### 9.5 Llave de la bitacora

**Nunca vacies ni cambies una `SECRET_KEY` existente** (aunque sea un valor de ejemplo como `change-me`) sin seguir la migracion de abajo: la instalacion que la uso ya sello su bitacora con ella. El `.env.example` la trae vacia solo para instalaciones nuevas.

La bitacora se sella con HMAC-SHA256 encadenado (`src/lib/shared/audit-chain.mjs`). La llave es `SECRET_KEY` si esta definida y no es `ficotox-dev-secret`; si no, `instance/auditoria.key` (se crea al azar la primera vez). **La llave nunca se cambia sola**: al arrancar y en `/auditoria` (`GET /api/audit/verify` -> `llave: { origen, advertencias }`) solo se advierte si falta o es corta. Respalda `.env` o `instance/auditoria.key` junto con la base.

Migrar la llave (solo si es imprescindible, con el servidor detenido):

1. Respaldar la base y el `.env` / `auditoria.key` actuales.
2. Verificar la cadena con la llave actual (`npm run verificar-instalacion`; Auditoria solo avisa si falla).
3. Dejar constancia: la cadena anterior se conserva sellada con la llave vieja; guarda esa llave en custodia (sin ella no se puede volver a verificar lo anterior).
4. Configurar la llave nueva y, antes de atender peticiones, agregar una entrada de corte que declare el cambio. Mientras no exista una herramienta de "resellado" versionada, **no cambies la llave** en una instalacion con datos: la verificacion de toda la cadena anterior fallaria.

## 10. Base de datos

### 10.1 Tablas principales

`roles`, `permisos` (catalogo de modulos), `rol_acciones` (permisos de la Fase 1), `usuario_roles` (asignaciones con vigencia), `rol_permisos` (modelo anterior, sin uso), `usuarios`, `reactivos`, `consumibles`, `equipos`, `mantenimientos`, `movimientos`, `muestras_recepcion`, `muestras_procesamiento`, `muestras_extraccion`, `muestras_analisis`, `adjuntos` (Fase 10), `incidencias`, `incidencia_registros`, `no_conformidades`, `nc_registros_afectados`, `nc_verificaciones`, `acciones_correctivas`, `nc_comunicaciones`, `suspensiones`, `retenciones_informe` (Fase 11), `informes`, `documentos_sgc`, `auditoria`, `reportes_mantenimiento`.

Columnas de baja logica y anulacion (`src/lib/server/inventory-baja.ts`, `src/lib/server/samples-flow.ts`): `activo`, `baja_motivo`, `baja_en`, `baja_por` en reactivos, consumibles y equipos; `anulado_en`, `anulado_por`, `motivo_anulacion`, `estado_previo` en las tablas de muestras. `muestras_recepcion` agrega `decision_aceptacion`, `aceptacion_json` (inspeccion, comunicacion al cliente) y `disposicion_json`. Las listas filtran `activo = 1` / `estado <> 'anulada'` salvo `?bajas=1` / `?anuladas=1`.

### 10.2 Migraciones versionadas (Fase 12)

El esquema tiene version. Las migraciones viven en `src/lib/server/migraciones/` (JavaScript plano, las usan igual el servidor y los scripts):

- `NNNN_nombre.mjs` exporta `version`, `nombre` y `pasos`; `up(db, motor)` ejecuta los pasos con `pasos.mjs`. Solo hacia adelante. Cada paso es declarativo (`tabla`, `indice`, `columna`, `trigger`, `catalogo`) con su SQL para SQLite y para MySQL, y comprueba antes si ya existe (idempotente).
- Las versiones empiezan en **9** para coincidir con las bases anteriores: `0009_base_fase9` crea el esquema completo de la Fase 9 (tablas, indices, triggers de la bitacora y catalogo de modulos), `0010_adjuntos` (Fase 10), `0011_calidad` (Fase 11) y `0012_firmas_tokens` (la tabla que el codigo anterior creaba al primer uso). `VERSION_ACTUAL` = la ultima; `ESQUEMA_VERSION` de los respaldos es la misma.
- `motor.mjs`: tabla `schema_migraciones` (version, nombre, `checksum` SHA-256 de los pasos, `aplicada_en`, `duracion_ms`, `app_commit`, `modo` aplicada/baseline) y `schema_migraciones_bloqueo` (una fila; se toma con un `UPDATE` atomico, con pid/equipo/hora; un bloqueo de un proceso muerto se libera). Cada migracion corre en su propia transaccion (SQLite: `BEGIN IMMEDIATE`; si falla, rollback y el error trae la ruta del respaldo previo) y deja en la bitacora «Sistema aplico la migracion N» (`accion` migrar, `entidad` esquema).
- **MySQL**: el DDL confirma solo (no hay transacciones de DDL). Cada paso es idempotente y la migracion se registra al final, asi que una migracion interrumpida se **reanuda** al volver a correr (los pasos hechos se saltan). Tambien la creacion inicial en una base vacia: una tabla de control sin filas con un subconjunto exacto de las tablas de la 0009 se reconoce como creacion interrumpida (no como deriva) y se completa. El respaldo previo es con `mysqldump` (fuera de la aplicacion; `--respaldo-hecho` / `MIGRAR_MYSQL_RESPALDO_HECHO`).
- **Linea base** de bases anteriores (sin `schema_migraciones`): se normaliza su esquema (tablas, columnas con tipo/NOT NULL/default/PK, indices y triggers, sin importar el orden) y se compara con el esperado de las versiones 11, 10 y 9 (el esperado se obtiene aplicando las migraciones a una base en memoria). Si coincide, se registran esas versiones como `baseline` (sin ejecutar nada) y se aplica lo que falta. `firmas_tokens` se acepta presente o ausente antes de la 12. **Cualquier otra diferencia aborta** con el reporte de diferencias y sin tocar la base (ni crear las tablas de control).
- El servidor no arranca (mensaje `[migraciones] FICOTOX no arranca: …` y `process.exit(1)`) si una migracion falla, si el checksum de una migracion aplicada cambio, si la base es mas nueva que la aplicacion o si el esquema tiene deriva. `src/lib/server/migrar-arranque.ts` lo hace desde `instrumentation-node.ts`, con conexion propia, respaldo `pre-migracion` (`crearRespaldo`) y la llave de la bitacora.
- `npm run migrar [-- --estado | --simular]` (`scripts/migrar-ficotox.mjs`): exige el servidor detenido (`servidor.lock`), hace su propio respaldo y usa el mismo motor. `scripts/restaurar-ficotox.mjs` usa el mismo mecanismo: un respaldo de una version anterior se restaura y se migra; uno de una version mayor, o con deriva, se rechaza (verificacion 3).
- `tests/build-fixture.mjs` y la base de prueba se generan con las migraciones. `tests/fixtures/esquema-anterior-fase{9,10,11}.sqlite3` son las bases (sin datos) que creaba el codigo anterior, congeladas desde `main`; `tests/migraciones.mjs` comprueba que una base nueva es identica a la del codigo anterior y todos los casos limite.
- **Se retiraron** todas las funciones `ensure*Schema()`, `addColumnIfMissing` y `src/lib/server/schema.ts` (crear o alterar tablas en cada request), y las migraciones de datos de las fases 0 a 3 que corrian al arrancar (ya aplicadas en todas las bases conocidas). Queda **una sola defensa** en tiempo de ejecucion: `asegurarTriggersBitacora()` (`audit.ts`) vuelve a crear los dos triggers que impiden UPDATE/DELETE en `auditoria` si alguien los quito (la verificacion de integridad ademas lo reporta).

**Migraciones 14 y 15**: `0014_tema` agrega `usuarios.tema` (`claro` | `oscuro` | `auto`, por omision `auto`; `PUT /api/auth/me/tema`, sin bitacora). `0015_notificaciones_leidas` crea `notificaciones_leidas` (`id`, `usuario_id`, `clave` VARCHAR(190), `leida_en` ISO; indice unico `usuario_id, clave`): estado de lectura de la campana, solo de interfaz (no es registro regulado ni pasa por la bitacora).

**Notificaciones y pendientes**: `src/lib/server/pendientes.ts` (`pendientesDe`) es la unica fuente de "Para ti" (`GET /api/inicio/avisos`, agrupado con cuenta y 6 elementos) y de la campana (`GET /api/notificaciones`: `items` no leidas y `anteriores` leidas en 7 dias; `total` = no leidas; `POST /api/notificaciones/leidas { claves }`). Cada evento lleva una **clave** estable tipo + registro + situacion: `solicitud:<id>`, `supervision:<tabla>:<id>:<solicitada_en>`, `asignacion:R<recepcion>:usuario<id>:<asignacion>`, `analisis:<id>:<estado>:<fecha del envio o revision>`, `informe:<id>:<estado>:v<version>`, `enmienda:<id>:v<version>`, `mantenimiento:<id>:vencido|proximo`, `calibracion:equipo<id>:<estado>:<fecha>`, `stock_bajo:reactivo<id>|consumible<id>:bajo|agotado:<ultima entrada>`, `caducidad:reactivo<id>:<fecha>:pronto|vencido`, `vence_acceso:<usuario>:<rol|cuenta>:<fecha>`, `vence_autorizacion:<id>:30dias|7dias`, `bitacora_alterada:<incidencia>` y las de calidad (`incidencia_evaluar:<id>`, `accion:<id>:asignada|proxima|vencida`, `verificacion:<nc>:<inicio>`, `informe_retenido:<retencion>`, `suspension:<id>`, `reasignar_accion:<id>`, `reasignar_nc:<id>`). Si cambia la situacion, cambia la clave y el aviso vuelve como no leido. Destinatarios: quien puede actuar o debe saberlo (equipos e inventario solo a quien los administra; nunca por la propia accion). Depuracion al consultar: lecturas de mas de 90 dias y claves que ya no existen (un dia de margen).

**Foto de perfil (migracion 16)**: `usuarios.foto` (base `<usuario_id>/<uuid>`) y `usuarios.usa_foto` (foto o figura; cambiar no pierde la otra). `src/lib/server/modules/fotos.ts`: el navegador recorta (canvas, 1024 px) y envia el cuadrado; el servidor valida por firma de bytes (JPG/PNG/WEBP con `problemaDeContenido`; rechaza SVG, HTML y lo demas), 5 MB y 64–6000 px, y lo **recodifica con sharp** (dependencia directa, en `serverExternalPackages`) a WEBP de 512 y 128 px: sin EXIF/GPS y sin guardar el original. Archivos en `<instancia>/avatares/<usuario_id>/<uuid>-512.webp` y `-128.webp`; al reemplazar o quitar se borran los anteriores (no es registro regulado). Endpoints: `POST|PUT|DELETE /api/auth/me/foto` (subir, elegir foto o figura, quitar), `DELETE /api/admin/usuarios/:id/foto` (usuarios:G, con motivo) y `GET /api/cuentas/:id/foto?tam=128|512&v=<version>` (sesion, `nosniff`, cache larga por version). `/api/cuentas/activas` y `/api/auth/me` devuelven la version (`foto`). En el cliente, `Avatar` busca a la persona en el directorio y pide la foto con fetch (blob: en cache, `FotoPerfil.tsx`); si falla, muestra la figura. Bitacora: "cambió su foto de perfil", "quitó su foto de perfil", "quitó la foto de perfil de …" (motivo). Respaldo: `avatares` en `CARPETAS_ARCHIVOS` (opcional: si no existe, no pasa nada).

**Migracion 17 (recientes de la busqueda)**: `busqueda_recientes` (`id`, `usuario_id`, `tipo` consulta | resultado, `clave` VARCHAR(190), `titulo`, `sub`, `href`, `kind`, `comando`, `mono`, `usado_en`; unico por `usuario_id` + `clave`). Solo de interfaz, sin bitacora; cada persona conserva los ultimos 30 y se le devuelven 8.

**Busqueda universal (8.1)**: ver la seccion 8.1.

**Agregar una migracion**: nuevo archivo `NNNN_nombre.mjs` con la version siguiente y sus pasos para ambos motores; importarlo en `motor.mjs`. Nunca editar una migracion ya publicada (el checksum lo detecta): los cambios van en una migracion nueva.

### 10.2.1 Tipos de extraccion

Los tipos, claves y helpers de folio viven en `src/lib/shared/extraction.ts` (compartido entre servidor y cliente). En el cliente, cada formato es un "protocolo" (`src/components/features/samples/extraction/asp.tsx`, `dsp.tsx`) que declara pasos, insumos de cantidad fija, equipos y secciones; `ExtractionForm.tsx` es comun. Para agregar un formato nuevo (PSP, pigmentos...) se amplia la union `ExtractionType`, `EXTRACTION_TYPES` y `normalizeExtractionType` en `extraction.ts`, se registra el protocolo en `ExtractionForm.tsx` y se escribe el protocolo; los route handlers y el esquema no cambian.

`GET /api/samples/extraction?tipo=E-D` filtra por formato; con `search=E-D 12` busca exactamente ese folio de esa serie y con `search=12` por coincidencia en ambas. `GET /api/samples/extraction/next-folio?tipo=E-D` regresa el siguiente folio de esa serie. Al crear, `tipo_registro` se valida (`400` si no es un tipo soportado; si falta se asume `E-A` por compatibilidad); al editar, si falta se conserva el tipo almacenado. `clave_revision` se fuerza al formato del tipo (admite sufijo de revision). `409` si el folio ya existe en esa serie.

Las filas de `uso_inventario_json` generadas por el protocolo llevan `origen: "protocolo"` y `campo`; al reabrir, el formulario las recalcula y solo conserva como manuales las que no vienen del protocolo (las anteriores a este cambio, sin `origen`, se casan por tipo y referencia).

### 10.2.2 Motor SQLite, sesiones y concurrencia (Fase 12)

- Pragmas al abrir (`src/lib/server/db.ts`, `PRAGMAS_SQLITE`): `journal_mode=WAL` (lectores y un escritor sin bloquearse; los respaldos en linea no detienen al servidor), `synchronous=NORMAL` (con WAL, una transaccion confirmada sobrevive a una caida del proceso; ante un corte de luz se puede perder la ultima fraccion de segundo, nunca se corrompe la base; `FULL` duplica el costo de cada escritura sin beneficio medible para el laboratorio), `busy_timeout=5000` (si un script tiene la base, se espera en vez de fallar) y `foreign_keys=ON` (el esquema de SQLite no declara llaves foraneas; `PRAGMA foreign_key_check` = 0 en la base real).
- Una sesion (transaccion) por request (`apiRoute` en `http.ts`). En SQLite las sesiones de un proceso van en serie (una conexion). El cuerpo de la peticion (p. ej. una evidencia de 25 MB) se recibe **antes** de tomar la sesion, para no retener a los demas mientras llega.
- **Folios**: todas las series tienen restriccion unica (`folio_num` de recepcion, procesamiento, extraccion por tipo, analisis e informes por version, incidencias y NC; `codigo` de reportes de mantenimiento). Si dos altas simultaneas calculan el mismo folio (MySQL, o dos procesos sobre la misma base SQLite), `apiRoute` repite la peticion completa en una transaccion nueva (hasta 3 intentos, con espera breve); tambien ante `SQLITE_BUSY*`, `ER_LOCK_DEADLOCK` y `ER_LOCK_WAIT_TIMEOUT`. Si se agota, 409 `conflicto_concurrencia` (nunca 500). Cada reintento queda en el registro del servidor. El choque se reconoce en `esConflictoDeFolio` (`db.ts`): SQLite nombra la columna y MySQL/MariaDB el indice (el UNIQUE sin nombre de extracciones se llama como su primera columna, `tipo_registro`). Los handlers de alta solo responden 409 «el folio ya existe» cuando el folio lo escribio la persona; si lo asigno el servidor, relanzan el error para que `apiRoute` reintente. No se reintenta una peticion cuyo handler ya confirmo una parte (`Session.confirmado`, p. ej. registrar un envio y despues mandar el correo): repetirla duplicaria efectos; responde 409.
- **Suspensiones (MySQL)**: un solo orden de bloqueo (equipo y despues suspensiones; `nc.ts`, `bloqueos.ts`) para no cruzarse; un interbloqueo residual se reintenta.
- «Crear respaldo ahora» (`crearRespaldoPost`, sin `apiRoute`) trabaja en tres tiempos: con la sesion tomada solo la **foto de la base** (`iniciarRespaldo`; la API de respaldo en linea de SQLite reinicia la copia si otra conexion escribe, y con la sesion tomada no escribe ninguna de este proceso); **sin sesion**, la copia y las huellas de los archivos, el manifest y la retencion (`completarRespaldo`; los archivos son de solo insercion); y una sesion corta para la bitacora. Con 10 usuarios de carga, ninguna otra peticion paso de 300 ms mientras se respaldaba.
- Medidas y decision del motor: `docs/DECISION_BASE_DE_DATOS.md`.

### 10.3 Capa de datos

`src/lib/server/db.ts` abre una sesion por request. Los parametros se escriben como `:nombre` en ambos motores. En SQLite las sesiones se serializan (una sola conexion `better-sqlite3`); en MySQL cada sesion usa una conexion del pool. El SQL especifico de un motor va siempre detras de `isSqlite()` (p. ej. `printf`/`LPAD`, `sqlite_master`/`INFORMATION_SCHEMA`).

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

Fase 12, tambien dentro de `npm test`: `tests/api-produccion.mjs` (historial con alcances, CSV parcial, folios y suspensiones simultaneas), `tests/migraciones.mjs`, `tests/operacion.mjs` (configurar, instancia-nueva, servicio, registros, puerto ocupado, HTTPS, actualizar con build fallido, verificar-instalacion) y `tests/concurrencia.mjs` (dos servidores sobre la misma base). Fuera de `npm test`: `npm run prueba-carga` (10 usuarios; reporte en `instance/test/carga/`) y `npm run test:mysql` (Docker o `MYSQL_TEST_URL`).

`npm test` copia la base congelada `instance/fixtures/ficotox-base.sqlite3` (base vacia + roles y usuarios de la Fase 0) a `instance/test/ficotox-test.sqlite3`, crea **solo en esa copia** el rol "QA pruebas automatizadas" (todos los permisos) y el usuario `qa@ficotox.local`, levanta `next dev` en el puerto 3100 sobre la copia, crea los datos de apoyo (`tests/datos-apoyo.mjs`) y corre `tests/api-*.mjs` (flujo completo por HTTP; `api-incidencias.mjs` y `api-no-conformidades.mjs` en la Fase 11), `tests/respaldos.mjs` (respaldo y restauracion, Fase 10), `tests/standalone.mjs` (paquete standalone, Fase 11) y `tests/ui/*.mjs` (Playwright contra el Chrome de Playwright mas reciente o `CHROME_PATH`). El servidor de prueba usa `EVIDENCIA_MAX_MB=25` y `FICOTOX_BACKUP_DIR=instance/test/backups`. La base real nunca se toca. Detalle en `docs/VALIDACION.md`.

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

**Paquete standalone (Fase 11)**: `npm run build` ejecuta despues `scripts/limpiar-standalone.mjs` (`postbuild`), que quita de `.next/standalone` cualquier `.env*`, `instance/`, `backups/`, `instance-restaurada/`, `tests/`, `marimo/` y archivos `*.sqlite3`, `*.sqlite`, `*.db` y `*.key` (fuera de `node_modules`) y falla si queda alguno. Ademas, las rutas de `config.ts`, `audit.ts`, `audit-chain.mjs` y del PDF de NC llevan `/*turbopackIgnore: true*/` para que el rastreo de archivos de Turbopack no copie el proyecto. El paquete queda con `.next/`, `node_modules/`, `package.json` y `server.js`; la instancia real (base, llave, PDF, evidencias) se queda **fuera** y el servidor la encuentra por `SQLITE_PATH`/`INSTANCE_DIR` del `.env` de la raiz. `tests/standalone.mjs` lo comprueba: revisa el contenido del paquete y arranca `scripts/start-ficotox.mjs` con una base temporal (`SQLITE_PATH` en `instance/test/standalone-*`), verificando en `/api/health/db` que usa esa base y que el candado `servidor.lock` se creo junto a ella.

`scripts/start-ficotox.mjs` carga `.env`, resuelve la base SQLite, copia `public/` y `.next/static` al build standalone y arranca `node .next/standalone/server.js` en `HOST:PORT` (por defecto `0.0.0.0:5000`), abriendo el navegador con la IP LAN como hacia el lanzador anterior.

Para copiar a otra PC: llevar la carpeta del proyecto con `node_modules`, `.next`, `public`, `scripts` y `.env`, instalar Node.js LTS y ejecutar `npm run start:standalone`.

### 14.3 Produccion en el laboratorio (Fase 12)

Procedimiento completo para el personal: `docs/INSTALACION.md`. Comandos:

| Comando | Que hace |
| --- | --- |
| `npm run configurar` | Crea o completa `.env` (permisos 600): `JWT_SECRET` fuerte si falta o es debil; `SECRET_KEY` solo si no existe (nunca la cambia; si la instancia ya sella con `auditoria.key` o tiene una base sin llave, no genera una); pregunta HOST, PORT, dominios, instancia y SMTP; registra la **huella** de la llave en `<instancia>/llave-bitacora.huella`. Idempotente; no imprime secretos. |
| `npm run instancia-nueva -- --confirmar` | Sin `--confirmar` no hace nada. Mueve (no borra) la instancia actual y su llave a `backups/pre-produccion-<fecha>/` (con `LEEME.txt`), crea la base vacia con las migraciones y el catalogo de roles y da de alta un Administrador tecnico y un Responsable General con contrasena temporal (se muestra una vez; `debe_cambiar_password=1`). Sin datos de demostracion ni autorizaciones de ejemplo; todo en la bitacora como «sistema». Solo SQLite, con el servidor detenido. |
| `npm run instalar-servicio` / `quitar-servicio` | Windows: tarea programada `FICOTOX` al iniciar el sistema (SYSTEM, `RestartOnFailure` cada minuto, definicion XML en `<instancia>/servicio/`) y regla de firewall `FICOTOX` (TCP PORT, perfiles privado y dominio). macOS/Linux: genera el LaunchDaemon (`KeepAlive`) o la unidad systemd (`Restart=on-failure`) e imprime los comandos con `sudo`. `--simular` solo muestra. |
| `npm run actualizar [-- --git]` | Respaldo `pre-actualizacion` → detener → apartar `.next` → `npm ci` + build (si falla: devuelve el build anterior y arranca como estaba) → migrar → arrancar → `/api/health/db` → verificar-instalacion. |
| `npm run detener` / `npm run reiniciar` | Detiene al **lanzador** y al servidor sin que se relance: crea `<instancia>/detener` y termina al lanzador (pid en `<instancia>/lanzador.lock`) con su arbol (Windows: `schtasks /End` si es servicio + `taskkill /T /F`; macOS/Linux: SIGTERM). Reiniciar vuelve a arrancar como estaba y espera `/api/health/db`. Lo usan `actualizar` y `quitar-servicio`. |
| `npm run verificar-instalacion` | ✅/⚠️/❌ de Node, disco, hora, JWT, llave (huella registrada), migraciones, bitacora, tarea y ultimo respaldo, prueba de restauracion, modos obligatorios, CORS, HTTPS, cuentas `@ficotox.local`, `usuarios:G` y `usuarios:A`, arranque automatico y paquete limpio. Reporte en `<instancia>/verificaciones/<fecha>.md`; codigo 1 si hay ❌. |
| `npm run migrar [-- --estado \| --simular]` | Migraciones (§10.2). |
| `npm run sqlite-a-mysql` | Pasa una base SQLite a MySQL (ver `docs/DECISION_BASE_DE_DATOS.md`). |

**Lanzador** (`scripts/start-ficotox.mjs`): abre primero el registro (`<instancia>/logs/ficotox-AAAA-MM-DD.log`, `scripts/lib/registro.mjs`: rotacion por tamano, retencion por dias, enmascarado de correos, contrasenas, credenciales en URL, tokens y llaves), asi que todo error de arranque queda escrito. Comprueba `JWT_SECRET`, el build, que no haya otro servidor vivo sobre la instancia (`servidor.lock`; el servidor tambien se niega en `instrumentation-node.ts`) y que el puerto este libre; valida `TLS_CERT`/`TLS_KEY` y con ellos precarga `scripts/https-lanzador.mjs` (el servidor de Next escucha en HTTPS; la IP real del socket se conserva igual que con `ip-real.mjs`). Escribe «FICOTOX escuchando…» cuando `/api/health/db` ya responde (despues de la verificacion de arranque y las migraciones, no con el «Ready» de Next). Toma `<instancia>/lanzador.lock` de forma atomica antes de copiar los estaticos (un solo lanzador por instancia). Los bloqueos (`servidor.lock`, `lanzador.lock`) cuentan como vivos solo si su proceso existe y se crearon despues del ultimo arranque del sistema (`src/lib/shared/bloqueo.mjs`): tras un apagado brusco o `taskkill /F`, un bloqueo huerfano con el pid reutilizado por otro programa no impide arrancar; `npm run detener` retira los huerfanos y nunca termina un proceso que no sea Node. **Supervision**: si el servidor termina con error o por una senal distinta de SIGTERM/SIGINT (p. ej. SIGKILL por memoria), lo relanza con espera creciente (5 s, 10 s… hasta 60 s; la cuenta se reinicia tras 10 minutos estable). El codigo **78** es un error de arranque que no se arregla solo (configuracion, migracion, instancia ocupada, puerto): no se relanza, y los servicios tampoco (systemd `RestartPreventExitStatus=78`; launchd solo relanza si el lanzador se cae; la tarea de Windows reintenta solo si no logra iniciar). SIGINT/SIGTERM (Ctrl+C, detener el servicio en macOS/Linux) detienen sin relanzar. En **Windows** terminar un proceso no es una senal (TerminateProcess: codigo 1), por eso `npm run detener` deja la senal `<instancia>/detener` (con ella ninguna salida se toma como caida) y termina al lanzador con su arbol. `servidor.lock` se crea de forma atomica (`wx`): dos servidores que arrancan a la vez sobre la misma instancia no pueden quedar los dos (el segundo sale con 78). Los ids de respaldo tambien se reservan de forma atomica (carpeta temporal sin `recursive`, sufijos `-2`, `-3`…), asi dos respaldos en el mismo segundo no chocan. `limpiar-standalone.mjs` escribe `.next/standalone/ficotox-build.json` con el commit compilado; `verificar-instalacion` avisa si el codigo es de otro commit.

Recomendaciones:

- Secretos robustos, HTTPS y `CORS_ORIGINS` vacio (mismo origen).
- SQLite para el laboratorio (ver `docs/DECISION_BASE_DE_DATOS.md` y sus umbrales para pasar a MySQL).
- Respaldo diario y prueba de restauracion cada 90 dias (`verificar-instalacion` lo revisa).

## 15. Respaldo y recuperacion

Ver `docs/backups.md` y `scripts/backup_ficotox.py` (lee `.env` de la raiz y respalda `instance/ficotox.sqlite3` o la base MySQL).

### 15.0 Respaldo y restauracion (Fase 10)

Procedimiento completo (que se respalda, frecuencia, llave, RTO, responsables, paso a paso, acta): **`docs/RESPALDO_Y_RECUPERACION.md`**.

- **Una sola implementacion**: `src/lib/shared/respaldo.mjs` (JavaScript plano con tipos en `respaldo.d.mts`, como `audit-chain.mjs`). La usan `scripts/respaldar-ficotox.mjs` (`npm run respaldar`), `scripts/restaurar-ficotox.mjs` (`npm run restaurar`) y, a traves del primero, `scripts/backup_ficotox.py`. Quien llama le pasa el constructor de `better-sqlite3`.
- **Formato**: `backups/<AAAAMMDD-HHMMSS>/` con `datos/ficotox.sqlite3` (API de respaldo en linea de SQLite; `integrity_check` del snapshot), `archivos/{informes,evidencias,documentos_sgc,biblioteca,maintenance_reports,calidad}/`, `manifest.json` (formato, fecha, host, version y commit, `esquema_version` = `ESQUEMA_VERSION`, motor, conteos de `TABLAS_PRINCIPALES`, bitacora: entradas, ultimo id y sello, archivos con tamano y SHA-256, llave: incluida, origen y huella, y `sello` = HMAC-SHA256 del manifest con la llave de la bitacora) y `llave/llave-bitacora.txt`. Se escribe en `.<id>.tmp` y se renombra al final. Nunca `JWT_SECRET` ni otros secretos.
- **Retencion**: `aplicarRetencion` conserva `RESPALDO_RETENCION` y nunca borra el ultimo respaldo con un acta `aprobada`.
- **Restauracion**: modo prueba por omision (`instance-restaurada/<fecha>/` junto a la instancia); modo real solo con `--destino instance --confirmar`, con el servidor detenido (puerto `PORT` libre y sin `<instance>/servidor.lock` de un pid vivo, que escribe `src/instrumentation-node.ts` al arrancar), respaldo previo automatico y entrada `restaurar_respaldo` (actor sistema) sellada con `audit-chain.mjs`. Antes de copiar, la verificacion 1 exige `base.ruta = datos/ficotox.sqlite3` y que cada archivo sea `archivos/<carpeta respaldada>/…` sin `..` ni rutas absolutas y que origen y destino queden dentro del respaldo y de la carpeta de preparacion; la 4 comprueba ademas el sello del manifest (quien altere la base o los archivos y recalcule las huellas no puede recalcular el sello sin la llave; si la llave viaja dentro del respaldo, el sello solo protege frente a quien no la tenga, por eso la llave se guarda aparte) y lo compara con la llave configurada en la instalacion. La 1 rechaza enlaces simbolicos, directorios y manifests malformados sin abortar el acta. En modo real, una `instance/auditoria.key` distinta de la del respaldo exige `--aceptar-llave-del-respaldo`. Un acta cuenta como verificacion de un respaldo solo si guarda su ruta y la huella de su `manifest.json`. Verificaciones 1–8 y acta en `backups/pruebas-restauracion/<fecha>.md|.json`; salida 1 si falla una verificacion y 2 si el uso es incorrecto o se rechaza el modo real. La verificacion de la cadena es `evaluarCadena` de `audit-chain.mjs`, la misma que usa `verifyAuditChain`.
- **Sin pantalla**: Administracion › Respaldos se retiro. `GET|POST /api/respaldos` y `GET /api/respaldos/actas/<nombre>` responden **410** (`pantallaRetirada`, `src/lib/server/retirado.ts`); `/administracion/respaldos` redirige al Inicio. Ya no hay "Crear respaldo ahora", descarga de actas desde la interfaz ni avisos de respaldo en el Inicio y la campana. La logica de respaldo y restauracion no cambio: `npm run respaldar`, `npm run restaurar`, `scripts/backup_ficotox.py`, la tarea programada y `npm run verificar-instalacion`. La alerta de integridad de un acta con la verificacion 1 fallida (`alertasDeRespaldo`, `src/lib/server/modules/respaldos.ts`) se revisa ahora junto con la verificacion de la bitacora (`GET /api/audit/verify`, al abrir Auditoria).
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
5. **Crear el esquema**: `npm run migrar` (Fase 12; antes: arrancar el servidor una vez). El arranque no crea ningun rol. En produccion, los pasos 4 a 6 los hace `npm run instancia-nueva -- --confirmar` (§14.3).
6. **Alta de roles y usuarios**: copiar `scripts/seed-usuarios.example.json` a `scripts/seed-usuarios.local.json` (ignorado por git), escribir las contrasenas (minimo 8 caracteres) y correr, con el servidor detenido:

   ```bash
   npm run seed:roles            # node scripts/seed-roles-usuarios.mjs [--usuarios archivo.json] [--db base.sqlite3]
   ```

   Crea los 10 roles de `scripts/roles-catalogo.json` con su matriz de la Fase 1 (y `roles.clave`), un usuario local por rol y su asignacion en `usuario_roles`, con `hashPassword()` de `src/lib/server/password.ts` (requiere Node 22.18+ o 24). Es idempotente: un rol (por clave o nombre) o usuario (por correo) existente no se duplica; a un rol existente sin permisos del modelo nuevo (p. ej. de la Fase 0) se le carga la matriz; si ya tiene otros permisos se respeta (aviso) salvo con `--actualizar-permisos`; si una persona no tiene vigente su rol del catalogo, se le asigna. Cada cambio queda en la bitacora (actor `sistema`, motivo `--motivo`, por omision "Catálogo de roles Fase 1") sellado con `src/lib/shared/audit-chain.mjs`, **la misma implementacion que usa el servidor**, y al final recalcula la cadena completa. Requiere el esquema de la Fase 1 (arrancar el servidor una vez). Solo SQLite (en MySQL, ver abajo).
7. **Comprobar**: iniciar sesion con cada usuario, revisar el menu, abrir Auditoria (la verificacion corre sola y solo avisa si falla) y confirmar la cadena con `npm run verificar-instalacion`.

**MySQL/MariaDB.** El script solo aplica a SQLite y el arranque ya no crea ningun rol, asi que en una instalacion MySQL nueva nadie puede entrar a Administracion hasta crear a mano el primer administrador (despues de `npm run migrar -- --respaldo-hecho`, que crea el esquema):

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
- Todo cambio de esquema es una migracion nueva (§10.2), con SQL para SQLite y MySQL; nunca DDL dentro de un handler.
- No construir SQL con datos de usuario; usar parametros `:nombre`.
- Usar los componentes de `src/components/ui/` y los tokens de `globals.css` en lugar de estilos sueltos; no usar `window.confirm` ni `alert` (existen `useConfirm` y `toast`).
- Al tocar inventario, verificar movimientos y dashboard; al tocar muestras, revisar recepcion, procesamiento y extraccion.

## 17. Agregar un nuevo modulo

1. Crear `src/lib/server/modules/<modulo>.ts` con sus handlers y una migracion nueva con sus tablas (§10.2).
2. Crear las rutas en `src/app/api/<modulo>/**/route.ts` con `apiRoute(handler)`.
3. Agregar el permiso en `DEFAULT_PERMISSIONS` (`src/lib/server/rbac.ts`).
4. Crear la ruta en `src/app/(app)/<modulo>/page.tsx` envuelta en `RequireModule`, con `useResource` para cargar datos y una hoja lateral en `src/components/features/<modulo>/` para el alta y la edicion.
5. Registrar el destino en `src/lib/client/nav.ts` (`NAV_GROUPS`, barra lateral) y, si aplica, en el catalogo de pantallas y acciones de `src/lib/server/busqueda/catalogo.ts` (busqueda universal).
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
- La Biblioteca (Calidad › Biblioteca) se ve con `documentos:V`; si `FEATURES.documentos` estuviera apagado no apareceria en el menu aunque el rol tenga el permiso.

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
node scripts/set-password.mjs <correo> "<temporal>" --motivo "..."   # emergencia: contraseña temporal auditada (servidor detenido)
npm run respaldar        # Fase 10: respaldo local (base, archivos, manifest y llave aparte)
npm run restaurar -- --respaldo <id> --responsable "..."   # Fase 10: prueba de restauracion con acta
npm run migrar -- --estado   # Fase 12: version de la base y migraciones pendientes (--simular, o sin opciones para aplicar)
npm run configurar           # Fase 12: .env seguro (idempotente)
npm run instancia-nueva -- --confirmar   # Fase 12: instancia de produccion vacia (mueve la anterior)
npm run instalar-servicio    # Fase 12: arranque automatico + firewall (quitar-servicio para retirarlo)
npm run actualizar -- --git  # Fase 12: actualizar con respaldo, build seguro, migracion y verificacion
npm run verificar-instalacion   # Fase 12: ✅/⚠️/❌ y reporte en <instancia>/verificaciones/
npm run prueba-carga -- --segundos 180 --usuarios 10   # Fase 12: prueba de carga (requiere build)
npm run test:mysql           # Fase 12: pruebas contra MySQL/MariaDB (Docker o MYSQL_TEST_URL)
npm run sqlite-a-mysql -- --simular   # Fase 12: paso de SQLite a MySQL
```

Buscar rutas:

```powershell
rg -n "export const (GET|POST|PUT|DELETE)" src/app/api
```

## 20. Riesgos tecnicos conocidos

- Fase 12: el soporte MySQL (migraciones, arranque, `sqlite-a-mysql`) no se probo contra un servidor MySQL en esta fase (no habia Docker); `npm run test:mysql` queda listo. El DDL MySQL de la migracion base se tradujo del de SQLite: no declara las llaves foraneas ni algunos indices secundarios que creaba el codigo anterior en MySQL (una base MySQL anterior con ellos no pasa la linea base por nombres de tablas/columnas/triggers, pero si la integridad referencial depende de ellas, anadirlas en una migracion).
- SQLite es la opcion para el laboratorio (un servidor, ~10 usuarios; medidas en `docs/DECISION_BASE_DE_DATOS.md`); pasar a MySQL/MariaDB si se rebasan los umbrales de ese documento.
- Los secretos por defecto solo deben usarse en desarrollo.
- `better-sqlite3` requiere Node.js LTS con binarios precompilados.
- Fase 3 (limites aceptados de la separacion de funciones):
  - La regla 3 compara nombres escritos ("procesó" / "supervisó"), no cuentas de usuario: dos personas con el mismo nombre o una firma escrita distinta la burlan. Se resolvera cuando la firma quede ligada a la cuenta (asignacion de muestras, Fase 5).
  - Quien tiene `usuarios:G` puede cambiar los permisos de un rol ya asignado sin segundo usuario (queda en la bitacora con motivo y reautenticacion), salvo un rol que el mismo tenga vigente (Fase 3.1). Riesgo aceptado para una fase posterior.
  - Documentos SGC (modulo apagado hasta la Fase 7): enviar a revision cuenta como revisar, y "revisor distinto del aprobador" es mas estricto que el texto de la norma; se revisa junto con el flujo completo de documentos.
- Fase 5: la enmienda de un analisis no vuelve a descontar inventario. La regla 3 solo compara cuentas cuando ambas firmas estan ligadas; los registros con nombres escritos (sin cuenta) se comparan por nombre.
- Fase 11: una incidencia automatica de "equipo no apto" se evalua con el estado y la calibracion del equipo al guardar; si el equipo se corrige despues, la incidencia queda (se cierra sin NC). Suspender lo mismo desde dos NC es valido (cada una lo reanuda por su lado).
- MySQL: cada conexion fija `time_zone = '+00:00'` (`src/lib/server/db.ts`) para que los TIMESTAMP se guarden y lean en UTC, como en SQLite.
