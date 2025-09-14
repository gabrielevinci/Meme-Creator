// Test completo dell'algoritmo di ridimensionamento con le correzioni
// Verifica che il testo rientri sempre nel banner con i nuovi calcoli

class AutoResizeTest {
    constructor() {
        this.testScenarios();
    }

    calculateTextMetrics(text, fontSize, textFormat) {
        // Simulazione semplificata del calcolo text metrics
        const avgCharWidth = fontSize * 0.6; // Approssimazione per Impact font
        const lineHeight = fontSize * 1.15;
        const ascent = fontSize * 0.75;
        
        return {
            fontSize,
            avgCharWidth,
            lineHeight,
            ascent
        };
    }

    wrapText(text, maxCharsPerLine, maxLines) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word); // Parola troppo lunga, aggiungila comunque
                    currentLine = '';
                }
            }
            
            if (lines.length >= maxLines) break;
        }
        
        if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
        }

        return lines.join('\\n');
    }

    autoResizeTextForArea(text, availableWidth, availableHeight, textFormat = 'normal', maxLines = 10) {
        if (!text || !availableWidth || !availableHeight) {
            return { fontSize: 12, wrappedText: text || '', lines: [], totalHeight: 0, fillRatio: 0 };
        }

        console.log(`🔍 Avvio auto-resize per area ${availableWidth}x${availableHeight}px`);
        console.log(`📝 Testo: "${text.substring(0, 50)}..."`);

        let bestFontSize = 12;
        let bestWrappedText = text;
        let bestLines = [text];
        let bestTotalHeight = 12;
        let bestFillRatio = 0;

        // Prova font size da 100px scendendo a 12px
        for (let fontSize = 100; fontSize >= 12; fontSize -= 2) {
            const metrics = this.calculateTextMetrics(text, fontSize, textFormat);
            const maxCharsPerLine = Math.floor(availableWidth / metrics.avgCharWidth);
            
            if (maxCharsPerLine <= 0) continue;

            const wrappedText = this.wrapText(text, maxCharsPerLine, maxLines);
            const lines = wrappedText.split('\\n');
            const totalHeight = lines.length * metrics.lineHeight;

            // Controlla se il testo entra nell'area disponibile
            if (totalHeight <= availableHeight && lines.length <= maxLines) {
                const fillRatio = totalHeight / availableHeight;
                
                // Prendi il font size più grande che entra
                bestFontSize = fontSize;
                bestWrappedText = wrappedText;
                bestLines = lines;
                bestTotalHeight = totalHeight;
                bestFillRatio = fillRatio;
                
                console.log(`✅ Font ${fontSize}px OK: ${lines.length} righe, ${totalHeight.toFixed(1)}px/${availableHeight}px (${(fillRatio*100).toFixed(1)}%)`);
                break;
            }
        }

        console.log(`🎯 Font ottimale: ${bestFontSize}px (${bestLines.length} righe, fill: ${(bestFillRatio*100).toFixed(1)}%)`);

        return {
            fontSize: bestFontSize,
            wrappedText: bestWrappedText,
            lines: bestLines,
            totalHeight: bestTotalHeight,
            fillRatio: bestFillRatio
        };
    }

    testScenario(name, videoWidth, videoHeight, marginTop, marginBottom, marginLeft, marginRight, testText) {
        console.log(`\n🎬 ${name}`);
        console.log(`Video: ${videoWidth}x${videoHeight}px, Margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);
        
        // Calcola dimensioni banner
        const bannerWidth = videoWidth;
        const bannerHeight = Math.round((videoHeight * 450) / 1920);
        
        // Area disponibile
        const textAreaWidth = bannerWidth - marginLeft - marginRight;
        const textAreaHeight = bannerHeight - marginTop - marginBottom;
        
        console.log(`Banner: ${bannerWidth}x${bannerHeight}px, Area testo: ${textAreaWidth}x${textAreaHeight}px`);

        // Test auto-resize
        const result = this.autoResizeTextForArea(testText, textAreaWidth, textAreaHeight, 'uppercase', 10);
        
        // Test posizionamento con i NUOVI CALCOLI CORRETTI
        const fontSize = result.fontSize;
        const lineHeight = fontSize * 1.15;
        
        // Test banner TOP con calcolo corretto
        const baseY = marginTop + fontSize;
        
        console.log(`📝 Risultato: font ${fontSize}px, ${result.lines.length} righe`);
        console.log(`📍 Base Y corretto: ${baseY}px`);

        let allLinesOK = true;
        result.lines.forEach((line, i) => {
            const yPos = Math.round(baseY + (i * lineHeight));
            const maxAllowedY = bannerHeight - marginBottom - fontSize;
            const withinBounds = yPos >= marginTop && yPos <= maxAllowedY;
            
            if (!withinBounds) {
                allLinesOK = false;
                console.log(`❌ Riga ${i+1}: Y=${yPos}px ESCE (max: ${maxAllowedY}px)`);
            } else {
                console.log(`✅ Riga ${i+1}: Y=${yPos}px OK`);
            }
        });

        const status = allLinesOK ? '✅ TUTTO OK' : '❌ PROBLEMI';
        console.log(`🎯 ${status} - Testo ${allLinesOK ? 'rientra' : 'esce dal banner'}`);
        
        return allLinesOK;
    }

    testScenarios() {
        console.log('🧪 TEST ALGORITMO AUTO-RESIZE CON CORREZIONI');
        
        const testText = "IO CHE BALLO FELICE PERCHÉ HO SCOPERTO SPOTIFY PREMIUM PER 24 MESI A SOLI 35€";
        
        let passedTests = 0;
        let totalTests = 0;

        // Test 1: Caso del tuo screenshot - margini stretti
        totalTests++;
        if (this.testScenario(
            'TEST 1: Screenshot originale',
            720, 1280, 4, 10, 3, 12, testText
        )) passedTests++;

        // Test 2: Margini normali
        totalTests++;
        if (this.testScenario(
            'TEST 2: Margini normali',
            720, 1280, 30, 30, 40, 40, testText
        )) passedTests++;

        // Test 3: Margini zero (full banner)
        totalTests++;
        if (this.testScenario(
            'TEST 3: Margini zero',
            720, 1280, 0, 0, 0, 0, testText
        )) passedTests++;

        // Test 4: Video 1080x1920 (risoluzione più alta)
        totalTests++;
        if (this.testScenario(
            'TEST 4: Video HD',
            1080, 1920, 20, 20, 30, 30, testText
        )) passedTests++;

        console.log(`\n🏆 RISULTATI FINALI: ${passedTests}/${totalTests} test superati`);
        
        if (passedTests === totalTests) {
            console.log('🎉 TUTTE LE CORREZIONI FUNZIONANO!');
        } else {
            console.log('⚠️ Alcuni test falliti - potrebbero servire ulteriori aggiustamenti');
        }
    }
}

new AutoResizeTest();
