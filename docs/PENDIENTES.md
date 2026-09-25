# Pendientes de FICOTOX (fases 0 a 9)

Lista única y vigente de pendientes, riesgos y decisiones por validar al cierre de la Fase 9. Sale de MANUAL_TECNICO.md (§20), MANUAL_USUARIO.md, docs/CATALOGO_PERMISOS.md (§7), docs/CONTEXTO_AGENTE.md (§9) y los resúmenes de cada fase. Ya se quitaron los duplicados y lo que resolvieron fases posteriores. El origen de cada punto va entre paréntesis.

Ya resuelto, así que no se repite abajo:
- La A de informes de la Coord. Técnica exige la autorización FX-THF-AP (Fase 4).
- En usuarios, `usuarios:G` ya no implica A (Fase 3.1).
- La regla 3 compara cuentas (Fase 5).
- Documentos SGC está encendido, con revisión de calidad y revisión técnica (Fase 7).
- En el .env local: ALLOWED_EMAIL_DOMAINS definido, JWT_EXPIRES_HOURS=8 y CORS vacío (Fase 9).
- En la Fase 9, el alcance "autorizados" ya se aplica también a la descarga del archivo, al resumen y a las propuestas de documentos.

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
- Al aceptar una propuesta, el borrador queda a nombre de quien elabora y la bitácora registra "aceptar" a nombre de Mejora Continua (Fase 7, resumen).
- Antes de operar con la base real, correr el seed o registrar las autorizaciones FX-THF-AP del personal: con AUTORIZACIONES_OBLIGATORIAS=true nadie guarda formatos sin ellas (Fase 4, resumen).

## Mejoras técnicas

- Migraciones ligeras y no versionadas (`ensure*Schema` en lugar de migraciones numeradas) (MANUAL_TECNICO §20, CONTEXTO_AGENTE §9).
- Validar el sistema completo en MySQL/MariaDB; hasta ahora todo se probó en SQLite. Para uso multiusuario en producción conviene MySQL (MANUAL_TECNICO §20, CONTEXTO_AGENTE §9).
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
- Documentos: "Devolver con observaciones" no revisa la segregación (Fase 7, resumen).
- Documentos: al aceptar una propuesta de "cambio" no se confirma que el original siga vigente (Fase 7, resumen).
- Documentos: queda en `src/app/(app)/documentos/page.tsx` un mapa local con `en_revision`, sin efecto (Fase 7, resumen).
- Deuda de lint: 12 problemas previos en ConsumibleSheet, ReactivoSheet, AppShell y administracion/roles/page (línea base desde la Fase 0).

- El historial de un registro (vista y CSV) solo exige V del módulo: no aplica los alcances "autorizados" ni "asignado" (el Estudiante o un técnico con alcance limitado podrían consultar o exportar el historial de un documento no distribuido o de una muestra no asignada). (Fase 9, revisión; src/lib/server/modules/audit.ts)
- La exportación CSV de la bitácora corta en 5000 filas por omisión (máximo 20000) sin avisar que el resultado quedó truncado. (Fase 9, revisión)
- La columna "Módulo" del CSV de la bitácora muestra la clave interna (ensayos, equipos) en lugar de una etiqueta. (Fase 9, revisión)
- Notificaciones: cuentas y roles avisan con 7 días de anticipación y las autorizaciones con 30; decidir si se unifican o documentarlo. (Fase 9, revisión)

## Fase 8 (no implementada)

- Incidencias (calidad): los alcances `incidencias` (C del Técnico Analista, Técnico Auxiliar, Administrador/a Auxiliar y Estudiante) se guardan pero no se aplican; en calidad un diferido es "sin acceso" (CATALOGO_PERMISOS §3 y §7.8).
- Auditorías internas: el alcance `auditoria` del Auditor Interno (C E en calidad) está diferido (CATALOGO_PERMISOS §3).
- Compras: el módulo `compras` y sus permisos (G del Administrador/a Auxiliar; V y A de otros roles) existen en la matriz sin pantallas ni flujo (CATALOGO_PERMISOS §4).
- Proyectos: el alcance `proyecto` de la Coord. de Investigación y Desarrollo (muestras, ensayos, informes) está diferido y hoy se comporta como `total` (CATALOGO_PERMISOS §3).
- Otros alcances diferidos que hoy se comportan como `total`: `tecnico`, `investigacion`, `administrativo` (documentos e inventario) y `limitado` (usuarios del Administrador/a Auxiliar, que en usuarios se comporta como "propio") (CATALOGO_PERMISOS §3).
