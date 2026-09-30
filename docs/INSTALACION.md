# Instalación de FICOTOX en la computadora del laboratorio

Guía paso a paso para el personal del laboratorio (Administrador técnico del sistema). No hace falta saber programar: se copian y pegan comandos en una terminal. Cada paso dice qué debe verse al terminar.

- **Instalación nueva**: pasos 1 a 13, en orden.
- **Actualizar** una instalación que ya funciona: sección [Actualizar](#actualizar).
- **Algo falla**: [Solución de problemas](#solución-de-problemas).

Referencias técnicas: `MANUAL_TECNICO.md` (§10 base de datos y migraciones, §14 despliegue), `docs/RESPALDO_Y_RECUPERACION.md` (respaldos), `docs/backups.md` (copias externas y tareas programadas) y `docs/DECISION_BASE_DE_DATOS.md` (SQLite o MySQL).

> **Reglas que no se rompen**
> - La **llave de la bitácora** (`SECRET_KEY`) se genera una sola vez y **no se cambia nunca**: sin ella no se puede comprobar que la bitácora no fue alterada. Guarda una copia fuera de la computadora (paso 5).
> - Nada se borra: los scripts **mueven** a `backups/` lo que reemplazan.
> - Las contraseñas temporales se muestran **una sola vez**.

---

## 0. Qué necesitas

| Qué | Detalle |
| --- | --- |
| Computadora | Windows 10/11 (recomendado para el laboratorio), macOS o Linux. Encendida durante el horario de trabajo, conectada por cable a la red del laboratorio. |
| Permisos | Una cuenta de **administrador** de la computadora (para instalar el servicio y abrir el firewall). |
| Espacio | Al menos 10 GB libres (la base, los PDF, las evidencias y 30 respaldos). |
| Python 3 (Windows) | Para la tarea programada de respaldo (`scripts\backup-ficotox.cmd` usa `backup_ficotox.py`). Instálalo de <https://www.python.org> marcando «Add python.exe to PATH». |
| Red | Una IP fija o reservada para esta computadora (pídela a Soporte Técnico de CICESE): los usuarios entrarán con `http://<IP>:5000`. |
| Correo | Los correos institucionales de quien será **Administrador técnico del sistema** y de quien será **Responsable General** (deben ser dos personas distintas). |

## 1. Instalar Node.js

1. Descarga Node.js **LTS** (versión 24, o 22.13 o posterior) de <https://nodejs.org> e instálalo con las opciones por omisión.
2. Abre una terminal nueva: en Windows, **PowerShell** (menú Inicio › escribe «PowerShell»). En macOS, **Terminal**.
3. Comprueba la versión:

   ```powershell
   node --version
   ```

   **Debe verse** `v24.x.x` o `v22.13.x` o posterior. Node 23 no sirve.

## 2. Obtener FICOTOX

Con Git (recomendado, facilita actualizar):

```powershell
cd C:\
git clone https://github.com/DeadAVA/FICOTOX.git
cd C:\FICOTOX
```

Sin Git: descomprime el `.zip` de FICOTOX en `C:\FICOTOX` y entra a la carpeta (`cd C:\FICOTOX`).

En macOS/Linux usa una carpeta propia, por ejemplo `~/FICOTOX`. En el resto de la guía, **todos los comandos se escriben dentro de la carpeta de FICOTOX**.

## 3. Instalar dependencias

```powershell
npm ci
```

**Debe verse** al final `added NNN packages` sin la palabra `ERR!`. Tarda unos minutos. Avisos como `npm warn install-scripts … better-sqlite3` o `npm warn deprecated …` son normales (se usan binarios precompilados); solo importan las líneas con `ERR!`.

## 4. Configurar (`npm run configurar`)

```powershell
npm run configurar
```

Pregunta, con un valor propuesto entre corchetes (Enter lo acepta):

| Pregunta | Qué contestar |
| --- | --- |
| Dirección en la que escucha | `0.0.0.0` (toda la red local). |
| Puerto | `5000` en Windows. En macOS el 5000 lo ocupa AirPlay: usa otro, p. ej. `5055`. |
| Dominios de correo permitidos | `cicese.mx`. |
| Carpeta de la instancia | `instance` (ahí viven la base, los PDF, la llave y los registros). |
| Servidor SMTP | Vacío si los informes se envían a mano desde el correo institucional. Si Soporte Técnico dio un servidor SMTP, escríbelo (y después puerto, usuario, remitente y contraseña). |

El script escribe `.env` con permisos solo para tu usuario, genera un `JWT_SECRET` fuerte y, si no existe, la **llave de la bitácora** (`SECRET_KEY`). Muestra solo su **huella** (los primeros caracteres de su SHA-256), nunca la llave completa.

**Debe verse**: `✅ JWT_SECRET: se generó…`, `✅ SECRET_KEY: se generó la llave de la bitácora (huella xxxxxxxx…)` y `Se actualizaron: …`.

Se puede volver a correr cuando quieras: no cambia lo que ya está bien, **nunca** cambia una `SECRET_KEY` existente y no reapunta una base ya configurada (`SQLITE_PATH` o `DATABASE_URL`).

Sin teclado interactivo (p. ej. un script), las respuestas van como opciones: `npm run configurar -- --no-interactivo --host 0.0.0.0 --puerto 5000 --dominios cicese.mx --instancia instance` (y `--smtp-host`, `--smtp-puerto`, `--smtp-usuario`, `--smtp-from`; la contraseña SMTP, en la variable `FICOTOX_SMTP_PASS`). La contraseña SMTP no se muestra al escribirla.

En Windows, restringe además el archivo `.env` (el servicio corre como SYSTEM y necesita leerlo):

```powershell
icacls .env /inheritance:r /grant:r "${env:USERNAME}:F" /grant:r "SYSTEM:R" /grant:r "Administradores:F"
```

(En Windows en inglés usa `Administrators` en lugar de `Administradores`.)

## 5. Guardar la llave fuera de la computadora

1. Abre `.env` con el Bloc de notas (`notepad .env`).
2. Copia el valor de la línea `SECRET_KEY=` (64 caracteres).
3. Guárdalo en un gestor de contraseñas institucional o imprímelo y guárdalo en un sobre cerrado bajo resguardo de Mejora Continua.
4. Cierra el Bloc de notas **sin cambiar nada**.

Sin esta copia, si la computadora se pierde, los respaldos se pueden restaurar pero no se puede demostrar que su bitácora está íntegra.

## 6. Compilar

```powershell
npm run build
```

**Debe verse** al final `[standalone] paquete limpio …: sin .env, bases, llaves ni respaldos`. Tarda 1 a 3 minutos.

## 7. Crear la instancia de producción (`npm run instancia-nueva`)

Crea la base **vacía** (sin datos de demostración) con las dos cuentas mínimas: un **Administrador técnico del sistema** (da de alta cuentas) y un **Responsable General** (autoriza los cambios de rol). Si ya había una instancia (por ejemplo, la de demostración), la **mueve** con su llave a `backups/pre-produccion-<fecha>/`; no borra nada.

Primero, sin confirmar, para ver qué hará:

```powershell
npm run instancia-nueva
```

**Debe verse** `No se hizo ningún cambio`. Después:

```powershell
npm run instancia-nueva -- --confirmar
```

Pide el nombre y el correo institucional de cada persona. Al final muestra:

```text
==================== CONTRASEÑAS TEMPORALES (se muestran UNA sola vez) ====================
  Administrador técnico del sistema: nombre@cicese.mx  →  Fx-…
  Responsable General: otra@cicese.mx  →  Fx-…
```

**Anota las dos contraseñas y entrégalas en persona.** Cada quien deberá cambiarla al entrar por primera vez. No se guardan en ningún archivo.

Todo lo que hace este paso queda en la bitácora como «sistema».

## 8. Primera prueba (a mano)

```powershell
npm run start:standalone
```

**Debe verse** `FICOTOX escuchando en http://0.0.0.0:5000` y se abre el navegador. Entra con la cuenta del Administrador técnico y la contraseña temporal: el sistema pide cambiarla. Después cierra la terminal con **Ctrl+C** (el servidor se detiene).

Si dice que el puerto está en uso, ver [Solución de problemas](#el-puerto-5000-ya-está-en-uso).

## 9. Instalar el servicio (arranque automático)

Para que FICOTOX arranque solo al encender la computadora (aun sin iniciar sesión) y se reinicie si falla.

**Windows**: abre PowerShell **como administrador** (clic derecho sobre PowerShell › «Ejecutar como administrador»), entra a la carpeta y corre:

```powershell
cd C:\FICOTOX
npm run instalar-servicio
```

Crea la tarea programada `FICOTOX` (al iniciar el sistema, cuenta SYSTEM, reintento cada minuto si no logra iniciar) y la regla del firewall `FICOTOX` para el puerto 5000 en redes privadas y de dominio (no en redes públicas). Al final la arranca.

Si el servidor se cae mientras funciona, el propio lanzador lo vuelve a levantar (a los 5 s, luego 10, 20… hasta cada 60 s) y lo anota en `instance\logs`. No lo relanza si el problema no se arregla solo (configuración, migración fallida, otra copia de FICOTOX sobre la misma instancia): en ese caso se detiene y el registro dice por qué.

**Debe verse** `✅ Servicio instalado…`. Si dice `Sin permisos de administrador`, repite desde una terminal «Ejecutar como administrador».

Para ver solo lo que haría: `npm run instalar-servicio -- --simular`. Para quitarlo: `npm run quitar-servicio` (no toca la base ni los respaldos).

**macOS**: `npm run instalar-servicio` genera `instance/servicio/mx.cicese.ficotox.plist` e imprime los comandos (con `sudo`) para instalarlo como LaunchDaemon. Cópialos tal cual. Firewall: Ajustes del Sistema › Red › Firewall › Opciones › permitir conexiones entrantes para `node`.

**Linux**: genera `instance/servicio/ficotox.service` e imprime los comandos para `systemd` (`sudo systemctl enable --now ficotox`) y para abrir el puerto con `ufw` solo a la red del laboratorio.

## 10. Averiguar la dirección para los usuarios

- Windows: `ipconfig` → «Dirección IPv4» del adaptador de la red del laboratorio (p. ej. `10.0.3.25`).
- macOS: `ipconfig getifaddr en0`. Linux: `hostname -I`.

Los usuarios entran con `http://<IP>:5000` (o `https://…` si activaste HTTPS). Prueba desde otra computadora de la red. Si la IP cambia al reiniciar, pide a Soporte Técnico una IP fija o reservada.

## 11. Respaldos

1. Tarea diaria de respaldo (Windows, PowerShell como administrador):

   ```powershell
   .\scripts\install-ficotox-backup-tasks.cmd daily
   ```

   (Detalle y copias externas a OneDrive en `docs/backups.md`.) La tarea se crea con tu usuario: para que corra aunque nadie haya iniciado sesión, abre el Programador de tareas › «FICOTOX respaldo base de datos» › Propiedades › «Ejecutar tanto si el usuario inició sesión como si no».
2. Primer respaldo, ahora:

   ```powershell
   npm run respaldar
   ```

   **Debe verse** la carpeta del respaldo, `backups\AAAAMMDD-HHMMSS`.

   La tarea corre a las 02:00. Si la computadora se apaga de noche, cámbiala a una hora de trabajo: `schtasks /Change /TN "FICOTOX respaldo base de datos" /ST 13:00` (y, en el Programador de tareas, marca «Ejecutar la tarea lo antes posible si no se ejecutó a la hora programada»). En macOS/Linux, con `crontab -e` agrega una línea como `0 13 * * * cd /ruta/a/FICOTOX && /opt/homebrew/bin/node scripts/respaldar-ficotox.mjs` (Linux: `/usr/bin/node`; bajo cron no sirve `npm run`, porque el PATH de cron no encuentra `node`); `verificar-instalacion` la reconoce.
3. Prueba de restauración (en una carpeta aparte, **no** toca la instancia):

   ```powershell
   npm run restaurar -- --respaldo AAAAMMDD-HHMMSS --responsable "Tu nombre"
   ```

   **Debe verse** todas las verificaciones con ✅ y el acta en `backups\pruebas-restauracion\`. Repítela al menos cada 90 días.

   La prueba deja una **copia completa de los datos** en `instance-restaurada\<fecha>\` (el script imprime la ruta). Revísala si hace falta y bórrala al terminar: el acta es la evidencia.

## 12. Verificar la instalación

```powershell
npm run verificar-instalacion
```

Revisa y marca con ✅ (bien), ⚠️ (revisar; no impide operar) o ❌ (corregir antes de operar):

Node.js · espacio en disco · hora y zona · `JWT_SECRET` · llave de la bitácora (y que su huella sea la registrada) · migraciones · integridad de la bitácora · tarea de respaldo · respaldo de las últimas 24 h · prueba de restauración de los últimos 90 días · autorizaciones y evidencia obligatorias · CORS · HTTPS · cuentas de demostración `@ficotox.local` activas · que haya quien gestione cuentas (`usuarios:G`) y quien autorice cambios de rol (`usuarios:A`) · arranque automático · paquete de producción limpio.

Deja el reporte en `instance\verificaciones\<fecha>.md` (consérvalo como evidencia de la instalación). Sale con código 1 si hay algún ❌.

En una instalación HTTP normal quedan dos ⚠️ aceptables: **HTTPS** (red interna) y, en macOS/Linux, la **tarea de respaldo** si se programó de otra forma. Todo ❌ se corrige con la indicación que da el propio renglón.

## 13. Alta del personal

Detalle en `MANUAL_USUARIO.md` §13.1–13.2 (usuarios y roles), §13.8 (segundo usuario) y §13.10 (FX-THF-AP).

1. **Cambiar las contraseñas temporales**: el Administrador técnico y el Responsable General entran con la del paso 7 y el sistema les pide cambiarla.
2. **Primeras cuentas de coordinación**: el Administrador técnico (Administración › Usuarios › Nuevo usuario) da de alta a la Coordinación del Área Técnica y a Mejora Continua, con correo `@cicese.mx` y rol. Pide su contraseña de nuevo (reautenticación) y el alta con rol queda como **solicitud** que el Responsable General aprueba en «Por autorizar».
3. **Resto del personal**: igual que el punto 2.
4. **Contraseña inicial**: la que el administrador escribe al dar de alta no obliga a cambiarla. Después del alta usa «Restablecer contraseña» (Administración › Usuarios): genera una temporal que la persona debe cambiar al entrar. Entrégala en persona.
5. **Autorizaciones FX-THF-AP** (actividades, métodos y equipos de cada persona): las registran el Responsable General, la Coordinación del Área Técnica o Mejora Continua, cada uno en la ficha de la persona. No las registra el Administrador técnico, y nadie se autoriza a sí mismo; por eso primero se dan de alta las coordinaciones (punto 2), que después autorizan al Responsable General y entre sí. Con `AUTORIZACIONES_OBLIGATORIAS=true` nadie guarda formatos sin su autorización.

---

## HTTPS (opcional)

En la red interna del laboratorio HTTP es aceptable (`verificar-instalacion` lo marca ⚠️). Para cifrar:

1. **Certificado institucional** (preferido): pide a Soporte Técnico un certificado para el nombre o la IP de esta computadora, en formato PEM (`.crt` y `.key`).
2. **Certificado propio** (autofirmado; los navegadores mostrarán una advertencia hasta que se instale el certificado en cada equipo). Con OpenSSL (incluido en Git para Windows: `C:\Program Files\Git\usr\bin\openssl.exe`):

   ```powershell
   mkdir instance\tls
   openssl req -x509 -newkey rsa:2048 -nodes -days 825 -keyout instance\tls\ficotox.key -out instance\tls\ficotox.crt -subj "/CN=ficotox" -addext "subjectAltName=IP:10.0.3.25,DNS:ficotox"
   ```

   (Cambia `10.0.3.25` por la IP del paso 10.)
3. Agrega a `.env`:

   ```text
   TLS_CERT=instance/tls/ficotox.crt
   TLS_KEY=instance/tls/ficotox.key
   ```

   (y `TLS_CA=` con la cadena de la CA, si el certificado institucional la trae aparte).
4. Reinicia: `npm run reiniciar` (Windows, en PowerShell como administrador). **Debe verse** en el registro `FICOTOX escuchando en https://…`. Los usuarios entran con `https://<IP>:5000`. Con HTTPS activo, `http://<IP>:5000` no responde (el navegador muestra una página vacía o un error): hay que escribir `https://`.

`verificar-instalacion` avisa 30 días antes de que venza el certificado.

## Operación diaria

| Qué | Windows | macOS | Linux |
| --- | --- | --- | --- |
| Estado | `schtasks /Query /TN FICOTOX /V /FO LIST` | `sudo launchctl print system/mx.cicese.ficotox` | `systemctl status ficotox` |
| Detener | `npm run detener` (PowerShell como administrador) | `npm run detener` | `npm run detener` |
| Reiniciar | `npm run reiniciar` (como administrador) | `npm run reiniciar` | `npm run reiniciar` |
| Arrancar | `schtasks /Run /TN FICOTOX` | `sudo launchctl kickstart system/mx.cicese.ficotox` | `sudo systemctl start ficotox` |

`npm run detener` detiene al lanzador y al servidor sin que el lanzador lo relance (deja la señal `instance\detener` y termina al lanzador con todo su árbol; en Windows, además, `schtasks /End`). Úsalo en lugar de `schtasks /End` o de cerrar procesos a mano: en Windows, terminar solo el servidor se toma como una caída y el lanzador lo vuelve a levantar. Sin servicio (arrancado con `npm run start:standalone` en una ventana), también basta **Ctrl+C** en esa ventana; si quedó en segundo plano (p. ej. después de `npm run actualizar`), `npm run detener`.

- Si el servidor se cae, el lanzador lo relanza solo (ver paso 9); cada caída y reinicio queda en el registro.
- **Registros** del servidor: `instance\logs\ficotox-AAAA-MM-DD.log`. Uno por día; se rota a partir de 10 MB (`LOG_MAX_MB`) y se quitan los de más de 90 días (`LOG_RETENCION_DIAS`). No contienen contraseñas, tokens ni correos completos. La **bitácora de auditoría** (quién hizo qué) está en la base, no en estos archivos.
- **Una vez por semana**: `npm run verificar-instalacion`.
- **Cada 90 días**: prueba de restauración (paso 11.3).

## Actualizar

### Con el script (`npm run actualizar`)

1. PowerShell **como administrador** (para detener y arrancar el servicio), en la carpeta de FICOTOX.
2. Si instalaste con Git:

   ```powershell
   npm run actualizar -- --git
   ```

   Sin Git: copia primero los archivos nuevos sobre la carpeta (sin tocar `.env`, `instance\` ni `backups\`) y corre `npm run actualizar`.

El script:

1. crea un respaldo (`pre-actualizacion`);
2. detiene el servidor;
3. aparta el build actual (`.next` → `.next-anterior`), instala dependencias y compila. **Si falla, devuelve el build anterior y arranca el servidor como estaba**; la base no se tocó;
4. migra la base (con otro respaldo previo, `pre-migracion`). Si una migración falla, esa migración se deshace. Si **ninguna** alcanzó a aplicarse, el servidor vuelve a arrancar con el build anterior. Si alguna anterior de esta misma actualización sí se aplicó, el script dice en qué versión quedó la base y **no** arranca (el build anterior no sirve con ella): corrige la causa y repite `npm run actualizar`, o vuelve exactamente a como estaba restaurando el respaldo `pre-actualizacion` (el script imprime el comando);
5. arranca el servidor y espera a que responda `/api/health/db`;
6. corre `npm run verificar-instalacion`.

**Debe verse** al final `Actualizado: <commit anterior> → <commit nuevo>`. Anota el commit anterior: sirve para revertir.

Para ver solo los pasos: `npm run actualizar -- --simular`.

### Revertir a la versión anterior

Si la versión nueva no sirve (después de actualizar):

1. Detén el servidor: `npm run detener`.
2. Vuelve al código anterior: `git checkout <commit anterior>` (sin Git: copia de nuevo la carpeta de la versión anterior). Con Git queda en «HEAD separado»: para volver a actualizar más adelante, primero `git checkout main` (o la rama que usa el laboratorio).
3. `npm ci` (las dependencias de la versión anterior).
4. Si la actualización aplicó migraciones, la base quedó en una versión **más nueva** que el código anterior y el servidor no arrancará («La base está en la versión N…»). Restaura el respaldo `pre-actualizacion`:

   ```powershell
   npm run restaurar -- --respaldo <id del respaldo pre-actualizacion> --destino instance --confirmar --responsable "Tu nombre"
   ```

   (Antes de restaurar, el script respalda la instancia actual; nada se pierde. Lo registrado después de actualizar queda en ese respaldo.)
5. `npm run build`.
6. Arranca el servidor (`schtasks /Run /TN FICOTOX` o `npm run start:standalone`) y corre `npm run verificar-instalacion`.

### A mano (sin el script)

`npm run respaldar -- --etiqueta "antes de actualizar"` → `npm run detener` → `git pull` (o copiar archivos) → `npm ci` → `npm run build` → `npm run migrar` → arrancar → `npm run verificar-instalacion`. Si el build falla, no arranques con la versión a medias: `git checkout <commit anterior>`, `npm ci`, `npm run build` y arranca.

## Migraciones de la base

El esquema de la base tiene versión (tabla `schema_migraciones`). Normalmente no hay que hacer nada: al arrancar, el servidor aplica las migraciones pendientes después de crear un respaldo `pre-migracion`, y cada una queda en la bitácora («Sistema aplicó la migración N»).

```powershell
npm run migrar -- --estado     # versión de la base y migraciones pendientes
npm run migrar -- --simular    # qué haría, sin cambiar nada
npm run migrar                 # aplicar (con el servidor detenido; hace su propio respaldo)
```

Con `MIGRAR_AL_ARRANCAR=false` en `.env`, el servidor no arranca si hay pendientes y pide correr `npm run migrar`.

## Solución de problemas

### El puerto 5000 ya está en uso

`FICOTOX no arranca: el puerto 5000 ya está en uso…`. Casi siempre es FICOTOX corriendo ya como servicio. Compruébalo con `schtasks /Query /TN FICOTOX` o en `http://localhost:5000`. Si es otro programa: `netstat -ano | findstr :5000` muestra su PID. Detenlo o cambia `PORT` en `.env` (y vuelve a correr `npm run instalar-servicio` para abrir el puerto nuevo en el firewall). En macOS, el puerto 5000 lo usa AirPlay: cambia `PORT`.

### «Ya hay un servidor sobre esta instancia» y no hay ninguno

FICOTOX guarda en `instance\servidor.lock` el número de proceso del servidor. Si la computadora se apagó de golpe, ese archivo queda huérfano; un archivo de **antes del último encendido** se ignora solo. Si aun así aparece el mensaje:

1. Comprueba que de verdad no está corriendo: `http://localhost:5000` no responde y `npm run detener` dice «no estaba encendido».
2. `npm run detener` (retira también los archivos de bloqueo que ya no correspondan a un proceso vivo) y vuelve a arrancar.
3. Si persiste, el número de proceso lo usa hoy otro programa: mueve (no borres) `instance\servidor.lock` a otra carpeta y arranca.

### No hay permiso para usar el puerto

Los puertos menores a 1024 requieren privilegios: usa `5000` u otro mayor.

### `Sin permisos de administrador` al instalar el servicio

Abre PowerShell con clic derecho › «Ejecutar como administrador» y repite.

### Los demás equipos no entran

1. En la propia computadora, ¿abre `http://localhost:5000`? Si no, el servidor no está corriendo (Operación diaria › Estado; revisa `instance\logs`).
2. ¿La IP es la correcta (paso 10)? ¿Cambió?
3. ¿Existe la regla del firewall? `netsh advfirewall firewall show rule name=FICOTOX`. Si la red de Windows está marcada como **Pública**, la regla (privada/dominio) no aplica: pide a Soporte Técnico que la red del laboratorio sea «Privada» o «Dominio».

### `[migraciones] FICOTOX no arranca: …`

El mensaje dice qué pasa y, si hubo, dónde quedó el respaldo previo:

| Mensaje | Qué hacer |
| --- | --- |
| La migración N falló … se revirtió | Esa migración se deshizo; las anteriores de la misma corrida quedaron aplicadas (cada una va en su propia transacción). Revisa el detalle, corrige la causa (espacio en disco, permisos) y reinicia: termina lo que falta. Para volver **exactamente** a como estaba antes de actualizar, restaura el respaldo previo (ruta indicada) con `npm run restaurar -- --respaldo <id> --destino instance --confirmar`. |
| La base está en la versión N y esta aplicación solo conoce hasta la M | Se restauró una base más nueva o el código es viejo: actualiza la aplicación. |
| La migración N cambió después de aplicarse | Alguien modificó el código de una migración ya aplicada. Vuelve al código publicado (`git status`, `git checkout -- src/lib/server/migraciones`). |
| …su esquema no coincide con ninguna versión conocida | La base fue modificada a mano. No se tocó nada. Restaura el último respaldo bueno y pide soporte técnico con el reporte de diferencias. |
| Otro proceso está migrando | Espera o detén el otro proceso (otra terminal con `npm run migrar`). Si no hay ninguno (p. ej. se fue la luz a mitad de una migración), el bloqueo se libera solo al reiniciar la computadora o 30 minutos después de tomado; entonces vuelve a arrancar (`npm run reiniciar`). |
| Hay migraciones pendientes y MIGRAR_AL_ARRANCAR=false | Corre `npm run migrar` con el servidor detenido. |

### `verificar-instalacion` marca ⚠️ «Cuentas de demostración»

Hay cuentas `@ficotox.local` activas: la instancia es la de demostración. No operes así en producción: desactívalas en Administración › Usuarios o, en una instalación nueva, usa `npm run instancia-nueva -- --confirmar`.

### `verificar-instalacion` marca ❌

| Renglón | Qué hacer |
| --- | --- |
| JWT_SECRET | `npm run configurar`. |
| Llave de la bitácora: la llave actual NO es la registrada | Alguien cambió `SECRET_KEY` en `.env`. Restaura el valor guardado en el paso 5. **No** generes una nueva. |
| Integridad de la bitácora | No sigas operando: avisa a Mejora Continua. Compara con el último respaldo verificado (`npm run restaurar` en modo prueba). |
| Cuentas de administración | Tiene que haber al menos una persona activa con `usuarios:G` y otra con `usuarios:A`. |
| Build de producción | `npm run build`. |

### Olvidé la contraseña del Administrador técnico

Otra persona con `usuarios:G` la restablece en Administración › Usuarios. Si nadie puede, con el servidor detenido:

```powershell
node scripts/set-password.mjs correo@cicese.mx "Temporal-Segura-2026" --motivo "Nadie con usuarios:G podía entrar"
```

La contraseña debe cumplir la misma política que la aplicación (10+ caracteres). Queda como temporal (se cambia al entrar), cierra las sesiones abiertas de esa cuenta y queda en la bitácora como «sistema» con el motivo.

### La hora es incorrecta

Activa «Establecer hora automáticamente» (Windows: Configuración › Hora e idioma). Las firmas, las fechas de los registros y la bitácora dependen de la hora del equipo. FICOTOX muestra las fechas en la zona del laboratorio (America/Tijuana).

## MySQL/MariaDB (instalaciones con base centralizada)

Solo si el laboratorio decide usar MySQL (ver `docs/DECISION_BASE_DE_DATOS.md`). El DBA crea la base vacía (`CREATE DATABASE ficotox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`) y un usuario con permisos sobre ella. Después:

1. En `.env`: `DATABASE_URL=mysql://usuario:clave@servidor:3306/ficotox`.
2. Respaldo **antes** de cada migración o actualización (no lo hace la aplicación):

   ```bash
   mysqldump --single-transaction --routines --triggers --hex-blob -u usuario -p ficotox > ficotox-AAAAMMDD.sql
   ```

   y copia aparte la carpeta `instance/` (PDF, evidencias, llave).
3. Migrar: `npm run migrar -- --respaldo-hecho` (o `MIGRAR_MYSQL_RESPALDO_HECHO=true` para que el servidor migre al arrancar).
4. Alta de las cuentas mínimas: `instancia-nueva` es solo para SQLite. En MySQL se crea el primer administrador como indica `MANUAL_TECNICO.md` §15.3.
5. **Restaurar** un volcado en una base de prueba y **verificar la bitácora**:

   ```bash
   mysql -u usuario -p -e "CREATE DATABASE ficotox_prueba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   mysql -u usuario -p ficotox_prueba < ficotox-AAAAMMDD.sql
   DATABASE_URL=mysql://usuario:clave@servidor:3306/ficotox_prueba npm run verificar-instalacion
   ```

   El renglón «Integridad de la bitácora» comprueba la cadena completa (sellos, huecos y triggers) con la misma llave.
6. Para pasar una instalación SQLite a MySQL: `npm run sqlite-a-mysql -- --simular` y después `--destino … --confirmar` (ver `docs/DECISION_BASE_DE_DATOS.md`).

`npm run test:mysql` prueba las migraciones, la bitácora, la concurrencia y el arranque contra un servidor MySQL/MariaDB (Docker o `MYSQL_TEST_URL`).
