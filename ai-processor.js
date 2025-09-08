const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class AiProcessor {
    constructor() {
        this.promptsDir = path.join(__dirname, 'prompt');
    }

    async analyzeFrames(framePaths, config, apiManager) {
        console.log('Avvio analisi AI per', framePaths.length, 'frame');

        // Verifica che ci siano frame da elaborare
        if (!framePaths || framePaths.length === 0) {
            throw new Error('Nessun frame disponibile per l\'analisi AI');
        }

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
                prompt: finalPrompt, // Salva il prompt completo
                tokens_used: this.estimateTokens(finalPrompt + response),
                response_time_ms: responseTime,
                output: response.substring(0, 200),
                success: true
            });

            console.log(`Analisi AI completata in ${responseTime}ms`);
            
            // Salva l'output AI in un file .txt nella cartella OUTPUT
            const outputFileName = this.generateOutputFileName(framePaths[0]);
            const outputPath = path.join(__dirname, 'OUTPUT', outputFileName);
            await this.saveAiOutputToFile(outputPath, response, config, framePaths[0]);

            console.log(`Output salvato in: ${outputFileName}`);

            return {
                response: response,
                outputFile: outputFileName,
                modelUsed: `${modelInfo.apiKey}/${modelInfo.modelKey}`,
                responseTime: responseTime
            };

        } catch (error) {
            console.error('Errore nell\'analisi AI:', error);

            // Prova con il prossimo modello disponibile se possibile
            const nextModel = apiManager.getNextAvailableModel();
            if (nextModel && error.message.includes('rate limit')) {
                console.log('Tentativo con modello alternativo...');
                return this.analyzeFrames(framePaths, config, apiManager);
            }

            throw error;
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
            console.error(`Errore chiamata API ${apiKey}/${modelKey}:`, error.message);
            throw error;
        }
    }

    async callOpenAI(model, prompt, imageData) {
        // TODO: Implementare chiamata OpenAI reale
        console.log(`⚠️  SIMULAZIONE OpenAI - Modello: ${model} (Implementazione reale non disponibile)`);
        console.log(`Prompt length: ${prompt.length}, Images: ${imageData.length}`);

        await this.delay(2000); // Simula tempo di risposta

        return `[SIMULAZIONE OPENAI - ${model}]

DESCRIZIONE: L'immagine mostra una scena di un video con elementi visivi interessanti per la creazione di meme.

ELEMENTI MEME: Sono stati identificati elementi espressivi e situazioni potenzialmente umoristiche.

TESTO SUGGERITO: "Quando realizzi che il progetto è in ritardo ma il cliente è felice"

RATIONALE: Il meme sfrutta il contrasto tra aspettative e realtà, tipico nel mondo business, creando un momento di riconoscimento umoristico per il pubblico target.`;
    }

    async callAnthropic(model, prompt, imageData) {
        // TODO: Implementare chiamata Anthropic reale  
        console.log(`⚠️  SIMULAZIONE Anthropic - Modello: ${model} (Implementazione reale non disponibile)`);
        console.log(`Prompt length: ${prompt.length}, Images: ${imageData.length}`);

        await this.delay(1800);

        return `[SIMULAZIONE ANTHROPIC - ${model}]

DESCRIZIONE: L'analisi dell'immagine rivela una composizione che si presta bene alla creazione di contenuto memetic.

ELEMENTI MEME: Elementi espressivi e contesto situazionale identificati come potenziali trigger umoristici.

TESTO SUGGERITO: "La riunione delle 16:30 del venerdì"

RATIONALE: Questo approccio sfrutta l'esperienza universale lavorativa, creando un meme relatable che risuona con il pubblico professionale.`;
    }

    async callGoogleAI(model, prompt, imageData) {
        console.log(`Chiamata reale Google AI - Modello: ${model}`);
        console.log(`Numero di immagini da processare: ${imageData.length}`);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        
        // Prepara il contenuto multimodale (testo + immagini)
        const contents = [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ];

        // Aggiungi le immagini come inline_data
        for (let i = 0; i < imageData.length; i++) {
            contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imageData[i]
                }
            });
        }

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        };

        try {
            const response = await axios.post(endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': model // Usa il modello come API key (modifica basata sulla struttura API)
                },
                timeout: 30000
            });

            if (response.data && response.data.candidates && response.data.candidates[0]) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                    const aiResponse = candidate.content.parts[0].text;
                    console.log(`Google AI risposta ricevuta: ${aiResponse.length} caratteri`);
                    return aiResponse;
                } else {
                    throw new Error('Formato risposta Google AI non valido');
                }
            } else {
                throw new Error('Risposta Google AI vuota o non valida');
            }

        } catch (error) {
            console.error('Errore Google AI API:', error.response?.data || error.message);
            throw new Error(`Google AI API Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async callGenericAPI(modelInfo, prompt, imageData) {
        // Implementazione per API personalizzate (assumed Google AI Studio format)
        console.log(`Chiamata API personalizzata: ${modelInfo.apiKey}/${modelInfo.modelKey}`);
        console.log(`Prompt completo ricevuto (${prompt.length} caratteri)`);
        console.log(`Numero di immagini allegate: ${imageData.length}`);
        
        // Assumi che le API personalizzate usino il formato Google AI Studio
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelInfo.modelKey}:generateContent`;
        
        // Prepara il contenuto multimodale (testo + immagini)
        const contents = [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ];

        // Aggiungi le immagini come inline_data
        for (let i = 0; i < imageData.length; i++) {
            contents[0].parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: imageData[i]
                }
            });
        }

        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            }
        };

        try {
            const response = await axios.post(endpoint, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': modelInfo.apiKey // Usa l'API key reale
                },
                timeout: 30000
            });

            if (response.data && response.data.candidates && response.data.candidates[0]) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                    const aiResponse = candidate.content.parts[0].text;
                    console.log(`API personalizzata risposta ricevuta: ${aiResponse.length} caratteri`);
                    return aiResponse;
                } else {
                    throw new Error('Formato risposta API non valido');
                }
            } else {
                throw new Error('Risposta API vuota o non valida');
            }

        } catch (error) {
            console.error(`Errore API personalizzata ${modelInfo.apiKey}:`, error.response?.data || error.message);
            
            // Se l'errore indica rate limiting, rilancia per retry
            if (error.response?.status === 429 || error.message.includes('rate limit')) {
                throw new Error('rate limit exceeded');
            }
            
            throw new Error(`API Error: ${error.response?.data?.error?.message || error.message}`);
        }
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
            const testPrompt = "Rispondi con 'Test di connettività riuscito' se ricevi questo messaggio.";
            const mockImageData = ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="]; // 1x1 pixel trasparente

            const modelInfo = { apiKey, modelKey };
            
            console.log(`🧪 Test connettività API: ${apiKey}/${modelKey}`);
            
            const response = await this.callAiApi(modelInfo, testPrompt, mockImageData);

            return {
                success: true,
                response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
                responseLength: response.length
            };
        } catch (error) {
            console.error(`❌ Test fallito per ${apiKey}/${modelKey}:`, error.message);
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
        // Gestisce il caso in cui framePath sia undefined o vuoto
        if (!framePath) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            return `output_${timestamp}.txt`;
        }
        
        // Estrae il nome del video dal path del frame
        const baseName = path.basename(framePath);
        // Rimuove i timestamp e suffissi per ottenere il nome originale del video
        const videoName = baseName.replace(/^\d+_[a-z0-9]+_/, '').replace(/_compressed\.jpg$/, '').replace(/\.jpg$/, '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${videoName}_${timestamp}.txt`;
    }

    async saveAiOutputToFile(outputPath, aiResponse, config, framePath) {
        const videoName = framePath ? path.basename(framePath) : 'unknown_video';
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