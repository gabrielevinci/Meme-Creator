/**
 * TEST PREVIEW DINAMICO - Verifica funzionamento slider e area testo
 */

console.log('🧪 === TEST PREVIEW DINAMICO E SLIDER ===\n');

// Simula la logica della funzione updateBannerPreview()
function testPreviewLogic(marginTop, marginBottom, marginLeft, marginRight) {
    console.log(`📋 Test con margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);
    
    // Dimensioni del "video" nel preview (come nel codice reale)
    const previewVideoWidth = 320;
    const previewVideoHeight = 240;
    
    // Banner copre tutta la larghezza del video
    const bannerWidth = previewVideoWidth;
    // Altezza proporzionale: 1920 : 450 = previewVideoHeight : bannerHeight
    const bannerHeight = Math.round((previewVideoHeight * 450) / 1920);
    
    // Calcola l'area effettiva disponibile per il testo
    const textAreaWidth = bannerWidth - marginLeft - marginRight;
    const textAreaHeight = bannerHeight - marginTop - marginBottom;
    
    // Controlla se tutti i margini sono zero (modalità full banner)
    const allMarginsZero = marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0;
    
    console.log(`   • Video preview: ${previewVideoWidth}×${previewVideoHeight}px`);
    console.log(`   • Banner dimensioni: ${bannerWidth}×${bannerHeight}px`);
    console.log(`   • Area testo: ${textAreaWidth}×${textAreaHeight}px`);
    console.log(`   • Modalità: ${allMarginsZero ? '🟢 FULL BANNER' : '🔵 CON MARGINI'}`);
    console.log(`   • Rettangolo posizione: X=${marginLeft}, Y=${marginTop}, W=${Math.max(textAreaWidth, 20)}, H=${Math.max(textAreaHeight, 15)}`);
    console.log('');
    
    return {
        bannerWidth,
        bannerHeight,
        textAreaWidth,
        textAreaHeight,
        allMarginsZero,
        rectPosition: {
            x: marginLeft,
            y: marginTop,
            width: Math.max(textAreaWidth, 20),
            height: Math.max(textAreaHeight, 15)
        }
    };
}

console.log('📋 Test 1: Configurazione Default (T30 B30 L40 R40)');
testPreviewLogic(30, 30, 40, 40);

console.log('📋 Test 2: Tutti Margini Zero (Full Banner)');
testPreviewLogic(0, 0, 0, 0);

console.log('📋 Test 3: Solo Margini Laterali (T0 B0 L50 R50)');
testPreviewLogic(0, 0, 50, 50);

console.log('📋 Test 4: Solo Margini Verticali (T40 B40 L0 R0)');
testPreviewLogic(40, 40, 0, 0);

console.log('📋 Test 5: Margini Asimmetrici (T18 B21 L25 R35)');
testPreviewLogic(18, 21, 25, 35);

console.log('📋 Test 6: Margini Estremi (T1 B1 L1 R1)');
testPreviewLogic(1, 1, 1, 1);

console.log('✅ === TEST PREVIEW COMPLETATI ===');
console.log('🎯 La preview dinamica dovrebbe:');
console.log('   1. Mostrare un rettangolo rosso che rappresenta l\'area del testo');
console.log('   2. Il rettangolo si sposta e ridimensiona quando muovi gli slider');
console.log('   3. Quando tutti i margini sono 0, diventa verde con scritta "FULL BANNER"');
console.log('   4. Gli slider devono essere collegati agli event listener "input"');
console.log('   5. Ogni movimento dello slider chiama updateBannerPreview()');
