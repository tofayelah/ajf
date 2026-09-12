const fs = require('fs');

async function main() {
  const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
  const baseline = {
    Members: db.members.length,
    Collections: db.collections.length,
    Admissions: db.admissions.length,
    CapitalDeposits: db.capitalDeposits.length,
    Incomes: db.incomes.length,
    Expenses: db.expenses.length,
    CashTransactions: db.cashTransactions.length,
    BankTransactions: db.bankTransactions.length,
    JournalEntries: db.journalEntries.length,
    MemberLedgers: db.memberLedgers.length
  };
  console.log("Baseline:", baseline);
}
main();
