const fs = require('fs');

async function main() {
    try {
        console.log("Loading PDF...");
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        // Set worker (as file URL for ESM loader on Windows)
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'file:///d:/ssss/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
        
        const pdfPath = 'C:\\Users\\rohit\\Downloads\\T5-Updated G12_Stem.pdf';
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument({ data });
        const doc = await loadingTask.promise;
        console.log(`Document loaded. Pages: ${doc.numPages}`);
        
        for (let i = 1; i <= doc.numPages; i++) {
            console.log(`--- Page ${i} ---`);
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            console.log(`Items count: ${textContent.items.length}`);
            const strings = textContent.items.map(item => item.str);
            console.log("Text strings:", strings.slice(0, 30).join(' | '));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
