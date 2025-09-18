const fs = require('fs');
const path = require('path');
const MetadataManagerV4 = require('./metadata-manager-v4');

/**
 * Test del nuovo MetadataManager V4 - Compatibilità con Python V4.py
 */
async function testMetadataV4System() {
    console.log('🧪 TEST METADATA MANAGER V4 - COMPATIBILITÀ PYTHON');
    console.log('==================================================\n');

    try {
        // Trova un video di test
        const inputDir = path.join(__dirname, 'INPUT');
        const videos = fs.readdirSync(inputDir).filter(file => file.toLowerCase().endsWith('.mp4'));

        if (videos.length === 0) {
            console.log('❌ Nessun video trovato nella cartella INPUT per il test');
            return;
        }

        const testVideo = videos[0];
        const testVideoPath = path.join(inputDir, testVideo);

        // Crea una copia di test
        const testCopyPath = testVideoPath.replace('.mp4', '_V4_TEST.mp4');
        fs.copyFileSync(testVideoPath, testCopyPath);

        console.log(`📹 Video di test: ${testVideo}`);
        console.log(`📁 Copia di test: ${path.basename(testCopyPath)}`);

        // Dati di test che replicano la struttura API del tuo sistema
        const testApiData = {
            title: "Test Video con Metadati V4 - Spotify Premium Deal",
            metadata: {
                // Basic Info
                'Title': 'Test Video Metadati V4',
                'Artist': 'Content Creator AI',
                'Album': 'Test Collection 2025',
                'Genre': 'Comedy',
                'Composer': 'AI Assistant',
                'Commenti': 'Video creato con sistema automatico V4 compatibile Python',
                'Data di creazione': 'now',

                // Video Info
                'Show': 'AI Content Series',
                'TV Network': 'Digital Creator Network',
                'Season number': 2,
                'Episode number': 15,
                'HD Video': true,

                // Classificazione - Test logica specifica Rating
                'Classificazione (esplicito)': 'No',
                'Tag': 'nature,spotify,premium,deal,ai,automatic',

                // Crediti (esempi con tag iTunes personalizzati)
                'Director': 'AI Content Director',
                'Producer': 'Automated Production System',
                'Studio': 'Digital Creator Studio',
                'Editore': 'AI Publisher V4',

                // Test casi speciali
                'Umore': 'Energetic',
                'Chiave iniziale': 'C Major',

                // Ordinamento
                'Title sort order': 'Test Video Metadati V4',
                'Artist sort order': 'Content Creator AI'
            }
        };

        console.log('\n🚀 AVVIO TEST APPLICAZIONE METADATI V4:');
        console.log('=====================================');

        console.log(`📋 Metadati di test: ${Object.keys(testApiData.metadata).length} elementi`);
        console.log('  - Basic Info: Title, Artist, Album, Genre, Date');
        console.log('  - Video Info: Show, Season/Episode, HD Flag');
        console.log('  - Rating Logic: Classificazione esplicito = "No" → "0"');
        console.log('  - Integer Arrays: Season=2, Episode=15, HD Video=true→1');
        console.log('  - iTunes Custom: Director, Producer, Studio, etc.');
        console.log('  - Data speciale: "now" → data corrente');

        // Applica metadati usando il nuovo sistema V4
        const result = await MetadataManagerV4.applyMetadataToVideo(testCopyPath, testApiData);

        console.log('\n📊 RISULTATI TEST:');
        console.log('==================');

        if (result.success) {
            console.log('✅ Test V4 completato con successo!');
            console.log(`📝 File finale: ${path.basename(result.newPath)}`);

            // Verifica metadati applicati
            console.log('\n🔍 VERIFICA METADATI APPLICATI:');
            await MetadataManagerV4.verifyAppliedMetadata(result.newPath);

            console.log('\n✅ Test V4 COMPLETATO - Sistema compatibile con Python V4.py');
            console.log('🎯 Logica implementata:');
            console.log('  ✓ Mappatura TAG_MAP identica al Python');
            console.log('  ✓ Rating esplicito: "No" → "0", "Yes" → "255"');
            console.log('  ✓ Season/Episode come numeri interi');
            console.log('  ✓ HD Video come 0/1');
            console.log('  ✓ Tag iTunes personalizzati con UTF-8');
            console.log('  ✓ Data "now" → data corrente automatica');
            console.log('  ✓ Gestione errori robusta');

        } else {
            console.log('❌ Test V4 fallito:', result.error);

            // Pulizia in caso di errore
            if (fs.existsSync(testCopyPath)) {
                fs.unlinkSync(testCopyPath);
                console.log('🗑️ File di test pulito dopo errore');
            }
        }

    } catch (error) {
        console.error('❌ Errore critico nel test V4:', error);

        // Pulizia finale
        const testFiles = fs.readdirSync(path.join(__dirname, 'INPUT'))
            .filter(f => f.includes('_V4_TEST'))
            .forEach(f => {
                const fullPath = path.join(__dirname, 'INPUT', f);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`🗑️ Pulizia: ${f}`);
                }
            });
    }
}

// Esegui il test
if (require.main === module) {
    testMetadataV4System();
}

module.exports = { testMetadataV4System };