const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');

const safeCheck = `const isProduction = (typeof process !== 'undefined' && process.env && process.env.VITE_APP_MODE === "production") || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_MODE === "production");`;

content = content.replace(/if \(import\.meta\.env\.VITE_APP_MODE === "production"\)/g, `
  ${safeCheck}
  if (isProduction)`);

content = content.replace(/const isProduction = import.meta.env.VITE_APP_MODE === 'production';/g, safeCheck);

fs.writeFileSync('src/services/db.ts', content, 'utf8');
console.log("Patched import.meta.env");
