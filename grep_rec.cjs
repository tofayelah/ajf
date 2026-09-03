const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
const recId = 'REC-2026-000054';

console.log("CASH TRANSACTIONS:");
const cash = db.cashTransactions.filter(c => c.reference === recId || c.voucherNo === recId || (c.description && c.description.includes(recId)));
console.log(JSON.stringify(cash, null, 2));

console.log("INCOMES:");
const inc = db.incomes.filter(i => i.reference === recId || i.voucherNo === recId || (i.remarks && i.remarks.includes(recId)));
console.log(JSON.stringify(inc, null, 2));
