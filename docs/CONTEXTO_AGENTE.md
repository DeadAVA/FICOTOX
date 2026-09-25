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
| **Repo actual (en el que se trabaja)** | `/Users/axeldiaz/Desktop/dev/cicese/inventory/FICOTOX` |
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
  Desde la Fase 3 el acceso es solo con usuario y contraseña del sistema (se retiró Microsoft Entra ID).
- **Permisos (Fase 1)**: `requirePermission(s, user, modulo, accion, contexto?)`
  (`src/lib/server/rbac.ts`). Módulos: `usuarios, documentos, muestras, ensayos,
  informes, equipos, inventario, calidad, compras` (ya no existe `aprobaciones`).
  Acciones: `V C E R A AN G` con **alcance** por permiso. Varios roles por persona
  con vigencia (`usuario_roles`); permisos = unión de los vigentes, calculados en
  cada petición (el JWT solo identifica). Cargo con el que se actúa:
  `cargoActuante` + encabezado `X-Actuar-Como`. Todo en **`docs/CATALOGO_PERMISOS.md`**;
  matriz en `scripts/roles-catalogo.json`.
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
5. **Separación de funciones siempre activa** (Fase 3; `src/lib/shared/segregacion.ts`):
   quien elabora no revisa ni aprueba lo suyo, por persona. Las excepciones solo por
   solicitud de segundo usuario (`excepcion_segregacion`). Ya no existen
   `TWO_PERSON_RULE` ni `permitir_misma_persona`.
6. **Permisos**: un permiso ausente en un rol significa "no concedido".
   `ensureRbacSchema` **no crea roles ni rellena permisos** (Fase 0: se quitó el
   rol "Super Admin" y el relleno por nombre de rol / `es_sistemico` / módulo
   nuevo). Solo asegura las tablas y el catálogo de módulos. Ninguna verificación
   usa el nombre de un rol: las reglas de combinación usan permisos o `roles.clave`.
11. **Siempre queda un administrador**: un cambio (revocar, desactivar, dar de
    baja, editar permisos) que deje en cero a los usuarios activos con
    `usuarios:G` vigente, o que deje solo administradores con fecha de fin,
    responde 409 (`assertAdministratorRemains`, `rbac.ts`).
    "Administrador técnico del sistema" es `es_sistemico` (no se elimina).
12. **Combinaciones prohibidas** (`src/lib/shared/combinaciones-roles.ts`, no
    editable en la UI): se evalúan al asignar roles y al editar permisos de un rol.
13. **Nadie se asigna ni se revoca roles a sí mismo** (403). Nada se borra en
    `usuario_roles`: revocar llena las columnas de revocación.
14. **E solo en borrador**: un análisis revisado/aprobado o un informe en revisión
    ya no se editan (se anulan o se enmiendan).
15. **Commits sin "Co-Authored-By: Claude" ni "Generated with Claude Code"**
    (decisión de Axel, Fase 1; `.claude/settings.json` lo desactiva).
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
- `src/lib/server/rbac.ts` — permisos, catálogo de módulos y guarda de administradores
  (`countActiveAdministrators`, `assertAdministratorRemains`).
- `scripts/roles-catalogo.json` + `scripts/seed-roles-usuarios.mjs` — catálogo de roles
  de la Fase 0 y alta idempotente de roles y usuarios (contraseñas en
  `scripts/seed-usuarios.local.json`, ignorado por git; plantilla `.example.json`).
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
  `instance/fixtures/ficotox-base.sqlite3` (base vacía + los 10 roles y usuarios
  de la Fase 0; se genera con `npm run test:fixture` y `npm test` la crea si
  falta) a `instance/test/ficotox-test.sqlite3`; **solo en la copia** crea el rol
  "QA pruebas automatizadas" (todos los permisos) y el usuario QA, y da
  contraseñas aleatorias a los usuarios del catálogo
  (`instance/test/credenciales-roles.json`). Levanta `next dev -p 3100` sobre la
  copia (aborta si el puerto está ocupado o si el servidor no usa la copia) y crea
  por API los datos de apoyo (`tests/datos-apoyo.mjs`: Centrifuga, Metanol,
  Ácido acético, 2-Propanol, cadena R1 → P1 → E-A 1).
