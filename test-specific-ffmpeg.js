// Test per il problema specifico FFmpeg
const VideoProcessor = require('./video-processor');

async function testSpecificFFmpegIssue() {
    console.log('🧪 TEST PROBLEMA SPECIFICO FFMPEG');
    console.log('==================================');

    const vp = new VideoProcessor();

    // Test del testo esatto che causa problemi
    const problematicTexts = [
        "l'unica opzione di viaggio",
        "che ti offre due anni di",
        "spotify premium a 35EUR ├¿", // QUESTO È IL PROBLEMA
        "questa strada panoramica"
    ];

    console.log('📝 Testando i testi problematici:');

    problematicTexts.forEach((text, i) => {
        console.log(`\n🔍 Test ${i + 1}: "${text}"`);
        const cleaned = vp.escapeTextForFFmpeg(text);
        console.log(`✅ Pulito: "${cleaned}"`);

        // Controlla se contiene ancora caratteri UTF-8 problematici
        const problematicChars = ['├', '╣', '¿', 'Ô', 'é', '¼'];
        let hasProblems = false;

        problematicChars.forEach(char => {
            if (cleaned.includes(char)) {
                console.log(`❌ ATTENZIONE: Carattere "${char}" ancora presente!`);
                hasProblems = true;
            }
        });

        if (!hasProblems) {
            console.log(`✅ Testo pulito da caratteri problematici`);
        }
    });

    // Test del filtro completo come apparirebbe in FFmpeg
    console.log('\n🔧 Simulazione filtro FFmpeg completo:');
    const cleanedTexts = problematicTexts.map(text => vp.escapeTextForFFmpeg(text));

    console.log('Filtro simulato:');
    cleanedTexts.forEach((text, i) => {
        const y = 1540 + (i * 95); // Simula il posizionamento Y
        console.log(`drawtext=text="${text}":fontcolor=black:fontsize=79:x=40+((1000-text_w)/2):y=${y}`);
    });
}

testSpecificFFmpegIssue().catch(console.error);