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

Opcion para servidores con `rclone`:

```powershell
rclone config
[Environment]::SetEnvironmentVariable("FICOTOX_ONEDRIVE_REMOTE", "onedrive:FICOTOX", "User")
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

- SQLite local desde `backend/.env` o `backend/instance/ficotox.sqlite3`.
- MySQL/MariaDB si `DATABASE_URL` empieza con `mysql` y `mysqldump` esta instalado.

Codigo:

- Incluye `backend`, `frontend`, documentacion y scripts.
- Excluye `.git`, entornos virtuales, caches, `.env`, bases locales y la carpeta `backups`.
