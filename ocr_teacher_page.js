const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function analyzeTeacherPage(filename, pagenum) {
    console.log(`Analyzing ${filename} (Page ${pagenum}) with blocks output...`);
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(filename, {}, { blocks: true });
    
    // Extract words from blocks
    const rawWords = [];
    if (data.blocks) {
        data.blocks.forEach(block => {
            if (block.paragraphs) {
                block.paragraphs.forEach(para => {
                    if (para.lines) {
                        para.lines.forEach(line => {
                            if (line.words) {
                                line.words.forEach(word => {
                                    rawWords.push(word);
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    
    const words = rawWords.map(w => ({
        text: w.text,
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
        cy: (w.bbox.y0 + w.bbox.y1) / 2,
        cx: (w.bbox.x0 + w.bbox.x1) / 2
    }));
    
    // Group words into lines based on Y coordinate center
    const rows = [];
    const thresholdY = 25; // pixels
    
    words.forEach(word => {
        let placed = false;
        for (const row of rows) {
            const avgCy = row.reduce((sum, w) => sum + w.cy, 0) / row.length;
            if (Math.abs(word.cy - avgCy) < thresholdY) {
                row.push(word);
                placed = true;
                break;
            }
        }
        if (!placed) {
            rows.push([word]);
        }
    });
    
    // Sort rows by Y coordinate
    rows.sort((a, b) => {
        const ay = a.reduce((sum, w) => sum + w.cy, 0) / a.length;
        const by = b.reduce((sum, w) => sum + w.cy, 0) / b.length;
        return ay - by;
    });
    
    // Sort words within each row by X coordinate
    rows.forEach(row => {
        row.sort((a, b) => a.x0 - b.x0);
    });
    
    console.log(`--- Reconstructed Rows for Page ${pagenum} ---`);
    rows.forEach((row, i) => {
        const lineText = row.map(w => `${w.text}(${Math.round(w.x0)})`).join(' ');
        console.log(`Row ${i + 1}: ${lineText}`);
    });
    
    await worker.terminate();
}

async function main() {
    await analyzeTeacherPage('d:\\ssss\\page_5.png', 5);
    await analyzeTeacherPage('d:\\ssss\\page_7.png', 7);
}

main().catch(err => {
    console.error(err);
});
