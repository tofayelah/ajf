import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

# Fix import
if "IncomeStatus, ExpenseStatus" not in "".join(lines[10:30]):
    for i in range(len(lines)):
        if "from '../types'" in lines[i] or 'from "../types"' in lines[i]:
            lines[i] = lines[i].replace('import {', 'import { IncomeStatus, ExpenseStatus, ')
            break

for i in range(len(lines)):
    line = lines[i]
    if 'import { IncomeStatus, ExpenseStatus' in line and "'./db'" in line:
        lines[i] = line.replace('IncomeStatus, ExpenseStatus, ', '')
        
    # duplicate property
    if i in [269, 380, 2649, 4471]:
        lines[i] = re.sub(r'status:\s*\'[^\']+\',\s*', '', line)
        lines[i] = re.sub(r'status:\s*"[^"]+",\s*', '', lines[i])
        
    # Member updatedAt missing (around 145)
    if 'status: "ACTIVE"' in line and i < 155: # inside Member creation
        if 'updatedAt:' not in "".join(lines[140:155]):
            lines[i] = line.replace('status: "ACTIVE"', 'status: "ACTIVE", updatedAt: new Date().toISOString()')

    # 4 & 5 & 6. PostBankTransaction arguments
    if 'sourceId:' in line and i in [6540, 6546, 6547, 6548, 6690, 6699, 6700, 6701, 6925, 6930, 6931, 6932, 7050, 7060, 7061, 7062]:
        lines[i] = re.sub(r'sourceId:\s*[^,]+,?', '', lines[i])
    if 'sourceType:' in line and i in [6540, 6546, 6547, 6548, 6690, 6699, 6700, 6701, 6925, 6930, 6931, 6932, 7050, 7060, 7061, 7062]:
        lines[i] = re.sub(r'sourceType:\s*[^,]+,?', '', lines[i])
    if 'createdBy:' in line and i in [6540, 6546, 6547, 6548, 6690, 6699, 6700, 6701, 6925, 6930, 6931, 6932, 7050, 7060, 7061, 7062]:
        lines[i] = lines[i].replace('createdBy:', 'postedByUserId:')
        
    # 7. JournalEntry journalNo missing
    if i in [6556, 6651, 6940, 7013]:
        # we can just regex replace `status: "ACTIVE"` with `status: "ACTIVE", journalNo: \`REV-${Date.now()}\`, reference: \`REV-${Date.now()}\``
        lines[i] = line.replace('status: "ACTIVE"', 'status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`')
        
    # 8. Expense approvalStatus
    if i in [6872, 6891]:
        lines[i] = line.replace("approvalStatus: 'REVERSED'", "approvalStatus: 'REVERSED' as ExpenseStatus").replace('approvalStatus: "REVERSED"', 'approvalStatus: "REVERSED" as ExpenseStatus')
        lines[i] = line.replace("approvalStatus: 'POSTED'", "approvalStatus: 'POSTED' as ExpenseStatus").replace('approvalStatus: "POSTED"', 'approvalStatus: "POSTED" as ExpenseStatus')

with open('src/services/accounting.ts', 'w') as f:
    f.writelines(lines)
