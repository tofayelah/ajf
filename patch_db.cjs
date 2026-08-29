const fs = require('fs');

let dbCode = fs.readFileSync('src/services/db.ts', 'utf8');

// Replace DEFAULT_ACCOUNTS
const defaultAccountsStr = `export const DEFAULT_ACCOUNTS: ChartAccount[] = [
  { accountCode: "1000", accountName: "Cash in Hand", banglaName: "হাতে নগদ", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1010", accountName: "Bank Account (Sonali Bank)", banglaName: "ব্যাংক হিসাব (সোনালী ব্যাংক)", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1020", accountName: "Mobile Banking (bKash/Nagad)", banglaName: "মোবাইল ব্যাংকিং (বিকাশ/নগদ)", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1100", accountName: "Member Receivable (Due)", banglaName: "সদস্যদের বকেয়া চাঁদা", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1200", accountName: "Loan Receivable", banglaName: "প্রদত্ত ঋণ হিসাব", category: "Asset", group: "Loan Receivables", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1210", accountName: "Other Advances", banglaName: "অন্যান্য অগ্রীম", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "2000", accountName: "Savings Deposit (General)", banglaName: "সাধারণ সঞ্চয় আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2010", accountName: "DPS Deposit", banglaName: "ডিপিএস আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2020", accountName: "FDR Deposit", banglaName: "এফডিআর আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2100", accountName: "Accounts Payable", banglaName: "প্রদেয় হিসাব", category: "Liability", group: "Payables", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3000", accountName: "Member Capital (Share)", banglaName: "সদস্য শেয়ার মূলধন", category: "Member Capital", group: "Member Capital", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3001", accountName: "Welfare Fund", banglaName: "কল্যাণ তহবিল", category: "Member Capital", group: "Welfare Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3002", accountName: "Emergency Fund", banglaName: "জরুরী তহবিল", category: "Member Capital", group: "Emergency Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3003", accountName: "Reserve Fund", banglaName: "সংরক্ষিত তহবিল", category: "Member Capital", group: "Reserve Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4000", accountName: "Admission Fee", banglaName: "ভর্তি ফি", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4010", accountName: "Form Fee", banglaName: "ফরম ফি", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4020", accountName: "Monthly Subscription", banglaName: "মাসিক চাঁদা", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4100", accountName: "Investment Profit/Interest", banglaName: "বিনিয়োগ হতে মুনাফা", category: "Income", group: "Investment Profit", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4110", accountName: "Service Charge Income", banglaName: "সার্ভিস চার্জ আয়", category: "Income", group: "Service Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4200", accountName: "Donation/Grants", banglaName: "অনুদান প্রাপ্তি", category: "Income", group: "Other Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4300", accountName: "Other Income", banglaName: "অন্যান্য আয়", category: "Income", group: "Other Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "5000", accountName: "Office Rent", banglaName: "অফিস ভাড়া", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5010", accountName: "Salary & Allowance", banglaName: "বেতন ও ভাতা", category: "Expense", group: "Administrative Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5020", accountName: "Entertainment", banglaName: "আপ্যায়ন খরচ", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5030", accountName: "Stationery & Printing", banglaName: "মনিহারি ও ছাপানো", category: "Expense", group: "Administrative Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5040", accountName: "Electricity Bill", banglaName: "বিদ্যুৎ বিল", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5050", accountName: "Mobile & Internet Bill", banglaName: "মোবাইল ও ইন্টারনেট বিল", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5100", accountName: "Welfare Expense (Members)", banglaName: "সদস্য কল্যাণ ব্যয়", category: "Expense", group: "Welfare Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5110", accountName: "Social Work/Donation", banglaName: "সামাজিক কাজ ও অনুদান", category: "Expense", group: "Welfare Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5200", accountName: "Bank Charges & Excise Duty", banglaName: "ব্যাংক চার্জ ও আবগারি শুল্ক", category: "Expense", group: "Bank Charges", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5300", accountName: "Miscellaneous Expense", banglaName: "বিবিধ খরচ", category: "Expense", group: "Other Expense", normalBalance: "DEBIT", isActive: true, isSystem: true }
];`;

let startIdx = dbCode.indexOf('export const DEFAULT_ACCOUNTS: ChartAccount[] = [');
let endIdx = dbCode.indexOf('export const DEFAULT_BANK_ACCOUNTS');
if (startIdx > -1 && endIdx > -1) {
  dbCode = dbCode.substring(0, startIdx) + defaultAccountsStr + '\n\n' + dbCode.substring(endIdx);
}

