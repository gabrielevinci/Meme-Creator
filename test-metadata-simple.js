const MetadataManager = require('./metadata-manager');
const path = require('path');
const fs = require('fs');

// Dati di test semplici
const testApiData = {
  "title": "Test Metadati Semplice",
  "metadata": {
    "Title": "Video Test Metadati",
    "Artist": "Test Creator",
    "Album": "Test Album",
    "Genre": "Comedy",
    "Tag": "test,metadati,video"
  }
};

async function testMetadataSimple() {
  console.log('🧪 TEST METADATI - VERSIONE SEMPLIFICATA');
  console.log('========================================\n');

  try {
    // Trova il primo video disponibile
    const inputDir = path.join(__dirname, 'INPUT');
    const videos = fs.readdirSync(inputDir).filter(file => file.toLowerCase().endsWith('.mp4'));
    
    if (videos.length === 0) {
      console.log('❌ Nessun video trovato nella cartella INPUT');
      return;
    }

    const testVideo = videos[0];
    const testVideoPath = path.join(inputDir, testVideo);
    
    console.log(`📹 Video di test: ${testVideo}`);
    console.log(`📁 Path completo: ${testVideoPath}`);

    // Crea una copia di test
    const testCopyPath = testVideoPath.replace('.mp4', '_METADATA_TEST.mp4');
    fs.copyFileSync(testVideoPath, testCopyPath);
    console.log(`📋 Copia di test creata: ${path.basename(testCopyPath)}`);

    // Applica metadati
    console.log('\n🚀 APPLICAZIONE METADATI:');
    console.log('==========================');
    const result = await MetadataManager.applyMetadataToVideo(testCopyPath, testApiData);

    if (result.success) {
      console.log('✅ Test completato con successo!');
      console.log(`📝 File finale: ${path.basename(result.newPath)}`);
    } else {
      console.log('❌ Test fallito:', result.error);
    }

  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

testMetadataSimple();
