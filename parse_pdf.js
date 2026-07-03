const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = 'C:\\Users\\rohit\\Downloads\\T5-Updated G12_Stem.pdf';

async function main() {
    try {
        console.log("Loading PDF...");
        const dataBuffer = fs.readFileSync(pdfPath);
        const parser = new PDFParse({ data: dataBuffer });
        
        console.log("Extracting info...");
        const info = await parser.getInfo();
        console.log("Info:", info);
        
        console.log("Extracting text...");
        const textResult = await parser.getText();
        fs.writeFileSync('d:\\ssss\\extracted_text.txt', textResult.text);
        console.log("Text successfully written to extracted_text.txt");
        
        console.log("Extracting table...");
        try {
            const tableResult = await parser.getTable();
            fs.writeFileSync('d:\\ssss\\extracted_tables.json', JSON.stringify(tableResult, null, 2));
            console.log("Tables successfully written to extracted_tables.json");
        } catch (tableErr) {
            console.error("Error extracting tables:", tableErr);
        }
        
        await parser.destroy();
    } catch (err) {
        console.error("Error in main:", err);
    }
}

main();
