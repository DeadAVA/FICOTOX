@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fI"
set "BACKUP_CMD=%PROJECT_ROOT%\scripts\backup-ficotox.cmd"
set "DATABASE_FREQUENCY=%~1"

if "%DATABASE_FREQUENCY%"=="" set "DATABASE_FREQUENCY=15days"

if /I "%DATABASE_FREQUENCY%"=="monthly" (
  schtasks /Create /TN "FICOTOX respaldo base de datos" /TR "\"%BACKUP_CMD%\" --target database --project-root \"%PROJECT_ROOT%\"" /SC MONTHLY /D 1 /ST 02:00 /F
) else if /I "%DATABASE_FREQUENCY%"=="15days" (
  schtasks /Create /TN "FICOTOX respaldo base de datos" /TR "\"%BACKUP_CMD%\" --target database --project-root \"%PROJECT_ROOT%\"" /SC DAILY /MO 15 /ST 02:00 /F
) else (
  echo Usa "15days" o "monthly".
  exit /b 1
)

schtasks /Create /TN "FICOTOX respaldo codigo trimestral" /TR "\"%BACKUP_CMD%\" --target code --project-root \"%PROJECT_ROOT%\"" /SC MONTHLY /MO 3 /D 1 /ST 03:00 /F

echo Tareas programadas instaladas.
echo - Base de datos: %DATABASE_FREQUENCY%
echo - Codigo: cada 3 meses
