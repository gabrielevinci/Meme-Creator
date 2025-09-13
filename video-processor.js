const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

class VideoProcessor {
    constructor() {
        this.outputDir = path.join(__dirname, 'OUTPUT');
        this.tempDir = path.join(__dirname, 'temp_frames');
        this.ffmpegPath = this.findFFmpegPath();
    }

    // Aggiunto metodo per pulire tutte le cartelle all'inizio
    async cleanAllDirectories() {
        const directories = [this.tempDir, this.outputDir];

        for (const dir of directories) {
            try {
                await fs.access(dir);
                const files = await fs.readdir(dir);

                console.log(`🧹 Pulizia cartella: ${dir} (${files.length} file)`);

                for (const file of files) {
                    const filePath = path.join(dir, file);
                    try {
                        await fs.unlink(filePath);
                    } catch (error) {
                        console.log(`⚠️ Impossibile eliminare ${file}: ${error.message}`);
                        // Rinomina invece di eliminare se bloccato
                        const timestamp = Date.now();
                        const newPath = `${filePath}.old.${timestamp}`;
                        await fs.rename(filePath, newPath);
                        console.log(`🔄 File rinominato: ${file} -> ${file}.old.${timestamp}`);
                    }
                }
                console.log(`✅ Cartella ${path.basename(dir)} pulita`);
            } catch (error) {
                console.log(`📁 Creazione cartella: ${dir}`);
                await fs.mkdir(dir, { recursive: true });
            }
        }
    }

    // Nuovo metodo per pulire SOLO la cartella OUTPUT e temp_frames quando si preme Start
    async cleanOutputDirectoryOnly() {
        // Pulisci cartella OUTPUT
        const outputDir = this.outputDir;
        try {
            await fs.access(outputDir);
            const outputFiles = await fs.readdir(outputDir);

            console.log(`🧹 Pulizia cartella OUTPUT: ${outputDir} (${outputFiles.length} file)`);

            for (const file of outputFiles) {
                const filePath = path.join(outputDir, file);
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    console.log(`⚠️ Impossibile eliminare ${file}: ${error.message}`);
                    // Rinomina invece di eliminare se bloccato
                    const timestamp = Date.now();
                    const newPath = `${filePath}.old.${timestamp}`;
                    await fs.rename(filePath, newPath);
                    console.log(`🔄 File rinominato: ${file} -> ${file}.old.${timestamp}`);
                }
            }
            console.log(`✅ Cartella OUTPUT pulita`);
        } catch (error) {
            console.log(`📁 Creazione cartella OUTPUT: ${outputDir}`);
            await fs.mkdir(outputDir, { recursive: true });
        }

