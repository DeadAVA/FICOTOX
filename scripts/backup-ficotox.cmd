@echo off
setlocal

py -3 "%~dp0backup_ficotox.py" %*
if %ERRORLEVEL% EQU 0 exit /b 0

python "%~dp0backup_ficotox.py" %*
exit /b %ERRORLEVEL%
