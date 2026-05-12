# FICOTOX Frontend

Frontend estático de FICOTOX servido por Flask desde `backend/app/__init__.py`. No requiere build.

## Stack

- HTML
- CSS
- JavaScript vanilla
- Bootstrap 5
- Bootstrap Icons
- SheetJS para leer Excel en navegador
- MSAL Browser para login Microsoft

## Archivos

```text
frontend/
  index.html    # Estructura de pantallas, modales y formularios
  styles.css    # Diseño visual, responsive y componentes
  app.js        # Estado, API client, renderizado, formularios y eventos
```

## Cómo Ejecutar

El frontend se sirve desde el backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

Abrir:

```text
http://127.0.0.1:5000
```

## Estructura de Pantallas

Las secciones principales están en `index.html` como `.content-page`:

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

La navegación se controla desde `app.js` leyendo permisos RBAC.

Pseudocódigo:

```text
leer permisos del usuario
ocultar secciones sin permiso
al hacer click en menú:
  activar página
  cargar datos del módulo
  renderizar tablas y contadores
```

## API Client

`app.js` usa helpers como:

- `getJsonAuth`
- `sendJsonAuth`
- `sendFormAuth`

Pseudocódigo:

```text
leer token desde localStorage
enviar request con Authorization Bearer
parsear JSON
si status no es OK:
  mostrar error de backend
si OK:
  regresar datos
```

## Reactivos

La sección de reactivos tiene:

- Tabla principal.
- Formulario dinámico por categoría.
- Importación Excel.

Categorías:

- Ácidos
- Alcoholes y solventes orgánicos
- Compuestos de Amonio
- Compuestos de Sodio
- Estándares preparados
- Materiales de Referencia
- Misceláneos
- Columnas cromatográficas

Pseudocódigo del formulario dinámico:

```text
usuario selecciona categoría
buscar configuración en REACTIVO_TYPES
limpiar campos actuales
por cada campo requerido:
  leer metadata en REACTIVO_FIELD_META
  crear input/select/textarea
  asignar required, type, min, step según metadata
al guardar:
  construir payload desde .reactivo-field
  validar categoría y nombre principal
  POST o PUT a /api/inventory/reactivos
```

## Importación Excel de Reactivos

El navegador lee el Excel con SheetJS y manda las hojas al backend.

Pseudocódigo:

```text
usuario selecciona .xlsx/.xls
validar extensión
leer workbook
para cada hoja:
  convertir a JSON
  detectar si el nombre corresponde a categoría de reactivos
  mostrar resumen de hojas válidas e ignoradas
al importar:
  enviar hojas al backend
  backend revalida, mapea, inserta/actualiza
  mostrar resumen y errores por fila
```

Hojas ignoradas:

- Consumibles
- Cualquier hoja que no coincida con categoría de reactivos

Columnas ignoradas:

- Columnas mensuales de descuento/subtotal/fecha del descuento.

## Movimientos

La pantalla separa:

- Descuentos de reactivos
- Descuentos de consumibles
- Todos los movimientos

Pseudocódigo:

```text
GET /api/inventory/movimientos
actualizar tarjetas:
  total
  hoy
  semana
  mes
  reactivos
  consumibles
filtrar items por tabla_origen
renderizar tablas separadas
```

## Muestras

Las muestras se dividen en:

- Recepción
- Procesamiento
- Extracción

Los formularios pueden descontar inventario mediante `uso_inventario`.

Pseudocódigo:

```text
guardar procesamiento/extracción
backend descuenta insumos
backend registra movimientos
frontend recarga muestras y movimientos
```

## Diseño

Principios usados:

- Bootstrap Icons para acciones y navegación.
- Formularios responsivos con grid.
- Tablas con estados vacíos claros.
- Modales grandes para flujos complejos.
- Tarjetas de métricas para lectura rápida.

## Buenas Prácticas Para Cambios

- No editar `app.js` con reemplazos globales de `?`; hay optional chaining y ternarios.
- Mantener IDs de `index.html` sincronizados con `document.getElementById` en `app.js`.
- Para nuevas tablas, usar `renderRows`.
- Para endpoints protegidos, usar helpers con token.
- Para formularios dinámicos, agregar metadata en un solo lugar y evitar duplicar HTML.
- Verificar siempre:

```powershell
node --check frontend\app.js
```

## Deuda Técnica Recomendada

El frontend funciona, pero `app.js` es grande. Siguiente refactor sugerido:

```text
frontend/
  js/
    api.js
    auth.js
    navigation.js
    reactivos.js
    consumibles.js
    muestras.js
    movimientos.js
```

Esto reduciría riesgo al tocar módulos específicos.
