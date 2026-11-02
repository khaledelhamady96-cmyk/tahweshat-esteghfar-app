@echo off
chcp 65001 >nul
title تثبيت برنامج تحويشة استغفار على هاتف الأندرويد
echo ========================================================
echo   تثبيت برنامج تحويشة استغفار على هاتف أندرويد عبر USB
echo ========================================================
echo.
echo يرجى التأكد من توصيل الموبايل بالكمبيوتر وتفعيل (تصحيح أخطاء USB / USB Debugging).
echo.
set "ADB_PATH=C:\Users\MSI\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if not exist "%ADB_PATH%" (
    echo [تنبيه] لم يتم العثور على أداة adb، يمكنك نسخ ملف tahweshat-esteghfar.apk يدوياً إلى هاتفك وتثبيته.
    pause
    exit /b
)

echo جاري فحص الأجهزة المتصلة...
"%ADB_PATH%" devices
echo.
echo جاري تثبيت التطبيق الآن...
"%ADB_PATH%" install -r "%~dp0tahweshat-esteghfar.apk"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   تم تثبيت تطبيق تحويشة استغفار على هاتفك بنجاح!
    echo ========================================================
) else (
    echo.
    echo لم يكتمل التثبيت التلقائي. يمكنك إرسال ملف tahweshat-esteghfar.apk إلى هاتفك وتثبيته مباشرة.
)

pause
