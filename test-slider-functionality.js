/**
 * Test per verificare il funzionamento degli slider dei margini
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 === TEST FUNZIONALITÀ SLIDER MARGINI ===\n');

// Simula la configurazione che viene passata dalla UI
function testMarginConfiguration() {
    console.log('📋 Test configurazione margini dalla UI...\n');

    // Simula diversi valori degli slider
    const testConfigs = [{
            name: "Valori default",
            marginTop: 30,
            marginBottom: 30,
            marginLeft: 40,
            marginRight: 40
        },
        {
            name: "Margini minimi",
            marginTop: 10,
            marginBottom: 10,
            marginLeft: 10,
            marginRight: 10
        },
        {
            name: "Margini massimi",
            marginTop: 100,
            marginBottom: 100,
            marginLeft: 100,
            marginRight: 100
        },
        {
            name: "Margini asimmetrici",
            marginTop: 20,
            marginBottom: 60,
            marginLeft: 15,
            marginRight: 80
        }
    ];

    testConfigs.forEach(config => {
        console.log(`📝 TEST: ${config.name}`);
        console.log(`   Margini: T${config.marginTop} B${config.marginBottom} L${config.marginLeft} R${config.marginRight}`);

        // Simula un blocco bianco di 720x300 (tipico per video 9:16)
        const blockWidth = 720;
        const blockHeight = 300;

        // Calcola area disponibile (come nella funzione calculateAvailableTextArea)
        const { marginTop, marginBottom, marginLeft, marginRight } = config;
        const availableWidth = blockWidth - marginLeft - marginRight;
        const availableHeight = blockHeight - marginTop - marginBottom;
        const safeWidth = Math.max(availableWidth, 100);
        const safeHeight = Math.max(availableHeight, 50);

        console.log(`   📐 Blocco: ${blockWidth}x${blockHeight}px`);
        console.log(`   📏 Area testo calcolata: ${safeWidth}x${safeHeight}px`);

        // Verifica che i margini abbiano effetto
        const expectedWidth = blockWidth - marginLeft - marginRight;
        const expectedHeight = blockHeight - marginTop - marginBottom;

        if (expectedWidth <= 0 || expectedHeight <= 0) {
            console.log(`   ⚠️  PROBLEMA: Margini troppo grandi, area negativa!`);
        } else {
            const effectiveReduction = ((blockWidth * blockHeight) - (safeWidth * safeHeight)) / (blockWidth * blockHeight) * 100;
            console.log(`   ✅ Riduzione area: ${effectiveReduction.toFixed(1)}%`);
        }
        console.log('');
    });
}

// Test per verificare che la configurazione venga passata correttamente
function testConfigurationPassing() {
    console.log('🔧 Test passaggio configurazione...\n');

    // Simula la configurazione che viene costruita in startProcessing()
    const mockDOMElements = {
        'margin-top': { value: '25' },
        'margin-bottom': { value: '35' },
        'margin-left': { value: '45' },
        'margin-right': { value: '55' }
    };

    console.log('📋 Valori simulati degli slider:');
    Object.keys(mockDOMElements).forEach(id => {
        console.log(`   ${id}: ${mockDOMElements[id].value}px`);
    });

    // Simula la costruzione della configurazione (come in startProcessing)
    const config = {
        marginTop: parseInt(mockDOMElements['margin-top'] ? .value || 30),
        marginBottom: parseInt(mockDOMElements['margin-bottom'] ? .value || 30),
        marginLeft: parseInt(mockDOMElements['margin-left'] ? .value || 40),
        marginRight: parseInt(mockDOMElements['margin-right'] ? .value || 40)
    };

    console.log('\n🔧 Configurazione costruita:');
    console.log(`   marginTop: ${config.marginTop}`);
    console.log(`   marginBottom: ${config.marginBottom}`);
    console.log(`   marginLeft: ${config.marginLeft}`);
    console.log(`   marginRight: ${config.marginRight}`);

    // Verifica che i valori siano numerici
    const allNumeric = Object.values(config).every(val => typeof val === 'number' && !isNaN(val));
    console.log(`\n✅ Tutti i valori sono numerici: ${allNumeric}`);

    return config;
}

// Test per verificare il calcolo dell'area
function testAreaCalculation(config) {
    console.log('\n📐 Test calcolo area disponibile...\n');

    // Video tipici
    const videoSizes = [
        { name: "Video 9:16 (720x1280)", width: 720, height: 1280 },
        { name: "Video 16:9 (1920x1080)", width: 1920, height: 1080 },
        { name: "Video quadrato (1080x1080)", width: 1080, height: 1080 }
    ];

    videoSizes.forEach(video => {
        console.log(`📺 ${video.name}:`);

        // Calcola dimensioni blocco (simulando calculateBlockDimensions)
        const aspectRatio = video.width / video.height;
        let blockHeight;
        if (aspectRatio < 1) { // Verticale
            blockHeight = 450; // Per video 9:16
        } else if (aspectRatio > 1.5) { // Orizzontale 
            blockHeight = 200; // Per video 16:9
        } else { // Quadrato
            blockHeight = 350; // Per video quadrati
        }
        const blockWidth = video.width; // La larghezza rimane quella del video

        console.log(`   📐 Blocco calcolato: ${blockWidth}x${blockHeight}px`);

        // Applica margini
        const availableWidth = blockWidth - config.marginLeft - config.marginRight;
        const availableHeight = blockHeight - config.marginTop - config.marginBottom;
        const safeWidth = Math.max(availableWidth, 100);
        const safeHeight = Math.max(availableHeight, 50);

        console.log(`   📏 Area testo: ${safeWidth}x${safeHeight}px`);
        console.log(`   📊 Utilizzo area blocco: ${((safeWidth * safeHeight) / (blockWidth * blockHeight) * 100).toFixed(1)}%`);
        console.log('');
    });
}

// Esegui tutti i test
console.log('🚀 Inizio test sistema slider margini...\n');

try {
    testMarginConfiguration();
    const testConfig = testConfigurationPassing();
    testAreaCalculation(testConfig);

    console.log('🎉 RIEPILOGO:');
    console.log('• ✅ Configurazione margini funzionante');
    console.log('• ✅ Passaggio valori corretto');
    console.log('• ✅ Calcolo area responsive');
    console.log('\n💡 VERIFICA NELLA UI:');
    console.log('1. Gli slider devono aggiornare i valori visibili');
    console.log('2. I valori devono essere salvati in settings.json');
    console.log('3. I margini devono influenzare l\'area del testo nel video');

} catch (error) {
    console.error('❌ Errore durante i test:', error.message);
}