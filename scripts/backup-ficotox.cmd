@echo off
setlocal

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 "%~dp0backup_ficotox.py" %*
  goto :done
)

python "%~dp0backup_ficotox.py" %*

:done
set "RESULT=%ERRORLEVEL%"
endlocal & exit /b %RESULT%
