import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const cols = (db.collections || []).filter(c => c.memberId === 'AJM-000001');
console.log("Cols count =", cols.length);
cols.forEach(c => console.log(c.collectionId, c.paidAmount));

const mls = (db.memberLedgers || []).filter(c => c.memberId === 'AJM-000001' && c.transactionType === 'MONTHLY_COLLECTION');
console.log("ML count =", mls.length);
mls.forEach(m => console.log(m.ledgerId, m.credit));

