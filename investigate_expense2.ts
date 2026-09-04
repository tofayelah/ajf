import fs from 'fs';

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

console.log("=== DB KEYS ===");
console.log(Object.keys(db));

console.log("\n=== LATEST JOURNAL ENTRIES ===");
const jnls = db.journalEntries || [];
const latestJnls = jnls.slice(-5);
latestJnls.forEach((j: any) => {
    console.log(`JNL: ${j.id}, Date: ${j.date}, Amount: ${j.amount}, SourceType: ${j.sourceType}, Desc: ${j.description}, Status: ${j.status}`);
});

console.log("\n=== LATEST CASH TRANSACTIONS ===");
const cash = db.cashTransactions || [];
const latestCash = cash.slice(-5);
latestCash.forEach((c: any) => {
    console.log(`CASH: ${c.transactionId}, Date: ${c.date}, In: ${c.cashIn}, Out: ${c.cashOut}, Acct: ${c.accountId}, Desc: ${c.description}, SourceType: ${c.sourceType}, Status: ${c.status}`);
});

