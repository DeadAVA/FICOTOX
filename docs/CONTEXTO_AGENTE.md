# Contexto completo de FICOTOX (para retomar el trabajo en una sesión nueva)

Pega este archivo como primer mensaje en una sesión nueva. Describe qué es la
plataforma, dónde está cada recurso, qué se implementó, qué reglas no se deben
reabrir y cómo se prueba.

---

## 1. Qué es esto

FICOTOX es el LIMS (sistema de gestión de laboratorio) del **Laboratorio Nacional
de Análisis, Monitoreo e Investigación sobre Ficotoxinas asociadas a
Florecimientos Algales Nocivos (LN-FICOTOX)** del **CICESE**, en Ensenada, Baja
California. El laboratorio analiza toxinas marinas (ácido domoico / ASP, toxinas
lipofílicas / DSP, toxinas paralizantes / PSP) en moluscos y agua de mar, y
trabaja bajo **ISO/IEC 17025**. La plataforma tiene que sostener esa acreditación:
cada registro debe ser trazable, atribuible, revisado y aprobado.

Trabajo en curso dentro del proyecto **PVVC 2026** (Axel es quien desarrolla).

## 2. Rutas de todo lo que hay que consultar

| Qué | Dónde |
| --- | --- |
| **Repo actual (en el que se trabaja)** | `/Users/axeldiaz/Desktop/cicese/inventory/FICOTOX` |
| **Versión original en Flask** (referencia de lógica portada) | `/Users/axeldiaz/Desktop/cicese/inventory_test/FICOTOX` (carpetas `backend/`, `frontend/`, `docs/`) |
| **Recursos oficiales del laboratorio** | `/Users/axeldiaz/Downloads/ficotox` |
| Página visual "Radiografía de FICOTOX" (diagnóstico inicial) | https://claude.ai/code/artifact/7e556e70-d2cb-429c-999e-2c4c523448b2 |

Contenido de `/Users/axeldiaz/Downloads/ficotox` (son los formatos y manuales
reales del laboratorio; **la implementación debe ser fiel a ellos**):

- `Recepcion de Muestras.docx` — formato **FX-TCF-GMR** (catálogos de análisis y
  método, tipos de muestra, los 7 requisitos de inspección visual, firmas).
- `Procesamiento Muestras.docx` — formato de procesamiento.
- `Extraccion ASP.docx` — formato **FX-TCF-GME-A** (ácido domoico).
- `Extraccion DSP.docx` — formato **FX-TCF-GME-D** (toxinas lipofílicas).
- `FX-MC-1-1.pdf` — **Manual de Calidad** del laboratorio (referencia ISO 17025:
  7.4.3 aceptación y desviaciones, 7.4.4 disposición, 7.5 registros, 7.7 control
  de calidad, 7.8 informes, 7.11 datos, 8.3 control de documentos).
- `Flujo de trabajo FICOTOX.pdf` — diagrama del flujo completo.
- `PVVC-FICOTOX-2026-2-Introduccion-Axel-Emiliano.pdf` — inducción del proyecto.

## 3. Stack y arquitectura

- **Next.js 16 (App Router)**, React 19, TypeScript, Tailwind 4.
- Base de datos: **SQLite por defecto** (`better-sqlite3`, archivo
  `instance/ficotox.sqlite3`); MySQL opcional (`mysql2`). SQL crudo con
  parámetros `:nombre`, y **cada consulta debe funcionar en los dos motores**
  (ojo: `||` es concatenación en SQLite pero OR lógico en MySQL → usar `CONCAT`).
- Sesión: JWT con `jose`. Contraseña local con scrypt (`src/lib/server/password.ts`).
  También hay login con Microsoft Entra ID.
- **RBAC** por módulo/acción: `requirePermission(s, user, "modulo", "accion")`.
  Módulos: `dashboard, reactivos, consumibles, equipos, muestras, movimientos,
  mantenimiento, documentos, informes, aprobaciones, auditoria, roles, usuarios`.
  Acciones: `read, create, update, delete`.
- Todos los handlers pasan por `apiRoute` (`src/lib/server/http.ts`), que abre una
  sesión de base, hace `commit` al final o `rollback` si algo falla.
- Esquemas: funciones `ensure*Schema()` (creación idempotente de tablas y
  columnas). **Se ejecutan una sola vez por proceso** (registro compartido en
  `src/lib/server/schema.ts`) y **ninguna hace `commit`**; solo `bootstrap.ts`
  confirma el DDL en su propia transacción.
