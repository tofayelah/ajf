const fs = require('fs');
let coa = fs.readFileSync('src/components/accounts/ChartOfAccountsView.tsx', 'utf8');

// Remove Error Boundary and getGroupOptions
const boundaryStart = coa.indexOf('// Error Boundary');
const exportIndex = coa.indexOf('export const ChartOfAccountsView: React.FC = () => {');
const contentIndex = coa.indexOf('const ChartOfAccountsContent: React.FC = () => {');

if (boundaryStart !== -1 && contentIndex !== -1) {
  // Remove everything from // Error Boundary to the start of ChartOfAccountsContent
  const head = coa.substring(0, boundaryStart);
  
  let rest = coa.substring(contentIndex);
  // Rename ChartOfAccountsContent back to export const ChartOfAccountsView
  rest = rest.replace('const ChartOfAccountsContent: React.FC = () => {', 'export const ChartOfAccountsView: React.FC = () => {');
  
  // Revert the handleCategoryChange
  const newCatChange = `const handleCategoryChange = (cat: string) => {
    const category = cat as AccountCategory;
    let normalBalance: "DEBIT" | "CREDIT" = 'DEBIT';
    if (['Liability', 'Member Capital', 'Income'].includes(category)) {
      normalBalance = 'CREDIT';
    }
    const groupOptions = getGroupOptions(category);
    setFormData({ ...formData, category, normalBalance, group: groupOptions[0] });
  };`;
  
  const oldCatChange = `const handleCategoryChange = (cat: string) => {
    const category = cat as AccountCategory;
    let normalBalance: "DEBIT" | "CREDIT" = 'DEBIT';
    if (['Liability', 'Member Capital', 'Income'].includes(category)) {
      normalBalance = 'CREDIT';
    }
    setFormData({ ...formData, category, normalBalance });
  };`;
  
  rest = rest.replace(newCatChange, oldCatChange);
  
  // Also fix openModal empty group
  rest = rest.replace(`group: 'Current Assets',
        normalBalance: 'DEBIT',`, `group: '',
        normalBalance: 'DEBIT',`);
        
  // Also revert the group select back to text input
  const newGroupSelect = `<select
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {getGroupOptions(formData.category || 'Asset').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>`;
                  
  const oldGroupInput = `<input
                    type="text"
                    value={formData.group}
                    onChange={e => setFormData({ ...formData, group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Current Asset"
                  />`;
  
  rest = rest.replace(newGroupSelect, oldGroupInput);
  
  // If getGroupOptions calls are left over, remove them. 
  // e.g. group: getGroupOptions(category)[0] might be missed
  rest = rest.replace(/getGroupOptions\(.+?\)/g, "[]");

  fs.writeFileSync('src/components/accounts/ChartOfAccountsView.tsx', head + rest);
  console.log("ChartOfAccountsView reverted.");
}
