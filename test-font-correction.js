// Test della correzione per ITCBLKAD
const path = require('path');
const fs = require('fs').promises;

async function testFontCorrection() {
    console.log('=== TEST CORREZIONE FONT ===\n');

    // Test con vari scenari
    const testCases = [
        { selectedFont: 'ITCBLKAD' }, // Senza estensione
        { selectedFont: 'impact.ttf' }, // Con estensione minuscola
        { selectedFont: 'BOD_CB.TTF' }, // Con estensione maiuscola
        { selectedFont: 'NonExistent' } // Font inesistente
    ];

    for (const config of testCases) {
        console.log(`\n🧪 Test: "${config.selectedFont}"`);

        let selectedFont = config.selectedFont;

        // Logica di correzione estensione (corretta)
        if (!selectedFont.toLowerCase().endsWith('.ttf')) {
            // Prima prova con .TTF (maiuscolo) - più comune per i font
            let testFontPath = path.join(__dirname, 'font', selectedFont + '.TTF');
            try {
                await fs.access(testFontPath, fs.constants.F_OK);
                selectedFont = selectedFont + '.TTF';
                console.log(`   ✅ Estensione .TTF aggiunta: ${selectedFont}`);
            } catch (error) {
                // Poi prova con .ttf (minuscolo)
                testFontPath = path.join(__dirname, 'font', selectedFont + '.ttf');
                try {
                    await fs.access(testFontPath, fs.constants.F_OK);
                    selectedFont = selectedFont + '.ttf';
                    console.log(`   ✅ Estensione .ttf aggiunta: ${selectedFont}`);
                } catch (error2) {
                    console.log(`   ⚠️ Nessuna estensione funziona, mantengo: ${selectedFont}`);
                }
            }
        }

        // Test accesso finale
        const fontPath = path.join(__dirname, 'font', selectedFont);
        try {
            await fs.access(fontPath, fs.constants.F_OK);
            console.log(`   ✅ Font finale trovato: ${selectedFont}`);
        } catch (error) {
            console.log(`   ❌ Font finale non trovato, serve fallback`);
        }
    }

    console.log('\n=== TEST COMPLETATO ===');
}

testFontCorrection().catch(console.error);