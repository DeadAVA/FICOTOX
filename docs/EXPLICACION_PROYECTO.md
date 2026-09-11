# FICOTOX - Explicacion completa del proyecto

## 1. Resumen ejecutivo

FICOTOX es una aplicacion web para gestion operativa de laboratorio.

Incluye:
- Gestion de usuarios, roles y permisos.
- Autenticacion local y autenticacion Microsoft Entra ID (opcional).
- Gestion de inventario (reactivos, consumibles, equipos, mantenimientos).
- Gestion de muestras (recepcion, procesamiento, extraccion).
- Registro de movimientos y trazabilidad.
- Generacion y consulta de documentos.
- Respaldo local y sincronizacion con OneDrive/Graph.

En septiembre de 2026 el sistema se migro de Flask + frontend estatico a una sola aplicacion Next.js, conservando la misma funcionalidad, la misma API REST y la misma apariencia. El detalle de esa migracion esta en `docs/MIGRACION_NEXTJS.md`.

## 2. Arquitectura general

Una sola aplicacion Next.js (App Router) cubre las tres capas:

1. Presentacion:
   - Interfaz React en `src/components/` (misma estructura HTML y CSS que la interfaz original).
2. Logica de negocio:
   - Route handlers REST en `src/app/api/**/route.ts` que delegan en `src/lib/server/modules/`.
3. Persistencia:
   - SQLite por defecto (`instance/ficotox.sqlite3`).
   - MySQL/MariaDB opcional por `DATABASE_URL`.

Flujo basico:

```text
Navegador
  -> Interfaz React (src/components)
  -> Llamadas HTTP a /api/*
  -> Route handlers por modulo (src/app/api)
  -> Modulos de negocio (src/lib/server/modules)
  -> Capa de datos con SQL parametrizado (src/lib/server/db.ts)
  -> SQLite/MySQL
```

## 3. Estructura de carpetas

- `src/app/`: layout, pagina raiz, estilos globales y route handlers `/api/*`.
- `src/components/`: interfaz (arranque, login, shell, paginas, modales, piezas reutilizables).
- `src/lib/client/`: cliente API, sesion, formato, constantes, importaciones e insumos.
- `src/lib/server/`: configuracion, base de datos, JWT, RBAC, esquema y modulos de negocio.
- `public/`: favicon y SheetJS vendorizado.
- `scripts/`: lanzador standalone, respaldo y tareas programadas.
- `docs/`: documentacion tecnica y operativa.
- `instance/`: base SQLite y reportes PDF generados (se crea al usar el sistema).
- `backups/`: salidas de respaldos de codigo y base.

## 4. Servidor (API)

### 4.1 Punto de arranque

- `npm run dev`: servidor de desarrollo Next.js.
- `npm run build` + `npm run start:standalone`: build de produccion y lanzador `scripts/start-ficotox.mjs` (puerto, host, IP LAN y apertura del navegador).

### 4.2 Ciclo de un request

`src/lib/server/http.ts` (`apiRoute`):
- Abre una sesion de base de datos por request (`withSession`).
- Ejecuta el handler del modulo.
- Hace `commit()` al terminar o `rollback()` si hay error.
- Convierte `HttpError` en la respuesta JSON con el mismo codigo y mensaje que el backend anterior; cualquier otro error responde 500 con `{"message": "Error interno del servidor"}`.

`src/proxy.ts` agrega los encabezados CORS a `/api/*` segun `CORS_ORIGINS` (equivale a Flask-CORS). Las URLs con barra final (`/api/consumables/`) se reescriben en `next.config.ts` para seguir siendo validas.

### 4.3 Configuracion

`src/lib/server/config.ts`:
- Lee `.env` y variables de entorno.
- Resuelve la ruta SQLite o `DATABASE_URL`.
- Usa SQLite local por defecto si no hay `DATABASE_URL`.

