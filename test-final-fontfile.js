const { spawn } = require('child_process');

// Test finale per il problema fontfile
function finalTest() {
    console.log('🧪 TEST FINALE PROBLEMA FONTFILE');
    console.log('=================================\n');

    // Test 1: Drawtext senza fontfile (usa font di sistema)
    console.log('--- Test 1: Senza fontfile ---');
    testDrawtext('drawtext=text="Test Senza Font":fontsize=40:x=100:y=100', 'Senza fontfile');

    // Test 2: Con fontfile ma senza path complesso
    setTimeout(() => {
        console.log('\n--- Test 2: Con fontfile semplice ---');
        testDrawtext('drawtext=text="Test Con Font":fontfile=arial.ttf:fontsize=40:x=100:y=100', 'Con fontfile semplice');

        // Test 3: Test del filtro completo con velocità ma senza font
        setTimeout(() => {
            console.log('\n--- Test 3: Filtro completo senza font ---');
            testComplete();
        }, 2000);
    }, 2000);
}

function testDrawtext(filter, description) {
    const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'nullsrc=s=1080x1920:d=1',
        '-filter_complex', filter,
        '-f', 'null',
        '-'
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
        if (code === 0 || errorOutput.includes('Opening \'null\'') || errorOutput.includes('muxing overhead')) {
            console.log(`✅ ${description}: FUNZIONA`);
        } else {
            console.log(`❌ ${description}: ERRORE`);
            // Mostra errore principale
            const error = errorOutput.split('\n').find(line =>
                line.includes('No option') || line.includes('Error parsing') || line.includes('Invalid')
            );
            if (error) console.log(`   ${error.trim()}`);
        }
    });

    ffmpeg.on('error', (error) => {
        console.log(`❌ ${description}: ERRORE SPAWN - ${error.message}`);
    });
}

function testComplete() {
    // Test del filtro completo con video speed ma senza fontfile problematico
    const complexFilter = '[0:v]drawbox=x=0:y=0:w=1080:h=450:color=white:t=fill,drawtext=text="Test Completo":fontsize=77:x=12:y=68[v_with_text];[v_with_text]setpts=PTS/2.3[v]';

    console.log('Filtro completo:');
    console.log(complexFilter);

    const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'nullsrc=s=1080x1920:d=1',
        '-filter_complex', complexFilter,
        '-map', '[v]',
        '-f', 'null',
        '-'
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
        console.log(`\n📊 RISULTATO FILTRO COMPLETO: Codice ${code}`);

        if (code === 0 || errorOutput.includes('Opening \'null\'') || errorOutput.includes('muxing overhead')) {
            console.log('✅ FILTRO COMPLETO FUNZIONA!');
            console.log('💡 IL PROBLEMA È SOLO IL FONTFILE!');
            console.log('');
            console.log('🎯 SOLUZIONI POSSIBILI:');
            console.log('   1. Usa font di sistema (senza fontfile)');
            console.log('   2. Copia font in directory senza spazi');
            console.log('   3. Usa font integrato in FFmpeg');
        } else {
            console.log('❌ ANCHE IL FILTRO COMPLETO FALLISCE');
            const error = errorOutput.split('\n').find(line =>
                line.includes('No option') || line.includes('Error parsing') || line.includes('does not exist')
            );
            if (error) console.log(`   ${error.trim()}`);
        }
    });

    ffmpeg.on('error', (error) => {
        console.log(`❌ ERRORE SPAWN: ${error.message}`);
    });
}

// Avvia test
finalTest();