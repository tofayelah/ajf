const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
content = content.replace(/href="\/LOGO-Final\(1\)\.png"/g, 'href="/LOGO-Final.png?v=2.0"');
fs.writeFileSync('index.html', content, 'utf8');
console.log('Patched index.html logo');