Variables importantes (mismos nombres que antes):
- `SECRET_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_HOURS`
- `DATABASE_URL`
- `SQLITE_PATH`
- `LOCAL_LOGIN_ENABLED`
- `MICROSOFT_AUTH_ENABLED`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_ALLOWED_DOMAIN`
- `CORS_ORIGINS`
- `HOST`, `PORT`, `FICOTOX_OPEN_BROWSER` (lanzador standalone)

### 4.4 Modulos API

Cada modulo esta en `src/lib/server/modules/` y sus rutas en `src/app/api/<modulo>/`.

- `auth`: login local, login Microsoft, JWT, usuario actual.
- `admin`: usuarios, roles y permisos.
- `dashboard`: metricas y resumenes.
- `inventory`: reactivos, equipos, mantenimientos, movimientos y resumen de inventario.
- `consumables`: consumibles e importacion.
- `samples/`: recepcion (con aceptacion y disposicion final), procesamiento, extraccion y analisis de muestras; anulacion con motivo en lugar de borrado.
- `informes`: informes de resultados (borrador -> revision -> autorizacion -> entrega, enmiendas por version) con PDF generado por el servidor.
- `documentos-sgc`: control de documentos del SGC (revisiones, lista maestra, obsoletos).
- `audit`: bitacora de auditoria de solo lectura con cadena de hashes.
- `documents`: reportes de mantenimiento en PDF.
- `traceability`: consultas de trazabilidad y eventos recientes.
- `health`: `/api/health` y `/api/health/db`.

### 4.5 Utilidades de servidor

- `src/lib/server/auth.ts`: emision y validacion de JWT (`requireUser`).
- `src/lib/server/rbac.ts`: permisos por modulo/accion y validacion (`requirePermission`).
- `src/lib/server/schema.ts`: helpers de migracion ligera.
- `src/lib/server/inventory-usage.ts`: descuento de inventario y registro de movimientos.
- `src/lib/server/inventory-baja.ts`: baja logica y reactivacion de items de inventario.
- `src/lib/server/samples-flow.ts`: reglas de estado, anulacion y restauracion de los registros de muestras.
- `src/lib/server/audit.ts`: registro de auditoria (diff, snapshots, hash encadenado) y verificacion.
- `src/lib/server/informe-pdf.ts`: render del informe de resultados con `pdfkit`.
- `src/lib/shared/sgc.ts`: catalogos oficiales, estados y etiquetas compartidos entre servidor y cliente.
- `src/lib/server/users.ts`: esquema de usuarios locales.
- `src/lib/server/db.ts`: sesiones SQLite (`better-sqlite3`) y MySQL (`mysql2`) con parametros `:nombre`.

## 5. Interfaz

Interfaz React con TypeScript y Tailwind CSS en `src/components/` y `src/app/(app)/` (ver `docs/DISENO_UI.md`):
- `app/login/page.tsx`: acceso con correo y contrasena (Microsoft opcional).
- `app/(app)/layout.tsx`: guardia de sesion y shell con navegacion superior.
- `components/shell/`: barra lateral por grupos, menu de usuario, panel movil, buscador del Inicio y paleta de comandos (⌘K / Ctrl+K), ambos sobre el mismo motor de busqueda.
- `components/session/`: sesion, permisos (`can(modulo, accion)`) y `RequireModule`.
- `components/ui/`: sistema de diseño (botones, campos, tablas, hojas laterales, dialogos, badges, estados vacios y de carga).
- `components/features/`: pantallas por dominio; los catalogos se editan en hojas laterales y los formatos de muestra son paginas completas con indice de secciones.

Rutas principales:
- `/` Inicio
- `/muestras/recepcion`, `/muestras/procesamiento`, `/muestras/extraccion` (y `nueva` / `[id]` para cada formato)
- `/inventario/reactivos`, `/inventario/consumibles`, `/inventario/equipos`, `/inventario/mantenimiento`
- `/movimientos`
- `/documentos`
- `/administracion/usuarios`, `/administracion/roles`

Helpers de consumo API (con token) en `src/lib/client/api.ts`:
- `getJsonAuth`
- `sendJsonAuth`
- `sendFormAuth`

## 6. Base de datos

### 6.1 Motor

Por defecto SQLite:
- Archivo principal: `instance/ficotox.sqlite3`.

Opcional MySQL/MariaDB:
- Definido por `DATABASE_URL`.

### 6.2 Inicializacion de esquema

No usa migraciones versionadas como flujo principal.
Se usan funciones `ensure*Schema()` en cada request para:
- Crear tablas faltantes.
- Agregar columnas/indices cuando aplica.
- Mantener compatibilidad en instalaciones existentes.

## 7. Seguridad y control de acceso

### 7.1 Autenticacion

- JWT (HS256) para endpoints protegidos; mismos claims y secreto que antes, por lo que los tokens existentes siguen siendo validos.
- Login local por correo y contrasena (scrypt) segun configuracion.
- Login Microsoft Entra ID opcional (validacion de tenant, audience y dominio con las claves JWKS de Microsoft).

### 7.2 Autorizacion

RBAC por modulo y accion:
- Acciones tipicas: `read`, `create`, `update`, `delete`.
- Validacion en cada endpoint:
  - `await requireUser(request)`
  - `await requirePermission(s, user, "modulo", "accion")`

## 8. Inventario y muestras (flujo operativo)

### 8.1 Inventario

Incluye:
- Reactivos
- Consumibles
- Equipos
- Mantenimientos
- Movimientos

Soporta importacion masiva por Excel/CSV para reactivos y consumibles.

### 8.2 Muestras

Fases:
- Recepcion: catalogos del formato FX-TCF-GMR, inspeccion visual de 7 requisitos, decision de aceptacion (aceptada / con desviacion / rechazada) con comunicacion al cliente, y disposicion final que cierra la muestra.
- Procesamiento (solo de recepciones aceptadas).
- Extraccion: dos formatos, ASP (`E-A`, FX-TCF-GME-A) y DSP (`E-D`, FX-TCF-GME-D), cada uno con su serie de folios. PSP, pigmentos y sedimentos quedan pendientes de recibir sus formatos aprobados.
- Analisis (folio `A`): resultados por muestra con limites y conformidad, controles de calidad, revision y aprobacion por personas distintas.
- Informe de resultados (folio `IR`, versionado): se autoriza solo con analisis aprobados, congela resultados, genera PDF y registra la entrega; las correcciones son enmiendas.

Estados de la recepcion: `registrada -> aceptada -> en_proceso -> analizada -> informada -> cerrada` (o `rechazada` / `anulada`). Ningun registro se borra: se anula con motivo y puede restaurarse; todo queda en la bitacora de auditoria.

Al guardar procesamiento/extraccion, el servidor puede:
- Descontar insumos en inventario (en extraccion, multiplicados por el numero de tubos: muestras, replicas y blanco).
- Registrar movimientos de salida.
- Guardar los equipos utilizados con su clave y folio de bitacora (`equipos_json`). Si un equipo no esta apto segun el catalogo, la interfaz avisa y pide confirmacion.

## 9. Documentos, auditoria y trazabilidad

- `documentos-sgc`: documentos controlados del SGC con clave `FX-<area><tipo>-<siglas>`, revisiones, aprobacion, lista maestra y obsolescencia (ISO/IEC 17025 8.3).
- `audit`: bitacora inmutable (`auditoria`) con usuario, accion, entidad, motivo, valores anteriores y nuevos y hash encadenado; triggers impiden `UPDATE`/`DELETE`; `/api/audit/verify` comprueba la cadena.
- `documents`: reportes de mantenimiento en PDF y descarga de archivos.
- `traceability`: flujo y eventos recientes para auditoria operativa.

## 10. Respaldo y recuperacion

Scripts relevantes en `scripts/`:
- `backup_ficotox.py`
- `backup-ficotox.cmd`
- `install-ficotox-backup-tasks.cmd`

Capacidades:
- Respaldo de base (SQLite o MySQL segun configuracion).
- Respaldo de codigo (excluyendo secretos, `node_modules`, `.next` y basura temporal).
- Copia a OneDrive local, rclone, o Microsoft Graph.

Documentacion operativa:
- `docs/backups.md`

## 11. Distribucion

- `npm run build` genera un build `standalone` de Next.js en `.next/standalone/`.
- `npm run start:standalone` (o `node scripts/start-ficotox.mjs`) lo arranca con la configuracion de `.env`.
- Solo se necesita Node.js LTS en la maquina destino.

## 12. Salud, monitoreo y soporte

Endpoints de verificacion:
- `/api/health`
- `/api/health/db`

Uso recomendado:
- Verificar si el servicio responde.
- Detectar rapidamente problemas de conexion a base de datos.

## 13. Riesgos tecnicos actuales

- Migracion de esquema ligera sin versionado formal centralizado.
- SQLite es ideal para local, no para cargas concurrentes altas.
- `better-sqlite3` es un modulo nativo y requiere Node.js LTS (22.13+ o 24).

## 14. Recomendaciones de evolucion

1. Convertir cada seccion en una ruta propia de Next.js (hoy toda la interfaz vive en `/`).
2. Definir estrategia de migraciones versionadas para ambientes productivos.
3. Estandarizar empaquetado/release con checklist de validacion.
4. Ampliar las pruebas automatizadas (`npm test`, ver `docs/VALIDACION.md`) a mas casos limite.
5. Confirmar con la coordinacion tecnica los limites regulatorios precargados (marcados "por confirmar") y las claves de los formatos de analisis e informe.

## 15. Guia rapida de arranque

### Desarrollo

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Abrir:
- `http://localhost:3000`

### Produccion

```powershell
npm run build
npm run start:standalone
```

Abrir:
- `http://127.0.0.1:5000` (o el `PORT` configurado)

### Operacion de respaldo manual

```powershell
.\scripts\backup-ficotox.cmd --target all
```

---

Este documento resume todo el proyecto de forma integral (arquitectura, modulos, datos, seguridad, operacion y mantenimiento).
