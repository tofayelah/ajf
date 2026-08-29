import fs from 'fs';

const filePath = 'src/services/accounting.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace joiningDate default
const oldJoiningDateDef = "const joiningDate = params.memberData.joiningDate || new Date().toISOString().split('T')[0];";
const newJoiningDateDef = "const transactionDate = new Date().toISOString().split('T')[0];\n    const joiningDate = params.memberData.joiningDate || '2026-06-01';";
content = content.replace(oldJoiningDateDef, newJoiningDateDef);

// Replace joiningDate -> transactionDate where used for transactions
content = content.replace(/date: joiningDate/g, "date: transactionDate");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated accounting.ts");
