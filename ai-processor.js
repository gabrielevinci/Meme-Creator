const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AiProcessor {
    constructor() {
        this.promptsDir = path.join(__dirname, 'prompt');
    }

    async callAnthropic(model, prompt, imageData) {
        // Simula chiamata Anthropic Claude (sostituire con vera implementazione)
        console.log(`Simulazione chiamata Anthropic - Modello: ${model}`);
        console.log(`Prompt inviato (primi 100 caratteri): ${prompt.substring(0, 100)}...`);
        console.log(`Numero di immagini allegate: ${imageData.length}`);

        await this.delay(1800);

        return `[SIMULAZIONE ANTHROPIC CLAUDE - ${model}]

IMMAGINI ANALIZZATE: ${imageData.length} immagine/i elaborate con Claude Vision

DESCRIZIONE: L'immagine presenta caratteristiche visuali adatte per la generazione di contenuto umoristico.

ELEMENTI MEME: Identificati elementi di espressione e contesto che supportano la narrazione memetic.

TESTO SUGGERITO: "POV: Hai appena finito la presentazione e il CEO fa una domanda"

RATIONALE: Il formato POV (Point of View) è molto popolare nei meme contemporanei e crea immediata identificazione con l'audience aziendale.`;
    }

    async analyzeFrames(framePaths, config, apiManager) {
        console.log('Avvio analisi AI per', framePaths.length, 'frame');

        try {
            // Carica il template prompt appropriato
            const templateName = config.useCollage ? 'collage.txt' : 'single_frame.txt';
            const promptTemplate = await this.loadPromptTemplate(templateName);

            // Sostituisci le variabili nel template
            const finalPrompt = this.replaceVariables(promptTemplate, config);

            // Converte le immagini in base64
            const imageData = [];
            for (const framePath of framePaths) {
                console.log(`Conversione immagine in base64: ${framePath}`);
                const base64 = await this.getImageBase64(framePath);
                console.log(`Immagine convertita, dimensione base64: ${base64.length} caratteri`);
                imageData.push(base64);
            }

            // Ottieni il prossimo modello disponibile
            const modelInfo = apiManager.getNextAvailableModel();
            if (!modelInfo) {
                throw new Error('Nessun modello AI disponibile al momento');
            }

            console.log(`Usando modello: ${modelInfo.apiKey}/${modelInfo.modelKey}`);

            // Effettua la chiamata AI
            const startTime = Date.now();
            const response = await this.callAiApi(modelInfo, finalPrompt, imageData);
            const responseTime = Date.now() - startTime;

            // Registra la richiesta
            await apiManager.logRequest(modelInfo.apiKey, modelInfo.modelKey, {
                prompt: finalPrompt.substring(0, 100),
                tokens_used: this.estimateTokens(finalPrompt + response),
                response_time_ms: responseTime,
                output: response.substring(0, 200),
                success: true
            });

            console.log(`Analisi AI completata in ${responseTime}ms`);

            // Salva l'output AI in un file .txt nella cartella temp_frames (non più OUTPUT)
            const outputFileName = this.generateOutputFileName(framePaths[0]);
            const outputPath = path.join(__dirname, 'temp_frames', outputFileName);
            await this.saveAiOutputToFile(outputPath, response, config, framePaths[0]);

            console.log(`Output salvato in: ${outputFileName}`);

            return {
                response: response,
                outputFile: outputFileName,
                modelUsed: `${modelInfo.apiKey}/${modelInfo.modelKey}`,
                responseTime: responseTime
            };

        } catch (error) {
            console.error('❌ Errore nell\'analisi AI:', error.message);

            // Ottieni informazioni del modello corrente per il blacklist
            let currentModel = null;
            try {
                currentModel = apiManager.getNextAvailableModel();
            } catch (modelError) {
                // Ignora errori nella lettura del modello
            }

            // Prova con il prossimo modello disponibile per errori recuperabili
            const shouldRetryWithDifferentModel = error.message.includes('rate limit') || 
                                                 error.message.includes('429') || 
                                                 error.message.includes('server') ||
                                                 error.message.includes('404') ||
                                                 error.message.includes('non trovato') ||
                                                 error.message.includes('not found') ||
                                                 error.message.includes('401') ||
                                                 error.message.includes('timeout') ||
                                                 error.message.includes('ECONNREFUSED');

            if (shouldRetryWithDifferentModel && currentModel) {
                console.log(`� Marcando temporaneamente il modello ${currentModel.apiKey}/${currentModel.modelKey} come non disponibile`);
                
                // Marca il modello corrente come temporaneamente non disponibile
                apiManager.markModelTemporaryUnavailable(currentModel.apiKey, currentModel.modelKey, 5 * 60 * 1000); // 5 minuti

                try {
                    const nextModel = apiManager.getNextAvailableModel();
                    if (nextModel && (nextModel.apiKey !== currentModel.apiKey || nextModel.modelKey !== currentModel.modelKey)) {
                        console.log(`🔄 Tentativo con modello alternativo: ${nextModel.apiKey}/${nextModel.modelKey}`);
                        return await this.analyzeFrames(framePaths, config, apiManager);
                    }
                } catch (fallbackError) {
                    console.error('❌ Anche il modello alternativo ha fallito:', fallbackError.message);
                    
                    // Se anche il fallback fallisce, ripristina il modello originale
                    if (currentModel) {
                        apiManager.clearModelTemporaryUnavailability(currentModel.apiKey, currentModel.modelKey);
                    }
                    
                    throw new Error(`Tutti i modelli disponibili hanno fallito. Ultimo errore: ${fallbackError.message}`);
                }
            }

            // Ottieni informazioni del modello per il log degli errori
            let modelUsed = 'Nessun modello disponibile';
            if (currentModel) {
                modelUsed = `${currentModel.apiKey}/${currentModel.modelKey}`;
            }

            // Aggiungi informazioni di contesto all'errore
            const contextError = new Error(`Analisi AI fallita: ${error.message}`);
            contextError.originalError = error;
            contextError.modelUsed = modelUsed;
            contextError.framesCount = framePaths.length;
            throw contextError;
        }
    }

    async loadPromptTemplate(templateName) {
        try {
            const templatePath = path.join(this.promptsDir, templateName);
            const template = await fs.readFile(templatePath, 'utf8');
            return template;
        } catch (error) {
            console.error(`Errore nel caricamento template ${templateName}:`, error);
            // Fallback ai template di default
            return this.getDefaultTemplate(templateName);
        }
    }

    getDefaultTemplate(templateName) {
        const templates = {
            'single_frame.txt': `Analizza questa immagine estratta da un video per creare un meme.

BUSINESS THEME: {{BUSINESS_THEME}}

CONTENT FILTER: {{CONTENT_FILTER}}

STYLE EXAMPLES: {{STYLE_EXAMPLES}}

Istruzioni:
1. Descrivi cosa vedi nell'immagine in modo dettagliato
2. Identifica elementi che possono essere utilizzati per creare un meme
3. Suggerisci il testo del meme basato sul tema business specificato
4. Considera il filtro contenuti per mantenere appropriatezza
5. Segui lo stile degli esempi forniti

Formato risposta:
DESCRIZIONE: [Descrizione dettagliata dell'immagine]
ELEMENTI MEME: [Elementi identificati per il meme]
TESTO SUGGERITO: [Testo del meme proposto]
RATIONALE: [Spiegazione della scelta]`,

            'collage.txt': `Analizza questo collage di 3 frame estratti da un video per creare un meme narrativo.

BUSINESS THEME: {{BUSINESS_THEME}}

CONTENT_FILTER: {{CONTENT_FILTER}}

STYLE_EXAMPLES: {{STYLE_EXAMPLES}}

Istruzioni:
1. Analizza la sequenza temporale dei 3 frame (25%, 50%, 75% del video)
2. Identifica una progressione o narrazione tra i frame
3. Crea un meme che sfrutta questa evoluzione temporale
4. Considera il tema business specificato
5. Rispetta i filtri contenuti e lo stile degli esempi

Formato risposta:
FRAME 1 (25%): [Descrizione primo frame]
FRAME 2 (50%): [Descrizione secondo frame]
FRAME 3 (75%): [Descrizione terzo frame]
PROGRESSIONE: [Analisi della sequenza temporale]
MEME NARRATIVO: [Testo del meme che sfrutta la progressione]
RATIONALE: [Spiegazione della scelta creativa]`
        };

        return templates[templateName] || templates['single_frame.txt'];
    }

    replaceVariables(template, config) {
        let processedTemplate = template;

        const variables = {
            '{{BUSINESS_THEME}}': config.memeType || 'Contenuto generico',
            '{{CONTENT_FILTER}}': config.videoFilter || 'Nessun filtro specificato',
            '{{STYLE_EXAMPLES}}': config.memeStyle || 'Stile libero'
        };

        Object.keys(variables).forEach(variable => {
            const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
            processedTemplate = processedTemplate.replace(regex, variables[variable]);
        });

        return processedTemplate;
    }

    async callAiApi(modelInfo, prompt, imageData) {
        const { apiKey, modelKey } = modelInfo;

        try {
            console.log(`🚀 Iniziando chiamata API: ${apiKey}/${modelKey}`);

            switch (apiKey.toLowerCase()) {
                case 'openai':
                    return await this.callOpenAI(modelKey, prompt, imageData);
                case 'anthropic':
                    return await this.callAnthropic(modelKey, prompt, imageData);
                case 'google':
                    return await this.callGoogleAI(modelKey, prompt, imageData);
                default:
                    return await this.callGenericAPI(modelInfo, prompt, imageData);
            }
        } catch (error) {
            console.error(`❌ Errore chiamata API ${apiKey}/${modelKey}:`, error.message);

            // Aggiungi dettagli specifici al tipo di errore
            if (error.message.includes('401')) {
                throw new Error(`API Key non valida per ${apiKey}. Verifica la configurazione.`);
            } else if (error.message.includes('404')) {
                throw new Error(`Modello ${modelKey} non trovato per ${apiKey}. Verifica il nome del modello.`);
            } else if (error.message.includes('429')) {
                throw new Error(`Limite di richieste superato per ${apiKey}/${modelKey}. Riprova più tardi.`);
            } else if (error.message.includes('500') || error.message.includes('server')) {
                throw new Error(`Problemi temporanei del servizio ${apiKey}. Riprova più tardi.`);
            } else if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
                throw new Error(`Timeout nella chiamata a ${apiKey}/${modelKey}. La richiesta ha impiegato troppo tempo.`);
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                throw new Error(`Problemi di connessione con ${apiKey}. Verifica la connessione internet.`);
            }

            throw error;
        }
    }

    async callOpenAI(model, prompt, imageData) {
        // Simula chiamata OpenAI (sostituire con vera implementazione)
        console.log(`Simulazione chiamata OpenAI - Modello: ${model}`);
        console.log(`Prompt inviato (primi 100 caratteri): ${prompt.substring(0, 100)}...`);
        console.log(`Numero di immagini allegate: ${imageData.length}`);
        if (imageData.length > 0) {
            console.log(`Dimensione prima immagine: ${imageData[0].length} caratteri base64`);
        }

        await this.delay(2000); // Simula tempo di risposta

        return `[SIMULAZIONE OPENAI - ${model}]

IMMAGINI ANALIZZATE: ${imageData.length} immagine/i ricevute e processate

DESCRIZIONE: L'immagine mostra una scena di un video con elementi visivi interessanti per la creazione di meme.

ELEMENTI MEME: Sono stati identificati elementi espressivi e situazioni potenzialmente umoristiche.

TESTO SUGGERITO: "Quando realizzi che il progetto è in ritardo ma il cliente è felice"

RATIONALE: Il meme sfrutta il contrasto tra aspettative e realtà, tipico nel mondo business, creando un momento di riconoscimento umoristico per il pubblico target.`;
    }

    async callAnthropic(model, prompt, imageData) {
        // Simula chiamata Anthropic Claude (sostituire con vera implementazione)
        console.log(`Simulazione chiamata Anthropic - Modello: ${model}`);

        await this.delay(1800);

        return `[SIMULAZIONE ANTHROPIC - ${model}]

DESCRIZIONE: L'analisi dell'immagine rivela una composizione che si presta bene alla creazione di contenuto memetic.

ELEMENTI MEME: Elementi espressivi e contesto situazionale identificati come potenziali trigger umoristici.

TESTO SUGGERITO: "La riunione delle 16:30 del venerdì"

RATIONALE: Questo approccio sfrutta l'esperienza universale lavorativa, creando un meme relatable che risuona con il pubblico professionale.`;
    }

    async callGoogleAI(model, prompt, imageData) {
        // Simula chiamata Google AI (sostituire con vera implementazione)
        console.log(`Simulazione chiamata Google AI - Modello: ${model}`);

        await this.delay(1500);

        return `[SIMULAZIONE GOOGLE AI - ${model}]

DESCRIZIONE: L'immagine presenta caratteristiche visuali adatte per la generazione di contenuto umoristico.

ELEMENTI MEME: Identificati elementi di espressione e contesto che supportano la narrazione memetic.

TESTO SUGGERITO: "POV: Hai appena finito la presentazione e il CEO fa una domanda"

RATIONALE: Il formato POV (Point of View) è molto popolare nei meme contemporanei e crea immediata identificazione con l'audience aziendale.`;
    }

    async callGenericAPI(modelInfo, prompt, imageData) {
        // Vera implementazione Google AI API con gestione errori migliorata
        console.log(`Chiamata API generica: ${modelInfo.apiKey}/${modelInfo.modelKey}`);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelInfo.modelKey}:generateContent?key=${modelInfo.apiKey}`;

        // Prepara il contenuto per la richiesta
        const parts = [
            { text: prompt }
        ];

        // Aggiungi le immagini se presenti
        for (const base64Image of imageData) {
            parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                }
            });
        }

        const requestBody = {
            contents: [{
                parts: parts
            }],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            },
            safetySettings: [{
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        let lastError = null;
        const maxRetries = 3;

        // Retry logic con backoff esponenziale
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Tentativo ${attempt}/${maxRetries} per ${modelInfo.apiKey}/${modelInfo.modelKey}`);

                const response = await axios.post(apiUrl, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000
                });

                if (response.data && response.data.candidates && response.data.candidates[0]) {
                    const content = response.data.candidates[0].content;
                    if (content && content.parts && content.parts[0]) {
                        console.log(`✅ Successo al tentativo ${attempt}`);
                        return content.parts[0].text;
                    }
                }

                throw new Error('Risposta API non valida o vuota');

            } catch (error) {
                lastError = error;

                let errorMsg = error.message;
                let shouldRetry = false;

                if (error.response) {
                    const status = error.response.status;
                    const statusText = error.response.statusText;

                    switch (status) {
                        case 400:
                            errorMsg = `Richiesta malformata (400): Verifica i parametri del modello`;
                            break;
                        case 401:
                            errorMsg = `API Key non valida (401): Controlla la chiave API`;
                            break;
                        case 403:
                            errorMsg = `Accesso negato (403): Verifica i permessi dell'API Key`;
                            break;
                        case 404:
                            errorMsg = `Modello non trovato (404): ${modelInfo.modelKey} non esiste`;
                            break;
                        case 429:
                            errorMsg = `Rate limit superato (429): Troppo richieste`;
                            shouldRetry = true;
                            break;
                        case 500:
                        case 502:
                        case 503:
                        case 504:
                            errorMsg = `Errore server (${status}): Problemi temporanei del servizio`;
                            shouldRetry = true;
                            break;
                        default:
                            errorMsg = `HTTP ${status}: ${statusText}`;
                            shouldRetry = status >= 500; // Retry solo per errori server
                    }

                } else if (error.code === 'ECONNABORTED') {
                    errorMsg = `Timeout: La richiesta ha impiegato troppo tempo`;
                    shouldRetry = true;
                } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    errorMsg = `Problemi di connessione: Verifica la connessione internet`;
                    shouldRetry = true;
                }

                console.error(`❌ Tentativo ${attempt} fallito: ${errorMsg}`);

                // Non fare retry se non è un errore temporaneo o se è l'ultimo tentativo
                if (!shouldRetry || attempt === maxRetries) {
                    console.error(`🚫 Fallimento definitivo per ${modelInfo.apiKey}/${modelInfo.modelKey}: ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                // Backoff esponenziale: 1s, 2s, 4s
                const waitTime = Math.pow(2, attempt - 1) * 1000;
                console.log(`⏳ Attesa ${waitTime}ms prima del prossimo tentativo...`);
                await this.delay(waitTime);
            }
        }

        // Questo non dovrebbe mai essere raggiunto, ma per sicurezza
        throw new Error(lastError ? lastError.message || 'Errore sconosciuto dopo tutti i tentativi' : 'Errore sconosciuto dopo tutti i tentativi');
    }

    async getImageBase64(imagePath) {
        try {
            const buffer = await fs.readFile(imagePath);
            return buffer.toString('base64');
        } catch (error) {
            console.error('Errore conversione Base64:', error);
            throw error;
        }
    }

    estimateTokens(text) {
        // Stima approssimativa: ~4 caratteri per token
        return Math.ceil(text.length / 4);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Metodo per testare la connettività AI
    async testApiConnectivity(apiKey, modelKey) {
        try {
            const testPrompt = "Test di connettività";
            const mockImageData = ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="]; // 1x1 pixel trasparente

            const modelInfo = { apiKey, modelKey };
            const response = await this.callAiApi(modelInfo, testPrompt, mockImageData);

            return {
                success: true,
                response: response.substring(0, 100) + '...'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Metodo per elaborazione batch di frame
    async processBatch(framesBatch, config, apiManager) {
        const results = [];

        for (let i = 0; i < framesBatch.length; i++) {
            const frames = framesBatch[i];
            console.log(`Elaborazione batch ${i + 1}/${framesBatch.length}`);

            try {
                const result = await this.analyzeFrames(frames, config, apiManager);
                results.push({
                    success: true,
                    result: result,
                    frameIndex: i
                });
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                    frameIndex: i
                });
            }

            // Piccola pausa tra le chiamate per evitare rate limiting
            if (i < framesBatch.length - 1) {
                await this.delay(1000);
            }
        }

        return results;
    }

    generateOutputFileName(framePath) {
        // Estrae il nome base del frame che ora corrisponde al video originale
        const frameBaseName = path.basename(framePath, path.extname(framePath));
        
        // Rimuove tutti i suffissi per ottenere il nome del video originale 
        const videoBaseName = frameBaseName
            .replace(/_frame_center$/, '')
            .replace(/_frame_\d+$/, '')
            .replace(/_collage$/, '')
            .replace(/_compressed$/, '')  // Rimuove _compressed
            .replace(/_compressed_final$/, ''); // Rimuove _compressed_final se presente
            
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${videoBaseName}_ai_output_${timestamp}.txt`;
    }

    async saveAiOutputToFile(outputPath, aiResponse, config, framePath) {
        const videoName = path.basename(framePath);
        const content = `ANALISI AI - ${videoName}
========================================

CONFIGURAZIONE:
- Tipologia Meme: ${config.memeType}
- Filtro Video: ${config.videoFilter}
- Stile Meme: ${config.memeStyle}
- Usa Collage: ${config.useCollage ? 'Sì' : 'No'}
- Font Selezionato: ${config.selectedFont}

TIMESTAMP: ${new Date().toISOString()}

RISPOSTA AI:
========================================

${aiResponse}

========================================
Fine Analisi
`;

        await fs.writeFile(outputPath, content, 'utf8');
    }
}

module.exports = AiProcessor;