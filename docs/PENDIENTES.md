# Pendientes de FICOTOX (fases 0 a 12)

Lista única y vigente de pendientes, riesgos y decisiones por validar al cierre de la Fase 12. Sale de MANUAL_TECNICO.md (§20), MANUAL_USUARIO.md, docs/CATALOGO_PERMISOS.md (§7), docs/CONTEXTO_AGENTE.md (§9) y los resúmenes de cada fase. Ya se quitaron los duplicados y lo que resolvieron fases posteriores. El origen de cada punto va entre paréntesis.

Ya resuelto, así que no se repite abajo:
- La A de informes de la Coord. Técnica exige la autorización FX-THF-AP (Fase 4).
- En usuarios, `usuarios:G` ya no implica A (Fase 3.1).
- La regla 3 compara cuentas (Fase 5).
- En el .env local: ALLOWED_EMAIL_DOMAINS definido, JWT_EXPIRES_HOURS=8 y CORS vacío (Fase 9).
- Fase 10: adjuntar evidencia instrumental a los análisis (sección 7, "Resultados") y la prueba documentada de restauración de respaldos con acta (sección 9 y PVVC).
- Fase 11: incidencias, no conformidades y acciones correctivas (7.10 y 8.7), con el alcance `incidencias` aplicado, las reglas de segregación 7–10, suspensiones de método o equipo y retención de informes; la tabla `adjuntos` ya sirve también a incidencias y acciones correctivas.
- Fase 12: migraciones versionadas (`schema_migraciones`, checksum, línea base, bloqueo, respaldo previo) en lugar de `ensure*Schema()`; el servidor no arranca con deriva, checksum alterado o base más nueva.
- Fase 12: el historial de un registro (vista y solicitudes) aplica los alcances de la ficha (asignado, autorizados, propio, incidencias): lo no visible es 404.
- Fase 12: línea base de lint en 0.
- Fase 12: folios de todas las series con restricción única y reintento (MySQL o dos procesos): ya no hay 500 por folio duplicado; los interbloqueos de MySQL (p. ej. suspensiones simultáneas) también se reintentan.
- Fase 12: la evidencia grande se recibe antes de abrir la sesión de base (ya no retiene a los demás mientras llega).
- Fase 12: instalación y operación en producción: configurar, instancia-nueva, servicio con arranque automático y firewall, HTTPS opcional, registros con rotación, actualizar y verificar-instalacion (`docs/INSTALACION.md`).
- Fase 11: el paquete standalone ya no lleva `instance/`, respaldos, pruebas, `.env` ni llaves (`scripts/limpiar-standalone.mjs` y `tests/standalone.mjs`).

## Decisiones confirmadas por el laboratorio

- **Decisión confirmada por el laboratorio: la bitácora no se exporta; se consulta solo dentro de la plataforma.** Se retiraron el botón «Exportar CSV» de Auditoría, la exportación por API (`/api/audit?formato=…` y los eventos de Revisión de accesos responden 410) y el límite `BITACORA_CSV_MAX_FILAS`. La insignia «Íntegra · N entradas» también se retiró: la verificación corre en segundo plano y solo avisa (Auditoría, Inicio y campana, con incidencia automática) si detecta un posible cambio no autorizado.
- **Decisión confirmada por el laboratorio: Calidad › Documentos funciona como biblioteca de consulta y reemplaza el flujo de control documental de la sección 6 de la especificación.** Con ella se retiraron (sin borrar datos) la revisión de calidad y técnica, la aprobación y publicación, la lista maestra, la distribución con acuse de lectura («Leí y comprendí»), las propuestas de documento (también desde una NC), la obsolescencia por solicitud (`obsoletar_documento`), la regla de segregación 5 y los avisos de documentos del Inicio y la campana; por eso ya no figuran aquí sus pendientes de la Fase 7. Ver docs/CATALOGO_PERMISOS.md §6 octies.

