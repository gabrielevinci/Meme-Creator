@echo off
title Content Creator - 0 Chiacchiere
echo ======================================
echo   Content Creator - 0 Chiacchiere
echo   Avvio Applicazione
echo ======================================
echo.

echo Verifica dipendenze...
if not exist node_modules (
    echo Installazione dipendenze necessarie...
    call npm install
)

echo.
echo 🚀 Avvio Content Creator...
echo.
echo Modalità disponibili:
echo   - Sviluppo: npm start (con DevTools)
echo   - Produzione: npm run electron
echo.

call npm start
