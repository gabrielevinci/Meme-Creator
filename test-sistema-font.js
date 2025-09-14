const { exec } = require('child_process');
const path = require('path');

console.log('🧪 TEST FONT DI SISTEMA');
console.log('======================\n');

// Test con font di sistema
const inputVideo = path.join(__dirname, 'INPUT', '10AdorableBabyLaughingDancewithSmiles#cuteda7466934534387272992.mp4');
const outputVideo = path.join(__dirname, 'test_sistema_font.mp4');

// Filtro senza fontfile
const filter = '[0:v]drawbox=x=0:y=0:w=1080:h=450:color=white:t=fill,drawtext=text="Test Font Sistema":fontcolor=black:fontsize=77:x=14:y=68[v_with_text];[v_with_text]setpts=PTS/2.1[v]';

const command = `ffmpeg -i "${inputVideo}" -filter_complex "${filter}" -map [v] -c:v libx264 -y "${outputVideo}"`;

console.log('🎬 Comando FFmpeg:');
console.log(command);
console.log('\n🔍 Esecuzione test...\n');

exec(command, (error, stdout, stderr) => {
    console.log('📊 RISULTATO:');

    if (error) {
        console.log(`❌ Errore: ${error.message}`);
        console.log(`📝 Stderr: ${stderr}`);
    } else {
        console.log('✅ SUCCESSO! Font di sistema funziona');
        console.log(`🎯 Video creato: ${outputVideo}`);
    }

    if (stdout) console.log(`📤 Stdout: ${stdout}`);
});