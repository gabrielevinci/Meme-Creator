const VideoProcessor = require('./video-processor.js');
const path = require('path');
const sharp = require('sharp');
const { Vibrant } = require('node-vibrant/node');

async function compareAnalysisMethods() {
    console.log('🔬 Confronto tra metodi di analisi colori\n');

    const inputVideo = path.join(__dirname, 'INPUT', '0002.mp4');
    const tempFramePath = path.join(__dirname, 'temp_frames', `comparison_frame_${Date.now()}.png`);

    try {
        // Estrai il primo frame
        const { spawn } = require('child_process');
        await new Promise((resolve, reject) => {
            const extractCmd = spawn('ffmpeg', [
                '-i', inputVideo,
                '-vframes', '1',
                '-y', tempFramePath
            ]);

            extractCmd.on('close', (code) => {
                code === 0 ? resolve() : reject(new Error(`Extract failed: ${code}`));
            });
            extractCmd.on('error', reject);
        });

        console.log(`📊 METODO 1: Analisi Sharp (pixel-level)\n`);

        // Metodo 1: Sharp (vecchio metodo)
        const { data, info } = await sharp(tempFramePath)
            .raw()
            .toBuffer({ resolveWithObject: true });

        let totalBrightness = 0;
        const { width, height, channels } = info;
        const totalPixels = width * height;

        for (let i = 0; i < data.length; i += channels) {
            totalBrightness += data[i] + data[i + 1] + data[i + 2];
        }

        const avgBrightnessSharp = totalBrightness / (totalPixels * 3);
        const isBlackSharp = avgBrightnessSharp < 15;

        console.log(`   Dimensioni: ${width}x${height} (${totalPixels} pixel)`);
        console.log(`   Luminosità media: ${avgBrightnessSharp.toFixed(2)}/255`);
        console.log(`   Valutazione: ${isBlackSharp ? '🔴 NERO (soglia < 15)' : '🟢 NON NERO (soglia < 15)'}\n`);

        console.log(`📊 METODO 2: Analisi Node Vibrant (colori dominanti)\n`);

        // Metodo 2: Node Vibrant (nuovo metodo)
        const vibrant = Vibrant.from(tempFramePath);
        const palette = await vibrant.getPalette();

        const colors = Object.entries(palette).filter(([_, swatch]) => swatch !== null);

        if (colors.length === 0) {
            console.log(`   Colori estratti: NESSUNO`);
            console.log(`   Valutazione: 🔴 NERO COMPLETO\n`);
        } else {
            console.log(`   Colori estratti: ${colors.length}`);

            colors.forEach(([name, swatch]) => {
                const [r, g, b] = swatch.rgb;
                const brightness = (r + g + b) / 3;
                console.log(`   - ${name}: ${swatch.hex} (RGB: ${r.toFixed(1)},${g.toFixed(1)},${b.toFixed(1)}) [${brightness.toFixed(1)}/255] - ${swatch.population} pixel`);
            });

            const averageBrightness = colors.reduce((sum, [_, swatch]) => {
                const [r, g, b] = swatch.rgb;
                return sum + ((r + g + b) / 3);
            }, 0) / colors.length;

            const isBlackVibrant = averageBrightness < 25;
            console.log(`   Luminosità media dominante: ${averageBrightness.toFixed(2)}/255`);
            console.log(`   Valutazione: ${isBlackVibrant ? '🔴 NERO (soglia < 25)' : '🟢 NON NERO (soglia < 25)'}\n`);
        }

        console.log(`📋 RIEPILOGO FINALE:`);
        console.log(`   Sharp (pixel-level): ${isBlackSharp ? '🔴 RIMUOVI' : '🟢 MANTIENI'}`);

        const colors2 = Object.entries(palette).filter(([_, swatch]) => swatch !== null);
        const isBlackVibrant2 = colors2.length === 0 || (colors2.reduce((sum, [_, swatch]) => {
            const [r, g, b] = swatch.rgb;
            return sum + ((r + g + b) / 3);
        }, 0) / colors2.length) < 25;

        console.log(`   Vibrant (colori dom.): ${isBlackVibrant2 ? '🔴 RIMUOVI' : '🟢 MANTIENI'}`);
        console.log(`   Raccomandazione: ${(isBlackSharp || isBlackVibrant2) ? '🔴 RIMUOVI FRAME' : '🟢 MANTIENI FRAME'}`);

        // Cleanup
        const fs = require('fs');
        fs.unlinkSync(tempFramePath);

    } catch (error) {
        console.error(`❌ Errore durante l'analisi:`, error.message);
    }
}

compareAnalysisMethods();