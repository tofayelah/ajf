const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldProtectedKeys = `"members",
            "accounts",
            "financialYears",
            "settings",
            "admissions",
            "collections",
            "capitalDeposits",
            "loans",
            "loanRepayments",
            "investments",
            "cashTransactions",
            "bankTransactions",
            "contraTransactions",
            "incomes",
            "expenses",
            "memberLedgers",
            "welfareTransactions",
            "profitAllocations",
            "journalEntries",
            "journalLines",
            "memberExits",`;

const newProtectedKeys = `"admissions",
            "collections",
            "capitalDeposits",
            "loans",
            "loanRepayments",
            "investments",
            "cashTransactions",
            "bankTransactions",
            "contraTransactions",
            "incomes",
            "expenses",
            "memberLedgers",
            "welfareTransactions",
            "profitAllocations",
            "journalEntries",
            "journalLines",
            "memberExits",`;

content = content.replace(oldProtectedKeys, newProtectedKeys);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Reverted protectedKeys in /api/sync');
