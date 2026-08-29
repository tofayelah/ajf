import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

text = text.replace('approvalStatus: "PENDING" as "PENDING",', 'approvalStatus: "PENDING" as any,')
text = text.replace('approvalStatus: "APPROVED" as "APPROVED",', 'approvalStatus: "APPROVED" as any,')
text = text.replace('approvalStatus: "REJECTED" as "REJECTED",', 'approvalStatus: "REJECTED" as any,')

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
