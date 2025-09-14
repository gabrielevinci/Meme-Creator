const { spawn } = require('child_process');
const path = require('path');

// Test completo FFmpeg con comando reale
function testFFmpegCommand() {
    console.log('🧪 TEST COMANDO FFMPEG REALE');
    console.log('==============================\n');
    
    // Parametri di test simili all'applicazione
    const inputVideo = path.join(__dirname, 'INPUT', '10AdorableBabyLaughingDancewithSmiles#cuteda7466934534387272992.mp4');
    const outputVideo = path.join(__dirname, 'test_output.mp4');
    const fontPath = path.join(__dirname, 'font', 'impact.TTF');
    
    // Escape font path come nell'applicazione
    let escapedFontPath;
    if (fontPath.includes(' ')) {
        escapedFontPath = `"${fontPath.replace(/\\/g, '/').replace(/"/g, '\\"')}"`;
    } else {
        escapedFontPath = fontPath.replace(/\\/g, '/');
    }
    
    console.log(`📂 Font path originale: ${fontPath}`);
    console.log(`📂 Font path escaped: ${escapedFontPath}`);
    
    // Costruisci filtro come nell'applicazione
    const textFilters = `[0:v]drawbox=x=0:y=0:w=1080:h=450:color=white:t=fill,drawtext=text="Test Testo":fontfile=${escapedFontPath}:fontcolor=black:fontsize=77:x=12:y=68`;
    const videoSpeed = 2.3;
    
    let filterComplex;
    
    if (videoSpeed !== 1) {
        console.log(`⚡ Applicazione velocità video: ${videoSpeed}x`);
        
        // Filtro con velocità: [0:v] -> [v_with_text] -> [v]
        filterComplex = textFilters + '[v_with_text];[v_with_text]setpts=PTS/' + videoSpeed + '[v]';
        
        if (videoSpeed >= 0.5 && videoSpeed <= 2.0) {
            const atempoValue = Math.min(Math.max(videoSpeed, 0.5), 2.0);
            console.log(`🔊 Applicazione velocità audio: ${atempoValue}x`);
            filterComplex += ';[0:a]atempo=' + atempoValue + '[a]';
        } else {
            console.log(`🔇 Velocità ${videoSpeed}x troppo estrema per l'audio, audio rimosso`);
        }
    } else {
        filterComplex = textFilters + '[v]';
    }
    
    console.log(`🔧 Filtro generato: ${filterComplex}`);
    console.log('');
    
    // Parametri FFmpeg
    const ffmpegArgs = ['-i', inputVideo, '-filter_complex', filterComplex];
    
    // Mappature
    ffmpegArgs.push('-map', '[v]');
    
    if (videoSpeed !== 1) {
        if (videoSpeed >= 0.5 && videoSpeed <= 2.0) {
            ffmpegArgs.push('-map', '[a]');
        }
    } else {
        ffmpegArgs.push('-map', '0:a?');
    }
    
    // Codec e output
    ffmpegArgs.push('-c:v', 'libx264', '-c:a', 'copy', '-y', outputVideo);
    
    console.log(`🎬 Comando completo:`);
    console.log(`ffmpeg ${ffmpegArgs.join(' ')}`);
    console.log('');
    
    // Test dry-run (solo sintassi)
    console.log('🔍 Test sintassi FFmpeg (dry-run)...');
    
    const ffmpeg = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'nullsrc', '-filter_complex', filterComplex, '-f', 'null', '-']);
    
    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
        console.log(`\n📊 RISULTATO TEST: Codice ${code}`);
        
        if (code === 0 || errorOutput.includes('Opening \'null\'')) {
            console.log('✅ Sintassi filtro CORRETTA');
        } else {
            console.log('❌ ERRORE nella sintassi filtro:');
            console.log(errorOutput);
            
            // Analizza gli errori comuni
            if (errorOutput.includes('does not exist')) {
                console.log('\n🔍 ANALISI: Errore "label does not exist"');
                console.log('   - Problema nella catena di label del filtro');
                console.log('   - Verifica che ogni label di input sia definito correttamente');
            }
        }
        
        console.log('\n🎯 SUGGERIMENTI:');
        console.log('   - Verifica che il file video esista');
        console.log('   - Controlla che il font sia accessibile');
        console.log('   - Assicurati che la sintassi del filter_complex sia corretta');
    });
    
    ffmpeg.on('error', (error) => {
        console.log(`❌ ERRORE nell'esecuzione FFmpeg: ${error.message}`);
    });
}

// Avvia il test
testFFmpegCommand();
