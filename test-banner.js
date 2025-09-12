// Script di test per verificare il mapping video e text wrapping
const VideoProcessor = require('./video-processor');

async function testBannerProcessing() {
    const videoProcessor = new VideoProcessor();
    
    console.log('🧪 Test mapping e text wrapping...');
    
    const config = {
        memeType: 'test',
        videoFilter: 'test',
        memeStyle: 'test',
        useCollage: false,
        selectedFont: 'BOD_BLAR.TTF'
    };
    
    try {
        const result = await videoProcessor.processVideosWithBanners(null, config);
        console.log('✅ Test completato:', result);
    } catch (error) {
        console.error('❌ Errore nel test:', error.message);
    }
}

testBannerProcessing();
