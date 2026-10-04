# Catálogo de permisos de FICOTOX

**Estado final vigente (Fases 9, 10 y 11).** Refleja el sistema tras las fases 0–7, 9, 10 y 11. La Fase 11 implementa incidencias, no conformidades y acciones correctivas (la primera parte de la antigua Fase 8) y aplica el alcance `incidencias`; auditorías internas, compras y proyectos siguen pendientes y sus alcances diferidos. Pendientes y decisiones por validar consolidados en `docs/PENDIENTES.md`.

Especificación de origen: "Roles y permisos FICOTOX" (FX-MO-2-1), sección 5, con las decisiones anotadas desde la Fase 1. Fuente en el código:

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
| `documentos` | Calidad › **Biblioteca** de documentos (consulta, subida y versiones). El flujo de control documental de la Fase 7 (revisión, aprobación, lista maestra, distribución) se **retiró** por decisión del laboratorio; ver 6 octies |
| `muestras` | Recepción, custodia y disposición final |
| `ensayos` | Procesamiento, extracción y análisis (incluye revisar y aprobar análisis) |
| `informes` | Informes de resultados |
| `equipos` | Equipos y mantenimientos (y reportes de mantenimiento) |
| `inventario` | Reactivos, consumibles y movimientos |
| `calidad` | Bitácora de auditoría; incidencias, no conformidades y acciones correctivas (Fase 11); auditorías internas (posterior) |
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
| Adjuntar / anular evidencia instrumental de un análisis (Fase 10) | `ensayos:E` con su alcance, solo en "registrado", asignado (o coordinación) y FX-THF-AP de análisis + método; anular con motivo y reautenticación |
| Ver y descargar evidencia instrumental (Fase 10) | `ensayos:V` con su alcance (con solo "estado" no se ve) |
| Anular / restaurar procesamiento, extracción, análisis | `ensayos:AN` |
| Crear o enmendar informe / editar borrador | `informes:C` / `informes:E` |
| Revisar informe | `informes:R` |
| Autorizar, liberar y enviar informe | `informes:A` (liberar exige además la autorización FX-THF-AP `liberacion_informe`; Fase 6) |
| Anular informe | `informes:AN` |
| Alta / edición de equipos y mantenimientos | `equipos:C` / `equipos:E` (con alcance) |
| Baja de equipo, cancelación de mantenimiento | `equipos:AN` |
| Reactivar equipo | `equipos:G` |
| Alta / edición / importación de reactivos y consumibles | `inventario:C` / `inventario:E` |
| Reponer stock (registra movimiento) | `inventario:C` (alcance `movimientos` basta) |
| Baja / reactivar reactivo o consumible | `inventario:AN` / `inventario:G` |
| Bitácora (Calidad › Auditoría; la verificación de integridad corre sola y solo avisa si falla) | `calidad:V` (con alcance `incidencias` no: 403). **La bitácora no se exporta** (decisión del laboratorio): `GET /api/audit?formato=…` y los eventos de Revisión de accesos responden 410 para todos |
| Reportar incidencia (Fase 11) | `calidad:C` con cualquier alcance; **nunca sujeto a visto bueno** (cuenta supervisada o temporal incluida) |
| Ver incidencias y NC (Fase 11) | `calidad:V` total; con `incidencias`, solo las incidencias propias y las NC o acciones donde es responsable (lo ajeno responde 404). `bitacora` (Admin técnico) no las ve |
| Evaluar incidencia: cerrar sin NC o escalar (Fase 11) | `calidad:R` (regla 7) |
| Crear NC directa (Fase 11) | `calidad:R` o `calidad:G` |
| Editar NC: impacto, causa, acciones, comunicaciones, informes afectados (Fase 11) | `calidad:G`, o el responsable de la NC con `calidad:C` o superior, mientras no esté cerrada; nombrar o cambiar al responsable, solo `calidad:G` (con motivo) |
| Marcar una acción correctiva como iniciada o implementada (Fase 11) | su responsable o `calidad:G` |
| Verificar eficacia (Fase 11) | `calidad:R` (regla 8) |
| Suspender método o equipo, retener informe (Fase 11) | `calidad:R` |
| Reanudar, liberar retención (Fase 11) | `calidad:A` + reautenticación (regla 10 en reanudar) |
| Cerrar NC (Fase 11) | `calidad:A` + reautenticación (regla 9) |
| Anular incidencia o NC (Fase 11) | `calidad:AN` + reautenticación, acción crítica con segundo usuario (`anular_calidad`) |
| Indicadores de calidad (Fase 11) | `calidad:V` total |
| Ver usuarios y roles | `usuarios:V` |
| Alta / edición / baja de cuentas, asignar y revocar roles, configurar roles | `usuarios:G` |
| Respaldos: ver (solo lectura) | `usuarios:G` o `calidad:V` (Fase 10) |
| Respaldos: "Crear respaldo ahora" | `usuarios:G` + reautenticación (Fase 10); la restauración solo por línea de comandos |
| Ver la Biblioteca, leer en el visor y descargar | `documentos:V` (con `autorizados`, solo los documentos visibles para todos o para su rol) |
| Subir un documento o una versión nueva a la Biblioteca | `documentos:C` (el alcance `borrador` del Técnico Analista cuenta como subir) |
| Editar los datos de un documento de la Biblioteca | `documentos:E` sobre el propio documento; `documentos:G` sobre cualquiera |
| Administrar las categorías de la Biblioteca | `documentos:G` |
| Archivar / restaurar un documento de la Biblioteca | `documentos:AN` o `documentos:G`, con motivo y reautenticación |

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
| `bitacora` | En calidad: solo la bitácora de auditoría (no incidencias ni NC). |
| `incidencias` | (Fase 11) En calidad: crear incidencias y ver solo las propias (reportadas por la persona) y las NC o acciones correctivas donde es responsable. Solo vale sobre esos objetos (`ALCANCES_SOLO_CON_OBJETO`): no abre la bitácora, los respaldos ni otras incidencias, por lista, ficha, búsqueda, filtro por registro, campana, historial, adjuntos ni exportación de listas. Su V implícita es `incidencias`. |

