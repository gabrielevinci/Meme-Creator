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
     * Mappa un nome di metadato alla sua chiave corrispondente nei dati AI
     * @param {string} nomeMetadato - Nome leggibile del metadato
     * @param {Object} metadatiAI - Oggetto metadati dall'AI
     * @returns {string} Valore del metadato
     */
    mappaMetadato(nomeMetadato, metadatiAI) {
        if (!metadatiAI) return '';
        
        // Mapping tra nomi leggibili e chiavi tecniche dei metadati
        const mappingMetadati = {
            'Artist': metadatiAI.artist || metadatiAI['©ART'] || '',
            'Composer': metadatiAI.composer || metadatiAI['©wrt'] || '',
            'Album': metadatiAI.album || metadatiAI['©alb'] || '',
            'Album artist': metadatiAI.album_artist || metadatiAI.aART || '',
            'Genre': metadatiAI.genre || metadatiAI['©gen'] || '',
            'Grouping': metadatiAI.grouping || metadatiAI['©grp'] || '',
            'Copyright': metadatiAI.copyright || metadatiAI.cprt || '',
            'Commenti': metadatiAI.comment || metadatiAI['©cmt'] || '',
            'Data di creazione': metadatiAI.date || metadatiAI['©day'] || '',
            'Show': metadatiAI.show || metadatiAI.tvsh || '',
            'TV Network': metadatiAI.tv_network || metadatiAI.tvnn || '',
            'Season number': metadatiAI.season_number || metadatiAI.tvsn || '',
            'Episode number': metadatiAI.episode_number || metadatiAI.tves || '',
            'HD Video': metadatiAI.hd_video || metadatiAI.hdvd || '',
            'Encoded by': metadatiAI.encoded_by || metadatiAI['©enc'] || '',
            'Encoder tool': metadatiAI.encoder_tool || metadatiAI['©too'] || '',
            'Sottotitolo': metadatiAI.subtitle || metadatiAI['----:com.apple.iTunes:SUBTITLE'] || '',
            'Classificazione (esplicito)': metadatiAI.rating || metadatiAI['----:com.apple.iTunes:Rating'] || '',
            'Motivo classificazione': metadatiAI.rating_annotation || metadatiAI['----:com.apple.iTunes:Rating Annotation'] || '',
            'Tag': metadatiAI.keywords || metadatiAI['----:com.apple.iTunes:keywords'] || '',
            'Umore': metadatiAI.mood || metadatiAI['----:com.apple.iTunes:MOOD'] || '',
            'Chiave iniziale': metadatiAI.initial_key || metadatiAI['----:com.apple.iTunes:initialkey'] || '',
            'Protetto': metadatiAI.protected || metadatiAI['----:com.apple.iTunes:isprotected'] || '',
            'Director': metadatiAI.director || metadatiAI['----:com.apple.iTunes:DIRECTOR'] || '',
            'Director of photography': metadatiAI.director_photography || metadatiAI['----:com.apple.iTunes:Director of Photography'] || '',
            'Sound engineer': metadatiAI.sound_engineer || metadatiAI['----:com.apple.iTunes:Sound Engineer'] || '',
            'Art director': metadatiAI.art_director || metadatiAI['----:com.apple.iTunes:Art Director'] || '',
            'Production designer': metadatiAI.production_designer || metadatiAI['----:com.apple.iTunes:Production Designer'] || '',
            'Choreographer': metadatiAI.choreographer || metadatiAI['----:com.apple.iTunes:Choreographer'] || '',
            'Costume designer': metadatiAI.costume_designer || metadatiAI['----:com.apple.iTunes:Costume Designer'] || '',
            'Writer': metadatiAI.writer || metadatiAI['----:com.apple.iTunes:Writer'] || '',
            'Screenwriter': metadatiAI.screenwriter || metadatiAI['----:com.apple.iTunes:Screenwriters'] || '',
            'Editor': metadatiAI.editor || metadatiAI['----:com.apple.iTunes:Editors'] || '',
            'Producer': metadatiAI.producer || metadatiAI['----:com.apple.iTunes:PRODUCER'] || '',
            'Co-producer': metadatiAI.co_producer || metadatiAI['----:com.apple.iTunes:Co-Producer'] || '',
            'Executive producer': metadatiAI.executive_producer || metadatiAI['----:com.apple.iTunes:Executive Producer'] || '',
            'Distributed by': metadatiAI.distributed_by || metadatiAI['----:com.apple.iTunes:Distributed By'] || '',
            'Studio': metadatiAI.studio || metadatiAI['----:com.apple.iTunes:Studio'] || '',
            'Editore': metadatiAI.publisher || metadatiAI['----:com.apple.iTunes:publisher'] || '',
            'Provider di contenuti': metadatiAI.content_provider || metadatiAI['----:com.apple.iTunes:content_provider'] || '',
            'Conduttori': metadatiAI.conductor || metadatiAI['----:com.apple.iTunes:Conductor'] || '',
            'Title sort order': metadatiAI.title_sort || metadatiAI.sonm || '',
            'Artist sort order': metadatiAI.artist_sort || metadatiAI.soar || '',
            'Album sort order': metadatiAI.album_sort || metadatiAI.soal || '',
            'Album artist sort order': metadatiAI.album_artist_sort || metadatiAI.soaa || '',
            'Composer sort order': metadatiAI.composer_sort || metadatiAI.soco || '',
            'Show sort order': metadatiAI.show_sort || metadatiAI.sosn || ''
        };

        return mappingMetadati[nomeMetadato] || '';
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
