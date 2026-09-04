import fs from 'fs';

const dbRaw = fs.readFileSync('database.json', 'utf8');
const db = JSON.parse(dbRaw);

console.log("=== DB EXPENSES LENGTH ===");
console.log(db.expenses ? db.expenses.length : 0);

if (db.expenses && db.expenses.length > 0) {
    const lastExp = db.expenses[db.expenses.length - 1];
    console.log(JSON.stringify(lastExp, null, 2));
}

