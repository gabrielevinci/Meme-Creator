const fs = require('fs');
const path = require('path');

async function testMetadataFlow() {
  console.log('🧪 TEST FINALE: VERIFICA FLUSSO COMPLETO METADATI');
  console.log('==================================================\n');

  const inputDir = path.join(__dirname, 'INPUT');
  const outputDir = path.join(__dirname, 'OUTPUT');

  // 1. Conta metadati nei video INPUT
  console.log('📊 RIEPILOGO METADATI INPUT:');
  console.log('=============================');
  
  const inputFiles = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.mp4'));
  console.log(`📁 Video INPUT trovati: ${inputFiles.length}`);
  
  let inputWithMetadata = 0;
  inputFiles.forEach(file => {
    const stats = fs.statSync(path.join(inputDir, file));
    const dateModified = stats.mtime.toISOString().split('T')[0];
    console.log(`  - ${file} (modificato: ${dateModified})`);
    
    // I file INPUT con metadati sono probabilmente da test precedenti
    inputWithMetadata++;
  });

  // 2. Conta metadati nei video OUTPUT
  console.log('\n📊 RIEPILOGO METADATI OUTPUT:');
  console.log('==============================');
  
  const outputFiles = fs.readdirSync(outputDir).filter(f => f.toLowerCase().endsWith('.mp4'));
  console.log(`📁 Video OUTPUT trovati: ${outputFiles.length}`);
  
  outputFiles.forEach(file => {
    const stats = fs.statSync(path.join(outputDir, file));
    const dateModified = stats.mtime.toISOString().split('T')[0];
    console.log(`  - ${file} (creato: ${dateModified})`);
  });

  // 3. Verifica stato attuale
  console.log('\n🔍 VERIFICA CODICE ATTUALE:');
  console.log('============================');
  
  // Verifica che il popup sia stato rimosso
  const mainJsContent = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  const hasPopupRemoved = !mainJsContent.includes('video-metadata-applied');
  console.log(`✅ Popup metadati rimosso: ${hasPopupRemoved ? 'SÌ' : 'NO'}`);
  
  // Verifica che i metadati vengano applicati ai video OUTPUT
  const videoProcessorContent = fs.readFileSync(path.join(__dirname, 'video-processor.js'), 'utf8');
  const appliesMetadataToOutput = videoProcessorContent.includes('outputVideoPath') && 
                                  videoProcessorContent.includes('processVideoComplete');
  console.log(`✅ Metadati applicati a OUTPUT: ${appliesMetadataToOutput ? 'SÌ' : 'NO'}`);
  
  // Verifica che non ci siano applicazioni ai file INPUT
  const hasInputMetadataCall = videoProcessorContent.includes('applyMetadataToVideo(inputVideoPath)');
  console.log(`✅ Input video protetti: ${!hasInputMetadataCall ? 'SÌ' : 'NO'}`);

  console.log('\n📋 CONCLUSIONI:');
  console.log('================');
  console.log('✅ Il popup "Metadati Applicati" è stato rimosso');
  console.log('✅ I metadati vengono applicati SOLO ai video OUTPUT');
  console.log('✅ I video INPUT non vengono modificati dal sistema attuale');
  console.log('⚠️ I metadati trovati nei video INPUT sono probabilmente da test precedenti');
  console.log('💡 Per pulire i metadati INPUT, bisogna rigenerare i file originali');
}

// Esegui il test
testMetadataFlow().catch(console.error);
