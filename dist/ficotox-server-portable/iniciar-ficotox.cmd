@echo off
setlocal
cd /d "%~dp0"
netsh advfirewall firewall add rule name="FICOTOX 5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
start "" "%~dp0ficotox-server.exe"
echo FICOTOX iniciado. Si este equipo tiene IP 192.168.x.x, abre http://192.168.x.x:5000 en otra PC.
pause
