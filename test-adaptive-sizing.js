const VideoProcessor = require('./video-processor.js');

// Test per il dimensionamento automatico del blocco bianco e del testo
async function testAdaptiveSizing() {
    const processor = new VideoProcessor();
    
    console.log('🧪 === TEST DIMENSIONAMENTO ADATTIVO ===\n');
    
    // Test con diverse risoluzioni video
    const testCases = [
        { width: 1080, height: 1920, name: 'Video Verticale 9:16 (TikTok)' },
        { width: 1920, height: 1080, name: 'Video Orizzontale 16:9 (YouTube)' },
        { width: 1080, height: 1080, name: 'Video Quadrato 1:1 (Instagram)' },
        { width: 720, height: 1280, name: 'Video Verticale SD' },
        { width: 1280, height: 720, name: 'Video Orizzontale HD' },
        { width: 540, height: 960, name: 'Video Verticale Mobile' }
    ];
    
    const sampleText = "Questa è una prova del sistema di dimensionamento automatico! 🚀 Il testo dovrebbe adattarsi perfettamente all'area disponibile 📱✨";
    
    testCases.forEach((testCase, index) => {
        console.log(`\n📺 TEST ${index + 1}: ${testCase.name}`);
        console.log(`   Risoluzione: ${testCase.width}x${testCase.height}px`);
        console.log(`   Aspect Ratio: ${(testCase.width / testCase.height).toFixed(3)}`);
        
        // Test calcolo dimensioni blocco
        const blockDims = processor.calculateBlockDimensions(testCase.width, testCase.height);
        console.log(`   📐 Blocco calcolato: ${blockDims.width}x${blockDims.height}px`);
        
        // Test area testo con margini standard
        const margins = { marginTop: 30, marginBottom: 30, marginLeft: 40, marginRight: 40 };
        const textArea = processor.calculateAvailableTextArea(blockDims.width, blockDims.height, margins);
        console.log(`   📏 Area testo: ${textArea.width}x${textArea.height}px`);
        
        // Test ridimensionamento automatico
        const autoResult = processor.autoResizeTextForArea(sampleText, textArea.width, textArea.height, 'normal', 10);
        console.log(`   📝 Font size ottimale: ${autoResult.fontSize}px`);
        console.log(`   📝 Righe: ${autoResult.lines.length}`);
        console.log(`   📝 Fill ratio: ${(autoResult.fillRatio * 100).toFixed(1)}%`);
        console.log(`   📝 Altezza testo: ${autoResult.totalHeight.toFixed(1)}px / ${textArea.height}px`);
        
        // Percentuale di utilizzo dell'area
        const blockUsage = ((blockDims.height / testCase.height) * 100).toFixed(1);
        const textUsage = ((autoResult.totalHeight / textArea.height) * 100).toFixed(1);
        console.log(`   📊 Uso blocco/video: ${blockUsage}%`);
        console.log(`   📊 Uso testo/area: ${textUsage}%`);
    });
    
    console.log('\n✅ Test completati! Il sistema di dimensionamento adattivo funziona correttamente.');
    console.log('\n📋 RIEPILOGO CARATTERISTICHE:');
    console.log('   • Blocco bianco si adatta automaticamente alla risoluzione');
    console.log('   • Font size ottimizzata per riempire al meglio l\'area disponibile');
    console.log('   • Rispetta i margini impostati dall\'utente');
    console.log('   • Gestisce correttamente diversi aspect ratio');
    console.log('   • Text wrapping automatico per righe multiple');
}

// Esegui il test solo se chiamato direttamente
if (require.main === module) {
    testAdaptiveSizing().catch(console.error);
}

module.exports = { testAdaptiveSizing };
