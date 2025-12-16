const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/noteController.js');
const content = fs.readFileSync(filePath, 'utf8');

let open = 0;
let close = 0;
let inString = false;
let stringChar = '';
let inComment = false; // // style
let inMultiComment = false; // /* style

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inComment) {
        if (char === '\n') inComment = false;
        continue;
    }
    if (inMultiComment) {
        if (char === '*' && next === '/') {
            inMultiComment = false;
            i++;
        }
        continue;
    }
    if (inString) {
        if (char === '\\') { i++; continue; }
        if (char === stringChar) {
            inString = false;
        }
        continue;
    }

    // Start comment
    if (char === '/' && next === '/') {
        inComment = true;
        i++;
        continue;
    }
    if (char === '/' && next === '*') {
        inMultiComment = true;
        i++;
        continue;
    }

    // Start string
    if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }

    if (char === '{') open++;
    if (char === '}') close++;
}

console.log(`Open: ${open}, Close: ${close}, Diff: ${open - close}`);
