const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const sharp = require('sharp');
const sox = require('sox');
const { Vibrant } = require('node-vibrant/node');

class VideoProcessor {
    constructor() {
        this.outputDir = path.join(__dirname, 'OUTPUT');
        this.tempDir = path.join(__dirname, 'temp_frames');
        this.ffmpegPath = this.findFFmpegPath();
        this.ffprobePath = this.findFFprobePath();
    }

    // Taglia il primo frame se è nero - PROCESSO SEMPLICE
    async removeFirstFrameIfBlack(inputVideoPath) {
        console.log(`🎞️ Controllo e rimozione primo frame nero per: ${path.basename(inputVideoPath)}`);

        const tempFramePath = path.join(this.tempDir, `first_frame_${Date.now()}.png`);
        const trimmedVideoPath = path.join(this.tempDir, `trimmed_${Date.now()}.mp4`);

        try {
            // STEP 1: Estrai solo il primo frame per controllare se è nero
            await new Promise((resolve, reject) => {
                const extractCmd = spawn(this.ffmpegPath, [
                    '-i', inputVideoPath,
                    '-vframes', '1',
                    '-y', tempFramePath
                ]);

                extractCmd.on('close', (code) => {
                    code === 0 ? resolve() : reject(new Error(`Extract failed: ${code}`));
                });
                extractCmd.on('error', reject);
            });

            // STEP 2: Analizza il colore del frame usando Node Vibrant per un'analisi più precisa
            console.log(`🔍 Analisi colori avanzata del primo frame...`);

            const vibrant = Vibrant.from(tempFramePath);
            const palette = await vibrant.getPalette();

            // Controllo se il frame è completamente nero o molto scuro
            let isBlack = false;
            let analysisResult = '';

            // Analizza i colori dominanti con popolazione > 0
            const colors = Object.entries(palette)
                .filter(([_, swatch]) => swatch !== null && swatch.population > 0)
                .sort(([_, a], [__, b]) => b.population - a.population); // Ordina per popolazione (più popolato prima)

            if (colors.length === 0) {
                // Nessun colore estratto -> probabilmente nero
                isBlack = true;
                analysisResult = 'Nessun colore significativo rilevato → NERO COMPLETO';
            } else {
                // Calcola la luminosità media PESATA per popolazione
                const totalPixels = colors.reduce((sum, [_, swatch]) => sum + swatch.population, 0);
                const weightedBrightness = colors.reduce((sum, [_, swatch]) => {
                    const [r, g, b] = swatch.rgb;
                    const brightness = (r + g + b) / 3;
                    const weight = swatch.population / totalPixels;
                    return sum + (brightness * weight);
                }, 0);

                isBlack = weightedBrightness < 25; // Soglia per nero/grigio scuro

                const dominantColor = colors[0][1]; // Colore più popolato
                const dominantPercent = ((dominantColor.population / totalPixels) * 100).toFixed(1);

                analysisResult = `Colore dominante: ${dominantColor.hex} (${dominantPercent}% dei pixel) - Luminosità pesata: ${weightedBrightness.toFixed(1)}/255`;
            }

            console.log(`📊 ${analysisResult}`);
            console.log(`🎯 Risultato: ${isBlack ? 'NERO → RIMUOVO' : 'OK → MANTENGO'}`);

            // STEP 3: Se è nero, ottieni FPS e rimuovi FISICAMENTE il primo frame
            if (isBlack) {
                // Prima ottieni il framerate del video
                const videoInfo = await new Promise((resolve, reject) => {
                    const ffprobeCmd = spawn(this.ffprobePath, [
                        '-v', 'quiet',
                        '-show_streams',
                        '-select_streams', 'v:0',
                        '-of', 'csv=p=0',
                        '-show_entries', 'stream=r_frame_rate,duration',
                        inputVideoPath
                    ]);

                    let output = '';
                    ffprobeCmd.stdout.on('data', (data) => output += data);
                    ffprobeCmd.on('close', (code) => {
                        if (code === 0) {
                            const lines = output.trim().split('\n');
                            const [frameRate] = lines[0].split(',');
                            resolve({ frameRate });
                        } else {
                            reject(new Error(`FFprobe failed: ${code}`));
                        }
                    });
                    ffprobeCmd.on('error', reject);
                });

                // Calcola la durata di un frame in secondi
                const [num, den] = videoInfo.frameRate.split('/').map(Number);
                const fps = den ? num / den : num;
                const frameDuration = 1 / fps;

                console.log(`📊 FPS video: ${fps.toFixed(2)}, durata primo frame: ${frameDuration.toFixed(6)}s`);

                await new Promise((resolve, reject) => {
                    // Usa seekInput per iniziare dal secondo frame
                    const trimCmd = spawn(this.ffmpegPath, [
                        '-ss', frameDuration.toString(), // Salta la durata esatta di un frame
                        '-i', inputVideoPath,
                        '-c', 'copy', // Copia tutto senza ricodifica per velocità
                        '-y', trimmedVideoPath
                    ]);

                    trimCmd.on('close', (code) => {
                        code === 0 ? resolve() : reject(new Error(`Trim failed: ${code}`));
                    });
                    trimCmd.on('error', reject);
                });

                console.log(`✅ Primo frame nero rimosso con seek di ${frameDuration.toFixed(6)}s`);

                // Cleanup frame temporaneo
                await fs.unlink(tempFramePath).catch(() => {});

                return trimmedVideoPath; // Ritorna il video tagliato
            } else {
                console.log(`✅ Primo frame non è nero, mantengo video originale`);

                // Cleanup frame temporaneo
                await fs.unlink(tempFramePath).catch(() => {});

                return inputVideoPath; // Ritorna il video originale
            }

        } catch (error) {
            console.error(`❌ Errore nel processo rimozione frame:`, error.message);
            console.log(`🔄 Fallback: uso video originale`);

            // Cleanup in caso di errore
            await fs.unlink(tempFramePath).catch(() => {});

            return inputVideoPath; // Fallback sicuro
        }
    }