        // Pulisci cartella temp_frames
        const tempDir = this.tempDir;
        try {
            await fs.access(tempDir);
            const tempFiles = await fs.readdir(tempDir);

            console.log(`🧹 Pulizia cartella temp_frames: ${tempDir} (${tempFiles.length} file)`);

            for (const file of tempFiles) {
                const filePath = path.join(tempDir, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory()) {
                    // Se è una directory, eliminala ricorsivamente
                    await fs.rmdir(filePath, { recursive: true });
                    console.log(`📁 Directory eliminata: ${file}`);
                } else {
                    // Se è un file, eliminalo
                    try {
                        await fs.unlink(filePath);
                    } catch (error) {
                        console.log(`⚠️ Impossibile eliminare ${file}: ${error.message}`);
                        // Rinomina invece di eliminare se bloccato
                        const timestamp = Date.now();
                        const newPath = `${filePath}.old.${timestamp}`;
                        await fs.rename(filePath, newPath);
                        console.log(`🔄 File rinominato: ${file} -> ${file}.old.${timestamp}`);
                    }
                }
            }
            console.log(`✅ Cartella temp_frames pulita`);
        } catch (error) {
            console.log(`📁 Creazione cartella temp_frames: ${tempDir}`);
            await fs.mkdir(tempDir, { recursive: true });
        }
    }

    // Funzione helper per creare nome basato sul video
    generateVideoBasedName(videoName, suffix = '') {
        // Rimuovi estensione e caratteri speciali dal nome video
        const baseName = path.parse(videoName).name
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50); // Limita lunghezza

        return suffix ? `${baseName}_${suffix}` : baseName;
    }

    findFFmpegPath() {
        // Prova diversi percorsi per FFmpeg
        const possiblePaths = [
            'ffmpeg', // Se è nel PATH
            path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
            path.join(__dirname, 'ffmpeg', 'ffmpeg.exe'),
            'C:\\ffmpeg\\bin\\ffmpeg.exe'
        ];

        return possiblePaths[0]; // Per ora usa il primo, in futuro si può verificare quale esiste
    }

    async ensureTempDir() {
        try {
            await fs.access(this.tempDir);
        } catch (error) {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
    }

    async cleanTempDir() {
        try {
            // Prima prova eliminazione normale
            const files = await fs.readdir(this.tempDir);

            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                let deleted = false;

                // Prova 5 volte con delay crescente
                for (let retry = 0; retry < 5; retry++) {
                    try {
                        await fs.unlink(filePath);
                        deleted = true;
                        break;
                    } catch (fileError) {
                        // Attesa crescente: 100ms, 200ms, 500ms, 1s, 2s
                        const delay = Math.min(100 * Math.pow(2, retry), 2000);
                        await new Promise(resolve => setTimeout(resolve, delay));

                        if (retry === 4) {
                            console.log(`Impossibile eliminare ${file}:`, fileError.message);
                            // Come ultima risorsa, rinomina il file
                            try {
                                const timestamp = Date.now();
                                const newPath = `${filePath}.old.${timestamp}`;
                                await fs.rename(filePath, newPath);
                                console.log(`File rinominato: ${file} -> ${path.basename(newPath)}`);
                            } catch (renameError) {
                                console.log(`Impossibile anche rinominare ${file}:`, renameError.message);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log('Errore nella pulizia directory temporanea:', error.message);
        }
    }

    async extractFrames(videoPath, useCollage = false) {
        const videoName = path.basename(videoPath);
        const videoBaseName = this.generateVideoBasedName(videoName);

        console.log(`Estrazione frame da: ${videoPath}, Collage: ${useCollage}`);

        await this.ensureTempDir();

        try {
            // Ottieni la durata del video
            const duration = await this.getVideoDuration(videoPath);
            console.log(`Durata video: ${duration} secondi`);

            let frames = [];

            if (useCollage) {
                // Estrai 3 frame: 25%, 50%, 75%
                const timestamps = [
                    duration * 0.25,
                    duration * 0.50,
                    duration * 0.75
                ];

                for (let i = 0; i < timestamps.length; i++) {
                    const frameName = `${videoBaseName}_frame_${i + 1}.jpg`;
                    const framePath = await this.extractSingleFrame(videoPath, timestamps[i], frameName, videoName);
                    frames.push(framePath);
                }

                // Crea collage
                const collageName = `${videoBaseName}_collage.jpg`;
                const collagePath = await this.createCollage(frames, collageName);

                // NON eliminare i frame singoli - devono rimanere in temp_frames
                // for (const frame of frames) {
                //     await fs.unlink(frame).catch(() => {});
                // }

                return {
                    frames: [collagePath],
                    videoBaseName: videoBaseName,
                    originalVideoName: videoName
                };

            } else {
                // Estrai solo frame centrale (50%)
                const timestamp = duration * 0.50;
                const frameName = `${videoBaseName}_frame_center.jpg`;
                const framePath = await this.extractSingleFrame(videoPath, timestamp, frameName, videoName);

                return {
                    frames: [framePath],
                    videoBaseName: videoBaseName,
                    originalVideoName: videoName
                };
            }

        } catch (error) {
            console.error('Errore nell\'estrazione frame:', error);
            throw error;
        }
    }

    async getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'quiet',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
                videoPath
            ]);

            let output = '';
            let errorOutput = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    const duration = parseFloat(output.trim());
                    if (isNaN(duration) || duration <= 0) {
                        reject(new Error('Durata video non valida o video corrotto'));
                    } else {
                        resolve(duration);
                    }
                } else {
                    reject(new Error(`FFprobe failed: ${errorOutput || 'Errore sconosciuto'}`));
                }
            });

            ffprobe.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error('FFprobe non trovato. Assicurati che FFmpeg sia installato e nel PATH.'));
                } else {
                    reject(new Error(`Errore nell'esecuzione FFprobe: ${error.message}`));
                }
            });
        });
    }

    async extractSingleFrame(videoPath, timestamp, outputName, originalVideoName) {
        // Usa il nome basato sul video originale
        const outputPath = path.join(this.tempDir, outputName);

        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, [
                '-ss', timestamp.toString(),
                '-i', videoPath,
                '-vframes', '1',
                '-update', '1', // Flag necessario per sovrascrivere singoli file
                '-q:v', '2',
                '-y', // Overwrite output files
                outputPath
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let errorOutput = '';
            let timeoutId;

            // Timeout per evitare processi bloccati
            timeoutId = setTimeout(() => {
                ffmpeg.kill('SIGKILL');
                reject(new Error('Timeout: FFmpeg impiegava troppo tempo per estrarre il frame'));
            }, 30000); // 30 secondi timeout

            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpeg.on('close', async(code) => {
                clearTimeout(timeoutId);
                if (code === 0) {
                    try {
                        // Verifica che il file sia stato creato
                        await fs.access(outputPath);
                        // Comprimi l'immagine
                        const compressedPath = await this.compressImage(outputPath);
                        resolve(compressedPath);
                    } catch (error) {
                        reject(new Error(`Errore nella compressione: ${error.message}`));
                    }
                } else {
                    reject(new Error(`FFmpeg failed: ${errorOutput || 'Errore sconosciuto'}`));
                }
            });

            ffmpeg.on('error', (error) => {
                clearTimeout(timeoutId);
                if (error.code === 'ENOENT') {
                    reject(new Error('FFmpeg non trovato. Assicurati che FFmpeg sia installato e nel PATH.'));
                } else {
                    reject(new Error(`Errore nell'esecuzione FFmpeg: ${error.message}`));
                }
            });
        });
    }

    async createCollage(framePaths, outputName = null) {
        console.log('Creazione collage da:', framePaths);

        // Usa il nome fornito o genera uno di default
        const collageName = outputName || `collage_${Date.now()}.jpg`;
        const collagePath = path.join(this.tempDir, collageName);

        try {
            // Carica le immagini
            const images = [];
            for (const framePath of framePaths) {
                const image = sharp(framePath);
                const metadata = await image.metadata();
                images.push({ image, width: metadata.width, height: metadata.height });
            }

            // Calcola dimensioni del collage (orizzontale)
            const maxHeight = Math.max(...images.map(img => img.height));
            const totalWidth = images.reduce((sum, img) => sum + img.width, 0);

            // Crea canvas bianco
            const canvas = sharp({
                create: {
                    width: totalWidth,
                    height: maxHeight,
                    channels: 3,
                    background: { r: 255, g: 255, b: 255 }
                }
            });

            // Prepara le immagini da comporre
            const composite = [];
            let currentX = 0;

            for (const imgData of images) {
                composite.push({
                    input: await imgData.image.toBuffer(),
                    left: currentX,
                    top: Math.floor((maxHeight - imgData.height) / 2)
                });
                currentX += imgData.width;
            }

            // Crea il collage
            await canvas.composite(composite).jpeg({ quality: 80 }).toFile(collagePath);

            // Comprimi il collage
            const compressedCollagePath = await this.compressImage(collagePath);

            console.log('Collage creato:', compressedCollagePath);
            return compressedCollagePath;

        } catch (error) {
            console.error('Errore nella creazione collage:', error);
            throw error;
        }
    }

    async compressImage(imagePath) {
        // Mantieni la nomenclatura coerente sostituendo solo l'estensione
        const compressedPath = imagePath.replace('.jpg', '_compressed.jpg');

        try {
            await sharp(imagePath)
                .resize(800, 600, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({
                    quality: 75,
                    progressive: true
                })
                .toFile(compressedPath);

            // Verifica dimensione file
            const stats = await fs.stat(compressedPath);
            const sizeKB = stats.size / 1024;

            console.log(`Immagine compressa: ${sizeKB.toFixed(2)} KB`);

            // Se ancora troppo grande, comprimi ulteriormente
            if (sizeKB > 100) {
                const finalPath = compressedPath.replace('_compressed.jpg', '_compressed_final.jpg');
                await sharp(compressedPath)
                    .jpeg({ quality: 60 })
                    .toFile(finalPath);

                // Attendi un momento prima di eliminare il file originale
                await this.delay(100);
                try {
                    await fs.unlink(compressedPath);
                    await fs.rename(finalPath, compressedPath);
                } catch (unlinkError) {
                    console.warn('Avviso: impossibile rimuovere file temporaneo:', unlinkError.message);
                    // Se non riesce a rimuovere il file originale, usa il finale
                    return finalPath;
                }
            }

            return compressedPath;

        } catch (error) {
            console.error('Errore nella compressione immagine:', error);
            throw error;
        }
    }

    async getImageBase64(imagePath) {
        try {
            const buffer = await fs.readFile(imagePath);
            return buffer.toString('base64');
        } catch (error) {
            console.error('Errore nella conversione Base64:', error);
            throw error;
        }
    }

    // Metodo per pulire tutti i file temporanei
    async cleanup() {
        try {
            await this.cleanTempDir();
            console.log('Pulizia file temporanei completata');
        } catch (error) {
            console.error('Errore nella pulizia:', error);
        }
    }

    // Metodo per verificare se FFmpeg è disponibile
    async checkFFmpegAvailability() {
        return new Promise((resolve) => {
            const ffmpeg = spawn('ffmpeg', ['-version']);

            ffmpeg.on('close', (code) => {
                resolve(code === 0);
            });

            ffmpeg.on('error', () => {
                resolve(false);
            });
        });
    }

    // Metodo per introdurre un delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Metodo per ottenere informazioni dettagliate del video
    async getVideoInfo(videoPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                videoPath
            ]);

            let output = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const info = JSON.parse(output);
                        resolve(info);
                    } catch (error) {
                        reject(new Error('Errore nel parsing informazioni video'));
                    }
                } else {
                    reject(new Error(`FFprobe failed with code ${code}`));
                }
            });

            ffprobe.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Nuovo metodo per processare tutti i video con banner e testo
    async processVideosWithBanners(statusCallback = null, config = null) {
        console.log('🎬 Inizio processamento video con banner e testo');

        if (config) {
            console.log('📋 Configurazione ricevuta:', config);
        }

        try {
            // Leggi tutti i file di output dell'API AI dalla cartella temp_frames
            const outputFiles = await fs.readdir(this.tempDir);
            const txtFiles = outputFiles.filter(file => file.endsWith('.txt') && file.includes('_ai_output_'));

            console.log(`📁 Trovati ${txtFiles.length} file di output da processare`);

            if (statusCallback) {
                statusCallback({
                    phase: 'banner-processing',
                    current: 0,
                    total: txtFiles.length,
                    file: 'Analisi file di output...'
                });
            }

            let processedCount = 0;
            let validVideos = [];

            // Analizza ogni file di output
            for (const txtFile of txtFiles) {
                try {
                    const txtPath = path.join(this.tempDir, txtFile);
                    const content = await fs.readFile(txtPath, 'utf8');

                    // Estrai il JSON dalla risposta AI
                    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                    if (!jsonMatch) {
                        console.log(`⚠️ Nessun JSON trovato in ${txtFile}`);
                        continue;
                    }

                    const aiResponse = JSON.parse(jsonMatch[1]);

                    // Controlla se il video ha superato il filtro
                    if (aiResponse.matches_filter !== 1) {
                        console.log(`❌ Video ${txtFile} escluso: non ha superato il filtro (matches_filter: ${aiResponse.matches_filter})`);
                        continue;
                    }

                    console.log(`✅ Video valido trovato: ${txtFile}`);
                    validVideos.push({
                        outputFile: txtFile,
                        aiResponse: aiResponse,
                        content: content
                    });

                } catch (parseError) {
                    console.error(`❌ Errore nel parsing di ${txtFile}:`, parseError.message);
                    continue;
                }
            }

            console.log(`🎯 Trovati ${validVideos.length} video validi da processare`);

            if (validVideos.length === 0) {
                console.log(`⚠️ ATTENZIONE: Nessun video valido trovato per il processamento banner`);
                return {
                    totalFiles: txtFiles.length,
                    validVideos: 0,
                    processedVideos: 0,
                    skippedVideos: 0
                };
            }

            console.log(`🎬 === INIZIO PROCESSAMENTO BANNER ===`);

            // Processa ogni video valido
            for (let i = 0; i < validVideos.length; i++) {
                const videoData = validVideos[i];

                console.log(`\n📹 [${i + 1}/${validVideos.length}] Processamento: ${videoData.outputFile}`);

                if (statusCallback) {
                    statusCallback({
                        phase: 'banner-processing',
                        current: i + 1,
                        total: validVideos.length,
                        file: `Processamento ${videoData.outputFile}`
                    });
                }

                try {
                    const result = await this.addBannerToVideo(videoData, config);
                    processedCount++;
                    console.log(`✅ [${i + 1}/${validVideos.length}] COMPLETATO con successo!`);
                } catch (error) {
                    console.log(`❌ [${i + 1}/${validVideos.length}] ERRORE nel processamento:`);
                    console.log(`   📋 Dettagli: ${error.message}`);
                }
            }

            console.log(`\n🎉 === PROCESSAMENTO COMPLETATO ===`);
            console.log(`📊 RISULTATI FINALI:`);
            console.log(`   • Video analizzati: ${txtFiles.length}`);
            console.log(`   • Video validi (filtrati): ${validVideos.length}`);
            console.log(`   • Video processati con successo: ${processedCount}`);
            console.log(`   • Video con errori: ${validVideos.length - processedCount}`);

            return {
                totalFiles: txtFiles.length,
                validVideos: validVideos.length,
                processedVideos: processedCount,
                skippedVideos: validVideos.length - processedCount
            };

        } catch (error) {
            console.error('❌ Errore nel processamento video con banner:', error);
            throw error;
        }
    }

    // Metodo per aggiungere banner e testo a un singolo video
    async addBannerToVideo(videoData, config = null) {
        const { outputFile, aiResponse, content } = videoData;

        console.log(`🎬 Processamento video: ${outputFile}`);
        console.log(`📍 Posizione banner: ${aiResponse.banner_position}`);
        console.log(`📝 Testo meme: ${aiResponse.meme_text}`);

        if (config) {
            console.log(`🎨 Font selezionato: ${config.selectedFont || 'default'}`);
        }

        // Estrai il nome del video originale direttamente dal nome del file di output
        let originalVideoName = null;

        // Il nome del file output ora inizia con il nome del video originale
        const outputBaseName = path.basename(outputFile, '.txt');

        // Rimuove il suffisso "_ai_output_TIMESTAMP" e possibili suffissi "_frame_center" per ottenere il nome del video
        const videoBaseName = outputBaseName
            .replace(/_ai_output_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/, '')
            .replace(/_frame_center$/, ''); // Rimuove anche _frame_center se presente

        console.log(`🔍 Cercando video corrispondente per: ${videoBaseName}`);

        // Cerca il video corrispondente nella cartella INPUT
        const inputDir = path.join(__dirname, 'INPUT');
        const inputFiles = await fs.readdir(inputDir);
        const mp4Files = inputFiles.filter(file => file.endsWith('.mp4'));

        for (const videoFile of mp4Files) {
            const videoFileBaseName = this.generateVideoBasedName(videoFile);
            if (videoFileBaseName === videoBaseName) {
                originalVideoName = videoFile;
                console.log(`✅ Video trovato tramite nome: ${originalVideoName}`);
                break;
            }
        }

        if (!originalVideoName) {
            console.log(`⚠️ Video non trovato per ${videoBaseName}, uso primo video disponibile`);
            originalVideoName = mp4Files[0];
        }

        console.log(`📁 Video disponibili: ${mp4Files.join(', ')}`);

        if (mp4Files.length === 0) {
            throw new Error('Nessun video MP4 trovato nella cartella INPUT');
        }

        // Verifica che il file video esista
        const inputVideoPath = path.join(__dirname, 'INPUT', originalVideoName);
        try {
            await fs.access(inputVideoPath);
        } catch (error) {
            throw new Error(`Video non trovato: ${inputVideoPath}`);
        }

        // Il video finale va nella cartella OUTPUT con nome basato sul video originale
        const outputVideoBaseName = this.generateVideoBasedName(originalVideoName);
        const outputVideoPath = path.join(__dirname, 'OUTPUT', `${outputVideoBaseName}_meme_${Date.now()}.mp4`);

        console.log(`🎬 Processamento video: ${originalVideoName}`);
        console.log(`📍 Posizione banner: ${aiResponse.banner_position}`);
        console.log(`📝 Testo meme: ${aiResponse.meme_text}`);

        // Ottieni informazioni del video
        const videoInfo = await this.getVideoInfo(inputVideoPath);
        const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
        const width = videoStream.width;
        const height = videoStream.height;

        console.log(`📺 Dimensioni video: ${width}x${height}`);

        // Crea il filtro per il banner e testo
        const bannerHeight = 450;
        const textColor = 'black';
        const fontSize = Math.max(32, Math.min(56, width / 18)); // Font size leggermente più grande

        // Determina il font da utilizzare con gestione fallback corretta
        let selectedFont = (config && config.selectedFont) ? config.selectedFont : 'impact.ttf';

        // CORREZIONE: Assicurati che il font abbia l'estensione .ttf o .TTF
        if (!selectedFont.toLowerCase().endsWith('.ttf')) {
            // Prima prova con .TTF (maiuscolo) - più comune per i font della cartella
            let testFontPath = path.join(__dirname, 'font', selectedFont + '.TTF');
            try {
                await fs.access(testFontPath, fs.constants.F_OK);
                selectedFont = selectedFont + '.TTF';
            } catch (error) {
                // Poi prova con .ttf (minuscolo)
                testFontPath = path.join(__dirname, 'font', selectedFont + '.ttf');
                try {
                    await fs.access(testFontPath, fs.constants.F_OK);
                    selectedFont = selectedFont + '.ttf';
                } catch (error2) {
                    // Mantieni il nome originale per il test successivo
                }
            }
        }

        let fontPath = path.join(__dirname, 'font', selectedFont);

        // VERIFICA ESISTENZA FONT - CRITICA per garantire font corretto
        try {
            await fs.access(fontPath, fs.constants.F_OK);
            console.log(`✅ Font verificato e trovato: ${selectedFont}`);
        } catch (error) {
            console.error(`❌ ERRORE: Font non trovato: ${fontPath}`);
            console.error(`🔄 Tentativo fallback su impact.ttf...`);

            // Fallback su impact.ttf se il font selezionato non esiste
            selectedFont = 'impact.ttf';
            fontPath = path.join(__dirname, 'font', selectedFont);

            try {
                await fs.access(fontPath, fs.constants.F_OK);
                console.log(`✅ Font fallback trovato: ${selectedFont}`);
            } catch (fallbackError) {
                throw new Error(`Font critico non disponibile: né il font originale né impact.ttf trovati nella cartella font/!`);
            }
        }

        // Per FFmpeg su Windows, converti i backslash in forward slash e gestisci spazi
        const escapedFontPath = fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');

        console.log(`🎨 Utilizzando font: ${selectedFont}`);
        console.log(`📂 Percorso font assoluto: ${fontPath}`);
        console.log(`📂 Percorso font escaped: ${escapedFontPath}`);

        // Prepara il testo per FFmpeg con gestione delle righe multiple migliorata
        // REQUISITO: il testo deve stare a max 15px dai bordi del video
        const minDistanceFromBorder = 15; // Distanza minima richiesta dai bordi
        const effectiveWidth = width - (minDistanceFromBorder * 2); // Usa larghezza video completa - 30px totali

        // Stima più accurata basata sul font: caratteri come 'W' sono più larghi di 'i'
        // Per font come Impact, stima circa 0.6-0.7 del fontSize come larghezza media carattere
        const avgCharWidth = fontSize * 0.65; // Stima più realistica
        const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);

        const lineHeight = fontSize * 1.2; // Line height più compatto ma leggibile
        const maxLines = Math.floor(bannerHeight / lineHeight) - 1; // Spazio per margini

        const wrappedText = this.wrapText(aiResponse.meme_text, maxCharsPerLine, maxLines);
        console.log(`📝 Testo originale: "${aiResponse.meme_text}"`);
        console.log(`📝 Testo wrappato: "${wrappedText}" (max ${maxCharsPerLine} char/riga, max ${maxLines} righe)`);

        // Per FFmpeg, dividiamo il testo in righe separate e le sovrapponiamo
        const lines = wrappedText.split('\\n');
        console.log(`📊 Numero di righe: ${lines.length}`);

        // CONTROLLO DIMENSIONI: Verifica che le righe restino nei 15px dai bordi
        let adjustedFontSize = fontSize;
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const estimatedTextWidth = maxLineLength * avgCharWidth;

        if (estimatedTextWidth > effectiveWidth) {
            adjustedFontSize = Math.max(24, Math.floor(effectiveWidth / (maxLineLength * 0.65)));
            console.log(`⚠️ Testo troppo largo (${Math.round(estimatedTextWidth)}px > ${effectiveWidth}px)!`);
            console.log(`📏 Font ridotto da ${fontSize}px a ${adjustedFontSize}px per rispettare i 15px dai bordi`);
        } else {
            console.log(`✅ Testo entro i limiti: ${Math.round(estimatedTextWidth)}px <= ${effectiveWidth}px`);
        }

        // Calcola la posizione di partenza del testo per centratura verticale
        // Consideriamo che il testo di una riga inizia dalla baseline, non dal top
        const adjustedLineHeight = Math.round(adjustedFontSize * 1.2); // Usa il font size aggiustato, forzando intero
        const totalTextHeight = lines.length * adjustedLineHeight;

        console.log(`📐 Altezza banner: ${bannerHeight}px`);
        console.log(`📐 Altezza totale testo: ${totalTextHeight}px`);
        console.log(`📐 Line height: ${adjustedLineHeight}px`);
        console.log(`📐 Font size finale: ${adjustedFontSize}px`);

        let textFilters = '';
        let baseY;

        if (aiResponse.banner_position === 'bottom') {
            const bannerY = height - bannerHeight;
            // Centra verticalmente nel banner bottom, aggiungendo un offset per la baseline del font
            baseY = Math.round(bannerY + (bannerHeight - totalTextHeight) / 2 + adjustedFontSize * 0.8);
            textFilters = `[0:v]drawbox=x=0:y=${bannerY}:w=${width}:h=${bannerHeight}:color=white:t=fill`;
            console.log(`📍 Banner bottom - bannerY: ${bannerY}, baseY: ${baseY}`);
        } else {
            // Centra verticalmente nel banner top, aggiungendo un offset per la baseline del font
            baseY = Math.round((bannerHeight - totalTextHeight) / 2 + adjustedFontSize * 0.8);
            textFilters = `[0:v]drawbox=x=0:y=0:w=${width}:h=${bannerHeight}:color=white:t=fill`;
            console.log(`📍 Banner top - baseY: ${baseY}`);
        }

        // Aggiungi ogni riga come un filtro drawtext separato
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/=/g, '\\=').replace(/,/g, '\\,').replace(/\[/g, '\\[').replace(/\]/g, '\\]');

            // CORREZIONE: FFmpeg richiede coordinate intere, non decimali
            const yPos = Math.round(baseY + (i * adjustedLineHeight));

            console.log(`📝 Riga ${i + 1}: "${lines[i]}" -> y=${yPos}`);

            // CORREZIONE: FFmpeg non supporta max/min nelle coordinate
            // Usiamo centratura semplice - il controllo 15px è fatto sopra riducendo fontSize se necessario
            const xPos = '(w-text_w)/2';

            textFilters += `,drawtext=text='${line}':fontfile='${escapedFontPath}':fontcolor=${textColor}:fontsize=${adjustedFontSize}:x=${xPos}:y=${yPos}`;
        }

        const filterComplex = textFilters + '[v]';

        console.log(`🔧 Filtro FFmpeg generato: ${filterComplex}`);
        console.log(`🚀 Eseguendo processamento video...`);

        // Esegui FFmpeg per aggiungere banner e testo
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, [
                '-i', inputVideoPath,
                '-filter_complex', filterComplex,
                '-map', '[v]',
                '-map', '0:a?', // Copia audio se presente
                '-c:v', 'libx264',
                '-c:a', 'copy',
                '-y',
                outputVideoPath
            ]);

            let errorOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();

                // MONITORAGGIO FONT: Rileva problemi specifici con font
                if (output.includes('Font') || output.includes('font') || output.includes('fontfile')) {
                    console.warn(`⚠️ ATTENZIONE FONT: ${output.trim()}`);
                }

                // Filtra solo gli errori critici per ridurre il rumore nel terminal
                if (output.includes('Error') || output.includes('failed') || output.includes('Invalid argument')) {
                    errorOutput += output;
                    console.error(`❌ Errore FFmpeg: ${output.trim()}`);
                }
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ SUCCESSO: Video con banner completato: ${path.basename(outputVideoPath)}`);
                    resolve(outputVideoPath);
                } else {
                    console.log(`❌ ERRORE FFmpeg: Comando fallito con codice ${code}`);
                    if (errorOutput.trim()) {
                        console.log(`📋 Dettagli errore: ${errorOutput.trim()}`);
                    }
                    reject(new Error(`FFmpeg failed (code ${code}): ${errorOutput}`));
                }
            });

            ffmpeg.on('error', (error) => {
                reject(new Error(`Errore FFmpeg: ${error.message}`));
            });
        });
    }

    // Funzione helper per spezzare testo lungo in più righe con controllo rigoroso
    wrapText(text, maxCharsPerLine, maxLines = 4) {
        if (text.length <= maxCharsPerLine) {
            return text;
        }

        const words = text.split(' ');
        let lines = [];
        let currentLine = '';

        for (const word of words) {
            // Se abbiamo già raggiunto il numero massimo di righe, interrompi
            if (lines.length >= maxLines - 1) {
                // Aggiungi parole rimanenti alla riga corrente fino al limite, poi tronca
                const remainingSpace = maxCharsPerLine - currentLine.length - 3; // -3 per "..."
                if (remainingSpace > word.length) {
                    currentLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
                } else {
                    currentLine += '...';
                    break;
                }
                continue;
            }

            // Controlla se aggiungendo la parola superiamo il limite di caratteri
            const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
            if (testLine.length > maxCharsPerLine) {
                if (currentLine.length > 0) {
                    lines.push(currentLine.trim());
                    currentLine = word;
                } else {
                    // Parola singola troppo lunga, la tronchiamo
                    if (word.length > maxCharsPerLine - 3) {
                        lines.push(word.substring(0, maxCharsPerLine - 3) + '...');
                        currentLine = '';
                    } else {
                        currentLine = word;
                    }
                }
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine.trim());
        }

        // Limita il numero di righe
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            const lastLine = lines[lines.length - 1];
            if (lastLine.length > maxCharsPerLine - 3) {
                lines[lines.length - 1] = lastLine.substring(0, maxCharsPerLine - 3) + '...';
            } else {
                lines[lines.length - 1] = lastLine + '...';
            }
        }

        // Unisci le righe con semplice \n (verrà gestito diversamente nel filtro FFmpeg)
        return lines.join('\\n');
    }
}

module.exports = VideoProcessor;