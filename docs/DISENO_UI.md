# FICOTOX · Sistema de diseño (rediseño 2026-09, segunda iteración)

## Lectura del brief

LIMS local para el Laboratorio Nacional de Ficotoxinas (LN-FICOTOX, CICESE). Audiencia: personal técnico, pocas personas, uso diario. Pedido de la segunda iteración: **estilo Apple** (calma, materiales translúcidos, una sola tipografía, movimiento con física), sin frases motivacionales, con un logo que represente lo que hace el laboratorio, un inicio útil que no abrume, búsqueda como primera acción y formatos que no confundan.

Modo: rediseño visual y de navegación **preservando funcionalidad, API, datos y permisos**.

## Concepto

El laboratorio observa microalgas al microscopio y mide sus toxinas. La marca es una **diatomea céntrica** (célula circular con estrías radiales) sobre un cuadrado redondeado color océano. El color de acento es el agua del Pacífico frente a Ensenada; el resto de la interfaz es gris frío, claro y sereno, con la estructura (barra lateral, cabeceras fijas, menús) en materiales translúcidos que dejan pasar el contenido.

## Tokens

### Color (modo claro)

| Token | Valor | Uso |
| --- | --- | --- |
| `canvas` | `#F2F4F7` | fondo de la aplicación |
| `surface` | `#FFFFFF` | tarjetas, tablas, paneles |
| `surface-2` | `#F5F7F9` | relleno de campos, filas de detalle |
| `surface-3` | `#E9EDF1` | controles segmentados, chips, iconos neutros |
| `line` | `#E3E8ED` | divisores |
| `line-strong` | `#CDD5DD` | bordes de casillas y radios |
| `ink` | `#10202B` | texto principal |
| `ink-2` / `ink-3` / `ink-4` | `#3B4D5A` / `#6C7D8A` / `#9AA8B3` | texto secundario, terciario, placeholders |
| `brand` | `#0F7A95` | acción principal, selección en la barra lateral, enlaces |
| `brand-strong` | `#0B5F75` | hover de acción principal |
| `brand-soft` / `brand-faint` | `#DCEDF3` / `#EEF6F9` | énfasis suave, hover de filas |
| `success` / `warning` / `danger` | `#2F8A5B` / `#B9791A` / `#C8433B` | estados; siempre con su variante `-soft` para fondos |
| `bloom` | `#D0672F` | solo salidas/descuentos de inventario |
| `deep` / `deep-2` | `#081A24` / `#0C3A4A` | fondo del acceso, tooltips |

Un solo acento. Sombras teñidas con la tinta (`rgba(16,32,43,…)`), nunca negro puro; las tarjetas no llevan borde, llevan un anillo de 1 px al 4 % dentro de la sombra (`shadow-card`).

### Tipografía

Una sola familia: **la del sistema** (`-apple-system` → SF Pro en Apple; **Inter** como respaldo cargado con `next/font` para Windows/Linux). Monoespaciada del sistema (`SF Mono`/Menlo, Geist Mono de respaldo) para folios, lotes, CAS y claves.

Clases utilitarias: `.display` (700, tracking −0.03em, leading 1.05), `.title-1` (28 px / 700 / −0.025em), `.title-2` (20 px / 600), `.title-3` (16 px / 600), `.eyebrow` (11.5 px, mayúsculas, +0.04em), `.caption`, `.tnum` (números tabulares). Cuerpo 14 px. Sin serif, sin mayúsculas sostenidas salvo los rótulos de grupo de la barra lateral.

### Forma y espacio

- Radios: 8–10 px controles, 14 px tarjetas, 18 px paneles y bloques de formato, 20 px paleta, 26 px tarjeta de acceso. Píldoras para búsqueda, chips y riel de secciones.
- Contenedor de página: máximo 1280 px con márgenes de 32 px (16 px en móvil). Formatos: columna única de 880 px.
- Campos: 40 px de alto, relleno `surface-2`, sin borde marcado; al enfocar pasan a blanco con anillo del acento.

