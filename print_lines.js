const fs = require('fs');

function inspectFile(filename) {
    console.log(`=== ${filename} ===`);
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.trim().length > 0) {
            console.log(`${index + 1}: ${line.trim().substring(0, 120)}`);
        }
    });
}

inspectFile('d:\\ssss\\ocr_page_5.txt');
inspectFile('d:\\ssss\\ocr_page_7.txt');
inspectFile('d:\\ssss\\ocr_page_2.txt');
inspectFile('d:\\ssss\\ocr_page_3.txt');
