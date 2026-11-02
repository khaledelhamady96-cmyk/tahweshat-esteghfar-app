@echo off
chcp 65001 >nul
title رفع تحويشة استغفار إلى GitHub
cd /d "%~dp0"

echo ======================================================
echo    Tahweshat Esteghfar - رفع المشروع الى GitHub
echo ======================================================
echo.

git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/fawzyelrefaeygamasa-lab/tahweshat-esteghfar.git

echo [1/2] Repository set to:
echo https://github.com/fawzyelrefaeygamasa-lab/tahweshat-esteghfar.git
echo.

echo [2/2] Pushing code to GitHub...
echo (When GitHub prompts you in your browser or terminal, please sign in or paste your Personal Access Token)
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ======================================================
    echo  SUCCESS: All files uploaded to GitHub successfully!
    echo ======================================================
) else (
    echo ------------------------------------------------------
    echo  Push was not completed.
    echo  If it asked for password, use your GitHub Personal Access Token (PAT).
    echo ------------------------------------------------------
)

echo.
pause