    // Applica tutte le modifiche video PRIMA dell'inserimento del testo
    async applyVideoModifications(inputVideoPath, config) {
        console.log(`🎨 Applicazione modifiche video...`);

        // Controlla se è necessaria qualche modifica video
        const needsContrast = config && config.contrast !== undefined && config.contrast !== 1;
        const needsSaturation = config && config.saturation !== undefined && config.saturation !== 50;
        const needsGamma = config && config.gamma !== undefined && config.gamma !== 0;
        const needsLift = config && config.lift !== undefined && config.lift !== 0;
        const needsVideoSpeed = config && config.videoSpeed && config.videoSpeed !== 1;
        const needsVideoZoom = config && config.videoZoom !== undefined && config.videoZoom !== 1;
        const needsOverlayImage = config && config.overlayImageEnabled && config.overlayImagePath;
        const needsVolumeChange = config && config.videoVolume && config.videoVolume !== 0;
        const needsBackgroundAudio = config && config.backgroundAudioEnabled && config.backgroundAudioPath;
        const needsAudioReplacement = config && config.replaceAudioEnabled && config.replaceAudioFolderPath;

        console.log(`🔍 DEBUG AUDIO REPLACEMENT:`, {
            replaceAudioEnabled: config?.replaceAudioEnabled,
            replaceAudioFolderPath: config?.replaceAudioFolderPath,
            needsAudioReplacement: needsAudioReplacement
        });

        const hasVideoModifications = needsContrast || needsSaturation || needsGamma || needsLift ||
            needsVideoSpeed || needsVideoZoom || needsOverlayImage;
        const hasAudioModifications = needsVolumeChange || needsBackgroundAudio || needsAudioReplacement;

        if (!hasVideoModifications && !hasAudioModifications) {
            console.log(`✅ Nessuna modifica video necessaria, uso video originale`);
            return { processedVideoPath: inputVideoPath };
        }

        // Crea path per video modificato
        const modifiedVideoPath = path.join(this.tempDir, `video_modified_${Date.now()}.mp4`);

        console.log(`🎥 Modifiche video da applicare:`, {
            contrast: needsContrast ? config.contrast : 'skip',
            saturation: needsSaturation ? config.saturation : 'skip',
            gamma: needsGamma ? config.gamma : 'skip',
            lift: needsLift ? config.lift : 'skip',
            videoSpeed: needsVideoSpeed ? config.videoSpeed + 'x' : 'skip',
            videoZoom: needsVideoZoom ? config.videoZoom + 'x' : 'skip',
            overlayImage: needsOverlayImage ? 'enabled' : 'skip',
            volume: needsVolumeChange ? config.videoVolume + 'dB' : 'skip',
            backgroundAudio: needsBackgroundAudio ? 'enabled' : 'skip',
            audioReplacement: needsAudioReplacement ? 'enabled' : 'skip'
        });

        try {
            // Ottieni informazioni del video
            const videoInfo = await this.getVideoInfo(inputVideoPath);
            const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
            
            if (!videoStream) {
                throw new Error(`Nessun stream video trovato in: ${inputVideoPath}`);
            }
            
            const width = videoStream.width;
            const height = videoStream.height;

            // Costruisci gli argomenti FFmpeg
            const ffmpegArgs = ['-i', inputVideoPath];

            // Array per input aggiuntivi
            let inputCounter = 1;
            let overlayInputIndex = -1;

            // Input overlay immagine (se necessario)
            if (needsOverlayImage) {
                overlayInputIndex = inputCounter;
                ffmpegArgs.push('-i', config.overlayImagePath);
                inputCounter++;
            }

            // Costruisci filtri video
            let videoFilters = [];
            let currentLabel = '[0:v]';
            let stepCounter = 0;

            // 1. Filtri di correzione colore
            if (needsContrast) {
                const nextLabel = `[v${stepCounter}]`;
                videoFilters.push(`${currentLabel}eq=contrast=${config.contrast}${nextLabel}`);
                currentLabel = nextLabel;
                stepCounter++;
                console.log(`🎨 Contrasto: ${config.contrast}`);
            }

            if (needsSaturation) {
                const nextLabel = `[v${stepCounter}]`;
                const satValue = (config.saturation / 50).toFixed(2);
                videoFilters.push(`${currentLabel}eq=saturation=${satValue}${nextLabel}`);
                currentLabel = nextLabel;
                stepCounter++;
                console.log(`🌈 Saturazione: ${config.saturation} (FFmpeg: ${satValue})`);
            }

            if (needsGamma) {
                const nextLabel = `[v${stepCounter}]`;
                const gammaValue = (1 + config.gamma).toFixed(2);
                videoFilters.push(`${currentLabel}eq=gamma=${gammaValue}${nextLabel}`);
                currentLabel = nextLabel;
                stepCounter++;
                console.log(`🔆 Gamma: ${config.gamma} (FFmpeg: ${gammaValue})`);
            }

            if (needsLift) {
                const nextLabel = `[v${stepCounter}]`;
                const liftValue = (0.3 + config.lift * 0.3).toFixed(3);
                videoFilters.push(`${currentLabel}curves=all='0/${liftValue} 1/1'${nextLabel}`);
                currentLabel = nextLabel;
                stepCounter++;
                console.log(`🌅 Lift: ${config.lift} (curves: ${liftValue})`);
            }

            // 2. Zoom video
            if (needsVideoZoom) {
                const nextLabel = `[v${stepCounter}]`;
                const zoomFactor = config.videoZoom;

                if (zoomFactor > 1) {
                    const scaledWidth = Math.round(width * zoomFactor);
                    const scaledHeight = Math.round(height * zoomFactor);
                    const cropX = Math.round((scaledWidth - width) / 2);
                    const cropY = Math.round((scaledHeight - height) / 2);
                    videoFilters.push(`${currentLabel}scale=${scaledWidth}:${scaledHeight},crop=${width}:${height}:${cropX}:${cropY}${nextLabel}`);
                    console.log(`🔍 Zoom in: ${zoomFactor}x`);
                } else if (zoomFactor < 1) {
                    const scaledWidth = Math.round(width * zoomFactor);
                    const scaledHeight = Math.round(height * zoomFactor);
                    videoFilters.push(`${currentLabel}scale=${scaledWidth}:${scaledHeight},pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black${nextLabel}`);
                    console.log(`🔍 Zoom out: ${zoomFactor}x`);
                }

                currentLabel = nextLabel;
                stepCounter++;
            }

            // 3. Overlay immagine
            if (needsOverlayImage) {
                const nextLabel = `[v${stepCounter}]`;
                const opacity = ((100 - config.overlayOpacity) / 100).toFixed(2);

                videoFilters.push(`[${overlayInputIndex}:v]scale=${width}:${height}[scaled_overlay]`);
                videoFilters.push(`${currentLabel}[scaled_overlay]blend=all_mode=normal:all_opacity=${opacity}${nextLabel}`);
                currentLabel = nextLabel;
                stepCounter++;
                console.log(`🖼️ Overlay immagine: opacità ${config.overlayOpacity}%`);
            }

            // 4. Velocità video (sempre per ultimo nei filtri video)
            if (needsVideoSpeed) {
                const nextLabel = '[v]';
                videoFilters.push(`${currentLabel}setpts=PTS/${config.videoSpeed}${nextLabel}`);
                console.log(`⚡ Velocità video: ${config.videoSpeed}x`);
            } else if (videoFilters.length > 0) {
                // Rinomina l'ultimo label a [v]
                const lastFilter = videoFilters[videoFilters.length - 1];
                videoFilters[videoFilters.length - 1] = lastFilter.replace(currentLabel, '[v]');
            }

            // Gestione audio
            let audioProcessed = false;
            const hasSpeedChange = config && config.videoSpeed && config.videoSpeed !== 1;

            if (hasAudioModifications) {
                // Ottieni il nome del video per tracking degli audio
                const videoFilename = path.basename(inputVideoPath, path.extname(inputVideoPath));
                
                // Processa l'audio separatamente usando SOX (più veloce)
                const processedAudioPath = await this.preprocessAudioWithSox(config, inputVideoPath, this.tempDir, videoFilename);

                if (processedAudioPath) {
                    ffmpegArgs.push('-i', processedAudioPath);
                    ffmpegArgs.push('-map', `${inputCounter}:a`);
                    audioProcessed = true;
                    console.log(`🔊 Audio preprocessato con SOX applicato`);
                } else if (needsAudioReplacement) {
                    // Fallback: se SOX fallisce ma c'è sostituzione audio, usa il file replacement_audio.wav
                    const replacementAudioPath = path.join(this.tempDir, 'replacement_audio.wav');
                    if (fsSync.existsSync(replacementAudioPath)) {
                        console.log(`🔄 Fallback audio sostituzione: ${replacementAudioPath}`);
                        ffmpegArgs.push('-i', replacementAudioPath);
                        ffmpegArgs.push('-map', `${inputCounter}:a`);
                        audioProcessed = true;
                    }
                }
            }

            // Costruisci filtri video e audio insieme
            let finalFilterComplex = '';
            let audioMapping = '';

            if (videoFilters.length > 0) {
                finalFilterComplex = videoFilters.join(';');

                if (!audioProcessed && hasSpeedChange) {
                    // Aggiungi filtro audio al filter_complex
                    const audioTempo = config.videoSpeed;
                    finalFilterComplex += `;[0:a]atempo=${audioTempo}[a]`;
                    audioMapping = '[a]';
                    console.log(`🎵 Audio velocità aggiunta al filter_complex: ${audioTempo}x`);
                } else if (!audioProcessed) {
                    audioMapping = '0:a?'; // Audio originale
                }

                ffmpegArgs.push('-filter_complex', finalFilterComplex);
                ffmpegArgs.push('-map', '[v]');

                if (audioMapping) {
                    ffmpegArgs.push('-map', audioMapping);
                }
            } else {
                // Nessun filtro video
                ffmpegArgs.push('-map', '0:v'); // Mappa il video dall'input originale
                ffmpegArgs.push('-c:v', 'copy');

                // Gestione audio
                if (audioProcessed) {
                    // Usa l'audio processato (sostituzione o modifiche) - già mappato prima
                    ffmpegArgs.push('-c:a', 'copy');
                    console.log(`🎵 Usando audio processato`);
                } else {
                    ffmpegArgs.push('-map', '0:a'); // Mappa l'audio originale
                    if (hasSpeedChange) {
                        // Solo velocità audio
                        ffmpegArgs.push('-af', `atempo=${config.videoSpeed}`);
                        console.log(`🎵 Audio velocità semplice: ${config.videoSpeed}x`);
                    } else {
                        ffmpegArgs.push('-c:a', 'copy'); // Copia audio
                    }
                }
            }

            ffmpegArgs.push('-y', modifiedVideoPath);

            console.log(`🎬 Comando FFmpeg modifiche video:`, ffmpegArgs.slice(0, 10).join(' ') + '...');

            // Esegui FFmpeg
            await new Promise((resolve, reject) => {
                const ffmpegCmd = spawn(this.ffmpegPath, ffmpegArgs);

                ffmpegCmd.on('close', (code) => {
                    code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${code}`));
                });
                ffmpegCmd.on('error', reject);
            });

            console.log(`✅ Modifiche video applicate con successo`);
            return { processedVideoPath: modifiedVideoPath };

        } catch (error) {
            console.error(`❌ Errore nell'applicazione modifiche video:`, error.message);
            console.log(`🔄 Fallback: uso video originale`);
            return { processedVideoPath: inputVideoPath };
        }
    }

    // Metodo per calcolare la larghezza reale del testo formattato
    calculateTextMetrics(text, fontSize, format = 'normal') {
        // Fattori di correzione basati sui caratteri reali del testo formattato
        let charWidthFactor = 0.55; // Base factor
        let heightFactor = 1.0;

        // Analizza la composizione del testo per calcoli più precisi
        const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
        const lowerCaseCount = (text.match(/[a-z]/g) || []).length;
        const digitCount = (text.match(/[0-9]/g) || []).length;
        const spaceCount = (text.match(/\s/g) || []).length;
        const specialCount = text.length - upperCaseCount - lowerCaseCount - digitCount - spaceCount;

        // Calcola fattore di larghezza basato sulla composizione reale
        if (upperCaseCount > 0 || lowerCaseCount > 0) {
            const upperRatio = upperCaseCount / (upperCaseCount + lowerCaseCount);

            // Maiuscole sono circa 15-20% più larghe delle minuscole
            if (format === 'uppercase' || upperRatio > 0.8) {
                charWidthFactor = 0.62; // Maiuscole più larghe
                heightFactor = 1.05; // Leggermente più alte
            } else if (format === 'lowercase' || upperRatio < 0.2) {
                charWidthFactor = 0.52; // Minuscole più strette
                heightFactor = 0.95; // Leggermente più basse
            } else {
                // Testo misto
                charWidthFactor = 0.55 + (upperRatio * 0.07); // Interpolazione
                heightFactor = 0.95 + (upperRatio * 0.1);
            }
        }

        // Correzione per caratteri speciali (generalmente più stretti)
        if (specialCount > 0) {
            const specialRatio = specialCount / text.length;
            charWidthFactor -= specialRatio * 0.1;
        }

        // Correzione per spazi (più stretti)
        if (spaceCount > 0) {
            const spaceRatio = spaceCount / text.length;
            charWidthFactor -= spaceRatio * 0.2;
        }

        return {
            avgCharWidth: fontSize * charWidthFactor,
            lineHeight: fontSize * 1.1 * heightFactor,
            widthFactor: charWidthFactor,
            heightFactor: heightFactor
        };
    }

    // Calcola le dimensioni del blocco bianco in base alla risoluzione del video
    calculateBlockDimensions(videoWidth, videoHeight, customBlockHeight = null) {
            // CORREZIONE SECONDO SPECIFICHE UTENTE:
            // 1. Larghezza banner = larghezza video (nessun spazio laterale)
            // 2. Altezza banner proporzionale: 1920 : customBlockHeight = lunghezza_video : x
            // 3. La "lunghezza video" nella proporzione è l'altezza del video

            const blockWidth = videoWidth; // Banner copre tutta la larghezza del video

            // Usa l'altezza personalizzata dall'utente o il default 450
            const referenceHeight = customBlockHeight || 450;
            const referenceVideoHeight = 1920;

            // Calcola l'altezza proporzionale usando la formula: 1920 : referenceHeight = videoHeight : blockHeight
            // Risolviamo per blockHeight: blockHeight = (videoHeight * referenceHeight) / 1920
            const blockHeight = Math.round((videoHeight * referenceHeight) / referenceVideoHeight);

            console.log(`📐 Calcolo banner proporzionale:`);
            console.log(`   Formula: ${referenceVideoHeight} : ${referenceHeight} = ${videoHeight} : ${blockHeight}`);
            console.log(`   Video: ${videoWidth}×${videoHeight}`);
            console.log(`   Banner: ${blockWidth}×${blockHeight} (copre tutta la larghezza)`);
            console.log(`   Altezza di riferimento: ${referenceHeight}px (da utente: ${customBlockHeight ? 'SI' : 'NO'})`);

            return {
                width: blockWidth,
                height: blockHeight,
                x: 0, // Banner inizia sempre dal bordo sinistro (nessun spazio laterale)
                aspectRatio: videoWidth / videoHeight
            };
        } // Calcola l'area disponibile per il testo sottraendo i margini
    calculateAvailableTextArea(blockWidth, blockHeight, margins) {
        const { marginTop = 30, marginBottom = 30, marginLeft = 40, marginRight = 40 } = margins || {};

        console.log(`🔍 DEBUGGING MARGINI:`);
        console.log(`   📦 Blocco originale: ${blockWidth}x${blockHeight}px`);
        console.log(`   📏 Margini ricevuti: T=${marginTop}, B=${marginBottom}, L=${marginLeft}, R=${marginRight}`);

        const availableWidth = blockWidth - marginLeft - marginRight;
        const availableHeight = blockHeight - marginTop - marginBottom;

        console.log(`   ➖ Calcolo larghezza: ${blockWidth} - ${marginLeft} - ${marginRight} = ${availableWidth}px`);
        console.log(`   ➖ Calcolo altezza: ${blockHeight} - ${marginTop} - ${marginBottom} = ${availableHeight}px`);

        // Verifiche di sicurezza: applica limiti minimi solo se non tutti i margini sono 0
        // Se tutti i margini sono 0, l'utente vuole utilizzare tutto il blocco
        const allMarginsZero = marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0;

        const safeWidth = allMarginsZero ? availableWidth : Math.max(availableWidth, 100);
        const safeHeight = allMarginsZero ? availableHeight : Math.max(availableHeight, 50);

        console.log(`   ✅ Area testo FINALE: ${safeWidth}x${safeHeight}px (tutti margini zero: ${allMarginsZero})`);

        return {
            width: safeWidth,
            height: safeHeight,
            effectiveMargins: {
                top: marginTop,
                bottom: marginBottom,
                left: marginLeft,
                right: marginRight
            }
        };
    }

    // Algoritmo per ridimensionare automaticamente il testo per riempire l'area disponibile
    autoResizeTextForArea(text, availableWidth, availableHeight, textFormat = 'normal', maxLines = 10, maxAllowedFontSize = 100) {
        if (!text || !availableWidth || !availableHeight) {
            return { fontSize: 48, wrappedText: text || '', lines: [text || ''], totalHeight: 48 };
        }

        // Parametri di ricerca
        let minFontSize = 12;
        let maxFontSize = maxAllowedFontSize; // Usa il parametro come limite superiore
        let bestFontSize = minFontSize;
        let bestWrappedText = text;
        let bestLines = [text];
        let bestTotalHeight = 0;
        let bestFillRatio = 0;

        console.log(`🔍 Inizio ottimizzazione font size per area ${availableWidth}x${availableHeight} - Testo: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

        // Ricerca binaria per trovare la dimensione ottimale
        while (maxFontSize - minFontSize > 1) {
            const testFontSize = Math.floor((minFontSize + maxFontSize) / 2);

            // Calcola metriche per questa dimensione
            const metrics = this.calculateTextMetrics(text, testFontSize, textFormat);
            const maxCharsPerLine = Math.floor(availableWidth / metrics.avgCharWidth);

            if (maxCharsPerLine < 1) {
                maxFontSize = testFontSize - 1;
                continue;
            }

            // Applica il wrapping
            const wrappedText = this.wrapText(text, maxCharsPerLine, maxLines);
            const lines = wrappedText.split('\\n');
            const totalHeight = lines.length * metrics.lineHeight;

            if (totalHeight <= availableHeight && lines.length <= maxLines) {
                // Il testo entra nell'area - questo è un candidato valido
                const fillRatio = (totalHeight / availableHeight) * (Math.min(availableWidth, this.getMaxLineWidth(lines, metrics.avgCharWidth)) / availableWidth);

                if (fillRatio > bestFillRatio) {
                    bestFontSize = testFontSize;
                    bestWrappedText = wrappedText;
                    bestLines = lines;
                    bestTotalHeight = totalHeight;
                    bestFillRatio = fillRatio;
                }

                minFontSize = testFontSize; // Prova con dimensioni più grandi
            } else {
                maxFontSize = testFontSize - 1; // Dimensione troppo grande
            }
        }

        // Test finale con minFontSize se non abbiamo trovato nulla
        if (bestFontSize === 12) {
            const metrics = this.calculateTextMetrics(text, minFontSize, textFormat);
            const maxCharsPerLine = Math.floor(availableWidth / metrics.avgCharWidth);
            const wrappedText = this.wrapText(text, Math.max(maxCharsPerLine, 1), maxLines);
            const lines = wrappedText.split('\\n');
            const totalHeight = lines.length * metrics.lineHeight;

            bestFontSize = minFontSize;
            bestWrappedText = wrappedText;
            bestLines = lines;
            bestTotalHeight = totalHeight;
        }

        console.log(`✅ Font size ottimizzato: ${bestFontSize}px (righe: ${bestLines.length}, altezza: ${bestTotalHeight.toFixed(1)}px/${availableHeight}px, fill ratio: ${(bestFillRatio * 100).toFixed(1)}%)`);

        return {
            fontSize: bestFontSize,
            wrappedText: bestWrappedText,
            lines: bestLines,
            totalHeight: bestTotalHeight,
            fillRatio: bestFillRatio
        };
    }

    // Helper per calcolare la larghezza massima tra tutte le righe
    getMaxLineWidth(lines, avgCharWidth) {
        return Math.max(...lines.map(line => line.length * avgCharWidth));
    }

    // Metodo per sanificare il testo dall'output API
    sanitizeText(text) {
        if (!text) return text;

        console.log(`🔧 Sanificazione testo originale: "${text}"`);

        // Converte i caratteri \n letterali in veri caratteri di nuova riga
        let sanitized = text.replace(/\\n/g, '\n');

        // Rimuove eventuali doppie nuove righe eccessive (max 2 consecutive)
        sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

        // Rimuove spazi inutili attorno alle nuove righe
        sanitized = sanitized.replace(/\s*\n\s*/g, '\n');

        // Trim finale per rimuovere spazi all'inizio e alla fine
        sanitized = sanitized.trim();

        console.log(`✅ Testo sanificato: "${sanitized}"`);

        return sanitized;
    }

    // Metodo per fare l'escape del testo per FFmpeg drawtext
    escapeTextForFFmpeg(text) {
        if (!text) return text;

        console.log(`🔧 [DEBUG] INPUT: "${text}"`);

        // STEP 1: Pulizia caratteri UTF-8 corrotti
        let cleaned = text
            .replace(/Ôé¼/g, 'EUR') // Euro corrotto
            .replace(/├î/g, 'i') // î corrotto (dall'errore utente)
            .replace(/├ê/g, 'e') // ê corrotto (dall'errore utente)  
            .replace(/├¿/g, 'e') // è corrotto
            .replace(/├╣/g, 'u') // ù corrotto
            .replace(/├Ç/g, 'a') // à corrotto
            .replace(/├á/g, 'a')
            .replace(/├í/g, 'i')
            .replace(/├©/g, 'e')
            .replace(/├ù/g, 'u')
            .replace(/├â/g, 'a')
            .replace(/├ç/g, 'c')
            .replace(/├ñ/g, 'n')
            .replace(/├ô/g, 'o')
            .replace(/├«/g, 'e')
            .replace(/├¼/g, 'u')
            .replace(/├¬/g, 'i')
            .replace(/├┤/g, 'o')
            .replace(/├³/g, 'o')
            .replace(/├¡/g, 'i')
            .replace(/├¢/g, 'a')
            .replace(/€/g, 'EUR')
            .replace(/£/g, 'GBP')
            .replace(/©/g, '(C)');

        console.log(`🧹 [DEBUG] PULITO: "${cleaned}"`);

        // STEP 2: Escape caratteri speciali FFmpeg (SENZA VIRGOLETTE)
        let escaped = cleaned
            .replace(/\\/g, '\\\\') // Backslash PRIMA
            .replace(/'/g, "\\'") // Solo apostrofi 
            .replace(/:/g, '\\:') // Due punti
            .replace(/\[/g, '\\[') // Parentesi quadre
            .replace(/\]/g, '\\]')
            .replace(/;/g, '\\;') // Punto e virgola
            .replace(/,/g, '\\,'); // Virgola

        console.log(`🔒 [DEBUG] OUTPUT: "${escaped}"`);

        // Verifica finale
        const stillProblematic = ['├î', '├ê', '├¿', '├╣', 'Ôé¼'];
        let hasIssues = false;

        stillProblematic.forEach(chars => {
            if (escaped.includes(chars)) {
                console.log(`❌ ERRORE: "${chars}" ancora presente!`);
                hasIssues = true;
            }
        });

        if (!hasIssues) {
            console.log(`✅ [SUCCESS] Testo pulito per FFmpeg`);
        }

        return escaped;
    }

    // Metodo per formattare il testo secondo le preferenze utente
    formatText(text, formatType) {
            if (!text || !formatType || formatType === 'normal') {
                return text;
            }

            switch (formatType) {
                case 'uppercase':
                    return text.toUpperCase();
                case 'lowercase':
                    return text.toLowerCase();
                case 'capitalize':
                    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
                case 'title':
                    return text.replace(/\w\S*/g, (txt) =>
                        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                    );
                default:
                    return text;
            }
        } // Aggiunto metodo per pulire tutte le cartelle all'inizio
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

    findFFprobePath() {
        // Prova diversi percorsi per FFprobe (di solito nella stessa cartella di FFmpeg)
        const possiblePaths = [
            'ffprobe', // Se è nel PATH
            path.join(__dirname, 'node_modules', 'ffmpeg-static', 'ffprobe.exe'),
            path.join(__dirname, 'ffmpeg', 'ffprobe.exe'),
            'C:\\ffmpeg\\bin\\ffprobe.exe'
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

    async getAudioDuration(audioPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = spawn(this.ffprobePath, [
                '-v', 'error',
                '-select_streams', 'a:0',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
                audioPath
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
                        reject(new Error('Durata audio non valida'));
                    } else {
                        resolve(duration);
                    }
                } else {
                    reject(new Error(`FFprobe fallito per audio: ${errorOutput || 'Errore sconosciuto'}`));
                }
            });

            ffprobe.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error('FFprobe non trovato. Assicurati che FFmpeg sia installato e nel PATH.'));
                } else {
                    reject(new Error(`Errore nell'esecuzione FFprobe per audio: ${error.message}`));
                }
            });
        });
    }

