# Content Creator - 0 Chiacchiere
## Documentazione Tecnica Completa

### 📋 Panoramica del Sistema
Applicazione desktop Electron per la generazione automatica di meme tramite AI, progettata per Windows 10/11 con supporto dual-mode (sviluppo/produzione).

### 🏗️ Architettura del Sistema

#### Componenti Principali
```
main.js              # Entry point Electron + orchestrazione
├── api-manager.js   # Gestione API e rate limiting  
├── video-processor.js # Estrazione frame e elaborazione video
├── ai-processor.js  # Interfaccia AI e prompt processing
└── index.html       # Interface utente dashboard
```

#### Pipeline di Elaborazione
```
INPUT Videos → Frame Extraction → AI Analysis → OUTPUT Results
     ↓               ↓                 ↓           ↓
   .mp4/.avi    Singolo/Collage    Prompt AI    .txt files
```

### ⚙️ Configurazione Sistema

#### Scripts NPM
- `npm start` - Modalità sviluppo (localhost + DevTools)
- `npm run electron` - Modalità produzione standalone  
- `npm run build` - Build per distribuzione
- `npm run dist` - Crea distributivo finale

#### Struttura Cartelle
```
📁 content-creator-0-chiacchiere/
├── 📁 INPUT/           # Video sorgente
├── 📁 OUTPUT/          # Risultati AI (auto-pulita)
├── 📁 font/            # Font personalizzabili
├── 📁 prompt/          # Template AI
│   ├── single_frame.txt
│   └── collage.txt
├── 📁 temp_frames/     # Cache temporanea (auto-creata)
├── 🔧 api.json        # Configurazioni API
├── 🖼️ icon.ico        # Logo applicazione
└── 📄 electron-builder.json # Config build
```

### 🎯 Funzionalità Core

#### Estrazione Frame Intelligente
- **Modalità Singola**: Frame centrale (50% durata)
- **Modalità Collage**: 3 frame sequenziali (25%, 50%, 75%)
- **Compressione**: Automatica < 100KB per ottimizzazione AI
- **Formati supportati**: MP4, AVI, MOV, MKV

#### Sistema API Multi-Provider
```javascript
// Struttura api.json
{
  "openai": {
    "alias": "OpenAI official endpoint",
    "models": {
      "gpt-4o-mini": {
        "limits": { "RPM": 300, "RPD": 20000, "TPM": 50000 },
        "requests": { /* storico timestampato */ }
      }
    }
  }
}
```

#### Gestione Rate Limiting
- **RPM**: Richieste per minuto
- **RPD**: Richieste per giorno  
- **TPM**: Token per minuto
- **Auto-retry**: Fallback automatico su modelli alternativi
- **Storico**: Tracciamento completo con cleanup automatico (30 giorni)

### 🔄 Flusso di Elaborazione

#### Fase 1: Estrazione Frame
```
Per ogni video in INPUT/:
├── Analizza durata (FFprobe)
├── Estrai frame secondo modalità
├── Comprimi immagini (Sharp)
└── Salva in temp_frames/
```

#### Fase 2: Analisi AI  
```
Per ogni set di frame:
├── Carica template prompt
├── Sostituisci variabili utente
├── Seleziona API/modello disponibile
├── Chiama API con retry automatico
├── Registra richiesta e risposta
└── Salva risultato in OUTPUT/
```

### 🎨 Interface Utente

#### Dashboard Principale
- **Layout Grid**: 2 colonne responsive
- **Controlli Input**: Textbox multipli per configurazione
- **Monitor Real-time**: Progress bar + log sistema
- **Gestione Font**: Dropdown auto-popolato
- **Modal API**: CRUD completo per configurazioni

#### Elementi UI Avanzati
- **Status Panel**: Contatori e progress tracking
- **Log Console**: Timestampato con codici colore
- **Video List**: Auto-refresh lista INPUT/
- **API Modal**: Gestione visuale configurazioni

### 🛠️ Template Prompt AI

#### Variabili Disponibili
- `{{BUSINESS_THEME}}` → Tipologia Meme
- `{{CONTENT_FILTER}}` → Filtro Video
- `{{STYLE_EXAMPLES}}` → Stile Meme

