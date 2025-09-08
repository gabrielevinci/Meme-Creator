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

        const collagePath = path.join(this.tempDir, 'collage.jpg');

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
                await sharp(compressedPath)
                    .jpeg({ quality: 60 })
                    .toFile(compressedPath.replace('.jpg', '_final.jpg'));

                await fs.unlink(compressedPath);
                const finalPath = compressedPath.replace('.jpg', '_final.jpg');
                await fs.rename(finalPath, compressedPath);
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
}

module.exports = VideoProcessor;