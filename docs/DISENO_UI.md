# FICOTOX · Sistema de diseño (rediseño 2026-09)

## Lectura del brief

Rediseño total de un LIMS local para un laboratorio de ficotoxinas marinas (LN-FICOTOX, CICESE). Audiencia: personal técnico del laboratorio, pocas personas, uso diario pero no intensivo. Objetivo: que se sienta como un producto de una startup bien financiada, profesional y elegante, fácil de usar, sin parecer "la típica app de inventario". Se acepta reestructurar la navegación.

Modo: **rediseño con overhaul visual**, preservando funcionalidad, API y datos.

Diales: `DESIGN_VARIANCE 6 · MOTION_INTENSITY 5 · VISUAL_DENSITY 5`. Es una herramienta de trabajo con tablas y formularios largos: el motion sirve para explicar cambios de estado, no para decorar.

## Concepto

El laboratorio analiza floraciones algales nocivas: el mar, el plancton y las toxinas son el material del producto. El sistema toma el color del agua profunda del Pacífico frente a Ensenada (petróleo) y usa el "bloom" (coral) solo para lo que requiere atención. El único momento visual de gran escala es el panel del login, con un bloom animado lento; el resto de la aplicación es sereno, claro y denso donde hace falta.

## Tokens

### Color (modo claro)

| Token | Valor | Uso |
| --- | --- | --- |
| `canvas` | `#F3F6F8` | fondo de la aplicación |
| `surface` | `#FFFFFF` | tarjetas, tablas, paneles |
| `surface-2` | `#EBF0F3` | fondos secundarios, cabeceras de tabla, chips |
| `line` | `#DCE4EA` | bordes y divisores |
| `line-strong` | `#C3CFD8` | bordes de inputs enfocados en reposo, separadores fuertes |
| `ink` | `#0B1F2A` | texto principal (tinta de mar profundo) |
| `ink-2` | `#3A5060` | texto secundario |
| `ink-3` | `#6B8090` | texto terciario, placeholders |
| `brand` | `#0E7C82` | acción principal, enlaces, estado activo |
| `brand-strong` | `#0A5F66` | hover de acción principal |
| `brand-soft` | `#DDF1F2` | fondos de énfasis suave |
| `bloom` | `#E0684B` | alertas de stock, toxinas, atención |
| `success` | `#2E8B6A` | estados completados, stock sano |
| `warning` | `#C98A1B` | por vencer, pendientes |
| `danger` | `#C9463D` | errores, acciones destructivas |
| `deep` | `#07202B` → `#0E4A55` | panel del login, gradiente profundo |

Un solo acento de acción (brand). Los semánticos se usan solo en badges, medidores y mensajes. Sombras teñidas con la tinta de mar (`rgba(11,31,42,0.08)`), nunca negro puro.

### Tipografía

- **Instrument Sans** (UI, cuerpo, tablas). Tabular nums en cantidades y folios (`font-variant-numeric: tabular-nums`).
- **Instrument Serif** (solo titulares de gran tamaño: login y encabezados de página). Tracking `-0.02em`, line-height `1.05`.
- **Geist Mono** (folios, códigos de lote, CAS, claves de bitácora).

Escala: 12 / 13 / 14 (base) / 16 / 18 / 22 / 28 / 36 / 48. Pesos 400, 500, 600. Sin mayúsculas sostenidas como sistema de etiquetas.

### Forma y espacio

- Radio: 6 px controles, 10 px tarjetas, 14 px paneles y hojas, 20 px tarjeta del login.
- Espaciado base 4 px; secciones de página 24 px; formularios en bloques de 16 px.
- Contenedor de página: máximo 1440 px, márgenes laterales 24 px (16 px en móvil).

### Motion

- Curva estándar `cubic-bezier(0.32, 0.72, 0, 1)`, 180 a 260 ms.
- Springs (motion) para hojas laterales y diálogos: sin rebote, respuesta 0.3 s.
- Feedback en el `pointer-down` (`scale(0.98)`), estados de foco visibles siempre.
- `prefers-reduced-motion`: se sustituyen deslizamientos por fundidos.

## Arquitectura de información

Se retira el sidebar. Navegación superior con cinco destinos y una paleta de comandos (⌘K / Ctrl+K) para ir a cualquier sitio, crear registros y buscar reactivos, consumibles y muestras.

| Ruta | Contenido |
| --- | --- |
| `/login` | Acceso con correo y contraseña; Microsoft si está configurado |
| `/` | Inicio: estado del laboratorio, alertas, muestras en curso, actividad reciente |
| `/muestras` | Flujo de muestras con pestañas Recepción · Procesamiento · Extracción |
| `/muestras/recepcion/nueva`, `/muestras/recepcion/[id]` | Formato de recepción como página con secciones |
| `/muestras/procesamiento/nueva`, `/muestras/procesamiento/[id]` | Formato de procesamiento |
| `/muestras/extraccion/nueva`, `/muestras/extraccion/[id]` | Formato de extracción |
| `/inventario/reactivos`, `/inventario/consumibles`, `/inventario/equipos`, `/inventario/mantenimiento` | Inventario con pestañas |
| `/movimientos` | Entradas y salidas |
| `/documentos` | Documentos SGC y reportes de mantenimiento |
| `/administracion/usuarios`, `/administracion/roles` | Administración (desde el menú de usuario) |

Los formularios de catálogo (reactivo, consumible, equipo, mantenimiento, rol, usuario, relleno de stock, importación) se abren en una **hoja lateral** que conserva la tabla a la vista. Los formatos de muestra son páginas completas con cabecera fija (folio, estado, guardar) e índice de secciones.

## Estados obligatorios

Cada lista tiene: cargando (esqueleto con la forma de la tabla), vacío (con acción sugerida), error (con reintentar) y sin permiso. Cada formulario valida en línea y confirma con toast; las acciones destructivas usan un diálogo de confirmación propio, nunca `window.confirm`.

## Lo que no cambia

API `/api/*`, modelo de datos, permisos por módulo, claves de `localStorage` y descuento automático de inventario. El acceso local pasa a requerir contraseña (columna `password_hash`, scrypt).
