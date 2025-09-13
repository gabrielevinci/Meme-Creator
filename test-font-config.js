// Test completo delle modifiche al rendering dei meme
const path = require('path');

console.log('=== TEST CONFIGURAZIONE FONT E POSIZIONAMENTO ===');

// Simula la configurazione che viene usata nel video processor
const config = { selectedFont: 'impact.ttf' };
const width = 1920; // Dimensione video tipica
const height = 1080; // Dimensione video tipica
const bannerHeight = 450;
const fontSize = Math.max(32, Math.min(56, width / 18));

// Testa la configurazione del font
const selectedFont = (config && config.selectedFont) ? config.selectedFont : 'impact.ttf';
const fontPath = path.join(__dirname, 'font', selectedFont);
const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');

console.log(`🎨 Font selezionato: ${selectedFont}`);
console.log(`📂 Percorso font assoluto: ${fontPath}`);
console.log(`📂 Percorso font escaped per FFmpeg: ${escapedFontPath}`);

// Testa il calcolo migliorato dei caratteri per riga
const bannerWidth = 450;
const padding = 20;
const effectiveWidth = bannerWidth - (padding * 2);
const avgCharWidth = fontSize * 0.65;
const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);
const lineHeight = fontSize * 1.2;
const maxLines = Math.floor(bannerHeight / lineHeight) - 1;

console.log('');
console.log('📐 CALCOLI DIMENSIONALI:');
console.log(`   Video: ${width}x${height}px`);
console.log(`   Banner: ${bannerHeight}px altezza`);
console.log(`   Font size: ${fontSize}px`);
console.log(`   Effective width: ${effectiveWidth}px`);
console.log(`   Max chars per line: ${maxCharsPerLine}`);
console.log(`   Line height: ${lineHeight}px`);
console.log(`   Max lines: ${maxLines}`);

// Testa il posizionamento verticale
const testLines = ['Prima riga', 'Seconda riga', 'Terza riga'];
const totalTextHeight = testLines.length * lineHeight;

// Test per banner top
const baseYTop = (bannerHeight - totalTextHeight) / 2 + fontSize * 0.8;
console.log('');
console.log('📍 POSIZIONAMENTO BANNER TOP:');
console.log(`   Base Y: ${baseYTop}px`);
testLines.forEach((line, i) => {
    const yPos = baseYTop + (i * lineHeight);
    console.log(`   Riga ${i + 1}: y=${yPos}px`);
});

// Test per banner bottom  
const bannerY = height - bannerHeight;
const baseYBottom = bannerY + (bannerHeight - totalTextHeight) / 2 + fontSize * 0.8;
console.log('');
console.log('📍 POSIZIONAMENTO BANNER BOTTOM:');
console.log(`   Banner Y: ${bannerY}px`);
console.log(`   Base Y: ${baseYBottom}px`);
testLines.forEach((line, i) => {
    const yPos = baseYBottom + (i * lineHeight);
    console.log(`   Riga ${i + 1}: y=${yPos}px`);
});

// Verifica che il font esista
const fs = require('fs');
fs.access(fontPath, fs.constants.F_OK, (err) => {
    console.log('');
    if (err) {
        console.log(`❌ FONT NON TROVATO: ${fontPath}`);
    } else {
        console.log(`✅ FONT TROVATO: ${fontPath}`);
    }

    console.log('');
    console.log('=== TEST COMPLETATO ===');
});