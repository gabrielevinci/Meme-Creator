// Funzione di escape corretta per FFmpeg
function escapeTextForFFmpeg(text) {
    if (!text) return text;

    console.log(`🔧 [DEBUG] INPUT: "${text}"`);
    
    // STEP 1: Pulizia caratteri UTF-8 corrotti
    let cleaned = text
        .replace(/Ôé¼/g, 'EUR')   // Euro corrotto
        .replace(/├î/g, 'i')      // î corrotto (dall'errore utente)
        .replace(/├ê/g, 'e')      // ê corrotto (dall'errore utente)  
        .replace(/├¿/g, 'e')      // è corrotto
        .replace(/├╣/g, 'u')      // ù corrotto
        .replace(/├Ç/g, 'a')      // à corrotto
        .replace(/├á/g, 'a')      
        .replace(/├í/g, 'i')      
        .replace(/├©/g, 'e')      
        .replace(/├ù/g, 'u')      
        .replace(/├â/g, 'a')      
        .replace(/├ç/g, 'c')      
        .replace(/├ñ/g, 'n')      
        .replace(/├ô/g, 'o')      
        .replace(/├«/g, 'e')      
        .replace(/├¼/g, 'u')      
        .replace(/├¬/g, 'i')      
        .replace(/├┤/g, 'o')      
        .replace(/├³/g, 'o')      
        .replace(/├¡/g, 'i')      
        .replace(/├¢/g, 'a')      
        .replace(/€/g, 'EUR')     
        .replace(/£/g, 'GBP')     
        .replace(/©/g, '(C)');    

    console.log(`🧹 [DEBUG] PULITO: "${cleaned}"`);

    // STEP 2: Escape caratteri speciali FFmpeg
    let escaped = cleaned
        .replace(/\\/g, '\\\\')   // Backslash PRIMA
        .replace(/'/g, "\\'")     // Apostrofi
        .replace(/"/g, '\\"')     // Virgolette
        .replace(/:/g, '\\:')     // Due punti
        .replace(/\[/g, '\\[')    // Parentesi quadre
        .replace(/\]/g, '\\]')    
        .replace(/;/g, '\\;')     // Punto e virgola
        .replace(/,/g, '\\,');    // Virgola
        
    console.log(`🔒 [DEBUG] OUTPUT: "${escaped}"`);
    
    // Verifica finale
    const stillProblematic = ['├î', '├ê', '├¿', '├╣', 'Ôé¼'];
    let hasIssues = false;
    
    stillProblematic.forEach(chars => {
        if (escaped.includes(chars)) {
            console.log(`❌ ERRORE: "${chars}" ancora presente!`);
            hasIssues = true;
        }
    });
    
    if (!hasIssues) {
        console.log(`✅ [SUCCESS] Testo pulito per FFmpeg`);
    }
    
    return escaped;
}

module.exports = { escapeTextForFFmpeg };
