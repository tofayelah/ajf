import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

let totalDebit = 0;
let totalCredit = 0;

(db.journalLines || []).forEach(line => {
  totalDebit += (line.debit || 0);
  totalCredit += (line.credit || 0);
});

console.log("Trial Balance:");
console.log(`Debit = ${totalDebit}`);
console.log(`Credit = ${totalCredit}`);
console.log(`Difference = ${totalDebit - totalCredit}`);
