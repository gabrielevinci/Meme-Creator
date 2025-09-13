// Test per verificare che le coordinate siano sempre numeri interi

const adjustedFontSize = 56; // Esempio da errore precedente
const adjustedLineHeight = Math.round(adjustedFontSize * 1.2);

console.log(`Font size: ${adjustedFontSize}`);
console.log(`Line height: ${adjustedLineHeight} (deve essere intero)`);

// Simula il calcolo di baseY per bottom banner
const height = 1920;
const bannerHeight = 450;
const lines = ['test line 1', 'test line 2', 'test line 3', 'test line 4'];
const totalTextHeight = lines.length * adjustedLineHeight;

const bannerY = height - bannerHeight;
const baseY = Math.round(bannerY + (bannerHeight - totalTextHeight) / 2 + adjustedFontSize * 0.8);

console.log(`Banner Y: ${bannerY}`);
console.log(`Base Y: ${baseY} (deve essere intero)`);
console.log(`Total text height: ${totalTextHeight}`);

// Test coordinate delle righe
for (let i = 0; i < lines.length; i++) {
    const yPos = Math.round(baseY + (i * adjustedLineHeight));
    console.log(`Riga ${i + 1}: y=${yPos} (deve essere intero, non decimale)`);
}

// Verifica che tutti i valori siano interi
const allInteger = [adjustedLineHeight, baseY, ...Array.from({ length: lines.length }, (_, i) => Math.round(baseY + (i * adjustedLineHeight)))].every(val => Number.isInteger(val));

console.log(`\n✅ Tutti i valori sono interi: ${allInteger}`);