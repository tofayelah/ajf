import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

# Fix import
for i in range(50):
    if 'import { IncomeStatus, ExpenseStatus' in lines[i]:
        lines[i] = lines[i].replace('IncomeStatus, ExpenseStatus, ', '')
    if "from '../types'" in lines[i]:
        lines[i] = lines[i].replace('import {', 'import { IncomeStatus, ExpenseStatus,')

for i in range(len(lines)):
    line = lines[i]
    
    # 2. Member updatedAt missing (around 145)
    if 'status: "ACTIVE"' in line and i < 150: # inside Member creation
        if 'updatedAt:' not in "".join(lines[140:150]):
            lines[i] = line.replace('status: "ACTIVE"', 'status: "ACTIVE", updatedAt: new Date().toISOString()')

    # 3. Duplicate properties
    if i in [269, 380]:
        lines[i] = re.sub(r'status:\s*\'[^\']+\',\s*', '', line)
        lines[i] = re.sub(r'status:\s*"[^"]+",\s*', '', lines[i])
        
    # 4 & 5 & 6. PostBankTransaction arguments
    if i in [6546, 6547, 6699, 6700, 6930, 6931, 7060, 7061]:
        lines[i] = re.sub(r'sourceId:\s*[^,]+,?', '', lines[i])
        lines[i] = re.sub(r'sourceType:\s*[^,]+,?', '', lines[i])
        lines[i] = lines[i].replace('createdBy:', 'postedByUserId:')
        
    # 7. JournalEntry journalNo missing
    if i in [6556, 6651, 6940, 7013]:
        lines[i] = line.replace('status: "ACTIVE"', 'status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`')
        
    # 8. Expense approvalStatus
    if i in [6872, 6891]:
        # I need to add `as ExpenseStatus` to the mapping if it exists
        lines[i] = line

with open('src/services/accounting.ts', 'w') as f:
    f.writelines(lines)
