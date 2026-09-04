const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');
content = content.replace(/orgLogoUrl: "\/LOGO-Final\(1\)\.png",/g, 'orgLogoUrl: "/LOGO-Final.png?v=2.0",');
fs.writeFileSync('src/services/db.ts', content, 'utf8');
console.log('Patched db.ts logo');
