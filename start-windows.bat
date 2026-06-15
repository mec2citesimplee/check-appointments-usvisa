@echo off
chcp 65001 >nul
echo ==========================================
echo          DÉMARRAGE DU VISA BOT            
echo ==========================================
echo.

cd /d "%~dp0"

:: Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur cet ordinateur.
    echo Veuillez telecharger et installer Node.js depuis https://nodejs.org/
    pause
    exit /b
)

:: Installer les dépendances la première fois
IF NOT EXIST node_modules (
    echo [INSTALLATION] Premiere utilisation detectee. Installation des fichiers requis...
    call npm install
)

echo [LANCEMENT] Demarrage du bot...
node bot.js

pause
