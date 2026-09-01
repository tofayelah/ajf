import fs from 'fs';

let code = fs.readFileSync('src/services/accounting.ts', 'utf-8');
code = code.replace(/params\.paymentMethod === 'Cash'/g, "String(params.paymentMethod).toUpperCase() === 'CASH'");
fs.writeFileSync('src/services/accounting.ts', code, 'utf-8');
