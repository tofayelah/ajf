import re

with open('src/services/accounting.ts', 'r') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if 'updatedMembers.push(newMember);' in lines[i]:
        # Need to insert updatedAt in the previous line, if it's `});`
        if '});' in lines[i-1] and 'status:' in lines[i-2]:
            lines[i-2] = lines[i-2].replace('\n', ',\n')
            lines.insert(i-1, '          updatedAt: new Date().toISOString()\n')

    if "sourceType: 'INCOME'," in lines[i] and 'description:' in lines[i-1]:
        # we need to insert journalNo before description
        lines.insert(i-1, '          journalNo: `JV-${Date.now()}`,\n')

    if "sourceType: 'EXPENSE'," in lines[i] and 'description:' in lines[i-1]:
        lines.insert(i-1, '          journalNo: `JV-${Date.now()}`,\n')

text = "".join(lines)
with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
