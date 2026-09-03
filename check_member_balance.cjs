const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
const memberId = 'AJM-000038';

const collections = db.collections.filter(c => c.memberId === memberId && c.status === 'ACTIVE');
const totalPaid = collections.reduce((sum, c) => sum + c.paidAmount, 0);

const ledgers = db.memberLedgers.filter(l => l.memberId === memberId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
const lastLedger = ledgers[ledgers.length - 1];

console.log(`Total Chanda Paid (from collections): ${totalPaid}`);
console.log(`Current Member Balance (from ledger): ${lastLedger ? lastLedger.balance : 0}`);

// Calculate total expected due for this member based on admission date. 
// Admission date was 2026-09-01, but they paid for 2026-06, 07, 08?
// Let's just report the computed paid amount and the final balance.

