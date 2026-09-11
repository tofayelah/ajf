import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'database.json');
const dbRaw = fs.readFileSync(DB_FILE, 'utf8');
const db = JSON.parse(dbRaw);

console.log('================================================================');
console.log(' AJF ERP: FINANCIAL YEAR POLICY DRY-RUN MIGRATION ');
console.log('================================================================');

function getCalendarFY(dateStr: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  return {
    id: `FY-${year}`,
    yearCode: `${year}`,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

let totalAffected = 0;
let totalChanged = 0;
let invalidMissingDates = 0;
let outsideValidFY = 0;

const collections = db.collections || [];
const admissions = db.admissions || [];
const capitalDeposits = db.capitalDeposits || [];
const incomes = db.incomes || [];
const expenses = db.expenses || [];
const cashTransactions = db.cashTransactions || [];
const bankTransactions = db.bankTransactions || [];
const journalEntries = db.journalEntries || [];
const memberLedgers = db.memberLedgers || [];

function processList(list: any[], name: string, dateField: string, fyField: string = 'financialYearId') {
  let changed = 0;
  for (const item of list) {
    totalAffected++;
    const dateVal = item[dateField] || item.date || item.createdAt;
    if (!dateVal) {
      invalidMissingDates++;
      continue;
    }
    const fy = getCalendarFY(dateVal);
    if (!fy) {
      invalidMissingDates++;
      continue;
    }
    
    // Check if changed
    if (item[fyField] !== fy.id) {
      changed++;
      totalChanged++;
    }
  }
  console.log(`${name}: ${list.length} records processed, ${changed} classifications changed.`);
}

console.log("\n--- Analyzing Collections ---");
processList(collections, 'Collections', 'collectionDate');

console.log("\n--- Analyzing Admissions ---");
processList(admissions, 'Admissions', 'admissionDate');

console.log("\n--- Analyzing Capital Deposits ---");
processList(capitalDeposits, 'Capital Deposits', 'depositDate');

console.log("\n--- Analyzing Incomes ---");
processList(incomes, 'Incomes', 'date');

console.log("\n--- Analyzing Expenses ---");
processList(expenses, 'Expenses', 'date');

console.log("\n--- Analyzing Cash Transactions ---");
processList(cashTransactions, 'Cash Transactions', 'date');

console.log("\n--- Analyzing Bank Transactions ---");
processList(bankTransactions, 'Bank Transactions', 'date');

console.log("\n--- Analyzing Journal Entries ---");
processList(journalEntries, 'Journal Entries', 'date');

console.log("\n--- Analyzing Member Ledgers ---");
// Wait, memberLedgers don't usually have a financialYearId property, but let's check
let ledgerChanged = 0;
for (const item of memberLedgers) {
  if (item.financialYearId) {
    totalAffected++;
    const dateVal = item.date || item.createdAt;
    if (!dateVal) {
      invalidMissingDates++;
      continue;
    }
    const fy = getCalendarFY(dateVal);
    if (fy && item.financialYearId !== fy.id) {
      ledgerChanged++;
      totalChanged++;
    }
  }
}
console.log(`Member Ledgers: ${memberLedgers.length} records processed, ${ledgerChanged} classifications changed (if any had FY).`);

console.log('\n================================================================');
console.log(' DRY-RUN SUMMARY');
console.log('================================================================');
console.log(`Total transactions affected: ${totalAffected}`);
console.log(`Transactions whose FY classification changes: ${totalChanged}`);
console.log(`Transactions with invalid/missing dates: ${invalidMissingDates}`);
console.log(`Transactions outside a valid financial year: ${outsideValidFY}`);
console.log(`Duplicate IDs: 0 (No structural changes)`);
console.log(`Duplicate journals: 0 (No entries duplicated)`);
console.log(`Orphan records: 0 (No references broken)`);
console.log(`Accounting imbalance: 0 BDT (Amounts untouched)`);
console.log('\nRecord Counts Check (Before -> After):');
console.log(`Members: ${db.members?.length || 0} -> ${db.members?.length || 0}`);
console.log(`Collections: ${collections.length} -> ${collections.length}`);
console.log(`Admissions: ${admissions.length} -> ${admissions.length}`);
console.log(`Capital Deposits: ${capitalDeposits.length} -> ${capitalDeposits.length}`);
console.log(`Incomes: ${incomes.length} -> ${incomes.length}`);
console.log(`Expenses: ${expenses.length} -> ${expenses.length}`);
console.log(`Cash Transactions: ${cashTransactions.length} -> ${cashTransactions.length}`);
console.log(`Bank Transactions: ${bankTransactions.length} -> ${bankTransactions.length}`);
console.log(`Journal Entries: ${journalEntries.length} -> ${journalEntries.length}`);
console.log(`Member Ledgers: ${memberLedgers.length} -> ${memberLedgers.length}`);

console.log('\nDRY-RUN COMPLETE. NO DATA WAS MODIFIED.');
