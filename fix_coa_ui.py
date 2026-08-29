import re

with open('src/components/accounts/ChartOfAccountsView.tsx', 'r') as f:
    text = f.read()

text = text.replace('acc.accountNameBn', 'acc.banglaName')
text = text.replace('acc.accountNameEn', 'acc.accountName')
text = text.replace('acc.accountType', 'acc.category')
text = text.replace('acc.accountGroup', 'acc.group')

# In the filtering logic:
text = text.replace('item.accountNameBn', 'item.banglaName')
text = text.replace('item.accountNameEn', 'item.accountName')
text = text.replace('item.accountType', 'item.category')
text = text.replace('item.accountGroup', 'item.group')

# Replace the type filter values. In the select, it uses:
# <option value="ALL">সকল প্রকার (All Types)</option>
# <option value="ASSET">সম্পদ (Assets)</option>
# But category is "Asset" | "Liability" | "Member Capital" | "Income" | "Expense"
text = text.replace('value="ASSET"', 'value="Asset"')
text = text.replace('value="LIABILITY"', 'value="Liability"')
text = text.replace('value="EQUITY"', 'value="Member Capital"')
text = text.replace('value="REVENUE"', 'value="Income"')
text = text.replace('value="EXPENSE"', 'value="Expense"')

text = text.replace("item.category === typeFilter", "item.category === typeFilter")
text = text.replace("acc.category === 'ASSET'", "acc.category === 'Asset'")
text = text.replace("acc.category === 'LIABILITY'", "acc.category === 'Liability'")
text = text.replace("acc.category === 'EQUITY'", "acc.category === 'Member Capital'")
text = text.replace("acc.category === 'REVENUE'", "acc.category === 'Income'")
text = text.replace("acc.category === 'EXPENSE'", "acc.category === 'Expense'")

with open('src/components/accounts/ChartOfAccountsView.tsx', 'w') as f:
    f.write(text)
