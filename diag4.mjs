import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const cap = (db.capitalDeposits||[]).filter(c => c.memberId === 'AJM-000001');
console.log("Capital deposits AJM-000001:");
console.log(cap);

const adm = (db.admissions||[]).filter(c => c.memberId === 'AJM-000001');
console.log("Admissions AJM-000001:");
console.log(adm);

