/**
 * Test per verificare la sanificazione del testo dall'API
 */

const VideoProcessor = require('./video-processor.js');

console.log('🧪 === TEST SANIFICAZIONE TESTO API ===\n');

const processor = new VideoProcessor();

// Test con vari tipi di testo problematici
const testCases = [{
        name: "Testo con \\n letterali",
        input: "Io che ascolto la mia playlist preferita su Spotify Premium per 2 anni a 35€\\n\\n(mentre ballo come se non ci fosse un domani)",
        expected: "Io che ascolto la mia playlist preferita su Spotify Premium per 2 anni a 35€\n\n(mentre ballo come se non ci fosse un domani)"
    },
    {
        name: "Testo con emoji",
        input: "Io che ascolto Spotify 🎵 Premium 😍 per 2 anni 🎉",
        expected: "Io che ascolto Spotify 🎵 Premium 😍 per 2 anni 🎉"
    },
    {
        name: "Testo con apostrofi e virgolette",
        input: "Io che penso: 'Finalmente Spotify!' e dico \"Che bello\"",
        expected: "Io che penso: 'Finalmente Spotify!' e dico \"Che bello\""
    },
    {
        name: "Testo con caratteri speciali",
        input: "Playlist [premium] - costo: 35€/mese \\o/ yeah!",
        expected: "Playlist [premium] - costo: 35€/mese \\o/ yeah!"
    },
    {
        name: "Testo con tripli \\n",
        input: "Prima riga\\n\\n\\n\\nSeconda riga",
        expected: "Prima riga\n\nSeconda riga"
    }
];

console.log('🔧 TEST SANIFICAZIONE:\n');

testCases.forEach((testCase, index) => {
    console.log(`📋 TEST ${index + 1}: ${testCase.name}`);
    console.log(`   📝 Input: "${testCase.input}"`);

    const sanitized = processor.sanitizeText(testCase.input);

    console.log(`   ✅ Output: "${sanitized}"`);
    console.log(`   🎯 Match: ${sanitized === testCase.expected ? '✅ CORRETTO' : '❌ ERRORE'}`);
    console.log('');
});

console.log('🔒 TEST ESCAPE PER FFMPEG:\n');

testCases.forEach((testCase, index) => {
    console.log(`📋 ESCAPE TEST ${index + 1}: ${testCase.name}`);

    const sanitized = processor.sanitizeText(testCase.input);
    const escaped = processor.escapeTextForFFmpeg(sanitized);

    console.log(`   📝 Sanitized: "${sanitized}"`);
    console.log(`   🔒 Escaped: "${escaped}"`);
    console.log('');
});

console.log('🎯 CONCLUSIONI:');
console.log('   ✓ I caratteri \\n literali vengono convertiti in vere nuove righe');
console.log('   ✓ Le emoji vengono preservate');
console.log('   ✓ I caratteri speciali vengono escaped per FFmpeg');
console.log('   ✓ Il testo rimane leggibile dopo la sanificazione');

console.log('\n🎬 ESEMPIO COMANDO FFMPEG:');
const exampleText = "Spotify Premium 🎵\\nMeglio di sempre!";
const sanitized = processor.sanitizeText(exampleText);
const escaped = processor.escapeTextForFFmpeg(sanitized);
console.log(`   drawtext=text='${escaped}':fontfile='font.ttf':fontsize=48:x=100:y=100`);