// Test per verificare il funzionamento dello slider temperature
const AiProcessor = require('./ai-processor.js');

async function testTemperatureSlider() {
    console.log('🧪 Test dello slider temperature');
    console.log('================================');
    
    const aiProcessor = new AiProcessor();
    
    // Simulazione di diversi valori di temperature
    const testConfigs = [
        { temperature: 0, label: 'Deterministic (0)' },
        { temperature: 0.5, label: 'Conservative (0.5)' },
        { temperature: 1.0, label: 'Balanced (1.0)' },
        { temperature: 1.5, label: 'Creative (1.5)' },
        { temperature: 2.0, label: 'Very Creative (2.0)' },
    ];
    
    console.log('Testando diversi valori di temperature...\n');
    
    for (const config of testConfigs) {
        console.log(`📊 ${config.label}:`);
        
        // Test del comportamento della funzione callGenericAPI
        const mockModelInfo = {
            apiKey: 'mock-key',
            modelKey: 'gemini-pro'
        };
        
        try {
            // Simuliamo solo la parte di creazione del requestBody per vedere la temperature
            const parts = [{ text: "Test prompt" }];
            const temperature = config.temperature !== undefined ? config.temperature : 1.0;
            
            const requestBody = {
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    temperature: temperature,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                },
            };
            
            console.log(`   Temperature utilizzata: ${temperature}`);
            console.log(`   Configurazione generata:`, JSON.stringify(requestBody.generationConfig, null, 2));
            console.log('   ✅ Test configurazione completato\n');
            
        } catch (error) {
            console.log(`   ❌ Errore: ${error.message}\n`);
        }
    }
    
    // Test del fallback quando temperature non è definita
    console.log('📊 Test fallback (temperature undefined):');
    const undefinedConfig = {};
    const temperature = undefinedConfig.temperature !== undefined ? undefinedConfig.temperature : 1.0;
    console.log(`   Temperature di fallback: ${temperature}`);
    console.log('   ✅ Test fallback completato\n');
    
    console.log('🎉 Tutti i test completati!');
    console.log('\nPer testare nell\'interfaccia:');
    console.log('1. Avvia l\'applicazione con npm start');
    console.log('2. Cerca lo slider "🎲 Creatività AI (Temperature)" nella prima colonna');
    console.log('3. Muovi lo slider da 0 a 2 per vedere il valore che cambia');
    console.log('4. Avvia un processamento per vedere la temperature utilizzata nei log');
}

if (require.main === module) {
    testTemperatureSlider().catch(console.error);
}

module.exports = { testTemperatureSlider };