### Materiales

`.material` (blanco 72 % + blur 24 px) para cabeceras fijas, menús, paleta y pies de hoja; `.material-thick` (más denso) para la barra lateral; `.material-dark` para tooltips. Con `prefers-reduced-transparency` se vuelven sólidos. Nunca se apila un material claro sobre otro.

### Motion

- Curva de resorte sin rebote `cubic-bezier(0.22, 1, 0.36, 1)` para entradas (260–380 ms) y su espejo `cubic-bezier(0.64, 0, 0.78, 0)` para salidas (160–220 ms): lo que entra por un lado sale por el mismo.
- Los materiales **se materializan**: opacidad, escala y desenfoque a la vez (`materialize`). Los menús no animan al cerrar para que el siguiente clic no se pierda.
- Feedback en el `pointer-down` (`.press`: `scale(0.97)` en 60 ms).
- Listas con entrada escalonada de 30 ms por fila (`.stagger`).
- `prefers-reduced-motion`: todo pasa a 0 ms.

## Marca

`BrandMark` (SVG, `src/components/shell/Brand.tsx`), `src/app/icon.svg` y `public/favicon.svg` son el mismo dibujo: **una floración algal** — una diatomea céntrica (valva con estrías marginales, areolas punteadas y núcleo) con dos células hijas, sobre dos olas — en un cuadrado redondeado con degradado océano. Es lo que el laboratorio observa al microscopio y el origen de las toxinas que analiza. Con `animated` la célula gira (48 s), las hijas flotan y el mar avanza; solo se usa en el acceso y se detiene con `prefers-reduced-motion`. `BrandLockup` añade la palabra FICOTOX en 600 con tracking −0.02em.

### Acceso

Fondo blanco (`#fbfbfd`) con dos luces océano casi imperceptibles a la deriva (`.light-field`), sin tarjeta: marca animada de 88 px, "FICOTOX", "Sistema Integrado de Gestión de Laboratorio", el rótulo LN-FICOTOX · CICESE, dos campos blancos de 48 px y el botón océano. Los elementos entran escalonados (`.stagger`). Al pie, el nombre completo del laboratorio y del centro.

## Arquitectura de información

**Barra lateral** (240 px, colapsable a 68 px; en móvil, panel deslizante) con seis destinos de primer nivel, sin rótulos de grupo. Los que agrupan pantallas se **despliegan** (animación de altura con `grid-template-rows: 0fr → 1fr`, chevron que gira) y muestran sus subdestinos con una guía vertical; la sección activa siempre está abierta y las demás recuerdan si la persona las dejó abiertas (`localStorage`).

| Destino | Subdestinos |
| --- | --- |
| Inicio | — |
| Muestras | Recepción · Procesamiento · Extracción · Análisis |
| Informes | — |
| Inventario | Reactivos · Consumibles · Equipos · Mantenimiento · Movimientos |
| Calidad | Documentos · Auditoría |
| Administración | Usuarios · Roles |

Selección: el subdestino activo es una píldora océano; su padre queda en negritas con el icono en océano. En la cabecera de la barra solo hay un icono de búsqueda (⌘K) y el botón de contraer; abajo, la persona con su avatar y el menú para cerrar sesión. Cada destino se muestra solo si el rol puede leer su módulo (`NAV_ITEMS` y `visibleNav` en `src/lib/client/nav.ts`). En escritorio las pestañas internas de Muestras e Inventario se ocultan (la barra ya las muestra); en móvil y tablet siguen visibles.

**Buscadores**: uno global (el del Inicio y la paleta ⌘K, mismo motor) y uno por lista para filtrar esa lista en el servidor. No hay campo de búsqueda en la barra lateral.

### Búsqueda

