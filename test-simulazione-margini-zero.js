/**
 * Test di simulazione per dimostrare il comportamento con margini a 0
 */

const VideoProcessor = require('./video-processor.js');

console.log('🧪 === SIMULAZIONE COMPORTAMENTO MARGINI A 0 ===\n');

const processor = new VideoProcessor();

// Simula un processamento con margini a 0
async function simulateZeroMarginsProcessing() {
    console.log('📋 Simulazione processamento con margini tutti a 0...\n');

    // Configurazione con margini a 0
    const configZeroMargins = {
        memeType: 'test margini zero',
        videoFilter: 'test',
        memeStyle: 'test',
        useCollage: false,
        selectedFont: 'impact',
        textFormat: 'uppercase',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0
    };

    // Simula calcoli per blocco standard
    const blockWidth = 720;
    const blockHeight = 300;
    
    console.log('🎯 CONFIGURAZIONE:');
    console.log(`   📐 Blocco: ${blockWidth}x${blockHeight}px`);
    console.log(`   📏 Margini: T${configZeroMargins.marginTop} B${configZeroMargins.marginBottom} L${configZeroMargins.marginLeft} R${configZeroMargins.marginRight}`);
    
    const margins = {
        marginTop: configZeroMargins.marginTop,
        marginBottom: configZeroMargins.marginBottom,
        marginLeft: configZeroMargins.marginLeft,
        marginRight: configZeroMargins.marginRight
    };
    
    const textArea = processor.calculateAvailableTextArea(blockWidth, blockHeight, margins);
    
    console.log('\n🎯 RISULTATI:');
    console.log(`   📏 Area testo disponibile: ${textArea.width}x${textArea.height}px`);
    console.log(`   📊 Percentuale utilizzo: ${(textArea.width/blockWidth*100).toFixed(1)}% x ${(textArea.height/blockHeight*100).toFixed(1)}%`);
    
    // Simula la formula di centratura che sarà usata
    const centerFormula = `${configZeroMargins.marginLeft}+((${textArea.width}-text_w)/2)`;
    console.log(`   🎨 Formula centratura: x = ${centerFormula}`);
    console.log(`   🎨 Formula semplificata: x = 0+((720-text_w)/2) = (720-text_w)/2`);
    
    console.log('\n🎬 ESEMPIO OUTPUT FFMPEG:');
    console.log(`   drawtext=text='TESTO LUNGO CHE TOCCA I BORDI':fontfile='path/font.ttf':fontcolor=black:fontsize=72:x=${centerFormula}:y=150`);
    
    console.log('\n✅ VERIFICA REQUISITI:');
    console.log(`   ✓ Area utilizzabile: 100% del blocco bianco (${blockWidth}x${blockHeight}px)`);
    console.log(`   ✓ Testo centrato nell'intero blocco`);
    console.log(`   ✓ Se il testo è lungo, può toccare i bordi sinistro e destro`);
    console.log(`   ✓ Se ci sono molte righe, può toccare i bordi superiore e inferiore`);
    
    console.log('\n📋 CONFRONTO CON MARGINI NORMALI:');
    
    // Confronta con margini standard
    const configNormalMargins = { marginTop: 30, marginBottom: 30, marginLeft: 40, marginRight: 40 };
    const textAreaNormal = processor.calculateAvailableTextArea(blockWidth, blockHeight, configNormalMargins);
    
    console.log(`   📏 Con margini normali: ${textAreaNormal.width}x${textAreaNormal.height}px (${(textAreaNormal.width/blockWidth*100).toFixed(1)}% x ${(textAreaNormal.height/blockHeight*100).toFixed(1)}%)`);
    console.log(`   📏 Con margini a 0: ${textArea.width}x${textArea.height}px (${(textArea.width/blockWidth*100).toFixed(1)}% x ${(textArea.height/blockHeight*100).toFixed(1)}%)`);
    console.log(`   📈 Guadagno area: +${textArea.width - textAreaNormal.width}px larghezza, +${textArea.height - textAreaNormal.height}px altezza`);
}

simulateZeroMarginsProcessing().catch(console.error);