**Bitácora y alcances**: `calidad:V` permite ver qué pasó, quién y cuándo en todo el sistema, pero los **datos** de una entrada (antes, después y cambios) solo se entregan si la persona puede ver el módulo del registro y, en muestras, si su alcance no es solo `estado` (`datos_restringidos: true`). Así un alcance no se elude leyendo la bitácora.
| `uso` | En equipos: solo registrar uso y folio de bitácora al capturar extracciones y análisis; no edita el catálogo ni los mantenimientos. |
| `mantenimiento` | En equipos: solo mantenimientos (y su reporte); no el catálogo. |
| `movimientos` | En inventario: solo movimientos y reposiciones; no el catálogo. |
| `supervisado` | (Fase 2) Se permite crear y editar, pero lo capturado queda **pendiente del visto bueno** del supervisor de la cuenta: no sirve de origen de la etapa siguiente, no se cierra, revisa, aprueba ni autoriza, y un mantenimiento no se marca completado hasta el visto bueno. Lo mismo aplica a todo lo que capture una **cuenta temporal con supervisor**. Su V implícita es `total`. |
| `asignado` | (Fase 5) Solo las muestras **asignadas** a la persona (o registradas por ella): la lista de recepciones se filtra y la ficha o la edición de otra responde 403 `no_asignado`. Su V implícita es `asignado`. |
| `autorizados` | En documentos (Biblioteca): solo los documentos **visibles para todos o para alguno de sus roles**; lo demás responde 404 como si no existiera (lista, ficha, archivo y búsqueda). Sobre los documentos del flujo anterior que quedan en solo lectura conserva su regla de la Fase 7 (vigentes distribuidos a la persona). |

### Diferidos (se guardan; se aplican en fases posteriores)

| Alcance | Fase |
| --- | --- |
| `proyecto` | 8 |
| `tecnico`, `investigacion`, `administrativo` | 8 / posterior |
| `auditoria` | posterior |
| `limitado` | posterior |

Mientras no se apliquen se comportan como `total`, con dos excepciones (Fase 2, `MODULOS_DIFERIDO_RESTRINGIDO` en `src/lib/shared/permisos.ts`):

- **usuarios**: cualquier alcance diferido se comporta como **solo V de la propia cuenta** (`propio`). Afecta al Administrador/a Auxiliar (`V (limitado)`).
- **calidad**: cualquier alcance diferido se comporta como **sin acceso** (ni la acción ni su V implícita). Así `C E (auditoria)` no abre la bitácora; `C (incidencias)` tampoco (desde la Fase 11 se aplica: ver arriba). El Técnico Analista, el Técnico Auxiliar, el Administrador/a Auxiliar y el Estudiante no ven la bitácora (403); el Auditor Interno la sigue viendo por su `V` total.

