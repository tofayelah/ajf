import fs from 'fs';

const filePath = 'src/services/accounting.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("applicationDate: joiningDate,", "applicationDate: transactionDate,");
content = content.replace("approvalDate: joiningDate,", "approvalDate: transactionDate,");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated accounting.ts applicationDate");
