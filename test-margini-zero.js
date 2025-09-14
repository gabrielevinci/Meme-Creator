/**
 * Test per verificare il comportamento con margini a 0
 */

const VideoProcessor = require('./video-processor.js');

console.log('🧪 === TEST MARGINI TUTTI A 0 ===\n');

const processor = new VideoProcessor();

// Test con margini tutti a 0
const testConfig = {
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0
};

console.log('📋 Configurazione test - Margini tutti a 0:');
console.log(`   Margini: T${testConfig.marginTop} B${testConfig.marginBottom} L${testConfig.marginLeft} R${testConfig.marginRight}`);

// Simula un blocco standard 720x300
const blockWidth = 720;
const blockHeight = 300;

console.log(`\n📐 Blocco bianco: ${blockWidth}x${blockHeight}px`);

const textArea = processor.calculateAvailableTextArea(blockWidth, blockHeight, testConfig);

console.log(`\n🎯 RISULTATI ATTUALI:`);
console.log(`   📏 Area testo calcolata: ${textArea.width}x${textArea.height}px`);
console.log(`   📊 Utilizzazione blocco: ${(textArea.width/blockWidth*100).toFixed(1)}% larghezza, ${(textArea.height/blockHeight*100).toFixed(1)}% altezza`);

console.log(`\n🔍 VERIFICA REQUISITI UTENTE:`);
if (textArea.width === blockWidth && textArea.height === blockHeight) {
    console.log(`   ✅ PERFETTO: Il testo può utilizzare tutto il blocco (${blockWidth}x${blockHeight}px)`);
    console.log(`   ✅ Il testo può toccare tutti i bordi se abbastanza lungo`);
} else {
    console.log(`   ❌ PROBLEMA: Il testo non può utilizzare tutto il blocco`);
    console.log(`   ❌ Area disponibile: ${textArea.width}x${textArea.height}px invece di ${blockWidth}x${blockHeight}px`);
    console.log(`   🔧 SERVE CORREZIONE: Rimuovere le limitazioni di sicurezza quando margini = 0`);
}

console.log(`\n💡 REQUISITO UTENTE:`);
console.log(`   "Se porto tutti gli slider a 0, il testo può utilizzare l'intero blocco bianco"`);
console.log(`   "Il testo potrebbe toccare il bordo del video se abbastanza lungo"`);
