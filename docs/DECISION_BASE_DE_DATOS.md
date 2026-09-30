# Decisión: motor de base de datos para FICOTOX

Fase 12 · 2026-09-29. Estado: **recomendación**, pendiente de aprobación por la Coordinación del Área Técnica y Mejora Continua.

## 1. Escenario del laboratorio

| Aspecto | Valor esperado |
| --- | --- |
| Servidor | Una computadora del laboratorio (Windows) con FICOTOX como servicio. |
| Usuarios | ~10 cuentas; 3 a 6 personas usándolo a la vez en horas pico. |
| Volumen | Decenas de muestras por semana; cada muestra recorre recepción → procesamiento → extracción → análisis (con evidencia) → informe → envío. |
| Datos | La base real pesa hoy 0,4 MB. Los PDF y las evidencias van en archivos de `instance/`, no en la base. |
| Operación | Personal del laboratorio, sin DBA. Respaldo diario y prueba de restauración trimestral (Fase 10). |
| Requisito clave | Bitácora íntegra y verificable (cadena de sellos HMAC), respaldos restaurables y comprobables sin herramientas externas. |

## 2. Configuración de SQLite (Fase 12)

`src/lib/server/db.ts`, `PRAGMAS_SQLITE`:

| Pragma | Valor | Por qué |
| --- | --- | --- |
| `journal_mode` | `WAL` | Los lectores no bloquean al escritor; el respaldo en línea no detiene al servidor. |
| `synchronous` | `NORMAL` | Con WAL, una transacción confirmada sobrevive a la caída del proceso. Ante un corte de luz se puede perder la última fracción de segundo, pero la base no se corrompe. `FULL` sincroniza el disco en cada confirmación, con costo por escritura y sin beneficio medible para este volumen. |
| `busy_timeout` | `5000` ms | Si otro proceso (un script de respaldo o de migración) tiene la base, se espera en vez de fallar. |
| `foreign_keys` | `ON` | El esquema de SQLite no declara llaves foráneas (las reglas viven en el código). `PRAGMA foreign_key_check` da 0 violaciones en la base real. |

Además:
- Una transacción por petición, en serie dentro del proceso.
- El cuerpo de la petición se recibe antes de abrir la transacción.
- Si dos procesos calculan el mismo folio, o la base está ocupada (`SQLITE_BUSY*`), la petición se reintenta (restricción única en todas las series, hasta 3 intentos, 409 limpio si se agota; nunca 500).

Detalle en `MANUAL_TECNICO.md` §10.2.2.

## 3. Resultados medidos

Equipo de prueba: Apple M4 Pro (14 núcleos, 24 GB), Node 24.20, build de producción (`scripts/start-ficotox.mjs`), base temporal. En la computadora del laboratorio (un equipo de escritorio típico) hay que esperar latencias de 2 a 4 veces mayores.

### 3.1 Prueba de carga (`npm run prueba-carga -- --segundos 180 --usuarios 10`)

Cada usuario virtual repite sin pausa, en bucle, el flujo real completo y mezcla listas, Inicio, campana e incidencias:
- recepción, procesamiento y extracción DSP (con consumo de inventario);
- análisis con evidencia PDF, revisión y aprobación (con reautenticación);
- informe (revisar, autorizar y liberar, con generación del PDF);
- registro del envío.

A la mitad de la corrida se crea un respaldo desde la API.

| Medida | Resultado |
| --- | --- |
| Duración / peticiones | 180 s · **28 035 peticiones (155/s)** |
| Flujos completos | 2 228 muestras (1 807 por DSP de la recepción al envío; 421 por ASP hasta la extracción), 394 incidencias y 174 no conformidades. Es más que años de trabajo real del laboratorio en 3 minutos. |
| Latencia global | **p50 46 ms · p95 170 ms · p99 203 ms**; máximo de cualquier acción salvo el propio respaldo: ~300 ms |
| Errores 500 | **0** |
| Conflictos agotados (409) | 0 |
| Folios | 8 series, sin repetidos ni huecos (R y P 1–2 228; E-A 1–421; E-D, A e IR 1–1 807; INC 1–394; NC 1–174). |
| Inventario | Coherente: existencia = 100 000 − 2 228 × 0,01, igual al número de extracciones confirmadas. |
| Bitácora | Íntegra: 27 615 entradas, cadena verificada con la llave al terminar. |
| Respaldo a mitad de la carga | 201; la petición del respaldo tarda ~48 s con miles de PDF y evidencias acumulados, pero **no retiene a nadie** (ver abajo). |

