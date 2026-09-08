# Respaldos automaticos de FICOTOX en OneDrive

Los respaldos se generan en `backups/` y despues se copian a Microsoft OneDrive.

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

Si prefieres que la base se respalde una vez al mes:

```powershell
.\scripts\install-ficotox-backup-tasks.cmd monthly
```

## Que incluye cada respaldo

Base de datos:

- SQLite local segun `SQLITE_PATH`, o bien `instance/ficotox.sqlite3`.
- MySQL/MariaDB si `DATABASE_URL` empieza con `mysql` y `mysqldump` esta instalado.

Codigo:

- Incluye el codigo fuente (`src`, `public`, `scripts`, documentacion y las carpetas legadas `backend` y `frontend`).
- Excluye `.git`, `node_modules`, `.next`, `dist`, entornos virtuales, caches, `.env`, bases locales y la carpeta `backups`.
