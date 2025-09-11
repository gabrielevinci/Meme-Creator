const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ApiManager {
    constructor() {
        this.configPath = path.join(__dirname, 'api.json');
        this.config = {};
        // Inizializza la configurazione sincrona
        this.initConfig();
    }

    initConfig() {
        try {
            if (fsSync.existsSync(this.configPath)) {
                const data = fsSync.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(data);
                console.log('Configurazione API caricata');
            } else {
                // Crea configurazione di default
                this.config = this.getDefaultConfig();
                fsSync.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
                console.log('Configurazione API di default creata');
            }
        } catch (error) {
            console.error('Errore nel caricamento configurazione API:', error);
            this.config = this.getDefaultConfig();
        }
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
        // Verifica che la configurazione sia caricata
        if (!this.config || Object.keys(this.config).length === 0) {
            console.error('Configurazione API non caricata o vuota');
            throw new Error('Configurazione API non disponibile');
        }

        // Ordina le API per priorità (1 = più alta priorità)
        const sortedApis = Object.entries(this.config)
            .filter(([apiKey, api]) => api.enabled !== false)
            .sort(([, a], [, b]) => (a.priority || 999) - (b.priority || 999));

        if (sortedApis.length === 0) {
            console.error('Nessuna API abilitata trovata nella configurazione');
            throw new Error('Nessuna API abilitata disponibile');
        }

        for (const [apiKey, api] of sortedApis) {
            const models = Object.entries(api.models || {});

            if (models.length === 0) {
                console.warn(`API ${apiKey} non ha modelli configurati`);
                continue;
            }

            // Ordina i modelli per priorità interna (se definita)
            const sortedModels = models.sort(([, a], [, b]) =>
                (a.priority || 999) - (b.priority || 999)
            );

            for (const [modelKey, model] of sortedModels) {
                if (this.isModelAvailable(apiKey, modelKey, model)) {
                    console.log(`Modello selezionato: ${apiKey}/${modelKey}`);
                    return {
                        apiKey,
                        modelKey,
                        config: model,
                        alias: api.alias || apiKey
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
    addModel(apiKey, modelName, limits = {}, priority = null) {
        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non configurata`);
        }

        if (!this.config[apiKey].models) {
            this.config[apiKey].models = {};
        }

        if (this.config[apiKey].models[modelName]) {
            throw new Error(`Modello ${modelName} già esistente per API ${apiKey}`);
        }

        // Se non specificata, assegna la priorità più alta disponibile
        if (priority === null) {
            const existingPriorities = Object.values(this.config[apiKey].models)
                .map(model => model.priority || 999)
                .filter(p => p !== 999);
            priority = existingPriorities.length > 0 ? Math.max(...existingPriorities) + 1 : 1;
        }

        // Verifica che la priorità non sia già in uso
        const conflictingModel = Object.entries(this.config[apiKey].models)
            .find(([, model]) => model.priority === priority);
        
        if (conflictingModel) {
            throw new Error(`Priorità ${priority} già in uso dal modello ${conflictingModel[0]}`);
        }

        this.config[apiKey].models[modelName] = {
            priority: priority,
            limits: {
                RPM: limits.RPM || 100,
                RPD: limits.RPD || 1000,
                TPM: limits.TPM || 50000
            },
            requests: {}
        };

        return this.saveConfig(this.config);
    }

    // Aggiunge una nuova API
    addApi(apiKey, alias, priority = null, enabled = true) {
        if (this.config[apiKey]) {
            throw new Error(`API ${apiKey} già esistente`);
        }

        // Se non specificata, assegna la priorità più alta disponibile
        if (priority === null) {
            const existingPriorities = Object.values(this.config)
                .map(api => api.priority || 999)
                .filter(p => p !== 999);
            priority = existingPriorities.length > 0 ? Math.max(...existingPriorities) + 1 : 1;
        }

        // Verifica che la priorità non sia già in uso
        const conflictingApi = Object.entries(this.config)
            .find(([, api]) => api.priority === priority);
        
        if (conflictingApi) {
            throw new Error(`Priorità ${priority} già in uso dall'API ${conflictingApi[0]}`);
        }

        this.config[apiKey] = {
            alias: alias,
            priority: priority,
            enabled: enabled,
            models: {}
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

    // Rimuove un'API
    removeApi(apiKey) {
        if (this.config[apiKey]) {
            delete this.config[apiKey];
            return this.saveConfig(this.config);
        }
        throw new Error(`API ${apiKey} non trovata`);
    }

    // Modifica la priorità di un modello
    setModelPriority(apiKey, modelName, newPriority) {
        if (!this.config[apiKey] || !this.config[apiKey].models[modelName]) {
            throw new Error(`Modello ${modelName} non trovato per API ${apiKey}`);
        }

        // Verifica che la priorità non sia già in uso da un altro modello
        const conflictingModel = Object.entries(this.config[apiKey].models)
            .find(([name, model]) => name !== modelName && model.priority === newPriority);
        
        if (conflictingModel) {
            throw new Error(`Priorità ${newPriority} già in uso dal modello ${conflictingModel[0]}`);
        }

        this.config[apiKey].models[modelName].priority = newPriority;
        return this.saveConfig(this.config);
    }

    // Modifica la priorità di un'API
    setApiPriority(apiKey, newPriority) {
        if (!this.config[apiKey]) {
            throw new Error(`API ${apiKey} non trovata`);
        }

        // Verifica che la priorità non sia già in uso da un'altra API
        const conflictingApi = Object.entries(this.config)
            .find(([key, api]) => key !== apiKey && api.priority === newPriority);
        
        if (conflictingApi) {
            throw new Error(`Priorità ${newPriority} già in uso dall'API ${conflictingApi[0]}`);
        }

        this.config[apiKey].priority = newPriority;
        return this.saveConfig(this.config);
    }
}

module.exports = ApiManager;