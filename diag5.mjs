import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const cap = (db.capitalDeposits||[]).find(c => c.memberId === 'AJM-000001');
console.log("Capital:", cap);

const mls = (db.memberLedgers||[]).filter(c => c.memberId === 'AJM-000001' && c.transactionType === 'CAPITAL_DEPOSIT');
console.log("Member Ledgers for Capital:", mls);

