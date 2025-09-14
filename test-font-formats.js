const { spawn } = require('child_process');

// Test di diversi formati di escape per il font path
function testFontPathFormats() {
    console.log('🧪 TEST FORMATI FONT PATH');
    console.log('==========================\n');

    const fontPath = 'D:\\Desktop\\NUOVA PROVA\\font\\impact.TTF';

    console.log(`📂 Font path originale: ${fontPath}`);
    console.log('');

    // Test diversi formati
    const formats = [{
            name: 'Virgolette doppie',
            path: `"D:/Desktop/NUOVA PROVA/font/impact.TTF"`,
            filter: `drawtext=text="Test":fontfile="D:/Desktop/NUOVA PROVA/font/impact.TTF":fontcolor=black:fontsize=40:x=100:y=100`
        },
        {
            name: 'Virgolette singole',
            path: `'D:/Desktop/NUOVA PROVA/font/impact.TTF'`,
            filter: `drawtext=text="Test":fontfile='D:/Desktop/NUOVA PROVA/font/impact.TTF':fontcolor=black:fontsize=40:x=100:y=100`
        },
        {
            name: 'Escape spazi',
            path: `D:/Desktop/NUOVA\\ PROVA/font/impact.TTF`,
            filter: `drawtext=text="Test":fontfile=D:/Desktop/NUOVA\\ PROVA/font/impact.TTF:fontcolor=black:fontsize=40:x=100:y=100`
        },
        {
            name: 'Path short name',
            path: `D:/Desktop/NUOVAP~1/font/impact.TTF`,
            filter: `drawtext=text="Test":fontfile=D:/Desktop/NUOVAP~1/font/impact.TTF:fontcolor=black:fontsize=40:x=100:y=100`
        }
    ];

    let testCount = 0;

    function testNext() {
        if (testCount >= formats.length) {
            console.log('\n✅ Test completati!');
            return;
        }

        const format = formats[testCount];
        console.log(`\n--- Test ${testCount + 1}: ${format.name} ---`);
        console.log(`Path: ${format.path}`);
        console.log(`Filtro: ${format.filter}`);

        // Test con FFmpeg dry-run
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'lavfi',
            '-i', 'nullsrc=s=1080x1920:d=1',
            '-filter_complex', format.filter,
            '-f', 'null',
            '-'
        ]);

        let errorOutput = '';

        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0 || errorOutput.includes('Opening \'null\'')) {
                console.log('✅ SUCCESSO - Sintassi corretta');
            } else {
                console.log('❌ ERRORE - Sintassi non valida');
                // Mostra solo la prima riga dell'errore per chiarezza
                const firstError = errorOutput.split('\n').find(line =>
                    line.includes('No option name') || line.includes('Error parsing')
                );
                if (firstError) {
                    console.log(`   ${firstError.trim()}`);
                }
            }

            testCount++;
            setTimeout(testNext, 500); // Pausa breve tra i test
        });

        ffmpeg.on('error', (error) => {
            console.log(`❌ ERRORE esecuzione: ${error.message}`);
            testCount++;
            setTimeout(testNext, 500);
        });
    }

    testNext();
}

// Avvia i test
testFontPathFormats();