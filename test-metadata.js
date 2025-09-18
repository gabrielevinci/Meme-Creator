const MetadataManager = require('./metadata-manager');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

// Dati di test forniti dall'utente
const testApiData = {
  "description": "Un vasto campo erboso onde l'erba alta ondeggia leggermente nella brezza. Dietro il campo si estende una fitta foresta verde, punteggiata da alberi e cespugli. Lo sfondo è dominato da dolci colline e montagne all'orizzonte, con un cielo coperto da nuvole scure alternate a chiazze di luce dorata del sole che filtrano tra le nubi.",
  "matches_filter": 1,
  "banner_position": "bottom",
  "meme_text": "Io che penso di aver speso troppo in musica",
  "title": "Spotify Premium 2 anni 35 euro offerta imperdibile",
  "metadata": {
    "Title": "Meme Natura con Offerta Spotify",
    "Artist": "AI Meme Generator",
    "Composer": "",
    "Album": "Offerte Speciali Volume 1",
    "Album artist": "AI Meme Generator",
    "Genre": "Comedy",
    "Grouping": "Meme Promotion",
    "Copyright": "© AI Meme Generator 2024",
    "Commenti": "Meme per promuovere Spotify Premium",
    "Data di creazione": "2024-12-19",
    "Show": "Viral Memes",
    "TV Network": "Social Media",
    "Season number": 1,
    "Episode number": 1,
    "HD Video": false,
    "Encoded by": "AI Meme Generator",
    "Encoder tool": "Custom AI v1.0",
    "Sottotitolo": "Un'offerta musicale che non puoi perderti",
    "Classificazione (esplicito)": "No",
    "Motivo classificazione": "Contenuto a tema musicale e promozionale",
    "Tag": "spotify,premium,musica,offerta,streaming,meme,landscape,natura",
    "Umore": "Allegro",
    "Chiave iniziale": "",
    "Protetto": false,
    "Director": "AI Director",
    "Director of photography": "",
    "Sound engineer": "",
    "Art director": "AI Art Director",
    "Production designer": "",
    "Choreographer": "",
    "Costume designer": "",
    "Writer": "AI Writer",
    "Screenwriter": "AI Screenwriter",
    "Editor": "AI Editor",
    "Producer": "AI Producer",
    "Co-producer": "",
    "Executive producer": "AI Executive Producer",
    "Distributed by": "Social Media Platforms",
    "Studio": "AI Content Studio",
    "Editore": "Independent",
    "Provider di contenuti": "AI Content Provider",
    "Conduttori": "",
    "Title sort order": "Meme Natura con Offerta Spotify",
    "Artist sort order": "AI Meme Generator",
    "Album sort order": "Offerte Speciali Volume 1",
    "Album artist sort order": "AI Meme Generator",
    "Composer sort order": "",
    "Show sort order": "Viral Memes"
  }
};

async function findTestVideo() {
  const inputDir = path.join(__dirname, 'INPUT');
  const files = fs.readdirSync(inputDir).filter(file => file.toLowerCase().endsWith('.mp4'));
  
  if (files.length === 0) {
    throw new Error('Nessun file MP4 trovato nella cartella INPUT');
  }
  
  return path.join(inputDir, files[0]);
}

async function checkMetadataWithFFprobe(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('\n📊 METADATI ATTUALI NEL FILE:');
      console.log('=====================================');
      
      if (metadata && metadata.format && metadata.format.tags) {
        const tags = metadata.format.tags;
        const tagKeys = Object.keys(tags);
        
        console.log(`✅ Trovati ${tagKeys.length} metadati nel file:`);
        tagKeys.forEach(key => {
          console.log(`  - ${key}: "${tags[key]}"`);
        });
        
        resolve({
          found: true,
          count: tagKeys.length,
          tags: tags
        });
      } else {
        console.log('❌ NESSUN METADATO TROVATO NEL FILE');
        resolve({
          found: false,
          count: 0,
          tags: {}
        });
      }
    });
  });
}

async function runTest() {
  console.log('🧪 AVVIO TEST APPLICAZIONE METADATI');
  console.log('====================================\n');

  try {
    // 1. Trova un file di test
    const testVideoPath = await findTestVideo();
    console.log(`📁 File di test: ${path.basename(testVideoPath)}`);

    // 2. Verifica metadati PRIMA dell'applicazione
    console.log('\n🔍 VERIFICA METADATI PRIMA:');
    const beforeMetadata = await checkMetadataWithFFprobe(testVideoPath);

    // 3. Crea una copia per il test
    const testCopyPath = testVideoPath.replace('.mp4', '_TEST_METADATA.mp4');
    fs.copyFileSync(testVideoPath, testCopyPath);
    console.log(`📋 Copia creata: ${path.basename(testCopyPath)}`);

    // 4. Applica i metadati
    console.log('\n🚀 APPLICAZIONE METADATI:');
    console.log('==========================');
    const result = await MetadataManager.applyMetadataToVideo(testCopyPath, testApiData);
    
    if (result.success) {
      console.log('✅ Applicazione completata con successo');
    } else {
      console.log('❌ Errore nell\'applicazione:', result.error);
      return;
    }

    // 5. Verifica metadati DOPO l'applicazione
    console.log('\n🔍 VERIFICA METADATI DOPO:');
    const afterMetadata = await checkMetadataWithFFprobe(result.newPath || testCopyPath);

    // 6. Confronto risultati
    console.log('\n📈 CONFRONTO RISULTATI:');
    console.log('========================');
    console.log(`Metadati prima: ${beforeMetadata.count}`);
    console.log(`Metadati dopo: ${afterMetadata.count}`);
    console.log(`Differenza: +${afterMetadata.count - beforeMetadata.count}`);

    if (afterMetadata.count > beforeMetadata.count) {
      console.log('✅ SUCCESSO: Metadati applicati correttamente!');
    } else {
      console.log('❌ PROBLEMA: Nessun nuovo metadato applicato');
    }

    // 7. Verifica metadati specifici applicati
    console.log('\n🎯 VERIFICA METADATI SPECIFICI:');
    console.log('==============================');
    const expectedMetadata = testApiData.metadata;
    Object.entries(expectedMetadata).forEach(([key, expectedValue]) => {
      if (expectedValue && expectedValue !== '') {
        // Cerca il metadato nelle tags del file
        const found = Object.entries(afterMetadata.tags).find(([tagKey, tagValue]) => {
          return tagValue === String(expectedValue) || tagKey.includes(key.toLowerCase());
        });
        
        if (found) {
          console.log(`✅ ${key}: TROVATO (${found[0]} = "${found[1]}")`);
        } else {
          console.log(`❌ ${key}: NON TROVATO (valore atteso: "${expectedValue}")`);
        }
      }
    });

  } catch (error) {
    console.error('❌ ERRORE NEL TEST:', error);
  }
}

// Esegui il test
runTest();
