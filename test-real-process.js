const AiProcessor = require('./ai-processor.js');
const ApiManager = require('./api-manager.js');
const VideoProcessor = require('./video-processor.js');
const fs = require('fs').promises;
const path = require('path');

async function testRealVideoProcess() {
    console.log('🎥 Test processo video reale');
    
    try {
        // Setup
        const apiManager = new ApiManager();
        await apiManager.loadConfig();
        console.log('📋 API Manager configurato');
        
        const videoProcessor = new VideoProcessor();
        const aiProcessor = new AiProcessor();
        
        // Seleziona un video dalla cartella INPUT
        const inputVideo = 'INPUT/12beautifulsunset#nature#fypシ#peacefulwalks#b7186840894744841518.mp4';
        
        console.log(`📹 Processando video: ${inputVideo}`);
        
        // Configurazione per il test
        const config = {
            memeType: 'collage',
            videoFilter: 'paesaggio/landscape/tramonto',
            memeStyle: 'io che guardo i like salire',
            outputFormat: 'jpg'
        };
        
        // Passo 1: Estrazione frame
        console.log('🎬 Estraendo frame dal video...');
        const framePaths = await videoProcessor.extractFrames(inputVideo, config);
        console.log(`✅ Frame estratti: ${framePaths.length}`);
        
        // Passo 2: Analisi AI dei frame
        console.log('🤖 Avvio analisi AI...');
        const aiResult = await aiProcessor.analyzeFrames(framePaths, config, apiManager, []);
        
        console.log('✅ Test completato con successo!');
        console.log('📊 Risultato AI:', JSON.stringify(aiResult, null, 2));
        
    } catch (error) {
        console.error('❌ Test fallito:', error.message);
        console.error('📍 Stack trace:', error.stack);
        
        // Log dettagliato per debug
        if (error.message.includes('modelInfo is not defined')) {
            console.error('🚨 ERRORE MODELINFO: Questo è il problema che stiamo cercando di risolvere!');
        }
    }
}

testRealVideoProcess();
