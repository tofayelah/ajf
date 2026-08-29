const fs = require('fs');

let code = fs.readFileSync('src/components/accounts/ChartOfAccountsView.tsx', 'utf8');

const getGroupOptionsSnippet = `
const getGroupOptions = (category) => {
  switch(category) {
    case 'Asset': return ['Current Assets', 'Fixed Assets', 'Loan Receivables', 'Investment Assets'];
    case 'Liability': return ['Current Liabilities', 'Payables'];
    case 'Member Capital':
    case 'Equity': return ['Member Capital', 'Reserve Fund', 'Emergency Fund', 'Welfare Fund', 'Retained Profit'];
    case 'Income':
    case 'Revenue': return ['Membership Income', 'Service Income', 'Investment Profit', 'Other Income'];
    case 'Expense': return ['Operating Expense', 'Administrative Expense', 'Welfare Expense', 'Bank Charges', 'Other Expense'];
    default: return ['Other'];
  }
};
`;

// Insert the helper before the component
code = code.replace('export const ChartOfAccountsView', getGroupOptionsSnippet + '\nexport const ChartOfAccountsView');

// Fix handleCategoryChange
const oldHandleCategoryChange = `const handleCategoryChange = (cat: string) => {
    const category = cat as AccountCategory;
    let normalBalance: "DEBIT" | "CREDIT" = 'DEBIT';
    if (['Liability', 'Member Capital', 'Income'].includes(category)) {
      normalBalance = 'CREDIT';
    }
    setFormData({ ...formData, category, normalBalance });
  };`;

const newHandleCategoryChange = `const handleCategoryChange = (cat: string) => {
    const category = cat as AccountCategory;
    let normalBalance: "DEBIT" | "CREDIT" = 'DEBIT';
    if (['Liability', 'Member Capital', 'Income'].includes(category)) {
      normalBalance = 'CREDIT';
    }
    const groupOptions = getGroupOptions(category);
    setFormData({ ...formData, category, normalBalance, group: groupOptions[0] });
  };`;

code = code.replace(oldHandleCategoryChange, newHandleCategoryChange);

// Fix openModal to set default group if missing
const oldOpenModalEmpty = `group: '',`;
const newOpenModalEmpty = `group: 'Current Assets',`;
// Careful, replacing just "group: ''," might hit multiple places.
code = code.replace(`group: '',
        normalBalance: 'DEBIT',`, `group: 'Current Assets',
        normalBalance: 'DEBIT',`);


// Replace Group Input with Select
const oldGroupInput = `<input
                    type="text"
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Current Asset"
                  />`;

const newGroupSelect = `<select
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {getGroupOptions(formData.category || 'Asset').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>`;

code = code.replace(oldGroupInput, newGroupSelect);

fs.writeFileSync('src/components/accounts/ChartOfAccountsView.tsx', code);
