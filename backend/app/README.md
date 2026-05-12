# Paquete `app`

Este directorio contiene la aplicación Flask de FICOTOX. La regla principal es mantener cada módulo con responsabilidades claras y proteger todos los endpoints de negocio con autenticación y permisos.

## Convenciones de Calidad

## 1. App Factory

`create_app()` en `app/__init__.py` debe:

- Crear la app.
- Cargar configuración.
- Inicializar extensiones.
- Registrar blueprints.
- Asegurar esquemas mínimos.
- Exponer health checks.

Pseudocódigo:

```text
create_app:
  app = Flask()
  cargar Config
  init db/cors
  importar blueprints dentro de la función
  registrar rutas API
  intentar asegurar esquemas
    si falla:
      rollback
      registrar excepción
  registrar health checks
  servir frontend
  return app
```

## 2. Endpoints

Cada endpoint de negocio debe cumplir:

```python
@token_required
@permission_required("modulo", "accion")
def endpoint():
    ensure_schema()
    ...
```

Buenas prácticas:

- Validar payload antes de guardar.
- No confiar en datos del frontend.
- Retornar errores JSON con status HTTP correcto.
- No abortar importaciones completas por una sola fila inválida.
- Usar transacciones y `db.session.rollback()` cuando aplique.

## 3. SQL

Reglas:

- Usar parámetros `:param` para valores.
- No construir SQL con input del usuario.
- Si se necesita SQL dinámico para columnas/tablas, usar listas internas o validadores.
- Para migraciones ligeras usar `app.utils.schema`.

Pseudocódigo de migración ligera:

```text
si tabla no existe:
  crear tabla base
para cada columna esperada:
  si falta:
    ALTER TABLE ADD COLUMN
commit
```

## 4. Autenticación

`app/utils/auth.py` centraliza JWT.

Pseudocódigo:

```text
token_required:
  leer Authorization
  validar Bearer
  decodificar JWT
  si expiro:
    401
  si invalido:
    401
  guardar usuario en g.current_user
```

## 5. RBAC

`app/utils/rbac.py` define permisos por módulo. Cada operación debe declarar acción:

- `read`
- `create`
- `update`
- `delete`

## 6. Inventario y Movimientos

`app/utils/inventory_usage.py` es la única capa que debe descontar inventario y registrar movimientos.

Pseudocódigo:

```text
consume_reactivo / consume_consumible:
  resolver insumo por id/código/nombre
  validar cantidad positiva
  validar referencia única
  descontar inventario
  insertar movimiento
```

## 7. Importaciones

Las importaciones deben:

- Normalizar encabezados.
- Ignorar columnas no relevantes.
- Validar cada fila.
- Continuar aunque una fila falle.
- Regresar resumen y errores por fila.

## 8. Documentación en Código

Comentarios aceptados:

- Pseudocódigo en flujos complejos.
- Razones de diseño.
- Decisiones de compatibilidad SQLite/MySQL.

Comentarios a evitar:

- Repetir lo obvio.
- Explicar una asignación simple.
- Ocultar deuda técnica sin issue o nota clara.

## 9. Verificación

Desde la raíz:

```powershell
python -m compileall backend\app
$env:PYTHONPATH='backend'; python - <<'PY'
from app import create_app
app = create_app()
print("ok")
PY
```

## Deuda Técnica Priorizada

1. Separar `inventory/endpoints.py` en archivos por dominio: reactivos, equipos, mantenimiento, movimientos.
2. Reemplazar migraciones ligeras por Alembic/Flask-Migrate versionado.
3. Agregar pruebas unitarias para normalización de importación Excel y descuentos de inventario.
4. Agregar logging estructurado para auditoría de cambios sensibles.