- Cliente: componentes en `src/components`, catálogos compartidos
  servidor+cliente en `src/lib/shared/`, estado con `useResource`/`invalidate`
  (`src/lib/client/store.ts`).
- PDFs de informes con `pdfkit` (`src/lib/server/informe-pdf.ts`): cabecera y pie
  en cada página, secciones (cliente, ítems ensayados, métodos, resultados con
  conformidad en color, declaraciones, elaboró/revisó/autorizó). Al dibujar el
  pie se pone `doc.page.margins.bottom = 0` y `lineBreak:false`; si no, pdfkit
  agrega páginas en blanco. Se verifica con `pdftoppm -png` sobre `instance/informes/`.

## 4. Qué hace la plataforma hoy

### Inventario
Reactivos, consumibles, equipos (con clave de bitácora y estado de calibración),
mantenimientos y movimientos de entrada/salida. Importación desde Excel.
**Nada se elimina**: baja lógica con motivo (`activo`, `baja_motivo`, `baja_en`,
`baja_por`) y reactivación. Los mantenimientos se cancelan con motivo.

### Muestras (flujo completo)
`Recepción → Procesamiento → Extracción (ASP o DSP) → Análisis → Informe → Disposición final`

- **Recepción** (folio `R`, formato FX-TCF-GMR): catálogos oficiales, inspección
  visual de 7 requisitos con C/NC/NA, **decisión de aceptación** (aceptada /
  aceptada con desviación / rechazada) con comunicación al cliente obligatoria
  cuando hay NC (7.4.3), custodio y resguardo, firmas.
- **Procesamiento** (folio `P`): solo desde una recepción aceptada.
- **Extracción**: dos formatos con **series de folio independientes**, `E-A`
  (ASP, FX-TCF-GME-A) y `E-D` (DSP, FX-TCF-GME-D). Pasos, equipos con folio de
  bitácora, reactivos descontados **por tubo**.
- **Análisis** (folio `A`): tipo, método, equipo, condiciones, resultados por
  muestra (unidad, LD, LC, incertidumbre, límite regulatorio, conformidad),
  controles de calidad (blanco, material de referencia, duplicado), revisión y
  aprobación.
- **Informe de resultados** (folio `IR`, versionado): borrador → en revisión →
  autorizado (congela resultados, genera el PDF con SHA-256, marca la recepción
  como informada) → entregado. Correcciones por **enmienda** (v+1); el original
  pasa a `sustituido` y su PDF se regenera con la leyenda "sin validez" (7.8.8).
- **Disposición final** de remanentes (7.4.4): cierra la muestra. También se
  registra en muestras rechazadas (p. ej. devuelta al cliente).

### Documentos del SGC (8.3)
Clave `FX-<área><tipo>-<siglas>` (de la clave se derivan tipo y área), revisiones,
envío a revisión, aprobación (la revisión vigente anterior pasa a obsoleta),
lista maestra, obsolescencia, archivos con SHA-256.

### Bitácora de auditoría (7.5.2, 7.11)
Tabla `auditoria` de solo inserción (triggers abortan `UPDATE`/`DELETE` en SQLite
y MySQL). Cada entrada guarda usuario, fecha/hora, acción, entidad, referencia,
motivo, el dato anterior y el nuevo, y un **sello HMAC-SHA256 encadenado** al
sello previo. Página `/auditoria` con filtros y **Verificar integridad** (detecta
alteración, filas borradas al final, huecos intermedios y falta de triggers).

## 5. Reglas de negocio que NO se deben reabrir sin preguntar

Son decisiones explícitas del usuario o correcciones de auditoría ya validadas:

1. **Nada se borra.** Los registros técnicos se **anulan con motivo** (mínimo 5
   caracteres) y se pueden restaurar; `DELETE` responde **405**. Inventario y
   usuarios: baja lógica. Excepción única: un rol sin usuarios sí se elimina, y
   queda en la bitácora como acción `eliminar`.
2. **Folio por tipo de extracción**: `UNIQUE(tipo_registro, folio_num)`; E-A y E-D
   llevan series separadas.
3. **Equipo vencido / no operativo**: se **advierte y se pide confirmación**, no se
   bloquea (el catálogo de equipos aún no está validado con la coordinadora).
4. **Insumo fijo que no existe en inventario** (NaOH 2.5 M, HCl 2.5 M, soluciones
   preparadas): se avisa y se guarda sin descuento; solo el stock insuficiente
   bloquea.
