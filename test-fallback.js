const AiProcessor = require('./ai-processor.js');
const ApiManager = require('./api-manager.js');
const path = require('path');

async function testFallback() {
    console.log('🧪 Test fallback mechanism');
    
    try {
        const apiManager = new ApiManager();
        await apiManager.loadConfig();
        
        const aiProcessor = new AiProcessor();
        
        // Simula alcuni frame paths reali per il test
        const fakeFramePaths = ['temp_frames/1757611212818_tlujibqe_frame_center_compressed_1757611213038_hgvwy0ecd.jpg'];
        const fakeConfig = {
            memeType: 'test',
            videoFilter: 'test',
            memeStyle: 'test'
        };
        
        console.log('🚀 Avvio test analyzeFrames...');
        await aiProcessor.analyzeFrames(fakeFramePaths, fakeConfig, apiManager, []);
        
    } catch (error) {
        console.error('❌ Test fallito:', error.message);
    }
}

testFallback();
