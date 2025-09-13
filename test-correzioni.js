// Test delle correzioni implementate
const path = require('path');
const fs = require('fs').promises;

async function testCorrezioni() {
    console.log('=== TEST CORREZIONI IMPLEMENTATE ===\n');

    // Test 1: Calcoli dimensionali corretti
    const width = 1920; // Video HD standard
    const minDistanceFromBorder = 15;
    const effectiveWidth = width - (minDistanceFromBorder * 2);
    const fontSize = Math.max(32, Math.min(56, width / 18));
    const avgCharWidth = fontSize * 0.65;
    const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);

    console.log('📐 CALCOLI DIMENSIONALI:');
    console.log(`   Video width: ${width}px`);
    console.log(`   Min distance from border: ${minDistanceFromBorder}px`);
    console.log(`   Effective width: ${effectiveWidth}px (era 410px prima)`);
    console.log(`   Font size: ${fontSize}px`);
    console.log(`   Max chars per line: ${maxCharsPerLine} (era 11 prima)`);

    // Test 2: Verifica font
    console.log('\n🎨 VERIFICA FONT:');
    const testFont = 'impact.ttf';
    const fontPath = path.join(__dirname, 'font', testFont);

    try {
        await fs.access(fontPath, fs.constants.F_OK);
        console.log(`   ✅ Font ${testFont} trovato: ${fontPath}`);
    } catch (error) {
        console.log(`   ❌ Font ${testFont} NON trovato: ${fontPath}`);
    }

    // Test 3: Formule posizionamento
    console.log('\n📍 POSIZIONAMENTO:');
    const xPosFormula = `max(${minDistanceFromBorder},min(${width - minDistanceFromBorder},(w-text_w)/2))`;
    console.log(`   Formula X position: ${xPosFormula}`);
    console.log(`   Garantisce: min ${minDistanceFromBorder}px da sinistra, max ${width - minDistanceFromBorder}px da destra`);

    // Test 4: Esempi pratici
    console.log('\n🧪 ESEMPI PRATICI:');
    const testTexts = [
        'Testo breve',
        'Testo medio che può essere centrato',
        'Testo molto molto lungo che potrebbe uscire dai bordi se non controllato correttamente'
    ];

    testTexts.forEach((text, i) => {
        const estimatedWidth = text.length * avgCharWidth;
        const fitsInBounds = estimatedWidth <= effectiveWidth;
        console.log(`   Test ${i + 1}: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
        console.log(`     Larghezza stimata: ${Math.round(estimatedWidth)}px`);
        console.log(`     Entra nei limiti: ${fitsInBounds ? '✅' : '❌'}`);
    });

    console.log('\n=== TEST COMPLETATO ===');
}

testCorrezioni().catch(console.error);