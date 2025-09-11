const AiProcessor = require('./ai-processor.js');
const ApiManager = require('./api-manager.js');

// Mock per simulare errore 404
class MockApiManager extends ApiManager {
    constructor() {
        super();
        this.callCount = 0;
    }

    // Simula una chiamata che fallisce con 404 la prima volta, poi funziona
    async makeRequest(url, data, headers) {
        this.callCount++;
        console.log(`📞 Chiamata API #${this.callCount}`);
        
        if (this.callCount === 1) {
            // Prima chiamata: simula 404 per modello fdiocanr
            console.log('🚫 Simulando errore 404 per fdiocanr');
            const error = new Error('Request failed with status code 404: models/fdiocanr is not found');
            error.response = { status: 404 };
            throw error;
        } else {
            // Seconda chiamata: simula successo per gemini-2.5-flash-lite
            console.log('✅ Simulando successo per gemini-2.5-flash-lite');
            return {
                data: {
                    candidates: [{
                        content: {
                            parts: [{
                                text: '{"description": "Test response", "matches_filter": 1, "banner_position": "top", "meme_text": "Test meme"}'
                            }]
                        }
                    }]
                }
            };
        }
    }
}

async function testFallback404() {
    console.log('🧪 Test fallback 404 mechanism');
    
    try {
        const mockApiManager = new MockApiManager();
        await mockApiManager.loadConfig();
        
        const aiProcessor = new AiProcessor();
        
        // Simula alcuni frame paths reali per il test
        const fakeFramePaths = ['temp_frames/1757611212818_tlujibqe_frame_center_compressed_1757611213038_hgvwy0ecd.jpg'];
        const fakeConfig = {
            memeType: 'test',
            videoFilter: 'test', 
            memeStyle: 'test'
        };
        
        console.log('🚀 Avvio test analyzeFrames con mock 404...');
        const result = await aiProcessor.analyzeFrames(fakeFramePaths, fakeConfig, mockApiManager, []);
        
        console.log('✅ Test completato con successo!');
        console.log('📊 Risultato:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('❌ Test fallito:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

testFallback404();
