const fs = require('fs');
let db = fs.readFileSync('src/services/db.ts', 'utf8');

// There are two places with the migration logic (fallback localStorage and indexedDB localforage)
const startMarker = `          // Migrate Chart of Accounts (Repair blank groups & normalBalance)`;
const endMarker = `            return {
              ...acc,
              group: defaultGroup,
              normalBalance: defaultBalance as "DEBIT" | "CREDIT"
            };
          });`;

let count = 0;
while (db.includes(startMarker) && db.includes(endMarker)) {
  const startIndex = db.indexOf(startMarker);
  const endIndex = db.indexOf(endMarker) + endMarker.length;
  db = db.substring(0, startIndex) + db.substring(endIndex);
  count++;
}

// Next, replace `accounts: migratedAccounts` with nothing, as they used to just fall through `...parsed`
db = db.replace(/accounts: migratedAccounts,\n\s*bankAccounts: parsed.bankAccounts/g, 'bankAccounts: parsed.bankAccounts');

fs.writeFileSync('src/services/db.ts', db);
console.log("db.ts reverted. Replaced blocks:", count);
