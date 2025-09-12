// Script di test per verificare il sistema completo di tracciabilità video
const VideoProcessor = require('./video-processor');
const AiProcessor = require('./ai-processor');
const path = require('path');

async function testCompleteVideoTracing() {
    console.log('🧪 Test sistema completo di tracciabilità video...\n');

    const videoProcessor = new VideoProcessor();
    const aiProcessor = new AiProcessor();
    
    // Test video di esempio
    const testVideo = '12beautifulsunset#nature#fypシ#peacefulwalks#b7186840894744841518.mp4';
    const videoPath = path.join(__dirname, 'INPUT', testVideo);
    
    console.log('1️⃣ Test estrazione frame con nuova struttura...');
    
    try {
        // Simula l'estrazione frame
        const frameResult = {
            frames: ['12beautifulsunset_nature_fyp__peacefulwalks_b71868_frame_center.jpg'],
            videoBaseName: videoProcessor.generateVideoBasedName(testVideo),
            originalVideoName: testVideo
        };
        
        console.log(`📹 Video originale: ${frameResult.originalVideoName}`);
        console.log(`🏷️ Nome base: ${frameResult.videoBaseName}`);
        console.log(`🖼️ Frame generato: ${frameResult.frames[0]}`);
        
        console.log('\n2️⃣ Test generazione nome output AI...');
        
        // Test con nome video originale
        const outputFileName = aiProcessor.generateOutputFileName(frameResult.frames[0], frameResult.originalVideoName);
        console.log(`📄 AI Output generato: ${outputFileName}`);
        
        console.log('\n3️⃣ Test tracciabilità inversa...');
        
        // Estrai il nome video dall'output AI
        const extractedBaseName = outputFileName.replace(/_ai_output_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/, '');
        console.log(`🔍 Nome estratto dall'AI output: ${extractedBaseName}`);
        
        // Verifica che corrisponda
        const matches = (extractedBaseName === frameResult.videoBaseName);
        console.log(`✅ Tracciabilità: ${matches ? 'PERFETTA' : 'FALLITA'}`);
        
        if (matches) {
            console.log('\n🎉 SUCCESSO! Il sistema di tracciabilità funziona perfettamente!');
            console.log('\n📋 Flusso completo:');
            console.log(`   Video INPUT → ${testVideo}`);
            console.log(`   Nome base   → ${frameResult.videoBaseName}`);
            console.log(`   Frame       → ${frameResult.frames[0]}`);
            console.log(`   AI Output   → ${outputFileName}`);
            console.log(`   Video OUTPUT → ${frameResult.videoBaseName}_meme_[timestamp].mp4`);
        } else {
            console.log('\n❌ ERRORE! La tracciabilità non funziona correttamente.');
        }
        
    } catch (error) {
        console.error('❌ Errore nel test:', error.message);
    }
}

testCompleteVideoTracing();