    // Seleziona audio di sostituzione appropriato per il video
    async selectReplacementAudio(audioFolderPath, videoDuration, videoFilename = null) {
        try {
            const fs = require('fs').promises;
            const path = require('path'); // Sposta require all'inizio
            const audioFiles = await fs.readdir(audioFolderPath);
            const supportedExtensions = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.ogg'];
            
            // Filtra solo file audio supportati
            const validAudioFiles = audioFiles.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return supportedExtensions.includes(ext);
            });

            if (validAudioFiles.length === 0) {
                console.log('🔄 Nessun file audio trovato nella cartella');
                return null;
            }

            console.log(`🔄 Trovati ${validAudioFiles.length} file audio nella cartella`);

            // Inizializza tracciamento se non esiste
            if (!this.usedAudioFiles) {
                this.usedAudioFiles = new Set();
            }

            // Log dello stato corrente del tracciamento
            if (this.usedAudioFiles.size > 0) {
                console.log(`📊 Audio già utilizzati: ${Array.from(this.usedAudioFiles).join(', ')}`);
            } else {
                console.log(`📊 Nessun audio ancora utilizzato`);
            }

            // Prima passata: cerca audio non ancora usati che durano almeno quanto il video
            const unusedAudio = validAudioFiles.filter(audioFile => 
                !this.usedAudioFiles.has(audioFile)
            );

