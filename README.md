# Content Creator - 0 Chiacchiere

## 📖 Descrizione
Applicazione desktop Windows per la generazione automatica di meme tramite intelligenza artificiale. L'app analizza video, estrae frame significativi e utilizza AI per creare contenuti memetic personalizzati.

## ✨ Caratteristiche Principali

### 🎯 Funzionalità Core
- **Estrazione Frame Intelligente**: Estrae frame al 25%, 50%, 75% della durata video
- **Modalità Collage**: Crea collage orizzontali per analisi narrative
- **Analisi AI**: Utilizza modelli di intelligenza artificiale per generare meme
- **Gestione API Multipla**: Supporta OpenAI, Anthropic, Google AI e API personalizzate
- **Elaborazione Sequenziale**: Garantisce completamento di tutti i processi prima del successivo

### 🎨 Interfaccia Utente
- **Dashboard Intuitiva**: Interfaccia moderna e user-friendly
- **Controlli Configurabili**: Textbox per tipologia meme, filtri video, stile
- **Selezione Font**: Dropdown con font disponibili dalla cartella `font/`
- **Monitor Real-time**: Progress bar e log di sistema in tempo reale
- **Gestione API Avanzata**: CRUD completo per configurazioni API

## 🚀 Installazione e Avvio

### Requisiti
- Windows 10/11
- Node.js 16+ 
- FFmpeg (per elaborazione video)
- 4GB RAM minimi

### Setup Iniziale
```bash
# Clona o scarica il progetto
cd content-creator-0-chiacchiere

# Installa dipendenze
npm install

# Avvia in modalità sviluppo (con DevTools)
npm run start

# Avvia in modalità produzione
npm run electron
```

### Struttura Cartelle Richieste
```
content-creator-0-chiacchiere/
├── INPUT/           # Video da elaborare (.mp4, .avi, .mov, .mkv)
├── OUTPUT/          # Risultati AI generati (pulita ad ogni avvio)
├── font/            # Font disponibili (.ttf, .otf)
├── prompt/          # Template prompt AI
│   ├── single_frame.txt
│   └── collage.txt
├── icon.ico         # Logo applicazione
└── api.json         # Configurazioni API
```

## 🎮 Guida all'Uso

### 1. Preparazione
1. **Aggiungi Video**: Inserisci file video nella cartella `INPUT/`
2. **Configura API**: Usa il pulsante "Gestione API" per configurare i servizi AI
3. **Seleziona Font**: Scegli un font dal dropdown (caricati da `font/`)

### 2. Configurazione Elaborazione
- **Tipologia Meme**: Descrivi il tipo di contenuto desiderato
- **Filtro Video**: Specifica criteri per filtrare i contenuti
- **Rilevamento con Collage**: ☑️ Abilita per analisi narrative con 3 frame
- **Stile Meme**: Inserisci esempi dettagliati dello stile desiderato

### 3. Processo di Elaborazione
1. **Fase 1 - Estrazione Frame**: 
   - Modalità singola: Frame centrale (50%)
   - Modalità collage: 3 frame (25%, 50%, 75%)
2. **Fase 2 - Analisi AI**: Chiamate sequenziali ai modelli configurati
3. **Risultati**: File `.txt` salvati in `OUTPUT/` con analisi complete

## ⚙️ Sistema Gestione API

### Configurazione API
- **CRUD Completo**: Aggiungi, modifica, elimina, riordina API
- **Multi-modello**: Ogni API può avere più modelli configurati
- **Limiti Dinamici**: RPM, RPD, TPM per ogni modello
- **Storico Richieste**: Tracciamento automatico con timestamp
- **Priorità Sequenziale**: Prima API → tutti modelli → API successiva

### Struttura api.json
```json
{
  "openai": {
    "alias": "OpenAI official endpoint",
    "models": {
      "gpt-4o-mini": {
        "limits": {
          "RPM": 300,
          "RPD": 20000,
          "TPM": 50000
        },
        "requests": {
          "2025-09-07T10:00:00Z": {
            "prompt": "testo prompt...",
            "tokens_used": 12,
            "response_time_ms": 210,
            "output": "risposta AI..."
          }
        }
      }
    }
  }
}
```

## 🎛️ Scripts NPM Disponibili

```json
{
  "start": "electron . --enable-localhost",     // Modalità sviluppo
  "electron": "electron .",                     // Modalità produzione
  "dev": "npm run start",                       // Alias per sviluppo
  "build": "electron-builder",                  // Build per distribuzione
  "dist": "electron-builder --publish=never"    // Crea distributivo locale
}
```

## 📁 Template Prompt AI

### single_frame.txt
Template per analisi frame singoli con variabili:
- `{{BUSINESS_THEME}}` → Tipologia Meme
- `{{CONTENT_FILTER}}` → Filtro Video  
- `{{STYLE_EXAMPLES}}` → Stile Meme

### collage.txt  
Template per analisi narrative con 3 frame sequenziali, include progressione temporale e sviluppo narrativo.

## 🔧 Funzionalità Avanzate

### Gestione Errori
- **Retry Automatico**: Su fallimenti API passa automaticamente al modello successivo
- **Rate Limiting**: Rispetta limiti RPM/RPD/TPM configurati
- **Log Dettagliati**: Tracciamento completo delle operazioni

### Performance
- **Elaborazione Sequenziale**: NO processi paralleli per garantire completamento
- **Compressione Automatica**: Immagini ottimizzate (< 100KB)
- **Cleanup Automatico**: Pulizia file temporanei e cartella OUTPUT

### Modalità Dual
- **Sviluppo**: `--enable-localhost` + DevTools aperti
- **Produzione**: Standalone senza dipendenze esterne

## 🛠️ Personalizzazione

### Aggiungere Nuove API
1. Apri "Gestione API"
2. "Aggiungi Nuova API"
3. Configura nome, alias e modelli
4. Imposta limiti RPM/RPD/TPM
5. Salva configurazione

### Modificare Template Prompt
Edita i file in `prompt/` per personalizzare:
- Stile di analisi AI
- Formato output desiderato  
- Variabili personalizzate
- Istruzioni specifiche

### Font Personalizzati
Aggiungi file `.ttf` o `.otf` nella cartella `font/` per renderli disponibili nel dropdown.

## 📊 Monitor e Log

### Dashboard Real-time
- **Contatore Video**: Numero file in INPUT/
- **Fase Corrente**: Estrazione frame / Analisi AI
- **Progress Bar**: Avanzamento visuale
- **File Corrente**: Nome file in elaborazione

### Log di Sistema
- **Timestamp**: Ogni operazione è tracciata
- **Codici Colore**: Info (blu), Success (verde), Error (rosso)
- **Storico**: Mantiene ultimi 100 eventi
- **Auto-scroll**: Segue automaticamente gli aggiornamenti

## 🚨 Troubleshooting

### Problemi Comuni
1. **FFmpeg non trovato**: Installa FFmpeg e aggiungi al PATH
2. **API non risponde**: Verifica configurazione e limiti rate
3. **Video non riconosciuti**: Supportati: .mp4, .avi, .mov, .mkv
4. **Memoria insufficiente**: Video troppo grandi, considera compressione

### Log degli Errori
Controlla il log di sistema nell'interfaccia per diagnosticare problemi specifici.

## 📄 Licenza
MIT License - Vedi file LICENSE per dettagli completi.

---

## 🏆 Sviluppato per Massima Efficienza
- ✅ Architettura modulare
- ✅ Gestione errori robusta  
- ✅ Interface utente intuitiva
- ✅ Performance ottimizzate
- ✅ Scalabilità API
- ✅ Configurazione flessibile
