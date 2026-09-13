const fs = require('fs');
const crypto = require('crypto');

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

// Step 1: Manage Financial Years
const targetFyId = 'FY-2026';
if (!db.financialYears) db.financialYears = [];

// Make old FY inactive
db.financialYears.forEach(fy => {
  if (fy.status === 'ACTIVE') {
    fy.status = 'INACTIVE';
  }
});

// Check if FY-2026 exists
let targetFy = db.financialYears.find(fy => fy.id === targetFyId);
if (!targetFy) {
  targetFy = {
    id: targetFyId,
    yearCode: '2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    openingBalances: {
      cash: 0, bank: 0, memberCapital: 0, loanReceivable: 0, investment: 0,
      welfareFund: 0, emergencyFund: 0, reserveFund: 0, retainedProfit: 0
    },
    openedAt: new Date().toISOString(),
    openedBy: 'SYSTEM',
    createdAt: new Date().toISOString(),
    createdBy: 'SYSTEM',
    remarks: 'Calendar Year Policy Migration'
  };
  db.financialYears.push(targetFy);
} else {
  targetFy.status = 'ACTIVE';
}

// Step 2: Remap records
let remappedCount = 0;
let examinedCount = 0;
const countsByYear = { 'FY-2026': 0, 'FY-2027': 0, 'FY-2028': 0 };

const cols = [
  'collections', 'admissions', 'capitalDeposits', 'incomes', 'expenses',
  'cashTransactions', 'bankTransactions', 'journalEntries', 'memberLedgers'
];

cols.forEach(col => {
  (db[col] || []).forEach(record => {
    examinedCount++;
    let d = record.date || record.collectionDate || record.transactionDate || record.approvalDate || record.depositDate;
    if (d) {
      const year = new Date(d).getFullYear();
      if (year >= 2026 && year <= 2028) {
         const newFyId = `FY-${year}`;
         if (record.financialYearId !== newFyId) {
            record.financialYearId = newFyId;
            remappedCount++;
         }
         countsByYear[newFyId] = (countsByYear[newFyId] || 0) + 1;
      }
    }
  });
});

// Calculate integrity baseline
let tbDebit = 0;
let tbCredit = 0;
(db.journalLines || []).forEach(l => {
  tbDebit += (l.debit || 0);
  tbCredit += (l.credit || 0);
});

let totalIncome = 0;
let totalExpense = 0;
(db.incomes || []).filter(i => i.status !== 'REVERSED').forEach(i => totalIncome += (i.amount || 0));
(db.expenses || []).filter(e => e.status !== 'REVERSED').forEach(e => totalExpense += (e.amount || 0));

let cashBal = 0;
let bankBal = 0;
(db.cashTransactions || []).filter(c => c.status !== 'REVERSED').forEach(c => cashBal += ((c.cashIn || 0) - (c.cashOut || 0)));
(db.bankTransactions || []).filter(b => b.status !== 'REVERSED').forEach(b => bankBal += ((b.deposit || 0) - (b.withdrawal || 0)));

let totalInvestment = 0;
(db.investments || []).forEach(inv => totalInvestment += (inv.investedAmount || 0));

let outstandingLoan = 0;
(db.loans || []).filter(l => l.status === 'ACTIVE').forEach(l => outstandingLoan += (l.totalOutstanding || 0));

const totalAssets = cashBal + bankBal + totalInvestment + outstandingLoan;

const newDbRaw = JSON.stringify(db, null, 2);
fs.writeFileSync('database_migrated.json', newDbRaw);

const preHash = crypto.createHash('sha256').update(dbRaw).digest('hex');
const postHash = crypto.createHash('sha256').update(newDbRaw).digest('hex');

console.log(JSON.stringify({
  examinedCount,
  remappedCount,
  countsByYear,
  tbDebit,
  tbCredit,
  totalAssets,
  netProfit: totalIncome - totalExpense,
  preHash,
  postHash
}));