5. **Regla de dos personas apagada** (`TWO_PERSON_RULE = false` en
   `src/lib/shared/features.ts`, decisión de Axel 2026-09-11): cualquier persona
   con permiso de aprobaciones revisa/aprueba/autoriza aunque haya capturado. El
   código de la excepción (`permitir_misma_persona` + motivo) sigue ahí por si se
   vuelve a encender. El **cargo** de quien firma sale de `user.rol`; no se
   captura a mano (los `SignDialog` de análisis e informes usan `withCargo={false}`).
6. **Permisos**: un permiso ausente en un rol significa "no concedido".
   `ensureRbacSchema` solo rellena roles administradores o módulos cuya clave
   aparece por primera vez; **nunca amplía lo que un rol ya tenía**.
7. **Insumos dados de baja**: no se pueden elegir en un registro nuevo (409), pero
   un registro que ya los declaraba se sigue editando y repone **hasta la
   cantidad que ya tenía**.
8. **Esquemas**: ninguna `ensure*Schema()` hace `commit`. Si se rompe eso, el
   rollback de los handlers deja de funcionar (fue un bug real que corrompió
   inventario).
9. **Bitácora**: la llave del sello es `SECRET_KEY` o, si no está configurada,
   `instance/auditoria.key` (aleatoria, autogenerada, gitignored). **Respaldarla
   junto con la base**: si cambia, la verificación de lo ya escrito falla.
10. **Transiciones**: solo hacia adelante
    (`registrada → aceptada → en_proceso → analizada → informada → cerrada`).
    Estados bloqueados por tabla en `LOCKED_STATES` (`src/lib/server/samples-flow.ts`).

## 6. Archivos clave

**Servidor**
- `src/lib/server/samples-flow.ts` — reglas comunes del flujo: `ANULADO_VALUE`,
  `LOCKED_STATES`, `assertEditable`, `assertOrigin`, `advanceState`,
  `anularRegistro`, `restaurarRegistro`, `nextFolioNum`, `isFolioConflict`,
  `applyStageInventory`, `insumosDeclarados`.
- `src/lib/server/audit.ts` — bitácora, sello HMAC, triggers, `verifyAuditChain`.
- `src/lib/server/rbac.ts` — permisos y back-fill controlado.
- `src/lib/server/inventory-usage.ts` — descuento y reposición de inventario.
- `src/lib/server/inventory-baja.ts` — bajas lógicas.
- `src/lib/server/informe-pdf.ts` — render del informe (7.8.2).
- `src/lib/server/schema.ts` — helpers de migración + memoización de esquemas.
- `src/lib/server/bootstrap.ts` — arranque: crea y confirma todos los esquemas.
- `src/lib/server/modules/` — `auth`, `admin`, `dashboard`, `inventory`,
  `consumables`, `documents`, `documentos-sgc`, `informes`, `audit`,
  `traceability`, y `samples/{recepcion,procesamiento,extraccion,analisis}.ts`.

**Compartido**
- `src/lib/shared/sgc.ts` — catálogos oficiales, estados, etiquetas, límites
  regulatorios, identidad del laboratorio, tipos/áreas de documento.
- `src/lib/shared/extraction.ts` — tipos de extracción, claves y folios.

**Cliente**
- `src/components/features/samples/` — `ReceptionForm`, `ProcessingForm`,
  `ExtractionForm` (+ protocolos `extraction/asp.tsx` y `dsp.tsx`),
  `AnalysisForm`, `SignDialog`, `SignaturePad`, `FormLayout` (`FormPage` con
  `readOnly` y `after`), `RecordLoader`, `status.tsx`, `useAnulacion.ts`.
- `src/components/features/informes/InformeForm.tsx`,
  `src/components/features/documentos/DocumentoSheet.tsx`,
  `src/components/features/audit/RecordHistory.tsx`.
- Páginas: `src/app/(app)/{muestras,inventario,informes,documentos,auditoria,movimientos,administracion}`.

**Documentación** (mantenerla al día): `MANUAL_USUARIO.md`, `MANUAL_TECNICO.md`,
`docs/EXPLICACION_PROYECTO.md`, `docs/DISENO_UI.md`, `docs/VALIDACION.md`,
`docs/backups.md`.

