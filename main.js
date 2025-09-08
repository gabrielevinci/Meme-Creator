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
    }

    async initialize() {
        console.log('Inizializzazione Content Creator - 0 Chiacchiere...');

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
            console.log('Cartella OUTPUT pulita');
        } catch (error) {
            console.log('Errore nella pulizia OUTPUT:', error.message);
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
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
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
        // Gestione API
        ipcMain.handle('api-get-config', () => {
            return this.apiManager.getConfig();
        });

        ipcMain.handle('api-save-config', (event, config) => {
            return this.apiManager.saveConfig(config);
        });

        // Caricamento font
        ipcMain.handle('get-fonts', async() => {
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

        // Processo principale di elaborazione
        ipcMain.handle('start-processing', async(event, config) => {
            if (this.isProcessing) {
                throw new Error('Elaborazione già in corso');
            }

            this.isProcessing = true;

            try {
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
                    event.sender.send('processing-status', {
                        phase: 'extraction',
                        current: i + 1,
                        total: videos.length,
                        file: video
                    });

                    const frames = await this.videoProcessor.extractFrames(
                        path.join(__dirname, 'INPUT', video),
                        config.useCollage
                    );
                    frameResults.push({ video, frames });
                }

                console.log('Estrazione frame completata per tutti i video');

                // Step 3: Analisi AI (processo sequenziale)
                const aiResults = [];
                for (let i = 0; i < frameResults.length; i++) {
                    const result = frameResults[i];
                    event.sender.send('processing-status', {
                        phase: 'ai-analysis',
                        current: i + 1,
                        total: frameResults.length,
                        file: result.video
                    });

                    const analysis = await this.aiProcessor.analyzeFrames(
                        result.frames,
                        config,
                        this.apiManager
                    );

                    // Salva risultato
                    const outputFile = path.join(__dirname, 'OUTPUT',
                        `${path.parse(result.video).name}_analysis.txt`);
                    await fs.writeFile(outputFile, analysis);

                    aiResults.push({ video: result.video, analysis, outputFile });
                }

                console.log('Analisi AI completata per tutti i video');

                event.sender.send('processing-complete', {
                    results: aiResults,
                    totalProcessed: videos.length
                });

                return {
                    success: true,
                    message: `Elaborazione completata per ${videos.length} video`,
                    results: aiResults
                };

            } catch (error) {
                console.error('Errore durante l\'elaborazione:', error);
                event.sender.send('processing-error', error.message);
                throw error;
            } finally {
                this.isProcessing = false;
            }
        });

        // Stop elaborazione
        ipcMain.handle('stop-processing', () => {
            this.isProcessing = false;
            return { success: true };
        });

        // Status elaborazione
        ipcMain.handle('get-processing-status', () => {
            return { isProcessing: this.isProcessing };
        });
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