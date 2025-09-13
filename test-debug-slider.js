/**
 * Test debug completo per gli slider dei margini
 */

console.log('🔍 === TEST DEBUG SLIDER MARGINI ===\n');

// Leggi le impostazioni attuali salvate
const fs = require('fs');
const path = require('path');

try {
    const settingsPath = './settings.json';
    if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        console.log('📄 Impostazioni correnti in settings.json:');
        console.log(JSON.stringify(settings, null, 2));
        console.log('');

        // Verifica che i margini siano presenti
        const requiredMargins = ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'];
        const missingMargins = requiredMargins.filter(margin => !(margin in settings));

        if (missingMargins.length > 0) {
            console.log(`❌ PROBLEMA: Margini mancanti in settings.json: ${missingMargins.join(', ')}`);
        } else {
            console.log('✅ Tutti i margini sono presenti nelle impostazioni');
        }
        console.log('');

        // Simula il processing con questi settings
        console.log('🎬 Simulazione processing video con i margini attuali...\n');

        // Test per video 720x1280 (9:16)
        const videoWidth = 720;
        const videoHeight = 1280;

        // Calcola dimensioni blocco (come in calculateBlockDimensions)
        const aspectRatio = videoWidth / videoHeight;
        let blockHeight = 450; // Per video verticali
        const blockWidth = videoWidth;

        console.log(`📺 Video: ${videoWidth}x${videoHeight} (AR: ${aspectRatio.toFixed(3)})`);
        console.log(`📐 Blocco bianco: ${blockWidth}x${blockHeight}px`);

        // Applica i margini dalle impostazioni con logica corretta
        const marginTop = (settings.marginTop !== undefined) ? settings.marginTop : 30;
        const marginBottom = (settings.marginBottom !== undefined) ? settings.marginBottom : 30;
        const marginLeft = (settings.marginLeft !== undefined) ? settings.marginLeft : 40;
        const marginRight = (settings.marginRight !== undefined) ? settings.marginRight : 40;

        console.log(`📏 Margini applicati: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);

        // Calcola area disponibile
        const availableWidth = blockWidth - marginLeft - marginRight;
        const availableHeight = blockHeight - marginTop - marginBottom;
        const safeWidth = Math.max(availableWidth, 100);
        const safeHeight = Math.max(availableHeight, 50);

        console.log(`✨ Area testo risultante: ${safeWidth}x${safeHeight}px`);

        // Calcola la percentuale di utilizzo
        const blockArea = blockWidth * blockHeight;
        const textArea = safeWidth * safeHeight;
        const utilizationPercent = (textArea / blockArea) * 100;

        console.log(`📊 Utilizzo area blocco: ${utilizationPercent.toFixed(1)}%`);

        // Verifica che l'area sia ragionevole
        if (safeWidth < 200 || safeHeight < 100) {
            console.log('⚠️  ATTENZIONE: Area testo molto piccola - margini troppo grandi?');
        } else if (utilizationPercent > 90) {
            console.log('⚠️  ATTENZIONE: Area testo quasi completa - margini troppo piccoli?');
        } else {
            console.log('✅ Area testo ottimale per il posizionamento');
        }

    } else {
        console.log('❌ File settings.json non trovato');
    }

} catch (error) {
    console.error('❌ Errore leggendo settings.json:', error.message);
}

console.log('\n🔧 === DIAGNOSI POSSIBILI PROBLEMI ===\n');

console.log('1. 📱 CONTROLLO INTERFACCIA:');
console.log('   - Gli slider si muovono visivamente?');
console.log('   - I valori numerici a fianco si aggiornano?');
console.log('   - Il salvataggio automatico funziona?');

console.log('\n2. 💾 CONTROLLO SALVATAGGIO:');
console.log('   - settings.json viene aggiornato quando muovi gli slider?');
console.log('   - I valori vengono caricati al riavvio dell\'app?');

console.log('\n3. 🎬 CONTROLLO PROCESSING:');
console.log('   - I margini dalle impostazioni vengono passati al video processor?');
console.log('   - L\'area del testo si adatta quando cambi i margini?');
console.log('   - Hai provato con valori estremi (0 e 100) per vedere la differenza?');

console.log('\n4. 🐛 POSSIBILI CAUSE:');
console.log('   - Gli event listener degli slider non sono collegati');
console.log('   - La funzione saveSettings() non viene chiamata');
console.log('   - Il video processor non legge i margini dalla config');
console.log('   - Cache del browser che mantiene valori vecchi');

console.log('\n💡 SUGGERIMENTI DEBUGGING:');
console.log('   - Apri la console del browser (F12) e muovi gli slider');
console.log('   - Controlla se vedi messaggi di salvataggio');
console.log('   - Prova a impostare margini 0,0,0,0 e poi 50,50,50,50');
console.log('   - Verifica che settings.json cambi dopo aver mosso gli slider');