// Add migration logic
const migrationLogic = `
          // Migrate Chart of Accounts (Repair blank groups & normalBalance)
          const migratedAccounts = (parsed.accounts || []).map(acc => {
            const code = String(acc.accountCode || acc.code || "");
            const category = acc.category || acc.accountType || "Asset";
            let defaultGroup = acc.group || acc.accountGroup || "";
            let defaultBalance = acc.normalBalance || "";
            
            if (!defaultGroup || !defaultBalance) {
               switch (code) {
                 case "1000": defaultGroup = "Current Assets"; defaultBalance = "DEBIT"; break;
                 case "1010": defaultGroup = "Current Assets"; defaultBalance = "DEBIT"; break;
                 case "1020": defaultGroup = "Current Assets"; defaultBalance = "DEBIT"; break;
                 case "1100": defaultGroup = "Current Assets"; defaultBalance = "DEBIT"; break;
                 case "1200": defaultGroup = "Loan Receivables"; defaultBalance = "DEBIT"; break;
                 case "1210": defaultGroup = "Current Assets"; defaultBalance = "DEBIT"; break;
                 case "2000": defaultGroup = "Current Liabilities"; defaultBalance = "CREDIT"; break;
                 case "2010": defaultGroup = "Current Liabilities"; defaultBalance = "CREDIT"; break;
                 case "2020": defaultGroup = "Current Liabilities"; defaultBalance = "CREDIT"; break;
                 case "2100": defaultGroup = "Payables"; defaultBalance = "CREDIT"; break;
                 case "3000": defaultGroup = "Member Capital"; defaultBalance = "CREDIT"; break;
                 case "3001": defaultGroup = "Welfare Fund"; defaultBalance = "CREDIT"; break;
                 case "3002": defaultGroup = "Emergency Fund"; defaultBalance = "CREDIT"; break;
                 case "3003": defaultGroup = "Reserve Fund"; defaultBalance = "CREDIT"; break;
                 case "4000": defaultGroup = "Membership Income"; defaultBalance = "CREDIT"; break;
                 case "4010": defaultGroup = "Membership Income"; defaultBalance = "CREDIT"; break;
                 case "4020": defaultGroup = "Membership Income"; defaultBalance = "CREDIT"; break;
                 case "4100": defaultGroup = "Investment Profit"; defaultBalance = "CREDIT"; break;
                 case "4110": defaultGroup = "Service Income"; defaultBalance = "CREDIT"; break;
                 case "4200": defaultGroup = "Other Income"; defaultBalance = "CREDIT"; break;
                 case "4300": defaultGroup = "Other Income"; defaultBalance = "CREDIT"; break;
                 case "5000": defaultGroup = "Operating Expense"; defaultBalance = "DEBIT"; break;
                 case "5010": defaultGroup = "Administrative Expense"; defaultBalance = "DEBIT"; break;
                 case "5020": defaultGroup = "Operating Expense"; defaultBalance = "DEBIT"; break;
                 case "5030": defaultGroup = "Administrative Expense"; defaultBalance = "DEBIT"; break;
                 case "5040": defaultGroup = "Operating Expense"; defaultBalance = "DEBIT"; break;
                 case "5050": defaultGroup = "Operating Expense"; defaultBalance = "DEBIT"; break;
                 case "5100": defaultGroup = "Welfare Expense"; defaultBalance = "DEBIT"; break;
                 case "5110": defaultGroup = "Welfare Expense"; defaultBalance = "DEBIT"; break;
                 case "5200": defaultGroup = "Bank Charges"; defaultBalance = "DEBIT"; break;
                 case "5300": defaultGroup = "Other Expense"; defaultBalance = "DEBIT"; break;
                 default:
                   if (category === "Asset" || category === "Expense") defaultBalance = "DEBIT";
                   else defaultBalance = "CREDIT";
                   
                   if (!defaultGroup) {
                     if (category === "Asset") defaultGroup = "Current Assets";
                     if (category === "Liability") defaultGroup = "Current Liabilities";
                     if (category === "Member Capital" || category === "Equity") defaultGroup = "Member Capital";
                     if (category === "Income" || category === "Revenue") defaultGroup = "Other Income";
                     if (category === "Expense") defaultGroup = "Other Expense";
                   }
               }
            }
            
            return {
              ...acc,
              group: defaultGroup,
              normalBalance: defaultBalance
            };
          });`;

const searchStr = `const migratedContraList = contraList.map((ct: any) => {`;
if (dbCode.includes(searchStr)) {
  // We have two places where this happens (localStorage fallback and localforage)
  // Let's just do a global replace
  dbCode = dbCode.replace(new RegExp('const migratedContraList = contraList.map', 'g'), migrationLogic + '\n          const migratedContraList = contraList.map');
  
  dbCode = dbCode.replace(new RegExp('bankAccounts: parsed.bankAccounts', 'g'), 'accounts: migratedAccounts,\n            bankAccounts: parsed.bankAccounts');
}

fs.writeFileSync('src/services/db.ts', dbCode);
