/**
 * TEST CARATTERI CORROTTI UTF-8
 * Testa la funzione escapeTextForFFmpeg con caratteri problematici
 */

console.log('🧪 TEST CARATTERI CORROTTI UTF-8');
console.log('=================================\n');

// Testi con caratteri problematici dal log
const testiProblematici = [
    "l'unica cosa che produco veramente sono melodie e offerte speciali per spotify premium 2 anni a 35Ôé¼",
    "l'unica certezza della vita sono le montagne e la possibilità di avere spotify premium 2 anni a 35Ôé¼",
    "l'unica cosa che mi serve per questo viaggio è spotify premium 2 anni a 35Ôé¼",
    "LA POSSIBILIT├Ç DI AVERE",
    "├ê SPOTIFY PREMIUM 2 ANNI",
    "pi├╣ forte di questape ├¿",
    "panorama ├¿ spotify"
];

// Funzione di escape semplificata per il test
function escapeTextForFFmpeg(text) {
    if (!text) return text;

    console.log(`🔧 Testo pre-escape: "${text}"`);

    let escaped = text
        // Caratteri Euro corrotti (PRIORITÀ MASSIMA)
        .replace(/Ôé¼/g, 'EUR')
        .replace(/€/g, 'EUR')
        .replace(/ôé¼/g, 'EUR')
        .replace(/Ôé€/g, 'EUR')

    // Caratteri accentati corrotti (ESTESO)
    .replace(/├á/g, 'a')
        .replace(/├í/g, 'i')
        .replace(/├©/g, 'e')
        .replace(/├¿/g, 'e')
        .replace(/├ù/g, 'u')
        .replace(/├Ç/g, 'a')
        .replace(/├â/g, 'a')
        .replace(/├ê/g, 'e')
        .replace(/├ç/g, 'c')
        .replace(/├ñ/g, 'n')
        .replace(/├ô/g, 'o')
        .replace(/├«/g, 'e')
        .replace(/├¼/g, 'u')
        .replace(/├╣/g, 'u') // ù corrotto critico
        .replace(/├¿/g, 'e') // è corrotto critico

    // Apostrofi
    .replace(/'/g, "\\'")

    // Escape dei due punti
    .replace(/:/g, '\\:')

    // Escape delle barre inverse
    .replace(/\\/g, '\\\\')

    // Escape delle parentesi quadre
    .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')

    // Escape dei caratteri problematici per filtri
    .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');

    console.log(`🔒 Testo escaped per FFmpeg: "${escaped}"`);
    return escaped;
}

testiProblematici.forEach((testo, i) => {
    console.log(`\n🔍 Test ${i+1}:`);
    console.log(`📝 Input:  "${testo}"`);
    const risultato = escapeTextForFFmpeg(testo);
    console.log(`✅ Output: "${risultato}"`);
    console.log(`---`);
});

console.log('\n✅ Test completato!');