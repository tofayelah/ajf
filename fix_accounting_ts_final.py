import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# Fix 147: member missing updatedAt
text = text.replace('status: "ACTIVE"\n        });\n        updatedMembers.push(newMember);', 'status: "ACTIVE",\n          updatedAt: new Date().toISOString()\n        });\n        updatedMembers.push(newMember);')

# Fix 6655, 7018: JournalEntry missing journalNo
text = text.replace("date: income.date,\n          description: `Correction Reversal: ${income.incomeHead}`,\n          sourceType: 'INCOME',", "date: income.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${income.incomeHead}`,\n          sourceType: 'INCOME',")
text = text.replace("date: expense.date,\n          description: `Correction Reversal: ${expense.expenseHead}`,\n          sourceType: 'EXPENSE',", "date: expense.date,\n          journalNo: `JV-${Date.now()}`,\n          description: `Correction Reversal: ${expense.expenseHead}`,\n          sourceType: 'EXPENSE',")

# Fix 6876, 6895: ExpenseStatus issue
text = text.replace('approvalStatus: "PENDING" as any,', 'approvalStatus: "PENDING" as "PENDING",')
text = text.replace('approvalStatus: "APPROVED" as any,', 'approvalStatus: "APPROVED" as "APPROVED",')
text = text.replace('approvalStatus: "REJECTED" as any,', 'approvalStatus: "REJECTED" as "REJECTED",')
text = text.replace('approvalStatus: "PENDING",', 'approvalStatus: "PENDING" as "PENDING",')
text = text.replace('approvalStatus: "APPROVED",', 'approvalStatus: "APPROVED" as "APPROVED",')
text = text.replace('approvalStatus: "REJECTED",', 'approvalStatus: "REJECTED" as "REJECTED",')

# Fix duplicate journalNo lines just in case
text = re.sub(r'(journalNo: `JV-\$\{Date\.now\(\)\}`,\s*)+', r'journalNo: `JV-${Date.now()}`,\n          ', text)

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
