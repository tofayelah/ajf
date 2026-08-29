const fs = require('fs');

let text = fs.readFileSync('src/services/accounting.ts', 'utf-8');

// Fix 147
text = text.replace(/status: 'ACTIVE'\n\s*\};/, "status: 'ACTIVE',\n      updatedAt: new Date().toISOString()\n    };");

// Fix 6655, 7018
text = text.replace(/date: income\.date,\n\s*description: `Correction Reversal: \$\{income\.incomeHead\}`,\n\s*sourceType: 'INCOME',/g, "date: income.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${income.incomeHead}`,\n          sourceType: 'INCOME',");
text = text.replace(/date: expense\.date,\n\s*description: `Correction Reversal: \$\{expense\.expenseHead\}`,\n\s*sourceType: 'EXPENSE',/g, "date: expense.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${expense.expenseHead}`,\n          sourceType: 'EXPENSE',");

// Fix 6876, 6895
text = text.replace(/approvalStatus: "PENDING" as any,/g, 'approvalStatus: "PENDING" as "PENDING",');
text = text.replace(/approvalStatus: "APPROVED" as any,/g, 'approvalStatus: "APPROVED" as "APPROVED",');
text = text.replace(/approvalStatus: "REJECTED" as any,/g, 'approvalStatus: "REJECTED" as "REJECTED",');
text = text.replace(/approvalStatus: 'PENDING',/g, "approvalStatus: 'PENDING' as any,");
text = text.replace(/approvalStatus: 'APPROVED',/g, "approvalStatus: 'APPROVED' as any,");
text = text.replace(/approvalStatus: 'REJECTED',/g, "approvalStatus: 'REJECTED' as any,");
text = text.replace(/approvalStatus: "PENDING",/g, 'approvalStatus: "PENDING" as any,');
text = text.replace(/approvalStatus: "APPROVED",/g, 'approvalStatus: "APPROVED" as any,');
text = text.replace(/approvalStatus: "REJECTED",/g, 'approvalStatus: "REJECTED" as any,');

// Fix duplicate JV- lines
text = text.replace(/(journalNo: `JV-\$\{Date\.now\(\)\}`,\s*)+/g, 'journalNo: `JV-${Date.now()}`,\n          ');

fs.writeFileSync('src/services/accounting.ts', text);