            let suitableAudio = [];
            let usedUnusedAudio = false; // Flag per sapere se abbiamo usato audio non usati
            
            // Ottieni durata per ogni audio non usato
            for (const audioFile of unusedAudio) {
                try {
                    const audioPath = path.join(audioFolderPath, audioFile);
                    const audioDuration = await this.getAudioDuration(audioPath);
                    
                    if (audioDuration >= videoDuration) {
                        suitableAudio.push({
                            file: audioFile,
                            path: audioPath,
                            duration: audioDuration
                        });
                        usedUnusedAudio = true;
                    }
                } catch (error) {
                    console.warn(`⚠️ Errore nell'ottenere durata audio ${audioFile}:`, error);
                }
            }

            // Se non ci sono audio non usati sufficienti, riusa quelli già usati
            if (suitableAudio.length === 0) {
                console.log('🔄 Tutti gli audio non usati sono troppo corti, riuso audio già utilizzati...');
                
                for (const audioFile of validAudioFiles) {
                    try {
                        const audioPath = path.join(audioFolderPath, audioFile);
                        const audioDuration = await this.getAudioDuration(audioPath);
                        
                        if (audioDuration >= videoDuration) {
                            suitableAudio.push({
                                file: audioFile,
                                path: audioPath,
                                duration: audioDuration
                            });
                        }
                    } catch (error) {
                        console.warn(`⚠️ Errore nell'ottenere durata audio ${audioFile}:`, error);
                    }
                }
            }

            if (suitableAudio.length === 0) {
                console.log('⚠️ Nessun audio ha durata sufficiente per il video');
                return null;
            }

            // Scegli casualmente un audio tra quelli disponibili
            const randomIndex = Math.floor(Math.random() * suitableAudio.length);
            const selectedAudio = suitableAudio[randomIndex];
            
            // Segna come usato
            this.usedAudioFiles.add(selectedAudio.file);
            
            console.log(`✅ Audio selezionato: ${selectedAudio.file} (durata: ${selectedAudio.duration}s per video di ${videoDuration}s)`);
            console.log(`🎲 Scelto casualmente ${randomIndex + 1}/${suitableAudio.length} da audio ${usedUnusedAudio ? 'non usati' : 'già usati'}`);
            console.log(`📊 Audio già utilizzati: ${Array.from(this.usedAudioFiles).join(', ')}`);
            