## 7. Cómo se prueba (¡importante!)

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint — baseline: 12 problemas preexistentes
npm run build         # build de producción
npm test              # API + navegador
npm run test:api      # solo API
npm run test:reset-db # solo regenerar la base de prueba
```

- **NUNCA tocar `instance/ficotox.sqlite3` (base real).** `npm test` copia
  `instance/fixtures/ficotox-base.sqlite3` (copia congelada de la base **antes**
  de los datos de demostración; si no existe usa la real) a
  `instance/test/ficotox-test.sqlite3`, agrega el usuario QA y levanta
  `next dev -p 3100` sobre la copia; aborta si el puerto está ocupado o si el
  servidor no está usando la copia.
- Usuario de prueba: **`qa@ficotox.local` / `QaFicotox2026!`**. Los usuarios que se
  creen por API deben tener correo **`@cicese.mx`**.
- Suites: `tests/api-dsp.mjs` (30), `tests/api-sgc.mjs` (105),
  `tests/api-permisos.mjs` (9, corre **tras reiniciar** el servidor),
  `tests/ui/dsp.mjs` (19), `tests/ui/sgc.mjs` (35),
  `tests/api-integridad.mjs` (7, corre **al final** porque rompe la bitácora).
- Navegador: `playwright-core` + Chrome de Playwright en
  `~/Library/Caches/ms-playwright/chromium-1234/...` (override con `CHROME_PATH`).
- **Baseline de lint**: 12 problemas en `ConsumibleSheet.tsx`, `ReactivoSheet.tsx`,
  `AppShell.tsx` y `administracion/roles/page.tsx`. Cualquier otro es un hallazgo.

## 8. Estado actual (2026-09-10)

- Rama `main`, último commit `83468fd` ("Migrar a Next.js, rediseñar la interfaz y
  añadir contraseña local"). **Hay ~88 archivos nuevos/modificados SIN commitear**
  (todo el trabajo ISO descrito arriba). El usuario aún no ha pedido commit.
- `typecheck` limpio · `lint` en el baseline exacto · `build` OK ·
  `npm test`: **208/208 comprobaciones, todas las suites pasan** (ui/sgc 38).
- El trabajo pasó por **tres rondas de revisión con un agente independiente**
  (29 hallazgos, todos corregidos) hasta obtener `VEREDICTO: APROBADO`.
- **Rediseño UI/UX "estilo Apple" (2026-09-10)**, también sin commitear: una sola
  tipografía (sistema/Inter), marca nueva (diatomea), **barra lateral** en cuatro
  grupos (`NAV_GROUPS`), búsqueda compartida entre el Inicio y ⌘K
  (`src/lib/client/search.ts`), Inicio con buscador + "En curso" + "Avisos"
  (**v2 2026-09-11**: `GET /api/inicio/en-curso` y `/api/inicio/avisos` en
  `src/lib/server/modules/inicio.ts`; flujo por recepción con siguiente paso,
  avisos con detalle en HoverCard, "Lo último", ayuda en `/ayuda`; el buscador
  indexa mantenimientos y ofrece acciones generales, vistas por estado, temas
  de ayuda, recientes y ámbitos; ver `docs/DISENO_UI.md`),
  listas con segmentos y ficha de detalle en inventario (`DetailSheet`), formatos
  con guía de secciones, completitud, modo paso a paso / mostrar todo, `Callout`,
  `Panel`, `SignoffCard`, `FlowSteps`, `FormTable`, `FieldGroup`, `ChoiceGrid cols`
  y menú "Más acciones" (`FormPage` v4; lote y resultados como tarjetas por muestra).
  Las pruebas de UI eligen el radio "Todo" antes de llenar un formato nuevo.
  `html`/`body` llevan `overscroll-behavior: none` (sin rebote con huecos).
  `main` ya no limita el ancho: lo hacen `PageBody` (1216 px) y `FormPage`
  (cabecera a todo lo ancho, cuerpo 1120 px). Scroll-spy propio en modo Todo.
- Mantenimiento ↔ equipo: `syncEquipoEstado` (inventory.ts) recalcula el estado del
  equipo al crear/editar/cancelar mantenimientos (cualquier pendiente → `mantenimiento`;
  ninguno → `operativo` si estaba en mantenimiento; `fuera_servicio` y `calibracion_pendiente`
  manuales no se tocan); completar exige `fecha_realizado` y acepta `proxima_calibracion`.
  `EQUIPO_SELECT` expone el pendiente (`mantenimiento_tipo/fecha/estado`); la lista
  muestra "Calibración vencida" derivado por fecha. `StockMeter` recibe current/max/min/low;
  reactivos tienen sección "Existencias" (`cantidad_actual` explícita manda) y consumibles
  `stock_maximo` propio. Contadores del Inicio
  (`inventorySummary`, dashboard) con las mismas reglas que los filtros de las listas
  (`isReactivoLow` en `lib/client/reactivos.ts`); Mantenimiento abre en "Pendientes".
- Módulos apagables: `src/lib/shared/features.ts` (`FEATURES`, `HIDDEN_MODULES`). **Documentos
  está apagado** (2026-09-11, pedido de Axel): sin menú, sin aviso en Inicio, sin búsqueda, sin fila
  en roles, y `/documentos` responde notFound. API, tabla `documentos_sgc`, archivos y pruebas de API
  siguen; para reactivar basta `documentos: true`.
- Personal: `GET /api/auth/personal` (activos + `puede.{muestras,aprobaciones,informes,inventario}`),
  `usePersonal`/`PersonSelect` (`features/samples/PersonSelect.tsx`) en `PersonCard` y campos de
  "quién"; `formatActiveUserSignature()` ahora devuelve solo el nombre. Autollenado:
  `findUniqueOperativeEquipo` (operativo y calibración vigente), `equipos.ultimo_folio_bitacora`
  (`recordBitacoraFolios` al guardar extracción/análisis) → `nextBitacoraFolio`, `FixedField.folioField`
  (lote → folio de preparación), `suggestForTipo` en análisis. Secciones `optional` no bloquean;
  `missingSections` bloquea el guardado.
- Historial y Auditoría en lenguaje llano: `src/lib/client/audit-humanize.ts`
  (frase por entrada, hechos, cambios etiquetados; nuevos campos → añadir a
  `FIELD_LABELS`/`HIDDEN_FIELDS`) y `features/audit/AuditTimeline.tsx`.
  Detalle en `docs/DISENO_UI.md`.
  Ninguna API, esquema ni regla de negocio cambió.
- **Auditoría contra los formatos oficiales (2026-09-10)**: se compararon
  `Recepcion de Muestras.docx`, `Procesamiento Muestras.docx`, `Extraccion ASP.docx`
  y `Extraccion DSP.docx` con los formularios. Ajustes: procesamiento con los pasos
  exactos del FX-TCF-GMP (~10 organismos, cronómetro en "Drenar", "Pesar la molienda"
  como paso propio con balanza y peso; columnas `tipo_organismo_otro` y
  `parte_organismo_otro`); ASP con folio de preparación de reactivo (metanol:agua y
  ácido acético 10 %), cartucho SAX, filtro y vial como consumibles; recepción con
  detalle del lugar de resguardo (CO1/CO2/CO3, RE1). DSP ya coincidía paso a paso.
- **Datos de demostración** cargados en la base real el 2026-09-10 con
  `scripts/demo-seed.mjs` (respaldo previo en `instance/backups/ficotox-antes-demo-*`).
  Usuarios demo: ana.ramirez@, daniela.cortes@, ernesto.gomez@cicese.mx (contraseñas
  en el script). Cadena de auditoría íntegra tras la carga.

## 9. Pendientes conocidos

1. **Confirmar con la coordinación técnica** los límites regulatorios precargados
   (marcados "por confirmar" en `sgc.ts`: ASP 20 µg/g, DSP 160 µg/kg,
   PSP 80 µg/100 g) y las claves oficiales de los formatos de análisis (`FX-TCI-…`)
   y de informe (`FX-TCF-IR`).
2. **Formatos que el laboratorio aún no entrega**: PSP, pigmentos, sedimentos. Se
   agregan como "protocolo" en `src/components/features/samples/extraction/` más
   el tipo en `src/lib/shared/extraction.ts`; el servidor no cambia.
3. **Inventario**: "cuánto queda" vive en varias columnas de `reactivos`; la
   alerta de stock bajo compara `cantidad_actual <= stock_minimo` (0<=0 marca
   todo); no hay lotes; caducidad y calibración son solo informativas; falta
   historial de verificación de equipos y registro de preparación de reactivos.
4. **Migraciones no versionadas** (`ensure*Schema()` en vez de migraciones con
   número de versión).
5. Validar el sistema en MySQL (hasta ahora todo se probó en SQLite).
6. **Catálogo de clientes/solicitantes** (la inducción PVVC lo lista como dato
   maestro): hoy el solicitante es texto libre en la recepción.
7. **Registro de preparación de reactivos** (folio FX-TCR-PR-…): los formatos ASP
   piden ese folio; el sistema lo captura como texto, sin módulo propio.

## 10. Cómo le gusta trabajar a Axel

- **En español**, explicaciones simples y con ejemplos de la vida real; lo técnico
  solo si lo pide.
- Flujo que pide siempre: **lista de lo que se hará → implementar completo →
  revisor independiente (otro agente) → iterar hasta que apruebe → resumen final
  del estado de la plataforma**.
- No commitear salvo que lo pida.
