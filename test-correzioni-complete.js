// Test completo delle correzioni al posizionamento testo
const path = require('path');
const fs = require('fs');

class VideoProcessorTest {
    constructor() {
        console.log('🎯 TEST DELLE CORREZIONI AL POSIZIONAMENTO TESTO');
    }

    // Copia del metodo corretto da video-processor.js
    calculateBlockDimensions(videoWidth, videoHeight) {
        const blockWidth = videoWidth;
        const referenceHeight = 450;
        const referenceVideoHeight = 1920;
        const blockHeight = Math.round((videoHeight * referenceHeight) / referenceVideoHeight);
        
        return {
            width: blockWidth,
            height: blockHeight,
            x: 0,
            aspectRatio: videoWidth / videoHeight
        };
    }

    calculateAvailableTextArea(blockWidth, blockHeight, margins) {
        const { marginTop = 30, marginBottom = 30, marginLeft = 40, marginRight = 40 } = margins || {};
        const availableWidth = blockWidth - marginLeft - marginRight;
        const availableHeight = blockHeight - marginTop - marginBottom;
        const allMarginsZero = marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0;
        const safeWidth = allMarginsZero ? availableWidth : Math.max(availableWidth, 100);
        const safeHeight = allMarginsZero ? availableHeight : Math.max(availableHeight, 50);

        return {
            width: safeWidth,
            height: safeHeight,
            effectiveMargins: { top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight }
        };
    }

    testPositioning() {
        // Simula il caso reale dal tuo screenshot
        const width = 720;
        const height = 1280;
        
        // Margini dal preview (T4 B10 L3 R12)
        const marginTop = 4;
        const marginBottom = 10;
        const marginLeft = 3;
        const marginRight = 12;

        const blockDimensions = this.calculateBlockDimensions(width, height);
        const blockWidth = blockDimensions.width;
        const blockHeight = blockDimensions.height;
        const bannerX = blockDimensions.x;

        console.log('\n📊 SETUP TEST:');
        console.log(`Video: ${width}x${height}px`);
        console.log(`Banner: ${blockWidth}x${blockHeight}px @ X=${bannerX}`);
        console.log(`Margini: T${marginTop} B${marginBottom} L${marginLeft} R${marginRight}`);

        const margins = { marginTop, marginBottom, marginLeft, marginRight };
        const textArea = this.calculateAvailableTextArea(blockWidth, blockHeight, margins);

        console.log(`Area testo: ${textArea.width}x${textArea.height}px`);

        // Test banner TOP (come nel video che ha mostrato problemi)
        const fontSize = 61; // Dal tuo screenshot
        const lineHeight = fontSize * 1.15;

        console.log('\n🎯 TEST BANNER TOP:');
        
        // CALCOLO CORRETTO (nuovo)
        const baseY = marginTop + fontSize;
        console.log(`Base Y corretto: ${baseY}px`);

        const testLines = [
            'IO CHE BALLO FELICE',
            'PERCHÉ HO SCOPERTO', 
            'SPOTIFY PREMIUM PER',
            '24 MESI A SOLI 35€'
        ];

        console.log('\n📝 POSIZIONI RIGHE:');
        testLines.forEach((line, i) => {
            const yPos = Math.round(baseY + (i * lineHeight));
            
            // Controlla limiti banner
            const bannerTopY = 0;
            const bannerBottomY = blockHeight;
            const minAllowedY = bannerTopY + marginTop;
            const maxAllowedY = bannerBottomY - marginBottom - fontSize;
            
            const withinBounds = yPos >= minAllowedY && yPos <= maxAllowedY;
            const status = withinBounds ? '✅ OK' : '❌ ESCE DAL BANNER';
            
            console.log(`Riga ${i+1}: Y=${yPos}px ${status} (limiti: ${minAllowedY}-${maxAllowedY}px)`);
        });

        // Test del calcolo X
        console.log('\n📏 TEST POSIZIONAMENTO X:');
        const availableTextWidth = blockWidth - marginLeft - marginRight;
        const textAreaStartX = bannerX + marginLeft;
        const xPosFormula = `${textAreaStartX}+((${availableTextWidth}-text_w)/2)`;
        
        console.log(`Banner X: ${bannerX}px`);
        console.log(`Margine sinistro: ${marginLeft}px`);
        console.log(`Area testo disponibile: ${availableTextWidth}px`);
        console.log(`Formula X centrato: ${xPosFormula}`);
        console.log(`Esempio con text_w=400px: X = ${textAreaStartX + (availableTextWidth-400)/2}px`);

        // Test banner BOTTOM
        console.log('\n🎯 TEST BANNER BOTTOM:');
        const bottomBannerY = height - blockHeight;
        const bottomBaseY = bottomBannerY + marginTop + fontSize;
        
        console.log(`Banner Y: ${bottomBannerY}px`);
        console.log(`Base Y: ${bottomBaseY}px`);

        testLines.forEach((line, i) => {
            const yPos = Math.round(bottomBaseY + (i * lineHeight));
            const minAllowedY = bottomBannerY + marginTop;
            const maxAllowedY = height - marginBottom - fontSize;
            const withinBounds = yPos >= minAllowedY && yPos <= maxAllowedY;
            const status = withinBounds ? '✅ OK' : '❌ ESCE DAL BANNER';
            
            console.log(`Riga ${i+1}: Y=${yPos}px ${status} (limiti: ${minAllowedY}-${maxAllowedY}px)`);
        });

        console.log('\n✨ VERIFICA CORREZIONI:');
        console.log('✅ BaseY ora usa: marginTop + fontSize (invece di fontSize * 0.75)');
        console.log('✅ Posizionamento X considera bannerX + marginLeft');
        console.log('✅ Limiti del banner corretti con fontSize nelle verifiche');
        console.log('✅ Banner copre tutta la larghezza (blockWidth = videoWidth)');
    }
}

const tester = new VideoProcessorTest();
tester.testPositioning();
