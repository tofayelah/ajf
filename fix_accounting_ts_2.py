import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# Fix 147: member missing updatedAt
text = re.sub(r'(status: "ACTIVE"\n\s+)(\});\n\s+updatedMembers\.push\(newMember\);', r'\1, updatedAt: new Date().toISOString()\n\2;\n        updatedMembers.push(newMember);', text)

# Fix 6655, 7018
text = re.sub(r'date: (income\.date|expense\.date),\n\s*description:', r'date: \1,\n            journalNo: `JV-${Date.now()}`,\n            description:', text)

# Fix 6876, 6895
text = text.replace('approvalStatus: "PENDING",', 'approvalStatus: "PENDING" as ExpenseStatus,')
text = text.replace('approvalStatus: "APPROVED",', 'approvalStatus: "APPROVED" as ExpenseStatus,')
text = text.replace('approvalStatus: "REJECTED",', 'approvalStatus: "REJECTED" as ExpenseStatus,')

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
