const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);

// MAPPATURA METADATI MP4 (OBBLIGATORIA)
// Basata su mutagen Python per tag MP4
const TAG_MAP = {
  // Basic Info
  'Title': '©nam', 'Artist': '©ART', 'Composer': '©wrt',
  'Album': '©alb', 'Album artist': 'aART', 'Genre': '©gen',
  'Grouping': '©grp', 'Copyright': 'cprt', 'Commenti': '©cmt',
  'Data di creazione': '©day',
  
  // Video Info
  'Show': 'tvsh', 'TV Network': 'tvnn', 'Season number': 'tvsn',
  'Episode number': 'tves', 'HD Video': 'hdvd',
  
  // Dettagli Tecnici
  'Encoded by': '©enc', 'Encoder tool': '©too',
  'Sottotitolo': '----:com.apple.iTunes:SUBTITLE',
  'Classificazione (esplicito)': '----:com.apple.iTunes:Rating',
  'Motivo classificazione': '----:com.apple.iTunes:Rating Annotation',
  'Tag': '----:com.apple.iTunes:keywords',
  'Umore': '----:com.apple.iTunes:MOOD',
  'Chiave iniziale': '----:com.apple.iTunes:initialkey',
  'Protetto': '----:com.apple.iTunes:isprotected',

  // Crediti Produzione
  'Director': '----:com.apple.iTunes:DIRECTOR',
  'Director of photography': '----:com.apple.iTunes:Director of Photography',
  'Sound engineer': '----:com.apple.iTunes:Sound Engineer',
  'Art director': '----:com.apple.iTunes:Art Director',
  'Production designer': '----:com.apple.iTunes:Production Designer',
  'Choreographer': '----:com.apple.iTunes:Choreographer',
  'Costume designer': '----:com.apple.iTunes:Costume Designer',
  'Writer': '----:com.apple.iTunes:Writer',
  'Screenwriter': '----:com.apple.iTunes:Screenwriters',
  'Editor': '----:com.apple.iTunes:Editors',
  'Producer': '----:com.apple.iTunes:PRODUCER',
  'Co-producer': '----:com.apple.iTunes:Co-Producer',
  'Executive producer': '----:com.apple.iTunes:Executive Producer',
  'Distributed by': '----:com.apple.iTunes:Distributed By',
  'Studio': '----:com.apple.iTunes:Studio',
  'Editore': '----:com.apple.iTunes:publisher',
  'Provider di contenuti': '----:com.apple.iTunes:content_provider',
  'Conduttori': '----:com.apple.iTunes:Conductor',
  
  // Sort Order
  'Title sort order': 'sonm', 'Artist sort order': 'soar', 'Album sort order': 'soal',
  'Album artist sort order': 'soaa', 'Composer sort order': 'soco', 'Show sort order': 'sosn'
};

