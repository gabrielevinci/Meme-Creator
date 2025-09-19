// Test per verificare FFprobe e struttura dati resoconto
const ResocontoManager = require('./resoconto-manager');
const path = require('path');

async function testResoconto() {
    console.log('🧪 Test nuovo sistema resoconto con FFprobe');
    
    const resocontoManager = new ResocontoManager();
    
    // Test 1: Verifica colonne create
    console.log('\n📋 Test 1: Colonne create');
    const colonne = resocontoManager.creaColonne();
    console.log(`✅ Numero colonne create: ${colonne.length}`);
    console.log('📝 Prime 10 colonne:', colonne.slice(0, 10));
    
    // Test 2: Verifica FFprobe su un file esistente se disponibile
    console.log('\n🔍 Test 2: FFprobe su file esistente');
    
    // Cerca un video nella cartella OUTPUT per testare
    const fs = require('fs').promises;
    const outputDir = './OUTPUT';
    
    try {
        const files = await fs.readdir(outputDir);
        const videoFile = files.find(file => file.endsWith('.mp4'));
        
        if (videoFile) {
            const videoPath = path.join(outputDir, videoFile);
            console.log(`🎬 Test su file: ${videoFile}`);
            
            const info = await resocontoManager.ottieniInfoVideoCompleto(videoPath);
            console.log('✅ Info video ottenute:', info);
            
            // Test 3: Simula aggiunta riga resoconto
            console.log('\n📝 Test 3: Simulazione dati resoconto');
            const datiTest = {
                nomeInput: 'video_originale.mp4',
                nomeOutput: 'video_elaborato.mp4',
                vecchioNome: 'temp_video.mp4',
                nuovoNome: videoFile,
                meme: 'Testo meme di test',
                titoloCompleto: 'Titolo completo con #hashtag #test #prova',
                filtro: true,
                posizioneBanner: 'top',
                descrizione: 'Descrizione video di test',
                metadati: { Title: 'Test', Artist: 'Test Artist' },
                durata: info.durata,
                dimensioneMB: info.dimensioneMB,
                altezza: info.altezza,
                larghezza: info.larghezza
            };
            
            resocontoManager.aggiungiRiga(datiTest);
            console.log(`✅ Riga aggiunta al resoconto (${resocontoManager.getNumeroRighe()} righe totali)`);
            
            // Test 4: Genera file Excel test
            console.log('\n📊 Test 4: Generazione Excel test');
            const testPath = await resocontoManager.generaResocontoExcel('./');
            console.log(`✅ File Excel test generato: ${testPath}`);
            
        } else {
            console.log('⚠️ Nessun file video trovato in OUTPUT per il test FFprobe');
        }
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
    }
}

testResoconto().catch(console.error);
