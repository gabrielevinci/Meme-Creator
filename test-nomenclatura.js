// Script di test per verificare il nuovo sistema di nomenclatura
const VideoProcessor = require('./video-processor');
const fs = require('fs').promises;
const path = require('path');

async function testNomenclatureSystem() {
    const videoProcessor = new VideoProcessor();
    
    console.log('🧪 Test del sistema di nomenclatura basato su video...\n');

    // Test 1: Pulizia cartelle
    console.log('1️⃣ Test pulizia cartelle:');
    await videoProcessor.cleanAllDirectories();
    console.log('✅ Pulizia completata\n');

    // Test 2: Generazione nomi basati su video
    console.log('2️⃣ Test generazione nomi basati su video:');
    const testVideos = [
        '12beautifulsunset#nature#fypシ#peacefulwalks#b7186840894744841518.mp4',
        '15Suchahappydance#dance7211254963706678574.mp4',
        '20heaven#beautiful#nature#fypシ#aestheticvideo7187577230405455146.mp4'
    ];

    for (const video of testVideos) {
        const baseName = videoProcessor.generateVideoBasedName(video);
        console.log(`📹 Video: ${video}`);
        console.log(`🏷️ Nome base: ${baseName}`);
        console.log('');
    }

    // Test 3: Simulazione nomi file generati
    console.log('3️⃣ Test nomi file che verranno generati:');
    for (const video of testVideos) {
        const baseName = videoProcessor.generateVideoBasedName(video);
        
        // Frame
        const frameName = `${baseName}_frame_center.jpg`;
        console.log(`🖼️ Frame: ${frameName}`);
        
        // AI Output
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const aiOutputName = `${baseName}_ai_output_${timestamp}.txt`;
        console.log(`🤖 AI Output: ${aiOutputName}`);
        
        // Video finale
        const finalVideoName = `${baseName}_meme_${Date.now()}.mp4`;
        console.log(`🎬 Video finale: ${finalVideoName}`);
        
        console.log('---');
    }

    // Test 4: Verifica tracciabilità
    console.log('4️⃣ Test tracciabilità nome video da AI output:');
    const sampleAiOutput = '12beautifulsunset_nature_fyp__peacefulwalks_b7186840894744841518_ai_output_2025-09-12T01-18-45.txt';
    const extractedBaseName = sampleAiOutput.replace(/_ai_output_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.txt$/, '');
    console.log(`📄 AI Output: ${sampleAiOutput}`);
    console.log(`🔍 Nome video estratto: ${extractedBaseName}`);
    
    // Trova video corrispondente
    const inputDir = path.join(__dirname, 'INPUT');
    try {
        const inputFiles = await fs.readdir(inputDir);
        const mp4Files = inputFiles.filter(file => file.endsWith('.mp4'));
        
        for (const videoFile of mp4Files) {
            const videoBaseName = videoProcessor.generateVideoBasedName(videoFile);
            if (videoBaseName === extractedBaseName) {
                console.log(`✅ Video trovato: ${videoFile}`);
                break;
            }
        }
    } catch (error) {
        console.log('⚠️ Cartella INPUT non accessibile');
    }
    
    console.log('\n🎯 Test nomenclatura completato!');
}

testNomenclatureSystem().catch(console.error);