Lectura de las cifras:

- «Crear respaldo ahora» retiene la sesión SQLite **solo** mientras toma la foto de la base (la API de respaldo en línea reinicia la copia si otra conexión escribe; con la sesión tomada no escribe ninguna de este proceso). Los archivos (PDF, evidencias, documentos) se copian y se huellean **sin** la sesión: son de solo inserción. En la primera versión de la fase todo iba dentro de la sesión y los máximos de las demás acciones llegaban a ~1,6 s; ahora ninguna pasa de ~300 ms mientras se respalda. Que el respaldo en sí tarde decenas de segundos con miles de archivos no afecta a nadie.
- «Aprobar análisis», «autorizar informe» y «liberar» marcan ~155 ms de mediana porque la medición incluye tres viajes: el 401 que pide reautenticación, `/auth/reauth` (scrypt) y la repetición. No hay trabajo pesado dentro de la transacción.
- Corrida previa de 60 s: 142 peticiones/s y respaldo en 772 ms; mismas conclusiones.

Reporte completo: `instance/test/carga/resultado-<fecha>.md` y `.json` (se regenera con cada corrida).

### 3.2 Concurrencia entre procesos (`tests/concurrencia.mjs`, en `npm test`)

Dos servidores standalone sobre **la misma** base SQLite, con 60 incidencias y 16 recepciones simultáneas repartidas entre ambos:
- ningún 500;
- folios únicos y consecutivos;
- la bitácora queda con una sola cadena íntegra;
- ~35 reintentos por `SQLITE_BUSY_SNAPSHOT` / folio duplicado, todos resueltos.

Este es el camino que seguiría una segunda instancia accidental o un script concurrente.

### 3.3 Folios y suspensiones simultáneas (`tests/api-produccion.mjs`, en `npm test`)

- 30 incidencias de 6 personas a la vez: todas 201, con folios consecutivos.
- 10 cadenas de muestra a la vez: todas creadas.
- Suspensión simultánea del mismo método desde dos NC: 201, 201 y 409 (la misma NC dos veces), con exactamente 2 activas.
- Reanudaciones simultáneas: 200 y 409 (la misma dos veces), y una sola entrada en la bitácora.

### 3.4 MySQL/MariaDB

**No se probó contra un servidor MySQL en esta fase**: la computadora de desarrollo no tiene Docker ni MySQL.

Lo que queda listo:
- `npm run test:mysql` (Docker con `mariadb:11` o `MYSQL_TEST_URL`). Prueba:
  - migraciones en una base vacía y esquema igual al esperado;
  - volver a migrar sin efecto;
  - bitácora sellada e inmutable (triggers);
  - dos procesos migrando a la vez;
  - el paso de SQLite a MySQL;
  - el arranque del servidor con `DATABASE_URL`.
- Revisión de portabilidad del SQL: todo lo específico de un motor va detrás de `isSqlite()`.

El DDL MySQL de la migración base se tradujo del de SQLite y no declara las llaves foráneas ni algunos índices secundarios del código anterior (riesgo en `MANUAL_TECNICO.md` §20).

## 4. Opciones

| | SQLite (un archivo, en el mismo proceso) | MySQL/MariaDB (servidor aparte) |
| --- | --- | --- |
| Instalación | Nada adicional. | Instalar, asegurar y actualizar un servidor de base de datos; usuario y contraseña; un servicio más. |
| Operación | Sin DBA. Respaldo y restauración con los scripts de la Fase 10: consistentes, con manifest, SHA-256 y acta. | Requiere quien lo administre. Respaldo con `mysqldump` fuera de la aplicación; la verificación de la bitácora requiere restaurar el volcado y correr `verificar-instalacion`. |
| Rendimiento medido | 145 peticiones/s con 10 usuarios sin pausa; p99 221 ms. | No medido aquí. Más escritores simultáneos reales (bloqueo por fila). |
| Concurrencia | Un escritor a la vez (en serie). Suficiente con márgenes de dos órdenes de magnitud para el laboratorio. | Escritores en paralelo; FICOTOX ya maneja interbloqueos y folios duplicados con reintento. |
| Varios servidores de aplicación | No (un solo servidor; la base es un archivo local, nunca en carpeta de red). | Sí. |
| Integridad de la bitácora | Verificable por completo desde la app y los scripts (respaldo, restauración, verificar-instalación). | Igual en línea; el respaldo depende de `mysqldump` y del procedimiento. |
| Riesgos | Disco local único: lo mitigan el respaldo diario, las copias externas (OneDrive) y la prueba trimestral. Si la base se pusiera en una carpeta compartida, se corrompería. | Más piezas que fallen o se desconfiguren; soporte MySQL de FICOTOX sin probar en esta fase. |

