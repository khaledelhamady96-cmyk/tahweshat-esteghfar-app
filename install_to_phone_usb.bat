@echo off
title Install Tahweshat Esteghfar via USB
cd /d "%~dp0"

echo ======================================================
echo    Installing Tahweshat Esteghfar APK via USB
echo ======================================================
echo.
set "ADB_PATH=C:\Users\MSI\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if not exist "%ADB_PATH%" (
    echo [ERROR] adb.exe not found. Please install the APK directly by copying tahweshat-esteghfar.apk to your phone.
    pause
    exit /b
)

echo Checking connected devices...
"%ADB_PATH%" devices
echo.
echo Installing APK to your connected Android phone...
"%ADB_PATH%" install -r "%~dp0tahweshat-esteghfar.apk"

echo.
pause