## Validar con Mejora Continua

- AN (anular con justificación) asignado por propuesta: Coord. Área Técnica en muestras, ensayos, informes, equipos e inventario; Mejora Continua en documentos y calidad; Responsable General en todo excepto usuarios (Fase 1, CATALOGO_PERMISOS §7.1).
- Interpretación de módulos: muestras = recepción y custodia; ensayos = procesamiento, extracción y análisis (Fase 1, CATALOGO_PERMISOS §7.4).
- Anclas de las combinaciones prohibidas (`usuarios:G`, `compras:G`) y la lectura de las celdas con paréntesis (Fase 1, CATALOGO_PERMISOS §7.5).
- Reportes de mantenimiento en el módulo equipos (V para verlos, C con alcance `mantenimiento` para generarlos) (Fase 1, CATALOGO_PERMISOS §7.6).
- Usar equipos e insumos al capturar exige `equipos:C` / `inventario:C` además de `ensayos:C` (Fase 1, CATALOGO_PERMISOS §7.7).
- Todo lo que captura una cuenta temporal con supervisor queda pendiente de visto bueno. Definir si una estancia temporal con rol de Técnico Analista debe quedar supervisada (Fase 2, CATALOGO_PERMISOS §7.9).
- Los cambios de permisos de un rol ya asignado no pasan por segundo usuario (se exigen motivo y reautenticación, y nunca sobre un rol propio). Definir si deben ir por solicitud (Fase 3/3.1, CATALOGO_PERMISOS §7.12).
- `rol_propio` solo considera los roles vigentes hoy; un rol asignado con inicio futuro todavía se puede editar (Fase 3.1, resumen).
- Límites regulatorios precargados "por confirmar": ASP 20 µg/g, DSP 160 µg/kg y PSP 80 µg/100 g; también las claves oficiales de los formatos de análisis (FX-TCI-…) y de informe (FX-TCF-IR) (CONTEXTO_AGENTE §9).
- Formatos que el laboratorio aún no entrega: PSP, pigmentos y sedimentos (CONTEXTO_AGENTE §9).
- Catálogo de clientes/solicitantes: hoy el solicitante es texto libre en la recepción (CONTEXTO_AGENTE §9).
- Registro de preparación de reactivos (folio FX-TCR-PR-…): hoy se captura como texto, sin módulo propio (CONTEXTO_AGENTE §9).
- Revisar un análisis "registrado" ya no se da por enviado: el analista debe enviarlo (Fase 6). Confirmar que así trabaja el laboratorio (Fase 5/6, resúmenes).
- "Autorizar = firmar" y "liberar = PDF final": puede liberar la misma persona que autorizó (Fase 6, resumen).
- Registrar un envío de informe (manual o SMTP) no pide reautenticación; la antigua "entregar" sí la pedía (Fase 6, resumen).
- Antes de operar con la base real, correr el seed o registrar las autorizaciones FX-THF-AP del personal: con AUTORIZACIONES_OBLIGATORIAS=true nadie guarda formatos sin ellas (Fase 4, resumen).