Revisión del resto de módulos: en documentos, muestras, ensayos, informes, equipos e inventario un diferido como `total` no expone datos que el rol no deba ver según la matriz (sus celdas ya incluyen V), por lo que se mantiene hasta su fase. La pantalla de roles muestra los diferidos con la etiqueta "se aplica en Fase X". `asignado` (Fase 5) y `autorizados` (Fase 7) ya no son diferidos.

### Implicaciones y unión

- La V implícita de C/E/R/A/AN conserva el alcance cuando este limita la vista (`propio`, `estado`, `bitacora`, `asignado`, `autorizados` y los diferidos); para los alcances que solo limitan la operación (`recepcion`, `preparacion`, `borrador`, `uso`, `mantenimiento`, `movimientos`) la V implícita es `total`.
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
- **Cargo en las firmas**: al capturar, firmar, revisar, aprobar, autorizar, liberar, enviar o anular (recepción, procesamiento, extracción, análisis e informes) se guarda el rol con el que se actuó (`*_rol_id`, `*_cargo`, y `actuo_como` en la bitácora). Si un solo rol vigente otorga el permiso se usa ese; si varios, la interfaz pide "Actuar como: <rol>" y envía `X-Actuar-Como`; el servidor valida que ese rol lo otorgue. El PDF del informe muestra el cargo elegido.

## 6 bis. Separación de funciones y segundo usuario (Fase 3)

Catálogos versionados en el repositorio (no se editan desde la aplicación): `src/lib/shared/segregacion.ts` (`VERSION_SEGREGACION`) y `src/lib/shared/acciones-criticas.ts` (`VERSION_ACCIONES_CRITICAS`). Se evalúan en el servidor **por persona**, sin importar cuántos roles tenga ni con qué cargo actúe. "Elaboró" = quien creó el registro y cualquiera que haya editado su contenido (según su bitácora).

| # | Regla de segregación |
| --- | --- |
| 1 | Análisis: quien lo elaboró no lo revisa ni lo aprueba (revisor y aprobador pueden coincidir). |
| 2 | Informe: quien lo elaboró, o elaboró un análisis incluido, no lo revisa ni lo autoriza ("el Analista no validará ni liberará su propio resultado"). |
| 3 | Procesamiento y extracción: quien firma "supervisó" no es quien procesó, extrajo o realizó la limpieza. |
| 4 | Supervisión: el supervisor no da visto bueno a lo que él mismo capturó. |
| 5 | ~~Documentos SGC: quien elaboró no revisa ni aprueba; quien revisó no aprueba.~~ **Retirada** (versión `2026-10-03.1`) por decisión del laboratorio: la Biblioteca no tiene revisión ni aprobación. El número se conserva porque las bitácoras anteriores lo citan. |
| 6 | Segundo usuario: quien solicita una acción crítica no la aprueba. |
| 7 | (Fase 11) Quien reportó una incidencia no la evalúa. |
| 8 | (Fase 11) Quien es o fue responsable de una acción correctiva (no cancelada), o la marcó como implementada, no verifica la eficacia de su NC. |
| 9 | (Fase 11) Quien es o fue responsable de la NC no la cierra (reasignarla no elude la regla). |
| 10 | (Fase 11) Quien suspendió un método o equipo no lo reanuda. |

Violación: 409 con código `segregacion` y la regla concreta. Las excepciones se piden como solicitud `excepcion_segregacion` (la aprueba A en calidad) y quedan registradas en el registro, en la bitácora y, en informes, en el PDF.

