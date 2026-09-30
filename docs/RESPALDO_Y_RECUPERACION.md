# Respaldo y recuperación de FICOTOX

Procedimiento de la Fase 10. Cubre la sección 9 de la especificación FX-MO-2-1 ("El Administrador técnico ejecutará respaldos y pruebas de recuperación") y lo que pide la presentación del PVVC: una prueba de restauración documentada, con el tiempo esperado, el responsable y el resultado.

Los puntos marcados **por validar con Mejora Continua** son una propuesta. Quedan así hasta que el laboratorio los apruebe.

## 1. Qué se respalda, qué no y por qué

Cada respaldo es una carpeta `backups/<AAAAMMDD-HHMMSS>/` (o `FICOTOX_BACKUP_DIR`) con esta estructura:

| Parte | Contenido | Por qué |
| --- | --- | --- |
| `datos/ficotox.sqlite3` | La base completa. Se toma con la **API de respaldo en línea de SQLite**, no copiando el archivo en crudo. | La copia es consistente aunque el servidor esté encendido y escribiendo, también con WAL. |
| `archivos/informes/` | PDF de los informes y evidencias de envío (`informes/envios/`). | Son registros del laboratorio. Su SHA-256 está en la base (`pdf_sha256`, `evidencia_sha256`). |
| `archivos/evidencias/` | Evidencia instrumental de los análisis (Fase 10). | Respalda los resultados. Su SHA-256 está en `adjuntos.sha256`. |
| `archivos/documentos_sgc/` | Archivos de los documentos del SGC. | Control documental (8.3). Su SHA-256 está en `archivo_sha256`. |
| `archivos/maintenance_reports/` | Reportes de mantenimiento en PDF. | Historial de equipos. |
| `manifest.json` | Fecha y hora, equipo (host), versión de la app (commit), versión de esquema (la real de la base respaldada, de `schema_migraciones`; `null` si es anterior a las migraciones) y la de la app (`esquema_app`), motor, conteo de filas por tabla, número de entradas de la bitácora con el id y el sello de la última, lista de archivos con tamaño y SHA-256, si incluye la llave con su **huella** (SHA-256 de la llave, nunca la llave) y el **sello del manifest** (HMAC-SHA256 con la llave de la bitácora). | Permite verificar el respaldo completo antes de confiar en él. |
| `llave/llave-bitacora.txt` | La llave del sello de la bitácora: `SECRET_KEY`, o `instance/auditoria.key` si es la que se usa. | Sin ella no se puede verificar la bitácora restaurada. |

**No se respalda:**

- `JWT_SECRET`, las contraseñas SMTP, los secretos de Microsoft Graph ni el resto del `.env`. Son secretos de operación y se reponen al instalar.
- `node_modules`, `.next` y el código. El código se respalda aparte con `backup_ficotox.py --target code`, y el `.env` queda excluido también ahí.
- Los temporales de escritura (`.*.tmp`).

**MySQL/MariaDB:** este formato es solo para SQLite (procedimiento con `mysqldump` y verificación de la bitácora con `verificar-instalacion` en `docs/INSTALACION.md`, «MySQL/MariaDB»). Con `DATABASE_URL=mysql://...` la base se respalda con `mysqldump --single-transaction --routines --triggers` (lo hace `scripts/backup_ficotox.py --target database`) y se restaura con `mysql ficotox < respaldo.sql`. Los archivos de `instance/` se copian aparte. Para verificar la bitácora de un volcado: restaurarlo en una base de prueba y correr `npm run verificar-instalacion` con `DATABASE_URL` apuntando a ella (Fase 12).

## 2. Cómo se crea un respaldo

| Vía | Comando o acción | Queda en la bitácora |
| --- | --- | --- |
| Terminal | `npm run respaldar` (añade `--sin-llave` para omitir la llave y `--etiqueta "texto"` para identificarlo) | No. El registro es el `manifest.json`: el script no escribe en la base mientras el servidor atiende. |
| Tarea programada (Windows) | `scripts\backup-ficotox.cmd --target database`, que llama a `backup_ficotox.py` y este a `respaldar-ficotox.mjs` | No (igual que la terminal). |
| Interfaz | **Administración › Respaldos › Crear respaldo ahora** (usuarios:G, con contraseña) | Sí (`respaldar`). |

Las tres vías usan la **misma implementación**: `src/lib/shared/respaldo.mjs`. La comparten el servidor y los scripts, igual que `audit-chain.mjs`.