- Usuario de prueba: **`qa@ficotox.local` / `QaFicotox2026!`** (solo existe en la
  base de prueba). Los usuarios que se creen por API deben tener correo **`@cicese.mx`**.
- Suites: `tests/api-roles.mjs` (67; catálogo de roles, 200/403 por usuario,
  guarda de administradores, bitácora del reinicio), `tests/api-dsp.mjs` (30),
  `tests/api-sgc.mjs` (120), tras reiniciar el servidor `tests/api-permisos.mjs` (9)
  y `tests/api-roles.mjs --tras-reinicio` (58), `tests/ui/roles.mjs` (30; menú de
  cada rol), `tests/ui/dsp.mjs` (19), `tests/ui/sgc.mjs` (55),
  `tests/api-integridad.mjs` (7, corre **al final** porque rompe la bitácora).
- Navegador: `playwright-core` + el Chrome de Playwright más reciente en
  `~/Library/Caches/ms-playwright/chromium-*/...` (override con `CHROME_PATH`).
- **Baseline de lint**: 12 problemas en `ConsumibleSheet.tsx`, `ReactivoSheet.tsx`,
  `AppShell.tsx` y `administracion/roles/page.tsx`. Cualquier otro es un hallazgo.

## 8. Estado (historial hasta 2026-09-11; la Fase 0 está en 8 bis)