| Acción crítica (crea solicitud; no se ejecuta hasta aprobarla) | Aprueba (segundo usuario) |
| --- | --- |
| Anular o restaurar recepción, procesamiento, extracción o análisis que ya no esté en borrador/registrado (incluye el análisis aprobado) | AN del mismo módulo |
| Anular un informe autorizado, liberado o enviado | AN en informes |
| Excepción de segregación | A en calidad (Responsable General / Mejora Continua) |
| Asignar un rol a un usuario (también el rol inicial de una cuenta nueva) | A en usuarios (Responsable General) |
| Reactivar una cuenta dada de baja | A en usuarios |
| Ampliar la vigencia de una cuenta temporal | A en usuarios |
| Rechazar una recepción o aceptarla con desviación (Fase 5) | A en muestras (Coord. Área Técnica); directo si quien la registra ya tiene muestras:A |
| Cambiar el folio de una recepción ya creada (Fase 5) | A en muestras |
| Reabrir una recepción cerrada o rechazada (Fase 5) | A en muestras |
| Anular una incidencia o una no conformidad (Fase 11) | AN en calidad |
| ~~Declarar obsoleto un documento vigente (Fase 7, `obsoletar_documento`)~~ | **Retirada** (`VERSION_ACCIONES_CRITICAS` `2026-10-03.1`): ya no se puede pedir. Una solicitud vieja que siga pendiente se muestra como «Acción retirada», sin aprobar ni rechazar (410); quien la pidió puede cancelarla y si no vence sola |

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
| Liberar informe (Fase 6) | informes A | `liberacion_informe` |

Otorgan y revocan (con motivo, reautenticación y bitácora): quien tiene `ensayos:A` o `calidad:A` (Coord. Área Técnica, Mejora Continua, Responsable General); no el Administrador técnico; nadie a sí mismo (409). `AUTORIZACIONES_OBLIGATORIAS=false` desactiva la validación solo para cargar datos iniciales.

## 6 quater. Asignación de muestras y firmas por cuenta (Fase 5)

- **Asignación**: asigna y reasigna quien tiene `muestras:A` (Coord. Área Técnica). Regla operativa: crear o editar procesamiento, extracción o análisis (y enviar a revisión o enmendar) exige estar asignado a la recepción, salvo la **coordinación** (`muestras:A` o `ensayos:A`); sin asignación, 403 `no_asignado`. Al asignar se avisa (sin bloquear) si a la persona le faltan autorizaciones FX-THF-AP de los análisis solicitados.
- **Alcance `asignado`**: se aplica desde la Fase 5 (ya no es diferido); ver sección 3.
- **Firmas**: recibió, procesó, supervisó, extrajo, limpió y analista se eligen de las cuentas activas y se guarda su `usuario_id` y cargo. Si el firmante no es quien tiene la sesión, confirma con su contraseña (token de firma de un solo uso). Los firmantes de trabajo técnico (procesó, extrajo, limpió, analista) necesitan la autorización FX-THF-AP de la actividad y el método.
- **Regla 3 por cuenta**: supervisó ≠ procesó/extrajo/limpió se compara por `usuario_id` cuando ambas firmas están ligadas a cuentas (con los nombres escritos solo como respaldo para registros sin cuenta).
- **Análisis**: el analista envía a revisión (desde ahí no edita); el revisor (ensayos:R) puede devolver con observaciones; un aprobado se corrige solo con enmienda versionada (ensayos:C), y la original queda sustituida al aprobarse la enmienda.

## 6 quinquies. Informes: autorizar, liberar y enviar (Fase 6)

- **Autorizar** (`informes:A` + `autorizacion_informe`): solo firma; no genera PDF ni mueve la recepción.
- **Liberar** (`informes:A` + `liberacion_informe`, con reautenticación): genera el PDF final con SHA-256, congela resultados y lleva la recepción a `liberada`. Puede hacerlo quien autorizó. Un liberado ya no se edita; se corrige por enmienda.
- **Enviar** (`informes:A`): solo informes liberados o ya enviados; envío manual con evidencia (siempre) o SMTP (si está configurado); confirmación de recepción por envío. Los correos y evidencias solo los ve quien tiene `informes:V`; la bitácora muestra el correo parcialmente oculto.
- **Requiere enmienda**: si se aprueba la enmienda de un análisis incluido en un informe autorizado, liberado o enviado, el informe no se libera ni se envía hasta liberar su enmienda.
- **Revisar un análisis** (`ensayos:R`) exige que el analista lo haya enviado a revisión.

## 6 sexies. Evidencia instrumental y respaldos (Fase 10)

- **Evidencia instrumental** (sección 7, etapa "Resultados"): adjuntar y anular usan las mismas reglas que editar el análisis (`exigirAnalisisEditable`, `exigirAsignacion`, `exigirAutorizaciones`); con una cuenta supervisada el análisis vuelve a quedar pendiente del visto bueno. Adjuntar o anular evidencia cuenta como "elaboró" para la segregación (regla 1: quien la adjuntó no revisa ni aprueba ese análisis). Ver y descargar: `ensayos:V` con su alcance; Mariana (Técnico Auxiliar), Patricia (Responsable General), el Auditor y el revisor la ven; Jorge (Administrador técnico, sin ensayos) no.
- **Respaldos** (sección 9, "El Administrador técnico ejecutará respaldos y pruebas de recuperación"): la pantalla la ve quien tiene `usuarios:G` (crea respaldos) o `calidad:V` (solo lectura: Mejora Continua, Auditor, Responsable General, coordinaciones con calidad). Los avisos de respaldo y de prueba de restauración llegan a `usuarios:G` y `calidad:A`.

