const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { createWorker } = require('tesseract.js');

const pdfPath = 'C:\\Users\\rohit\\Downloads\\T5-Updated G12_Stem.pdf';
const imgPath = 'C:\\Users\\rohit\\Downloads\\WhatsApp Image 2026-07-02 at 7.07.14 PM.jpeg';

async function renderPdfPages() {
    console.log("Loading PDF...");
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'file:///d:/ssss/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
    
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const doc = await loadingTask.promise;
    console.log(`Document loaded. Pages: ${doc.numPages}`);
    
    for (let i = 1; i <= doc.numPages; i++) {
        console.log(`Rendering Page ${i}...`);
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2.5 }); // Higher scale for better OCR
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`d:\\ssss\\page_${i}.png`, buffer);
        console.log(`Saved page_${i}.png`);
    }
    return doc.numPages;
}

async function runOcrOnAll(numPages) {
    console.log("Initializing Tesseract worker...");
    const worker = await createWorker('eng');
    
    for (let i = 1; i <= numPages; i++) {
        console.log(`Performing OCR on page_${i}.png...`);
        const { data: { text } } = await worker.recognize(`d:\\ssss\\page_${i}.png`);
        fs.writeFileSync(`d:\\ssss\\ocr_page_${i}.txt`, text);
        console.log(`Saved ocr_page_${i}.txt`);
    }
    
    if (fs.existsSync(imgPath)) {
        console.log("Performing OCR on WhatsApp Image...");
        const { data: { text } } = await worker.recognize(imgPath);
        fs.writeFileSync('d:\\ssss\\ocr_whatsapp.txt', text);
        console.log("Saved ocr_whatsapp.txt");
    } else {
        console.log("WhatsApp image not found at", imgPath);
    }
    
    await worker.terminate();
    console.log("OCR processes finished.");
}

async function main() {
    const numPages = await renderPdfPages();
    await runOcrOnAll(numPages);
}

main().catch(err => {
    console.error("Error in main:", err);
});
