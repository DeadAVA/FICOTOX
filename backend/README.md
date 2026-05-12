# FICOTOX Backend

API Flask para el sistema de gestión de laboratorio FICOTOX. Maneja autenticación, roles, inventario, muestras, movimientos, documentos y trazabilidad.

## Stack

- Python 3.11+
- Flask
- Flask-SQLAlchemy
- SQLite local por defecto
- MySQL/MariaDB opcional vía `DATABASE_URL`
- JWT para sesión de API
- Microsoft Entra ID opcional

## Estructura

```text
backend/
  run.py                         # Punto de arranque local
  requirements.txt               # Dependencias Python
  .env.example                   # Plantilla de variables
  app/
    __init__.py                  # App factory, blueprints y migraciones ligeras
    config.py                    # Configuración desde .env
    extensions.py                # Extensiones compartidas
    modules/
      admin/                     # Usuarios, roles y permisos
      auth/                      # Login local/Microsoft y emisión JWT
      dashboard/                 # Métricas generales
      documents/                 # Documentos y reportes PDF
      inventory/                 # Reactivos, consumibles, equipos, movimientos
      samples/                   # Recepción, procesamiento y extracción
      traceability/              # Consultas de trazabilidad
    utils/
      auth.py                    # Decorador JWT
      inventory_usage.py         # Descuento de inventario + movimientos
      rbac.py                    # Esquema y validación RBAC
      schema.py                  # Helpers de migración SQLite/MySQL
      users.py                   # Esquema de usuarios locales
```

## Configuración

1. Crear entorno virtual:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Crear `.env` desde `.env.example`:

```powershell
Copy-Item .env.example .env
```

3. Ajustar secretos:

```env
SECRET_KEY=...
JWT_SECRET=...
LOCAL_LOGIN_ENABLED=true
MICROSOFT_AUTH_ENABLED=false
```

4. Ejecutar:

```powershell
python run.py
```

La app queda en `http://127.0.0.1:5000`.

## Base de Datos

Por defecto usa SQLite en `backend/instance/ficotox.sqlite3`. El arranque ejecuta funciones `ensure_*_schema()` para crear o completar tablas necesarias.

Pseudocódigo del arranque:

```text
crear Flask app
cargar configuración
inicializar db y CORS
registrar blueprints
en app_context:
  asegurar RBAC
  asegurar usuarios
  asegurar tablas de muestras
  asegurar inventario
  asegurar movimientos
servir frontend estático
```

## Autenticación

Hay dos vías:

- Login local para cuentas dadas de alta en la base.
- Microsoft Entra ID si está configurado.

Pseudocódigo de API protegida:

```text
leer Authorization: Bearer <token>
validar firma y expiración JWT
guardar usuario actual en flask.g
validar permiso RBAC del módulo/acción
ejecutar endpoint
```

## RBAC

Los permisos se modelan por módulo y acción. Ejemplos de módulos:

- `reactivos`
- `consumibles`
- `movimientos`
- `muestras`
- `usuarios`
- `roles`

Regla general: los endpoints deben usar `@token_required` y `@permission_required(modulo, accion)`.

## Inventario

### Reactivos

El backend soporta formulario dinámico y carga Excel. Las categorías soportadas son:

- Ácidos
- Alcoholes y solventes orgánicos
- Compuestos de Amonio
- Compuestos de Sodio
- Estándares preparados
- Materiales de Referencia
- Misceláneos
- Columnas cromatográficas

La importación normaliza hacia una estructura canónica con campos como:

- `codigo_interno`
- `nombre`
- `categoria`
- `marca`
- `proveedor`
- `catalogo`
- `numero_parte`
- `cas`
- `lote`
- `localizacion`
- `caducidad`
- `capacidad`
- `cantidad_total`
- `restante`
- `estado_fisico`
- `observaciones`

Pseudocódigo de importación Excel:

```text
recibir hojas desde frontend
para cada hoja:
  normalizar nombre
  si no es categoría de reactivos:
    marcar ignorada
    continuar
  para cada fila:
    normalizar encabezados
    descartar columnas mensuales de movimientos
    mapear alias a campos canónicos
    validar nombre o identificador
    buscar duplicado por código, catálogo, lote o nombre+lote
    si existe:
      actualizar
    si no:
      insertar
regresar resumen con insertados, actualizados, ignorados y errores
```

### Movimientos

Los descuentos de inventario se registran en `movimientos`. La sección de movimientos separa reactivos y consumibles y muestra conteos por total, hoy, semana y mes.

Pseudocódigo de descuento:

```text
resolver insumo por referencia
validar cantidad positiva
validar referencia única
descontar cantidad
insertar movimiento con tipo='salida'
```

## Endpoints Principales

```text
GET    /api/health
GET    /api/health/db

POST   /api/auth/login
POST   /api/auth/microsoft
GET    /api/auth/config

GET    /api/inventory/reactivos
GET    /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos
PUT    /api/inventory/reactivos/<id>
DELETE /api/inventory/reactivos/<id>
POST   /api/inventory/reactivos/import

GET    /api/inventory/movimientos
GET    /api/consumables
POST   /api/consumables
POST   /api/consumables/import

GET/POST/PUT/DELETE endpoints de samples/*
GET/POST/PUT/DELETE endpoints de admin/*
```

## Calidad y Buenas Prácticas

- No subir `.env` ni bases locales.
- Usar `add_column_if_missing` para migraciones ligeras.
- Evitar SQL construido con datos de usuario; si se requiere SQL dinámico, limitar a columnas internas conocidas.
- En endpoints protegidos usar JWT + RBAC.
- En imports masivos continuar por fila y reportar errores sin abortar toda la carga.
- Mantener pseudocódigo en funciones complejas, no comentarios obvios.
- Al tocar inventario, actualizar también movimientos y dashboard si aplica.

## Verificación

```powershell
python -m compileall app
$env:PYTHONPATH='.'; python - <<'PY'
from app import create_app
app = create_app()
print("ok")
PY
```

## Riesgos Técnicos Conocidos

- El frontend actual es estático y grande; conviene modularizarlo por dominio cuando haya tiempo.
- Las migraciones son ligeras, no Alembic formal. Para producción con MySQL se recomienda migración versionada.
- SQLite es adecuado para desarrollo local; producción debería usar motor transaccional administrado.
