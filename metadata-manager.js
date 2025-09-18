const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);

// MAPPATURA METADATI MP4 (V6 FINALE ASSOLUTA - COMPATIBILITA' FFMPEG)
// Mappatura identica al codice Python funzionante ma con escape per ffmpeg
const TAG_MAP = {
  // Basic Info - Usa formato compatibile con ffmpeg Windows
  'Title': 'title', 'Artist': 'artist', 'Composer': 'composer',
  'Album': 'album', 'Album artist': 'album_artist', 'Genre': 'genre',
  'Grouping': 'grouping', 'Copyright': 'copyright', 'Commenti': 'comment',
  'Data di creazione': 'date',
  
  // Video Info
  'Show': 'show', 'TV Network': 'network', 'Season number': 'season_number',
  'Episode number': 'episode_id', 'HD Video': 'hd_video',
  
  // Dettagli Tecnici e Contenuto
  'Encoded by': 'encoded_by', 'Encoder tool': 'encoder',
  'Sottotitolo': 'description',
  'Classificazione (esplicito)': 'content_rating',
  'Motivo classificazione': 'rating_reason',
  'Tag': 'keywords',
  'Umore': 'mood',
  'Chiave iniziale': 'initial_key',
  'Protetto': 'gapless_playback',

  // Crediti e Distribuzione - Usa metadati standard quando possibile
  'Director': 'director',
  'Director of photography': 'director_of_photography',
  'Sound engineer': 'sound_engineer',
  'Art director': 'art_director',
  'Production designer': 'production_designer',
  'Choreographer': 'choreographer',
  'Costume designer': 'costume_designer',
  'Writer': 'writer',
  'Screenwriter': 'screenwriter',
  'Editor': 'editor',
  'Producer': 'producer',
  'Co-producer': 'co_producer',
  'Executive producer': 'executive_producer',
  'Distributed by': 'publisher',
  'Studio': 'label',
  'Editore': 'publisher',
  'Provider di contenuti': 'content_provider',
  'Conduttori': 'conductor',
  'URL autore': 'artist_url',
  'URL di promozione': 'promotion_url',
  
  // Ordinamento (Sort Order) - Versione compatibile
  'Title sort order': 'sort_name', 'Artist sort order': 'sort_artist', 'Album sort order': 'sort_album',
  'Album artist sort order': 'sort_album_artist', 'Composer sort order': 'sort_composer', 'Show sort order': 'sort_show'
};

// LOGICHE DI FORMATTAZIONE SPECIFICHE (COMPATIBILI CON FFMPEG WINDOWS)
function formatMetadataValue(tagKey, value) {
  // --- Logica di Formattazione Specifica per FFmpeg ---
  
  if (tagKey === 'content_rating') {
    // Rating esplicito: 255 per esplicito, 0 per no
    return ['sì', 'si', 'yes', 'explicit'].includes(String(value).toLowerCase()) ? '255' : '0';
  }
  
  if (tagKey === 'date') {
    // Data corrente o valore specifico
    return String(value).toLowerCase() === 'now' ? 
      new Date().toISOString().split('T')[0] : String(value);
  }
  
  if (['season_number', 'episode_id'].includes(tagKey)) {
    // Season e Episode Number devono essere interi
    return parseInt(value) || 0;
  }
  
  if (tagKey === 'hd_video') {
    // HD Video flag (0 o 1)
    return ['true', '1', 'sì', 'si', 'yes'].includes(String(value).toLowerCase()) ? 1 : 0;
  }
  
  if (tagKey === 'gapless_playback') {
    // Protetto (boolean)
    return ['true', '1', 'sì', 'si', 'yes'].includes(String(value).toLowerCase()) ? 'true' : 'false';
  }
  
  // Tutti gli altri tag - escape caratteri speciali per ffmpeg
  return String(value).replace(/"/g, '\\"');
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

      // Debug: mostra tutti i metadati ricevuti
      if (apiData.metadata && Object.keys(apiData.metadata).length > 0) {
        console.log(`🔍 DETTAGLIO METADATI RICEVUTI:`);
        Object.entries(apiData.metadata).forEach(([key, value]) => {
          const mapped = TAG_MAP[key] ? `✓ (${TAG_MAP[key]})` : '✗ (non mappato)';
          console.log(`  - ${key}: "${value}" ${mapped}`);
        });
      }

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
      
      console.log(`🔄 Processo metadati IDENTICO al Python V4.py`);
      console.log(`📁 File: ${path.basename(videoPath)}`);
      
      let metadataApplied = 0;
      let appliedMetadata = [];

      // PROCESSO IDENTICO AL PYTHON: per ogni metadato nel dizionario
      Object.entries(metadata).forEach(([key, value]) => {
        if (!(key in TAG_MAP)) {
          console.log(`  ⚠️ Attenzione: Indice '${key}' non riconosciuto, verrà ignorato.`);
          return; // continue nel Python
        }

        const tag_key = TAG_MAP[key];

        // LOGICA DI FORMATTAZIONE COMPATIBILE CON FFMPEG WINDOWS
        const data_to_write = formatMetadataValue(tag_key, value);

        console.log(`📋 Applicando: ${key} (${tag_key}) = "${data_to_write}"`);
        
        // Applica metadato con formato semplice compatibile FFmpeg
        command = command.outputOptions('-metadata', `${tag_key}=${data_to_write}`);
        
        appliedMetadata.push({ key, tag_key, value: data_to_write });
        metadataApplied++;
      });

      if (metadataApplied === 0) {
        console.log(`⚠️ Nessun metadato valido trovato da applicare`);
        resolve();
        return;
      }

      console.log(`📊 Totale metadati da applicare: ${metadataApplied} (come nel Python)`);
      
      // Configurazione ffmpeg per massima compatibilità con metadati MP4
      // Equivalente al video.save() del Python
      command = command
        .outputOptions('-c', 'copy')                    // Non ricodificare
        .outputOptions('-map_metadata', '0')            // Preserva metadati esistenti
        .outputOptions('-movflags', 'use_metadata_tags') // Forza scrittura tag MP4
        .outputOptions('-f', 'mp4')                     // Formato MP4 esplicito
        .output(tempPath);

      command
        .on('start', (commandLine) => {
          console.log(`🎬 Avvio processo metadati (stile Python mutagen)...`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Progresso: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`✅ Metadati applicati, sostituisco file originale (come video.save())`);
          // Equivalente al video.save() del Python
          this.safeRenameFile(tempPath, videoPath)
            .then(async () => {
              console.log(`✅ File salvato con successo (equivalente a video.save())`);
              
              // Verifica metadati applicati (per debug)
              try {
                await this.verifyMetadata(videoPath);
              } catch (verifyErr) {
                console.log(`⚠️ Verifica metadati fallita: ${verifyErr.message}`);
              }
              
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
          console.error(`❌ ERRORE CRITICO durante l'elaborazione. Dettagli:`, err);
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

  // NUOVO: Verifica metadati applicati (per debug)
  async verifyMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`🔍 VERIFICA METADATI APPLICATI:`);
        if (metadata && metadata.format && metadata.format.tags) {
          const appliedTags = metadata.format.tags;
          let tagCount = 0;
          
          Object.entries(appliedTags).forEach(([key, value]) => {
            console.log(`  ✓ ${key}: "${value}"`);
            tagCount++;
          });
          
          console.log(`📊 Totale tag applicati: ${tagCount}`);
        } else {
          console.log(`⚠️ Nessun metadato trovato nel file`);
        }
        
        resolve();
      });
    });
  }
}

// Esporta singleton
module.exports = new MetadataManager();
