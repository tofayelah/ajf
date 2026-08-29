import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# Fix import
if "IncomeStatus, ExpenseStatus" not in text[:1000]:
    text = text.replace("import {", "import { IncomeStatus, ExpenseStatus,", 1)

# Fix missing journalNo
text = text.replace('status: "ACTIVE"', 'status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`')
# but wait, some `status: "ACTIVE"` might be already changed, let's reset them first to avoid duplicating `journalNo`
text = re.sub(r'status:\s*"ACTIVE",\s*journalNo:[^,]+,\s*reference:[^,}]+', 'status: "ACTIVE"', text)
text = text.replace('status: "ACTIVE"', 'status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`')

# Fix Expense approvalStatus (it is complaining that `approvalStatus` needs `as ExpenseStatus`)
text = text.replace("approvalStatus: 'REVERSED'", "approvalStatus: 'REVERSED' as ExpenseStatus")
text = text.replace("approvalStatus: 'POSTED'", "approvalStatus: 'POSTED' as ExpenseStatus")
text = text.replace('approvalStatus: "REVERSED"', 'approvalStatus: "REVERSED" as ExpenseStatus')
text = text.replace('approvalStatus: "POSTED"', 'approvalStatus: "POSTED" as ExpenseStatus')

# Fix the duplicate `as ExpenseStatus as ExpenseStatus`
text = text.replace('as ExpenseStatus as ExpenseStatus', 'as ExpenseStatus')

# Same for IncomeStatus
text = text.replace('as IncomeStatus as IncomeStatus', 'as IncomeStatus')

# 6934: createdBy does not exist in type
# It's line 6934 roughly. We can just replace `createdBy: userId` with `postedByUserId: userId`
text = text.replace('createdBy: ', 'postedByUserId: ')
# We might accidentally break JournalEntry if it uses createdBy.
# Actually JournalEntry uses `createdBy: userId`! So I should only change it inside postBankTransaction/postCashTransaction.
# Let's fix that specific createdBy that was missed: "const cashRes = this.postCashTransaction" block.
