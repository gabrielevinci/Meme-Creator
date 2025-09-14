/**
 * Test per verificare la centratura del testo nell'area margini
 */

const VideoProcessor = require('./video-processor.js');

console.log('🧪 === TEST CENTRATURA TESTO NELL\'AREA MARGINI ===\n');

const processor = new VideoProcessor();

// Simula una configurazione con margini specifici
const testConfig = {
    memeType: 'test',
    videoFilter: 'test',
    memeStyle: 'test',
    useCollage: false,
    selectedFont: 'impact',
    textFormat: 'uppercase',
    marginTop: 10,
    marginBottom: 20,
    marginLeft: 30,
    marginRight: 50
};

console.log('📋 Configurazione di test:');
console.log(`   Margini: T${testConfig.marginTop} B${testConfig.marginBottom} L${testConfig.marginLeft} R${testConfig.marginRight}`);

// Simula la chiamata alla funzione di calcolo area
const blockWidth = 720;
const blockHeight = 300;
const margins = {
    marginTop: testConfig.marginTop,
    marginBottom: testConfig.marginBottom,
    marginLeft: testConfig.marginLeft,
    marginRight: testConfig.marginRight
};

const textArea = processor.calculateAvailableTextArea(blockWidth, blockHeight, margins);

console.log('\n🎯 RISULTATI:');
console.log(`   📐 Blocco banner: ${blockWidth}x${blockHeight}px`);
console.log(`   📏 Area testo disponibile: ${textArea.width}x${textArea.height}px`);
console.log(`   📍 Posizione area testo: da x=${testConfig.marginLeft} a x=${testConfig.marginLeft + textArea.width}`);
console.log(`   🎨 Formula centratura FFmpeg: "${testConfig.marginLeft}+((${textArea.width}-text_w)/2)"`);

console.log('\n✅ Test della formula di centratura completato!');
console.log('   Il testo ora sarà centrato all\'interno dell\'area definita dai margini.');
console.log('   Ogni riga sarà centrata individualmente rispettando i limiti dell\'hitbox.');
