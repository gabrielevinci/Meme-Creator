const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const ffprobeStatic = require('ffprobe-static');

class ResocontoManager {
    constructor() {
        this.datiResoconto = [];
    }

    /**
     * Aggiunge una riga di dati al resoconto
     * @param {Object} dati - Oggetto con tutti i dati del video elaborato
     */
    aggiungiRiga(dati) {
        this.datiResoconto.push(dati);
        console.log(`📊 Aggiunta riga resoconto per: ${dati.vecchioNome}`);
    }

    /**
     * Ottiene informazioni tecniche dettagliate di un file video usando FFprobe
     * @param {string} filePath - Percorso del file video
     * @returns {Object} Informazioni tecniche del video
     */
    async ottieniInfoVideoCompleto(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const dimensioneMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            // Usa FFprobe per ottenere informazioni dettagliate del video
            const videoInfo = await this.getVideoInfoWithFFprobe(filePath);
            
            return {
                dimensioneMB: parseFloat(dimensioneMB),
                durata: videoInfo.durata || 'N/A',
                altezza: videoInfo.altezza || 'N/A',
                larghezza: videoInfo.larghezza || 'N/A'
            };
        } catch (error) {
            console.error('Errore nel recupero info video completo:', error);
            return {
                dimensioneMB: 0,
                durata: 'Errore',
                altezza: 'Errore',
                larghezza: 'Errore'
            };
        }
    }

    /**
     * Usa FFprobe per ottenere informazioni dettagliate del video
     * @param {string} filePath - Percorso del file video
     * @returns {Promise<Object>} Informazioni del video
     */
    async getVideoInfoWithFFprobe(filePath) {
        return new Promise((resolve, reject) => {
            const ffprobePath = ffprobeStatic.path;
            
            const args = [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ];

            const ffprobe = spawn(ffprobePath, args);
            let output = '';
            let errorOutput = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code !== 0) {
                    console.warn(`FFprobe exit code: ${code}, stderr: ${errorOutput}`);
                    // Anche se FFprobe fallisce, restituiamo valori di default
                    resolve({
                        durata: 'N/A',
                        altezza: 'N/A',
                        larghezza: 'N/A'
                    });
                    return;
                }

                try {
                    const data = JSON.parse(output);
                    const videoStream = data.streams.find(stream => stream.codec_type === 'video');
                    
                    let durata = 'N/A';
                    let altezza = 'N/A';
                    let larghezza = 'N/A';

                    if (data.format && data.format.duration) {
                        const durataSecondi = parseFloat(data.format.duration);
                        durata = this.formatDurata(durataSecondi);
                    }

                    if (videoStream) {
                        altezza = videoStream.height || 'N/A';
                        larghezza = videoStream.width || 'N/A';
                    }

                    resolve({
                        durata,
                        altezza,
                        larghezza
                    });
                } catch (parseError) {
                    console.warn('Errore parsing FFprobe output:', parseError);
                    resolve({
                        durata: 'N/A',
                        altezza: 'N/A',
                        larghezza: 'N/A'
                    });
                }
            });

            ffprobe.on('error', (error) => {
                console.warn('Errore FFprobe:', error);
                resolve({
                    durata: 'N/A',
                    altezza: 'N/A',
                    larghezza: 'N/A'
                });
            });
        });
    }

    /**
     * Formatta la durata da secondi a formato mm:ss
     * @param {number} secondi - Durata in secondi
     * @returns {string} Durata formattata
     */
    formatDurata(secondi) {
        const minuti = Math.floor(secondi / 60);
        const secondiRimasti = Math.floor(secondi % 60);
        return `${minuti}:${secondiRimasti.toString().padStart(2, '0')}`;
    }

    /**
     * Ottiene informazioni tecniche di un file video
     * @param {string} filePath - Percorso del file video
     * @returns {Object} Informazioni tecniche del video
     */
    async ottieniInfoVideo(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const dimensioneMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            // Per ottenere durata e dimensioni video, dovremmo usare FFprobe
            // Per ora restituiamo valori di default che possono essere aggiornati
            return {
                dimensioneMB: parseFloat(dimensioneMB),
                durata: 'N/A', // Da implementare con FFprobe se necessario
                altezza: 'N/A', // Da implementare con FFprobe se necessario
                larghezza: 'N/A' // Da implementare con FFprobe se necessario
            };
        } catch (error) {
            console.error('Errore nel recupero info video:', error);
            return {
                dimensioneMB: 0,
                durata: 'Errore',
                altezza: 'Errore',
                larghezza: 'Errore'
            };
        }
    }

    /**
     * Legge i metadati dal file di output dell'AI nella cartella temp_frames
     * @param {string} nomeVideoOriginale - Nome del video originale
     * @returns {Object} Metadati estratti dal file di output dell'AI
     */
    async leggiMetadatiDaOutputAI(nomeVideoOriginale) {
        try {
            const tempFramesDir = path.join(process.cwd(), 'temp_frames');
            
            // Rimuovi estensione e sostituisci caratteri non validi
            const nomeBase = path.parse(nomeVideoOriginale).name;
            const nomeBasePulito = nomeBase.replace(/#/g, '_');
            
            // Cerca file che iniziano con parte del nome (per gestire troncamenti)
            const files = await fs.readdir(tempFramesDir);
            
            // Prima prova una corrispondenza esatta, poi parziale
            let outputFile = files.find(file => 
                file.startsWith(nomeBasePulito) && 
                file.includes('_ai_output_') && 
                file.endsWith('.txt')
            );
            
            // Se non trovato, cerca per corrispondenza parziale (primi 25 caratteri)
            if (!outputFile) {
                const nomeRidotto = nomeBasePulito.substring(0, 25);
                outputFile = files.find(file => 
                    file.startsWith(nomeRidotto) && 
                    file.includes('_ai_output_') && 
                    file.endsWith('.txt')
                );
            }
            
            if (!outputFile) {
                console.warn(`File di output AI non trovato per: ${nomeVideoOriginale}`);
                console.warn(`Cercato: ${nomeBasePulito}`);
                console.warn(`File disponibili:`, files.filter(f => f.includes('_ai_output_')));
                return { metadata: {}, inputAI: '', outputAI: '' };
            }
            
            const filePath = path.join(tempFramesDir, outputFile);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Estrai il prompt completo dalla sezione PROMPT COMPLETO INVIATO
            const promptStart = content.indexOf('PROMPT COMPLETO INVIATO:');
            const responseStart = content.indexOf('RISPOSTA AI:');
            let inputAI = '';
            
            if (promptStart !== -1 && responseStart !== -1) {
                inputAI = content.substring(promptStart + 'PROMPT COMPLETO INVIATO:'.length, responseStart)
                    .replace(/={40}/g, '') // Rimuovi le linee di separazione
                    .trim();
            }
            
            // Fallback alla vecchia sezione CONFIGURAZIONE se il nuovo formato non è disponibile
            if (!inputAI) {
                const configStart = content.indexOf('CONFIGURAZIONE:');
                if (configStart !== -1 && responseStart !== -1) {
                    inputAI = content.substring(configStart, responseStart).trim();
                }
            }
            
            // Trova la sezione JSON nella risposta AI
            const jsonStart = content.indexOf('```json');
            const jsonEnd = content.indexOf('```', jsonStart + 7);
            
            if (jsonStart === -1 || jsonEnd === -1) {
                console.warn(`JSON non trovato nel file: ${outputFile}`);
                return { metadata: {}, inputAI, outputAI: 'JSON non trovato' };
            }
            
            const jsonContent = content.substring(jsonStart + 7, jsonEnd).trim();
            const aiResponse = JSON.parse(jsonContent);
            
            console.log(`📖 Metadati letti da file AI: ${outputFile}`);
            return { 
                metadata: aiResponse.metadata || {},
                inputAI,
                outputAI: jsonContent
            };
            
        } catch (error) {
            console.error('Errore nella lettura metadati da output AI:', error);
            return { metadata: {}, inputAI: '', outputAI: '' };
        }
    }

    /**
     * Mappa un nome di metadato alla sua chiave corrispondente nei dati AI
     * @param {string} nomeMetadato - Nome leggibile del metadato
     * @param {Object} metadatiAI - Oggetto metadati dall'AI
     * @returns {string} Valore del metadato
     */
    mappaMetadato(nomeMetadato, metadatiAI) {
        if (!metadatiAI) return '';
        
        // I metadati dal file AI hanno già i nomi leggibili come chiavi
        // Quindi possiamo accedere direttamente al valore
        const valore = metadatiAI[nomeMetadato];
        
        // Gestisci valori booleani e numeri
        if (typeof valore === 'boolean') {
            return valore ? 'Sì' : 'No';
        }
        if (typeof valore === 'number') {
            return valore.toString();
        }
        
        return valore || '';
    }

    /**
     * Ottiene tutti i possibili metadati dalle configurazioni
     * @returns {Array} Lista delle chiavi dei metadati
     */
    ottieniChiaviMetadati() {
        // Metadati specifici richiesti dall'utente
        const metadatiPossibili = [
            'Artist', 'Composer', 'Album', 'Album artist', 'Genre', 'Grouping', 'Copyright',
            'Commenti', 'Data di creazione', 'Show', 'TV Network', 'Season number', 'Episode number',
            'HD Video', 'Encoded by', 'Encoder tool', 'Sottotitolo', 'Classificazione (esplicito)',
            'Motivo classificazione', 'Tag', 'Umore', 'Chiave iniziale', 'Protetto', 'Director',
            'Director of photography', 'Sound engineer', 'Art director', 'Production designer',
            'Choreographer', 'Costume designer', 'Writer', 'Screenwriter', 'Editor', 'Producer',
            'Co-producer', 'Executive producer', 'Distributed by', 'Studio', 'Editore',
            'Provider di contenuti', 'Conduttori', 'Title sort order', 'Artist sort order',
            'Album sort order', 'Album artist sort order', 'Composer sort order', 'Show sort order'
        ];
        return metadatiPossibili;
    }

    /**
     * Crea le colonne per il file Excel
     * @returns {Array} Array delle colonne
     */
    creaColonne() {
        const colonneBase = [
            'Nome File Input',
            'Nome File Output',
            'Vecchio Nome Video',
            'Nuovo Nome',
            'Meme (Testo Banner)',
            'Titolo Completo (con hashtag)',
            'Filtro (1/0)',
            'Posizione Banner',
            'Descrizione Video',
            'Input Dato AI',
            'Output Ricevuto AI'
        ];

        // Aggiungi colonne per tutti i possibili metadati
        const metadati = this.ottieniChiaviMetadati();
        const colonneMetadati = metadati.map(meta => `Metadato: ${meta}`);

        const colonneTecniche = [
            'Durata Video',
            'Dimensioni Video (MB)',
            'Altezza Video (px)',
            'Larghezza Video (px)'
        ];

        return [...colonneBase, ...colonneMetadati, ...colonneTecniche];
    }

    /**
     * Converte i dati in formato per Excel
     * @param {Array} colonne - Array delle colonne
     * @returns {Array} Array di oggetti per Excel
     */
    convertiDatiPerExcel(colonne) {
        return this.datiResoconto.map(riga => {
            const rigaExcel = {};
            
            // Colonne base
            rigaExcel['Nome File Input'] = riga.nomeInput || '';
            rigaExcel['Nome File Output'] = riga.nomeOutput || '';
            rigaExcel['Vecchio Nome Video'] = riga.vecchioNome || '';
            rigaExcel['Nuovo Nome'] = riga.nuovoNome || '';
            rigaExcel['Meme (Testo Banner)'] = riga.meme || '';
            rigaExcel['Titolo Completo (con hashtag)'] = riga.titoloCompleto || '';
            rigaExcel['Filtro (1/0)'] = riga.filtro ? '1' : '0';
            rigaExcel['Posizione Banner'] = riga.posizioneBanner || '';
            rigaExcel['Descrizione Video'] = riga.descrizione || '';
            rigaExcel['Input Dato AI'] = riga.inputAI || '';
            rigaExcel['Output Ricevuto AI'] = riga.outputAI || '';

            // Metadati - mostra i valori reali dell'AI con mappatura corretta
            const metadati = this.ottieniChiaviMetadati();
            metadati.forEach(meta => {
                const colonnaMeta = `Metadato: ${meta}`;
                // Mappa i nomi dei metadati ai valori effettivi
                const valore = this.mappaMetadato(meta, riga.metadati);
                rigaExcel[colonnaMeta] = valore || '';
            });

            // Info tecniche
            rigaExcel['Durata Video'] = riga.durata || 'N/A';
            rigaExcel['Dimensioni Video (MB)'] = riga.dimensioneMB || 0;
            rigaExcel['Altezza Video (px)'] = riga.altezza || 'N/A';
            rigaExcel['Larghezza Video (px)'] = riga.larghezza || 'N/A';

            return rigaExcel;
        });
    }

    /**
     * Genera il file Excel RESOCONTO.xlsx nella cartella OUTPUT
     * @param {string} outputDir - Percorso della cartella OUTPUT
     */
    async generaResocontoExcel(outputDir = './OUTPUT') {
        try {
            console.log('📊 Generazione file RESOCONTO.xlsx...');
            
            if (this.datiResoconto.length === 0) {
                console.log('⚠️ Nessun dato da inserire nel resoconto');
                return;
            }

            // Assicurati che la cartella OUTPUT esista
            await fs.mkdir(outputDir, { recursive: true });

            const colonne = this.creaColonne();
            const datiExcel = this.convertiDatiPerExcel(colonne);

            // Crea il workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(datiExcel);

            // Aggiungi il worksheet al workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Resoconto Elaborazione');

            // Salva il file
            const filePath = path.join(outputDir, 'RESOCONTO.xlsx');
            XLSX.writeFile(wb, filePath);

            console.log(`✅ File RESOCONTO.xlsx creato con successo: ${filePath}`);
            console.log(`📈 Righe inserite: ${this.datiResoconto.length}`);
            
            return filePath;
        } catch (error) {
            console.error('❌ Errore nella generazione del resoconto Excel:', error);
            throw error;
        }
    }

    /**
     * Resetta i dati del resoconto
     */
    reset() {
        this.datiResoconto = [];
        console.log('🔄 Resoconto resettato');
    }

    /**
     * Ottiene il numero di righe nel resoconto
     * @returns {number} Numero di righe
     */
    getNumeroRighe() {
        return this.datiResoconto.length;
    }
}

module.exports = ResocontoManager;
