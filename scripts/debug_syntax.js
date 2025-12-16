const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/noteController.js');
const content = fs.readFileSync(filePath, 'utf8');

let braces = 0; // {}
let parens = 0; // ()
let brackets = 0; // []

let inString = false;
let stringChar = '';
let inComment = false;
let inMultiComment = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inComment) { if (char === '\n') inComment = false; continue; }
    if (inMultiComment) { if (char === '*' && next === '/') { inMultiComment = false; i++; } continue; }
    if (inString) {
        if (char === '\\') { i++; continue; }
        if (char === stringChar) { inString = false; }
        continue;
    }

    if (char === '/' && next === '/') { inComment = true; i++; continue; }
    if (char === '/' && next === '*') { inMultiComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === '`') { inString = true; stringChar = char; continue; }

    if (content.substring(i, i + 3) === 'try' && (i === 0 || !/[a-zA-Z0-9]/.test(content[i - 1]))) {
        // check if next token is {
        // simplified check
        parens++; // Reuse variable as 'try count'
    }
    if (content.substring(i, i + 5) === 'catch' && (i === 0 || !/[a-zA-Z0-9]/.test(content[i - 1]))) {
        brackets++; // Reuse variable as 'catch count'
    }
}

console.log(`Try: ${parens}, Catch: ${brackets}`);
if (parens !== brackets) console.log('Try/Catch mismatch!');