**Copias externas** (OneDrive, rclone o Microsoft Graph): `backup_ficotox.py` empaqueta la carpeta en `backups/database/ficotox-respaldo-<id>.zip` **sin la llave** y la copia al destino configurado (ver `docs/backups.md`). Con `--incluir-llave` la llave va en el zip; hacerlo solo si el destino es un medio controlado.

**Retención:** se conservan los `RESPALDO_RETENCION` respaldos locales más recientes (30 por omisión). **Nunca se borra el último respaldo verificado**, es decir, el más reciente con una prueba de restauración aprobada.

## 3. Frecuencia y retención (por validar con Mejora Continua)

- **Respaldo local: diario** (02:00), con `scripts\install-ficotox-backup-tasks.cmd daily`. Hoy la tarea instalada por omisión es cada 15 días.
- **Copia externa: semanal** (OneDrive/Graph). Hoy la copia externa se hace en cada ejecución del script; programar una tarea semanal aparte con `--target database` si se separan.
- **Retención local:** 30 respaldos (`RESPALDO_RETENCION=30`), más el último verificado.
- **Ubicación de las copias externas:** OneDrive institucional del laboratorio (carpeta `backup/database`). Por validar qué cuenta y quién tiene acceso.

## 4. Dónde se guarda la llave

La llave del sello **no se cambia nunca** (ver `MANUAL_TECNICO.md` §9.5).

- Va en el respaldo **local** (`llave/`), separada de la base. En las copias externas **no**, salvo con `--incluir-llave`.
- Además se guarda **aparte, en un medio controlado**: una memoria USB cifrada o un gestor de secretos institucional, bajo custodia del Administrador técnico, con una copia sellada con la Responsable General. *Por validar con Mejora Continua.*
- Si el respaldo no trae la llave, la restauración la recibe con `--llave <ruta>`. El script compara su huella con la del manifest y, si no coincide, lo dice y no da la bitácora por verificada.

## 5. Tiempo objetivo de recuperación

- **Objetivo (RTO): 1 hora** desde que se decide restaurar hasta que el servidor vuelve a atender, con los datos del último respaldo diario. *Por validar con Mejora Continua.*
- **Pérdida máxima aceptable (RPO): 24 horas** (lo capturado desde el último respaldo diario). *Por validar.*
- La restauración en sí tarda segundos con el tamaño actual (ver el tiempo en cada acta). El resto del objetivo es diagnóstico, decisión y comprobación.

## 6. Responsables

- **Ejecuta** respaldos, pruebas y restauraciones: el **Administrador técnico del sistema**.
- **Revisa** las actas y la periodicidad de las pruebas: **Mejora Continua**. La Responsable General y el Auditor pueden consultarlas en **Administración › Respaldos**.

## 7. Prueba de restauración (trimestral)

Es obligatoria **cada trimestre**, además de después de un cambio importante de versión o de servidor. Si no hay una prueba aprobada en `PRUEBA_RESTAURACION_AVISO_DIAS` (90), el sistema avisa en Respaldos, en el Inicio y en la campana.

```bash
npm run respaldar                      # si no hay uno reciente
npm run restaurar -- --respaldo <AAAAMMDD-HHMMSS> --responsable "Administrador técnico"
```

El **modo prueba** (por omisión) restaura en `instance-restaurada/<fecha>/` y **no toca la instancia real**. Hace estas verificaciones y deja cada una en el acta:

1. `manifest.json` válido, rutas seguras (solo `datos/ficotox.sqlite3` y `archivos/<carpeta respaldada>/…`, sin `..`, sin enlaces simbólicos ni directorios; si no, no se copia nada) y SHA-256 de cada archivo del respaldo (detecta un respaldo alterado). Un manifest malformado también queda como ❌ en el acta.
2. `PRAGMA integrity_check = ok` de la base restaurada.
3. Esquema compatible (Fase 12: mismo motor de migraciones que el servidor): si el respaldo es de una versión **más nueva** que la app, o su esquema tiene diferencias desconocidas, falla. Si es más vieja (o anterior a las migraciones, reconocida por línea base), se restaura y **se migra** a la versión actual; la migración queda en la bitácora de la base restaurada.
4. Llave: su huella coincide con la del manifest y el **sello del manifest** es válido con ella (detecta un respaldo alterado aunque se hayan recalculado las huellas). También se compara con la llave **configurada en esta instalación** y el acta dice si coincide.
   - **Alcance del sello:** protege de verdad los respaldos que **no** llevan la llave (copias externas). Si la llave viaja dentro del respaldo, quien pueda escribir ese respaldo puede resellarlo; por eso la llave se guarda **aparte** y, ante la duda, la prueba se repite con `--llave <la guardada aparte>` o en la instalación del laboratorio (donde el acta confirma que es la misma llave).