## 6 septies. Incidencias y no conformidades (Fase 11)

- **Reportar no pasa por supervisión**: un Estudiante o una cuenta temporal supervisada reporta directo (queda "reportada"); reportar un problema nunca se frena. La evaluación sí la hace otra persona (regla 7).
- **Reglas 7–10** en `src/lib/shared/segregacion.ts` (desde la versión `2026-09-29.1`; la `2026-10-03.1` retira la regla 5), evaluadas por persona. La excepción de segregación existente aplica (solicitud `excepcion_segregacion` sobre `incidencias`, `no_conformidades` o `suspensiones`, aprobada por A en calidad).
- **Incidencias automáticas**: las "reporta" la persona que causó el evento (quien decidió la recepción o capturó con el equipo no apto); las alertas de integridad, "Sistema". No se crean si falla la transacción del evento.
- **Admin técnico** (`calidad:V bitacora`): ve la bitácora (y en ella los eventos de calidad sin datos ni motivo; la búsqueda por motivo no los alcanza; tampoco el motivo de suspender, reanudar, retener o liberar registrado sobre equipos e informes), pero no incidencias ni NC, ni sus solicitudes (`/api/solicitudes?entidad=…` aplica la visibilidad de la ficha).
- **Ligar registros**: al reportar solo se ligan registros cuyo módulo la persona puede ver (V; con `asignado`, solo recepciones asignadas o propias; con `autorizados`, solo documentos de la Biblioteca visibles para todos o para su rol); si no, 404 como si no existiera. Lo mismo al marcar un informe como afectado (informes:V).
- **Responsables**: de una NC o de una acción solo se nombra a alguien con cuenta vigente y calidad:V sobre ese objeto (el Admin técnico no); el responsable de la NC la edita con C, E, R, A o AN. Quien es responsable solo de una acción ve la NC completa (incluidas comunicaciones con el cliente), salvo el detalle de incidencias ajenas agrupadas (solo folio y estado).
- **Retenciones en el informe**: la ficha del informe muestra la NC que lo retiene; el motivo, solo con calidad:V total.
- **Suspensiones activas** (`/api/calidad/suspensiones/activas`, avisos de los formatos): ensayos:V, equipos:V o calidad:V; muestran método o equipo y folio de la NC (dato operativo: el equipo ya aparece "fuera de servicio"), nunca el motivo.
- No se agregaron permisos al catálogo: la matriz de calidad (C incidencias en los operativos; C R en Coord. Técnica; V R A AN en Responsable General; G R A AN en Mejora Continua; C E en I+D; V en el Auditor, cuyo C E `auditoria` sigue diferido y por eso no reporta incidencias) ya cubre la tabla de la fase.

## 6 octies. Biblioteca de documentos (reemplaza el flujo de control documental)

**Decisión confirmada por el laboratorio**: Calidad › Documentos funciona como **biblioteca de consulta** y reemplaza el flujo de control documental de la sección 6 de la especificación. El módulo de permisos sigue siendo `documentos` (no cambia la matriz); cambia la **interpretación** de sus acciones:

| Acción | En la Biblioteca |
| --- | --- |
| `V` | Ver la lista, leer en el visor y descargar. Con alcance `autorizados` (Estudiante), solo los documentos visibles para **todos** o para **alguno de sus roles**. |
| `C` | Subir un documento o una versión nueva. El alcance `borrador` del Técnico Analista cuenta como subir (ya no hay borradores que revisar). |
| `E` | Editar los datos (título, clave, categoría, etiquetas, visibilidad) del documento **propio** (quien lo subió). |
| `G` | Editar cualquier documento y administrar las categorías; también archiva y restaura. |
| `AN` | Archivar y restaurar, con motivo y reautenticación (`G` también puede). Nada se borra. |
| `R`, `A` | Sin efecto: no hay revisión ni aprobación de documentos. |