- Fase 10 · respaldos: frecuencia (diaria local, semanal externa), retención (30 locales), ubicación de las copias externas y de la llave, RTO (1 h) y RPO (24 h) son propuestas en `docs/RESPALDO_Y_RECUPERACION.md`; la tarea programada por omisión sigue siendo cada 15 días (`install-ficotox-backup-tasks.cmd daily` para la diaria).
- Fase 11 · clasificación de las NC (menor, mayor, crítica) y su significado: propuesta en la plataforma, por validar con Mejora Continua (hoy solo informa; no cambia reglas).
- Fase 11 · clave del formato "Registro de no conformidad": "FX-MC-NC (por confirmar)", configurable con `NC_FORMATO_CLAVE`.
- Fase 11 · plazos: la fecha compromiso de cada acción la fija quien la crea; no hay plazos por clasificación ni para evaluar una incidencia o verificar la eficacia (la acción vencida se marca, no se bloquea). Definir si se requieren plazos.
- Fase 11 · incidencias automáticas (recepción con desviación o rechazada, equipo no apto o con calibración vencida, alertas de integridad): confirmar si se quedan todas. Hoy las evalúa Calidad como cualquier otra (se cierran sin NC si no aplica).
- Fase 11 · verificación de eficacia por NC (no por acción): elegida porque la eficacia se juzga sobre la causa raíz de la NC. Confirmar.
- Fase 11 · un método suspendido bloquea crear y editar extracciones y análisis de ese método (lo que pide la fase); revisar o aprobar un análisis ya capturado no se bloquea. Confirmar si también debe detenerse.
- Fase 11 · una incidencia escalada a una NC que después se anula no se vuelve a evaluar ("solo hacia adelante"): se anula y, si hace falta, se reporta de nuevo.
- Fase 11 · quien es responsable solo de una acción ve la NC completa (impacto, comunicaciones, retenciones); de las incidencias ajenas agrupadas, solo folio y estado. Confirmar.
- Fase 11 · suspensión desde dos NC: suspender lo que la misma NC ya suspende responde 409; otra NC sí puede suspenderlo y sigue suspendido hasta que todas lo reanuden. Confirmar esta lectura de los dos casos límite.
- Fase 12 · motor de base de datos: recomendación SQLite con umbrales para pasar a MySQL (`docs/DECISION_BASE_DE_DATOS.md`). Aprobar.
- Fase 12 · la IP fija o reservada de la computadora del laboratorio y si se activa HTTPS (certificado institucional o propio).
- Fase 10 · evidencia: confirmar que la evidencia es obligatoria para todos los tipos de análisis (hoy `EVIDENCIA_OBLIGATORIA_ANALISIS` aplica a todos, incluido plancton) y si el revisor debe poder adjuntar (hoy solo quien puede editar, en "registrado").

## Mejoras técnicas

- Fase 12 · MySQL/MariaDB sin probar contra un servidor real (no había Docker): correr `npm run test:mysql` (Docker o `MYSQL_TEST_URL`) antes de usar MySQL. El DDL MySQL de la migración base no declara las llaves foráneas ni algunos índices secundarios que creaba el código anterior en MySQL (MANUAL_TECNICO §20).
- Fase 12 · la contraseña se verifica con `scryptSync` (~20–25 ms que bloquean el proceso en cada inicio de sesión o reautenticación). Con el volumen del laboratorio no se nota; si crece, pasar a `crypto.scrypt` asíncrono.
- Fase 12 · «Crear respaldo ahora» con miles de archivos tarda decenas de segundos (48 s medidos bajo carga continua); ya no retiene a nadie (solo la foto de la base va con la sesión), pero la pantalla espera todo ese tiempo. Si molesta, hacerlo en segundo plano con aviso al terminar.
- Fase 12 · la tarea programada de respaldo (Fase 10) se crea con el usuario que la instala y requiere Python; para que corra sin sesión abierta hay que marcar «Ejecutar tanto si el usuario inició sesión como si no» (docs/INSTALACION.md, paso 11).
- Los secretos por defecto (SECRET_KEY y demás) solo sirven para desarrollo (MANUAL_TECNICO §20).
- `better-sqlite3` requiere Node.js LTS con binarios precompilados (MANUAL_TECNICO §20).
- La enmienda de un análisis no vuelve a descontar inventario, porque nace sin insumos (Fase 5, MANUAL_TECNICO §20).
- La regla 3 solo compara por nombre en registros antiguos con nombres escritos, sin cuenta ligada (Fase 5, MANUAL_TECNICO §20).
- El alcance "asignado" filtra la recepción y el Inicio; las listas de procesamiento, extracción y análisis solo filtran con "Mis muestras" (no hay rol con "asignado" en ensayos) (Fase 5, resumen).
- Inventario: "cuánto queda" vive en varias columnas; la alerta de stock bajo marca todo cuando el mínimo es 0; no hay lotes; caducidad y calibración son solo informativas; falta el historial de verificación de equipos (CONTEXTO_AGENTE §9).
- El seed no vuelve a crear una autorización de ejemplo que ya venció, porque solo omite las revocadas (Fase 4, resumen).
- Faltan pruebas automáticas del aviso de autorizaciones por vencer a 30 días y del registro vencer_autorizacion del barrido (Fase 4, resumen).
- La base de prueba completa las autorizaciones de los usuarios de ejemplo; solo un caso (PSP de Luis) prueba el seed puro (Fase 4/5, resúmenes).
- Orden de validación distinto: en extracción la autorización va antes de exigirUsoDeRecursos y en análisis después (sin efecto funcional) (Fase 4, resumen).
- La entrada "enviar" de la bitácora no guarda el cambio de estado liberado → enviado como antes/después; solo el detalle del envío (Fase 6, resumen).
- Un `enviado_en` sin zona horaria recibido por la API se interpreta en la hora local del servidor (la interfaz manda la zona) (Fase 6, resumen).

