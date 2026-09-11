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
```

`tests/run.mjs`:

1. Comprueba que el puerto 3100 este libre. Si algo lo ocupa, **no corre nada**:
   ese proceso podria estar sirviendo la base real.
2. Copia `instance/ficotox.sqlite3` a `instance/test/ficotox-test.sqlite3` y agrega el
   usuario `qa@ficotox.local` / `QaFicotox2026!` (rol 1). La carpeta `instance/test/`
   (base, PDFs de informes y archivos de documentos generados por las pruebas) se
   borra y regenera en cada corrida.
3. Levanta `next dev -p 3100` con `SQLITE_PATH` apuntando a la copia y **verifica
   contra `/api/health/db` que el servidor este usando esa copia** (`archivo`);
   si no coincide, aborta sin escribir nada. Con esas dos comprobaciones, la base
   real no se toca.
4. Corre las suites (reiniciando el servidor antes de `api-permisos.mjs`) y lo apaga.

Variables: `TEST_PORT` (3100), `SOURCE_DB`, `TEST_DB`, `CHROME_PATH` (ruta a un
Chrome/Chromium para Playwright; si no existe, las pruebas de navegador se omiten
con aviso). `playwright-core` es dependencia de desarrollo y no descarga
navegadores: use uno instalado o `npx playwright install chromium` en otra
carpeta y apunte `CHROME_PATH` a el.

## Suites

| Archivo | Tipo | Que cubre |
| --- | --- | --- |
| `tests/api-dsp.mjs` | HTTP | Series de folio por tipo de extraccion (E-A / E-D), descuento de inventario por tubo, equipos con bitacora, reposicion al editar, compatibilidad con registros ASP anteriores. |
| `tests/api-sgc.mjs` | HTTP | Recepcion con inspeccion y decision de aceptacion (NC, desviacion, comunicacion al cliente), transiciones de estado, anulacion y restauracion con reposicion de inventario, bloqueo por dependientes, analisis con revision y aprobacion por personas distintas, informe (revisar, autorizar, PDF con SHA-256, entrega, enmienda v2, anulacion), disposicion final que cierra la muestra, documentos SGC (revisiones, lista maestra, obsoletos), bajas logicas de reactivos/consumibles/equipos/usuarios, `DELETE` -> 405, bitacora e integridad de la cadena de hashes. |
| `tests/ui/dsp.mjs` | Navegador | Formato DSP desde un procesamiento, avisos de equipo, tabla de pesos, guardado y reapertura. |
| `tests/api-permisos.mjs` | HTTP | Se ejecuta **tras reiniciar el servidor**, con la base que dejo `api-sgc.mjs`: comprueba que el arranque no amplia los permisos de un rol limitado (el rol "Analista QA" sigue con solo `muestras` y sigue recibiendo 403 en inventario, roles, usuarios, informes, documentos y la bitacora completa). |
| `tests/ui/sgc.mjs` | Navegador | Recepcion completa con inspeccion y aceptacion, anular/restaurar desde la lista, historial en el formato, analisis (registrar, revisar, aprobar con excepcion, solo lectura), informe (borrador, revision, autorizacion con firma, PDF, entrega), documento SGC (alta con archivo, revision, aprobacion, lista maestra, detalle), bitacora (verificacion, expansion de cambios, filtros), baja y reactivacion de un reactivo, navegacion, y ausencia de errores de consola. |

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
- Con un usuario sin permiso `aprobaciones`, confirmar que los botones de
  revisar/aprobar/autorizar no aparecen y que la API responde 403.
- Tras cambiar `SECRET_KEY` (o perder `instance/auditoria.key`, la llave que el
  sistema genera cuando no hay `SECRET_KEY` propia), recordar que **Verificar
  integridad** marcara como alteradas las entradas escritas con la llave
  anterior: la llave se respalda junto con la base.
