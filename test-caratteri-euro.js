const VideoProcessor = require('./video-processor');

console.log('🧪 TEST: Gestione Caratteri Euro e Speciali');
console.log('===========================================');

const processor = new VideoProcessor();

// Test specifici per i caratteri che causano problemi
const testCases = [
    "L'unica strada che vale la pena",
    "Spotify Premium 2 anni a 35€", // Caso problematico dal log
    "Prezzo: 49.99€ al mese",
    "Copyright © 2025 - Tutti i diritti riservati®",
    "Marchio™ registrato",
    "Prezzo £19.99 o ¥2500",
    "Testo con: due punti; punto e virgola, virgola",
    "Test \"virgolette doppie\" e 'apostrofi'",
    "Test[parentesi]quadre e (parentesi) tonde",
    "Accenti àèìòù e caratteri ñç"
];

console.log('🔧 TEST ESCAPE AVANZATO:');
testCases.forEach((text, i) => {
    console.log(`\n--- Test Case ${i + 1} ---`);
    console.log(`Input: "${text}"`);

    const escaped = processor.escapeTextForFFmpeg(text);
    console.log(`Escaped: "${escaped}"`);

    // Simula comando FFmpeg con virgolette doppie consistenti
    const mockFontPath = "D:/Desktop/NUOVA PROVA/font/impact.TTF";
    const ffmpegCommand = `drawtext=text="${escaped}":fontfile="${mockFontPath}":fontcolor=black:fontsize=40:x=100:y=100`;
    console.log(`FFmpeg: ${ffmpegCommand}`);
});

console.log('\n✅ Test completato!');
console.log('\n🎯 MIGLIORAMENTI:');
console.log('- € → EUR (evita corruption UTF-8)');
console.log('- Virgolette doppie consistenti in text E fontfile');
console.log('- Path font senza escape virgolette singole');
console.log('- Gestione completa simboli monetari e trademark');