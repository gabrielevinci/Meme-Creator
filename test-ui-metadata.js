/**
 * Test UI per verificare mutua esclusività checkbox metadati
 * Da eseguire dopo aver aperto l'applicazione Electron
 */

console.log('🧪 TEST UI MUTUA ESCLUSIVITÀ METADATI');
console.log('====================================\n');

function testMetadataCheckboxLogic() {
    console.log('📋 Verifica elementi UI presenti:');
    
    // Verifica presenza checkbox
    const addMetadataCheckbox = document.getElementById('add-metadata-enabled');
    const removeMetadataCheckbox = document.getElementById('remove-metadata-enabled');
    const conflictWarning = document.getElementById('metadata-conflict-warning');
    
    console.log(addMetadataCheckbox ? '✅' : '❌', 'Checkbox "Aggiungi Metadati" trovato');
    console.log(removeMetadataCheckbox ? '✅' : '❌', 'Checkbox "Elimina Metadati" trovato');
    console.log(conflictWarning ? '✅' : '❌', 'Warning conflitto trovato');
    
    if (!addMetadataCheckbox || !removeMetadataCheckbox) {
        console.log('❌ Test interrotto: elementi UI mancanti');
        return;
    }
    
    console.log('\n📋 Test mutua esclusività:');
    
    // Test 1: Abilita "Aggiungi Metadati"
    console.log('\n1️⃣ Test: Abilitazione "Aggiungi Metadati"');
    addMetadataCheckbox.checked = true;
    addMetadataCheckbox.dispatchEvent(new Event('change'));
    
    console.log('   Stato dopo abilita Aggiungi:', {
        addMetadata: addMetadataCheckbox.checked,
        removeMetadata: removeMetadataCheckbox.checked
    });
    
    const test1Pass = addMetadataCheckbox.checked && !removeMetadataCheckbox.checked;
    console.log(test1Pass ? '✅' : '❌', 'Mutua esclusività rispettata');
    
    // Test 2: Abilita "Elimina Metadati" (dovrebbe disabilitare l'altro)
    console.log('\n2️⃣ Test: Abilitazione "Elimina Metadati"');
    removeMetadataCheckbox.checked = true;
    removeMetadataCheckbox.dispatchEvent(new Event('change'));
    
    console.log('   Stato dopo abilita Elimina:', {
        addMetadata: addMetadataCheckbox.checked,
        removeMetadata: removeMetadataCheckbox.checked
    });
    
    const test2Pass = !addMetadataCheckbox.checked && removeMetadataCheckbox.checked;
    console.log(test2Pass ? '✅' : '❌', 'Mutua esclusività rispettata');
    
    // Test 3: Disabilita tutto
    console.log('\n3️⃣ Test: Disabilitazione totale');
    removeMetadataCheckbox.checked = false;
    removeMetadataCheckbox.dispatchEvent(new Event('change'));
    
    console.log('   Stato dopo disabilita tutto:', {
        addMetadata: addMetadataCheckbox.checked,
        removeMetadata: removeMetadataCheckbox.checked
    });
    
    const test3Pass = !addMetadataCheckbox.checked && !removeMetadataCheckbox.checked;
    console.log(test3Pass ? '✅' : '❌', 'Disabilitazione corretta');
    
    // Test 4: Verifica warning
    console.log('\n4️⃣ Test: Gestione warning');
    const warningVisible = conflictWarning && window.getComputedStyle(conflictWarning).display !== 'none';
    console.log(warningVisible ? '⚠️' : '✅', 'Warning attualmente', warningVisible ? 'visibile' : 'nascosto');
    
    // Riepilogo finale
    console.log('\n🏆 RIEPILOGO TEST UI:');
    const allTestsPass = test1Pass && test2Pass && test3Pass;
    console.log(allTestsPass ? '✅' : '❌', 'Tutti i test passati:', allTestsPass);
    
    if (allTestsPass) {
        console.log('🎯 UI implementata correttamente!');
        console.log('   • Mutua esclusività funzionante');
        console.log('   • Eventi change gestiti correttamente');  
        console.log('   • Warning disponibile per conflitti');
    } else {
        console.log('❌ Alcuni test falliti - verificare implementazione JS');
    }
}

// Esporta per uso in dev tools
if (typeof window !== 'undefined') {
    window.testMetadataUI = testMetadataCheckboxLogic;
    console.log('🔧 Test disponibile in dev tools: window.testMetadataUI()');
} else {
    console.log('⚠️ Test UI disponibile solo nel browser/Electron');
}
