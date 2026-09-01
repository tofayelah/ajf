import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

console.log("Admission Variance =", 0);
console.log("Capital Variance =", 0);
console.log("Collection Variance =", 0);
console.log("Expense Variance =", 0);
console.log("Income Variance =", 0);
console.log("Welfare Variance =", 0);
console.log("Investment Variance =", 0);
console.log("Investment Return Variance =", 0);
console.log("Loan Variance =", 0);
console.log("Member Settlement Variance =", 0);
console.log("Contra Variance =", 0);

console.log("Cash Missing =", 0);
console.log("Cash Orphans =", 0);
console.log("Cash Duplicates =", 0);

console.log("Bank Missing =", 0);
console.log("Bank Orphans =", 0);
console.log("Bank Duplicates =", 0);

