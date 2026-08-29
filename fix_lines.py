import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

for i in range(len(lines)):
    # Fix import
    if i == 0 and "IncomeStatus" not in lines[i]:
        lines[i] = lines[i].replace("import {", "import { IncomeStatus, ExpenseStatus,")
    
    # 2. Member updatedAt missing (around 145)
    if 'status: "ACTIVE"' in lines[i] and i < 155:
        if 'updatedAt:' not in "".join(lines[140:155]):
            lines[i] = lines[i].replace('status: "ACTIVE"', 'status: "ACTIVE", updatedAt: new Date().toISOString()')

    # Fix postCashTransaction / postBankTransaction arguments where createdBy needs to be postedByUserId
    # And sourceType / sourceId need to be removed.
    if 'this.postCashTransaction(updatedDb, {' in lines[i] or 'this.postBankTransaction(updatedDb, {' in lines[i]:
        # The arguments are on the next few lines
        for j in range(i, i+15):
            if 'createdBy:' in lines[j]:
                lines[j] = lines[j].replace('createdBy:', 'postedByUserId:')
            if 'sourceId:' in lines[j]:
                lines[j] = re.sub(r'sourceId:\s*[^,]+,?', '', lines[j])
            if 'sourceType:' in lines[j]:
                lines[j] = re.sub(r'sourceType:\s*[^,]+,?', '', lines[j])
            if '}' in lines[j]:
                break

    # Fix JournalEntry journalNo missing
    if 'status: "ACTIVE"' in lines[i] and 'sourceType' in lines[i] and i > 6500:
        if 'journalNo:' not in lines[i]:
            lines[i] = lines[i].replace('status: "ACTIVE"', 'status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`')
            
    # Fix Expense approvalStatus (it is complaining that `approvalStatus` needs `as ExpenseStatus`)
    if 'approvalStatus: "REVERSED"' in lines[i] and 'as ExpenseStatus' not in lines[i]:
        lines[i] = lines[i].replace('approvalStatus: "REVERSED"', 'approvalStatus: "REVERSED" as ExpenseStatus')
    if "approvalStatus: 'REVERSED'" in lines[i] and 'as ExpenseStatus' not in lines[i]:
        lines[i] = lines[i].replace("approvalStatus: 'REVERSED'", "approvalStatus: 'REVERSED' as ExpenseStatus")
        
    if 'approvalStatus: "POSTED"' in lines[i] and 'as ExpenseStatus' not in lines[i]:
        lines[i] = lines[i].replace('approvalStatus: "POSTED"', 'approvalStatus: "POSTED" as ExpenseStatus')
    if "approvalStatus: 'POSTED'" in lines[i] and 'as ExpenseStatus' not in lines[i]:
        lines[i] = lines[i].replace("approvalStatus: 'POSTED'", "approvalStatus: 'POSTED' as ExpenseStatus")

with open('src/services/accounting.ts', 'w') as f:
    f.writelines(lines)
