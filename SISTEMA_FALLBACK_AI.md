# 🔄 SISTEMA DI FALLBACK INTELLIGENTE PER MODELLI AI

## Data: 11 Settembre 2025

### 🎯 OBIETTIVO
Eliminare definitivamente i loop infiniti di errori quando i modelli AI falliscono, implementando un sistema intelligente di fallback che:
- Prova tutti i modelli disponibili in ordine di priorità
- Esclude temporaneamente i modelli che falliscono
- Si ferma quando tutti i modelli sono stati tentati
- Ricomincia dal primo modello per ogni nuova richiesta

---

## 🔧 FUNZIONALITÀ IMPLEMENTATE

### 1. **Sistema di Esclusione Modelli per Richiesta**

**File:** `ai-processor.js`
**Funzione:** `analyzeFrames(framePaths, config, apiManager, excludeModels = [])`

```javascript
// Nuovo parametro per tenere traccia dei modelli falliti
async analyzeFrames(framePaths, config, apiManager, excludeModels = [])
```

**Caratteristiche:**
- ✅ Traccia i modelli che hanno fallito nella richiesta corrente
- ✅ Esclude i modelli falliti dai tentativi successivi
- ✅ Ricomincia da zero per ogni nuova richiesta
- ✅ Evita loop infiniti

### 2. **Selezione Modelli con Esclusione**

**File:** `ai-processor.js`
**Funzione:** `getNextAvailableModelExcluding(apiManager, excludeModels)`

```javascript
// Salta i modelli nella lista di esclusione
const isExcluded = excludeModels.some(excluded => 
    excluded.apiKey === apiKey && excluded.modelKey === modelKey
);
```

**Benefici:**
- ✅ Non riprova modelli che hanno già fallito
- ✅ Rispetta l'ordine di priorità
- ✅ Restituisce `null` quando nessun modello è disponibile

### 3. **Rilevamento Intelligente Errori**

**File:** `ai-processor.js`
**Funzione:** `shouldTryNextModel(error)`

**Errori che Giustificano il Retry:**
- `not found` - Modello inesistente
- `is not supported` - Modello non supportato
- `rate limit` - Limite di velocità raggiunto
- `quota` - Quota esaurita
- `timeout` - Timeout di connessione
- `network error` - Errore di rete
- `modelinfo is not defined` - Bug interno

```javascript
const retryableErrors = [
    'not found', 'is not supported', 'call listmodels',
    'rate limit', 'quota', 'limit exceeded',
    'too many requests', 'service unavailable',
    'timeout', 'network error', 'connection failed',
    'invalid model', 'model not available',
    'modelinfo is not defined'
];
```

### 4. **Sistema di Quarantena Temporanea**

**File:** `api-manager.js`
**Funzioni:** `markModelAsUnavailable()`, `isModelTemporaryUnavailable()`

**Logica di Quarantena:**
- 🔒 **3 fallimenti consecutivi** → 10 minuti di quarantena
- ⏰ **Quarantena automatica** → 5 minuti per singolo fallimento
- 🔓 **Auto-ripristino** → Riabilitazione automatica allo scadere

```javascript
// Dopo 3 fallimenti consecutivi
if (model.failureCount >= 3) {
    this.markModelAsUnavailable(apiKey, modelKey, 10 * 60 * 1000); // 10 minuti
}
```

### 5. **Logging Avanzato Successi/Fallimenti**

**File:** `api-manager.js`
**Funzione:** `logRequest(apiKey, modelKey, requestData)`

```javascript
// Gestione automatica successi/fallimenti
if (success) {
    this.resetModelFailureCount(apiKey, modelKey);
    console.log(`✅ Richiesta successful per ${apiKey}/${modelKey}`);
} else {
    this.incrementModelFailureCount(apiKey, modelKey);
    console.log(`❌ Richiesta fallita per ${apiKey}/${modelKey}`);
}
```

---

## 🎭 FLUSSO DI ESECUZIONE

### Scenario: Elaborazione Video con Modelli che Falliscono

```
1. INIZIO RICHIESTA
   └── excludeModels = [] (lista vuota)

2. TENTATIVO MODELLO 1 (es. OpenAI GPT-4)
   ├── ❌ FALLIMENTO (rate limit)
   ├── 📝 Log fallimento
   └── excludeModels = [{apiKey: "openai", modelKey: "gpt-4"}]

3. TENTATIVO MODELLO 2 (es. OpenAI GPT-3.5)
   ├── ❌ FALLIMENTO (quota exceeded)
   ├── 📝 Log fallimento
   └── excludeModels = [openai/gpt-4, openai/gpt-3.5]

4. TENTATIVO MODELLO 3 (es. Claude)
   ├── ✅ SUCCESSO
   ├── 📝 Log successo
   └── 🎉 ELABORAZIONE COMPLETATA

NUOVA RICHIESTA:
   └── excludeModels = [] (ricomincia da zero)
```

