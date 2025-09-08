@echo off
title Content Creator - Sistema di Test
echo ======================================
echo   Content Creator - 0 Chiacchiere
echo   Sistema di Test Automatico
echo ======================================
echo.

echo [TEST 1/6] Verifica struttura cartelle...
if not exist INPUT echo ❌ Cartella INPUT mancante && goto :error
if not exist OUTPUT echo ❌ Cartella OUTPUT mancante && goto :error
if not exist font echo ❌ Cartella font mancante && goto :error
if not exist prompt echo ❌ Cartella prompt mancante && goto :error
echo ✅ Struttura cartelle OK

echo.
echo [TEST 2/6] Verifica file core...
if not exist main.js echo ❌ main.js mancante && goto :error
if not exist index.html echo ❌ index.html mancante && goto :error
if not exist api-manager.js echo ❌ api-manager.js mancante && goto :error
if not exist video-processor.js echo ❌ video-processor.js mancante && goto :error
if not exist ai-processor.js echo ❌ ai-processor.js mancante && goto :error
if not exist package.json echo ❌ package.json mancante && goto :error
echo ✅ File core OK

echo.
echo [TEST 3/6] Verifica configurazioni...
if not exist api.json echo ❌ api.json mancante && goto :error
if not exist prompt\single_frame.txt echo ❌ Template single_frame.txt mancante && goto :error
if not exist prompt\collage.txt echo ❌ Template collage.txt mancante && goto :error
echo ✅ Configurazioni OK

echo.
echo [TEST 4/6] Verifica dipendenze Node.js...
if not exist node_modules (
    echo ⚠️ Dipendenze mancanti, installazione in corso...
    call npm install
    if errorlevel 1 echo ❌ Errore installazione dipendenze && goto :error
)
echo ✅ Dipendenze OK

echo.
echo [TEST 5/6] Test sintassi JavaScript...
call node -c main.js
if errorlevel 1 echo ❌ Errore sintassi main.js && goto :error
call node -c api-manager.js  
if errorlevel 1 echo ❌ Errore sintassi api-manager.js && goto :error
call node -c video-processor.js
if errorlevel 1 echo ❌ Errore sintassi video-processor.js && goto :error
call node -c ai-processor.js
if errorlevel 1 echo ❌ Errore sintassi ai-processor.js && goto :error
echo ✅ Sintassi JavaScript OK

echo.
echo [TEST 6/6] Test caricamento moduli...
echo const ApiManager = require('./api-manager'); console.log('ApiManager OK'); > test-temp.js
echo const VideoProcessor = require('./video-processor'); console.log('VideoProcessor OK'); >> test-temp.js  
echo const AiProcessor = require('./ai-processor'); console.log('AiProcessor OK'); >> test-temp.js
call node test-temp.js
if errorlevel 1 echo ❌ Errore caricamento moduli && goto :error
del test-temp.js
echo ✅ Caricamento moduli OK

echo.
echo ============================================
echo   🎉 TUTTI I TEST SUPERATI CON SUCCESSO!
echo ============================================
echo.
echo L'applicazione è pronta per l'uso:
echo   • npm start      (modalità sviluppo)
echo   • npm run electron (modalità produzione)
echo   • start.bat      (avvio rapido)
echo   • build.bat      (crea distributivo)
echo.
goto :end

:error
echo.
echo ============================================
echo   ❌ TEST FALLITO - CONTROLLARE GLI ERRORI
echo ============================================
echo.
echo Verifica i messaggi di errore sopra e:
echo   1. Controlla che tutti i file siano presenti
echo   2. Esegui 'npm install' se necessario
echo   3. Verifica la sintassi dei file modificati
echo.

:end
echo Premi un tasto per chiudere...
pause >nul
