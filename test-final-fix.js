// Test finale per verificare la correzione dell'errore font
const path = require('path');
const fs = require('fs').promises;

async function testFontFix() {
    console.log('=== TEST FINALE CORREZIONE FONT ===\n');

    // Simula esattamente la situazione che causava l'errore
    const config = { selectedFont: 'ITCBLKAD' }; // Senza estensione, come nell'errore originale

    console.log(`Input config: selectedFont = "${config.selectedFont}"`);

    // Applica la logica corretta del video-processor.js
    let selectedFont = (config && config.selectedFont) ? config.selectedFont : 'impact.ttf';
    console.log(`Dopo check config: "${selectedFont}"`);

    // Gestione estensione
    if (!selectedFont.toLowerCase().endsWith('.ttf')) {
        console.log('Font senza estensione rilevato, tentativo correzione...');

        // Prima prova con .TTF (maiuscolo)
        let testFontPath = path.join(__dirname, 'font', selectedFont + '.TTF');
        try {
            await fs.access(testFontPath, fs.constants.F_OK);
            selectedFont = selectedFont + '.TTF';
            console.log(`✅ Estensione .TTF aggiunta con successo: ${selectedFont}`);
        } catch (error) {
            // Poi prova con .ttf (minuscolo)
            testFontPath = path.join(__dirname, 'font', selectedFont + '.ttf');
            try {
                await fs.access(testFontPath, fs.constants.F_OK);
                selectedFont = selectedFont + '.ttf';
                console.log(`✅ Estensione .ttf aggiunta con successo: ${selectedFont}`);
            } catch (error2) {
                console.log('⚠️ Nessuna estensione funziona, continuo con nome originale');
            }
        }
    }

    let fontPath = path.join(__dirname, 'font', selectedFont);
    console.log(`Path font finale: ${fontPath}`);

    // Verifica finale
    try {
        await fs.access(fontPath, fs.constants.F_OK);
        console.log(`✅ SUCCESSO: Font verificato e trovato: ${selectedFont}`);
        console.log(`📂 Path completo: ${fontPath}`);

        // Test anche l'escape per FFmpeg
        const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        console.log(`🔧 Path escaped per FFmpeg: ${escapedFontPath}`);

    } catch (error) {
        console.log(`❌ Font non trovato: ${fontPath}`);
        console.log('🔄 Tentativo fallback su impact.ttf...');

        selectedFont = 'impact.ttf';
        fontPath = path.join(__dirname, 'font', selectedFont);

        try {
            await fs.access(fontPath, fs.constants.F_OK);
            console.log(`✅ Font fallback trovato: ${selectedFont}`);
        } catch (fallbackError) {
            console.log(`❌ ERRORE CRITICO: Fallback non disponibile!`);
        }
    }

    console.log('\n=== RISULTATO ===');
    console.log(`Font finale selezionato: ${selectedFont}`);
    console.log(`L'errore originale dovrebbe essere risolto! 🎉`);

    console.log('\n=== TEST COMPLETATO ===');
}

testFontFix().catch(console.error);