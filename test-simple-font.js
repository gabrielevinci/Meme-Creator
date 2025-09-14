const { spawn } = require('child_process');
const path = require('path');

// Test font path semplificato
function testSimpleFont() {
    console.log('🧪 TEST FONT PATH SEMPLICE');
    console.log('===========================\n');
    
    // Prima controlla se il font esiste
    const fs = require('fs');
    const fontPath = path.join(__dirname, 'font', 'impact.TTF');
    
    console.log(`📂 Font path: ${fontPath}`);
    console.log(`📋 Font esiste: ${fs.existsSync(fontPath) ? '✅' : '❌'}`);
    
    if (!fs.existsSync(fontPath)) {
        console.log('❌ Font non trovato! Termino il test.');
        return;
    }
    
    // Test con font senza spazi (copiato in temp)
    const tempFontPath = path.join(__dirname, 'impact_temp.ttf');
    
    try {
        fs.copyFileSync(fontPath, tempFontPath);
        console.log(`📋 Font temporaneo creato: ${tempFontPath}`);
        
        // Ora testa con il path senza spazi
        const filter = `drawtext=text="Test":fontfile=${tempFontPath.replace(/\\/g, '/')}:fontcolor=black:fontsize=40:x=100:y=100`;
        
        console.log(`🔧 Filtro test: ${filter}`);
        
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
            console.log(`\n📊 RISULTATO: Codice ${code}`);
            
            if (code === 0 || errorOutput.includes('Opening \'null\'')) {
                console.log('✅ SUCCESSO - Font path senza spazi funziona!');
                console.log('💡 SOLUZIONE: Il problema erano gli spazi nel path');
            } else {
                console.log('❌ ERRORE - Anche senza spazi non funziona');
                console.log(errorOutput.substring(0, 500));
            }
            
            // Pulisci il file temporaneo
            try {
                fs.unlinkSync(tempFontPath);
                console.log('🧹 File temporaneo rimosso');
            } catch (e) {
                console.log('⚠️ Impossibile rimuovere file temporaneo');
            }
        });
        
        ffmpeg.on('error', (error) => {
            console.log(`❌ ERRORE esecuzione: ${error.message}`);
        });
        
    } catch (error) {
        console.log(`❌ Errore nella creazione del font temporaneo: ${error.message}`);
    }
}

// Avvia il test
testSimpleFont();