- El trabajo ISO y el rediseño descritos abajo están en `main`, commit `dd35bf7`
  ("Muestras, informes, inventario y bitácora: flujo ISO 17025 completo con nuevo
  Inicio"). La Fase 0 vive en la rama `fase-0-reinicio` (sin merge a `main`).
- En ese momento: `typecheck` limpio · `lint` en el baseline exacto · `build` OK ·
  `npm test`: 208/208 comprobaciones. Tras la Fase 0: 395/395 (ver sección 7).
- El trabajo pasó por **tres rondas de revisión con un agente independiente**
  (29 hallazgos, todos corregidos) hasta obtener `VEREDICTO: APROBADO`.
- **Rediseño UI/UX "estilo Apple" (2026-09-10)**: una sola
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
- Personal: `GET /api/auth/personal` (activos + `puede.{muestras,revision,informes,inventario}` y `cargos` por capacidad —el rol que la otorga—, calculado con el modelo de la Fase 1; `revision` no es un módulo),
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

## 8 bis. Fase 0 — reinicio limpio y catálogo de roles (2026-09-24, rama `fase-0-reinicio`)

- La base anterior (53 entradas de bitácora, 4 recepciones, 4 informes...) está
  respaldada y verificada en `instance/backups/pre-reinicio-20260924-1350/` (con
  `LEEME.txt`) y los originales se movieron a
  `backups/pre-reinicio-20260924-1350/instance-original/`. La llave del sello es
  `SECRET_KEY` del `.env` (no se cambió; sin ella no se verifica esa bitácora).
- La base actual es nueva: sin muestras, informes, inventario, movimientos,
  mantenimientos ni documentos. Tiene los 10 roles del catálogo y un usuario
  local por rol (`@ficotox.local`; contraseñas en `scripts/seed-usuarios.local.json`,
  fuera de git). Su bitácora empieza con esas 20 altas (actor `sistema`, motivo
  `Reinicio Fase 0`).
- Procedimiento completo en `MANUAL_TECNICO.md` §15.3.
- Los datos de demostración (`scripts/demo-seed.mjs`) no se volvieron a cargar.
- Pendientes para la Fase 1: el script de roles solo soporta SQLite (en MySQL el
  primer administrador se crea con SQL, `MANUAL_TECNICO.md` §15.3); el script
  replica el sellado de `audit.ts` (no importable desde Node) — se podría mover
  `stableJson`/`sellar` a un módulo `.mjs` compartido.

## 8 ter. Fase 1 — permisos finos y varios roles (2026-09-24, rama `fase-1-permisos`)

- Git: el commit de la Fase 0 se reescribió sin el trailer de coautoría
  (`6d4a066`) y se hizo merge fast-forward a `main` (local, sin push).
- Modelo nuevo de permisos (módulos, acciones V/C/E/R/A/AN/G, alcances aplicados y
  diferidos), `rol_acciones`, `usuario_roles` (migración de `usuarios.id_rol`),
  permisos por petición, cargo con el que se actúa en firmas y PDF, combinaciones
  prohibidas, guarda de `usuarios:G`, vencimientos en bitácora.
- Sello de la bitácora en un solo módulo compartido `src/lib/shared/audit-chain.mjs`
  (servidor y script de alta).
- Detalle y decisiones pendientes de validar con Mejora Continua:
  `docs/CATALOGO_PERMISOS.md`.

## 8 quater. Fase 2 — seguridad de cuentas y sesiones (2026-09-24, rama `fase-2-seguridad`)

- Git: `fase-1-permisos` se integró a `main` por fast-forward (local, sin push).
- Cuentas temporales (`tipo_cuenta`, `vigente_desde/hasta`, `supervisor_id`),
  vigencia validada en cada petición, rol ≤ vigencia de la cuenta, estudiante solo
  temporal.
- Alcance `supervisado` aplicado (`src/lib/server/supervision.ts`): pendiente de
  visto bueno, no avanza; bandeja `/supervision`; también toda cuenta temporal con
  supervisor.
- Bloqueo por cuenta e IP (`src/lib/server/seguridad.ts`, `intentos_acceso`),
  reautenticación de un solo uso (`reautenticaciones`, encabezado `X-Reauth`) en
  todas las acciones A/AN/visto bueno/usuarios; `token_version` en el JWT (`tv`);
  JWT 8 h; cierre por inactividad en el cliente; contraseñas de 10+.
- Origen obligatorio en toda la cadena (antes un procesamiento podía crearse sin
  recepción).
- Alcances diferidos: en calidad = sin acceso; en usuarios = solo propia cuenta.
- Secretos: en producción no arranca con `JWT_SECRET` inseguro
  (`src/instrumentation.ts`, `scripts/start-ficotox.mjs`). La llave de la bitácora
  NO se toca (la cadena actual se sella con `SECRET_KEY` del `.env`).
- Revisión de accesos: `/administracion/accesos` y `GET /api/admin/accesos` (CSV).
- Pruebas: `tests/api-seguridad.mjs`, `tests/ui/seguridad.mjs`,
  `tests/lib/reauth-auto.mjs` (las suites anteriores se reautentican solas);
  `npm test -- --solo=ui/seguridad.mjs` corre una sola suite. El servidor de
  pruebas usa `TRUST_PROXY=true` y los valores por omisión de sesión y CORS.

## 8 quinquies. Fase 3 — segregación, segundo usuario y login local (2026-09-24, rama `fase-3-segregacion`)

- Git: `fase-2-seguridad` se integró a `main` por fast-forward (local, sin push).
- Se retiró Microsoft Entra ID (login, reautenticación, MSAL, `/api/auth/microsoft`,
  variables `MICROSOFT_*` y `LOCAL_LOGIN_ENABLED`); columnas `microsoft_*` y
  `auth_provider` eliminadas (estaban vacías). `ALLOWED_EMAIL_DOMAINS` sustituye al
  dominio de Microsoft.
- Separación de funciones (6 reglas) y solicitudes de autorización de un segundo
  usuario (`solicitudes_autorizacion`, `/api/solicitudes`, página `/solicitudes`,
  aviso "Por autorizar"); Responsable General con usuarios V A.
- Fechas: `src/lib/shared/fechas.ts` (fechas solas como texto, instantes en
  America/Tijuana) y `DateInput` dd/mm/aaaa.
- Pruebas: `tests/api-segregacion.mjs`, `tests/api-fechas.mjs` (servidor en
  Tijuana y luego en UTC), `tests/fechas.mjs` (TZ=UTC y TZ=America/Tijuana),
  `tests/ui/fechas.mjs`, `tests/ui/segregacion.mjs`. `tests/lib/reauth-auto.mjs`
  aprueba solo las solicitudes con un segundo usuario (Responsable General) salvo
  con el encabezado `X-Sin-Aprobar-Auto: 1`.

## 8 sexies. Fase 4 — autorizaciones del personal FX-THF-AP (rama `fase-4-autorizaciones`)

- Segunda capa además del rol: `autorizaciones_personal` (actividad | método |
  equipo, con vigencia y folio FX-THF-AP; revocar llena columnas, nada se borra).
- Catálogo y requisitos por formato: `src/lib/shared/autorizaciones.ts`
  (`requisitosRecepcion`, `requisitosExtraccion`, `requisitosAnalisis`, ...).
  Servidor: `src/lib/server/autorizaciones.ts` (`exigirAutorizaciones(s, user,
  requisitos)` → 403 `no_autorizado`; `requisitosEquipos` solo valida equipos que
  existen en `equipos`).
- Para exigir una autorización nueva: agrega la clave al catálogo, una función
  `requisitos...` y llama `exigirAutorizaciones` en el handler después del
  permiso del rol y antes de escribir.
- Otorgan/revocan `ensayos:A` o `calidad:A`, nunca a sí mismos; reauth y bitácora
  (`otorgar_autorizacion`, `revocar_autorizacion`, `vencer_autorizacion`).
- `AUTORIZACIONES_OBLIGATORIAS=false` desactiva la validación (solo carga inicial).
  El seed da autorizaciones de ejemplo (folio `FX-THF-AP-DEMO`).

## 8 septies. Fase 5 — flujo de muestras: asignación, estados y firmas (rama `fase-5-muestras`)

- Asignación: `src/lib/server/asignaciones.ts` (tabla `asignaciones_muestra`;
  `exigirAsignacion(s, user, recepcionId)` → 403 `no_asignado` salvo coordinación
  `muestras:A`/`ensayos:A`; `filtroAsignadas` para `?mias=1` y el alcance
  `asignado`, que ya no es diferido). Rutas `/api/samples/reception/<id>/asignaciones`.
- Estados de la recepción: `RECEPTION_STATE_RANK` en `src/lib/shared/sgc.ts`;
  `advanceState`, `avanzarRecepcion`, `validarRecepcionSiCompleta` en
  `src/lib/server/samples-flow.ts`. Solo hacia adelante; estados viejos se mapean
  al arrancar. Autorizar informe = liberar (hasta la Fase 6).
- Análisis: `enviar-revision`, `devolver`, `enmendar` (versión + 1, mismo folio,
  `UNIQUE(folio_num, version)`; la original queda `sustituido` al aprobarse).
- Decisiones de recepción por solicitud (`decision_recepcion`, `cambiar_folio`,
  `reabrir_recepcion` en `acciones-criticas.ts`; ejecutores en `recepcion.ts`).
- Firmas: `src/lib/server/firmas.ts` (`resolverFirmantes` antes de escribir,
  `guardarFirmantes` después; `POST /api/firmas/confirmar` da token de un solo
  uso; `GET /api/cuentas/activas`). La regla 3 compara `<rol>_usuario_id`.
- Etiquetas: `src/lib/server/modules/samples/etiquetas.ts` y
  `/muestras/recepcion/<id>/etiquetas`.

## 9. Pendientes conocidos

- El `.env` local tiene `JWT_EXPIRES_HOURS=12` y `CORS_ORIGINS=*`, que anulan los
  nuevos valores por omisión (8 h, mismo origen): ajustarlos al desplegar.
- FX-THF-AP (Fase 4), asignación de muestras y estados nuevos (Fase 5), estado
  Liberado y envío por correo (Fase 6), flujo completo de Documentos (Fase 7).


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
