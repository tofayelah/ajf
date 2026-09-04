const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const newWriteDbFile = `async function writeDbFile(db, options = {}) {
  const isProduction = process.env.VITE_APP_MODE === "production";
  
  // Centralized safety layer for production writes
  if (isProduction) {
    try {
      if (fsSync.existsSync(DB_FILE)) {
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

        // Strict authorization and validation for special operations
        if (options.operation === "FACTORY_RESET") {
          if (options.confirmationPhrase !== "FACTORY RESET AJF PRODUCTION DATA") {
             throw new Error("Missing or invalid factory reset confirmation phrase in write protection layer.");
          }
          // Allow shrink for factory reset
        } else if (options.operation === "RESTORE") {
          if (options.confirmationPhrase !== "RESTORE AJF DATABASE") {
             throw new Error("Missing or invalid restore confirmation phrase in write protection layer.");
          }
          // For restores, we must ensure we aren't restoring an empty database over a populated one
          const currMembers = Array.isArray(currentDb.members) ? currentDb.members.length : 0;
          const nextMembers = Array.isArray(db.members) ? db.members.length : 0;
          if (currMembers > 0 && nextMembers === 0) {
             throw new Error("RESTORE BLOCKED — POTENTIAL PRODUCTION DATA LOSS: Backup contains Members = 0");
          }
          const currCollections = Array.isArray(currentDb.collections) ? currentDb.collections.length : 0;
          const nextCollections = Array.isArray(db.collections) ? db.collections.length : 0;
          if (currCollections > 0 && nextCollections === 0) {
             throw new Error("RESTORE BLOCKED — POTENTIAL PRODUCTION DATA LOSS: Backup contains Collections = 0");
          }
          const currJournals = Array.isArray(currentDb.journalEntries) ? currentDb.journalEntries.length : 0;
          const nextJournals = Array.isArray(db.journalEntries) ? db.journalEntries.length : 0;
          if (currJournals > 0 && nextJournals === 0) {
             throw new Error("RESTORE BLOCKED — POTENTIAL PRODUCTION DATA LOSS: Backup contains Journal Entries = 0");
          }
          
          // Custom shrink check for restores (maybe they restored a slightly older backup, which is fine, 
          // but if it shrinks by > 50% we should probably block unless overridden, but prompt says:
          // "If the backup contains Members = 0 ... BLOCK RESTORE by default. ... An intentionally empty database restore must require a separate, explicit administrative recovery workflow")
          // We will allow shrink for RESTORE if it's not 0, because restore implies reverting to past state.
        } else {
          // Standard operation - enforce shrink protection
          for (const key of protectedArrays) {
            checkShrink(key);
          }
        }
      }
    } catch (e) {
      if (e.message.includes("CRITICAL DATA LOSS WARNING") || e.message.includes("RESTORE BLOCKED") || e.message.includes("Missing or invalid")) {
        console.error("PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION:", e.message);
        throw new Error("PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION: " + e.message);
      }
      // If DB file doesn't exist or is invalid, we allow writing
    }
  }

  // Atomic write using temp file and rename
  const tempFile = \`\${DB_FILE}.tmp.\${Date.now()}.\${Math.random().toString(36).slice(2)}\`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempFile, DB_FILE);
}`;

content = content.replace(/async function writeDbFile\(db, options = \{\}\) \{[\s\S]*?await fs\.rename\(tempFile, DB_FILE\);\n\}/, newWriteDbFile);

// Now patch handleFactoryResetExecute
content = content.replace(
  `await writeDbFile(cleanDb, { skipSafetyCheck: true });`, 
  `await writeDbFile(cleanDb, { operation: "FACTORY_RESET", confirmationPhrase: req.body?.confirmationPhrase });`
);

// Now patch handleRestoreExecute to use writeDbFile
content = content.replace(
  `const newDataStr = JSON.stringify(cleanRestoredDb, null, 2);\n    await fs.writeFile(DB_FILE, newDataStr, 'utf8');`,
  `await writeDbFile(cleanRestoredDb, { operation: "RESTORE", confirmationPhrase: req.body?.confirmationPhrase });`
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Patched writeDbFile and callers');