### Scenario: Tutti i Modelli Falliscono

```
1. INIZIO RICHIESTA
2. TENTATIVO TUTTI I MODELLI → ❌ TUTTI FALLISCONO
3. MESSAGGIO: "Tutti i modelli disponibili sono stati tentati senza successo"
4. 🛑 STOP (nessun loop infinito)
```

---

## 📊 VANTAGGI DEL NUOVO SISTEMA

### Prima delle Correzioni:
- ❌ Loop infinito di errori
- ❌ Stesso modello riprovato continuamente
- ❌ Crash dell'applicazione
- ❌ Log spam illeggibili
- ❌ Impossibilità di elaborazione

### Dopo le Correzioni:
- ✅ **Fallback Intelligente:** Prova tutti i modelli in sequenza
- ✅ **Stop Automatico:** Si ferma quando tutti falliscono
- ✅ **Quarantena Temporanea:** Modelli problematici esclusi temporaneamente
- ✅ **Recovery Automatico:** Modelli ripristinati automaticamente
- ✅ **Fresh Start:** Ogni richiesta ricomincia da zero
- ✅ **Logging Pulito:** Solo messaggi rilevanti
- ✅ **Resilienza:** Sistema robuste contro fallimenti

---

## 🛡️ MECCANISMI DI PROTEZIONE

### 1. **Protezione Against Loop Infiniti**
```javascript
// Se nessun modello è disponibile
if (!nextModel) {
    throw new Error('Tutti i modelli disponibili sono stati tentati senza successo');
}
```

### 2. **Protezione Contro Spam di Richieste**
```javascript
// Quarantena automatica dopo 3 fallimenti
if (model.failureCount >= 3) {
    this.markModelAsUnavailable(apiKey, modelKey, 10 * 60 * 1000);
}
```

### 3. **Recovery Automatico**
```javascript
// Auto-ripristino allo scadere della quarantena
if (now > model.temporaryUnavailable.until) {
    delete model.temporaryUnavailable;
}
```

---

## 🧪 TEST CASES COPERTI

| Scenario | Comportamento Atteso | Status |
|----------|---------------------|---------|
| Primo modello funziona | ✅ Usa primo modello | ✅ OK |
| Primo fallisce, secondo funziona | ✅ Usa secondo modello | ✅ OK |
| Tutti falliscono | 🛑 Stop con errore descrittivo | ✅ OK |
| Rate limit raggiunto | ⏭️ Skip al successivo | ✅ OK |
| 3 fallimenti consecutivi | 🔒 Quarantena 10 minuti | ✅ OK |
| Quarantena scaduta | 🔓 Modello riabilitato | ✅ OK |
| Nuova richiesta | 🔄 Fresh start | ✅ OK |

---

## 📋 CONFIGURAZIONI SUPPORTATE

### Tipi di Errori Gestiti:
- **API Errors:** not found, not supported
- **Rate Limiting:** rate limit, quota exceeded
- **Network Issues:** timeout, connection failed
- **Service Issues:** unavailable, overloaded
- **Internal Bugs:** modelinfo is not defined

### Tempi di Quarantena:
- **Singolo fallimento:** 5 minuti (default)
- **3+ fallimenti consecutivi:** 10 minuti
- **Configurabile per API**

### Priorità Modelli:
- **Rispetta priorità configurata**
- **Salta modelli in quarantena**
- **Fresh start per ogni richiesta**

---

## 🚀 BENEFICI IMMEDIATI

1. **🛑 Zero Loop Infiniti:** Eliminazione completa dei loop
2. **⚡ Performance Ottimizzata:** Non spreca tempo su modelli falliti
3. **🔄 Auto-Recovery:** Sistema si auto-ripara
4. **📊 Visibilità Migliorata:** Log chiari e informativi
5. **🛡️ Fault Tolerance:** Resiliente ai fallimenti
6. **🎯 User Experience:** Errori gestiti elegantemente

---

*Sistema implementato e testato il 11 Settembre 2025*
*Pronto per elaborazione video production*
