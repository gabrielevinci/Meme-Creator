const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

ffmpeg.setFfmpegPath(ffmpegStatic);
const execAsync = promisify(exec);

// MAPPATURA V4 (FINALE ASSOLUTA) - Basata al 100% sul file di esempio funzionante
// Identica alla mappatura TAG_MAP del tuo script Python V4.py
const TAG_MAP = {
    // Basic Info
    'Title': '\xa9nam',
    'Artist': '\xa9ART',
    'Composer': '\xa9wrt',
    'Album': '\xa9alb',
    'Album artist': 'aART',
    'Genre': '\xa9gen',
    'Grouping': '\xa9grp',
    'Copyright': 'cprt',
    'Commenti': '\xa9cmt',
    'Data di creazione': '\xa9day',

    // Video Info
    'Show': 'tvsh',
    'TV Network': 'tvnn',
    'Season number': 'tvsn',
    'Episode number': 'tves',
    'HD Video': 'hdvd',

    // Dettagli Tecnici e Contenuto
    'Encoded by': '\xa9enc',
    'Encoder tool': '\xa9too',
    'Sottotitolo': '----:com.apple.iTunes:SUBTITLE',
    'Classificazione (esplicito)': '----:com.apple.iTunes:Rating',
    'Motivo classificazione': '----:com.apple.iTunes:Rating Annotation',
    'Tag': '----:com.apple.iTunes:keywords',
    'Umore': '----:com.apple.iTunes:MOOD',
    'Chiave iniziale': '----:com.apple.iTunes:initialkey',
    'Protetto': '----:com.apple.iTunes:isprotected',

    // Crediti e Distribuzione (con chiavi esatte dall'esempio)
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
    'URL autore': '----:com.apple.iTunes:artist_url',
    'URL di promozione': '----:com.apple.iTunes:promotion_url',

    // Ordinamento (Sort Order)
    'Title sort order': 'sonm',
    'Artist sort order': 'soar',
    'Album sort order': 'soal',
    'Album artist sort order': 'soaa',
    'Composer sort order': 'soco',
    'Show sort order': 'sosn',
};

class MetadataManagerV4 {
    constructor() {
        this.tempSuffix = '.metadata_temp.mp4';
    }

