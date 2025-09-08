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
        // Ordina le API per priorità (1 = più alta priorità)
        const sortedApis = Object.entries(this.config)
            .filter(([apiKey, api]) => api.enabled !== false)
            .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));

        for (const [apiKey, api] of sortedApis) {
            const models = Object.entries(api.models || {});

            // Ordina i modelli per priorità interna (se definita)
            const sortedModels = models.sort(([, a], [, b]) =>
                (a.priority || 999) - (b.priority || 999)
            );

            for (const [modelKey, model] of sortedModels) {
                if (this.isModelAvailable(apiKey, modelKey, model)) {
                    return {
                        apiKey,
                        modelKey,
                        config: model,
                        alias: api.alias
                    };
                }
            }
        }

        throw new Error('Nessun modello disponibile al momento. Controlla i limiti di rate limiting.');
    }

    // Verifica se un modello è disponibile considerando i limiti
    isModelAvailable(apiKey, modelKey, model) {
        const now = Date.now();
        const requests = model.requests || {};
        const limits = model.limits || {};

        // Controllo RPM (Richieste Per Minuto)
        if (limits.RPM) {
            const lastMinute = now - 60 * 1000;
            const recentRequests = Object.values(requests)
                .filter(timestamp => timestamp > lastMinute).length;

            if (recentRequests >= limits.RPM) {
                console.log(`Modello ${apiKey}/${modelKey} ha raggiunto il limite RPM (${recentRequests}/${limits.RPM})`);
                return false;
            }
        }

        // Controllo RPD (Richieste Per Giorno)
        if (limits.RPD) {
            const lastDay = now - 24 * 60 * 60 * 1000;
            const dailyRequests = Object.values(requests)
                .filter(timestamp => timestamp > lastDay).length;

            if (dailyRequests >= limits.RPD) {
                console.log(`Modello ${apiKey}/${modelKey} ha raggiunto il limite RPD (${dailyRequests}/${limits.RPD})`);
                return false;
            }
        }

        // Controllo TPM verrebbe implementato considerando i token effettivi
        // Per ora è semplificato

        return true;
    }

    // Registra una richiesta per il rate limiting
    logRequest(apiKey, modelKey, tokensUsed = 0) {
        const now = Date.now();
        const requestId = `${now}_${Math.random().toString(36).substr(2, 9)}`;

        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non configurata`);
        }

        if (!this.config[apiKey].models[modelKey]) {
            throw new Error(`Modello ${modelKey} non configurato per API ${apiKey}`);
        }

        if (!this.config[apiKey].models[modelKey].requests) {
            this.config[apiKey].models[modelKey].requests = {};
        }

        this.config[apiKey].models[modelKey].requests[requestId] = {
            timestamp: now,
            tokens: tokensUsed
        };

        // Pulisci richieste vecchie (più di 1 giorno)
        this.cleanOldRequests(apiKey, modelKey);

        // Salva la configurazione aggiornata
        this.saveConfig(this.config);

        console.log(`Richiesta registrata: ${apiKey}/${modelKey} - ${tokensUsed} token`);
    }

    // Pulisce le richieste vecchie per ottimizzare la memoria
    cleanOldRequests(apiKey, modelKey) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const requests = this.config[apiKey].models[modelKey].requests || {};

        for (const [requestId, requestData] of Object.entries(requests)) {
            if (requestData.timestamp < oneDayAgo) {
                delete requests[requestId];
            }
        }
    }

    // Ottiene statistiche di utilizzo per un'API
    getApiStats(apiKey) {
        if (!this.config[apiKey]) return null;

        const api = this.config[apiKey];
        const now = Date.now();
        const stats = {
            alias: api.alias,
            enabled: api.enabled !== false,
            priority: api.priority || 999,
            models: {}
        };

        for (const [modelKey, model] of Object.entries(api.models || {})) {
            const requests = Object.values(model.requests || {});
            const lastHour = now - 60 * 60 * 1000;
            const lastDay = now - 24 * 60 * 60 * 1000;

            stats.models[modelKey] = {
                limits: model.limits || {},
                usage: {
                    lastHour: requests.filter(req => req.timestamp > lastHour).length,
                    lastDay: requests.filter(req => req.timestamp > lastDay).length,
                    totalTokens: requests.reduce((sum, req) => sum + (req.tokens || 0), 0)
                },
                available: this.isModelAvailable(apiKey, modelKey, model)
            };
        }

        return stats;
    }

    // Ottiene tutte le statistiche
    getAllStats() {
        const stats = {};
        for (const apiKey of Object.keys(this.config)) {
            stats[apiKey] = this.getApiStats(apiKey);
        }
        return stats;
    }

    // Riordina le priorità delle API
    reorderPriorities(newOrder) {
        newOrder.forEach((apiKey, index) => {
            if (this.config[apiKey]) {
                this.config[apiKey].priority = index + 1;
            }
        });

        return this.saveConfig(this.config);
    }

    // Abilita/disabilita un'API
    toggleApi(apiKey) {
        if (this.config[apiKey]) {
            this.config[apiKey].enabled = !this.config[apiKey].enabled;
            return this.saveConfig(this.config);
        }
        throw new Error(`API ${apiKey} non trovata`);
    }

    // Aggiunge un nuovo modello a un'API esistente
    addModel(apiKey, modelName, limits = {}) {
        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non configurata`);
        }

        if (!this.config[apiKey].models) {
            this.config[apiKey].models = {};
        }

        this.config[apiKey].models[modelName] = {
            limits: {
                RPM: limits.RPM || 100,
                RPD: limits.RPD || 1000,
                TPM: limits.TPM || 50000
            },
            requests: {}
        };

        return this.saveConfig(this.config);
    }

    // Rimuove un modello
    removeModel(apiKey, modelName) {
        if (this.config[apiKey] && this.config[apiKey].models[modelName]) {
            delete this.config[apiKey].models[modelName];
            return this.saveConfig(this.config);
        }
        throw new Error(`Modello ${modelName} non trovato per API ${apiKey}`);
    }
}

module.exports = ApiManager;