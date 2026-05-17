# Manual Tecnico - FICOTOX

## 1. Proposito

Este documento describe la arquitectura, instalacion, configuracion, operacion tecnica y mantenimiento del sistema FICOTOX.

FICOTOX es una aplicacion web para gestion de laboratorio. Esta compuesta por:

- Backend Flask con API REST.
- Frontend estatico HTML, CSS y JavaScript.
- Base de datos SQLite por defecto, con soporte opcional para MySQL/MariaDB.
- Autenticacion local por correo y autenticacion Microsoft Entra ID opcional.
- Control de acceso por roles y permisos.

## 2. Estructura del proyecto

```text
ficotox/
  MANUAL_USUARIO.md
  MANUAL_TECNICO.md
  frontend/
    index.html
    styles.css
    app.js
    README.md
  backend/
    run.py
    requirements.txt
    README.md
    app/
      __init__.py
      config.py
      extensions.py
      modules/
        admin/
        auth/
        dashboard/
        documents/
        inventory/
        samples/
        traceability/
      utils/
        auth.py
        inventory_usage.py
        rbac.py
        schema.py
        users.py
```

## 3. Stack tecnologico

### Backend

- Python 3.11 o superior.
- Flask 3.
- Flask-SQLAlchemy.
- SQLAlchemy.
- Flask-Cors.
- PyJWT.
- PyMySQL para MySQL/MariaDB.
- python-dotenv para variables de entorno.
- requests para validaciones externas.

### Frontend

- HTML5.
- CSS3.
- JavaScript vanilla.
- Bootstrap 5.
- Bootstrap Icons.
- SheetJS para lectura de archivos Excel en navegador.
- MSAL Browser para login Microsoft.

### Base de datos

- SQLite local por defecto.
- MySQL/MariaDB mediante `DATABASE_URL`.

## 4. Arquitectura general

La aplicacion se inicia desde `backend/run.py`, que crea la instancia Flask usando `create_app()` en `backend/app/__init__.py`.

Durante el arranque:

1. Se carga la configuracion desde variables de entorno.
2. Se inicializan SQLAlchemy y CORS.
3. Se registran los blueprints de cada modulo.
4. Se ejecutan funciones `ensure_*_schema()` para crear o completar tablas.
5. Se sirve el frontend estatico desde la carpeta `frontend`.

Flujo general:

```text
Navegador
  -> frontend/index.html + frontend/app.js
  -> API REST /api/*
  -> Flask blueprints
  -> SQLAlchemy
  -> SQLite o MySQL/MariaDB
```

## 5. Instalacion local

### 5.1 Crear entorno virtual

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 5.2 Instalar dependencias

```powershell
pip install -r requirements.txt
```

### 5.3 Crear archivo de configuracion

Si existe `.env.example`, copielo como `.env`:

```powershell
Copy-Item .env.example .env
```

Si no existe, cree `backend/.env` con las variables necesarias.

### 5.4 Ejecutar

```powershell
python run.py
```

La aplicacion queda disponible en:

```text
http://127.0.0.1:5000
```

## 6. Variables de entorno

El archivo `backend/app/config.py` lee variables desde `backend/.env`.

