import fs from 'fs';

const db = JSON.parse(fs.readFileSync('database.backup.json', 'utf8'));
const memberId = 'AJM-000002';

const admission = (db.admissions || []).find(a => a.memberId === memberId);
const capital = (db.capitalDeposits || []).find(c => c.memberId === memberId);
const admissionIncome = (db.incomes || []).find(i => String(i.reference).includes(memberId) && i.incomeHead === 'Admission Fee');

console.log("=== ORIGINAL ADMISSION FOUND ===");
console.log(admission ? 'YES' : 'NO');
if (admission) console.log(admission);

console.log("\n=== CAPITAL EXISTING ===");
console.log(capital ? 'YES' : 'NO');
if (capital) console.log(capital);

console.log("\n=== ADMISSION FEE EXISTING ===");
console.log(admissionIncome ? 'YES' : 'NO');
if (admissionIncome) console.log(admissionIncome);