## 5. Recomendación

**SQLite** para la operación del laboratorio, con la configuración de la sección 2, el servicio de la Fase 12 y los respaldos de la Fase 10.

La carga medida supera la del laboratorio por dos órdenes de magnitud sin errores ni pérdida de integridad. SQLite elimina un servidor que habría que administrar sin personal para hacerlo. Además, los respaldos y su verificación, una exigencia de la norma, ya están completos y probados para SQLite.

## 6. Umbrales para cambiar a MySQL/MariaDB

Reconsiderar, y probar primero con `npm run test:mysql` y una copia, si ocurre **cualquiera** de estos casos:

1. Se necesita **más de un servidor de aplicación** (otra sede o alta disponibilidad) o acceso desde fuera de la red del laboratorio con infraestructura central de CICESE.
2. La **p95** de `npm run prueba-carga` en la computadora del laboratorio pasa de **500 ms** con el número real de usuarios, o los usuarios reportan lentitud sostenida.
3. Aparecen **409 `conflicto_concurrencia`** en operación normal: se ven en `instance\logs` como «conflicto de concurrencia tras 3 intentos».
4. La base pasa de **2 GB**, o el respaldo en línea pasa de **30 s**.
5. Más de **25 usuarios simultáneos** de forma habitual.
6. CICESE ofrece un servidor MySQL/MariaDB **administrado** (con respaldos y DBA) y así lo dispone la política institucional.

## 7. Procedimiento SQLite → MySQL/MariaDB

`npm run sqlite-a-mysql` (`scripts/sqlite-a-mysql.mjs`):

1. **Preparar**:
   - el DBA crea la base vacía (`CREATE DATABASE ficotox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`) y un usuario con permisos sobre ella;
   - `npm run test:mysql` con `MYSQL_TEST_URL` apuntando a ese servidor (en una base de prueba).
2. **Ensayo**:
   - restaura el último respaldo en una carpeta aparte (`npm run restaurar -- --respaldo <id> --destino instance-ensayo`);
   - apunta `SQLITE_PATH` a esa copia y corre `npm run sqlite-a-mysql -- --simular` (revisa versión, conteos y bitácora);
   - después, `--destino mysql://…/ficotox_ensayo --confirmar`.
3. **Corte** (fuera del horario de trabajo):
   - detén el servicio y corre `npm run respaldar`;
   - `npm run migrar -- --estado` debe mostrar la base al día;
   - `npm run sqlite-a-mysql -- --destino mysql://usuario:clave@servidor:3306/ficotox --confirmar`.
4. **Qué hace el script**:
   - crea el esquema con los mismos pasos de las migraciones (rama MySQL) y copia `schema_migraciones` (mismas versiones y checksums);
   - copia todas las tablas conservando los ids, incluida la bitácora tal cual, con los mismos hashes (el sello no depende del motor), y ajusta el `AUTO_INCREMENT`;
   - verifica que los conteos por tabla sean iguales y la cadena íntegra con la misma llave;
   - agrega una entrada «sistema» encadenada: «Base de datos pasada de SQLite a MySQL/MariaDB».
   - Si algo no cuadra, se detiene: la base SQLite no se toca y la MySQL se descarta.
5. **Cambiar la configuración**:
   - en `.env`, `DATABASE_URL=mysql://…` (quita o comenta `SQLITE_PATH`);
   - arranca el servidor y corre `npm run verificar-instalacion`;
   - programa el respaldo con `mysqldump` (`scripts/backup_ficotox.py` lo hace; ver `docs/INSTALACION.md`, «MySQL/MariaDB»).
6. **Conservar**: la base SQLite queda sin cambios como respaldo del corte. Los archivos de `instance/` (PDF, evidencias, llave) siguen en su lugar.

Reversa: si algo falla después del corte, vuelve a `SQLITE_PATH` (la base SQLite sigue intacta). Lo registrado en MySQL después del corte habría que reincorporarlo a mano; por eso el corte se hace sin usuarios y se verifica antes de reabrir.
