const fs = require('fs');

// Patch index.html
let indexContent = fs.readFileSync('index.html', 'utf8');
indexContent = indexContent.replace(/href="\/LOGO-Final\.png\?v=2\.0"/g, 'href="/AJF-Official-Logo-Final-2026.png?v=3.0"');
fs.writeFileSync('index.html', indexContent, 'utf8');

// Patch db.ts
let dbContent = fs.readFileSync('src/services/db.ts', 'utf8');
dbContent = dbContent.replace(/orgLogoUrl: "\/LOGO-Final\.png\?v=2\.0",/g, 'orgLogoUrl: "/AJF-Official-Logo-Final-2026.png?v=3.0",');
fs.writeFileSync('src/services/db.ts', dbContent, 'utf8');

console.log('Patched index.html and db.ts');
