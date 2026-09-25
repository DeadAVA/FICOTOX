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
| `supervisado` | (Fase 2) Se permite crear y editar, pero lo capturado queda **pendiente del visto bueno** del supervisor de la cuenta: no sirve de origen de la etapa siguiente, no se cierra, revisa, aprueba ni autoriza, y un mantenimiento no se marca completado hasta el visto bueno. Lo mismo aplica a todo lo que capture una **cuenta temporal con supervisor**. Su V implícita es `total`. |

### Diferidos (se guardan; se aplican en fases posteriores)

| Alcance | Fase |
| --- | --- |
| `asignado` | 5 |
| `proyecto` | 8 |
| `tecnico`, `investigacion`, `autorizados`, `administrativo` | 7/8 |
| `incidencias`, `auditoria` | 8 |
| `limitado` | posterior |

Mientras no se apliquen se comportan como `total`, con dos excepciones (Fase 2, `MODULOS_DIFERIDO_RESTRINGIDO` en `src/lib/shared/permisos.ts`):

- **usuarios**: cualquier alcance diferido se comporta como **solo V de la propia cuenta** (`propio`). Afecta al Administrador/a Auxiliar (`V (limitado)`).
- **calidad**: cualquier alcance diferido se comporta como **sin acceso** (ni la acción ni su V implícita). Así `C (incidencias)` y `C E (auditoria)` no abren la bitácora: el Técnico Analista, el Técnico Auxiliar, el Administrador/a Auxiliar y el Estudiante no ven la bitácora (403); el Auditor Interno la sigue viendo por su `V` total.

Revisión del resto de módulos: en documentos, muestras, ensayos, informes, equipos e inventario un diferido como `total` no expone datos que el rol no deba ver según la matriz (sus celdas ya incluyen V), por lo que se mantiene hasta su fase. La pantalla de roles muestra los diferidos con la etiqueta "se aplica en Fase X".

### Implicaciones y unión

- La V implícita de C/E/R/A/AN conserva el alcance cuando este limita la vista (`propio`, `estado`, `bitacora` y los diferidos); para los alcances que solo limitan la operación (`recepcion`, `preparacion`, `borrador`, `uso`, `mantenimiento`, `movimientos`) la V implícita es `total`.
- En una celda como "V C (borrador)" el alcance entre paréntesis se aplica a las acciones que limita: V `total`, C `borrador`. En "V E (asignado)" se aplica a ambas (V `asignado`, E `asignado`).
- Permisos efectivos = unión de los roles **vigentes hoy** (no revocados, dentro de su vigencia, rol activo). Para un mismo módulo y acción vale cualquiera de los alcances; en `/api/auth/me` se informa el más amplio (`total` > diferido > aplicado).

## 4. Matriz (base de datos = `scripts/roles-catalogo.json`)

| Rol (clave) | usuarios | documentos | muestras | ensayos | informes | equipos | inventario | calidad | compras |
|---|---|---|---|---|---|---|---|---|---|
| Administrador técnico del sistema (`admin_tecnico`, sistémico) | G | V (tecnico) | V (estado) | — | — | V | — | V (bitacora) | — |
| Responsable General (`responsable_general`) | V A | V R A AN | V AN | V R AN | V R A AN | V AN | V AN | V R A AN | V A |
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

## 6 bis. Separación de funciones y segundo usuario (Fase 3)

Catálogos versionados en el repositorio (no se editan desde la aplicación): `src/lib/shared/segregacion.ts` (`VERSION_SEGREGACION`) y `src/lib/shared/acciones-criticas.ts` (`VERSION_ACCIONES_CRITICAS`). Se evalúan en el servidor **por persona**, sin importar cuántos roles tenga ni con qué cargo actúe. "Elaboró" = quien creó el registro y cualquiera que haya editado su contenido (según su bitácora).

| # | Regla de segregación |
| --- | --- |
| 1 | Análisis: quien lo elaboró no lo revisa ni lo aprueba (revisor y aprobador pueden coincidir). |
| 2 | Informe: quien lo elaboró, o elaboró un análisis incluido, no lo revisa ni lo autoriza ("el Analista no validará ni liberará su propio resultado"). |
| 3 | Procesamiento y extracción: quien firma "supervisó" no es quien procesó, extrajo o realizó la limpieza. |
| 4 | Supervisión: el supervisor no da visto bueno a lo que él mismo capturó. |
| 5 | Documentos SGC: quien elaboró no revisa ni aprueba; quien revisó no aprueba. |
| 6 | Segundo usuario: quien solicita una acción crítica no la aprueba. |

Violación: 409 con código `segregacion` y la regla concreta. Las excepciones se piden como solicitud `excepcion_segregacion` (la aprueba A en calidad) y quedan registradas en el registro, en la bitácora y, en informes, en el PDF.

| Acción crítica (crea solicitud; no se ejecuta hasta aprobarla) | Aprueba (segundo usuario) |
| --- | --- |
| Anular o restaurar recepción, procesamiento, extracción o análisis que ya no esté en borrador/registrado (incluye el análisis aprobado) | AN del mismo módulo |
| Anular un informe autorizado o entregado | AN en informes |
| Excepción de segregación | A en calidad (Responsable General / Mejora Continua) |
| Asignar un rol a un usuario (también el rol inicial de una cuenta nueva) | A en usuarios (Responsable General) |
| Reactivar una cuenta dada de baja | A en usuarios |
| Ampliar la vigencia de una cuenta temporal | A en usuarios |

