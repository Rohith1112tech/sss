const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function getRowHeaders(pagenum) {
    const filename = `d:\\ssss\\page_${pagenum}.png`;
    if (!fs.existsSync(filename)) return;
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(filename, {}, { blocks: true });
    
    // Extract words
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
    
    // Group words into lines
    const rows = [];
    const thresholdY = 25;
    
    rawWords.forEach(w => {
        const cy = (w.bbox.y0 + w.bbox.y1) / 2;
        let placed = false;
        for (const row of rows) {
            const avgCy = row.reduce((sum, item) => sum + item.cy, 0) / row.length;
            if (Math.abs(cy - avgCy) < thresholdY) {
                row.push({ word: w, cy });
                placed = true;
                break;
            }
        }
        if (!placed) {
            rows.push([{ word: w, cy }]);
        }
    });
    
    // Sort rows by Y
    rows.sort((a, b) => {
        const ay = a.reduce((sum, item) => sum + item.cy, 0) / a.length;
        const by = b.reduce((sum, item) => sum + item.cy, 0) / b.length;
        return ay - by;
    });
    
    // Sort words in each row by X
    rows.forEach(row => {
        row.sort((a, b) => a.word.bbox.x0 - b.word.bbox.x0);
    });
    
    console.log(`\n=== ROW HEADERS FOR PAGE ${pagenum} ===`);
    rows.forEach((row, i) => {
        const leftWords = row.filter(item => item.word.bbox.x0 < 200).map(item => `${item.word.text}(${item.word.bbox.x0})`).join(' ');
        const fullLine = row.slice(0, 5).map(item => item.word.text).join(' ');
        console.log(`Row ${i + 1} (Y=${Math.round(row[0].cy)}): Left=[${leftWords}] Full=[${fullLine}]`);
    });
    
    await worker.terminate();
}

async function main() {
    await getRowHeaders(5);
    await getRowHeaders(6);
    await getRowHeaders(7);
}

main().catch(err => {
    console.error(err);
});
