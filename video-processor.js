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
        console.log(`Estrazione frame da: ${videoPath}, Collage: ${useCollage}`);

        await this.ensureTempDir();
        // Rimuovo cleanTempDir() per non eliminare i file durante l'elaborazione

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
                    const framePath = await this.extractSingleFrame(videoPath, timestamps[i], `frame_${i + 1}.jpg`);
                    frames.push(framePath);
                }

                // Crea collage
                const collagePath = await this.createCollage(frames);

                // Pulisci frame singoli
                for (const frame of frames) {
                    await fs.unlink(frame).catch(() => {});
                }

                return [collagePath];

            } else {
                // Estrai solo frame centrale (50%)
                const timestamp = duration * 0.50;
                const framePath = await this.extractSingleFrame(videoPath, timestamp, 'frame_center.jpg');
                return [framePath];
            }

        } catch (error) {
            console.error('Errore nell\'estrazione frame:', error);
            throw error;
        }
        // Rimuovo il finally che puliva immediatamente le risorse
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

    async extractSingleFrame(videoPath, timestamp, outputName) {
        // Crea un nome completamente unico basato su timestamp e random
        const uniqueTimestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 8);
        const uniqueName = `${uniqueTimestamp}_${randomId}_${outputName}`;
        const outputPath = path.join(this.tempDir, uniqueName);

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

    async createCollage(framePaths) {
        console.log('Creazione collage da:', framePaths);

        // Crea nome file unico per evitare conflitti
        const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const collagePath = path.join(this.tempDir, `collage_${uniqueId}.jpg`);

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
        // Crea nome file unico per la compressione per evitare conflitti
        const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const compressedPath = imagePath.replace('.jpg', `_compressed_${uniqueId}.jpg`);

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
                const finalPath = compressedPath.replace('.jpg', '_final.jpg');
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
    async processVideosWithBanners(statusCallback = null) {
        console.log('🎬 Inizio processamento video con banner e testo');
        
        try {
            // Leggi tutti i file di output dell'API AI
            const outputFiles = await fs.readdir(this.outputDir);
            const txtFiles = outputFiles.filter(file => file.endsWith('.txt'));
            
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
                    const txtPath = path.join(this.outputDir, txtFile);
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
            
            // Processa ogni video valido
            for (let i = 0; i < validVideos.length; i++) {
                const videoData = validVideos[i];
                
                if (statusCallback) {
                    statusCallback({
                        phase: 'banner-processing',
                        current: i + 1,
                        total: validVideos.length,
                        file: `Processamento ${videoData.outputFile}`
                    });
                }
                
                try {
                    await this.addBannerToVideo(videoData);
                    processedCount++;
                    console.log(`✅ Video ${processedCount}/${validVideos.length} processato con successo`);
                } catch (error) {
                    console.error(`❌ Errore nel processamento di ${videoData.outputFile}:`, error.message);
                }
            }
            
            console.log(`🎉 Processamento completato: ${processedCount}/${validVideos.length} video elaborati`);
            
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
    async addBannerToVideo(videoData) {
        const { outputFile, aiResponse, content } = videoData;
        
        // Estrai il nome del file video originale dal contenuto
        const videoMatch = content.match(/ANALISI AI - (.+?)\.jpg/);
        if (!videoMatch) {
            throw new Error(`Impossibile estrarre il nome del video da ${outputFile}`);
        }
        
        const frameBaseName = videoMatch[1];
        
        // Trova il video originale corrispondente
        const inputDir = path.join(__dirname, 'INPUT');
        const inputFiles = await fs.readdir(inputDir);
        const mp4Files = inputFiles.filter(file => file.endsWith('.mp4'));
        
        // Prova a trovare il video corrispondente (potrebbe non essere perfettamente corrispondente)
        let videoFile = null;
        for (const file of mp4Files) {
            // Rimuovi estensione per confronto base
            const baseName = file.replace('.mp4', '');
            if (frameBaseName.includes(baseName.substring(0, 20)) || baseName.includes(frameBaseName.substring(0, 20))) {
                videoFile = file;
                break;
            }
        }
        
        if (!videoFile) {
            // Se non troviamo corrispondenza diretta, usa il primo video disponibile per il test
            console.log(`⚠️ Video originale non trovato per ${frameBaseName}, uso il primo video disponibile`);
            videoFile = mp4Files[0];
            if (!videoFile) {
                throw new Error('Nessun video MP4 trovato nella cartella INPUT');
            }
        }
        
        const inputVideoPath = path.join(inputDir, videoFile);
        const outputVideoPath = path.join(__dirname, 'OUTPUT', `meme_${Date.now()}_${videoFile}`);
        
        console.log(`🎬 Processamento video: ${videoFile}`);
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
        const fontSize = Math.max(24, Math.min(48, width / 20)); // Font size dinamico basato sulla larghezza
        
        // Prepara il testo per FFmpeg (escaping caratteri speciali)
        const escapedText = aiResponse.meme_text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/=/g, '\\=')
            .replace(/,/g, '\\,')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
        
        let filterComplex;
        if (aiResponse.banner_position === 'bottom') {
            // Banner bianco in basso
            const bannerY = height - bannerHeight;
            const textY = bannerY + (bannerHeight / 2);
            filterComplex = `[0:v]drawbox=x=0:y=${bannerY}:w=${width}:h=${bannerHeight}:color=white:t=fill,` +
                          `drawtext=text='${escapedText}':fontcolor=${textColor}:fontsize=${fontSize}:` +
                          `x=(w-text_w)/2:y=${textY}:fontfile=C\\:/Windows/Fonts/arial.ttf:` +
                          `text_align=center:line_spacing=5[v]`;
        } else {
            // Banner bianco in alto
            const textY = bannerHeight / 2;
            filterComplex = `[0:v]drawbox=x=0:y=0:w=${width}:h=${bannerHeight}:color=white:t=fill,` +
                          `drawtext=text='${escapedText}':fontcolor=${textColor}:fontsize=${fontSize}:` +
                          `x=(w-text_w)/2:y=${textY}:fontfile=C\\:/Windows/Fonts/arial.ttf:` +
                          `text_align=center:line_spacing=5[v]`;
        }
        
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
                errorOutput += data.toString();
            });
            
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ Video con banner salvato: ${path.basename(outputVideoPath)}`);
                    resolve(outputVideoPath);
                } else {
                    reject(new Error(`FFmpeg failed (code ${code}): ${errorOutput}`));
                }
            });
            
            ffmpeg.on('error', (error) => {
                reject(new Error(`Errore FFmpeg: ${error.message}`));
            });
        });
    }
}

module.exports = VideoProcessor;