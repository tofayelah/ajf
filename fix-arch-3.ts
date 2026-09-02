import fs from 'fs';
let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

content = content.replace(
    "particulars: l.particulars || l.description || '', // Fix for particulars falling back to description",
    "particulars: (l as any).particulars || l.description || '', // Fix for particulars falling back to description"
);

fs.writeFileSync('src/services/accounting.ts', content);
console.log('Fixed TypeScript error.');
