const fs = require('fs');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

const imgPath = 'C:\\Users\\rohit\\Downloads\\WhatsApp Image 2026-07-02 at 7.07.14 PM.jpeg';

async function preprocessAndOcr() {
    if (!fs.existsSync(imgPath)) {
        console.log("WhatsApp image not found.");
        return;
    }
    
    console.log("Loading image...");
    const img = await loadImage(imgPath);
    console.log(`Image loaded. Dimensions: ${img.width}x${img.height}`);
    
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Simple preprocessing: Grayscale & Contrast enhancement
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        // Grayscale
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        // High contrast thresholding
        let val = gray > 128 ? 255 : 0;
        data[i] = val;
        data[i+1] = val;
        data[i+2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('d:\\ssss\\processed_whatsapp.png', buffer);
    console.log("Saved processed_whatsapp.png");
    
    console.log("Running Tesseract OCR on processed image...");
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize('d:\\ssss\\processed_whatsapp.png');
    fs.writeFileSync('d:\\ssss\\ocr_processed_whatsapp.txt', text);
    console.log("OCR Result:");
    console.log(text);
    await worker.terminate();
}

preprocessAndOcr().catch(err => {
    console.error("Error:", err);
});
