import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'database.json');
const dbRaw = fs.readFileSync(DB_FILE, 'utf8');
const db = JSON.parse(dbRaw);

console.log('================================================================');
console.log(' AJF ERP: FINANCIAL YEAR POLICY MIGRATION SCRIPT ');
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

const initialCounts = {
  members: db.members?.length || 0,
  collections: db.collections?.length || 0,
  admissions: db.admissions?.length || 0,
  capitalDeposits: db.capitalDeposits?.length || 0,
  incomes: db.incomes?.length || 0,
  expenses: db.expenses?.length || 0,
  cashTransactions: db.cashTransactions?.length || 0,
  bankTransactions: db.bankTransactions?.length || 0,
  journalEntries: db.journalEntries?.length || 0,
  memberLedgers: db.memberLedgers?.length || 0,
};

function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

function processList(list: any[], name: string, dateField: string, fyField: string = 'financialYearId') {
  if (!list) return 0;
  let changed = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
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
      item[fyField] = fy.id;
    }
  }
  console.log(`${name}: ${list.length} records processed, ${changed} classifications changed.`);
  return changed;
}

// Ensure FY 2026 exists
const fy2026 = {
  id: "FY-2026",
  yearCode: "2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  remarks: "Migrated to Calendar Year"
};

if (!db.financialYears) {
  db.financialYears = [];
}
let found2026 = db.financialYears.find((fy: any) => fy.id === "FY-2026");
if (!found2026) {
  db.financialYears.push(fy2026);
}

// Migrate settings
if (db.settings) {
  db.settings.currentFinancialYear = "2026";
}

console.log("\n--- Applying Migration ---");
processList(db.collections, 'Collections', 'collectionDate');
processList(db.admissions, 'Admissions', 'admissionDate');
processList(db.capitalDeposits, 'Capital Deposits', 'depositDate');
processList(db.incomes, 'Incomes', 'date');
processList(db.expenses, 'Expenses', 'date');
processList(db.cashTransactions, 'Cash Transactions', 'date');
processList(db.bankTransactions, 'Bank Transactions', 'date');
processList(db.journalEntries, 'Journal Entries', 'date');
processList(db.memberLedgers, 'Member Ledgers', 'date');

// Final sanity check
const finalCounts = {
  members: db.members?.length || 0,
  collections: db.collections?.length || 0,
  admissions: db.admissions?.length || 0,
  capitalDeposits: db.capitalDeposits?.length || 0,
  incomes: db.incomes?.length || 0,
  expenses: db.expenses?.length || 0,
  cashTransactions: db.cashTransactions?.length || 0,
  bankTransactions: db.bankTransactions?.length || 0,
  journalEntries: db.journalEntries?.length || 0,
  memberLedgers: db.memberLedgers?.length || 0,
};

let countsMatch = true;
for (const key in initialCounts) {
  if (initialCounts[key as keyof typeof initialCounts] !== finalCounts[key as keyof typeof finalCounts]) {
    countsMatch = false;
    console.error(`Mismatch in ${key}: ${initialCounts[key as keyof typeof initialCounts]} -> ${finalCounts[key as keyof typeof finalCounts]}`);
  }
}

if (!countsMatch) {
  console.error("MIGRATION FAILED: RECORD COUNTS DO NOT MATCH. ABORTING.");
  process.exit(1);
}

// Clean up old financial years
db.financialYears = db.financialYears.filter((fy: any) => !fy.id.includes("2026-2027"));

const newDbRaw = JSON.stringify(db, null, 2);
fs.writeFileSync(DB_FILE, newDbRaw);
console.log("\nMigration completed successfully. DB written.");
