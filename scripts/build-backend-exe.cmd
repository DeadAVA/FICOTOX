@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fI"
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "DIST_DIR=%PROJECT_ROOT%\dist"
set "PORTABLE_DIR=%DIST_DIR%\ficotox-server-portable"
set "EXE_NAME=ficotox-server"

if exist "%PROJECT_ROOT%\.venv\Scripts\python.exe" (
  set "PYTHON_EXE=%PROJECT_ROOT%\.venv\Scripts\python.exe"
) else if exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
  set "PYTHON_EXE=%BACKEND_DIR%\.venv\Scripts\python.exe"
) else (
  echo No se encontro un Python virtual en:
  echo   - %PROJECT_ROOT%\.venv\Scripts\python.exe
  echo   - %BACKEND_DIR%\.venv\Scripts\python.exe
  echo Crea un entorno virtual e instala dependencias primero.
  exit /b 1
)

echo Usando Python: "%PYTHON_EXE%"

echo [1/4] Instalando dependencias para build...
"%PYTHON_EXE%" -m pip install -r "%BACKEND_DIR%\requirements.txt" pyinstaller
if errorlevel 1 exit /b 1

echo [2/4] Limpiando builds anteriores...
if exist "%PROJECT_ROOT%\build" rmdir /s /q "%PROJECT_ROOT%\build"
if exist "%PORTABLE_DIR%" rmdir /s /q "%PORTABLE_DIR%"
if exist "%DIST_DIR%\%EXE_NAME%.exe" del /q "%DIST_DIR%\%EXE_NAME%.exe"
if exist "%PROJECT_ROOT%\%EXE_NAME%.spec" del /q "%PROJECT_ROOT%\%EXE_NAME%.spec"

echo [3/4] Generando ejecutable...
pushd "%BACKEND_DIR%"
"%PYTHON_EXE%" -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --name "%EXE_NAME%" ^
  --onefile ^
  --paths "%BACKEND_DIR%" ^
  --distpath "%DIST_DIR%" ^
  --workpath "%PROJECT_ROOT%\build" ^
  --specpath "%PROJECT_ROOT%" ^
  --add-data "%PROJECT_ROOT%\frontend;frontend" ^
  "%BACKEND_DIR%\server_launcher_flask.py"
set "BUILD_EXIT=%ERRORLEVEL%"
popd
if not "%BUILD_EXIT%"=="0" exit /b %BUILD_EXIT%
if errorlevel 1 exit /b 1

echo [4/4] Copiando .env de ejemplo junto al ejecutable...
mkdir "%PORTABLE_DIR%" >nul 2>&1
copy /y "%DIST_DIR%\%EXE_NAME%.exe" "%PORTABLE_DIR%\%EXE_NAME%.exe" >nul

if exist "%BACKEND_DIR%\.env" (
  copy /y "%BACKEND_DIR%\.env" "%PORTABLE_DIR%\.env" >nul
) else (
  > "%PORTABLE_DIR%\.env" echo FLASK_HOST=0.0.0.0
  >>"%PORTABLE_DIR%\.env" echo FLASK_PORT=5000
  >>"%PORTABLE_DIR%\.env" echo FLASK_DEBUG=true
  >>"%PORTABLE_DIR%\.env" echo FLASK_OPEN_BROWSER=true
  >>"%PORTABLE_DIR%\.env" echo CORS_ORIGINS=*
  >>"%PORTABLE_DIR%\.env" echo SECRET_KEY=change-me
  >>"%PORTABLE_DIR%\.env" echo JWT_SECRET=change-me-too
)

> "%PORTABLE_DIR%\iniciar-ficotox.cmd" echo @echo off
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo setlocal
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo cd /d "%%~dp0"
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo netsh advfirewall firewall add rule name="FICOTOX 5000" dir=in action=allow protocol=TCP localport=5000 ^>nul 2^>^&1
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo start "" "%%~dp0%EXE_NAME%.exe"
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo echo FICOTOX iniciado. Si este equipo tiene IP 192.168.x.x, abre http://192.168.x.x:5000 en otra PC.
>>"%PORTABLE_DIR%\iniciar-ficotox.cmd" echo pause

echo.
echo Build completo.
echo Carpeta portable: "%PORTABLE_DIR%"
echo Ejecutable: "%PORTABLE_DIR%\%EXE_NAME%.exe"
echo Inicio rapido: "%PORTABLE_DIR%\iniciar-ficotox.cmd"
echo Para usar en otra PC, copia toda la carpeta portable y ejecuta iniciar-ficotox.cmd.

endlocal
exit /b 0
