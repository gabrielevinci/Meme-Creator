// FUNZIONE CORRETTA PER ESCAPING FFMPEG
escapeTextForFFmpeg(text) {
    if (!text) return text;

    console.log(`🔧 [DEBUG] Testo ORIGINALE: "${text}"`);
    console.log(`🔍 [DEBUG] Ricerca caratteri problematici:`);

    // DEBUG: Lista completa caratteri UTF-8 problematici
    const problematicChars = ['├', '╣', '¿', 'Ô', 'é', '¼', 'î', 'ê', 'Ç', 'á', 'í', '©', 'ù', 'â', 'ç', 'ñ', 'ô', '«', '¬', '┤', '³', '¡', '¢'];
    let foundProblems = [];

    problematicChars.forEach(char => {
        if (text.includes(char)) {
            foundProblems.push(char);
            console.log(`   ❌ CARATTERE PROBLEMATICO: "${char}" trovato in "${text}"`);
        }
    });

    if (foundProblems.length === 0) {
        console.log(`   ✅ Nessun carattere UTF-8 problematico trovato`);
    }

    // FASE 1: PULIZIA TOTALE CARATTERI UTF-8 CORROTTI
    let cleanedText = text
        // Euro corrotto - PRIORITÀ MASSIMA
        .replace(/Ôé¼/g, 'EUR')
        .replace(/€/g, 'EUR')
        .replace(/ôé¼/g, 'EUR')
        .replace(/Ôé€/g, 'EUR')

    // CARATTERI CRITICI DALL'ERRORE UTENTE
    .replace(/├î/g, 'i') // "COS├î" nell'errore -> "COSi" 
        .replace(/├ê/g, 'e') // "BASSO ├ê" nell'errore -> "BASSO e"

    // Altri caratteri UTF-8 corrotti comuni
    .replace(/├¿/g, 'e') // è corrotto
        .replace(/├╣/g, 'u') // ù corrotto  
        .replace(/├Ç/g, 'a') // à corrotto
        .replace(/├á/g, 'a') // à alternativo
        .replace(/├í/g, 'i') // í corrotto
        .replace(/├©/g, 'e') // é corrotto
        .replace(/├ù/g, 'u') // ù alternativo
        .replace(/├â/g, 'a') // à variante
        .replace(/├ç/g, 'c') // ç corrotto
        .replace(/├ñ/g, 'n') // ñ corrotto
        .replace(/├ô/g, 'o') // ô corrotto
        .replace(/├«/g, 'e') // ë corrotto
        .replace(/├¼/g, 'u') // ü corrotto
        .replace(/├¬/g, 'i') // î variante
        .replace(/├┤/g, 'o') // ô variante
        .replace(/├³/g, 'o') // ó corrotto
        .replace(/├¡/g, 'i') // í variante
        .replace(/├¢/g, 'a') // â corrotto

    // Simboli monetari e speciali
    .replace(/£/g, 'GBP')
        .replace(/¥/g, 'YEN')
        .replace(/©/g, '(C)')
        .replace(/®/g, '(R)')
        .replace(/™/g, '(TM)');

    console.log(`🧹 [DEBUG] Dopo pulizia UTF-8: "${cleanedText}"`);

    // FASE 2: ESCAPE CARATTERI SPECIALI FFMPEG - ORDINE CRITICO
    let escaped = cleanedText;

    // 1. PRIMA: Escape barre inverse (DEVE essere il primo!)
    escaped = escaped.replace(/\\/g, '\\\\');
    console.log(`🔧 [DEBUG] Dopo escape backslash: "${escaped}"`);

    // 2. SECONDO: Apostrofi (escape singolo, NON doppio)
    escaped = escaped.replace(/'/g, "\\'");
    console.log(`🔧 [DEBUG] Dopo escape apostrofi: "${escaped}"`);

    // 3. TERZO: Altri caratteri speciali
    escaped = escaped.replace(/"/g, '\\"'); // Virgolette
    escaped = escaped.replace(/:/g, '\\:'); // Due punti
    escaped = escaped.replace(/\[/g, '\\['); // Parentesi quadre
    escaped = escaped.replace(/\]/g, '\\]');
    escaped = escaped.replace(/;/g, '\\;'); // Punto e virgola
    escaped = escaped.replace(/,/g, '\\,'); // Virgola

    console.log(`🔒 [DEBUG] Testo FINALE escaped: "${escaped}"`);

    // VERIFICA FINALE: Controlla se ci sono ancora problemi
    let finalProblems = [];
    problematicChars.forEach(char => {
        if (escaped.includes(char)) {
            finalProblems.push(char);
        }
    });

    if (finalProblems.length > 0) {
        console.log(`❌ [ERRORE CRITICO] Caratteri problematici ancora presenti dopo l'escape:`);
        finalProblems.forEach(char => {
            console.log(`   ❌ PROBLEMA: "${char}" ancora nel testo finale`);
        });
        console.log(`   📝 Testo problematico: "${escaped}"`);
    } else {
        console.log(`✅ [SUCCESSO] Testo completamente pulito per FFmpeg`);
    }

    return escaped;
}