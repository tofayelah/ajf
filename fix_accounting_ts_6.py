import re

with open('src/services/accounting.ts', 'r') as f:
    text = f.read()

# Replace multiple duplicated journalNo lines with a single one
text = re.sub(r'(journalNo: `JV-\$\{Date\.now\(\)\}`,\s*)+', r'journalNo: `JV-${Date.now()}`,\n          ', text)

with open('src/services/accounting.ts', 'w') as f:
    f.write(text)