Un solo motor (`useGlobalSearch`, `src/lib/client/search.ts`) alimenta el buscador grande del Inicio y la paleta ⌘K. Indexa muestras (R/P/E), análisis, informes, reactivos, consumibles, equipos, mantenimientos y documentos, más tres listas fijas filtradas por permisos: **acciones** (las generales primero: "Nueva recepción", "Nueva extracción"…; las específicas como "Nueva extracción DSP" solo salen al escribir, `specific`), **vistas** por estado ("Informes por revisar", "Reactivos con stock bajo", "Mantenimientos vencidos"… → `?filtro=`) y **temas de ayuda** (`HELP_TOPICS` → `/ayuda#ancla`). Ranking: empieza-con > frase completa (sin espacios, para folios como `R 12`) > todas las palabras. El índice se guarda un minuto. **Ámbitos** (chips Todo · Muestras · Informes · Inventario · Acciones, `SearchScope`; `Tab` los rota) acotan por tipo. Sin texto muestra **Recientes** (últimos seis resultados abiertos, `localStorage ficotox.search.recent`, `rememberSearchHit`), Crear, Ver, Ir a y Ayuda. Las filas (`SearchHitRow`) llevan icono por tipo, subtítulo y, en muestras, la etiqueta de etapa; el pie (`SearchFooter`) recuerda las teclas y permite borrar recientes.

### Inicio

Fecha, saludo y **buscador**; debajo, una línea discreta con tres ejemplos clicables ("R 0000001 · metanol · nueva recepción") que escriben en el buscador (`HomeSearchHandle.ask`). No hay fila "Nuevo" ni tarjetas de resumen: crear vive en el buscador y los conteos van en los títulos de los dos únicos paneles (Axel pidió "solo lo más importante", 2026-09-11):

- **En curso · N** (`GET /api/inicio/en-curso`, `src/lib/server/modules/inicio.ts`; `FlowCard` en `src/components/features/inicio/FlowList.tsx`): una tarjeta por recepción sin cerrar con folio + solicitante, una línea gris "ASP · 3 muestras · 4 días", la **línea de etapas** (Recepción → Procesamiento → Extracción → Análisis → Informe; hecho / actual con pulso / pendiente, tooltip con folio y estado, enlace a cada registro) y el **siguiente paso** como botón con enlace prellenado (`?recepcion=`, `?procesamiento=&tipo=`, `?extraccion=`). En escritorio, al pasar el cursor o enfocar, el detalle de cada etapa sale como capa bajo la tarjeta (`sm:absolute`, no empuja la lista; el panel usa `overflow-visible`); en móvil, botón "Detalle" en flujo. Si alguna espera firma, el título lo dice ("· 2 esperan firma"). Orden: primero lo que espera firma, luego lo más antiguo. Recepciones ASP+DSP: una extracción por tipo y un análisis por extracción; se muestra el pendiente menos avanzado.
- **Avisos · N** (`GET /api/inicio/avisos`; `AvisoRow` en `Avisos.tsx`): una línea por aviso (icono, nombre, cuenta) y **HoverCard** (`src/components/ui/Overlay.tsx`, Radix) con los primeros seis elementos enlazados y "Ver los N" (cuenta con `COUNT(*)`, ítems con `LIMIT 6`). Mismas reglas SQL que las listas y mismos `?filtro=` (incluido `pendiente` en informes y análisis). Tonos: rojo (vencidos; el título dice "· 1 urgente"), ámbar (stock, calibración), marca (firmas y entregas pendientes).
- Debajo de los avisos, una sola línea: "¿Primera vez aquí? Cómo se usa" → `/ayuda`.

### Ayuda (`/ayuda`)

Manual resumido dentro de la app (`src/app/(app)/ayuda/page.tsx`): índice a la izquierda que sigue el scroll (IntersectionObserver), diez secciones con pasos numerados, avisos (`Tip`) y enlaces a crear; los anclas coinciden con `HELP_TOPICS`, así el buscador abre la sección exacta (`useHashScroll` desplaza al llegar con `#`). Enlace fijo "Ayuda" al pie de la barra lateral (no depende de permisos).

### Listas

