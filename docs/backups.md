# Respaldos automaticos de FICOTOX en OneDrive

Los respaldos se generan en `backups/` y despues se copian a Microsoft OneDrive.

> **Fase 10.** La base y los archivos los respalda una sola implementacion en Node
> (`scripts/respaldar-ficotox.mjs` → `src/lib/shared/respaldo.mjs`), la misma que usa
> **Administracion › Respaldos**. Este documento cubre la **copia externa** y las tareas
> programadas; el formato del respaldo, la llave, la retencion, la prueba de
> restauracion y el paso a paso para restaurar estan en **`docs/RESPALDO_Y_RECUPERACION.md`**.

## Destino en OneDrive

Si OneDrive esta instalado, el script lo detecta automaticamente desde Windows. En esta PC normalmente usara:

```powershell
C:\Users\alanv\OneDrive\FICOTOX
```

Si quieres indicar otra carpeta de OneDrive:

```powershell
[Environment]::SetEnvironmentVariable("FICOTOX_ONEDRIVE_SYNC_DIR", "C:\Users\alanv\OneDrive\Respaldos", "User")
```

Tambien puedes guardar esa misma configuracion en `.env` (raiz del proyecto):

```env
FICOTOX_ONEDRIVE_SYNC_DIR=C:\Users\alanv\OneDrive\Respaldos
```

Opcion para servidores con `rclone`:

```powershell
rclone config
[Environment]::SetEnvironmentVariable("FICOTOX_ONEDRIVE_REMOTE", "onedrive:FICOTOX", "User")
```

O en `.env`:

```env
FICOTOX_ONEDRIVE_REMOTE=onedrive:FICOTOX
```

## Destino online con Microsoft Graph

Para un servidor online, no uses la carpeta local de OneDrive. Configura subida directa por Microsoft Graph en `.env`:

```env
FICOTOX_GRAPH_ENABLED=true
FICOTOX_GRAPH_TENANT_ID=tu-tenant-id
FICOTOX_GRAPH_CLIENT_ID=tu-client-id
FICOTOX_GRAPH_CLIENT_SECRET=tu-client-secret
FICOTOX_GRAPH_DRIVE_ID=drive-id-del-onedrive-o-sharepoint
```

Opcionalmente puedes usar `MICROSOFT_TENANT_ID` y `MICROSOFT_CLIENT_ID` existentes; para Graph sigue siendo necesario `FICOTOX_GRAPH_CLIENT_SECRET`. El script lee `.env` de la raiz.

Si el destino es el OneDrive de un usuario, puedes usar esto en vez de `FICOTOX_GRAPH_DRIVE_ID`:

```env
FICOTOX_GRAPH_USER=correo@dominio.com
```

Si el destino es un sitio de SharePoint, puedes usar esto en vez de `FICOTOX_GRAPH_DRIVE_ID`:

```env
FICOTOX_GRAPH_SITE_ID=site-id
```

Por defecto los archivos se suben a estas carpetas online, que el script crea si no existen:

```text
backup/database
backup/code
```

Si necesitas ponerlos dentro de otra carpeta base:

```env
FICOTOX_GRAPH_BASE_PATH=FICOTOX
```

## Ejecutar manualmente

```powershell
.\scripts\backup-ficotox.cmd --target database
.\scripts\backup-ficotox.cmd --target code
.\scripts\backup-ficotox.cmd --target all
```

## Instalar autoguardado programado

Por defecto:

- Base de datos: cada 15 dias.
- Codigo: cada 3 meses.

```powershell
.\scripts\install-ficotox-backup-tasks.cmd
```

Frecuencia propuesta en la Fase 10 (diaria, por validar con Mejora Continua; ver `docs/RESPALDO_Y_RECUPERACION.md`):

```powershell
.\scripts\install-ficotox-backup-tasks.cmd daily
```

Si prefieres que la base se respalde una vez al mes:

```powershell
.\scripts\install-ficotox-backup-tasks.cmd monthly
```

## Que incluye cada respaldo

Base de datos (`--target database`):

- **SQLite** (segun `SQLITE_PATH`, o `instance/ficotox.sqlite3`): el script llama a `node scripts/respaldar-ficotox.mjs`, que crea el respaldo local `backups/<AAAAMMDD-HHMMSS>/` (snapshot en linea de la base, PDF de informes y evidencias de envio, evidencias de analisis, documentos SGC, reportes de mantenimiento, `manifest.json` y la llave de la bitacora en `llave/`) y aplica la retencion (`RESPALDO_RETENCION`). Despues empaqueta esa carpeta en `backups/database/ficotox-respaldo-<id>.zip` **sin la llave** y es ese zip el que se copia a OneDrive, rclone o Graph. Con `--incluir-llave` el zip lleva la llave (solo hacia un medio controlado). Requiere Node.js.
- **MySQL/MariaDB** si `DATABASE_URL` empieza con `mysql` y `mysqldump` esta instalado (volcado `.sql`; los archivos de `instance/` se copian aparte).
- Nunca se copian `JWT_SECRET`, las contrasenas SMTP ni otros secretos del `.env`.

Codigo:

- Incluye el codigo fuente (`src`, `public`, `scripts`, documentacion y las carpetas legadas `backend` y `frontend`).
- Excluye `.git`, `node_modules`, `.next`, `dist`, entornos virtuales, caches, `.env`, bases locales y la carpeta `backups`.
