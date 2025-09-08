const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ApiManager {
    constructor() {
        this.configPath = path.join(__dirname, 'api.json');
        this.config = {};
        this.loadConfig();
    }

    async loadConfig() {
        try {
            if (fsSync.existsSync(this.configPath)) {
                const data = await fs.readFile(this.configPath, 'utf8');
                this.config = JSON.parse(data);
                console.log('Configurazione API caricata');
            } else {
                // Crea configurazione di default
                this.config = this.getDefaultConfig();
                await this.saveConfig(this.config);
                console.log('Configurazione API di default creata');
            }
        } catch (error) {
            console.error('Errore nel caricamento configurazione API:', error);
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            "openai": {
                "alias": "OpenAI Official",
                "models": {
                    "gpt-4o-mini": {
                        "limits": {
                            "RPM": 300,
                            "RPD": 20000,
                            "TPM": 50000
                        },
                        "requests": {}
                    },
                    "gpt-4o": {
                        "limits": {
                            "RPM": 100,
                            "RPD": 10000,
                            "TPM": 30000
                        },
                        "requests": {}
                    }
                }
            },
            "anthropic": {
                "alias": "Anthropic Claude",
                "models": {
                    "claude-3-haiku": {
                        "limits": {
                            "RPM": 200,
                            "RPD": 15000,
                            "TPM": 40000
                        },
                        "requests": {}
                    }
                }
            }
        };
    }

    getConfig() {
        return this.config;
    }

    async saveConfig(newConfig) {
        try {
            this.config = newConfig;
            await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('Configurazione API salvata');
            return { success: true };
        } catch (error) {
            console.error('Errore nel salvataggio configurazione API:', error);
            throw error;
        }
    }

    // Ottiene la prossima API/modello disponibile basato sulla priorità
    getNextAvailableModel() {
        const apis = Object.keys(this.config);

        for (const apiKey of apis) {
            const api = this.config[apiKey];
            const models = Object.keys(api.models || {});

            for (const modelKey of models) {
                const model = api.models[modelKey];

                // Controlla se il modello è disponibile (semplificato)
                if (this.isModelAvailable(apiKey, modelKey, model)) {
                    return {
                        apiKey,
                        modelKey,
                        model,
                        alias: api.alias
                    };
                }
            }
        }

        return null;
    }

    // Controlla se un modello è disponibile per l'uso
    isModelAvailable(apiKey, modelKey, model) {
        const now = new Date();
        const limits = model.limits;
        const requests = model.requests || {};

        // Conta le richieste nell'ultimo minuto
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        const recentRequests = Object.keys(requests).filter(timestamp =>
            new Date(timestamp) > oneMinuteAgo
        ).length;

        // Conta le richieste oggi
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayRequests = Object.keys(requests).filter(timestamp =>
            new Date(timestamp) >= todayStart
        ).length;

        // Verifica limiti
        const withinRPM = recentRequests < limits.RPM;
        const withinRPD = todayRequests < limits.RPD;

        return withinRPM && withinRPD;
    }

    // Registra una nuova richiesta
    async logRequest(apiKey, modelKey, requestData) {
        try {
            const timestamp = new Date().toISOString();

            if (!this.config[apiKey] || !this.config[apiKey].models[modelKey]) {
                throw new Error(`API o modello non trovato: ${apiKey}/${modelKey}`);
            }

            // Aggiungi la richiesta al log
            this.config[apiKey].models[modelKey].requests[timestamp] = {
                prompt: requestData.prompt ? requestData.prompt.substring(0, 100) + '...' : '',
                tokens_used: requestData.tokens_used || 0,
                response_time_ms: requestData.response_time_ms || 0,
                output: requestData.output ? requestData.output.substring(0, 200) + '...' : '',
                success: requestData.success || true
            };

            // Pulisci vecchi log (mantieni solo ultimi 30 giorni)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const requests = this.config[apiKey].models[modelKey].requests;

            Object.keys(requests).forEach(timestamp => {
                if (new Date(timestamp) < thirtyDaysAgo) {
                    delete requests[timestamp];
                }
            });

            // Salva configurazione aggiornata
            await this.saveConfig(this.config);

            console.log(`Richiesta registrata per ${apiKey}/${modelKey}`);

        } catch (error) {
            console.error('Errore nella registrazione richiesta:', error);
        }
    }

    // Ottiene statistiche di utilizzo
    getUsageStats(apiKey, modelKey) {
        if (!this.config[apiKey] || !this.config[apiKey].models[modelKey]) {
            return null;
        }

        const requests = this.config[apiKey].models[modelKey].requests || {};
        const now = new Date();

        // Statistiche ultima ora
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const hourlyRequests = Object.keys(requests).filter(timestamp =>
            new Date(timestamp) > oneHourAgo
        ).length;

        // Statistiche oggi
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dailyRequests = Object.keys(requests).filter(timestamp =>
            new Date(timestamp) >= todayStart
        ).length;

        // Statistiche totali
        const totalRequests = Object.keys(requests).length;

        return {
            hourly: hourlyRequests,
            daily: dailyRequests,
            total: totalRequests,
            limits: this.config[apiKey].models[modelKey].limits
        };
    }

    // Ottiene tutte le API configurate con le loro statistiche
    getAllApisWithStats() {
        const result = {};

        Object.keys(this.config).forEach(apiKey => {
            const api = this.config[apiKey];
            result[apiKey] = {
                alias: api.alias,
                models: {}
            };

            Object.keys(api.models || {}).forEach(modelKey => {
                result[apiKey].models[modelKey] = {
                    ...api.models[modelKey],
                    stats: this.getUsageStats(apiKey, modelKey),
                    available: this.isModelAvailable(apiKey, modelKey, api.models[modelKey])
                };
            });
        });

        return result;
    }

    // Aggiungi una nuova API
    async addApi(apiKey, alias, models = {}) {
        if (this.config[apiKey]) {
            throw new Error(`API ${apiKey} già esistente`);
        }

        this.config[apiKey] = {
            alias: alias,
            models: models
        };

        await this.saveConfig(this.config);
        return { success: true };
    }

    // Rimuovi un'API
    async removeApi(apiKey) {
        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non trovata`);
        }

        delete this.config[apiKey];
        await this.saveConfig(this.config);
        return { success: true };
    }

    // Aggiungi un modello a un'API esistente
    async addModel(apiKey, modelKey, limits) {
        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non trovata`);
        }

        if (this.config[apiKey].models[modelKey]) {
            throw new Error(`Modello ${modelKey} già esistente per API ${apiKey}`);
        }

        this.config[apiKey].models[modelKey] = {
            limits: limits,
            requests: {}
        };

        await this.saveConfig(this.config);
        return { success: true };
    }

    // Rimuovi un modello da un'API
    async removeModel(apiKey, modelKey) {
        if (!this.config[apiKey] || !this.config[apiKey].models[modelKey]) {
            throw new Error(`Modello ${apiKey}/${modelKey} non trovato`);
        }

        delete this.config[apiKey].models[modelKey];
        await this.saveConfig(this.config);
        return { success: true };
    }

    // Reset dei contatori per tutti i modelli
    async resetAllCounters() {
        Object.keys(this.config).forEach(apiKey => {
            Object.keys(this.config[apiKey].models || {}).forEach(modelKey => {
                this.config[apiKey].models[modelKey].requests = {};
            });
        });

        await this.saveConfig(this.config);
        console.log('Tutti i contatori sono stati resettati');
        return { success: true };
    }
}

module.exports = ApiManager;