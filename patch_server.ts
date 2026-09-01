import fs from 'fs';

const code = fs.readFileSync('server.ts', 'utf-8');
const patchedCode = code.replace(
  /console\.error\('\[Accounting API Error\]:', error\);/,
  "console.error('[Accounting API Error]:', error);\n    fs.writeFileSync('server_error_log.txt', String(error.stack || error));"
);
fs.writeFileSync('server.ts', patchedCode, 'utf-8');
