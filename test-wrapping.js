// Test per verificare le modifiche al text wrapping
const VideoProcessor = require('./video-processor.js');

const processor = new VideoProcessor();

// Test del wrapping del testo
const testText = "Questo è un testo molto lungo che dovrebbe essere spezzato su più righe per rispettare i limiti del banner";

// Simula parametri tipici
const fontSize = 48;
const bannerWidth = 450;
const padding = 20;
const effectiveWidth = bannerWidth - (padding * 2);
const avgCharWidth = fontSize * 0.65;
const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);
const lineHeight = fontSize * 1.2;
const bannerHeight = 450;
const maxLines = Math.floor(bannerHeight / lineHeight) - 1;

console.log('=== TEST WRAPPING TESTO ===');
console.log(`Testo originale: "${testText}"`);
console.log(`Font size: ${fontSize}px`);
console.log(`Banner width: ${bannerWidth}px`);
console.log(`Effective width: ${effectiveWidth}px`);
console.log(`Avg char width: ${avgCharWidth}px`);
console.log(`Max chars per line: ${maxCharsPerLine}`);
console.log(`Max lines: ${maxLines}`);
console.log('');

const wrappedResult = processor.wrapText(testText, maxCharsPerLine, maxLines);
console.log(`Risultato wrapped: "${wrappedResult}"`);

const lines = wrappedResult.split('\\n');
console.log(`Numero di righe: ${lines.length}`);
lines.forEach((line, i) => {
    console.log(`Riga ${i + 1}: "${line}" (${line.length} caratteri)`);
});

console.log('');
console.log('=== TEST COMPLETATO ===');