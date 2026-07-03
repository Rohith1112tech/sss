const fs = require('fs');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

async function cropLeft(pagenum) {
    const filename = `d:\\ssss\\page_${pagenum}.png`;
    if (!fs.existsSync(filename)) return;
    
    console.log(`Loading page_${pagenum}.png...`);
    const img = await loadImage(filename);
    
    // We crop the left part where teacher names should be
    // Let's crop from x = 0 to x = 300
    const cropWidth = 300;
    const canvas = createCanvas(cropWidth, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cropWidth, img.height, 0, 0, cropWidth, img.height);
    
    const outFilename = `d:\\ssss\\page_${pagenum}_left.png`;
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outFilename, buffer);
    console.log(`Saved cropped image to ${outFilename}`);
    
    console.log(`Running OCR on ${outFilename}...`);
    const worker = await createWorker('eng');
    await worker.setParameters({
        tessedit_pageseg_mode: '6', // uniform block
    });
    const { data: { text } } = await worker.recognize(outFilename);
    console.log(`--- OCR Left Page ${pagenum} ---`);
    console.log(text);
    fs.writeFileSync(`d:\\ssss\\ocr_page_${pagenum}_left.txt`, text);
    await worker.terminate();
}

async function main() {
    await cropLeft(5);
    await cropLeft(7);
}

main().catch(err => {
    console.error(err);
});
