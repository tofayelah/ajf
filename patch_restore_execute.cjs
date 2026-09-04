const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `await writeDbFile(cleanRestoredDb);`;
const newStr = `await writeDbFile(cleanRestoredDb, { skipSafetyCheck: true });`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Updated restore execute in server.ts');
