# Validacion del sistema (pruebas automatizadas)

FICOTOX registra datos de un laboratorio que trabaja bajo ISO/IEC 17025, asi que
cada cambio se valida con pruebas que recorren el flujo real: recepcion ->
procesamiento -> extraccion -> analisis -> informe -> disposicion, mas
anulaciones, documentos SGC, bajas de inventario y bitacora.

## Como correrlas

```bash
npm test               # API + navegador
npm run test:api       # solo API (no requiere Chrome)
npm run test:reset-db  # solo regenera la base de prueba
npm run test:fixture   # rehace la base congelada (base vacia + roles de la Fase 0)
npm test -- --rebuild-fixture   # la rehace y corre todo
```

`tests/run.mjs`:

1. Comprueba que el puerto 3100 este libre. Si algo lo ocupa, **no corre nada**:
   ese proceso podria estar sirviendo la base real.
2. Si no existe `instance/fixtures/ficotox-base.sqlite3` la genera
   (`tests/build-fixture.mjs`: base vacia creada por el arranque en el puerto 3101 +
   `scripts/seed-roles-usuarios.mjs` con contrasenas aleatorias). La copia a
   `instance/test/ficotox-test.sqlite3` y, **solo en la copia**, crea el rol
   "QA pruebas automatizadas" (todos los permisos) y el usuario `qa@ficotox.local` /
   `QaFicotox2026!`, y asigna contrasenas aleatorias a los 10 usuarios del catalogo
   (`instance/test/credenciales-roles.json`). La carpeta `instance/test/` (base, PDFs
   de informes y archivos de documentos generados por las pruebas) se borra y
   regenera en cada corrida. Nunca se usa la base real como origen.
3. Levanta `next dev -p 3100` con `SQLITE_PATH` apuntando a la copia y **verifica
   contra `/api/health/db` que el servidor este usando esa copia** (`archivo`);
   si no coincide, aborta sin escribir nada. Con esas dos comprobaciones, la base
   real no se toca.
4. Corre `api-roles.mjs` sobre la base recien copiada y luego `tests/datos-apoyo.mjs`,
   que crea por API los datos que las demas suites esperan (equipo Centrifuga con
   calibracion vencida, reactivos Metanol HPLC, Acido acetico y 2-Propanol, un
   consumible y la cadena R 1 → P 1 → E-A 1 con la muestra D45-2); los ids quedan en
   `instance/test/datos-apoyo.json` para las pruebas de navegador.
5. Corre las suites (reiniciando el servidor antes de `api-permisos.mjs` y
   `api-roles.mjs --tras-reinicio`) y lo apaga.

Variables: `TEST_PORT` (3100), `TEST_FIXTURE_PORT` (3101), `SOURCE_DB`, `TEST_DB`,
`CHROME_PATH` (ruta a un Chrome/Chromium para Playwright; por omision se usa el
`chromium-*` mas reciente de `~/Library/Caches/ms-playwright`; si no hay, las
pruebas de navegador se omiten con aviso). `playwright-core` es dependencia de desarrollo y no descarga
navegadores: use uno instalado o `npx playwright install chromium` en otra
carpeta y apunte `CHROME_PATH` a el.

## Suites

