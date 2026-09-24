# Catálogo de permisos de FICOTOX (Fase 1)

Especificación de origen: "Roles y permisos FICOTOX" (FX-MO-2-1), sección 5, con las decisiones anotadas en la Fase 1. Fuente en el código:

| Qué | Dónde |
| --- | --- |
| Módulos, acciones, alcances, implicaciones y unión de permisos | `src/lib/shared/permisos.ts` |
| Reglas de combinación prohibida (catálogo versionado) | `src/lib/shared/combinaciones-roles.ts` |
| Matriz de los 10 roles | `scripts/roles-catalogo.json` (se carga con `scripts/seed-roles-usuarios.mjs`) |
| Cálculo de permisos, alcances, cargo, guarda y vencimientos | `src/lib/server/rbac.ts` |
| Tablas | `rol_acciones` (rol, módulo, acción, alcance) y `usuario_roles` (asignaciones con vigencia) |

## 1. Módulos

| Módulo | Qué cubre hoy en la app |
| --- | --- |
| `usuarios` | Usuarios y roles (incluye asignar y revocar roles) |
| `documentos` | Documentos SGC (sigue apagado por `FEATURES.documentos`) |
| `muestras` | Recepción, custodia y disposición final |
| `ensayos` | Procesamiento, extracción y análisis (incluye revisar y aprobar análisis) |
| `informes` | Informes de resultados |
| `equipos` | Equipos y mantenimientos (y reportes de mantenimiento) |
| `inventario` | Reactivos, consumibles y movimientos |
| `calidad` | Bitácora de auditoría (en Fase 8: incidencias, no conformidades, auditorías internas) |
| `compras` | Sin pantallas aún (Fase 8); solo existe en el catálogo |

El módulo `aprobaciones` desapareció: revisar y aprobar son acciones de `ensayos`, `informes` y `documentos`. Los módulos de la Fase 0 quedan inactivos en la tabla `permisos` (no se borran). El **Inicio** lo ve toda persona activa; sus paneles y avisos se filtran por el permiso V de cada módulo, y en "En curso" el siguiente paso de un flujo solo aparece como botón si la persona tiene el permiso de darlo (si no, "Pendiente: …").

## 2. Acciones

| Clave | Acción | Implica |
| --- | --- | --- |
| V | Visualizar | — |
| C | Crear / capturar | V |
| E | Editar borrador | V |
| R | Revisar | V |
| A | Aprobar / validar / liberar | V |
| AN | Anular con justificación | V |
| G | Administrar / configurar | todas las acciones del módulo |

**E** solo permite editar mientras el registro no ha pasado a revisión o aprobación: un análisis `revisado` o `aprobado` y un informe `en_revision` o posterior ya no se editan; se corrigen por anulación o enmienda.

### Correspondencia con las pantallas

| Operación | Permiso |
| --- | --- |
| Crear / editar recepción | `muestras:C` / `muestras:E` |
| Disposición final | `muestras:A` |
| Anular / restaurar recepción | `muestras:AN` |
| Crear / editar procesamiento, extracción, análisis | `ensayos:C` / `ensayos:E` |
| Revisar / aprobar análisis | `ensayos:R` / `ensayos:A` |
| Anular / restaurar procesamiento, extracción, análisis | `ensayos:AN` |
| Crear o enmendar informe / editar borrador | `informes:C` / `informes:E` |
| Revisar informe | `informes:R` |
| Autorizar y entregar informe | `informes:A` (la entrega se rediseña en Fase 6) |
| Anular informe | `informes:AN` |
| Alta / edición de equipos y mantenimientos | `equipos:C` / `equipos:E` (con alcance) |
| Baja de equipo, cancelación de mantenimiento | `equipos:AN` |
| Reactivar equipo | `equipos:G` |
| Alta / edición / importación de reactivos y consumibles | `inventario:C` / `inventario:E` |
| Reponer stock (registra movimiento) | `inventario:C` (alcance `movimientos` basta) |
| Baja / reactivar reactivo o consumible | `inventario:AN` / `inventario:G` |
| Bitácora y "Verificar integridad" | `calidad:V` |
| Ver usuarios y roles | `usuarios:V` |
| Alta / edición / baja de cuentas, asignar y revocar roles, configurar roles | `usuarios:G` |

Al capturar una extracción o un análisis que declara **equipos usados** se exige además `equipos:C` (alcance `uso` o mayor); si declara **insumos consumidos** (extracción, análisis o procesamiento) se exige `inventario:C` (alcance `movimientos` o mayor).

## 3. Alcances

Un permiso es `(rol, módulo, acción, alcance)`. `total` = sin límite.

### Se aplican ya (en el servidor)

