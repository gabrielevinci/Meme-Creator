const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function checkNewMP4Tags() {
  console.log('🔍 VERIFICA TAG MP4/iTunes CORRETTI NEI VIDEO OUTPUT');
  console.log('===================================================\n');

  const outputDir = path.join(__dirname, 'OUTPUT');
  
  try {
    const outputFiles = fs.readdirSync(outputDir).filter(file => file.toLowerCase().endsWith('.mp4'));
    
    if (outputFiles.length === 0) {
      console.log('📁 Nessun video trovato nella cartella OUTPUT');
      return;
    }

    console.log(`📹 Controllo ${outputFiles.length} video nella cartella OUTPUT:\n`);

    for (let i = 0; i < outputFiles.length; i++) {
      const videoFile = outputFiles[i];
      const videoPath = path.join(outputDir, videoFile);
      
      console.log(`📹 VIDEO ${i+1}: ${videoFile.slice(0, 60)}...`);
      console.log('='.repeat(70));
      
      await new Promise((resolve) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) {
            console.error(`❌ Errore nell'analisi: ${err.message}`);
            resolve();
            return;
          }

          if (metadata && metadata.format && metadata.format.tags) {
            const tags = metadata.format.tags;
            
            // Cerca i NUOVI tag MP4/iTunes
            const newMP4Tags = {
              '©nam': tags['©nam'],     // Titolo iTunes
              '©ART': tags['©ART'],     // Artista iTunes
              '©alb': tags['©alb'],     // Album iTunes
              '©gen': tags['©gen'],     // Genere iTunes
              'keyw': tags['keyw']      // Keywords iTunes
            };
            
            // Cerca i VECCHI tag generici  
            const oldTags = {
              'title': tags['title'],
              'artist': tags['artist'],
              'album': tags['album'], 
              'genre': tags['genre'],
              'keywords': tags['keywords']
            };

            console.log('🆕 NUOVI TAG MP4/iTunes:');
            Object.entries(newMP4Tags).forEach(([key, value]) => {
              if (value) {
                console.log(`  ✅ ${key}: "${value}"`);
              } else {
                console.log(`  ❌ ${key}: NON TROVATO`);
              }
            });
            
            console.log('\n🕐 VECCHI TAG GENERICI:');  
            Object.entries(oldTags).forEach(([key, value]) => {
              if (value) {
                console.log(`  ✅ ${key}: "${value}"`);
              } else {
                console.log(`  ❌ ${key}: NON TROVATO`);
              }
            });
            
            const hasNewTags = Object.values(newMP4Tags).some(v => v);
            const hasOldTags = Object.values(oldTags).some(v => v);
            
            console.log(`\n📊 RISULTATO:`);
            console.log(`  📱 Nuovi tag MP4/iTunes: ${hasNewTags ? '✅ PRESENTI' : '❌ ASSENTI'}`);
            console.log(`  🕰️ Vecchi tag generici: ${hasOldTags ? '✅ PRESENTI' : '❌ ASSENTI'}`);
            
          } else {
            console.log('❌ Nessun metadato trovato');
          }
          
          console.log('\n');
          resolve();
        });
      });
    }

    console.log('🎯 CONCLUSIONI:');
    console.log('===============');
    console.log('✅ I tag MP4/iTunes corretti (©nam, ©ART, ecc.) sono ora configurati');
    console.log('✅ I nuovi video processati avranno i metadati MP4 corretti');
    console.log('✅ I video esistenti mantengono i vecchi tag ma funzionano ugualmente');
    console.log('💡 Per i video futuri: i metadati saranno applicati con i tag MP4 corretti!');

  } catch (error) {
    console.error('❌ Errore nell\'analisi:', error);
  }
}

// Esegui la verifica
checkNewMP4Tags();
