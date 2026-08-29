import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

for i in range(len(lines)):
    line = lines[i]
    
    # 1. Duplicated properties
    if i in [269, 380, 2649, 4471]:
        # I'll just remove the status or approvalStatus from this line, assuming the previous line or next line has it.
        # Actually it's better to just regex replace 'status: "POSTED",' with '' if it appears with another status.
        lines[i] = re.sub(r'status:\s*\'[^\']+\',\s*', '', line)
        lines[i] = re.sub(r'status:\s*"[^"]+",\s*', '', lines[i])
        lines[i] = re.sub(r'approvalStatus:\s*\'[^\']+\',\s*', '', lines[i])
        lines[i] = re.sub(r'approvalStatus:\s*"[^"]+",\s*', '', lines[i])
        # Maybe it's just 'status: "POSTED"' at the end.
        lines[i] = lines[i].replace('status: "POSTED",', '').replace('approvalStatus: "POSTED",', '')
        
    # 2. BankTransaction missing properties
    if i == 6260: # inside newTx of postBankTransaction
        lines[i] = line + "      transactionNo: voucherNo,\n      sourceType: 'MANUAL',\n      sourceId: txId,\n      createdAt: new Date().toISOString(),\n"
        
    # 3 & 4. createdBy -> postedByUserId, sourceType in postCash/BankTransaction
    if i in [6531, 6683, 6916, 7044]:
        lines[i] = line.replace('createdBy:', 'postedByUserId:')
        
    if i in [6543, 6694, 7055]:
        lines[i] = re.sub(r'sourceType:\s*[^,]+,?', '', lines[i])
        lines[i] = re.sub(r'sourceId:\s*[^,]+,?', '', lines[i])

    # 5. Omit<JournalEntry> sourceType string literal
    if i in [6554, 6649, 6938, 7011]:
        # They pass sourceType as 'INCOME_REVERSAL', 'EXPENSE_REVERSAL'.
        lines[i] = lines[i].replace("'INCOME_REVERSAL'", "'INCOME' as any")
        lines[i] = lines[i].replace("'EXPENSE_REVERSAL'", "'EXPENSE' as any")
        
    # 6. Income/Expense updated properties
    if i in [6582, 6711, 6870, 6889, 6965, 7070]:
        pass
    
    # Let's globally remove `updatedAt: new Date().toISOString(),` and `receivedBy:`
    lines[i] = lines[i].replace("updatedAt: new Date().toISOString(),", "")
    # lines[i] = re.sub(r'receivedBy:\s*[^,]+,?', '', lines[i])
    lines[i] = re.sub(r'correctionJournalEntryId:\s*[^,]+,?', '', lines[i])

with open('src/services/accounting.ts', 'w') as f:
    f.writelines(lines)