| Alcance | Efecto |
| --- | --- |
| `propio` | En usuarios: solo ve su propia cuenta (no la lista de otras cuentas ni el catálogo de roles). |
| `estado` | En muestras (V): la API devuelve solo folio, solicitante, fechas y estado (`solo_estado: true`); omite datos técnicos, resultados y firmas. La ficha de la recepción se muestra como "seguimiento" (sin formato). El Inicio "En curso" tampoco enlaza a ensayos. |
| `recepcion` | En muestras: C/E solo sobre recepción. |
| `preparacion` | En ensayos: C/E solo sobre procesamiento (extracción y análisis → 403). |
| `borrador` | C/E solo mientras el registro está en borrador o registrado. |
| `bitacora` | En calidad: solo la bitácora de auditoría. |

**Bitácora y alcances**: `calidad:V` permite ver qué pasó, quién y cuándo en todo el sistema, pero los **datos** de una entrada (antes, después y cambios) solo se entregan si la persona puede ver el módulo del registro y, en muestras, si su alcance no es solo `estado` (`datos_restringidos: true`). Así un alcance no se elude leyendo la bitácora.
| `uso` | En equipos: solo registrar uso y folio de bitácora al capturar extracciones y análisis; no edita el catálogo ni los mantenimientos. |
| `mantenimiento` | En equipos: solo mantenimientos (y su reporte); no el catálogo. |
| `movimientos` | En inventario: solo movimientos y reposiciones; no el catálogo. |

### Diferidos (se guardan; se aplican en fases posteriores)

| Alcance | Fase |
| --- | --- |
| `asignado` | 5 |
| `supervisado` | 2/5 |
| `proyecto` | 8 |
| `tecnico`, `investigacion`, `autorizados`, `administrativo` | 7/8 |
| `incidencias`, `auditoria` | 8 |
| `limitado` | posterior |

Mientras no se apliquen se comportan como `total`, **excepto en el módulo usuarios**, donde cualquier alcance diferido se comporta como solo V. La pantalla de roles los muestra con la etiqueta "se aplica en Fase X".

### Implicaciones y unión

- La V implícita de C/E/R/A/AN conserva el alcance cuando este limita la vista (`propio`, `estado`, `bitacora` y los diferidos); para los alcances que solo limitan la operación (`recepcion`, `preparacion`, `borrador`, `uso`, `mantenimiento`, `movimientos`) la V implícita es `total`.
- En una celda como "V C (borrador)" el alcance entre paréntesis se aplica a las acciones que limita: V `total`, C `borrador`. En "V E (asignado)" se aplica a ambas (V `asignado`, E `asignado`).
- Permisos efectivos = unión de los roles **vigentes hoy** (no revocados, dentro de su vigencia, rol activo). Para un mismo módulo y acción vale cualquiera de los alcances; en `/api/auth/me` se informa el más amplio (`total` > diferido > aplicado).

## 4. Matriz (base de datos = `scripts/roles-catalogo.json`)

| Rol (clave) | usuarios | documentos | muestras | ensayos | informes | equipos | inventario | calidad | compras |
|---|---|---|---|---|---|---|---|---|---|
| Administrador técnico del sistema (`admin_tecnico`, sistémico) | G | V (tecnico) | V (estado) | — | — | V | — | V (bitacora) | — |
| Responsable General (`responsable_general`) | V | V R A AN | V AN | V R AN | V R A AN | V AN | V AN | V R A AN | V A |
| Coordinador/a de Mejora Continua (`mejora_continua`) | V | G R A AN | V | V | V | V | V | G R A AN | V |
| Coordinador/a del Área Técnica (`coord_area_tecnica`) | V | C E R (tecnico) | C E R A AN | C E R A AN | C R A AN | G R AN | G R AN | C R | V |
| Coordinador/a de Investigación y Desarrollo (`coord_investigacion`) | V | C E R (investigacion) | C E (proyecto) | C E R (proyecto) | C R (proyecto) | C E R | C E | C E | V |
| Técnico Analista (`tecnico_analista`) | V (propio) | V C (borrador) | V E (asignado) | C E | C (borrador) | C E (uso) | C E (movimientos) | C (incidencias) | — |
| Técnico Auxiliar (`tecnico_auxiliar`) | V (propio) | V | C E (recepcion) | C E (preparacion) | — | C E (uso) | C E (movimientos) | C (incidencias) | — |
| Administrador/a Auxiliar (`admin_auxiliar`) | V (limitado) | V C (administrativo) | V (estado) | — | — | C E (mantenimiento) | C E (administrativo) | C (incidencias) | G |
| Auditor Interno (`auditor_interno`) | V | V | V | V | V | V | V | V; C E (auditoria) | V |
| Estudiante / personal en formación (`estudiante`) | V (propio) | V (autorizados) | C E (asignado) | C E (borrador) | — | C E (supervisado) | C E (supervisado) | C (incidencias) | — |

`clave` es un identificador estable del rol (columna `roles.clave`); las reglas 3 y 4 lo usan en lugar del nombre visible.

## 5. Combinaciones de roles prohibidas