Cabecera con título y descripción y una barra con **búsqueda + menú Filtros** (`FilterMenu`, `src/components/ui/FilterMenu.tsx`): un botón con el número de filtros activos que abre un panel con grupos de una sola opción (con conteos) y conmutadores ("Mostrar anuladas/bajas"); las opciones previstas pero no disponibles (PSP, pigmentos, sedimentos) van en gris con la nota "Próximamente". Los filtros activos se muestran como chips junto al botón (`FilterChips`). Auditoría añade dentro del mismo panel los campos de usuario y fechas.

Cada fila tiene **un solo botón de acciones** (`ActionMenu`, "⋯") que agrupa todo: abrir, editar, avanzar de etapa (Procesar, Extraer, Analizar), rellenar, dar de baja / anular / restaurar. Cada opción lleva su icono duotono en una cajita del color de su tono (océano = abrir, verde = avanzar, rojo = anular) y una línea que explica qué hace. El clic en la fila abre el registro. En inventario, "Ver ficha" abre la `DetailSheet`.

### Formatos (recepción, procesamiento, extracción, análisis, informe)

`FormPage` (`src/components/features/samples/FormLayout.tsx`, v4): cabecera translúcida fija con botón circular de regreso, título + estado y debajo "Lista · clave del formato"; las acciones van a la derecha (en móvil bajan al pie). A la izquierda (arriba en móvil) va la **guía de secciones** con el conmutador **Paso a paso | Todo** (control segmentado; botón "Mostrar todo" en móvil), la lista de secciones —número o palomita, verde = completa, ámbar = faltan datos, gris = sin evaluar— y la barra "n de m completas". El ámbar solo aparece en secciones ya visitadas o después de un intento de guardar con error.

Cada sección es una tarjeta con **cabecera en banda** (número, título y descripción sobre fondo tenue, separada del contenido por una línea); la sección en curso se tiñe con el acento y su número va en tinta. La cabecera fija del formato ocupa **todo el ancho** de la columna de contenido (el ancho máximo lo pone `PageBody`/`FormPage`, no `main`), así no quedan huecos a los lados al desplazarse en pantallas anchas.

Dos modos de lectura: **paso a paso** (por omisión al capturar) mantiene una sola `FormCard` abierta; las demás se pliegan a su título y descripción con "Abrir", y cada sección termina con **Continuar**, que abre la siguiente con animación de altura. **Todo** (por omisión en solo lectura) despliega todo el formato para leerlo o revisarlo de corrido; la elección se recuerda (`ficotox.form.showAll`). En este modo la guía **sigue al scroll**: la sección en curso es la última cuya cabecera pasó la línea de lectura (150 px), con bloqueo breve mientras dura un desplazamiento suave iniciado desde la guía. Las validaciones al guardar llaman `openFormSection(id)`, que abre la sección con el error aunque esté plegada.

Dentro de las secciones todo cabe sin desbordar la página: `FormTable` desplaza la tabla en horizontal dentro de la tarjeta (márgenes negativos hasta el borde), y las listas con muchos campos por fila —muestras de un lote, resultados por muestra— son **tarjetas por elemento** (fila principal + fila de detalle) en vez de tablas anchas. `PersonCard` es una fila: nombre (y cargo) a la izquierda, firma compacta (`SignaturePad compact`, 3:1) a la derecha; varias personas se apilan. `ChoiceGrid cols={2|3|4|5}` fija las columnas de opciones sin clases en conflicto (clsx no fusiona Tailwind). `FieldGroup` titula un grupo de opciones.

**Obligatorio vs. opcional.** `FormSectionDef.optional` marca las secciones que no bloquean el guardado (insumos adicionales, equipos utilizados, controles de calidad, revisión, historial, decisión de aceptación al registrar): se ven con la etiqueta "opcional", no cuentan en "n de m" y se pintan verdes solo si se llenaron. `missingSections(sections)` devuelve las obligatorias con `complete === false`; cada `handleSave` la consulta antes de cualquier otra validación y, si hay faltantes, llama a `fail(missingMessage(...), primeraSección)`, que muestra el aviso y abre esa sección. Los protocolos de extracción declaran su propia regla con `sectionComplete(id, form)`.

