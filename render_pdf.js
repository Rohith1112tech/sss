const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');

async function main() {
    try {
        console.log("Loading PDF...");
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'file:///d:/ssss/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
        
        const pdfPath = 'C:\\Users\\rohit\\Downloads\\T5-Updated G12_Stem.pdf';
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument({ data });
        const doc = await loadingTask.promise;
        console.log(`Document loaded. Pages: ${doc.numPages}`);
        
        // Render Page 1
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('d:\\ssss\\page_1.png', buffer);
        console.log("Rendered page 1 to page_1.png");
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
