import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.backup.json', 'utf8'));

const ledgers = (db.memberLedgers || []).filter(l => l.memberId === 'AJM-000002');
console.log(ledgers);
