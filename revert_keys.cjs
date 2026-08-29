const fs = require('fs');
let code = fs.readFileSync('src/components/accounts/ChartOfAccountsView.tsx', 'utf8');
code = code.replace(`  console.log("ACC_KEYS_DUMP:", Object.keys(accountsArray[0] || {})); console.log("ACC_VALS_DUMP:", accountsArray[0]);\n`, '');
fs.writeFileSync('src/components/accounts/ChartOfAccountsView.tsx', code);
