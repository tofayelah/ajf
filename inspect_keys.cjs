const fs = require('fs');
let code = fs.readFileSync('src/components/accounts/ChartOfAccountsView.tsx', 'utf8');
const hookStart = "const filteredCOA = useMemo(() => {";
const injectedLog = `  console.log("ACC_KEYS_DUMP:", Object.keys(accountsArray[0] || {})); console.log("ACC_VALS_DUMP:", accountsArray[0]);\n`;
code = code.replace(hookStart, injectedLog + hookStart);
fs.writeFileSync('src/components/accounts/ChartOfAccountsView.tsx', code);
