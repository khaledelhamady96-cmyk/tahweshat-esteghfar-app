@echo off
title Push Tahweshat Esteghfar to GitHub
cd /d "%~dp0"

echo ======================================================
echo    Pushing Tahweshat Esteghfar to GitHub
echo ======================================================
echo.

git branch -M main
git remote set-url origin https://github.com/khaledelhamady96-cmyk/tahweshat-esteghfar-app.git 2>nul || git remote add origin https://github.com/khaledelhamady96-cmyk/tahweshat-esteghfar-app.git

echo Target Repository:
echo https://github.com/khaledelhamady96-cmyk/tahweshat-esteghfar-app.git
echo.
echo Uploading project files...
echo If GitHub opens a browser login window, click "Authorize git-ecosystem".
echo.

git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying force push to overwrite initial template files...
    git push -u origin main --force
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================
    echo  SUCCESS: All files uploaded to GitHub successfully!
    echo ======================================================
) else (
    echo ======================================================
    echo  Push was not completed.
    echo ======================================================
)

echo.
pause
