import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# Fix 147
text = text.replace('status: "ACTIVE"\n        });\n        updatedMembers.push(newMember);', 'status: "ACTIVE",\n          updatedAt: new Date().toISOString()\n        });\n        updatedMembers.push(newMember);')

# Fix 6655
text = text.replace('date: income.date,\n          description: `Correction Reversal: ${income.incomeHead}`,\n          sourceType: \'INCOME\',', 'date: income.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${income.incomeHead}`,\n          sourceType: \'INCOME\',')

# Fix 7018
text = text.replace('date: expense.date,\n          description: `Correction Reversal: ${expense.expenseHead}`,\n          sourceType: \'EXPENSE\',', 'date: expense.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${expense.expenseHead}`,\n          sourceType: \'EXPENSE\',')

# Fix 6876
text = text.replace('approvalStatus: "PENDING",', 'approvalStatus: "PENDING" as "PENDING",')
text = text.replace('approvalStatus: "APPROVED",', 'approvalStatus: "APPROVED" as "APPROVED",')
text = text.replace('approvalStatus: "REJECTED",', 'approvalStatus: "REJECTED" as "REJECTED",')

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
