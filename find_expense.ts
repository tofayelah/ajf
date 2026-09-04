import fs from 'fs';

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

console.log("=== SEARCHING EXPENSE IN JOURNALS ===");
const jnls = db.journalEntries || [];
const expJnls = jnls.filter((j: any) => j.sourceType === 'EXPENSE' || (j.description && j.description.toLowerCase().includes('expense')));
console.log(`Found ${expJnls.length} journals`);

expJnls.slice(-5).forEach((j: any) => {
    console.log(JSON.stringify(j, null, 2));
});

console.log("=== SEARCHING EXPENSE IN CASH TRANSACTIONS ===");
const cash = db.cashTransactions || [];
const expCash = cash.filter((c: any) => c.sourceType === 'EXPENSE' || c.cashOut > 0);
console.log(`Found ${expCash.length} cash out transactions`);

expCash.slice(-5).forEach((c: any) => {
    console.log(JSON.stringify(c, null, 2));
});

