const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function main() {
    console.log("Running grid column analysis on page_3.png...");
    const worker = await createWorker('eng');
    const { data } = await worker.recognize('d:\\ssss\\page_3.png', {}, { blocks: true });
    
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
    
    // Let's cluster X coordinates of words
    // We filter words that look like classes or subjects: e.g. Phy, Che, Mat, Eng, CS, Eco, PT, 11-G1, etc.
    const words = rawWords.map(w => ({
        text: w.text,
        x0: w.bbox.x0,
        x1: w.bbox.x1,
        y0: w.bbox.y0,
        y1: w.bbox.y1,
        cx: (w.bbox.x0 + w.bbox.x1) / 2,
        cy: (w.bbox.y0 + w.bbox.y1) / 2
    }));
    
    // Sort words by cx
    words.sort((a, b) => a.cx - b.cx);
    
    // Cluster X-centers
    const cols = [];
    const thresholdX = 40; // pixels
    
    words.forEach(word => {
        let placed = false;
        for (const col of cols) {
            const avgCx = col.reduce((sum, w) => sum + w.cx, 0) / col.length;
            if (Math.abs(word.cx - avgCx) < thresholdX) {
                col.push(word);
                placed = true;
                break;
            }
        }
        if (!placed) {
            cols.push([word]);
        }
    });
    
    cols.sort((a, b) => {
        const ax = a.reduce((sum, w) => sum + w.cx, 0) / a.length;
        const bx = b.reduce((sum, w) => sum + w.cx, 0) / b.length;
        return ax - bx;
    });
    
    console.log(`Found ${cols.length} columns.`);
    cols.forEach((col, i) => {
        const avgCx = Math.round(col.reduce((sum, w) => sum + w.cx, 0) / col.length);
        const sampleText = col.slice(0, 5).map(w => w.text).join(', ');
        console.log(`Col ${i + 1} (avg cx = ${avgCx}, count = ${col.length}): ${sampleText}`);
    });
    
    await worker.terminate();
}

main().catch(err => {
    console.error(err);
});
