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

## 2. Arquitectura general

El sistema sigue una arquitectura web clasica de 3 capas:

1. Presentacion:
   - Frontend estatico (HTML/CSS/JavaScript) en `frontend/`.
2. Logica de negocio:
   - API REST Flask en `backend/app/`.
3. Persistencia:
   - SQLite por defecto (`backend/instance/ficotox.sqlite3`).
   - MySQL/MariaDB opcional por `DATABASE_URL`.

Flujo basico:

```text
Navegador
  -> Frontend estatico (index.html + app.js)
  -> Llamadas HTTP a /api/*
  -> Blueprints Flask por modulo
  -> SQLAlchemy
  -> SQLite/MySQL
```

## 3. Estructura de carpetas

- `backend/`: servidor Flask y API.
- `frontend/`: interfaz de usuario estatica.
- `docs/`: documentacion tecnica y operativa.
- `scripts/`: utilidades de respaldo y tareas programadas.
- `backups/`: salidas de respaldos de codigo y base.
- `build/`: artefactos de compilacion del ejecutable.
- `instance/`: base SQLite principal en modo desarrollo/local.

## 4. Backend

### 4.1 Punto de arranque

- `backend/run.py`: arranque simple para desarrollo.
- `backend/server_launcher.py`: arranque tipo servidor (Waitress).
- `backend/server_launcher_flask.py`: launcher Flask (incluyendo flujo para binario).

### 4.2 App factory

`backend/app/__init__.py`:
- Crea la app Flask.
- Carga configuracion de `app.config.Config`.
- Inicializa extensiones (`db`, `cors`).
- Registra blueprints.
- Ejecuta funciones `ensure_*_schema()` para completar esquema.
- Expone endpoints de salud (`/api/health`, `/api/health/db`).
- Sirve frontend estatico.

### 4.3 Configuracion

`backend/app/config.py`:
- Lee `.env` y variables de entorno.
- Construye `SQLALCHEMY_DATABASE_URI`.
- Usa SQLite local por defecto si no hay `DATABASE_URL`.

Variables importantes:
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

### 4.4 Modulos API

Cada modulo esta en `backend/app/modules/<modulo>/`.

- `auth`: login local, login Microsoft, JWT, usuario actual.
- `admin`: usuarios, roles y permisos.
- `dashboard`: metricas y resumenes.
- `inventory`: reactivos, consumibles, equipos, mantenimientos, movimientos.
- `samples`: recepcion, procesamiento y extraccion de muestras.
- `documents`: documentos y reportes.
- `traceability`: consultas de trazabilidad y eventos recientes.

### 4.5 Utilidades backend

- `backend/app/utils/auth.py`: decorador `token_required`.
- `backend/app/utils/rbac.py`: permisos por modulo/accion y validacion.
- `backend/app/utils/schema.py`: helpers de migracion ligera.
- `backend/app/utils/inventory_usage.py`: descuento de inventario y registro de movimientos.
- `backend/app/utils/users.py`: esquema de usuarios locales.

## 5. Frontend

Frontend sin build, servido por Flask:
- `frontend/index.html`: layout, secciones y modales.
- `frontend/styles.css`: estilos.
- `frontend/app.js`: logica de UI, estado, clientes API, eventos y render.

Secciones principales:
- Dashboard
- Reactivos
- Consumibles
- Equipos
- Muestras
- Movimientos
- Mantenimiento
- Documentos
- Roles
- Usuarios

Helpers de consumo API (con token):
- `getJsonAuth`
- `sendJsonAuth`
- `sendFormAuth`

## 6. Base de datos

### 6.1 Motor

Por defecto SQLite:
- Archivo principal: `backend/instance/ficotox.sqlite3`.

Opcional MySQL/MariaDB:
- Definido por `DATABASE_URL`.

### 6.2 Inicializacion de esquema

No usa migraciones versionadas tipo Alembic como flujo principal.
Se usan funciones `ensure_*_schema()` al arrancar para:
- Crear tablas faltantes.
- Agregar columnas/indices cuando aplica.
- Mantener compatibilidad en instalaciones existentes.

## 7. Seguridad y control de acceso

### 7.1 Autenticacion

- JWT para endpoints protegidos.
- Login local por correo/usuario segun configuracion.
- Login Microsoft Entra ID opcional (validacion de tenant, audience y dominio).

### 7.2 Autorizacion

RBAC por modulo y accion:
- Acciones tipicas: `read`, `create`, `update`, `delete`.
- Decoradores esperados en endpoints sensibles:
  - `@token_required`
  - `@permission_required("modulo", "accion")`

## 8. Inventario y muestras (flujo operativo)

### 8.1 Inventario

Incluye:
- Reactivos
- Consumibles
- Equipos
- Mantenimientos
- Movimientos

Soporta importacion masiva por Excel para reactivos/consumibles.

### 8.2 Muestras

Fases:
- Recepcion
- Procesamiento
- Extraccion

Al guardar procesamiento/extraccion, el backend puede:
- Descontar insumos en inventario.
- Registrar movimientos de salida.

## 9. Documentos y trazabilidad

- `documents`: resumen documental y reportes.
- `traceability`: flujo y eventos recientes para auditoria operativa.

## 10. Respaldo y recuperacion

Scripts relevantes en `scripts/`:
- `backup_ficotox.py`
- `backup-ficotox.cmd`
- `install-ficotox-backup-tasks.cmd`

Capacidades:
- Respaldo de base (SQLite o MySQL segun configuracion).
- Respaldo de codigo (excluyendo secretos y basura temporal).
- Copia a OneDrive local, rclone, o Microsoft Graph.

Documentacion operativa:
- `docs/backups.md`

## 11. Empaquetado ejecutable

- Especificacion: `ficotox-server.spec`.
- Entrypoint empaquetado: `backend/server_launcher_flask.py`.
- Artefactos de build: `build/ficotox-server/`.

Objetivo:
- Ejecutar backend + frontend en modo portable.
- Mantener compatibilidad de ruta de base de datos entre entorno local y ejecutable.

## 12. Salud, monitoreo y soporte

Endpoints de verificacion:
- `/api/health`
- `/api/health/db`

Uso recomendado:
- Verificar si el servicio responde.
- Detectar rapidamente problemas de conexion a base de datos.

## 13. Riesgos tecnicos actuales

- `frontend/app.js` concentra mucha logica (archivo grande).
- Migracion de esquema ligera sin versionado formal centralizado.
- SQLite es ideal para local, no para cargas concurrentes altas.

## 14. Recomendaciones de evolucion

1. Modularizar frontend por dominios (`api`, `auth`, `inventory`, `samples`, etc.).
2. Definir estrategia de migraciones versionadas para ambientes productivos.
3. Estandarizar empaquetado/release con checklist de validacion.
4. Agregar pruebas automatizadas minimas por modulo critico.

## 15. Guia rapida de arranque

### Desarrollo

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Abrir:
- `http://127.0.0.1:5000`

### Operacion de respaldo manual

```powershell
.\scripts\backup-ficotox.cmd --target all
```

---

Este documento resume todo el proyecto de forma integral (arquitectura, modulos, datos, seguridad, operacion y mantenimiento).
