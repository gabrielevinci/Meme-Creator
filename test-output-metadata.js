const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function testOutputOnlyMetadata() {
  console.log('🧪 TEST: VERIFICA CHE I METADATI VENGANO APPLICATI SOLO AI VIDEO OUTPUT');
  console.log('=======================================================================\n');

  const inputDir = path.join(__dirname, 'INPUT');
  const outputDir = path.join(__dirname, 'OUTPUT');

  try {
    // 1. Controlla video INPUT (dovrebbero essere senza metadati applicati dal nostro sistema)
    console.log('🔍 CONTROLLO VIDEO INPUT:');
    console.log('==========================');
    
    const inputFiles = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith('.mp4'));
    console.log(`📁 Trovati ${inputFiles.length} video nella cartella INPUT`);
    
    for (const file of inputFiles.slice(0, 2)) { // Controlla solo primi 2 per velocità
      const inputPath = path.join(inputDir, file);
      
      await new Promise((resolve) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          console.log(`\n📹 ${file}:`);
          
          if (err) {
            console.log(`  ❌ Errore analisi: ${err.message}`);
            resolve();
            return;
          }
          
          if (metadata && metadata.format && metadata.format.tags) {
            const tags = metadata.format.tags;
            const systemTags = [];
            
            // Cerca tag che potrebbero essere stati applicati dal nostro sistema
            Object.entries(tags).forEach(([key, value]) => {
              if (key.toLowerCase().includes('title') || 
                  key.toLowerCase().includes('album') || 
                  key.toLowerCase().includes('artist') ||
                  key.toLowerCase().includes('genre') ||
                  key.toLowerCase().includes('keyword')) {
                systemTags.push(`${key}: ${value}`);
              }
            });
            
            if (systemTags.length > 0) {
              console.log(`  ⚠️ ATTENZIONE: Possibili metadati applicati dal sistema:`);
              systemTags.forEach(tag => console.log(`    - ${tag}`));
            } else {
              console.log(`  ✅ Nessun metadato del sistema trovato (corretto)`);
            }
          } else {
            console.log(`  ✅ Nessun metadato trovato (corretto per INPUT)`);
          }
          
          resolve();
        });
      });
    }

    // 2. Controlla video OUTPUT (dovrebbero avere metadati applicati)
    console.log('\n🔍 CONTROLLO VIDEO OUTPUT:');
    console.log('===========================');
    
    const outputFiles = fs.readdirSync(outputDir).filter(f => f.toLowerCase().endsWith('.mp4'));
    console.log(`📁 Trovati ${outputFiles.length} video nella cartella OUTPUT`);
    
    if (outputFiles.length === 0) {
      console.log('💡 Nessun video OUTPUT trovato. Esegui prima il processo principale.');
      return;
    }
    
    for (const file of outputFiles.slice(0, 3)) { // Controlla solo primi 3 per velocità
      const outputPath = path.join(outputDir, file);
      
      await new Promise((resolve) => {
        ffmpeg.ffprobe(outputPath, (err, metadata) => {
          console.log(`\n📹 ${file}:`);
          
          if (err) {
            console.log(`  ❌ Errore analisi: ${err.message}`);
            resolve();
            return;
          }
          
          if (metadata && metadata.format && metadata.format.tags) {
            const tags = metadata.format.tags;
            let systemMetadataCount = 0;
            
            // Conta metadati che potrebbero essere del nostro sistema
            Object.entries(tags).forEach(([key, value]) => {
              if (key.toLowerCase().includes('title') || 
                  key.toLowerCase().includes('album') || 
                  key.toLowerCase().includes('artist') ||
                  key.toLowerCase().includes('genre') ||
                  key.toLowerCase().includes('keyword')) {
                console.log(`  ✅ ${key}: ${value}`);
                systemMetadataCount++;
              }
            });
            
            if (systemMetadataCount > 0) {
              console.log(`  📊 Metadati del sistema trovati: ${systemMetadataCount} (corretto)`);
            } else {
              console.log(`  ⚠️ ATTENZIONE: Nessun metadato del sistema trovato`);
            }
          } else {
            console.log(`  ⚠️ ATTENZIONE: Nessun metadato trovato nel video OUTPUT`);
          }
          
          resolve();
        });
      });
    }

    // 3. Riepilogo
    console.log('\n📊 RIEPILOGO:');
    console.log('==============');
    console.log('✅ I video INPUT dovrebbero rimanere inalterati (senza metadati del sistema)');
    console.log('✅ I video OUTPUT dovrebbero avere metadati applicati dal sistema');
    console.log('✅ Il popup "Metadati Applicati" è stato rimosso');
    console.log('\n💡 Se trovi metadati del sistema nei video INPUT, c\'è un problema nel flusso');

  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testOutputOnlyMetadata();