Revocar roles, dar de baja cuentas, bloquear y acortar vigencias **no** requieren segundo usuario (reducir privilegios no debe esperar). En usuarios, `G` **no** implica A (Fase 3.1): solo quien tiene `usuarios:A` explícito (Responsable General) aprueba cambios de acceso; en los demás módulos G sigue implicando todas las acciones. Nadie puede editar los permisos de un rol que él mismo tiene vigente (409 `rol_propio`); los demás roles se editan como antes. Guardas: siempre queda al menos un usuario activo con `usuarios:G` vigente (y uno sin fecha de fin) y con `usuarios:A` vigente. El script de alta asigna roles sin solicitud y lo deja dicho en la bitácora.

## 6 ter. Autorizaciones del personal FX-THF-AP (Fase 4)

Segunda capa, además del rol: el rol da la acción en el módulo; la autorización FX-THF-AP dice sobre qué actividades, métodos y equipos puede trabajar la persona, con vigencia. El servidor valida a quien actúa (403 `no_autorizado` con lo que falta). Catálogo en `src/lib/shared/autorizaciones.ts`.

| Formato / acción | Rol (permiso) | Autorización FX-THF-AP vigente |
| --- | --- | --- |
| Recepción (crear/editar) | muestras C/E | actividad `recepcion` |
| Procesamiento | ensayos C/E | actividad `procesamiento` |
| Extracción | ensayos C/E | `extraccion` + método (E-A → ASP, E-D → DSP) + cada equipo del inventario usado |
| Análisis | ensayos C/E | `analisis` + método del tipo de análisis + equipo usado (si está en inventario) |
| Revisar / aprobar análisis | ensayos R / A | `revision_resultados` / `aprobacion_resultados` + método |
| Revisar / autorizar informe | informes R / A | `revision_informe` / `autorizacion_informe` |

Otorgan y revocan (con motivo, reautenticación y bitácora): quien tiene `ensayos:A` o `calidad:A` (Coord. Área Técnica, Mejora Continua, Responsable General); no el Administrador técnico; nadie a sí mismo (409). `AUTORIZACIONES_OBLIGATORIAS=false` desactiva la validación solo para cargar datos iniciales.

## 7. Decisiones pendientes de validar con Mejora Continua

1. **AN (anular con justificación)**: la matriz original no lo asignaba a ningún rol. Se propuso y se cargó: Coord. Área Técnica en muestras, ensayos, informes, equipos e inventario; Mejora Continua en documentos y calidad; Responsable General en todo excepto usuarios (anulaciones excepcionales). La aprobación de un segundo usuario llega en Fase 3.
2. **Responsable General en usuarios**: la matriz dice "V/A"; desde la Fase 3 es V A y aprueba las asignaciones de rol, reactivaciones y ampliaciones de vigencia (solicitudes de segundo usuario).
3. **A de informes de la Coord. Técnica** (resuelto en la Fase 4): la A de informes solo se ejerce con la autorización FX-THF-AP `autorizacion_informe` vigente (y R con `revision_informe`); ver 6 ter.
4. **Interpretación de módulos**: muestras = recepción y custodia; ensayos = procesamiento, extracción y análisis (reconcilia la matriz con la sección 7).
5. **Anclas de las reglas 1 y 2** (`usuarios:G` y `compras:G`) y la lectura de las celdas con paréntesis (sección 3).
6. **Reportes de mantenimiento**: pasan del módulo documentos (apagado) a `equipos` (V para verlos, C con alcance `mantenimiento` para generarlos).
7. **Uso de equipos e insumos al capturar**: se exige `equipos:C` / `inventario:C` además de `ensayos:C`.
8. **Alcances diferidos en calidad** (resuelto en la Fase 2): en calidad un diferido es *sin acceso*, así que `C (incidencias)` ya no abre la bitácora. Cuando se implemente el registro de incidencias (Fase 8) se aplicará el alcance real.
9. **Supervisión de cuentas temporales** (Fase 2): además del alcance `supervisado`, todo lo que captura una cuenta temporal con supervisor queda pendiente de visto bueno. Validar si una estancia temporal con rol de Técnico Analista debe quedar supervisada o no.
10. **Segregación en documentos** (Fase 3): el modelo tiene un solo paso de revisión; la regla "revisor de calidad, revisor técnico y aprobador no pueden ser todos la misma persona" se aplica como revisor distinto del aprobador. Validar si se requieren dos revisiones (calidad y técnica) en la Fase 7. Además, como "enviar a revisión" registra al revisor, quien elaboró el documento no lo envía a revisión (lo envía otra persona con E); se rehace con el flujo completo de documentos.
11. **`usuarios:G` ya no implica A** (resuelto en la Fase 3.1): el Administrador técnico administra cuentas y roles, pero las asignaciones de rol, reactivaciones y ampliaciones de vigencia las aprueba solo quien tiene `usuarios:A` explícito (Responsable General). En los demás módulos G sigue implicando todo. La guarda de `usuarios:A` ahora sí aplica por separado.
12. **Cambios de permisos de un rol ya asignado** (acotado en la Fase 3.1): quien tiene `usuarios:G` los hace sin segundo usuario (con motivo, reautenticación y bitácora), pero nunca sobre un rol que él mismo tiene vigente (409 `rol_propio`). Validar si además deben pasar por solicitud.
13. **Regla 3 por nombre** (Fase 3): procesó/supervisó se comparan como texto firmado, no como cuentas. Se ligará a la cuenta con la asignación de muestras (Fase 5).
