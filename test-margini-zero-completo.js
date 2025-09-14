/**
 * Test completo per verificare il comportamento con margini a 0 e confronto
 */

const VideoProcessor = require('./video-processor.js');

console.log('🧪 === TEST COMPLETO MARGINI A 0 ===\n');

const processor = new VideoProcessor();

// Test con diversi scenari
const testCases = [{
        name: "Margini tutti a 0 - Blocco standard",
        blockWidth: 720,
        blockHeight: 300,
        margins: { marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 }
    },
    {
        name: "Margini tutti a 0 - Blocco piccolo",
        blockWidth: 200,
        blockHeight: 100,
        margins: { marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 }
    },
    {
        name: "Margini normali - Blocco standard",
        blockWidth: 720,
        blockHeight: 300,
        margins: { marginTop: 30, marginBottom: 30, marginLeft: 40, marginRight: 40 }
    },
    {
        name: "Margini normali - Blocco piccolo",
        blockWidth: 200,
        blockHeight: 100,
        margins: { marginTop: 30, marginBottom: 30, marginLeft: 40, marginRight: 40 }
    }
];

testCases.forEach((testCase, index) => {
    console.log(`📋 TEST ${index + 1}: ${testCase.name}`);
    console.log(`   📐 Blocco: ${testCase.blockWidth}x${testCase.blockHeight}px`);
    console.log(`   📏 Margini: T${testCase.margins.marginTop} B${testCase.margins.marginBottom} L${testCase.margins.marginLeft} R${testCase.margins.marginRight}`);

    const textArea = processor.calculateAvailableTextArea(
        testCase.blockWidth,
        testCase.blockHeight,
        testCase.margins
    );

    const expectedWidth = testCase.blockWidth - testCase.margins.marginLeft - testCase.margins.marginRight;
    const expectedHeight = testCase.blockHeight - testCase.margins.marginTop - testCase.margins.marginBottom;

    const allMarginsZero = Object.values(testCase.margins).every(margin => margin === 0);

    console.log(`   🎯 Area testo: ${textArea.width}x${textArea.height}px`);
    console.log(`   📊 Utilizzo: ${(textArea.width/testCase.blockWidth*100).toFixed(1)}% x ${(textArea.height/testCase.blockHeight*100).toFixed(1)}%`);

    if (allMarginsZero) {
        if (textArea.width === testCase.blockWidth && textArea.height === testCase.blockHeight) {
            console.log(`   ✅ CORRETTO: Margini a 0 = area completa del blocco`);
        } else {
            console.log(`   ❌ ERRORE: Margini a 0 ma area limitata`);
        }
    } else {
        if (textArea.width >= 100 && textArea.height >= 50) {
            console.log(`   ✅ CORRETTO: Limiti di sicurezza applicati correttamente`);
        } else {
            console.log(`   ❌ ERRORE: Limiti di sicurezza non applicati`);
        }
    }

    console.log('');
});

console.log(`💡 COMPORTAMENTO ATTESO:`);
console.log(`   ✓ Margini a 0: Testo può utilizzare tutto il blocco`);
console.log(`   ✓ Margini normali: Limiti di sicurezza applicati (min 100x50px)`);
console.log(`   ✓ Il testo centrato può toccare i bordi se abbastanza lungo`);

console.log(`\n🎨 FORMULA CENTRATURA CON MARGINI A 0:`);
console.log(`   x = 0+((720-text_w)/2) = centratura nell'intero blocco`);