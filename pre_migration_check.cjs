const fs = require('fs');
const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

let remapping = 0;
let missingInvalid = 0;
const cols = [
  'collections', 'admissions', 'capitalDeposits', 'incomes', 'expenses',
  'cashTransactions', 'bankTransactions', 'journalEntries', 'memberLedgers'
];

cols.forEach(col => {
  (db[col] || []).forEach(record => {
    let d = record.date || record.collectionDate || record.transactionDate || record.approvalDate || record.depositDate;
    if (!d) {
      missingInvalid++;
    } else {
      const year = new Date(d).getFullYear();
      if (year === 2026 || year === 2027 || year === 2028) {
         remapping++;
      } else {
         missingInvalid++;
      }
    }
  });
});
console.log(`Remapping: ${remapping}, Missing: ${missingInvalid}`);
