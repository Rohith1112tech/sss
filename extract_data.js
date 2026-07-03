const fs = require('fs');
const path = require('path');

function extractInfo() {
    const classSet = new Set();
    const teacherSet = new Set();
    
    // Scan all OCR files
    for (let i = 1; i <= 7; i++) {
        const file = `d:\\ssss\\ocr_page_${i}.txt`;
        if (!fs.existsSync(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        
        // Find things like 1Y, 2Y, 11-G1, 12-G2
        const classMatches = content.match(/\b\d+[YBG]\d*\b|\b\d+-\w+\d*\b/g);
        if (classMatches) {
            classMatches.forEach(c => classSet.add(c));
        }
    }
    
    console.log("Classes found:", Array.from(classSet).sort());
    
    // Look at page 5 and 7 line prefixes which are potential teacher names
    const teacherFiles = ['d:\\ssss\\ocr_page_5.txt', 'd:\\ssss\\ocr_page_7.txt'];
    teacherFiles.forEach(file => {
        if (!fs.existsSync(file)) return;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const parts = trimmed.split(/\s*\|\s*/);
            if (parts.length > 2) {
                const potentialName = parts[0].replace(/[^a-zA-Z\s]/g, '').trim();
                if (potentialName && potentialName.length > 2 && potentialName.length < 15 && !potentialName.includes("Days") && !potentialName.includes("eer") && !potentialName.includes("Day")) {
                    teacherSet.add(potentialName);
                }
            }
        });
    });
    
    console.log("Potential Teachers found:", Array.from(teacherSet).sort());
}

extractInfo();