// LOGICHE DI FORMATTAZIONE SPECIFICHE (CRITICHE)
function formatMetadataValue(tagKey, value) {
  // Rating esplicito
  if (tagKey === '----:com.apple.iTunes:Rating') {
    return ['sì', 'si', 'yes', 'explicit'].includes(String(value).toLowerCase()) ? '255' : '0';
  }
  
  // Data corrente
  if (tagKey === '©day' && String(value).toLowerCase() === 'now') {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Numeri interi per season/episode
  if (['tvsn', 'tves'].includes(tagKey)) {
    return parseInt(value) || 0;
  }
  
  // HD Video flag
  if (tagKey === 'hdvd') {
    return ['true', '1', 'sì', 'si', 'yes'].includes(String(value).toLowerCase()) ? '1' : '0';
  }
  
  // Tag personalizzati iTunes (per ffmpeg usiamo stringa normale)
  if (tagKey.startsWith('----')) {
    return String(value);
  }
  
  // Altri tag standard
  return String(value);
}

class MetadataManager {
  constructor() {
    this.tempSuffix = '.temp.mp4';
  }

  async applyMetadataToVideo(videoPath, apiData) {
    try {
      console.log(`📝 Inizio applicazione metadati per: ${path.basename(videoPath)}`);
      console.log(`🏷️ Titolo da API: ${apiData.title}`);
      console.log(`📊 Metadati ricevuti:`, Object.keys(apiData.metadata || {}).length);

      // 1. Applica metadati
      if (apiData.metadata && Object.keys(apiData.metadata).length > 0) {
        await this.writeMetadata(videoPath, apiData.metadata);
        console.log(`✅ Metadati applicati con successo`);
      } else {
        console.log(`⚠️ Nessun metadato da applicare`);
      }
      
      // 2. Rinomina file
      const newPath = await this.renameFile(videoPath, apiData.title);
      console.log(`📝 File rinominato: ${path.basename(newPath)}`);
      
      return { success: true, newPath };
    } catch (error) {
      console.error('❌ Errore applicazione metadati:', error);
      return { success: false, error: error.message };
    }
  }
  
  async writeMetadata(videoPath, metadata) {
    return new Promise((resolve, reject) => {
      const tempPath = videoPath + this.tempSuffix;
      let command = ffmpeg(videoPath);
      
      console.log(`🔄 Creazione file temporaneo: ${path.basename(tempPath)}`);
      
      let metadataApplied = 0;
      
      // Applica ogni metadato con la mappatura corretta
      Object.entries(metadata).forEach(([key, value]) => {
        if (TAG_MAP[key] && value !== null && value !== undefined && value !== '') {
          const tagKey = TAG_MAP[key];
          const formattedValue = formatMetadataValue(tagKey, value);
          
          console.log(`📋 Applicazione metadato: ${key} (${tagKey}) = "${formattedValue}"`);
          command = command.outputOptions('-metadata', `${tagKey}=${formattedValue}`);
          metadataApplied++;
        } else if (!TAG_MAP[key]) {
          console.log(`⚠️ Tag non mappato: ${key} - valore ignorato`);
        } else {
          console.log(`⚠️ Valore vuoto per: ${key} - ignorato`);
        }
      });
      
      if (metadataApplied === 0) {
        console.log(`⚠️ Nessun metadato valido trovato da applicare`);
        resolve();
        return;
      }
      
      console.log(`📊 Totale metadati da applicare: ${metadataApplied}`);
      
      // Copia stream senza ricodifica per preservare qualità
      command = command
        .outputOptions('-c', 'copy')
        .output(tempPath);
      
      command
        .on('start', (commandLine) => {
          console.log(`🎬 Avvio comando ffmpeg: ${commandLine.substring(0, 100)}...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Progresso metadati: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`✅ Metadati applicati, sostituisco file originale`);
          // Usa la funzione di rinominazione robusta
          this.safeRenameFile(tempPath, videoPath)
            .then(() => {
              console.log(`✅ File originale sostituito con successo`);
              resolve();
            })
            .catch((err) => {
              console.error(`❌ Errore nella sostituzione file:`, err);
              // Pulizia file temporaneo se la rinominazione fallisce
              if (fs.existsSync(tempPath)) {
                try {
                  fs.unlinkSync(tempPath);
                  console.log(`🗑️ File temporaneo pulito dopo errore rinominazione`);
                } catch (cleanupErr) {
                  console.error(`❌ Errore pulizia file temporaneo:`, cleanupErr);
                }
              }
              reject(err);
            });
        })
        .on('error', (err) => {
          console.error(`❌ Errore ffmpeg:`, err);
          // Pulizia file temporaneo in caso di errore
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
              console.log(`🗑️ File temporaneo pulito dopo errore`);
            } catch (cleanupErr) {
              console.error(`❌ Errore pulizia file temporaneo:`, cleanupErr);
            }
          }
          reject(err);
        })
        .run();
    });
  }
  
  async renameFile(currentPath, newTitle) {
    if (!newTitle || newTitle.trim() === '') {
      console.log(`⚠️ Titolo vuoto, file non rinominato`);
      return currentPath;
    }

    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath);
    
    // Sanifica il titolo per renderlo compatibile con filesystem
    const sanitizedTitle = newTitle
      .replace(/[<>:"/\\|?*]/g, '_')  // Caratteri non validi -> underscore
      .replace(/\s+/g, ' ')           // Spazi multipli -> singolo spazio
      .trim()                         // Rimuovi spazi iniziali/finali
      .substring(0, 200);             // Limita lunghezza per evitare errori filesystem
    
    const newPath = path.join(dir, `${sanitizedTitle}${ext}`);
    
    if (currentPath !== newPath) {
      try {
        // Verifica se il file di destinazione esiste già
        let finalPath = newPath;
        if (fs.existsSync(newPath)) {
          // Aggiungi timestamp per evitare conflitti
          const timestamp = Date.now();
          finalPath = path.join(dir, `${sanitizedTitle}_${timestamp}${ext}`);
          console.log(`⚠️ File esistente, uso timestamp: ${path.basename(finalPath)}`);
        }
        
        // Usa rinominazione sicura
        await this.safeRenameFile(currentPath, finalPath);
        console.log(`📝 File rinominato: ${path.basename(finalPath)}`);
        return finalPath;
        
      } catch (error) {
        console.error(`❌ Errore rinominazione file:`, error);
        console.log(`⚠️ Mantengo nome originale: ${path.basename(currentPath)}`);
        return currentPath;
      }
    } else {
      console.log(`ℹ️ Nome file già corretto, nessuna rinominazione necessaria`);
      return currentPath;
    }
  }

  // NUOVO: Rinominazione sicura con retry per gestire errori EPERM
  async safeRenameFile(sourcePath, destPath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Verifica che il file sorgente esista
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`File temporaneo non trovato: ${sourcePath}`);
        }

        // Prova la rinominazione
        fs.renameSync(sourcePath, destPath);
        console.log(`✅ Rinominazione riuscita al tentativo ${attempt}`);
        return;

      } catch (err) {
        console.log(`⚠️ Tentativo ${attempt}/${maxRetries} fallito:`, err.message);
        
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          if (attempt < maxRetries) {
            // Aspetta un po' prima del prossimo tentativo
            const delay = attempt * 500; // 500ms, 1s, 1.5s
            console.log(`🔄 Attendo ${delay}ms prima del prossimo tentativo...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // Se non è un errore di permessi o abbiamo esaurito i tentativi, proviamo una strategia alternativa
        if (attempt === maxRetries) {
          console.log(`🔄 Tentativo copia + elimina come fallback...`);
          try {
            // Strategia alternativa: copia + elimina
            const sourceContent = fs.readFileSync(sourcePath);
            fs.writeFileSync(destPath, sourceContent);
            fs.unlinkSync(sourcePath);
            console.log(`✅ Fallback copia+elimina riuscito`);
            return;
          } catch (fallbackErr) {
            console.error(`❌ Anche fallback fallito:`, fallbackErr.message);
            throw new Error(`Impossibile rinominare file dopo ${maxRetries} tentativi: ${err.message}`);
          }
        }
      }
    }
  }
}

// Esporta singleton
module.exports = new MetadataManager();