Catálogo versionado `src/lib/shared/combinaciones-roles.ts` (`VERSION_COMBINACIONES`), no editable desde la interfaz. Se evalúan al **asignar un rol** (409 `COMBINACION_PROHIBIDA` con la regla violada) y al **editar los permisos de un rol** (409 con la lista de personas afectadas), sobre los roles no revocados ni vencidos de cada persona (vigentes o por comenzar).

| # | Regla | Cómo se evalúa |
| --- | --- | --- |
| 1 | La administración técnica del sistema no puede combinarse con C, E, R o A en ensayos o informes, ni con A en documentos. | Por permisos: la unión de roles de la persona tiene `usuarios:G` **y** alguno de `ensayos:C/E/R/A`, `informes:C/E/R/A`, `documentos:A`. |
| 2 | La administración auxiliar no puede combinarse con C o E en ensayos o informes. | Por permisos: la unión tiene `compras:G` **y** alguno de `ensayos:C/E`, `informes:C/E`. |
| 3 | El Auditor Interno no se combina con Mejora Continua, Coord. Área Técnica, Técnico Analista, Técnico Auxiliar ni Estudiante. | Por clave de rol. |
| 4 | Estudiante / personal en formación no se combina con ningún otro rol. | Por clave de rol. |

Las reglas 1 y 2 usan un permiso "ancla" para identificar el lado administrativo (`usuarios:G` y `compras:G`), de modo que siguen valiendo aunque se editen los roles o se creen roles nuevos con esos permisos.

## 6. Varios roles, vigencia y cargo

- `usuario_roles`: `usuario_id`, `rol_id`, `vigente_desde`, `vigente_hasta` (opcional; no se acepta una fecha de fin ya pasada), `motivo` (≥ 5), `asignado_por/en`, `revocado_en/por`, `motivo_revocacion`. Nada se borra: revocar llena las columnas de revocación. `usuarios.id_rol` se migró a esta tabla ("Migración Fase 1") y ya no se lee (guarda el rol con el que se dio de alta la cuenta).
- Los permisos se calculan en **cada petición** desde la base; el JWT solo identifica a la persona. Revocar o vencer un rol tiene efecto inmediato, sin volver a iniciar sesión.
- Sin roles vigentes, la persona puede iniciar sesión pero solo ve "Sin permisos asignados".
- Nadie puede asignarse ni revocarse roles a sí mismo (403).
- Guarda: siempre debe quedar al menos un usuario activo con `usuarios:G` vigente **y al menos uno sin fecha de fin** (409 si un cambio lo impide; así el sistema no se queda sin administrador cuando vence una vigencia).
- Bitácora: `asignar_rol`, `revocar_rol`, `vencer_rol` (el vencimiento se registra una vez, en el primer minuto de actividad después de la fecha), y los cambios de permisos de un rol, todos con motivo.
- **Cargo en las firmas**: al capturar, firmar, revisar, aprobar, autorizar, entregar o anular (recepción, procesamiento, extracción, análisis e informes) se guarda el rol con el que se actuó (`*_rol_id`, `*_cargo`, y `actuo_como` en la bitácora). Si un solo rol vigente otorga el permiso se usa ese; si varios, la interfaz pide "Actuar como: <rol>" y envía `X-Actuar-Como`; el servidor valida que ese rol lo otorgue. El PDF del informe muestra el cargo elegido.

## 7. Decisiones pendientes de validar con Mejora Continua

1. **AN (anular con justificación)**: la matriz original no lo asignaba a ningún rol. Se propuso y se cargó: Coord. Área Técnica en muestras, ensayos, informes, equipos e inventario; Mejora Continua en documentos y calidad; Responsable General en todo excepto usuarios (anulaciones excepcionales). La aprobación de un segundo usuario llega en Fase 3.
2. **Responsable General en usuarios**: la matriz dice "V/A"; queda como V. La aprobación de altas y cambios se implementa en Fase 2/3.
3. **A de informes de la Coord. Técnica**: deberá valer solo para personas autorizadas en FX-THF-AP (Fase 4).
4. **Interpretación de módulos**: muestras = recepción y custodia; ensayos = procesamiento, extracción y análisis (reconcilia la matriz con la sección 7).
5. **Anclas de las reglas 1 y 2** (`usuarios:G` y `compras:G`) y la lectura de las celdas con paréntesis (sección 3).
6. **Reportes de mantenimiento**: pasan del módulo documentos (apagado) a `equipos` (V para verlos, C con alcance `mantenimiento` para generarlos).
7. **Uso de equipos e insumos al capturar**: se exige `equipos:C` / `inventario:C` además de `ensayos:C`.
8. **Consecuencia de los alcances diferidos**: como se comportan como `total` hasta su fase, una C con alcance `incidencias` en calidad (Técnico Analista, Técnico Auxiliar, Administrador/a Auxiliar, Estudiante) implica ver la bitácora de auditoría completa hasta la Fase 8. Si no se desea, bastaría con quitar esa celda de la matriz mientras tanto.
