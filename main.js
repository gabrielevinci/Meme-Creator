const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Importa i moduli personalizzati
const ApiManager = require('./api-manager');
const VideoProcessor = require('./video-processor');
const AiProcessor = require('./ai-processor');

class ContentCreatorApp {
    constructor() {
        this.mainWindow = null;
        this.apiManager = new ApiManager();
        this.videoProcessor = new VideoProcessor();
        this.aiProcessor = new AiProcessor();
        this.isProcessing = false;

        // Verifica modalità sviluppo
        this.isDev = process.argv.includes('--enable-localhost');

        // Sistema di logging centralizzato
        this.setupLogging();
    }

    setupLogging() {
        // Override console.log per inviare al renderer
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            originalLog(...args);
            this.sendLogToRenderer('info', args.join(' '));
        };

        console.error = (...args) => {
            originalError(...args);
            this.sendLogToRenderer('error', args.join(' '));
        };

        console.warn = (...args) => {
            originalWarn(...args);
            this.sendLogToRenderer('warning', args.join(' '));
        };
    }

    sendLogToRenderer(level, message) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('app-log', {
                timestamp: new Date().toISOString(),
                level: level,
                message: message,
                source: 'main'
            });
        }
    }

    log(level, message, source = 'main') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            source: source
        };

        console.log(`[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.source}] ${logEntry.message}`);

        // Invia sempre il log alla dashboard, anche se la finestra non è ancora pronta
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            // Invia sia come app-log che come messaggio nella dashboard
            this.mainWindow.webContents.send('app-log', logEntry);
            
            // Per gli errori, invia anche un evento specifico per la dashboard
            if (level === 'error') {
                this.mainWindow.webContents.send('dashboard-error', {
                    timestamp: new Date().toISOString(),
                    message: message,
                    source: source
                });
            }
        }
    }

    // Nuovo metodo specifico per errori API
    logApiError(error, context = '') {
        const errorMessage = `${context ? context + ': ' : ''}${error.message || error}`;
        this.log('error', errorMessage, 'api');
        
        // Invia errore specifico per API alla dashboard
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('api-error', {
                timestamp: new Date().toISOString(),
                error: errorMessage,
                context: context,
                type: 'api-error'
            });
        }
    }

    async initialize() {
        this.log('info', 'Inizializzazione Content Creator - 0 Chiacchiere...');

        // Nota: questa è un'applicazione Electron desktop, non una web app
        this.log('info', 'NOTA: Questa è un\'applicazione desktop Electron, non viene avviato alcun server localhost');
        this.log('info', 'L\'applicazione si aprirà come finestra desktop separata');

        // Assicurati che le cartelle necessarie esistano
        await this.ensureDirectories();

        // Pulisci la cartella OUTPUT ad ogni avvio
        await this.cleanOutputDirectory();

        // Inizializza i gestori IPC
        this.setupIpcHandlers();

        // Crea la finestra principale
        this.createMainWindow();
    }

    async ensureDirectories() {
        const directories = ['INPUT', 'OUTPUT', 'font', 'prompt'];

        for (const dir of directories) {
            const dirPath = path.join(__dirname, dir);
            try {
                await fs.access(dirPath);
            } catch (error) {
                await fs.mkdir(dirPath, { recursive: true });
                console.log(`Cartella creata: ${dir}`);
            }
        }
    }

    async cleanOutputDirectory() {
        const outputPath = path.join(__dirname, 'OUTPUT');
        try {
            const files = await fs.readdir(outputPath);
            for (const file of files) {
                await fs.unlink(path.join(outputPath, file));
            }
            this.log('info', 'Cartella OUTPUT pulita');
        } catch (error) {
            this.log('error', `Errore nella pulizia OUTPUT: ${error.message}`);
        }
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            icon: path.join(__dirname, 'icon.ico'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            title: 'Content Creator - 0 Chiacchiere'
        });

        // Carica l'interfaccia
        this.mainWindow.loadFile('index.html');

        // Menu dell'applicazione
        this.createAppMenu();

        // Gestione chiusura finestra
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Apri DevTools in modalità sviluppo
        if (this.isDev) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    createAppMenu() {
        const template = [{
                label: 'File',
                submenu: [{
                        label: 'Apri cartella INPUT',
                        click: () => {
                            shell.openPath(path.join(__dirname, 'INPUT'));
                        }
                    },
                    {
                        label: 'Apri cartella OUTPUT',
                        click: () => {
                            shell.openPath(path.join(__dirname, 'OUTPUT'));
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Esci',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Strumenti',
                submenu: [{
                        label: 'Gestione API',
                        click: () => {
                            this.mainWindow.webContents.send('open-api-manager');
                        }
                    },
                    {
                        label: 'Pulisci OUTPUT',
                        click: async() => {
                            await this.cleanOutputDirectory();
                            this.mainWindow.webContents.send('output-cleaned');
                        }
                    }
                ]
            },
            {
                label: 'Aiuto',
                submenu: [{
                    label: 'Informazioni',
                    click: () => {
                        dialog.showMessageBox(this.mainWindow, {
                            type: 'info',
                            title: 'Content Creator - 0 Chiacchiere',
                            message: 'Content Creator - 0 Chiacchiere v1.0.0',
                            detail: 'Applicazione per la generazione di meme tramite AI'
                        });
                    }
                }]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupIpcHandlers() {
        // Dialog APIs - versione migliorata
        ipcMain.handle('show-input-dialog', async(event, title, message, defaultValue = '') => {
            return new Promise((resolve) => {
                const dialogWindow = new BrowserWindow({
                    parent: this.mainWindow,
                    modal: true,
                    width: 450,
                    height: 250,
                    resizable: false,
                    minimizable: false,
                    maximizable: false,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false
                    },
                    show: false
                });

                // Store params for the dialog
                this.dialogParams = { title, message, defaultValue };

                dialogWindow.loadFile(path.join(__dirname, 'dialog.html'));

                dialogWindow.once('ready-to-show', () => {
                    dialogWindow.show();
                });

                // Handle dialog result
                const resultHandler = (event, result) => {
                    ipcMain.removeListener('dialog-result', resultHandler);
                    resolve(result);
                };

                ipcMain.on('dialog-result', resultHandler);

                dialogWindow.on('closed', () => {
                    ipcMain.removeListener('dialog-result', resultHandler);
                    resolve(null);
                });
            });
        });

        // Helper per i parametri del dialog
        ipcMain.handle('get-dialog-params', () => {
            return this.dialogParams || {};
        });

        ipcMain.handle('show-message', async(event, title, message, type = 'info') => {
            return await dialog.showMessageBox(this.mainWindow, {
                type: type,
                title: title,
                message: message,
                buttons: ['OK']
            });
        });

        ipcMain.handle('show-confirm', async(event, title, message) => {
            const result = await dialog.showMessageBox(this.mainWindow, {
                type: 'question',
                title: title,
                message: message,
                buttons: ['Sì', 'No'],
                defaultId: 0,
                cancelId: 1
            });
            return result.response === 0;
        });

        // Gestione API
        ipcMain.handle('load-api-config', () => {
            return this.apiManager.getConfig();
        });

        ipcMain.handle('save-api-config', (event, config) => {
            return this.apiManager.saveConfig(config);
        });

        // Caricamento font
        ipcMain.handle('load-fonts', async() => {
            const fontPath = path.join(__dirname, 'font');
            try {
                const files = await fs.readdir(fontPath);
                return files.filter(file =>
                    file.toLowerCase().endsWith('.ttf') ||
                    file.toLowerCase().endsWith('.otf')
                );
            } catch (error) {
                console.error('Errore nel caricamento font:', error);
                return [];
            }
        });

        // Caricamento video dalla cartella INPUT
        ipcMain.handle('get-input-videos', async() => {
            const inputPath = path.join(__dirname, 'INPUT');
            try {
                const files = await fs.readdir(inputPath);
                return files.filter(file =>
                    file.toLowerCase().endsWith('.mp4') ||
                    file.toLowerCase().endsWith('.avi') ||
                    file.toLowerCase().endsWith('.mov') ||
                    file.toLowerCase().endsWith('.mkv')
                );
            } catch (error) {
                console.error('Errore nel caricamento video:', error);
                return [];
            }
        });

        // Elaborazione principale
        ipcMain.handle('start-processing', async(event, config) => {
            if (this.isProcessing) {
                throw new Error('Elaborazione già in corso');
            }

            this.isProcessing = true;

            try {
                this.log('info', 'Avvio elaborazione video...');
                this.mainWindow.webContents.send('status-update', 'Avvio elaborazione...');

                const result = await this.processVideos(config);

                this.log('success', 'Elaborazione completata con successo');
                this.mainWindow.webContents.send('log-update', {
                    totalProcessed: result.results ? result.results.length : 0,
                    results: result.results || [],
                    message: result.message || 'Elaborazione completata'
                });

                return result;
            } catch (error) {
                // Log dettagliato dell'errore
                this.logApiError(error, 'Errore durante l\'elaborazione');
                
                // Invia errore alla dashboard
                this.mainWindow.webContents.send('log-update', {
                    type: 'error',
                    message: `Errore durante l'elaborazione: ${error.message}`,
                    error: true,
                    timestamp: new Date().toISOString()
                });

                // Invia anche un evento specifico per errori critici
                this.mainWindow.webContents.send('processing-error', {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    phase: 'processing'
                });

                throw error;
            } finally {
                this.isProcessing = false;
                this.mainWindow.webContents.send('status-update', { phase: 'idle' });
            }
        });

        ipcMain.handle('stop-processing', async() => {
            this.isProcessing = false;
            this.mainWindow.webContents.send('status-update', 'Elaborazione interrotta');
            return true;
        });

        // Handler per logging dal renderer
        ipcMain.handle('log-message', (event, level, message, source = 'renderer') => {
            this.log(level, message, source);
        });
    }

    async processVideos(config) {
        console.log('Avvio elaborazione con configurazione:', config);

        // Step 1: Ottieni lista video
        const videos = await this.getInputVideos();
        if (videos.length === 0) {
            throw new Error('Nessun video trovato nella cartella INPUT');
        }

        console.log(`Trovati ${videos.length} video da elaborare`);

        // Step 2: Estrazione frame (processo sequenziale)
        const frameResults = [];
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            this.log('info', `Estrazione frame: elaborazione ${video} (${i + 1}/${videos.length})`);

            this.mainWindow.webContents.send('status-update', {
                phase: 'extraction',
                current: i + 1,
                total: videos.length,
                file: video
            });

            try {
                const frames = await this.videoProcessor.extractFrames(
                    path.join(__dirname, 'INPUT', video),
                    config.useCollage
                );
                frameResults.push({ video, frames });
            } catch (error) {
                this.log('error', `Errore nell'estrazione frame per ${video}: ${error.message}`);
                // Continua con il prossimo video invece di interrompere tutto
                frameResults.push({ video, frames: [], error: error.message });
            }
        }

        console.log('Estrazione frame completata per tutti i video');

        // Step 3: Analisi AI (processo sequenziale)
        const aiResults = [];
        for (let i = 0; i < frameResults.length; i++) {
            const result = frameResults[i];
            this.log('info', `Analisi AI: elaborazione ${result.video} (${i + 1}/${frameResults.length})`);

            this.mainWindow.webContents.send('status-update', {
                phase: 'ai-analysis',
                current: i + 1,
                total: frameResults.length,
                file: result.video
            });

            try {
                const analysis = await this.aiProcessor.analyzeFrames(
                    result.frames,
                    config,
                    this.apiManager
                );

                // Il file viene salvato automaticamente dall'AI processor
                aiResults.push({ 
                    video: result.video, 
                    analysis: analysis.response,
                    outputFile: analysis.outputFile,
                    modelUsed: analysis.modelUsed,
                    responseTime: analysis.responseTime,
                    success: true
                });

                this.log('success', `Analisi AI completata per ${result.video} utilizzando ${analysis.modelUsed}`);

            } catch (error) {
                // Log specifico per errori API
                this.logApiError(error, `Analisi AI fallita per ${result.video}`);
                
                // Invia errore specifico alla dashboard
                this.mainWindow.webContents.send('ai-analysis-error', {
                    video: result.video,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    phase: 'ai-analysis'
                });

                // Aggiungi risultato con errore invece di interrompere tutto
                aiResults.push({
                    video: result.video,
                    error: error.message,
                    success: false,
                    timestamp: new Date().toISOString()
                });

                // Continua con il video successivo invece di terminare
                this.log('info', `Continuando con il video successivo dopo errore su ${result.video}`);
            }
        }

        console.log('Analisi AI completata per tutti i video');

        // Pulizia finale delle risorse temporanee
        try {
            await this.videoProcessor.cleanup();
            this.log('info', 'Pulizia finale delle risorse temporanee completata');
        } catch (error) {
            this.log('error', `Errore durante la pulizia finale: ${error.message}`);
        }

        return {
            success: true,
            message: `Elaborazione completata per ${videos.length} video`,
            results: aiResults
        };
    }

    async getInputVideos() {
        const inputPath = path.join(__dirname, 'INPUT');
        const files = await fs.readdir(inputPath);
        return files.filter(file =>
            file.toLowerCase().endsWith('.mp4') ||
            file.toLowerCase().endsWith('.avi') ||
            file.toLowerCase().endsWith('.mov') ||
            file.toLowerCase().endsWith('.mkv')
        );
    }
}

// Gestione eventi app
app.whenReady().then(async() => {
    const contentCreator = new ContentCreatorApp();
    await contentCreator.initialize();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async() => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const contentCreator = new ContentCreatorApp();
        await contentCreator.initialize();
    }
});

// Gestione errori non catturati
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});