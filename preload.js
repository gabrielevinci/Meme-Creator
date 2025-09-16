const { contextBridge, ipcRenderer } = require('electron');

// Espone API sicure al renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Dialog APIs
    showInputDialog: (title, message, defaultValue = '') => ipcRenderer.invoke('show-input-dialog', title, message, defaultValue),
    showMessage: (title, message, type = 'info') => ipcRenderer.invoke('show-message', title, message, type),
    showConfirm: (title, message) => ipcRenderer.invoke('show-confirm', title, message),

    // API Management
    loadApiConfig: () => ipcRenderer.invoke('load-api-config'),
    saveApiConfig: (config) => ipcRenderer.invoke('save-api-config', config),
    getApiStats: () => ipcRenderer.invoke('get-api-stats'),

    // Font loading
    loadFonts: () => ipcRenderer.invoke('load-fonts'),

    // Video management
    getInputVideos: () => ipcRenderer.invoke('get-input-videos'),

    // Processing
    startProcessing: (params) => ipcRenderer.invoke('start-processing', params),
    stopProcessing: () => ipcRenderer.invoke('stop-processing'),

    // File operations
    openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),

    // Logging
    log: (level, message, source) => ipcRenderer.invoke('log-message', level, message, source),

    // Settings management
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // File selection
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),

    // Audio management
    scanAudioFolder: (folderPath) => ipcRenderer.invoke('scan-audio-folder', folderPath),
    getAudioDuration: (audioPath) => ipcRenderer.invoke('get-audio-duration', audioPath),

    // Status updates
    onStatusUpdate: (callback) => ipcRenderer.on('status-update', callback),
    onLogUpdate: (callback) => ipcRenderer.on('log-update', callback),
    onProgressUpdate: (callback) => ipcRenderer.on('progress-update', callback),
    onAppLog: (callback) => ipcRenderer.on('app-log', callback),

    // Error handling
    onDashboardError: (callback) => ipcRenderer.on('dashboard-error', callback),
    onApiError: (callback) => ipcRenderer.on('api-error', callback),
    onProcessingError: (callback) => ipcRenderer.on('processing-error', callback),
    onAiAnalysisError: (callback) => ipcRenderer.on('ai-analysis-error', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});