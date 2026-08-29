import fs from 'fs/promises';

async function runTest() {
  let data = JSON.parse(await fs.readFile('database.json', 'utf8'));
  console.log({
    success: true,
    members: data.members.length,
    admissions: data.admissions.length,
    capitalDeposits: data.capitalDeposits.length,
    collections: data.collections.length,
    loans: data.loans.length,
    repayments: data.loanRepayments.length,
    incomes: data.incomes.length,
    expenses: data.expenses.length,
    journalEntries: data.journalEntries.length,
    journalLines: data.journalLines.length,
    cashTransactions: data.cashTransactions.length
  });
}

runTest().catch(console.error);
