const fs = require('fs');

const code = fs.readFileSync('src/services/db.ts', 'utf8');

const repairFunc = `
function repairAccounts(accounts) {
  if (!accounts || !Array.isArray(accounts)) return;
  accounts.forEach(acc => {
    const code = String(acc.accountCode || acc.code || "");
    const cat = acc.category || acc.accountType || "Asset";
    
    if (!acc.normalBalance) {
      if (cat === "Asset" || cat === "Expense") {
        acc.normalBalance = "DEBIT";
      } else {
        acc.normalBalance = "CREDIT";
      }
    }
    
    if (!acc.group && !acc.accountGroup) {
       switch (code) {
         case "1000": acc.group = "Current Assets"; break;
         case "1010": acc.group = "Current Assets"; break;
         case "1020": acc.group = "Current Assets"; break;
         case "1100": acc.group = "Current Assets"; break;
         case "1200": acc.group = "Loan Receivables"; break;
         case "1210": acc.group = "Current Assets"; break;
         case "2000": acc.group = "Current Liabilities"; break;
         case "2010": acc.group = "Current Liabilities"; break;
         case "2020": acc.group = "Current Liabilities"; break;
         case "2100": acc.group = "Payables"; break;
         case "3000": acc.group = "Member Capital"; break;
         case "3001": acc.group = "Welfare Fund"; break;
         case "3002": acc.group = "Emergency Fund"; break;
         case "3003": acc.group = "Reserve Fund"; break;
         case "4000": acc.group = "Membership Income"; break;
         case "4010": acc.group = "Membership Income"; break;
         case "4020": acc.group = "Membership Income"; break;
         case "4100": acc.group = "Investment Profit"; break;
         case "4110": acc.group = "Service Income"; break;
         case "4200": acc.group = "Other Income"; break;
         case "4300": acc.group = "Other Income"; break;
         case "5000": acc.group = "Operating Expense"; break;
         case "5010": acc.group = "Administrative Expense"; break;
         case "5020": acc.group = "Operating Expense"; break;
         case "5030": acc.group = "Administrative Expense"; break;
         case "5040": acc.group = "Operating Expense"; break;
         case "5050": acc.group = "Operating Expense"; break;
         case "5100": acc.group = "Welfare Expense"; break;
         case "5110": acc.group = "Welfare Expense"; break;
         case "5200": acc.group = "Bank Charges"; break;
         case "5300": acc.group = "Other Expense"; break;
         default:
           if (cat === "Asset") acc.group = "Current Assets";
           else if (cat === "Liability") acc.group = "Current Liabilities";
           else if (cat === "Member Capital" || cat === "Equity") acc.group = "Member Capital";
           else if (cat === "Income" || cat === "Revenue") acc.group = "Other Income";
           else if (cat === "Expense") acc.group = "Other Expense";
       }
    }
  });
}
`;

let modifiedCode = code.replace(
  'export const loadDatabaseFromStorage',
  repairFunc + '\nexport const loadDatabaseFromStorage'
);

// Inject into localStorage fallback block
modifiedCode = modifiedCode.replace(
  'if (parsed && parsed.settings && parsed.members) {\n          if (parsed.investments',
  'if (parsed && parsed.settings && parsed.members) {\n          repairAccounts(parsed.accounts);\n          if (parsed.investments'
);

// Inject into localforage block
modifiedCode = modifiedCode.replace(
  'if (parsed && parsed.settings && parsed.members) {\n         if (parsed.investments',
  'if (parsed && parsed.settings && parsed.members) {\n         repairAccounts(parsed.accounts);\n         if (parsed.investments'
);

fs.writeFileSync('src/services/db.ts', modifiedCode);
console.log('db.ts patched with minimal repairAccounts!');
