import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

def fix_line(i, line):
    # 1. "POSTED" not assignable to "ACTIVE" | "REVERSED"
    if i in [308, 1933, 4216, 4312, 4417]:
        line = line.replace('"POSTED"', '"ACTIVE"').replace("'POSTED'", "'ACTIVE'")
        
    # 2. multiple properties with the same name (status)
    if i in [269, 380, 4471]:
        # Usually duplicated status: 'POSTED' or status: 'ACTIVE'
        # I'll just rely on regex to remove the second occurrence or something. But let's just do it manually if it's too hard.
        pass

    # 3. status -> approvalStatus for Expense
    if i == 2649:
        line = line.replace('status:', 'approvalStatus:')

    # 4. BankTransaction status
    if i == 6271:
        line = re.sub(r'status:\s*[^,]+,?', '', line)

    # 5. updatedAt in Income/Expense
    if i in [6484, 6835]:
        line = re.sub(r'updatedAt:\s*[^,]+,?', '', line)

    # 6. sourceType, sourceId in postCashTransaction / postBankTransaction
    if i in [6529, 6681, 6914, 7042]:
        line = re.sub(r'sourceType:\s*[^,]+,?', '', line)
    if i in [6530, 6682, 6915, 7043]:
        line = re.sub(r'sourceId:\s*[^,]+,?', '', line)

    # 7. DEPOSIT -> IN, WITHDRAWAL -> OUT
    if i in [6542, 6927, 7054]:
        line = line.replace("'DEPOSIT'", "'IN'").replace('"DEPOSIT"', '"IN"')
    if i in [6693]:
        line = line.replace("'WITHDRAWAL'", "'OUT'").replace('"WITHDRAWAL"', '"OUT"')

    # 8. postedByUserName in postJournalEntry
    if i in [6561, 6656, 6945, 7018]:
        line = re.sub(r'postedByUserName:\s*[^,]+,?', '', line)

    # 9. updatedDb from postJournalEntry
    if i in [6579, 6673, 6963, 7035]:
        line = line.replace('updatedDb = jResult.updatedDb!;', '')

    # 10. IncomeStatus / ExpenseStatus
    if i in [6582, 6705]:
        line = line.replace('as IncomeStatus', '')
    if i in [6866, 6885, 6965, 7066]:
        line = line.replace('as ExpenseStatus', '')

    return line

for i in range(len(lines)):
    lines[i] = fix_line(i, lines[i])

with open('src/services/accounting.ts', 'w') as f:
    f.writelines(lines)