| Variable | Descripcion | Valor por defecto |
| --- | --- | --- |
| `SECRET_KEY` | Secreto Flask | `ficotox-dev-secret` |
| `JWT_SECRET` | Secreto para firmar JWT | `ficotox-jwt-secret` |
| `JWT_EXPIRES_HOURS` | Duracion del token en horas | `12` |
| `DATABASE_URL` | URL SQLAlchemy para base externa | No definida |
| `SQLITE_PATH` | Ruta de SQLite local | `backend/instance/ficotox.sqlite3` |
| `LOCAL_LOGIN_ENABLED` | Activa login local por correo | `true` |
| `MICROSOFT_AUTH_ENABLED` | Activa login Microsoft si hay client/tenant | `true` |
| `MICROSOFT_CLIENT_ID` | Client ID de Microsoft Entra ID | Vacio |
| `MICROSOFT_TENANT_ID` | Tenant ID de Microsoft Entra ID | Vacio |
| `MICROSOFT_ALLOWED_DOMAIN` | Dominio permitido para Microsoft | `cicese.mx` |
| `CORS_ORIGINS` | Origenes permitidos por CORS | `*` |

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
DATABASE_URL=mysql+pymysql://usuario:password@localhost:3306/ficotox
SECRET_KEY=change-me
JWT_SECRET=change-me-too
LOCAL_LOGIN_ENABLED=true
MICROSOFT_AUTH_ENABLED=false
```

## 7. Modulos del backend

### 7.1 `auth`

Ubicacion:

```text
backend/app/modules/auth/endpoints.py
backend/app/utils/auth.py
```

Responsabilidades:

- Exponer configuracion de autenticacion.
- Login local por correo.
- Login Microsoft Entra ID.
- Emision de JWT.
- Endpoint de usuario actual.

Endpoints:

```text
GET  /api/auth/config
POST /api/auth/login
POST /api/auth/microsoft
GET  /api/auth/me
```

### 7.2 `admin`

Ubicacion:

```text
backend/app/modules/admin/endpoints.py
```

Responsabilidades:

- Administracion de roles.
- Administracion de permisos.
- Administracion de usuarios.

Endpoints principales:

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

Ubicacion:

```text
backend/app/modules/dashboard/endpoints.py
```

Endpoint:

```text
GET /api/dashboard/overview
```

Entrega metricas generales para el panel principal.

### 7.4 `inventory`

Ubicacion:

```text
backend/app/modules/inventory/endpoints.py
backend/app/modules/inventory/consumables.py
backend/app/utils/inventory_usage.py
```

Responsabilidades:

- Reactivos.
- Consumibles.
- Equipos.
- Mantenimientos.
- Movimientos de inventario.
- Importacion de reactivos y consumibles.
- Descuento de inventario usado en muestras.

Endpoints principales:

```text
GET    /api/inventory/summary
GET    /api/inventory/reactivos
GET    /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos
PUT    /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos/import
DELETE /api/inventory/reactivos/<id>

GET    /api/inventory/equipos
GET    /api/inventory/equipos/<id>
POST   /api/inventory/equipos
PUT    /api/inventory/equipos/<id>
DELETE /api/inventory/equipos/<id>

GET    /api/inventory/movimientos
GET    /api/inventory/mantenimientos
GET    /api/inventory/mantenimientos/<id>
POST   /api/inventory/mantenimientos
PUT    /api/inventory/mantenimientos/<id>
DELETE /api/inventory/mantenimientos/<id>

GET    /api/consumables
POST   /api/consumables
POST   /api/consumables/import
```

### 7.5 `samples`

Ubicacion:

```text
backend/app/modules/samples/endpoints.py
backend/app/modules/samples/recepcion.py
backend/app/modules/samples/procesamiento.py
backend/app/modules/samples/extraccion.py
```

Responsabilidades:

- Resumen de muestras.
- Recepcion.
- Procesamiento.
- Extraccion.
- Descuento de insumos usados en procesamiento y extraccion.

Endpoints:

```text
GET /api/samples/summary
GET /api/samples/
GET /api/samples/pending

GET    /api/samples/reception/next-folio
GET    /api/samples/reception/
GET    /api/samples/reception/<id>
POST   /api/samples/reception/
PUT    /api/samples/reception/<id>
DELETE /api/samples/reception/<id>

GET    /api/samples/processing/next-folio
GET    /api/samples/processing/
GET    /api/samples/processing/<id>
POST   /api/samples/processing/
PUT    /api/samples/processing/<id>
DELETE /api/samples/processing/<id>