Piezas comunes para que todos los formatos se lean igual: `Callout` (info / aviso / error / confirmación, un solo estilo con icono y fondo suave) sustituye a los textos de color sueltos; `Panel` agrupa campos dentro de una sección (blanco, material de referencia, comunicación al cliente); `SignoffCard` es la constancia de revisión, aprobación, autorización o entrega (quién, cargo, cuándo, pendiente en gris, hecho en verde); `FlowSteps` muestra el avance del registro (Registrado → Revisado → Aprobado; Borrador → En revisión → Autorizado → Entregado). La cabecera solo muestra el siguiente paso del flujo y "Guardar"; anular, restaurar, enmienda y PDF viven en el menú **Más acciones**.

Solo lectura: `fieldset disabled` + `.form-readonly` (globals.css) muestran los controles como texto plano, `SignaturePad` pasa a imagen o "Sin firma" y `ReadValue` reemplaza los textareas vacíos por un guion. La completitud la declara cada formato en `sections[].complete` (recepción, procesamiento, extracción, análisis e informe la calculan).

### Avatares

Catálogo de 18 ilustraciones (`src/components/ui/AvatarArt.tsx`; claves en `src/lib/shared/avatars.ts`): medusa, pulpo, tortuga, ballena, pez, cangrejo, estrella, erizo, concha, mejillón, diatomea, dinoflagelado, alga, coral, ola, microscopio, matraz y faro. Cada uno es un SVG de 64 px con degradado radial propio y trazo blanco de 2.6. Al crear una cuenta se asigna uno al azar (`usuarios.avatar`); si está vacío, `defaultAvatarFor(correo)` elige uno estable. La persona lo cambia en **Mi cuenta** (`AccountSheet`, `PUT /api/auth/me/avatar`, con bitácora) y la administración también puede hacerlo en la hoja de usuario (`AvatarPicker`).

## Estados obligatorios

Cada lista tiene: cargando (esqueleto), vacío (con acción sugerida), error (con reintentar) y sin permiso. Cada formulario valida en línea y confirma con toast (abajo al centro); las acciones destructivas usan diálogo propio, nunca `window.confirm`.

No hay "eliminar": anular, dar de baja, cancelar, obsoletar y las excepciones de firma piden un **motivo** (`usePrompt`, mínimo 5 caracteres) que queda en la bitácora. Anulados y bajas se ocultan por defecto y se muestran con la casilla **Mostrar anuladas / bajas**. Los formatos terminales se abren en solo lectura y terminan con **Historial** (`RecordHistory`).

### Historial y auditoría

La bitácora nunca se muestra como JSON ni con nombres de columna. `src/lib/client/audit-humanize.ts` convierte cada entrada en una frase ("**Daniela Cortés** aprobó el análisis A 0000004"), hechos clave como chips ("Estado: En revisión → Autorizado", "Disposición final: RPBI", "Fecha de entrega: 11 sep 2026") y una lista de cambios con etiquetas en español y valores legibles (estados por catálogo, fechas, sí/no, listas de equipos como frases, ids y firmas ocultos). `AuditTimeline` (`src/components/features/audit/AuditTimeline.tsx`) la dibuja como línea de tiempo agrupada por día (Hoy, Ayer, fecha), con un nodo por acción (icono y tono), el motivo como cita, botón **Ver n cambios** y el sello de integridad abreviado con explicación en tooltip. La página de Auditoría usa la misma traducción pero en **tabla**, igual que Movimientos (`Table` + `CellPrimary` + `Badge`): Fecha, Usuario, Acción, "Qué pasó" (frase + motivo/hechos como subtítulo), Registro (entidad, referencia y **Abrir**) y "n cambios" en columna fija; la fila se expande con `ChangeList`. El resumen va al extremo de la barra de herramientas, como en Movimientos.

## Lo que no cambia

API `/api/*`, modelo de datos, permisos por módulo, reglas de negocio, `id` de los campos y nombres de botones que usan las pruebas de navegador.
