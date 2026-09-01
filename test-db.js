const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
console.log("Member 0:", JSON.stringify(db.members[0], null, 2));
console.log("Admissions:", db.admissions.length, db.admissions[0]);
console.log("CapitalDeposits:", db.capitalDeposits.length, db.capitalDeposits[0]);
console.log("MemberLedger 0:", JSON.stringify(db.memberLedgers[0], null, 2));
