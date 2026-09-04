const fs = require('fs');

const path = 'src/components/common/AJFLogo.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace both references
content = content.replace(/export const OFFICIAL_AJF_LOGO_URL = '\/LOGO-Final\(1\)\.png';/g, "export const OFFICIAL_AJF_LOGO_URL = '/LOGO-Final.png?v=2.0';");
content = content.replace(/src="\/LOGO-Final\(1\)\.png"/g, 'src="/LOGO-Final.png?v=2.0"');

// Replace fallbacks
content = content.replace(/target.src = '\/LOGO-Final\.png';/g, "target.src = '/LOGO-Final.png?fallback=1';");
content = content.replace(/target.src = '\/logo\.png';/g, "target.src = '/LOGO-Final.png?fallback=2';");

fs.writeFileSync(path, content, 'utf8');
console.log('Patched AJFLogo.tsx');