| Archivo | Tipo | Que cubre |
| --- | --- | --- |
| `tests/api-roles.mjs` | HTTP | Fase 0: los 10 roles existen con exactamente los permisos de la especificacion (tabla escrita en la prueba, independiente del catalogo), no existe "Super Admin", solo "Administrador tecnico del sistema" es sistemico; cada usuario inicia sesion, recibe sus permisos exactos, 200 en lo que puede leer y 403 en lo demas (y 403 al crear un equipo para los roles que leen todo); no se puede dejar el sistema sin administrador (409 y rollback); las 20 altas del reinicio estan en la bitacora y la cadena esta integra. Con `--tras-reinicio` repite las comprobaciones de catalogo y 200/403 despues de reiniciar el servidor. |
| `tests/api-dsp.mjs` | HTTP | Series de folio por tipo de extraccion (E-A / E-D), descuento de inventario por tubo, equipos con bitacora, reposicion al editar, compatibilidad con registros ASP anteriores. |
| `tests/api-sgc.mjs` | HTTP | Recepcion con inspeccion y decision de aceptacion (NC, desviacion, comunicacion al cliente), transiciones de estado, anulacion y restauracion con reposicion de inventario, bloqueo por dependientes, analisis con revision y aprobacion por personas distintas, informe (revisar, autorizar, PDF con SHA-256, entrega, enmienda v2, anulacion), disposicion final que cierra la muestra, documentos SGC (revisiones, lista maestra, obsoletos), bajas logicas de reactivos/consumibles/equipos/usuarios, `DELETE` -> 405, bitacora e integridad de la cadena de hashes. |
| `tests/ui/roles.mjs` | Navegador | Cada uno de los 10 usuarios del catalogo inicia sesion y la barra lateral muestra exactamente los destinos de sus modulos (Documentos nunca, esta apagado), sin errores de consola. |
| `tests/ui/dsp.mjs` | Navegador | Formato DSP desde un procesamiento, avisos de equipo, tabla de pesos, guardado y reapertura. |
| `tests/api-permisos.mjs` | HTTP | Se ejecuta **tras reiniciar el servidor**, con la base que dejo `api-sgc.mjs`: comprueba que el arranque no amplia los permisos de un rol limitado (el rol "Analista QA" sigue con solo `muestras` y sigue recibiendo 403 en inventario, roles, usuarios, informes, documentos y la bitacora completa). |
| `tests/ui/sgc.mjs` | Navegador | Recepcion completa con inspeccion y aceptacion, anular/restaurar desde la lista, historial en el formato, analisis (registrar, revisar, aprobar con excepcion, solo lectura), informe (borrador, revision, autorizacion con firma, PDF, entrega), documento SGC (alta con archivo, revision, aprobacion, lista maestra, detalle), bitacora (verificacion, expansion de cambios, filtros), baja y reactivacion de un reactivo, navegacion, y ausencia de errores de consola. |

