const metadataManager = require('./metadata-manager');
const path = require('path');
const fs = require('fs');

async function testNewMP4Tags() {
  console.log('🧪 TEST NUOVI TAG MP4/iTunes CORRETTI');
  console.log('======================================\n');

  try {
    // Trova primo video INPUT per test
    const inputDir = path.join(__dirname, 'INPUT');
    const videos = fs.readdirSync(inputDir).filter(file => file.toLowerCase().endsWith('.mp4'));
    
    if (videos.length === 0) {
      console.log('❌ Nessun video trovato nella cartella INPUT');
      return;
    }

    const testVideo = videos[0];
    const testVideoPath = path.join(inputDir, testVideo);
    
    // Crea copia di test
    const testCopyPath = testVideoPath.replace('.mp4', '_TEST_MP4_TAGS.mp4');
    fs.copyFileSync(testVideoPath, testCopyPath);
    console.log(`📋 Copia di test creata: ${path.basename(testCopyPath)}`);

    // Dati di test con i nuovi tag
    const testApiData = {
      title: "Test MP4 Tags",
      metadata: {
        title: "Test Titolo MP4",
        artist: "AI Content Creator", 
        album: "Test Collection 2024",
        genre: "Comedy",
        keywords: "test,mp4,metadata,windows"
      }
    };

    console.log('\n🔍 MAPPING TAGS:');
    console.log('==================');
    Object.entries(testApiData.metadata).forEach(([key, value]) => {
      console.log(`${key} → metadato MP4 (dovrebbe funzionare ora)`);
    });

    // Applica metadati con nuovi tag
    console.log('\n🚀 APPLICAZIONE METADATI CON NUOVI TAG:');
    console.log('========================================');
    
    const metadataManager = require('./metadata-manager'); // Usa direttamente l'istanza
    const result = await metadataManager.applyMetadataToVideo(testCopyPath, testApiData);

    if (result.success) {
      console.log('✅ SUCCESSO! Metadati applicati con nuovi tag MP4!');
      console.log(`📝 File finale: ${path.basename(result.newPath)}`);
    } else {
      console.log('❌ ERRORE:', result.error);
    }

  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testNewMP4Tags();
