const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('server.ts', 'utf8');

const newWriteDbFile = `async function writeDbFile(db, options = {}) {
  const isProduction = process.env.VITE_APP_MODE === "production";
  
  if (isProduction && !options.skipSafetyCheck) {
    try {
      const existingData = await fs.readFile(DB_FILE, "utf8");
      const currentDb = JSON.parse(existingData);
      
      const checkShrink = (key) => {
        const curr = Array.isArray(currentDb[key]) ? currentDb[key].length : 0;
        const next = Array.isArray(db[key]) ? db[key].length : 0;
        if (curr > 0 && next === 0) {
          throw new Error(\`CRITICAL DATA LOSS WARNING: Protected array '\${key}' shrank from \${curr} to 0.\`);
        }
        if (curr > 10 && next < curr * 0.5) {
          throw new Error(\`CRITICAL DATA LOSS WARNING: Protected array '\${key}' shrank suspiciously from \${curr} to \${next}.\`);
        }
      };

      const protectedArrays = [
        "members", "admissions", "capitalDeposits", "collections", 
        "incomes", "expenses", "cashTransactions", "bankTransactions", 
        "journalEntries", "journalLines", "memberLedgers", "accounts", 
        "users", "financialYears"
      ];

      for (const key of protectedArrays) {
        checkShrink(key);
      }
    } catch (e) {
      if (e.message.startsWith("CRITICAL DATA LOSS WARNING")) {
        console.error("PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION:", e.message);
        throw new Error("PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION: " + e.message);
      }
    }
  }

  const tempFile = \`\${DB_FILE}.tmp.\${Date.now()}.\${Math.random().toString(36).slice(2)}\`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempFile, DB_FILE);
}`;

let updated = content.replace(
/async function writeDbFile\(db\) \{\s*const tempFile = [^\n]+\n\s*await fs\.writeFile\([^\n]+\n\s*await fs\.rename\([^\n]+\n\}/m,
newWriteDbFile
);

if (updated !== content) {
    fs.writeFileSync('server.ts', updated, 'utf8');
    console.log('Updated writeDbFile in server.ts');
} else {
    console.log('Could not find writeDbFile in server.ts to replace');
}
