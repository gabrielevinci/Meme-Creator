@echo off
echo ======================================
echo   Content Creator - 0 Chiacchiere
echo   Build Script per Windows
echo ======================================
echo.

echo [1/4] Pulizia cartelle build precedenti...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

echo [2/4] Installazione/aggiornamento dipendenze...
call npm install

echo [3/4] Creazione build di produzione...
call npm run dist

echo [4/4] Verifica risultati...
if exist dist (
    echo.
    echo ✅ Build completata con successo!
    echo.
    echo 📁 File generati in: dist/
    dir dist /b
    echo.
    echo 🚀 L'installer .exe è pronto per la distribuzione
) else (
    echo.
    echo ❌ Errore durante la build
    echo Controlla i log sopra per diagnosticare il problema
)

echo.
echo Premi un tasto per chiudere...
pause >nul
