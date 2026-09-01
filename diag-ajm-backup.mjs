import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.backup.json', 'utf8'));

const memberId = 'AJM-000002';
const member = (db.members || []).find(m => m.memberId === memberId);

console.log("=== ADMISSIONS ===");
const admissions = (db.admissions || []).filter(a => a.memberId === memberId);
console.log(admissions);

console.log("\n=== CAPITAL DEPOSITS ===");
const capital = (db.capitalDeposits || []).filter(a => a.memberId === memberId);
console.log(capital);

console.log("\n=== INCOMES (Admission Fee etc) ===");
const incomes = (db.incomes || []).filter(a => a.memberId === memberId || String(a.remarks).includes(memberId) || (member && String(a.remarks).includes(member.fullName)));
console.log(incomes);

console.log("\n=== COLLECTIONS (Monthly Sub) ===");
const collections = (db.collections || []).filter(a => a.memberId === memberId);
console.log(collections);

console.log("\n=== CASH TRANSACTIONS ===");
const cash = (db.cashTransactions || []).filter(a => a.memberId === memberId || String(a.reference).includes(memberId) || (member && String(a.reference).includes(member.fullName)));
console.log(cash);

console.log("\n=== BANK TRANSACTIONS ===");
const bank = (db.bankTransactions || []).filter(a => a.memberId === memberId || String(a.reference).includes(memberId) || (member && String(a.reference).includes(member.fullName)));
console.log(bank);

console.log("\n=== JOURNAL ENTRIES ===");
const jnls = (db.journalEntries || []).filter(j => (j.description && (j.description.includes(memberId) || (member && j.description.includes(member.fullName)))) || (j.reference && j.reference.includes(memberId)));
console.log(jnls);

