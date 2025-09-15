const VideoProcessor = require('./video-processor.js');
const path = require('path');

async function testFrameRemoval() {
    console.log('🧪 Test rimozione primo frame nero...\n');
    
    const processor = new VideoProcessor();
    const inputVideo = path.join(__dirname, 'INPUT', '0002.mp4');
    
    try {
        console.log(`📹 Video input: ${path.basename(inputVideo)}`);
        
        const result = await processor.removeFirstFrameIfBlack(inputVideo);
        
        if (result && result !== inputVideo) {
            console.log(`\n✅ SUCCESSO! Video processato:`);
            console.log(`📂 File originale: ${path.basename(inputVideo)}`);
            console.log(`📂 File processato: ${path.basename(result)}`);
            
            // Controlla le dimensioni dei file
            const fs = require('fs');
            const originalSize = fs.statSync(inputVideo).size;
            const processedSize = fs.statSync(result).size;
            
            console.log(`📊 Dimensioni:`);
            console.log(`   Originale: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Processato: ${(processedSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Differenza: ${(((processedSize - originalSize) / originalSize) * 100).toFixed(2)}%`);
        } else {
            console.log(`\n✅ Il primo frame non è nero, video mantenuto originale`);
        }
        
    } catch (error) {
        console.error(`\n❌ ERRORE durante il test:`, error.message);
        console.error('Stack trace:', error.stack);
    }
}

testFrameRemoval();
