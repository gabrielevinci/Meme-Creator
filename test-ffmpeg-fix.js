// Test per verificare le correzioni FFmpeg
const VideoProcessor = require('./video-processor');

// Test diretto del problema
async function testFFmpegFix() {
    console.log('🧪 TEST CORREZIONI FFMPEG');
    console.log('==========================');

    const videoProcessor = new VideoProcessor();

    // Test 1: Caratteri UTF-8 problematici
    console.log('\n🔍 Test 1: Caratteri UTF-8 problematici');
    const problematicText = "l'unica cosa che ronza più forte di questape è l'offerta spotify premium 2 anni a 35Ôé¼";
    console.log(`📝 Input: "${problematicText}"`);

    const escapedText = videoProcessor.escapeTextForFFmpeg(problematicText);
    console.log(`✅ Output: "${escapedText}"`);

    // Test 2: Controlla se il testo può causare errori di parsing
    console.log('\n🔍 Test 2: Verifica parsing FFmpeg');
    const filterTest = `[0:v]drawtext=text="${escapedText}":fontcolor=black:fontsize=80:x=40:y=71`;
    console.log(`🔧 Filtro generato: ${filterTest}`);

    // Controlla caratteri problematici nel filtro
    const problematicChars = ['├', '╣', '¿', 'Ô', 'é', '¼'];
    let hasProblems = false;

    problematicChars.forEach(char => {
        if (filterTest.includes(char)) {
            console.log(`❌ PROBLEMA: Carattere problematico "${char}" ancora presente nel filtro`);
            hasProblems = true;
        }
    });

    if (!hasProblems) {
        console.log(`✅ FILTRO PULITO: Nessun carattere UTF-8 problematico rilevato`);
    }

    // Test 3: Test velocità video e codec audio
    console.log('\n🔍 Test 3: Configurazione codec audio');
    const config = {
        videoSpeed: 2,
        memeType: 'test',
        useCollage: false
    };

    console.log(`📦 Config test: velocità ${config.videoSpeed}x`);

    if (config.videoSpeed !== 1) {
        console.log(`🔧 Dovrebbe usare codec audio 'aac' per filtering`);
    } else {
        console.log(`🔧 Dovrebbe usare codec audio 'copy' per no filtering`);
    }

    console.log('\n✅ Test completato!');
}

testFFmpegFix().catch(console.error);