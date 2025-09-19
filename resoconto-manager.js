const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

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
     * Ottiene tutti i possibili metadati dalle configurazioni
     * @returns {Array} Lista delle chiavi dei metadati
     */
    ottieniChiaviMetadati() {
        // Leggiamo le configurazioni esistenti per ottenere tutte le possibili chiavi metadati
        const metadatiPossibili = [
            'Title', 'Artist', 'Album', 'Composer', 'Genre', 'Year', 'Track', 'Disc',
            'Copyright', 'Description', 'Synopsis', 'Show', 'Episode ID', 'Season number',
            'Episode sort order', 'Media type', 'Content rating', 'HD video', 'Gapless playbook',
            'Podcast', 'Keywords', 'Category', 'Podcast URL', 'Episode URL', 'Author',
            'Subtitle', 'Title sort order', 'Artist sort order', 'Album sort order'
        ];
        return metadatiPossibili;
    }

    /**
     * Crea le colonne per il file Excel
     * @returns {Array} Array delle colonne
     */
    creaColonne() {
        const colonneBase = [
            'Vecchio Nome Video',
            'Nuovo Nome',
            'Meme',
            'Filtro (1/0)',
            'Posizione Banner',
            'Descrizione',
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
            rigaExcel['Vecchio Nome Video'] = riga.vecchioNome || '';
            rigaExcel['Nuovo Nome'] = riga.nuovoNome || '';
            rigaExcel['Meme'] = riga.meme || '';
            rigaExcel['Filtro (1/0)'] = riga.filtro ? '1' : '0';
            rigaExcel['Posizione Banner'] = riga.posizioneBanner || '';
            rigaExcel['Descrizione'] = riga.descrizione || '';

            // Metadati
            const metadati = this.ottieniChiaviMetadati();
            metadati.forEach(meta => {
                const colonnaMeta = `Metadato: ${meta}`;
                rigaExcel[colonnaMeta] = (riga.metadati && riga.metadati[meta]) ? '1' : '0';
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
