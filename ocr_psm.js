const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function testPsm(pagenum, psm) {
    console.log(`Running OCR on page_${pagenum}.png with PSM = ${psm}...`);
    const worker = await createWorker('eng');
    await worker.setParameters({
        tessedit_pageseg_mode: String(psm),
    });
    const { data: { text } } = await worker.recognize(`d:\\ssss\\page_${pagenum}.png`);
    fs.writeFileSync(`d:\\ssss\\ocr_page_${pagenum}_psm_${psm}.txt`, text);
    console.log(`Finished. Saved to ocr_page_${pagenum}_psm_${psm}.txt`);
    await worker.terminate();
}

async function main() {
    // Try PSM 6 (Assume a single uniform block of text)
    await testPsm(5, 6);
    await testPsm(7, 6);
    // Also print the first 20 lines of the results
    console.log("=== Page 5 PSM 6 ===");
    console.log(fs.readFileSync('d:\\ssss\\ocr_page_5_psm_6.txt', 'utf8').split('\n').slice(0, 20).join('\n'));
    console.log("=== Page 7 PSM 6 ===");
    console.log(fs.readFileSync('d:\\ssss\\ocr_page_7_psm_6.txt', 'utf8').split('\n').slice(0, 20).join('\n'));
}

main().catch(err => {
    console.error(err);
});
