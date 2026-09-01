import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const memberId = 'AJM-000002';
const cap = (db.capitalDeposits || []).filter(c => c.memberId === memberId);
console.log("Capital:", cap);

const adm = (db.admissions || []).filter(c => c.memberId === memberId);
console.log("Admission:", adm);

