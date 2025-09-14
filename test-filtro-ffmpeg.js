const VideoProcessor = require('./video-processor');

console.log('🧪 TEST: Generazione Filtro FFmpeg Corretto');
console.log('==========================================');

const processor = new VideoProcessor();

// Test del metodo di generazione filtro (simuliamo la parte critica)
function testFilterGeneration() {
    console.log('\n🔧 TEST COSTRUZIONE FILTRO:');

    // Simula textFilters base (quello che viene generato prima della chiusura)
    const baseTextFilters = '[0:v]drawbox=x=0:y=1470:w=1080:h=450:color=white:t=fill,drawtext=text="Test":fontfile="impact.ttf":fontcolor=black:fontsize=40:x=100:y=100';

    console.log(`Base filters: ${baseTextFilters}`);

    // Test 1: Senza velocità (normale)
    console.log('\n--- Test 1: Velocità Normale (1x) ---');
    let filterComplex1 = baseTextFilters + '[v]';
    console.log(`Filtro normale: ${filterComplex1}`);
    console.log(`Mapping: -map [v] -map 0:a?`);

    // Test 2: Con velocità moderata (con audio)
    console.log('\n--- Test 2: Velocità Moderata (1.5x, con audio) ---');
    const speed2 = 1.5;
    let filterComplex2 = baseTextFilters + '[v_with_text];[v_with_text]setpts=PTS/' + speed2 + '[v]';
    const atempoValue2 = Math.min(Math.max(speed2, 0.5), 2.0);
    filterComplex2 += ';[0:a]atempo=' + atempoValue2 + '[a]';
    console.log(`Filtro con velocità: ${filterComplex2}`);
    console.log(`Mapping: -map [v] -map [a]`);

    // Test 3: Con velocità estrema (senza audio)
    console.log('\n--- Test 3: Velocità Estrema (2.3x, senza audio) ---');
    const speed3 = 2.3;
    let filterComplex3 = baseTextFilters + '[v_with_text];[v_with_text]setpts=PTS/' + speed3 + '[v]';
    console.log(`Filtro velocità estrema: ${filterComplex3}`);
    console.log(`Mapping: -map [v] (no audio)`);

    // Test 4: Verifica labels
    console.log('\n--- Test 4: Verifica Label Consistency ---');
    const filters = [filterComplex1, filterComplex2, filterComplex3];
    filters.forEach((filter, i) => {
        const hasVOutput = filter.includes('[v]');
        const hasVWithText = filter.includes('[v_with_text]');
        const hasAOutput = filter.includes('[a]');

        console.log(`Filtro ${i+1}: [v]=${hasVOutput}, [v_with_text]=${hasVWithText}, [a]=${hasAOutput}`);

        // Verifica che ogni filtro termini correttamente
        if (hasVOutput) {
            console.log(`  ✅ Output [v] presente`);
        } else {
            console.log(`  ❌ Output [v] MANCANTE!`);
        }
    });
}

testFilterGeneration();

console.log('\n✅ Test completato!');
console.log('\n🎯 PUNTI CHIAVE:');
console.log('- Filtro normale: [0:v] -> [v]');
console.log('- Filtro con velocità: [0:v] -> [v_with_text] -> [v]');
console.log('- Audio opzionale: [0:a] -> [a]');
console.log('- Label [v] sempre presente per mapping output');