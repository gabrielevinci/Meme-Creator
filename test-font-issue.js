// Test per verificare il problema con ITCBLKAD
const path = require('path');
const fs = require('fs').promises;

async function testFontIssue() {
    console.log('=== TEST PROBLEMA FONT ITCBLKAD ===\n');

    // Simula il font che viene passato dalla configurazione
    const config = { selectedFont: 'ITCBLKAD' }; // Nota: senza estensione!

    let selectedFont = (config && config.selectedFont) ? config.selectedFont : 'impact.ttf';
    console.log(`Font dal config: "${selectedFont}"`);

    // Problema: se il font non ha estensione, il path sarà sbagliato
    let fontPath = path.join(__dirname, 'font', selectedFont);
    console.log(`Path costruito: "${fontPath}"`);

    // Test di accesso
    try {
        await fs.access(fontPath, fs.constants.F_OK);
        console.log(`✅ Font trovato: ${selectedFont}`);
    } catch (error) {
        console.log(`❌ Font non trovato: ${fontPath}`);

        // Prova ad aggiungere l'estensione se manca
        if (!selectedFont.toLowerCase().endsWith('.ttf')) {
            selectedFont = selectedFont + '.TTF';
            fontPath = path.join(__dirname, 'font', selectedFont);
            console.log(`🔄 Tentativo con estensione: ${fontPath}`);

            try {
                await fs.access(fontPath, fs.constants.F_OK);
                console.log(`✅ Font trovato con estensione: ${selectedFont}`);
            } catch (error2) {
                console.log(`❌ Ancora non trovato: ${fontPath}`);
            }
        }
    }

    // Testa anche il fallback
    const fallbackFont = 'impact.ttf';
    const fallbackPath = path.join(__dirname, 'font', fallbackFont);
    try {
        await fs.access(fallbackPath, fs.constants.F_OK);
        console.log(`✅ Fallback disponibile: ${fallbackFont}`);
    } catch (error) {
        console.log(`❌ Fallback non trovato: ${fallbackPath}`);
    }

    console.log('\n=== TEST COMPLETATO ===');
}

testFontIssue().catch(console.error);