| `tests/api-evidencias.mjs` | HTTP + sqlite3 | Fase 10: adjuntar pdf, png y xlsx (SHA-256), rechazo de html, svg, exe, pdf que es html, ejecutable renombrado y vacio (400), limite (12 MB pasa completo por el proxy; 25 MB + 1 da 413), HTML o script a mitad de un .txt/.csv, nombre con marcas bidi, duplicado (409, sin archivos huerfanos) y el mismo archivo en otro analisis; nombre con `../` saneado; sin asignacion, sin FX-THF-AP, alcance "estado" y solicitud pendiente; lectura por rol; evidencia obligatoria al enviar; bloqueo tras enviar y reapertura al devolver; anular (motivo, reautenticacion, archivo conservado); enmienda que hereda; integridad alterado/faltante con alerta; cuenta supervisada que no elude el visto bueno; bitacora integra. |
| `tests/respaldos.mjs` | HTTP + scripts | Fase 10: permisos de Respaldos (Jorge crea, Patricia y Ana solo lectura, Luis 403), respaldo con el servidor encendido (snapshot integro, manifest sin secretos, llave aparte), restauracion en modo prueba con las 8 verificaciones y acta, respaldo alterado, manifest con rutas `../` (no escribe fuera del destino), base alterada con el manifest recalculado (sello HMAC), llave distinta o ausente, modo real rechazado (sin `--confirmar` o con el servidor encendido) y correcto sobre una instancia apagada (respaldo previo, entrada de restauracion, cadena integra), retencion que conserva el ultimo verificado. Todo en `instance/test/`. |
| `tests/ui/evidencias.mjs` | Navegador | Fase 10: seccion "Evidencia instrumental" (aviso y "Enviar a revisión" deshabilitado sin evidencia, carga, vista previa, anular con contraseña, mostrar anulados, solo lectura tras enviar) y pantalla Respaldos por rol. |
| `tests/api-incidencias.mjs` | HTTP + sqlite3 | Fase 11: reportar (C con cualquier alcance; Estudiante sin visto bueno; Admin tecnico 403; descripcion corta 400), alcance "incidencias" (Mariana solo ve las suyas por lista, ficha, busqueda, filtro por registro, CSV, historial, adjuntos y campana; 403 en la bitacora), Admin tecnico sin incidencias y con eventos de calidad sin datos en la bitacora, fotos con las validaciones de la Fase 10, evaluar (R; regla 7), cerrar sin NC, escalar (tambien varias a la misma NC; ya escalada o cerrada 409), anular (AN, segundo usuario; escalada con NC vigente 409), las 3 incidencias automaticas sin duplicados y sin crearse si la transaccion falla (trigger de prueba), bitacora integra. |
| `tests/api-no-conformidades.mjs` | HTTP + sqlite3 | Fase 11: flujo completo 1–10 (reporte con foto, escalar, responsable, retencion, suspension de equipo, causa, 2 acciones, implementar con evidencia, no eficaz → reapertura, eficaz, reanudar y liberar, comunicacion, cierre, PDF con huella y deteccion de alteracion); cada renglon de permisos (positivo y negativo, con 401 sin reautenticacion); reglas 8, 9 y 10 (con excepcion aprobada); casos limite (doble cierre simultaneo, cerrar con pendientes, NC sin accion correctiva, suspender dos veces, dos NC sobre el mismo equipo, informe ya enviado, metodo y equipo suspendidos bloquean extraccion y analisis, informe retenido no se libera ni se envia, anular con bloqueos, editar cerrada, accion vencida, reasignar con motivo, propuesta documental ligada); indicadores y CSV. |
| `tests/ui/no-conformidades.mjs` | Navegador | Fase 11: reportar desde la barra lateral con foto y desde el menu de una extraccion, lista con alcance, evaluar y escalar, formato de la NC (responsable, impacto, guardar y avanzar), avisos de metodo suspendido e informe retenido, Inicio, Indicadores del Auditor y Admin tecnico sin acceso. |
| `tests/standalone.mjs` | Build + proceso | Fase 11: el paquete `.next/standalone` no contiene `.env`, `instance/`, respaldos, pruebas ni llaves, y arranca leyendo una base de fuera del paquete. |
| `tests/api-integridad.mjs` | HTTP + sqlite3 | Corre **al final** porque rompe la bitacora a proposito: triggers que abortan `UPDATE`/`DELETE`, alteracion de una entrada, borrado de filas al final y borrado de una entrada intermedia (hueco de ids), y reposicion automatica de los triggers. |

Cada suite imprime `PASS`/`FAIL` por caso y termina con `n/n pruebas OK`; el
corredor devuelve codigo 1 si alguna falla. Las de navegador guardan
`tests/ui/fail.png` con la pantalla del fallo.

## Que verificar a mano tras un cambio grande

- `npm run typecheck`, `npm run lint` y `npm run build` limpios.
- Abrir un PDF de informe autorizado y comprobar folio, version, paginacion,
  resultados, declaraciones y firmas.
- Revisar en **Auditoria** que la accion realizada aparezca con su motivo y que
  **Verificar integridad** siga en verde.
- Con un usuario sin R/A en ensayos o informes (p. ej. Técnico Analista), confirmar que los
  botones de revisar/aprobar/autorizar no aparecen y que la API responde 403.
- Con una persona con dos roles que otorgan la misma accion (p. ej. Responsable General +
  Coordinador/a del Área Técnica), confirmar que al revisar o autorizar pide "Actuar como"
  y que el PDF del informe muestra el cargo elegido.
- Tras cambiar `SECRET_KEY` (o perder `instance/auditoria.key`, la llave que el
  sistema genera cuando no hay `SECRET_KEY` propia), recordar que **Verificar
  integridad** marcara como alteradas las entradas escritas con la llave
  anterior: la llave se respalda junto con la base.
