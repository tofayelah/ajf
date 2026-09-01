import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

console.log("admissions length:", db.admissions?.length);
console.log("capitalDeposits length:", db.capitalDeposits?.length);
console.log("Incomes with admission:", db.incomes?.filter(i => i.incomeHead?.toLowerCase().includes('admission') || i.remarks?.toLowerCase().includes('ভর্তি')));
console.log("Incomes with capital:", db.incomes?.filter(i => i.incomeHead?.toLowerCase().includes('capital') || i.remarks?.toLowerCase().includes('মূলধন')));
console.log("MemberLedger with admission:", db.memberLedgers?.filter(ml => ml.transactionType === 'ADMISSION' || ml.transactionType === 'CAPITAL_DEPOSIT'));