            return selectedAudio;

        } catch (error) {
            console.error('❌ Errore nella selezione audio di sostituzione:', error);
            return null;
        }
    }

    // Taglia l'audio alla durata esatta del video
    async cropAudioToVideoDuration(inputAudioPath, outputAudioPath, videoDuration) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, [
                '-i', inputAudioPath,
                '-t', videoDuration.toString(), // Durata esatta del video
                '-c:a', 'pcm_s16le', // Codec audio non compresso per qualità
                '-ar', '44100', // Sample rate standard
                '-ac', '2', // Stereo
                '-y', outputAudioPath
            ]);

            let errorOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✂️ Audio tagliato a ${videoDuration}s: ${outputAudioPath}`);
                    resolve();
                } else {
                    reject(new Error(`Errore nel taglio audio: ${errorOutput}`));
                }
            });

            ffmpeg.on('error', (error) => {
                reject(new Error(`Errore nell'esecuzione FFmpeg per taglio audio: ${error.message}`));
            });
        });
    }

    // Reset della lista degli audio usati (chiamato ad ogni nuova elaborazione)
    resetUsedAudioFiles() {
        this.usedAudioFiles = new Set();
        console.log('🔄 Lista audio utilizzati resettata');
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

    // ===============================
    // METODI AUDIO OTTIMIZZATI CON SOX
    // ===============================

    // Metodo OTTIMIZZATO per preprocessare l'audio con SOX (molto più veloce di FFmpeg)
    async preprocessAudioWithSox(config, inputVideoPath, tempDir, videoFilename = null) {
        console.log(`🎵 Preprocessing audio con SOX - MODALITÀ VELOCE`);

        let finalAudioPath = null;

        // Determina se servono modifiche audio
        const hasVolumeChange = config && config.videoVolume && config.videoVolume !== 0;
        const hasBackgroundAudio = config && config.backgroundAudioEnabled && config.backgroundAudioPath;
        const hasSpeedChange = config && config.videoSpeed && config.videoSpeed >= 0.5 && config.videoSpeed <= 2.0;
        const hasAudioReplacement = config && config.replaceAudioEnabled && config.replaceAudioFolderPath;

        console.log(`🔍 DEBUG PREPROCESSING AUDIO:`, {
            hasVolumeChange,
            hasBackgroundAudio, 
            hasSpeedChange,
            hasAudioReplacement,
            replaceAudioEnabled: config?.replaceAudioEnabled,
            replaceAudioFolderPath: config?.replaceAudioFolderPath
        });

        if (!hasVolumeChange && !hasBackgroundAudio && !hasSpeedChange && !hasAudioReplacement) {
            console.log(`📋 Nessuna modifica audio necessaria - skip preprocessing`);
            return null; // Usa audio originale
        }

        try {
            let processedAudioPath = null;

            // 🔄 STEP 1: SOSTITUZIONE AUDIO (se abilitata) - PRIMA DI TUTTO
            if (hasAudioReplacement) {
                console.log(`🔄 Sostituzione audio abilitata...`);
                
                // Ottieni durata video
                const videoDuration = await this.getVideoDuration(inputVideoPath);
                console.log(`📏 Durata video: ${videoDuration}s`);
                
                // Scegli audio sostitutivo
                const selectedAudio = await this.selectReplacementAudio(config.replaceAudioFolderPath, videoDuration, videoFilename);
                
                if (selectedAudio) {
                    console.log(`✅ Audio selezionato: ${selectedAudio.file} (${selectedAudio.duration}s)`);
                    
                    // Taglia l'audio alla durata del video
                    const replacementAudioPath = path.join(tempDir, 'replacement_audio.wav');
                    await this.cropAudioToVideoDuration(selectedAudio.path, replacementAudioPath, videoDuration);
                    processedAudioPath = replacementAudioPath;
                    
                    console.log(`🔄 Audio sostituito con successo: ${selectedAudio.file}`);
                    
                    // Se la sostituzione audio è l'unica modifica (senza volume, background o speed), return direttamente
                    if (!hasVolumeChange && !hasBackgroundAudio && !hasSpeedChange) {
                        console.log(`✅ Solo sostituzione audio richiesta - skip ulteriore processing SOX`);
                        return processedAudioPath;
                    }
                    
                    console.log(`🔧 Audio sostituito, continuando con ulteriori modifiche (volume: ${hasVolumeChange ? config.videoVolume + 'dB' : 'no'}, background: ${hasBackgroundAudio ? 'sì' : 'no'}, speed: ${hasSpeedChange ? 'sì' : 'no'})`);
                } else {
                    console.log(`⚠️ Nessun audio compatibile trovato, mantengo audio originale`);
                    // Estrai audio originale come fallback
                    const originalAudioPath = path.join(tempDir, 'original_audio.wav');
                    await this.extractAudioFast(inputVideoPath, originalAudioPath);
                    processedAudioPath = originalAudioPath;
                }
            } else {
                // ESTRAZIONE AUDIO ORIGINALE VELOCE
                const originalAudioPath = path.join(tempDir, 'original_audio.wav');
                await this.extractAudioFast(inputVideoPath, originalAudioPath);
                console.log(`📤 Audio originale estratto: ${originalAudioPath}`);
                processedAudioPath = originalAudioPath;
            }

            // 2. MODIFICA VOLUME PRINCIPALE CON SOX (molto più veloce)
            if (hasVolumeChange) {
                const volumeAudioPath = path.join(tempDir, 'volume_adjusted.wav');
                await this.adjustVolumeWithSox(processedAudioPath, volumeAudioPath, config.videoVolume);
                processedAudioPath = volumeAudioPath;
                console.log(`🔊 Volume regolato con SOX: ${config.videoVolume}dB`);
            }

            // 3. MIX CON AUDIO DI SOTTOFONDO (se presente)
            if (hasBackgroundAudio) {
                const bgProcessedPath = path.join(tempDir, 'bg_processed.wav');
                const mixedAudioPath = path.join(tempDir, 'mixed_audio.wav');

                // Prima regola il volume del background audio
                if (config.backgroundAudioVolume && config.backgroundAudioVolume !== 0) {
                    await this.adjustVolumeWithSox(config.backgroundAudioPath, bgProcessedPath, config.backgroundAudioVolume);
                } else {
                    // Copia il file senza modifiche
                    await this.copyAudioFile(config.backgroundAudioPath, bgProcessedPath);
                }

                // Poi mixa i due audio con SOX (molto più efficiente)
                await this.mixAudioWithSox(processedAudioPath, bgProcessedPath, mixedAudioPath);
                processedAudioPath = mixedAudioPath;
                console.log(`🎵 Audio mixati con SOX`);
            }

            // 4. VELOCITÀ AUDIO (con sox se possibile)
            if (hasSpeedChange) {
                const speedAudioPath = path.join(tempDir, 'speed_adjusted.wav');
                await this.changeSpeedWithSox(processedAudioPath, speedAudioPath, config.videoSpeed);
                processedAudioPath = speedAudioPath;
                console.log(`⚡ Velocità audio regolata con SOX: ${config.videoSpeed}x`);
            }

            console.log(`✅ Audio preprocessing completato: ${processedAudioPath}`);
            return processedAudioPath;

        } catch (error) {
            console.error(`❌ Errore nel preprocessing audio con SOX: ${error.message}`);
            console.log(`🔄 Fallback su elaborazione FFmpeg tradizionale`);
            
            // Se la sostituzione audio è riuscita ma SOX ha fallito, applica modifiche con FFmpeg
            if (hasAudioReplacement) {
                const replacementAudioPath = path.join(tempDir, 'replacement_audio.wav');
                if (fsSync.existsSync(replacementAudioPath)) {
                    console.log(`✅ Fallback: audio sostitutivo trovato, applicando modifiche con FFmpeg`);
                    
                    // Se c'è anche modifica volume, applicala con FFmpeg
                    if (hasVolumeChange) {
                        const volumeAdjustedPath = path.join(tempDir, 'fallback_volume_adjusted.wav');
                        try {
                            await this.adjustVolumeWithFFmpeg(replacementAudioPath, volumeAdjustedPath, config.videoVolume);
                            console.log(`🔊 Volume applicato con FFmpeg fallback: ${config.videoVolume}dB`);
                            return volumeAdjustedPath;
                        } catch (volumeError) {
                            console.warn(`⚠️ Errore applicazione volume fallback: ${volumeError.message}`);
                            return replacementAudioPath; // Ritorna almeno l'audio sostituito
                        }
                    }
                    
                    console.log(`✅ Fallback: restituisco audio sostitutivo: ${replacementAudioPath}`);
                    return replacementAudioPath;
                }
            }
            
            return null;
        }
    }

    // Estrazione audio veloce con FFmpeg ottimizzato
    async extractAudioFast(inputVideoPath, outputAudioPath) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, [
                '-i', inputVideoPath,
                '-vn', // No video
                '-acodec', 'pcm_s16le', // Audio non compresso per elaborazione veloce
                '-ar', '44100', // Sample rate standard
                '-ac', '2', // Stereo
                '-y', outputAudioPath
            ]);

            let errorOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Error') || output.includes('failed')) {
                    errorOutput += output;
                }
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(outputAudioPath);
                } else {
                    reject(new Error(`Estrazione audio fallita: ${errorOutput}`));
                }
            });

            ffmpeg.on('error', (error) => {
                reject(new Error(`FFmpeg error: ${error.message}`));
            });
        });
    }

    // Regolazione volume con SOX (molto più veloce di FFmpeg)
    async adjustVolumeWithSox(inputPath, outputPath, volumeDb) {
        return new Promise((resolve, reject) => {
            const job = sox();

            job.input(inputPath)
                .output(outputPath)
                .audioFilter('vol', volumeDb + 'dB') // Applica volume in dB
                .run((err, stdout, stderr) => {
                    if (err) {
                        console.error(`SOX volume error: ${err.message}`);
                        reject(err);
                    } else {
                        console.log(`✅ SOX volume adjustment completato: ${volumeDb}dB`);
                        resolve(outputPath);
                    }
                });
        });
    }

    // Regolazione volume con FFmpeg (fallback quando SOX non funziona)
    async adjustVolumeWithFFmpeg(inputPath, outputPath, volumeDb) {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, [
                '-i', inputPath,
                '-af', `volume=${volumeDb}dB`, // Filtro audio volume
                '-c:a', 'pcm_s16le', // Codec audio non compresso
                '-ar', '44100', // Sample rate standard
                '-ac', '2', // Stereo
                '-y', outputPath
            ]);

            let errorOutput = '';
            
            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    console.log(`✅ FFmpeg volume adjustment completato: ${volumeDb}dB`);
                    resolve(outputPath);
                } else {
                    const error = new Error(`FFmpeg volume adjustment fallito: ${errorOutput}`);
                    console.error(`❌ FFmpeg volume error: ${error.message}`);
                    reject(error);
                }
            });

            ffmpeg.on('error', (error) => {
                console.error(`❌ FFmpeg volume spawn error: ${error.message}`);
                reject(error);
            });
        });
    }

    // Mix audio con SOX (molto più efficiente di FFmpeg)
    async mixAudioWithSox(mainAudioPath, bgAudioPath, outputPath) {
        return new Promise((resolve, reject) => {
            const job = sox();

            job.input([mainAudioPath, bgAudioPath]) // Input multipli
                .output(outputPath)
                .audioFilter('mix') // Mix automatico
                .run((err, stdout, stderr) => {
                    if (err) {
                        console.error(`SOX mix error: ${err.message}`);
                        reject(err);
                    } else {
                        console.log(`✅ SOX audio mix completato`);
                        resolve(outputPath);
                    }
                });
        });
    }

    // Cambio velocità con SOX
    async changeSpeedWithSox(inputPath, outputPath, speedFactor) {
        return new Promise((resolve, reject) => {
            const job = sox();

            job.input(inputPath)
                .output(outputPath)
                .audioFilter('speed', speedFactor) // Cambio velocità
                .run((err, stdout, stderr) => {
                    if (err) {
                        console.error(`SOX speed error: ${err.message}`);
                        reject(err);
                    } else {
                        console.log(`✅ SOX speed change completato: ${speedFactor}x`);
                        resolve(outputPath);
                    }
                });
        });
    }

    // Copia file audio senza modifiche
    async copyAudioFile(inputPath, outputPath) {
        try {
            await fs.copyFile(inputPath, outputPath);
            console.log(`📋 File audio copiato: ${path.basename(outputPath)}`);
            return outputPath;
        } catch (error) {
            throw new Error(`Errore nella copia del file audio: ${error.message}`);
        }
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

        console.log(`🎬 Elaborazione video: ${outputFile}`);
        console.log(`🔧 Config ricevuto:`, config);

        // Prima sanifica il testo per gestire \n e altri caratteri di escape
        let sanitizedText = this.sanitizeText(aiResponse.meme_text);

        // Poi applica la formattazione del testo se specificata nella configurazione
        let formattedText = sanitizedText;
        if (config && config.textFormat) {
            formattedText = this.formatText(sanitizedText, config.textFormat);
            console.log(`📝 Testo originale: "${aiResponse.meme_text}"`);
            console.log(`🔄 Formato applicato: ${config.textFormat}`);
            console.log(`📝 Testo formattato: "${formattedText}"`);
        }

        // Crea una copia dell'oggetto aiResponse con il testo formattato
        const processedAiResponse = {...aiResponse, meme_text: formattedText };

        console.log(`🎬 Processamento video: ${outputFile}`);
        console.log(`📍 Posizione banner: ${processedAiResponse.banner_position}`);
        console.log(`📝 Testo meme: ${processedAiResponse.meme_text}`);

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
        let inputVideoPath = path.join(__dirname, 'INPUT', originalVideoName);
        try {
            await fs.access(inputVideoPath);
        } catch (error) {
            throw new Error(`Video non trovato: ${inputVideoPath}`);
        }

        // RIMOZIONE PRIMO FRAME NERO - PROCESSO SEMPLICE
        let tempVideoForCleanup = null;
        if (config && config.removeBlackFrameEnabled) {
            console.log(`🎞️ Rimozione primo frame nero: ABILITATA`);
            const processedVideoPath = await this.removeFirstFrameIfBlack(inputVideoPath);
            if (processedVideoPath !== inputVideoPath) {
                inputVideoPath = processedVideoPath;
                tempVideoForCleanup = processedVideoPath; // Per cleanup finale
            }
        } else {
            console.log(`🎞️ Rimozione primo frame nero: DISABILITATA`);
        }

        // APPLICAZIONE TUTTE LE MODIFICHE VIDEO PRIMA DEL TESTO
        console.log(`🎨 === FASE 1: APPLICAZIONE MODIFICHE VIDEO ===`);
        const videoModificationsResult = await this.applyVideoModifications(inputVideoPath, config);

        if (videoModificationsResult.processedVideoPath !== inputVideoPath) {
            // Se è stato creato un nuovo video modificato, aggiorna il path
            if (tempVideoForCleanup) {
                // Marca il vecchio video temporaneo per pulizia
                await fs.unlink(tempVideoForCleanup).catch(() => {});
            }
            inputVideoPath = videoModificationsResult.processedVideoPath;
            tempVideoForCleanup = videoModificationsResult.processedVideoPath; // Per cleanup finale
        }

        console.log(`🎨 === FASE 2: APPLICAZIONE TESTO E BANNER ===`);

        // Il video finale va nella cartella OUTPUT con nome basato sul video originale
        const outputVideoBaseName = this.generateVideoBasedName(originalVideoName);
        const outputVideoPath = path.join(__dirname, 'OUTPUT', `${outputVideoBaseName}_meme_${Date.now()}.mp4`);

        console.log(`🎬 Processamento video: ${originalVideoName}`);
        console.log(`📍 Posizione banner: ${processedAiResponse.banner_position}`);
        console.log(`📝 Testo meme: ${processedAiResponse.meme_text}`);

        // Ottieni informazioni del video
        const videoInfo = await this.getVideoInfo(inputVideoPath);
        const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
        
        if (!videoStream) {
            throw new Error(`Nessun stream video trovato in: ${inputVideoPath}`);
        }
        
        const width = videoStream.width;
        const height = videoStream.height;

        console.log(`📺 Dimensioni video: ${width}x${height}`);

        // Colore testo
        const textColor = 'black';

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

        // SOLUZIONE FONT PATH: Copia font in directory senza spazi se necessario
        let workingFontPath = fontPath;
        let fontNeedsCopy = fontPath.includes(' ') || fontPath.includes('\\');

        if (fontNeedsCopy) {
            console.log(`⚠️ Font path contiene spazi/caratteri complessi: ${fontPath}`);

            // Crea un nome file semplice per il font (SENZA SPAZI nel path)
            const fs = require('fs');
            const path = require('path');
            const fontName = path.basename(fontPath).replace(/\s+/g, '_'); // Rimuovi spazi
            const tempFontPath = `temp_${fontName}`; // Path relativo

            try {
                // Copia il font nella directory principale con path relativo
                fs.copyFileSync(fontPath, tempFontPath);
                workingFontPath = tempFontPath;
                console.log(`📋 Font copiato temporaneamente in: ${workingFontPath}`);
            } catch (error) {
                console.log(`❌ Errore nella copia del font: ${error.message}`);
                console.log(`🔄 Uso font di sistema senza fontfile`);
                workingFontPath = null; // Usa font di sistema
            }
        }

        // Prepara il percorso font per FFmpeg
        let escapedFontPath = '';
        if (workingFontPath) {
            // Usa forward slashes per compatibilità FFmpeg (SENZA virgolette)
            const normalizedPath = workingFontPath.replace(/\\/g, '/');
            escapedFontPath = `:fontfile=${normalizedPath}`;
            console.log(`🎨 Font file configurato: ${normalizedPath}`);
        } else {
            console.log('🎨 Utilizzo font di sistema per compatibilità FFmpeg Windows');
        }

        console.log(`🎨 Utilizzando font: ${selectedFont}`);
        console.log(`📂 Font path per FFmpeg: ${workingFontPath || 'Font di sistema'}`);
        console.log(`📂 Font parameter: ${escapedFontPath}`);

        // DIMENSIONAMENTO AUTOMATICO: Adatta blocco e testo alla risoluzione del video

        // Calcola le dimensioni ottimali del blocco bianco in base alla risoluzione
        const blockDimensions = this.calculateBlockDimensions(width, height, config && config.blockHeight);
        const blockWidth = blockDimensions.width;
        const blockHeight = blockDimensions.height;
        const bannerX = blockDimensions.x; // AGGIUNTO: posizione X del banner

        // Ottieni margini dalla configurazione (gestisce correttamente il valore 0)
        const marginTop = (config && config.marginTop !== undefined) ? config.marginTop : 30;
        const marginBottom = (config && config.marginBottom !== undefined) ? config.marginBottom : 30;
        const marginLeft = (config && config.marginLeft !== undefined) ? config.marginLeft : 40;
        const marginRight = (config && config.marginRight !== undefined) ? config.marginRight : 40;

        console.log(`🔧 MARGINI DA CONFIG:`, {
            marginTop: config && config.marginTop,
            marginBottom: config && config.marginBottom,
            marginLeft: config && config.marginLeft,
            marginRight: config && config.marginRight
        });
        console.log(`🔧 MARGINI FINALI UTILIZZATI: T=${marginTop}, B=${marginBottom}, L=${marginLeft}, R=${marginRight}`);

        const margins = { marginTop, marginBottom, marginLeft, marginRight };

        // Calcola l'area disponibile per il testo
        const textArea = this.calculateAvailableTextArea(blockWidth, blockHeight, margins);

        console.log(`🎨 Configurazione - Blocco: ${blockWidth}x${blockHeight}px @ X=${bannerX}, Margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);
        console.log(`📏 Area testo disponibile: ${textArea.width}x${textArea.height}px`);

        // Se l'utente ha specificato una font-size, usala come preferenza ma controlla se entra
        let useAutoResize = true;
        let fontSize, wrappedText, lines, totalTextHeight, lineHeight; // AGGIUNTO lineHeight qui per evitare conflitti

        if (config && config.fontSize) {
            const userFontSize = config.fontSize;
            console.log(`👤 Font size specificata dall'utente: ${userFontSize}px - Verifico se entra nell'area...`);

            // Testa se la font-size dell'utente entra nell'area
            const testMetrics = this.calculateTextMetrics(processedAiResponse.meme_text, userFontSize, config.textFormat);
            const maxCharsPerLine = Math.floor(textArea.width / testMetrics.avgCharWidth);
            const testWrappedText = this.wrapText(processedAiResponse.meme_text, maxCharsPerLine, 10);
            const testLines = testWrappedText.split('\\n');
            const testTotalHeight = testLines.length * testMetrics.lineHeight;

            if (testTotalHeight <= textArea.height && testLines.length <= 10 && maxCharsPerLine > 0) {
                // La font-size dell'utente entra - usala
                fontSize = userFontSize;
                wrappedText = testWrappedText;
                lines = testLines;
                totalTextHeight = testTotalHeight;
                useAutoResize = false;

                console.log(`✅ Font size utente OK: ${userFontSize}px (${lines.length} righe, altezza: ${totalTextHeight.toFixed(1)}px)`);
            } else {
                console.log(`⚠️ Font size utente troppo grande: ${userFontSize}px -> Uso ridimensionamento automatico`);
            }
        }

        if (useAutoResize) {
            // Calcola automaticamente la dimensione ottimale del testo
            const autoSizeResult = this.autoResizeTextForArea(
                processedAiResponse.meme_text,
                textArea.width,
                textArea.height,
                config && config.textFormat,
                10, // max 10 righe
                150 // aumentato limite massimo font size da 100 a 150px
            );

            fontSize = autoSizeResult.fontSize;
            wrappedText = autoSizeResult.wrappedText;
            lines = autoSizeResult.lines;
            totalTextHeight = autoSizeResult.totalHeight;

            console.log(`🤖 Dimensionamento automatico: ${fontSize}px (fill ratio: ${(autoSizeResult.fillRatio * 100).toFixed(1)}%)`);
        }

        console.log(`📊 RIEPILOGO DIMENSIONAMENTO:`);
        console.log(`   📺 Video: ${width}x${height}px`);
        console.log(`   📐 Blocco: ${blockWidth}x${blockHeight}px`);
        console.log(`   📏 Area testo: ${textArea.width}x${textArea.height}px`);
        console.log(`   📝 Font size: ${fontSize}px`);
        console.log(`   📝 Righe: ${lines.length}`);
        console.log(`   📝 Altezza testo: ${totalTextHeight.toFixed(1)}px`);

        // Ricalcola line height con la font size finale
        const finalMetrics = this.calculateTextMetrics(processedAiResponse.meme_text, fontSize, config && config.textFormat);
        lineHeight = finalMetrics.lineHeight; // RIMOSSA la dichiarazione const per evitare conflitti

        // 🎯 FUNZIONALITÀ "TRASFORMA IN 1920" - Calcolo posizione ottimale del banner
        let originalBannerPosition = processedAiResponse.banner_position;
        let optimizedBannerPosition = originalBannerPosition;
        let optimizedHeight = height;

        if (config && config.transformTo1920Enabled) {
            console.log(`📐 === TRASFORMA IN 1920 ATTIVATA ===`);
            console.log(`📏 Altezza video attuale: ${height}px`);
            console.log(`📏 Altezza blocco: ${blockHeight}px`);
            console.log(`📍 Posizione originale AI: ${originalBannerPosition}`);

            const TARGET_HEIGHT = 1920;

            if (height >= TARGET_HEIGHT) {
                console.log(`✅ Video già >= ${TARGET_HEIGHT}px - mantieni posizione AI: ${originalBannerPosition}`);
                optimizedBannerPosition = originalBannerPosition;
            } else {
                // Calcola se il video + blocco può raggiungere 1920px
                const totalWithBlock = height + blockHeight;

                if (totalWithBlock >= TARGET_HEIGHT) {
                    // Può raggiungere 1920px - calcola posizione ottimale
                    const excessHeight = totalWithBlock - TARGET_HEIGHT;

                    if (originalBannerPosition === 'bottom') {
                        // Banner in basso - sposta il banner verso l'alto per raggiungere esattamente 1920px
                        const optimalBannerY = TARGET_HEIGHT - blockHeight;
                        console.log(`🎯 Banner BOTTOM ottimizzato: Y=${optimalBannerY} (era ${height - blockHeight})`);
                        optimizedBannerPosition = 'bottom';
                        optimizedHeight = TARGET_HEIGHT;
                    } else {
                        // Banner in alto - il video finale sarà esattamente 1920px
                        console.log(`🎯 Banner TOP ottimizzato: video finale = ${TARGET_HEIGHT}px`);
                        optimizedBannerPosition = 'top';
                        optimizedHeight = TARGET_HEIGHT;
                    }
                } else {
                    // Non può raggiungere 1920px - massimizza comunque
                    console.log(`⚠️ Video + blocco = ${totalWithBlock}px < ${TARGET_HEIGHT}px - massimizza comunque`);
                    console.log(`🎯 Posizione scelta: ${originalBannerPosition} (da AI) - altezza finale: ${totalWithBlock}px`);
                    optimizedBannerPosition = originalBannerPosition;
                    optimizedHeight = totalWithBlock;
                }
            }

            console.log(`🎯 DECISIONE FINALE:`);
            console.log(`   📍 Posizione: ${optimizedBannerPosition}`);
            console.log(`   📏 Altezza finale: ${optimizedHeight}px`);
            console.log(`📐 === FINE TRASFORMA IN 1920 ===`);
        }

        // POSIZIONAMENTO BANNER (usando la posizione ottimizzata)
        let textFilters = '';
        let baseY;

        if (optimizedBannerPosition === 'bottom') {
            let bannerY;

            if (config && config.transformTo1920Enabled && optimizedHeight === 1920) {
                // Modalità 1920: posiziona il banner per raggiungere esattamente 1920px
                bannerY = 1920 - blockHeight;
            } else {
                // Modalità normale: banner in fondo al video
                bannerY = height - blockHeight;
            }

            // CORREZIONE MARGINI: Il testo deve iniziare ESATTAMENTE dal marginTop
            baseY = bannerY + marginTop; // Il testo inizia esattamente dal margine superiore

            // CORREZIONE FONDAMENTALE: Usa bannerX per centrare il banner nel video
            textFilters = `[0:v]drawbox=x=${bannerX}:y=${bannerY}:w=${blockWidth}:h=${blockHeight}:color=white:t=fill`;
            console.log(`📍 BANNER BOTTOM - X: ${bannerX}, Y: ${bannerY}, size: ${blockWidth}x${blockHeight}px, baseY testo: ${baseY}`);

        } else {
            // CORREZIONE MARGINI: Banner in alto - testo inizia ESATTAMENTE dal marginTop
            baseY = marginTop; // Il testo inizia esattamente dal margine superiore

            // CORREZIONE FONDAMENTALE: Usa bannerX per centrare il banner nel video
            textFilters = `[0:v]drawbox=x=${bannerX}:y=0:w=${blockWidth}:h=${blockHeight}:color=white:t=fill`;
            console.log(`📍 BANNER TOP - X: ${bannerX}, Y: 0, size: ${blockWidth}x${blockHeight}px, baseY testo: ${baseY}`);
        }

        // Aggiungi ogni riga con posizionamento preciso secondo i margini
        // LOOP con gestione dinamica del font size
        let validPositioning = false;
        let attemptCount = 0;
        const maxAttempts = 10;

        while (!validPositioning && attemptCount < maxAttempts) {
            attemptCount++;
            validPositioning = true; // Assume che andrà bene

            console.log(`\n🔄 Tentativo ${attemptCount}: font ${fontSize}px, ${lines.length} righe`);

            for (let i = 0; i < lines.length; i++) {
                // CORREZIONE COMPLETA ESCAPE: gestisce tutti i caratteri speciali FFmpeg
                const line = lines[i]
                    .replace(/\\/g, '\\\\') // Backslash prima di tutto
                    .replace(/'/g, "\\'") // Virgolette singole
                    .replace(/"/g, '\\"') // Virgolette doppie - CRITICO!
                    .replace(/:/g, '\\:') // Due punti
                    .replace(/=/g, '\\=') // Uguale
                    .replace(/,/g, '\\,') // Virgola
                    .replace(/\[/g, '\\[') // Parentesi quadre aperte
                    .replace(/\]/g, '\\]') // Parentesi quadre chiuse
                    .replace(/\(/g, '\\(') // Parentesi tonde aperte
                    .replace(/\)/g, '\\)') // Parentesi tonde chiuse
                    .replace(/;/g, '\\;'); // Punto e virgola

                // CALCOLO SPAZIATURA UNIFORME: Distribuisce le righe uniformemente nell'area disponibile
                let yPos;
                if (lines.length === 1) {
                    // Una sola riga: centrata verticalmente nell'area disponibile
                    yPos = Math.round(baseY + ((textArea.height - fontSize) / 2));
                } else {
                    // Più righe: distribuisce uniformemente nell'area disponibile
                    const availableSpace = textArea.height - (lines.length * fontSize);
                    const spacingBetweenLines = availableSpace / (lines.length + 1); // +1 per includere margini superiore e inferiore
                    yPos = Math.round(baseY + spacingBetweenLines + (i * (fontSize + spacingBetweenLines)));
                }

                // BOUNDARY CHECK CORRETTO: Verifica che la riga non esca dai limiti del banner
                const bannerTopY = (processedAiResponse.banner_position === 'bottom') ? height - blockHeight : 0;
                const bannerBottomY = (processedAiResponse.banner_position === 'bottom') ? height : blockHeight;

                // Limiti effettivi considerando i margini
                const minAllowedY = bannerTopY + marginTop;
                const maxAllowedY = bannerBottomY - marginBottom - fontSize; // Sottrai fontSize per evitare che il testo esca dal banner

                if (yPos < minAllowedY || yPos > maxAllowedY) {
                    console.warn(`⚠️ OVERFLOW RILEVATO! Riga ${i + 1} a Y=${yPos} eccede i limiti del banner [${minAllowedY}-${maxAllowedY}]`);

                    // Se il testo eccede e possiamo ridurre il font, fallo
                    if (fontSize > 12) {
                        console.log(`🔄 Tentativo di riduzione font size da ${fontSize}px a ${fontSize-2}px`);

                        // Riduci font size
                        const newFontSize = fontSize - 2;
                        const newLineHeight = newFontSize * 1.2;
                        fontSize = newFontSize;
                        lineHeight = newLineHeight;

                        // Ricalcola il testo con la nuova font size
                        const newAutoSizeResult = this.autoResizeTextForArea(
                            processedAiResponse.meme_text,
                            textArea.width,
                            textArea.height,
                            config && config.textFormat,
                            10,
                            150 // aumentato limite massimo font size
                        );

                        // Aggiorna tutte le variabili
                        wrappedText = newAutoSizeResult.wrappedText;
                        lines = newAutoSizeResult.lines;
                        totalTextHeight = newAutoSizeResult.totalHeight;

                        // Ricalcola il baseY con il nuovo font size
                        if (processedAiResponse.banner_position === 'bottom') {
                            const bannerY = height - blockHeight;
                            baseY = bannerY + marginTop + (fontSize * 0.8);
                        } else {
                            baseY = marginTop + (fontSize * 0.8);
                        }

                        console.log(`📐 Nuovo font size: ${fontSize}px, lineHeight: ${lineHeight}px, baseY: ${baseY}, righe: ${lines.length}`);

                        // Reset del banner box
                        textFilters = processedAiResponse.banner_position === 'bottom' ?
                            `[0:v]drawbox=x=${bannerX}:y=${height - blockHeight}:w=${blockWidth}:h=${blockHeight}:color=white:t=fill` :
                            `[0:v]drawbox=x=${bannerX}:y=0:w=${blockWidth}:h=${blockHeight}:color=white:t=fill`;

                        validPositioning = false; // Riprova con i nuovi valori
                        break; // Esci dal loop delle righe per ricominciare
                    } else {
                        console.error(`❌ IMPOSSIBILE ADATTARE: Font troppo piccolo (${fontSize}px). Il testo non può essere adattato nei margini specificati.`);
                        validPositioning = true; // Forza l'uscita, accetta l'overflow
                        break;
                    }
                }

                // Se arriviamo qui, la riga è posizionata correttamente
                console.log(`📝 Riga ${i + 1}: "${lines[i]}" -> "${line}" -> y=${yPos} ✅`);

                // CORREZIONE CRITICA: Posizionamento X del testo
                const availableTextWidth = blockWidth - marginLeft - marginRight;
                const textAreaStartX = bannerX + marginLeft;
                const xPos = `${textAreaStartX}+((${availableTextWidth}-text_w)/2)`;

                console.log(`📏 Posizionamento X - Banner X=${bannerX}, width=${blockWidth}, margine L=${marginLeft}R=${marginRight}, area testo=${availableTextWidth}px, startX=${textAreaStartX}`);

                // Applica escape al testo per FFmpeg
                console.log(`🔧 Testo pre-escape: "${line}"`);
                const escapedLine = this.escapeTextForFFmpeg(line);
                console.log(`🔒 Testo escaped per FFmpeg: "${escapedLine}"`);

                // Construisci parametri drawtext - usa font parameter se disponibile
                textFilters += `,drawtext=text=${escapedLine}${escapedFontPath}:fontcolor=${textColor}:fontsize=${fontSize}:x=${xPos}:y=${yPos}`;
            }
        }

        if (!validPositioning) {
            console.error(`❌ FALLIMENTO: Impossibile posizionare il testo dopo ${maxAttempts} tentativi`);
        } else {
            console.log(`✅ Posizionamento completato in ${attemptCount} tentativo/i`);
        }

        console.log(`🎯 RIEPILOGO FINALE:`);
        console.log(`   📝 Testo: "${wrappedText}"`);
        console.log(`   📊 Righe: ${lines.length}`);
        console.log(`   📐 Font size: ${fontSize}px`);
        console.log(`   📐 Line height: ${lineHeight.toFixed(2)}px`);
        console.log(`   📐 Banner: ${blockWidth}x${blockHeight}px`);
        console.log(`   📏 Margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);
        console.log(`   📍 Base Y: ${baseY}`);

        // COSTRUZIONE SEMPLIFICATA DEL FILTRO COMPLEX - SOLO TESTO E BANNER
        console.log(`📝 Costruzione filtro per testo e banner bianco...`);

        // Le modifiche video sono già state applicate nella fase precedente
        // Ora serve solo aggiungere il testo e il banner bianco
        let filterComplex = textFilters + '[v1]';

        // 📐 ESTENSIONE CANVAS PER MODALITÀ 1920px
        if (config && config.transformTo1920Enabled && optimizedHeight > height) {
            // Estendi il canvas per raggiungere l'altezza ottimizzata
            const paddingNeeded = optimizedHeight - height;
            console.log(`📐 Estensione canvas: da ${height}px a ${optimizedHeight}px (+${paddingNeeded}px)`);

            if (optimizedBannerPosition === 'top') {
                // Banner in alto: aggiungi padding in basso
                filterComplex += `;[v1]pad=${width}:${optimizedHeight}:0:0:color=black[v]`;
                console.log(`📐 Padding BOTTOM: +${paddingNeeded}px (banner in alto)`);
            } else {
                // Banner in basso: aggiungi padding in alto per spingere tutto verso il basso
                filterComplex += `;[v1]pad=${width}:${optimizedHeight}:0:${paddingNeeded}:color=black[v]`;
                console.log(`📐 Padding TOP: +${paddingNeeded}px (banner in basso)`);
            }
        } else {
            // Modalità normale: nessuna estensione canvas
            filterComplex += ';[v1]null[v]';
        }

        console.log(`📋 Filtro complex finale: ${filterComplex}`);

        // Array per gli argomenti FFmpeg - SEMPLIFICATO per Fase 2
        const ffmpegArgs = ['-i', inputVideoPath];

        // Aggiungi il filtro complex per testo e banner
        ffmpegArgs.push('-filter_complex', filterComplex);
        ffmpegArgs.push('-map', '[v]');

        // CORREZIONE AUDIO: Il video inputVideoPath potrebbe avere già audio modificato dalla Fase 1
        // Quindi copiamo l'audio dal video di input della Fase 2, non dal video originale
        ffmpegArgs.push('-map', '0:a?'); // Mappa l'audio dal video di input (che potrebbe essere già processato)

        // Codec ottimizzati per Fase 2 
        ffmpegArgs.push(
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'copy' // Copia l'audio del video di input (già processato se necessario)
        );

        // Output finale
        ffmpegArgs.push('-y', outputVideoPath);

        console.log(`🎬 Comando FFmpeg completo:`, ffmpegArgs.join(' '));

        // Esegui FFmpeg per aggiungere banner e testo
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn(this.ffmpegPath, ffmpegArgs);

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
                // Cleanup font temporaneo se creato
                if (fontNeedsCopy && workingFontPath && workingFontPath !== fontPath) {
                    try {
                        const fs = require('fs');
                        fs.unlinkSync(workingFontPath);
                        console.log(`🧹 Font temporaneo rimosso: ${workingFontPath}`);
                    } catch (error) {
                        console.log(`⚠️ Impossibile rimuovere font temporaneo: ${error.message}`);
                    }
                }

                // Cleanup video temporaneo se è stato creato per rimozione frame nero
                if (tempVideoForCleanup) {
                    try {
                        const fs = require('fs');
                        fs.unlinkSync(tempVideoForCleanup);
                        console.log(`🧹 Video temporaneo (senza frame nero) rimosso: ${path.basename(tempVideoForCleanup)}`);
                    } catch (error) {
                        console.log(`⚠️ Impossibile rimuovere video temporaneo: ${error.message}`);
                    }
                }

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
                // Cleanup anche in caso di errore
                if (fontNeedsCopy && workingFontPath && workingFontPath !== fontPath) {
                    try {
                        const fs = require('fs');
                        fs.unlinkSync(workingFontPath);
                        console.log(`🧹 Font temporaneo rimosso (errore): ${workingFontPath}`);
                    } catch (err) {
                        console.log(`⚠️ Impossibile rimuovere font temporaneo (errore): ${err.message}`);
                    }
                }

                // Cleanup video temporaneo anche in caso di errore
                if (tempVideoForCleanup) {
                    try {
                        const fs = require('fs');
                        fs.unlinkSync(tempVideoForCleanup);
                        console.log(`🧹 Video temporaneo (senza frame nero) rimosso (errore): ${path.basename(tempVideoForCleanup)}`);
                    } catch (err) {
                        console.log(`⚠️ Impossibile rimuovere video temporaneo (errore): ${err.message}`);
                    }
                }

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
        let wrappedLines = [];
        let currentLine = '';

        for (const word of words) {
            // Se abbiamo già raggiunto il numero massimo di righe, interrompi
            if (wrappedLines.length >= maxLines - 1) {
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
                    wrappedLines.push(currentLine.trim());
                    currentLine = word;
                } else {
                    // Parola singola troppo lunga, la tronchiamo
                    if (word.length > maxCharsPerLine - 3) {
                        wrappedLines.push(word.substring(0, maxCharsPerLine - 3) + '...');
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
            wrappedLines.push(currentLine.trim());
        }

        // Limita il numero di righe
        if (wrappedLines.length > maxLines) {
            wrappedLines = wrappedLines.slice(0, maxLines);
            const lastLine = wrappedLines[wrappedLines.length - 1];
            if (lastLine.length > maxCharsPerLine - 3) {
                wrappedLines[wrappedLines.length - 1] = lastLine.substring(0, maxCharsPerLine - 3) + '...';
            } else {
                wrappedLines[wrappedLines.length - 1] = lastLine + '...';
            }
        }

        // Unisci le righe con semplice \n (verrà gestito diversamente nel filtro FFmpeg)
        return wrappedLines.join('\\n');
    }
}

module.exports = VideoProcessor;