    /**
     * Pulisce tutti i metadati esistenti dal video MP4
     * @param {string} videoPath - Path del video MP4
     * @returns {Object} - {success: boolean, cleanedPath?: string, error?: string}
     */
    async clearMetadata(videoPath) {
        try {
            console.log(`🧹 Inizio pulizia metadati per: ${path.basename(videoPath)}`);
            
            const outputPath = videoPath.replace('.mp4', '_clean.mp4');
            const tempPath = outputPath + this.tempSuffix;
            
            // Comando FFmpeg per rimuovere tutti i metadati
            const ffmpegCommand = `"${ffmpegStatic}" -i "${videoPath}" -map_metadata -1 -c copy "${tempPath}"`;
            
            console.log(`🔧 Eseguendo: ${ffmpegCommand}`);
            
            try {
                const { stdout, stderr } = await execAsync(ffmpegCommand);
                if (stderr) {
                    console.log('📄 FFmpeg stderr:', stderr);
                }
                console.log('✅ Pulizia metadati completata');
            } catch (ffmpegError) {
                console.error('❌ Errore FFmpeg pulizia:', ffmpegError);
                throw new Error(`Errore pulizia metadati: ${ffmpegError.message}`);
            }
            
            // Sostituisci file originale con quello pulito
            if (fs.existsSync(tempPath)) {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                fs.renameSync(tempPath, outputPath);
                console.log(`✅ Metadati rimossi: ${path.basename(outputPath)}`);
                
                return { success: true, cleanedPath: outputPath };
            } else {
                throw new Error('File temporaneo non trovato dopo pulizia');
            }
            
        } catch (error) {
            console.error('❌ Errore pulizia metadati:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Punto di ingresso principale: applica metadati MP4 seguendo logica Python V4
     * @param {string} videoPath - Path del video MP4
     * @param {Object} apiData - Dati dall'AI con struttura {title, metadata}
     * @param {boolean} clearFirst - Se true, pulisce metadati esistenti prima di applicare quelli nuovi
     * @returns {Object} - {success: boolean, newPath?: string, error?: string}
     */
    async applyMetadataToVideo(videoPath, apiData, clearFirst = false) {
        try {
            console.log(`📝 Inizio applicazione metadati V4 per: ${path.basename(videoPath)}`);
            console.log(`🏷️ Titolo da API: ${apiData.title || 'Non specificato'}`);
            console.log(`🧹 Pulizia metadati precedenti: ${clearFirst ? 'Sì' : 'No'}`);

            let currentVideoPath = videoPath;

            // FASE 1: Pulizia metadati esistenti se richiesta
            if (clearFirst) {
                console.log(`🧹 Pulizia metadati esistenti prima di applicare quelli nuovi...`);
                const cleanResult = await this.clearMetadata(currentVideoPath);
                if (!cleanResult.success) {
                    throw new Error(`Errore pulizia metadati: ${cleanResult.error}`);
                }
                currentVideoPath = cleanResult.cleanedPath;
                console.log(`✅ Metadati esistenti puliti: ${path.basename(currentVideoPath)}`);
            }

            // FASE 2: Applicazione nuovi metadati
            const metadata = apiData.metadata || {};
            console.log(`📊 Metadati ricevuti: ${Object.keys(metadata).length}`);

            // Verifica se ci sono metadati da applicare
            if (Object.keys(metadata).length === 0) {
                console.log(`⚠️ Nessun metadato fornito, procedo solo con la rinominazione`);
            } else {
                // Applica metadati usando la logica Python V4
                const result = await this.applyMetadataToFile(currentVideoPath, metadata);
                if (!result) {
                    throw new Error('Fallita applicazione metadati');
                }
                console.log(`✅ Metadati applicati con successo`);
            }

            // FASE 3: Rinomina file basandosi sul titolo
            const newPath = await this.renameFile(currentVideoPath, apiData.title);
            console.log(`📝 File processato: ${path.basename(newPath)}`);

            return { success: true, newPath };
        } catch (error) {
            console.error('❌ Errore applicazione metadati V4:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Applica metadati al file seguendo la logica esatta del Python V4
     * Replica: apply_metadata_to_file(file_path, metadata)
     */
    async applyMetadataToFile(filePath, metadata) {
        try {
            console.log(`\n📝 === PROCESSO IDENTICO AL PYTHON V4.py ===`);
            console.log(`📁 File: ${path.basename(filePath)}`);

            let validMetadataCount = 0;
            const metadataToApply = {};

            // FASE 1: Validazione e preparazione metadati (identica al Python)
            for (const [key, value] of Object.entries(metadata)) {
                if (!(key in TAG_MAP)) {
                    console.log(`  ⚠️ Attenzione: Indice '${key}' in Excel non riconosciuto, verrà ignorato.`);
                    continue;
                }

                const tag_key = TAG_MAP[key];
                console.log(`  📋 Preparando: ${key} (${tag_key}) = "${value}"`);

                // --- Logica di Formattazione Specifica Basata sull'Analisi (identica al Python) ---
                let data_to_write;

                if (tag_key === '----:com.apple.iTunes:Rating') {
                    // Il software scrive '255' per esplicito. Lo replichiamo.
                    data_to_write = ['sì', 'si', 'yes', 'explicit', 'true', '1'].includes(String(value).toLowerCase()) ? '255' : '0';
                    console.log(`    🔞 Rating esplicito: "${value}" → "${data_to_write}"`);
                } else if (tag_key === '\xa9day') {
                    data_to_write = String(value).toLowerCase() === 'now' ? new Date().toISOString().split('T')[0] : String(value);
                    console.log(`    📅 Data: "${value}" → "${data_to_write}"`);
                } else if (['tvsn', 'tves'].includes(tag_key)) {
                    // Season e Episode Number devono essere interi
                    const intValue = parseInt(value);
                    if (isNaN(intValue)) {
                        console.log(`    ⚠️ Valore non numerico per ${key}, ignorato`);
                        continue;
                    }
                    data_to_write = intValue;
                    console.log(`    🔢 Numero (${key}): "${value}" → ${data_to_write}`);
                } else if (tag_key === 'hdvd') {
                    // HD Video flag (0 o 1)
                    const hdFlag = ['true', '1', 'sì', 'si', 'yes'].includes(String(value).toLowerCase()) ? 1 : 0;
                    data_to_write = hdFlag;
                    console.log(`    📺 HD Video: "${value}" → ${data_to_write}`);
                } else {
                    // Tutti gli altri tag (standard e personalizzati iTunes)
                    data_to_write = String(value);
                    console.log(`    📝 Standard: "${value}" → "${data_to_write}"`);
                }

                metadataToApply[tag_key] = data_to_write;
                validMetadataCount++;
            }

            if (validMetadataCount === 0) {
                console.log(`⚠️ Nessun metadato valido trovato da applicare`);
                return true; // Non è un errore, semplicemente non ci sono metadati
            }

            console.log(`📊 Totale metadati da applicare: ${validMetadataCount} (come nel Python)`);

            // FASE 2: Applicazione metadati usando FFmpeg (equivalente a video.save())
            return await this.writeMetadataWithFFmpeg(filePath, metadataToApply);

        } catch (error) {
            console.error(`❌ ERRORE CRITICO durante l'elaborazione. Dettagli: ${error.message}`);
            return false;
        }
    }

    /**
     * Scrive metadati usando FFmpeg con logica compatibile Python V4
     * Equivalente a: video.save() in Python
     */
    async writeMetadataWithFFmpeg(videoPath, metadataMap) {
        return new Promise((resolve, reject) => {
            const tempPath = videoPath + this.tempSuffix;
            let command = ffmpeg(videoPath);

            console.log(`🎬 Avvio processo FFmpeg (equivalente a video.save())...`);

            // Applica ogni metadato con la formattazione corretta
            for (const [tag_key, data_to_write] of Object.entries(metadataMap)) {
                if (tag_key.startsWith('----')) {
                    // Tag personalizzati iTunes - formato speciale
                    console.log(`    📋 iTunes custom: ${tag_key} = "${data_to_write}"`);
                    command = command.outputOptions('-metadata', `${tag_key}=${data_to_write}`);
                } else if (['tvsn', 'tves', 'hdvd'].includes(tag_key)) {
                    // Numeri integer per Season/Episode/HD Video
                    console.log(`    🔢 Integer: ${tag_key} = ${data_to_write}`);
                    command = command.outputOptions('-metadata', `${tag_key}=${data_to_write}`);
                } else {
                    // Tag standard MP4
                    console.log(`    📝 Standard: ${tag_key} = "${data_to_write}"`);
                    command = command.outputOptions('-metadata', `${tag_key}=${data_to_write}`);
                }
            }

            // Configurazione per preservare qualità e massimizzare compatibilità metadati
            command = command
                .outputOptions('-c', 'copy') // Non ricodificare (preserva qualità)
                .outputOptions('-map_metadata', '0') // Mantieni metadati esistenti
                .outputOptions('-movflags', 'use_metadata_tags') // Forza scrittura tag MP4 
                .outputOptions('-f', 'mp4') // Formato MP4 esplicito
                .output(tempPath);

            command
                .on('start', (commandLine) => {
                    console.log(`🔄 Comando FFmpeg avviato (simulando video.save())`);
                })
                .on('progress', (progress) => {
                    if (progress.percent && progress.percent > 0) {
                        console.log(`⏳ Progresso: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', async() => {
                    try {
                        console.log(`✅ Metadati scritti nel file temporaneo`);

                        // Sostituisci file originale (equivalente definitivo a video.save())
                        await this.safeFileReplace(tempPath, videoPath);
                        console.log(`✅ File salvato con successo (equivalente a video.save())`);

                        resolve(true);
                    } catch (replaceError) {
                        console.error(`❌ Errore sostituzione file:`, replaceError);
                        this.cleanupTempFile(tempPath);
                        reject(replaceError);
                    }
                })
                .on('error', (err) => {
                    console.error(`❌ ERRORE CRITICO FFmpeg:`, err);
                    this.cleanupTempFile(tempPath);
                    reject(err);
                })
                .run();
        });
    }

    /**
     * Sostituzione sicura del file originale
     * Equivalente al comportamento di video.save() del Python
     */
    async safeFileReplace(tempPath, originalPath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!fs.existsSync(tempPath)) {
                    throw new Error(`File temporaneo non trovato: ${tempPath}`);
                }

                // Verifica che il file temporaneo sia valido (non vuoto)
                const tempStats = fs.statSync(tempPath);
                if (tempStats.size === 0) {
                    throw new Error('File temporaneo vuoto, processo fallito');
                }

                // Backup del file originale (sicurezza extra)
                const backupPath = originalPath + '.backup';
                if (fs.existsSync(originalPath)) {
                    fs.copyFileSync(originalPath, backupPath);
                }

                // Sostituisci file originale
                fs.renameSync(tempPath, originalPath);

                // Rimuovi backup se tutto è andato bene
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath);
                }

                console.log(`✅ File sostituito con successo al tentativo ${attempt}`);
                return;

            } catch (err) {
                console.log(`⚠️ Tentativo sostituzione ${attempt}/${maxRetries} fallito:`, err.message);

                if (attempt < maxRetries) {
                    const delay = attempt * 1000; // 1s, 2s, 3s
                    console.log(`🔄 Attendo ${delay}ms prima del prossimo tentativo...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Ultimo tentativo: strategia copia + elimina
                try {
                    const tempContent = fs.readFileSync(tempPath);
                    fs.writeFileSync(originalPath, tempContent);
                    fs.unlinkSync(tempPath);
                    console.log(`✅ Fallback copia+elimina riuscito`);
                    return;
                } catch (fallbackErr) {
                    throw new Error(`Impossibile sostituire file dopo ${maxRetries} tentativi: ${err.message}`);
                }
            }
        }
    }

    /**
     * Rinomina file basandosi sul titolo
     * Comportamento identico al sistema esistente
     */
    async renameFile(currentPath, newTitle) {
        if (!newTitle || newTitle.trim() === '') {
            console.log(`⚠️ Titolo vuoto, file non rinominato`);
            return currentPath;
        }

        const dir = path.dirname(currentPath);
        const ext = path.extname(currentPath);

        // Sanifica il titolo per renderlo compatibile con filesystem
        const sanitizedTitle = newTitle
            .replace(/[<>:"/\\|?*]/g, '_') // Caratteri non validi → underscore
            .replace(/\s+/g, ' ') // Spazi multipli → singolo spazio
            .trim() // Rimuovi spazi iniziali/finali
            .substring(0, 200); // Limita lunghezza

        const newPath = path.join(dir, `${sanitizedTitle}${ext}`);

        if (currentPath !== newPath) {
            try {
                // Gestisci conflitti di nome
                let finalPath = newPath;
                if (fs.existsSync(newPath) && newPath !== currentPath) {
                    const timestamp = Date.now();
                    finalPath = path.join(dir, `${sanitizedTitle}_${timestamp}${ext}`);
                    console.log(`⚠️ File esistente, uso timestamp: ${path.basename(finalPath)}`);
                }

                fs.renameSync(currentPath, finalPath);
                console.log(`📝 File rinominato: ${path.basename(finalPath)}`);
                return finalPath;

            } catch (error) {
                console.error(`❌ Errore rinominazione file:`, error);
                console.log(`⚠️ Mantengo nome originale: ${path.basename(currentPath)}`);
                return currentPath;
            }
        } else {
            console.log(`ℹ️ Nome file già corretto`);
            return currentPath;
        }
    }

    /**
     * Pulizia file temporaneo
     */
    cleanupTempFile(tempPath) {
        try {
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
                console.log(`🗑️ File temporaneo pulito: ${path.basename(tempPath)}`);
            }
        } catch (cleanupErr) {
            console.error(`❌ Errore pulizia file temporaneo:`, cleanupErr);
        }
    }

    /**
     * Verifica metadati applicati (per debug)
     */
    async verifyAppliedMetadata(videoPath) {
        return new Promise((resolve) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    console.log(`⚠️ Verifica metadati fallita: ${err.message}`);
                    resolve(false);
                    return;
                }

                console.log(`🔍 VERIFICA METADATI V4 APPLICATI:`);
                if (metadata && metadata.format && metadata.format.tags) {
                    const appliedTags = metadata.format.tags;
                    let tagCount = 0;

                    Object.entries(appliedTags).forEach(([key, value]) => {
                        console.log(`  ✓ ${key}: "${value}"`);
                        tagCount++;
                    });

                    console.log(`📊 Totale tag V4 applicati: ${tagCount}`);
                    resolve(true);
                } else {
                    console.log(`⚠️ Nessun metadato trovato nel file`);
                    resolve(false);
                }
            });
        });
    }
}

// Esporta singleton
module.exports = new MetadataManagerV4();