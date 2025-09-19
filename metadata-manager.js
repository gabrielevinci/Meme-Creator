const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegStatic);

// MAPPATURA METADATI MP4 CORRETTA PER WINDOWS FFMPEG
// Basata sulla documentazione di music-metadata e iTunes standard
const TAG_MAP = {
  // Basic Info - Formato iTunes/MP4 CORRETTO
  'title': '©nam',          // Titolo del video (©NAM in iTunes)
  'Title': '©nam',          // Titolo del video (versione Title Case)
  'artist': '©ART',         // Artista/creatore (©ART in iTunes)
  'Artist': '©ART',         // Artista/creatore (versione Title Case)
  'album': '©alb',          // Album/collezione (©ALB in iTunes)
  'Album': '©alb',          // Album/collezione (versione Title Case)
  'genre': '©gen',          // Genere (©GEN in iTunes)
  'Genre': '©gen',          // Genere (versione Title Case)
  'keywords': 'keyw',       // Parole chiave (KEYW in iTunes)
  'comment': '©cmt',        // Commento (©CMT in iTunes)
  'Commenti': '©cmt',       // Commento (versione italiana Title Case)
  'date': '©day',           // Data (©DAY in iTunes)
  'Data di creazione': '©day', // Data (versione italiana Title Case)
  'composer': '©wrt',       // Compositore (©WRT in iTunes)
  'Composer': '©wrt',       // Compositore (versione Title Case)
  
  // Metadati aggiuntivi MP4/iTunes
  'album_artist': 'aART',   // Album artist (aART)
  'Album artist': 'aART',   // Album artist (versione Title Case)
  'sort_name': 'sonm',      // Title sort (sonm)
  'sort_artist': 'soar',    // Artist sort (soar)  
  'sort_album': 'soal',     // Album sort (soal)
  'sort_album_artist': 'soaa', // Album artist sort (soaa)
  'description': 'desc',    // Descrizione (desc)
  'copyright': 'cprt',      // Copyright (cprt)
  'encoder': '©too',        // Encoder tool (©TOO)
  'Encoder tool': '©too',   // Encoder tool (versione Title Case)
  'Encoded by': '©enc',     // Encoded by (©ENC)
  'grouping': '©grp',       // Raggruppamento (©GRP)
  
  // Campi specializzati per video/TV
  'Show': 'tvsh',           // Show/Serie TV
  'HD Video': 'hdvd',       // HD Video flag
  'Sottotitolo': '©nam',    // Sottotitolo (usa stesso tag del titolo)
  'Tag': 'keyw',            // Tag (usa keyword)
  'Umore': '©grp',          // Umore (usa grouping)
  'Director': '©dir',       // Regista
  'Producer': '©prd',       // Produttore
  'Studio': '©stu',         // Studio
  'Editore': '©pub',        // Editore
  'Provider di contenuti': '©src' // Provider contenuti
};

// FORMATTAZIONE SEMPLIFICATA PER COMPATIBILITÀ MP4/WINDOWS
function formatMetadataValue(tagKey, value) {
  // Conversione semplice del valore in stringa, rimuovendo caratteri problematici
  const cleanValue = String(value)
    .replace(/"/g, '')         // Rimuovi virgolette
    .replace(/\\/g, '')        // Rimuovi backslash
    .replace(/\n/g, ' ')       // Converti newline in spazio
    .replace(/\r/g, '')        // Rimuovi carriage return
    .trim();                   // Rimuovi spazi extra
  
  console.log(`  📝 Formattazione: ${tagKey} = "${cleanValue}"`);
  return cleanValue;
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
      .replace(/[<>:"/\\|?*#]/g, '_')  // Caratteri non validi -> underscore (incluso #)
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
