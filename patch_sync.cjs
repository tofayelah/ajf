const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldSyncTop = `    if (!dbExists) {
      console.log("Database not found. Allowing initial seed...");
      const stateStr = JSON.stringify(req.body);
      await fs.writeFile(DB_FILE, stateStr, "utf8");
      await migrateAdminPassword();
      return res.json({ success: true, seeded: true });
    }`;

const newSyncTop = `    if (!dbExists) {
      const isProduction = process.env.VITE_APP_MODE === "production";
      if (isProduction) {
         console.error("PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION: Cannot silently create empty production database on sync.");
         return res.status(403).json({ error: "PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION: DATABASE INITIALIZATION REQUIRED" });
      }
      console.log("Database not found. Allowing initial seed...");
      const stateStr = JSON.stringify(req.body);
      await fs.writeFile(DB_FILE, stateStr, "utf8");
      await migrateAdminPassword();
      return res.json({ success: true, seeded: true });
    }`;

content = content.replace(oldSyncTop, newSyncTop);

const oldProtectedKeys = `"admissions",
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

const newProtectedKeys = `"members",
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

content = content.replace(oldProtectedKeys, newProtectedKeys);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Updated /api/sync in server.ts');
