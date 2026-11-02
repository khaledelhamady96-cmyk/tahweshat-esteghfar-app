@echo off
title Push Tahweshat Esteghfar to GitHub
cd /d "%~dp0"

echo ======================================================
echo    Pushing Tahweshat Esteghfar to GitHub
echo ======================================================
echo.

git branch -M main
git remote set-url origin https://github.com/fawzyelrefaeygamasa-lab/tahweshat-esteghfar.git 2>nul || git remote add origin https://github.com/fawzyelrefaeygamasa-lab/tahweshat-esteghfar.git

echo Remote repository:
echo https://github.com/fawzyelrefaeygamasa-lab/tahweshat-esteghfar.git
echo.
echo Uploading project to GitHub...
echo If a GitHub browser window appears, click "Authorize git-ecosystem" or Sign in.
echo.

git push -u origin main

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