- La columna "Módulo" del CSV de la bitácora muestra la clave interna (ensayos, equipos) en lugar de una etiqueta. (Fase 9, revisión)
- Notificaciones: cuentas y roles avisan con 7 días de anticipación y las autorizaciones con 30; decidir si se unifican o documentarlo. (Fase 9, revisión)

- Fase 10: los respaldos por terminal o tarea programada no escriben en la bitácora (su registro es el manifest); solo "Crear respaldo ahora" de la interfaz queda en ella.
- Fase 10: el respaldo y la restauración con verificación automática son solo para SQLite; en MySQL/MariaDB se usa mysqldump y la verificación de la cadena del volcado no está implementada.
- Fase 10: los TIFF no tienen vista previa en la plataforma (Chrome y Firefox no los muestran); se descargan.

- Fase 11: la alerta de integridad de un respaldo (y su incidencia automática) se registra al abrir Administración › Respaldos o al consultar `GET /api/respaldos` con el acta fallida, no en el momento en que la prueba de restauración por terminal escribe el acta. El acta y el aviso de "prueba de restauración" siguen visibles.
- Fase 11: la incidencia automática de "equipo no apto" se evalúa al guardar (estado y calibración de ese momento); si el equipo se corrige después, la incidencia automática queda y se cierra sin NC.
- Fase 11: el MySQL de las transiciones de calidad (FOR UPDATE, CAST de la clave de equipo) se probó solo en SQLite, como el resto del sistema (ver Fase 12 · MySQL). Desde la Fase 12 los folios duplicados y los interbloqueos se reintentan (ya no dan 500); la deduplicación de incidencias automáticas se apoya en la misma transacción (sin índice único, porque una anulada no debe impedir una nueva).

## Resto de la antigua Fase 8 (no implementado)

- Auditorías internas: el alcance `auditoria` del Auditor Interno (C E en calidad) está diferido (CATALOGO_PERMISOS §3).
- Compras: el módulo `compras` y sus permisos (G del Administrador/a Auxiliar; V y A de otros roles) existen en la matriz sin pantallas ni flujo (CATALOGO_PERMISOS §4).
- Proyectos: el alcance `proyecto` de la Coord. de Investigación y Desarrollo (muestras, ensayos, informes) está diferido y hoy se comporta como `total` (CATALOGO_PERMISOS §3).
- Otros alcances diferidos que hoy se comportan como `total`: `tecnico`, `investigacion`, `administrativo` (inventario; en documentos ya no aplican: la Biblioteca los trata como `total` por diseño) y `limitado` (usuarios del Administrador/a Auxiliar, que en usuarios se comporta como "propio") (CATALOGO_PERMISOS §3).
