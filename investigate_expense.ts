import fs from 'fs';

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

console.log("=== EXPENSES ===");
const expenses = db.expenses || [];
const latestExpenses = expenses.slice(-3); // Last 3 expenses

for (const exp of latestExpenses) {
    console.log(`\nExpense ID: ${exp.expenseId || exp.id}`);
    console.log(`Voucher No: ${exp.voucherNo}`);
    console.log(`Date: ${exp.date}`);
    console.log(`Amount: ${exp.amount}`);
    console.log(`Expense Head: ${exp.expenseHead}`);
    console.log(`Account ID: ${exp.accountId}`);
    console.log(`Description: ${exp.description || exp.remarks}`);
    console.log(`Status: ${exp.status}`);
    console.log(`Created At: ${exp.createdAt}`);
    console.log(`Created By: ${exp.createdBy}`);
    
    // Check Journals
    const jnls = db.journalEntries?.filter((j: any) => j.reference === exp.voucherNo || j.sourceId === exp.expenseId || j.reference === exp.expenseId);
    console.log(`\nJournals: ${jnls.length}`);
    jnls.forEach((j: any) => {
        console.log(`  JNL ID: ${j.id}, Amount: ${j.amount}, SourceType: ${j.sourceType}, Status: ${j.status}`);
        const lines = db.journalLines?.filter((l: any) => l.journalEntryId === j.id);
        lines.forEach((l: any) => {
            console.log(`    Line ID: ${l.id}, Acct: ${l.accountId}, Dr: ${l.debit}, Cr: ${l.credit}`);
        });
    });

    // Check Cash/Bank
    const cash = db.cashTransactions?.filter((c: any) => c.reference === exp.voucherNo || c.voucherNo === exp.voucherNo || c.sourceId === exp.expenseId);
    console.log(`\nCash/Bank: ${cash.length}`);
    cash.forEach((c: any) => {
        console.log(`  Txn ID: ${c.transactionId}, In: ${c.cashIn}, Out: ${c.cashOut}, Acct: ${c.accountId}, Status: ${c.status}`);
    });
}

// Calculate totals independently
const totalPostedExpenses = expenses.filter((e: any) => e.status === 'POSTED' || e.status === 'APPROVED').reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

console.log(`\n=== INDEPENDENT TOTALS ===`);
console.log(`Authoritative Expense Records: ${totalPostedExpenses}`);

