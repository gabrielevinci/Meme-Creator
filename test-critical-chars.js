// Test immediato dei caratteri problematici dell'errore
const VideoProcessor = require('./video-processor');

function testCriticalChars() {
    console.log('🔥 TEST CARATTERI CRITICI DALL\'ERRORE');
    console.log('=====================================');

    const vp = new VideoProcessor();

    // I caratteri ESATTI dell'errore utente
    const criticalTexts = [
        "PREZZO COS├î BASSO ├ê", // Contiene ENTRAMBI i caratteri problematici!
        "L'UNICA VIA PER OTTENERE"
    ];

    criticalTexts.forEach((text, i) => {
        console.log(`\n🧪 Test ${i + 1}:`);
        console.log(`📝 Input:  "${text}"`);

        try {
            const result = vp.escapeTextForFFmpeg(text);
            console.log(`✅ Output: "${result}"`);

            // Verifica se i caratteri problematici sono stati rimossi
            if (result.includes('├î') || result.includes('├ê')) {
                console.log(`❌ ERRORE: Caratteri problematici ancora presenti!`);
            } else {
                console.log(`✅ SUCCESS: Caratteri problematici rimossi`);
            }
        } catch (error) {
            console.log(`❌ ERRORE nell'escape: ${error.message}`);
        }
    });
}

testCriticalChars();