/**
 * Test per verificare il posizionamento preciso del testo secondo i margini
 */

console.log('📍 === TEST POSIZIONAMENTO TESTO PRECISO ===\n');

// Simula diversi scenari di margini per verificare il posizionamento
function testTextPositioning() {
    console.log('🎯 Test posizionamento X con diversi margini...\n');

    const blockWidth = 720; // Larghezza blocco bianco

    const scenarios = [{
            name: "Margini simmetrici",
            marginLeft: 40,
            marginRight: 40,
            description: "Testo centrato nell'area rimanente"
        },
        {
            name: "Solo margine sinistro",
            marginLeft: 100,
            marginRight: 0,
            description: "Testo spostato a destra, attaccato al bordo destro"
        },
        {
            name: "Solo margine destro",
            marginLeft: 0,
            marginRight: 150,
            description: "Testo spostato a sinistra, parte dal bordo sinistro"
        },
        {
            name: "Margini asimmetrici",
            marginLeft: 50,
            marginRight: 200,
            description: "Testo centrato in area asimmetrica"
        },
        {
            name: "Margini minimi",
            marginLeft: 0,
            marginRight: 0,
            description: "Testo utilizza tutta la larghezza disponibile"
        }
    ];

    scenarios.forEach(scenario => {
        console.log(`📋 SCENARIO: ${scenario.name}`);
        console.log(`   📝 ${scenario.description}`);
        console.log(`   🎛️  Margini: L${scenario.marginLeft} R${scenario.marginRight}`);

        const { marginLeft, marginRight } = scenario;

        // Calcola area disponibile
        const availableWidth = blockWidth - marginLeft - marginRight;

        // Simula la formula X di FFmpeg
        const xPosFormula = `(${marginLeft} + (${availableWidth} - text_w)/2)`;

        console.log(`   📐 Blocco width: ${blockWidth}px`);
        console.log(`   📏 Area disponibile: ${availableWidth}px (da ${marginLeft}px a ${blockWidth - marginRight}px)`);
        console.log(`   📍 Formula X: ${xPosFormula}`);

        // Simula alcuni valori di text_w per vedere il posizionamento
        const textWidths = [200, 400, 600];

        textWidths.forEach(textWidth => {
            // Calcola X reale
            const xPos = marginLeft + (availableWidth - textWidth) / 2;
            const rightEdge = xPos + textWidth;

            console.log(`     • Testo largo ${textWidth}px -> X=${xPos.toFixed(1)}px, fine a ${rightEdge.toFixed(1)}px`);

            // Verifica che rispetti i margini
            if (xPos >= marginLeft && rightEdge <= (blockWidth - marginRight)) {
                console.log(`       ✅ Margini rispettati`);
            } else {
                console.log(`       ❌ PROBLEMA: Margini non rispettati!`);
            }
        });

        console.log('');
    });
}

// Test specifico per il caso richiesto dall'utente
function testSpecificCase() {
    console.log('🎯 TEST CASO SPECIFICO DELL\'UTENTE:\n');
    console.log('   "se si mette 0 a destra e 10 a sinistra, significa che il testo');
    console.log('    si deve attaccare al margine destro"');
    console.log('');

    const blockWidth = 720;
    const marginLeft = 10;
    const marginRight = 0;

    const availableWidth = blockWidth - marginLeft - marginRight; // 710

    console.log(`📐 Configurazione:`);
    console.log(`   Larghezza blocco: ${blockWidth}px`);
    console.log(`   Margine sinistro: ${marginLeft}px`);
    console.log(`   Margine destro: ${marginRight}px`);
    console.log(`   Area disponibile: ${availableWidth}px (da ${marginLeft}px a ${blockWidth}px)`);
    console.log('');

    // Formula corrente
    const xPosFormula = `(${marginLeft} + (${availableWidth} - text_w)/2)`;
    console.log(`📍 Formula X attuale: ${xPosFormula}`);
    console.log('');

    // Test con diversi width del testo
    console.log('🧪 Simulazione posizionamento:');

    const textWidths = [300, 500, 700, 710]; // Ultimo = larghezza massima

    textWidths.forEach(textWidth => {
        const xPos = marginLeft + (availableWidth - textWidth) / 2;
        const rightEdge = xPos + textWidth;
        const distanceFromRightEdge = blockWidth - rightEdge;

        console.log(`   • Testo ${textWidth}px: X=${xPos.toFixed(1)}px, fine a ${rightEdge.toFixed(1)}px`);
        console.log(`     Distanza dal bordo destro: ${distanceFromRightEdge.toFixed(1)}px`);

        if (textWidth === availableWidth) {
            console.log(`     ✅ PERFETTO: Il testo largo ${textWidth}px si attacca esattamente ai margini!`);
        }
        console.log('');
    });
}

// Test formula alternativa per allineamento a destra
function testRightAlignmentAlternative() {
    console.log('🎯 ALTERNATIVA - ALLINEAMENTO DINAMICO:\n');
    console.log('Se vogliamo che il testo "si attacchi" davvero al margine più stretto...\n');

    const scenarios = [
        { name: "Caso 1", marginLeft: 10, marginRight: 0 }, // Testo verso destra
        { name: "Caso 2", marginLeft: 0, marginRight: 50 }, // Testo verso sinistra  
        { name: "Caso 3", marginLeft: 20, marginRight: 20 }, // Testo centrato
        { name: "Caso 4", marginLeft: 0, marginRight: 0 } // Testo centrato completo
    ];

    scenarios.forEach(scenario => {
        const { marginLeft, marginRight } = scenario;
        const blockWidth = 720;

        console.log(`📋 ${scenario.name}: L${marginLeft} R${marginRight}`);

        if (marginLeft > marginRight) {
            // Più spazio a sinistra -> allinea a destra nell'area disponibile
            console.log(`   📍 Strategia: Allinea verso DESTRA (marginLeft > marginRight)`);
            const xPos = `(${blockWidth - marginRight} - text_w)`;
            console.log(`   📍 Formula X: ${xPos}`);
        } else if (marginRight > marginLeft) {
            // Più spazio a destra -> allinea a sinistra
            console.log(`   📍 Strategia: Allinea verso SINISTRA (marginRight > marginLeft)`);
            const xPos = marginLeft;
            console.log(`   📍 Formula X: ${xPos}`);
        } else {
            // Margini uguali -> centra
            console.log(`   📍 Strategia: CENTRA (margini uguali)`);
            const availableWidth = blockWidth - marginLeft - marginRight;
            const xPos = `(${marginLeft} + (${availableWidth} - text_w)/2)`;
            console.log(`   📍 Formula X: ${xPos}`);
        }
        console.log('');
    });

    console.log('💡 Questa alternativa farebbe "attaccare" il testo al margine più piccolo');
    console.log('   ma potrebbe essere confusionaria. Il centratura nell\'area è più prevedibile.');
}

// Esegui tutti i test
testTextPositioning();
testSpecificCase();
testRightAlignmentAlternative();

console.log('🎉 RIEPILOGO:');
console.log('✅ La formula corrente centra il testo nell\'area disponibile tra i margini');
console.log('✅ Con marginLeft=10 e marginRight=0, il testo usa l\'area da 10px a 720px');
console.log('✅ Il testo NON si "attacca" al bordo, ma è centrato nell\'area 710px');
console.log('');
console.log('🔧 Se vuoi che si "attacchi" davvero, possiamo implementare l\'alternativa');
console.log('   ma la centratura è più standard e prevedibile per l\'utente.');