GET    /api/samples/extraction/next-folio
GET    /api/samples/extraction/
GET    /api/samples/extraction/<id>
POST   /api/samples/extraction/
PUT    /api/samples/extraction/<id>
DELETE /api/samples/extraction/<id>
```

### 7.6 `documents`

Ubicacion:

```text
backend/app/modules/documents/endpoints.py
```

Responsabilidades:

- Resumen documental.
- Documentos del SGC.
- Reportes de mantenimiento.
- Archivos generados.

Endpoints:

```text
GET  /api/documents/summary
GET  /api/documents/
POST /api/documents/maintenance-report
GET  /api/documents/files/<filename>
```

### 7.7 `traceability`

Ubicacion:

```text
backend/app/modules/traceability/endpoints.py
```

Endpoints:

```text
GET /api/traceability/flow
GET /api/traceability/recent-events
```

## 8. Frontend

El frontend se sirve directamente desde Flask, sin proceso de build.

Archivos:

```text
frontend/index.html
frontend/styles.css
frontend/app.js
```

Responsabilidades:

- Renderizado de pantallas.
- Estado de sesion en navegador.
- Navegacion por permisos RBAC.
- Formularios y modales.
- Lectura de Excel con SheetJS.
- Login Microsoft con MSAL.
- Consumo de API mediante helpers con token.

Helpers importantes en `app.js`:

- `getJsonAuth`
- `sendJsonAuth`
- `sendFormAuth`
- `setSession`
- `clearSession`
- `applyNavigationPermissions`
- `setActivePage`

El frontend debe mantenerse sincronizado con IDs de `index.html`. Si se elimina o cambia un `id`, revisar sus referencias en `app.js`.

## 9. Seguridad y autenticacion

### 9.1 JWT

Los tokens se emiten en login y se firman con `JWT_SECRET` usando algoritmo HS256.

Los endpoints protegidos usan el decorador:

```python
@token_required
```

Este decorador:

1. Lee el header `Authorization`.
2. Valida formato `Bearer <token>`.
3. Decodifica JWT.
4. Maneja expiracion e invalidez.
5. Expone el usuario actual en `flask.g.current_user`.

### 9.2 RBAC

El control de permisos esta en:

```text
backend/app/utils/rbac.py
```

Los permisos se definen por modulo:

- `dashboard`
- `reactivos`
- `consumibles`
- `equipos`
- `muestras`
- `movimientos`
- `mantenimiento`
- `documentos`
- `roles`
- `usuarios`

Cada modulo puede tener acciones:

- `read`
- `create`
- `update`
- `delete`

Los endpoints protegidos deben combinar:

```python
@token_required
@permission_required("modulo", "accion")
```

### 9.3 Microsoft Entra ID

El login Microsoft valida:

- Token de identidad.
- Firma usando JWKS.
- `audience` contra `MICROSOFT_CLIENT_ID`.
- `issuer` contra tenant configurado.
- Dominio permitido mediante `MICROSOFT_ALLOWED_DOMAIN`.
- Existencia del usuario en la tabla `usuarios`.

## 10. Base de datos

### 10.1 Tablas principales

El sistema crea o completa tablas mediante funciones `ensure_*_schema()`.

Tablas principales:

- `roles`
- `permisos`
- `rol_permisos`
- `usuarios`
- `reactivos`
- `consumibles`
- `equipos`
- `mantenimientos`
- `movimientos`
- `muestras_recepcion`
- `muestras_procesamiento`
- `muestras_extraccion`
- `reportes_mantenimiento`

### 10.2 Migraciones ligeras

El proyecto no usa Alembic formalmente para migraciones de version. En su lugar usa helpers de esquema y funciones `ensure_*_schema()` durante el arranque.

El archivo:

```text
backend/app/utils/schema.py
```

contiene utilidades para:

- Detectar SQLite.
- Verificar columnas.
- Agregar columnas faltantes.
- Eliminar columnas cuando aplique.
- Escapar identificadores conocidos.

Para produccion, se recomienda incorporar migraciones versionadas antes de cambios mayores de esquema.

## 11. Movimientos e inventario

El descuento de inventario centraliza la logica en:

```text
backend/app/utils/inventory_usage.py
```

Flujo general:

1. Un formulario de procesamiento o extraccion envia `uso_inventario`.
2. El backend resuelve el insumo.
3. Valida cantidad positiva.
4. Valida existencia suficiente cuando aplique.
5. Descuenta inventario.
6. Inserta movimiento tipo salida.

La tabla `movimientos` permite auditar entradas y salidas de reactivos y consumibles.

## 12. Importaciones

### 12.1 Reactivos

El frontend lee archivos Excel con SheetJS y envia las hojas al backend.

El backend:

- Normaliza nombres de hojas.
- Acepta hojas que correspondan a categorias de reactivos.
- Ignora hojas no compatibles.
- Normaliza encabezados.
- Mapea alias a campos canonicos.
- Inserta o actualiza registros.
- Devuelve resumen de insertados, actualizados, ignorados y errores.

### 12.2 Consumibles

El frontend acepta CSV, XLSX y XLS.

Columnas esperadas:

- `producto`
- `marca`
- `proveedor`
- `catalogo_parte_cas`
- `fecha_ingreso`
- `tamano_capacidad`
- `contenedor`
- `piezas`
- `cantidad_por_pieza`

## 13. Verificacion tecnica

### 13.1 Verificar sintaxis Python

```powershell
cd backend
python -m compileall app
```

### 13.2 Verificar creacion de app

```powershell
cd backend
$env:PYTHONPATH='.'
python -c "from app import create_app; app = create_app(); print('ok')"
```

### 13.3 Verificar sintaxis JavaScript

```powershell
node --check frontend\app.js
```

Ejecutar desde la raiz del proyecto.

### 13.4 Verificar salud del servicio

Con el servidor levantado:

```text
GET http://127.0.0.1:5000/api/health
GET http://127.0.0.1:5000/api/health/db
```

Respuestas esperadas:

```json
{"ok": true, "service": "ficotox-backend"}
```

```json
{"ok": true, "database": "reachable"}
```

## 14. Despliegue

### 14.1 Desarrollo local

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

El modo debug esta habilitado en `run.py`.

### 14.2 Produccion recomendada

Para produccion:

- No usar `debug=True`.
- Configurar secretos robustos.
- Usar HTTPS.
- Restringir `CORS_ORIGINS`.
- Usar MySQL/MariaDB administrado o almacenamiento persistente confiable.
- Ejecutar con un servidor WSGI como Waitress, Gunicorn en Linux, u otro servicio equivalente.
- Respaldar base de datos y archivos generados.
- Registrar logs de aplicacion.

Ejemplo conceptual:

```powershell
waitress-serve --host=0.0.0.0 --port=5000 run:app
```

Si se usa Waitress, agregarlo a `requirements.txt`.

## 15. Respaldo y recuperacion

### SQLite

Respaldar:

```text
backend/instance/ficotox.sqlite3
```

Tambien respaldar archivos generados o subidos si existen directorios de documentos fuera de la base.

### MySQL/MariaDB

Usar herramientas propias del motor, por ejemplo:

```powershell
mysqldump -u usuario -p ficotox > ficotox_backup.sql
```

Restaurar:

```powershell
mysql -u usuario -p ficotox < ficotox_backup.sql
```

## 16. Convenciones de desarrollo

- Proteger endpoints con `@token_required`.
- Agregar `@permission_required` en endpoints de negocio.
- Mantener los permisos sincronizados con `DEFAULT_PERMISSIONS`.
- Usar helpers de `schema.py` para cambios ligeros de tablas.
- No construir SQL con datos de usuario sin validar.
- Mantener formularios de `index.html` sincronizados con referencias de `app.js`.
- Usar helpers de API del frontend para requests autenticados.
- Al tocar inventario, verificar movimientos y dashboard.
- Al tocar muestras, revisar recepcion, procesamiento y extraccion.
- Evitar cambios globales en `app.js` sin pruebas, porque concentra gran parte de la logica del frontend.

## 17. Agregar un nuevo modulo

Pasos recomendados:

1. Crear carpeta en `backend/app/modules/<modulo>`.
2. Definir blueprint en `endpoints.py`.
3. Crear funcion `ensure_<modulo>_schema()` si requiere tablas.
4. Registrar el blueprint en `backend/app/__init__.py`.
5. Llamar la funcion de esquema durante el arranque.
6. Agregar permiso en `DEFAULT_PERMISSIONS`.
7. Crear seccion en `frontend/index.html`.
8. Agregar navegacion y carga de datos en `frontend/app.js`.
9. Agregar estilos necesarios en `frontend/styles.css`.
10. Verificar permisos, endpoints y renderizado.

## 18. Solucion de problemas

### El servidor no inicia

Revisar:

- Entorno virtual activo.
- Dependencias instaladas.
- Archivo `.env`.
- Sintaxis Python con `python -m compileall app`.

### `/api/health/db` responde `unreachable`

Revisar:

- `DATABASE_URL`.
- Ruta y permisos de `SQLITE_PATH`.
- Existencia de la carpeta `backend/instance`.
- Credenciales y conectividad si se usa MySQL/MariaDB.

### Login local no funciona

Revisar:

- `LOCAL_LOGIN_ENABLED=true`.
- Usuario existe en `usuarios`.
- Usuario activo.
- Usuario con rol asignado.
- Rol con permisos.

### Login Microsoft no funciona

Revisar:

- `MICROSOFT_AUTH_ENABLED=true`.
- `MICROSOFT_CLIENT_ID`.
- `MICROSOFT_TENANT_ID`.
- Dominio permitido.
- Usuario registrado en FICOTOX.
- Conectividad para validar JWKS de Microsoft.

### Un usuario no ve un modulo

Revisar permisos del rol en la tabla `rol_permisos` o desde la pantalla **Roles**.

### Error al guardar procesamiento o extraccion

Revisar:

- Payload enviado por frontend.
- Existencia de folio requerido.
- Stock suficiente.
- Referencias de insumos validas.
- Permisos `muestras:create` o `muestras:update`.

### Importacion Excel falla

Revisar:

- Extension del archivo.
- Nombres de hojas compatibles.
- Encabezados esperados.
- Filas vacias o incompletas.
- Resumen de errores devuelto por el backend.

## 19. Comandos utiles

Ejecutar backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

Verificar Python:

```powershell
cd backend
python -m compileall app
```

Verificar JavaScript:

```powershell
node --check frontend\app.js
```

Buscar rutas:

```powershell
rg -n "@.*\.(get|post|put|delete)" backend\app
```

Buscar referencias de un elemento de interfaz:

```powershell
rg -n "nombreDelId" frontend
```

## 20. Riesgos tecnicos conocidos

- `frontend/app.js` es grande y concentra muchas responsabilidades.
- Las migraciones son ligeras y no versionadas formalmente.
- SQLite es adecuado para desarrollo, pero produccion deberia usar un motor persistente y respaldado.
- Los secretos por defecto solo deben usarse en desarrollo.
- El frontend depende de CDNs para Bootstrap, Bootstrap Icons, SheetJS y MSAL.

## 21. Recomendaciones de mejora

- Modularizar `frontend/app.js` por dominio.
- Agregar pruebas automatizadas para endpoints criticos.
- Incorporar migraciones versionadas.
- Agregar logging estructurado.
- Agregar exportacion PDF formal del manual de usuario y tecnico.
- Agregar scripts de respaldo y restauracion.
- Documentar diccionario de datos por tabla.
- Agregar ambiente separado de desarrollo, pruebas y produccion.
