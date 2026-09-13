const fs = require('fs');

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

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

console.log(JSON.stringify({ tbDebit, tbCredit, totalAssets, netProfit: totalIncome - totalExpense }));