5. Cadena de la bitácora íntegra con esa llave: sellos, huecos de id, filas faltantes al final y triggers. Usa la misma verificación que **Verificar integridad**.
6. Conteos por tabla iguales al manifest, y el sello de la última entrada de la bitácora.
7. Archivos contra la base: los PDF de informes, las evidencias de envío, los adjuntos y los documentos SGC tienen el SHA-256 registrado en la base. Reporta los faltantes y los alterados.
8. Tiempo total.

El resultado se guarda en `backups/pruebas-restauracion/<fecha>.md` (y `.json`). La salida del comando es distinta de 0 si algo falla.

La copia restaurada de `instance-restaurada/<fecha>/` contiene **datos del laboratorio** (base y archivos). Está en `.gitignore`, pero no se borra sola: revisarla si hace falta y **eliminarla al terminar la prueba** (o moverla al mismo medio controlado que los respaldos). En el modo real, la carpeta de preparación `instance-restaurada/<fecha>-real/` se elimina de la misma forma una vez comprobado el arranque.

## 8. Restauración real (paso a paso)

Solo ante una pérdida o corrupción de datos, y con la decisión registrada.

1. **Avisar** al personal y **detener el servidor** de FICOTOX con `npm run detener` (Fase 12: detiene al lanzador y al servidor sin que se relance; en Windows, desde PowerShell como administrador si corre como servicio).
2. **Elegir el respaldo**: el más reciente verificado en **Administración › Respaldos**, o en `backups/`.
3. **Ubicar la llave**: la del respaldo (`llave/`) o la guardada aparte (`--llave <ruta>`). Si la instancia usa `SECRET_KEY`, el `.env` debe tener **la misma** llave del respaldo. Si no, el script se niega.
4. **Ejecutar:**

   ```bash
   npm run restaurar -- --respaldo <AAAAMMDD-HHMMSS> --destino instance --confirmar --responsable "Administrador técnico" [--llave <ruta>]
   ```

   El script:
   - se niega si falta `--confirmar`, si el puerto configurado (`PORT`) está en uso o si existe `instance/servidor.lock` de un proceso vivo (el servidor lo escribe al arrancar);
   - restaura primero en una carpeta de preparación y hace las verificaciones 1 a 7. Si alguna falla, **no toca la instancia**;
   - si la instalación usa `instance/auditoria.key` y es distinta de la llave del respaldo, se niega salvo con `--aceptar-llave-del-respaldo` (después de confirmar el respaldo con la llave guardada aparte);
   - crea un **respaldo automático de la instancia actual** (etiqueta "antes de restaurar …");
   - reemplaza la base y las carpetas de archivos y, si la llave es `auditoria.key`, la deja en `instance/`;
   - agrega a la bitácora de la base restaurada la entrada **"restauración desde respaldo &lt;id&gt;"** (actor: sistema), sellada con `audit-chain.mjs`, y comprueba que la cadena sigue íntegra;
   - genera el acta (modo real).
5. **Arrancar el servidor** y entrar a **Auditoría › Verificar integridad**. Debe salir en verde y la última entrada debe ser la restauración.
6. **Revisar** con Mejora Continua lo capturado después del respaldo (RPO) y registrarlo de nuevo si hace falta.

## 9. Formato del acta

`backups/pruebas-restauracion/<AAAAMMDD-HHMMSS>.md` (legible) y `.json` (para la pantalla Respaldos):

- **Encabezado:** fecha (America/Tijuana), respaldo usado y su fecha, responsable, modo (prueba o real), destino, equipo, versión de la app y tiempo total.
- **Verificaciones:** tabla con el número, el nombre, ✅/❌ y el detalle de cada una de las 8 verificaciones.
- **Conclusión:** "aprobada", si todo está en ✅, o cuántas fallaron.
- **Observaciones:** migración de esquema pendiente, destino de la copia de prueba, respaldo previo en el modo real.
- **Firmas:** espacio para el responsable y para quien revisa (Mejora Continua).

La primera prueba real (Fase 10) se hizo sobre la base real en modo prueba. Su acta está en `backups/pruebas-restauracion/`.
