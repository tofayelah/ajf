import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# 1. Member updatedAt
text = text.replace('status: "ACTIVE" as any,', 'status: "ACTIVE" as any, updatedAt: new Date().toISOString(),')

# 2. 'as any as const' -> 'as any'
text = text.replace('as any as const', 'as any')

# 3. 'status: "ACTIVE" as any' missing journalNo
text = re.sub(r'status:\s*"ACTIVE"\s*as\s*any(?!,\s*journalNo)', 'status: "ACTIVE" as any, journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`', text)

# 4. Expense approvalStatus mapping
text = text.replace('approvalStatus: c.approvalStatus === "DRAFT"', 'approvalStatus: (c.approvalStatus === "DRAFT" ? "POSTED" : c.approvalStatus) as ExpenseStatus')

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
