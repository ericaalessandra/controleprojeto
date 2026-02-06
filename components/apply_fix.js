const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'ReportsView.tsx');
const newCodeFile = path.join(__dirname, 'new_export_code.txt');

const targetContent = fs.readFileSync(targetFile, 'utf8');
const newCode = fs.readFileSync(newCodeFile, 'utf8');

const lines = targetContent.split(/\r?\n/);
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const handleExportAccountabilityPDF = async () => {')) {
        startIndex = i;
        // Look back for comment if it exists on previous line
        if (i > 0 && lines[i - 1].includes('Função DETALHADA para Exportação de PDF')) {
            startIndex = i - 1;
        }
    }
    if (line.includes('const consolidatedProjectData = useMemo')) {
        endIndex = i;
    }
}

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found via line scanning!');
    console.log('Start index:', startIndex);
    console.log('End index:', endIndex);
    process.exit(1);
}

console.log(`Replacing lines ${startIndex} to ${endIndex}...`);

const beforeLines = lines.slice(0, startIndex);
const afterLines = lines.slice(endIndex);

const newContent = beforeLines.join('\n') + '\n\n' + newCode + '\n\n' + afterLines.join('\n');

fs.writeFileSync(targetFile, newContent, 'utf8');
console.log('Successfully replaced function content.');
