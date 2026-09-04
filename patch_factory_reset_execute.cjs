const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `await writeDbFile(cleanDb);`;
const newStr = `await writeDbFile(cleanDb, { skipSafetyCheck: true });`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Updated factory reset execute in server.ts');
