# Sistema Prompt Dinamico + Metadati Opzionali

## Panoramica
Sistema avanzato che permette di selezionare dinamicamente il prompt AI e l'applicazione dei metadati basandosi su due opzioni utente indipendenti:

1. **🖼️ Rilevamento con collage** (useCollage)
2. **📋 Aggiungi metadati** (addMetadataEnabled)

## Matrice Scenari Supportati

| Collage | Metadati | Template File | MetadataManager V4 | Uso Tipico |
|---------|----------|---------------|-------------------|------------|
| ❌ NO | ❌ NO | `single_frame_no_metadati.txt` | NON USATO | Test rapidi |
| ❌ NO | ✅ SÌ | `single_frame_metadati.txt` | **ATTIVO** | Produzione ottimizzata |
| ✅ SÌ | ❌ NO | `collage_no_metadati.txt` | NON USATO | Analisi complessa |
| ✅ SÌ | ✅ SÌ | `collage_metadati.txt` | **ATTIVO** | **Massima qualità** |

## Interfaccia Utente

### Posizione Controlli
- **Collage**: Sezione "🤖 AI e Creatività" 
- **Metadati**: Sezione "⚙️ Opzioni"

### Nuovo Checkbox Metadati
```html
<input type="checkbox" id="add-metadata-enabled" class="checkbox-input">
<label for="add-metadata-enabled" class="checkbox-label">📋 Aggiungi Metadati</label>
```

**Descrizione**: "Se abilitato, genera metadati completi per massimizzare la viralità sui social"

## Architettura Tecnica

### Flusso Dati
1. **UI → Backend**: `addMetadataEnabled` aggiunto alla configurazione
2. **AI Processor**: Selezione automatica template corretto
3. **Template Processing**: Caricamento prompt dalla cartella `./prompt/`
4. **MetadataManager V4**: Applicazione condizionata dei metadati

### Logica di Selezione Template
```javascript
getTemplateNameByOptions(useCollage, addMetadata) {
    if (useCollage && addMetadata) return 'collage_metadati.txt';
    if (useCollage && !addMetadata) return 'collage_no_metadati.txt';
    if (!useCollage && addMetadata) return 'single_frame_metadati.txt';
    return 'single_frame_no_metadati.txt';
}
```

## File Template Richiesti

### Cartella: `./prompt/`

1. **`single_frame_no_metadati.txt`**
   - Analisi singolo frame
   - Output: solo meme text
   - Nessun metadato generato

2. **`single_frame_metadati.txt`**
   - Analisi singolo frame  
   - Output: meme text + metadati completi MP4
   - Integrazione MetadataManager V4

3. **`collage_no_metadati.txt`**
   - Analisi collage 3 frame
   - Output: solo meme text
   - Nessun metadato generato

4. **`collage_metadati.txt`**
   - Analisi collage 3 frame
   - Output: meme text + metadati completi MP4
   - Integrazione MetadataManager V4

## Integrazione MetadataManager V4

### Quando si Attiva
- Solo se `addMetadataEnabled = true`
- Applica la mappatura TAG_MAP identica al Python V4.py
- Gestione logiche specifiche (Rating 255/0, Season/Episode int, HD Video 0/1)

### Struttura Risposta AI (con metadati)
```json
{
  "description": "Descrizione frame/collage",
  "matches_filter": 1,
  "banner_position": "top",
  "meme_text": "Testo del meme",
  "title": "Titolo per social media",
  "metadata": {
    "Title": "Titolo video",
    "Artist": "Nome creatore", 
    "Genre": "Comedy",
    "Tag": "nature,spotify,viral",
    // ... tutti i metadati MP4
  }
}
```

## Vantaggi Sistema

### 🎯 Flessibilità Massima
- **4 modalità operative** distinte
- **Scelta granulare** dell'utente
- **Ottimizzazione risorse** (metadati solo se necessari)

### ⚡ Performance Ottimizzate  
- **Template specifici** per ogni scenario
- **MetadataManager V4** attivo solo quando utile
- **Caricamento dinamico** dai file

### 🔧 Manutenibilità
- **Prompt separati** per facile modifica
- **Logica centralizzata** in ai-processor.js
- **Compatibilità garantita** con sistema esistente

## Configurazione Raccomandata

### 🚀 Produzione (Massima Qualità)
- ✅ Collage: **SÌ**
- ✅ Metadati: **SÌ**
- **Template**: `collage_metadati.txt`
- **Output**: Video ottimizzato per viralità sui social

### 🧪 Testing Rapido
- ❌ Collage: **NO** 
- ❌ Metadati: **NO**
- **Template**: `single_frame_no_metadati.txt`
- **Output**: Meme base veloce

## Validazione e Test

### Test Automatici Disponibili
```bash
# Test logica selezione prompt
node test-prompt-selection.js

# Test integrazione completa 
node test-complete-integration.js

# Test MetadataManager V4
node test-metadata-v4.js
```

### Tutti i Test Passano ✅
- ✅ Selezione template dinamica
- ✅ Caricamento file prompt
- ✅ Coerenza configurazione-template
- ✅ Integrazione MetadataManager V4
- ✅ 4 scenari supportati completamente

## Status: 🚀 PRONTO PER PRODUZIONE

Sistema completamente implementato, testato e validato. Compatibilità al 100% con il MetadataManager V4 e logica Python V4.py mantenuta.
