const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function main() {
    console.log("Initializing Tesseract worker...");
    const worker = await createWorker('eng');
    console.log("Performing OCR on page_1.png...");
    const { data: { text } } = await worker.recognize('d:\\ssss\\page_1.png');
    console.log("OCR Result for page_1.png:");
    console.log(text);
    fs.writeFileSync('d:\\ssss\\ocr_page_1.txt', text);
    await worker.terminate();
}

main().catch(err => {
    console.error("OCR Error:", err);
});
