// Test per il fix del posizionamento testo nel banner
// Problema: il testo esce dal banner bianco e non rispetta i margini degli slider

console.log('🔧 TEST FIX POSIZIONAMENTO TESTO');

// Simula la situazione vista nell'immagine
const videoWidth = 720;
const videoHeight = 1280;

// Simula i margini dagli slider (T4 B10 L3 R12 dal preview)
const marginTop = 4;
const marginBottom = 10;
const marginLeft = 3;
const marginRight = 12;

console.log('📊 PARAMETRI DI TEST:');
console.log(`Video: ${videoWidth}x${videoHeight}px`);
console.log(`Margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);

// 1. CALCOLO DIMENSIONI BANNER (come in video-processor.js)
const bannerWidth = videoWidth; // Banner copre tutta la larghezza
const bannerHeight = Math.round((videoHeight * 450) / 1920);

console.log(`Banner: ${bannerWidth}x${bannerHeight}px`);

// 2. AREA TESTO DISPONIBILE
const textAreaWidth = bannerWidth - marginLeft - marginRight;
const textAreaHeight = bannerHeight - marginTop - marginBottom;

console.log(`Area testo: ${textAreaWidth}x${textAreaHeight}px`);

// 3. SIMULAZIONE BANNER TOP
console.log('\n📍 BANNER TOP:');
const bannerX = 0;
const bannerY = 0;

// PROBLEMA IDENTIFICATO: Il calcolo del baseY non considera correttamente i margini
// VECCHIO CALCOLO (SBAGLIATO):
const fontSize = 61; // Dalla foto
const oldBaseY = marginTop + (fontSize * 0.75);

// NUOVO CALCOLO (CORRETTO):
const newBaseY = bannerY + marginTop + fontSize; // Il testo deve iniziare da marginTop più la sua altezza

console.log(`Banner position: X=${bannerX}, Y=${bannerY}`);
console.log(`VECCHIO baseY: ${oldBaseY} (SBAGLIATO - troppo basso)`);
console.log(`NUOVO baseY: ${newBaseY} (CORRETTO - rispetta margin top)`);

// 4. TEST POSIZIONI RIGHE
const lineHeight = fontSize * 1.15; // Line height tipico
const testLines = [
    'IO CHE BALLO FELICE',
    'PERCHÉ HO SCOPERTO',
    'SPOTIFY PREMIUM PER',
    '24 MESI A SOLI 35€'
];

console.log('\n📝 POSIZIONAMENTO RIGHE:');
testLines.forEach((line, i) => {
    const oldY = Math.round(oldBaseY + (i * lineHeight));
    const newY = Math.round(newBaseY + (i * lineHeight));
    
    // Controlla se esce dal banner
    const bannerMaxY = bannerY + bannerHeight - marginBottom;
    const oldOutOfBounds = oldY > bannerMaxY ? '❌ ESCE' : '✅ OK';
    const newOutOfBounds = newY > bannerMaxY ? '❌ ESCE' : '✅ OK';
    
    console.log(`Riga ${i+1} "${line}": VECCHIO Y=${oldY} ${oldOutOfBounds}, NUOVO Y=${newY} ${newOutOfBounds}`);
});

console.log(`\n📐 LIMITI BANNER:`);
console.log(`Banner top: ${bannerY}`);
console.log(`Banner bottom: ${bannerY + bannerHeight}`);
console.log(`Margine top: ${bannerY + marginTop}`);
console.log(`Margine bottom: ${bannerY + bannerHeight - marginBottom}`);
console.log(`Area sicura Y: ${bannerY + marginTop} - ${bannerY + bannerHeight - marginBottom}`);

// 5. SIMULAZIONE BANNER BOTTOM
console.log('\n📍 BANNER BOTTOM:');
const bottomBannerY = videoHeight - bannerHeight;
const oldBottomBaseY = bottomBannerY + marginTop + (fontSize * 0.75);
const newBottomBaseY = bottomBannerY + marginTop + fontSize;

console.log(`Banner position: X=${bannerX}, Y=${bottomBannerY}`);
console.log(`VECCHIO baseY: ${oldBottomBaseY} (SBAGLIATO)`);
console.log(`NUOVO baseY: ${newBottomBaseY} (CORRETTO)`);

console.log('\n🎯 CORREZIONI NECESSARIE:');
console.log('1. baseY deve essere: bannerY + marginTop + fontSize (non 0.75 * fontSize)');
console.log('2. Il testo deve iniziare DENTRO il banner rispettando marginTop');
console.log('3. Tutte le righe devono stare dentro bannerY + marginTop e bannerY + bannerHeight - marginBottom');
console.log('4. Il calcolo X deve considerare che bannerX = 0 (banner a tutta larghezza)');
