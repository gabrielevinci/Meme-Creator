const VideoProcessor = require('./video-processor');

console.log('🧪 TEST: Gestione Caratteri Speciali per FFmpeg');
console.log('================================================');

// Crea un'istanza del VideoProcessor
const processor = new VideoProcessor();

// Test dei vari caratteri speciali che possono causare problemi
const testCases = [
    "L'unica piccola ape che produce davvero miele",
    "Spotify Premium 2 anni a 35€",
    "\"Ciao mondo\" - disse Mario",
    "Test: con due punti",
    "Test\\backslash",
    "Test[parentesi]quadre",
    "Test;semicolon,comma",
    "È una bella giornata! 🌞",
    "L'apostrofo di Mario è importante",
    "Test \"virgolette\" e 'apostrofi' insieme"
];

console.log('🔧 TEST SANITIZE TEXT:');
testCases.forEach((text, i) => {
    console.log(`\n--- Test Case ${i + 1} ---`);
    console.log(`Input: "${text}"`);
    
    const sanitized = processor.sanitizeText(text);
    console.log(`Sanitized: "${sanitized}"`);
    
    const escaped = processor.escapeTextForFFmpeg(sanitized);
    console.log(`Escaped: "${escaped}"`);
    
    // Simula il comando FFmpeg drawtext
    const ffmpegCommand = `drawtext=text="${escaped}":fontfile=impact.ttf:fontsize=40:x=100:y=100`;
    console.log(`FFmpeg Command: ${ffmpegCommand}`);
});

console.log('\n✅ Test completato!');
console.log('\nNOTE:');
console.log('- Gli apostrofi \' dovrebbero rimanere invariati');
console.log('- Le virgolette " dovrebbero essere escape con \\"');
console.log('- Il testo dovrebbe essere racchiuso in virgolette doppie nel comando FFmpeg');
