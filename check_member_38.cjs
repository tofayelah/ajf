const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
const memberId = 'AJM-000038';

const member = db.members.find(m => m.memberId === memberId);
console.log("Member Record:", member.totalBalance, member.totalChandaPaid);

const ledgers = db.memberLedgers.filter(l => l.memberId === memberId);
console.log("Ledgers:");
ledgers.forEach(l => {
    console.log(`- ${l.date} | ${l.transactionType} | Dr:${l.debit} | Cr:${l.credit} | Bal:${l.balance} | Ref:${l.reference}`);
});

const collections = db.collections.filter(c => c.memberId === memberId);
console.log("Collections:");
collections.forEach(c => {
    console.log(`- ${c.collectionMonth} | ${c.paidAmount || c.monthlyAmount} | Status: ${c.status}`);
});