#### Template single_frame.txt
Analisi frame singoli con focus su:
- Descrizione dettagliata elementi visivi
- Identificazione elementi chiave per meme
- Concept e testo principale
- Target audience e tone of voice
- Hashtag e rationale

#### Template collage.txt  
Analisi narrativa sequenziale con:
- Progressione temporale 3 frame
- Evoluzione situazione/emozioni
- Format narrativi (Before/During/After)
- Meme che sfrutta dimensione temporale

### 🔧 Gestione Errori e Recovery

#### Error Handling
- **FFmpeg Missing**: Verifica installazione e PATH
- **API Rate Limit**: Auto-retry modello successivo  
- **File Corrupted**: Validazione durata e formato
- **Memory Issues**: Compressione automatica immagini

#### Recovery Automatico
- **API Fallback**: Sequenza priorità configurabile
- **File Cleanup**: Rimozione automatica file temporanei
- **State Reset**: Reset completo tra elaborazioni

### 📊 Monitoring e Diagnostica

#### Log di Sistema
- **Timestamp precision**: Millisecondi
- **Categorizzazione**: Info/Success/Error con colori
- **Rotazione**: Mantiene ultimi 100 eventi
- **Auto-scroll**: Segue elaborazione real-time

#### Metriche Performance
- **Response Time**: Tracciamento tempi API
- **Token Usage**: Monitoraggio consumo
- **File Processing**: Tempi estrazione frame
- **Memory Usage**: Ottimizzazione automatica

### 🚀 Build e Distribuzione

#### Electron Builder Config
```json
{
  "target": ["nsis", "portable"],
  "compression": "maximum", 
  "nodeGypRebuild": false,
  "extraFiles": ["INPUT/.gitkeep", "OUTPUT/.gitkeep"]
}
```

#### Output Distributivi
- **NSIS Installer**: Setup completo con desktop shortcuts
- **Portable**: Eseguibile standalone senza installazione
- **Auto-update**: Preparato per aggiornamenti automatici

### 🔒 Sicurezza e Privacy

#### Gestione Dati
- **Local Processing**: Tutti i dati restano in locale
- **API Keys**: Configurazione utente locale
- **Temporary Files**: Cleanup automatico
- **No Telemetry**: Nessun invio dati esterni

#### Validazione Input
- **File Types**: Controllo estensioni supportate
- **Path Sanitization**: Prevenzione path traversal
- **Memory Limits**: Protezione da file troppo grandi

### 📈 Scalabilità e Manutenzione

#### Modularity
- **Componenti Separati**: API, Video, AI processing isolati
- **Config Driven**: Comportamento configurabile
- **Plugin Ready**: Architettura estendibile

#### Future Enhancements
- **Nuovi Provider AI**: Aggiunta semplificata
- **Batch Processing**: Elaborazione multipla parallela
- **Custom Formats**: Supporto nuovi formati video
- **Cloud Integration**: Possibile integrazione cloud

### 🎯 Performance Optimization

#### Memory Management
- **Streaming Processing**: Elaborazione a chunk
- **Garbage Collection**: Cleanup proattivo
- **Image Compression**: Ottimizzazione automatica
- **Cache Strategy**: Gestione intelligente cache

#### CPU Optimization
- **Sequential Processing**: Evita overload CPU
- **Process Throttling**: Rate limiting intelligente
- **Background Tasks**: Separazione UI/processing

---

## 📋 Checklist Deployment

### ✅ Pre-requisiti Sistema
- [x] Windows 10/11 compatibilità
- [x] Node.js 16+ supporto
- [x] FFmpeg installazione guidata
- [x] 4GB RAM minimo testato

### ✅ Funzionalità Core
- [x] Estrazione frame singolo/collage
- [x] Gestione API multi-provider
- [x] Rate limiting intelligente
- [x] Template prompt personalizzabili
- [x] Interface utente completa

### ✅ Quality Assurance
- [x] Error handling robusto
- [x] Recovery automatico
- [x] Memory optimization
- [x] Performance monitoring

### ✅ User Experience
- [x] Interface intuitiva
- [x] Progress tracking real-time
- [x] Log sistema dettagliato
- [x] Documentazione completa

**Sistema pronto per produzione e distribuzione! 🚀**
