@echo off
title Tahweshat Esteghfar Local Server
cd /d "%~dp0"

echo ======================================================
echo    Tahweshat Esteghfar - Local Web Server
echo ======================================================
echo.
start "" http://localhost:4500
node server/index.js
pause
