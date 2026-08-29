import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

text = text.replace('createdBy: params.createdBy, status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`,', 'createdBy: params.createdBy, status: "ACTIVE", /* journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`, removed duplicate */')

# Fix other TS errors
# 6559, 6654, 6943, 7016: journalNo is missing
text = re.sub(r'date: (income\.date|expense\.date),\n\s*description:', r'date: \1,\n            journalNo: `JV-${Date.now()}`,\n            description:', text)

# Fix 311, 1936: journalNo does not exist in type 'CapitalDeposit'
text = re.sub(r'status: "POSTED",\n\s*journalNo: `CD-` \+ Date\.now\(\),', 'status: "POSTED",', text)

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
