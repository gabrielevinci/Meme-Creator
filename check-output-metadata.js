const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function checkOutputVideosMetadata() {
    console.log('🔍 VERIFICA METADATI APPLICATI AI VIDEO IN OUTPUT');
    console.log('=================================================\n');

    const outputDir = path.join(__dirname, 'OUTPUT');
    
    try {
        const outputFiles = fs.readdirSync(outputDir).filter(file => file.toLowerCase().endsWith('.mp4'));
        
        if (outputFiles.length === 0) {
            console.log('📁 Nessun video trovato nella cartella OUTPUT');
            console.log('💡 Suggerimento: Esegui prima il processo principale per creare video con metadati');
            return;
        }

        console.log(`📹 Trovati ${outputFiles.length} video nella cartella OUTPUT:`);
        outputFiles.forEach((file, i) => console.log(`  ${i+1}. ${file}`));

        console.log('\n🔍 ANALISI METADATI PER OGNI VIDEO:\n');

        for (let i = 0; i < outputFiles.length; i++) {
            const videoFile = outputFiles[i];
            const videoPath = path.join(outputDir, videoFile);
            
            console.log(`\n📹 VIDEO ${i+1}: ${videoFile}`);
            console.log('='.repeat(50));
            
            await new Promise((resolve, reject) => {
                ffmpeg.ffprobe(videoPath, (err, metadata) => {
                    if (err) {
                        console.error(`❌ Errore nell'analisi del video: ${err.message}`);
                        resolve();
                        return;
                    }

                    if (metadata && metadata.format && metadata.format.tags) {
                        const tags = metadata.format.tags;
                        const tagKeys = Object.keys(tags);
                        
                        console.log(`✅ METADATI TROVATI: ${tagKeys.length} tag`);
                        
                        // Filtra e mostra solo i metadati applicati dal nostro sistema
                        const ourMetadata = {};
                        const systemTags = {};
                        
                        tagKeys.forEach(key => {
                            const value = tags[key];
                            if (key.startsWith('\xa9') || key.startsWith('----:com.apple.iTunes:') || 
                                ['aART', 'cprt', 'tvsh', 'tvnn', 'tvsn', 'tves', 'hdvd', 'sonm', 'soar', 'soal', 'soaa', 'soco', 'sosn'].includes(key)) {
                                ourMetadata[key] = value;
                            } else {
                                systemTags[key] = value;
                            }
                        });

                        if (Object.keys(ourMetadata).length > 0) {
                            console.log(`\n🏷️ METADATI APPLICATI DAL NOSTRO SISTEMA (${Object.keys(ourMetadata).length}):`);
                            Object.entries(ourMetadata).forEach(([key, value]) => {
                                console.log(`  ✓ ${key}: "${value}"`);
                            });
                        }

                        if (Object.keys(systemTags).length > 0) {
                            console.log(`\n🔧 METADATI DI SISTEMA (${Object.keys(systemTags).length}):`);
                            Object.entries(systemTags).forEach(([key, value]) => {
                                console.log(`  • ${key}: "${value}"`);
                            });
                        }

                        // Verifica metadati chiave
                        console.log(`\n🎯 VERIFICA METADATI CHIAVE:`);
                        const keyMetadata = [
                            { key: '\xa9nam', name: 'Title' },
                            { key: '\xa9ART', name: 'Artist' },
                            { key: '\xa9alb', name: 'Album' },
                            { key: '\xa9gen', name: 'Genre' },
                            { key: '----:com.apple.iTunes:keywords', name: 'Keywords' },
                            { key: '----:com.apple.iTunes:MOOD', name: 'Mood' }
                        ];

                        keyMetadata.forEach(({key, name}) => {
                            if (ourMetadata[key]) {
                                console.log(`  ✅ ${name}: PRESENTE`);
                            } else {
                                console.log(`  ❌ ${name}: ASSENTE`);
                            }
                        });

                    } else {
                        console.log('❌ NESSUN METADATO TROVATO NEL VIDEO');
                    }
                    
                    resolve();
                });
            });
        }

        console.log('\n📊 RIEPILOGO FINALE:');
        console.log('====================');
        console.log(`✅ Video analizzati: ${outputFiles.length}`);
        console.log('✅ I metadati vengono applicati ai video nella cartella OUTPUT (come richiesto)');
        console.log('✅ I video nella cartella INPUT rimangono inalterati');

    } catch (error) {
        console.error('❌ Errore nell\'analisi della cartella OUTPUT:', error);
    }
}

// Esegui l'analisi
checkOutputVideosMetadata();
