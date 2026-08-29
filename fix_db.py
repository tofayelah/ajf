import re

with open('src/services/db.ts', 'r') as f:
    text = f.read()

# First, find the DEFAULT_ACCOUNTS array and replace it
def get_group(code):
    if code in ['1000', '1010', '1020', '1100']: return 'Current Asset'
    if code in ['1200', '1300']: return 'Non-Current Asset'
    if code in ['2000', '2100']: return 'Current Liability'
    if code in ['3000', '3100', '3200', '3300']: return 'Equity'
    if code.startswith('4'): return 'Revenue'
    if code.startswith('5'): return 'Operating Expense'
    return 'Other'

def get_normal_balance(code):
    if code.startswith('1') or code.startswith('5'): return '"DEBIT"'
    return '"CREDIT"'

lines = text.split('\n')
inside_default = False
for i in range(len(lines)):
    line = lines[i]
    if 'export const DEFAULT_ACCOUNTS: ChartAccount[] =' in line:
        inside_default = True
    
    if inside_default and 'accountCode:' in line:
        # Extract code
        m = re.search(r'accountCode:\s*"(\d+)"', line)
        if m:
            code = m.group(1)
            # Find the insertion point, which is after `category: "...",`
            for j in range(i, i+5):
                if 'category:' in lines[j]:
                    group = get_group(code)
                    nb = get_normal_balance(code)
                    lines[j] = lines[j] + f'\n    group: "{group}",\n    normalBalance: {nb},'
                    break

text = '\n'.join(lines)

with open('src/services/db.ts', 'w') as f:
    f.write(text)

