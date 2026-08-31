const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add AccountingService import
if (!content.includes('import { AccountingService }')) {
  content = content.replace(
    "import bcrypt from 'bcryptjs';",
    "import bcrypt from 'bcryptjs';\nimport { AccountingService } from './src/services/accounting';"
  );
}

// 2. Protect arrays in /api/sync
const protectLogic = `
          // Protect financial and system arrays from being blindly overwritten by frontend
          const protectedKeys = [
            'admissions', 'collections', 'capitalDeposits', 'loans', 'loanRepayments',
            'investments', 'cashTransactions', 'bankTransactions', 'contraTransactions',
            'incomes', 'expenses', 'memberLedgers', 'welfareTransactions', 'profitAllocations',
            'journalEntries', 'journalLines', 'memberExits', 'auditLogs', 'cashReconciliations',
            'bankReconciliations', 'bankStatementTransactions'
          ];
          
          const dbToSave = {
            ...req.body,
            users: mergedUsers.length > 0 ? mergedUsers : currentUsers
          };
          
          for (const key of protectedKeys) {
            if (currentDb[key] !== undefined) {
              dbToSave[key] = currentDb[key];
            } else {
              dbToSave[key] = [];
            }
          }
`;
if (!content.includes('const protectedKeys = [')) {
  content = content.replace(
    /const dbToSave = \{\s*\.\.\.req\.body,\s*users: mergedUsers\.length > 0 \? mergedUsers : currentUsers\s*\};/g,
    protectLogic
  );
}

// 3. Add /api/accounting/action
const rpcEndpoint = `
// --- Canonical Server-Side Accounting RPC Engine ---
app.post('/api/accounting/action', requireAuth, async (req: any, res: any) => {
  try {
    const { action, params } = req.body;
    
    // Security and structure check
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Missing action' });
    }
    if (typeof (AccountingService as any)[action] !== 'function') {
      return res.status(400).json({ error: 'Invalid accounting action' });
    }

    // Read the authoritative production database atomically
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);

    // Provide server-side credentials
    const callerId = req.user?.userId || 'SYSTEM';
    const callerName = req.user?.username || 'SYSTEM';

    // Call the canonical posting engine on the server
    const result = (AccountingService as any)[action](db, ...params);

    if (result && result.success && result.updatedDb) {
      // Atomic commit
      await writeDbFile(result.updatedDb);
      // Remove updatedDb from response payload to save bandwidth
      const { updatedDb, ...safeResult } = result;
      res.json(safeResult);
    } else {
      res.json(result);
    }
  } catch (error: any) {
    console.error('[Accounting API Error]:', error);
    res.status(500).json({ error: error.message || 'Internal server error during accounting posting' });
  }
});
`;

if (!content.includes('/api/accounting/action')) {
  content = content.replace(
    "// --- Cash Book / Sub-Ledger Reconciliation & Diagnostic API ---",
    rpcEndpoint + "\n\n// --- Cash Book / Sub-Ledger Reconciliation & Diagnostic API ---"
  );
}

fs.writeFileSync('server.ts', content, 'utf8');
console.log('server.ts patched!');