- Los alcances diferidos `tecnico`, `investigacion` y `administrativo` se comportan como `total` en la Biblioteca (no hay tipos de documento que filtren).
- **Retirado**: la regla de segregación 5, la acción crítica `obsoletar_documento`, las propuestas de documento (también la «propuesta documental» desde una NC: 410; la bandera «requiere cambio documental» se conserva con su nota), la lista maestra, la distribución y el acuse de lectura, y los avisos del Inicio y la campana («Documentos por leer», «por revisar/aprobar/publicar»).
- **Solo lectura**: las tablas `documentos_sgc`, `distribucion_documento` y `propuestas_documento` se conservan sin uso. `GET /api/documentos-sgc/:id` y su `/archivo` siguen respondiendo con `documentos:V` (historial y registros ligados); las demás rutas de `/api/documentos-sgc` responden **410** `{ codigo: "retirado" }`. La migración 13 copió a la Biblioteca los documentos con archivo.
- `/api/documents` (reportes de mantenimiento, módulo `equipos`) no cambia.

## 7. Decisiones pendientes de validar con Mejora Continua

1. **AN (anular con justificación)**: la matriz original no lo asignaba a ningún rol. Se propuso y se cargó: Coord. Área Técnica en muestras, ensayos, informes, equipos e inventario; Mejora Continua en documentos y calidad; Responsable General en todo excepto usuarios (anulaciones excepcionales). La aprobación de un segundo usuario llega en Fase 3.
2. **Responsable General en usuarios**: la matriz dice "V/A"; desde la Fase 3 es V A y aprueba las asignaciones de rol, reactivaciones y ampliaciones de vigencia (solicitudes de segundo usuario).
3. **A de informes de la Coord. Técnica** (resuelto en la Fase 4): la A de informes solo se ejerce con la autorización FX-THF-AP `autorizacion_informe` vigente (y R con `revision_informe`); ver 6 ter.
4. **Interpretación de módulos**: muestras = recepción y custodia; ensayos = procesamiento, extracción y análisis (reconcilia la matriz con la sección 7).
5. **Anclas de las reglas 1 y 2** (`usuarios:G` y `compras:G`) y la lectura de las celdas con paréntesis (sección 3).
6. **Reportes de mantenimiento**: pasan del módulo documentos (entonces apagado) a `equipos` (V para verlos, C con alcance `mantenimiento` para generarlos).
7. **Uso de equipos e insumos al capturar**: se exige `equipos:C` / `inventario:C` además de `ensayos:C`.
8. **Alcances diferidos en calidad** (resuelto en la Fase 2 y, para `incidencias`, en la Fase 11): en calidad un diferido es *sin acceso*; `incidencias` ya se aplica con su alcance real (sección 3).
9. **Supervisión de cuentas temporales** (Fase 2): además del alcance `supervisado`, todo lo que captura una cuenta temporal con supervisor queda pendiente de visto bueno. Validar si una estancia temporal con rol de Técnico Analista debe quedar supervisada o no.
10. **Segregación en documentos** (Fase 3; **retirada** con la Biblioteca, ver 6 octies): el modelo tiene un solo paso de revisión; la regla "revisor de calidad, revisor técnico y aprobador no pueden ser todos la misma persona" se aplica como revisor distinto del aprobador. Resuelto en la Fase 7: revisión de calidad (documentos:G) y revisión técnica (documentos:R, si el documento la requiere) separadas; quien elabora envía a revisión; quien hizo la revisión de calidad no aprueba.
11. **`usuarios:G` ya no implica A** (resuelto en la Fase 3.1): el Administrador técnico administra cuentas y roles, pero las asignaciones de rol, reactivaciones y ampliaciones de vigencia las aprueba solo quien tiene `usuarios:A` explícito (Responsable General). En los demás módulos G sigue implicando todo. La guarda de `usuarios:A` ahora sí aplica por separado.
12. **Cambios de permisos de un rol ya asignado** (acotado en la Fase 3.1): quien tiene `usuarios:G` los hace sin segundo usuario (con motivo, reautenticación y bitácora), pero nunca sobre un rol que él mismo tiene vigente (409 `rol_propio`). Validar si además deben pasar por solicitud.
13. **Regla 3 por cuenta** (resuelto en la Fase 5): procesó, extrajo, limpió y supervisó se eligen de las cuentas activas y la regla compara `usuario_id`; solo los registros antiguos con nombre escrito se comparan por nombre.
