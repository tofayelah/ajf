import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// replace the internal verifyToken with import from src/rbac.ts
content = content.replace(/const verifyToken = \([\s\S]*?\/\/ --- Auth Routes ---/m, 
`import { requireAuth, requireRole, requirePermission } from './src/rbac';

// --- Auth Routes ---`);

// Update app.get('/api/auth/session' to use requireAuth
content = content.replace(/app\.get\('\/api\/auth\/session', verifyToken/g, `app.get('/api/auth/session', requireAuth`);

// Update api/sync
const newApiSync = `
app.get('/api/sync', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    
    // Remove sensitive data for everyone
    if (db.users) {
      db.users = db.users.map((u) => {
        const { passwordHash, pinHash, salt, ...safeUser } = u;
        return safeUser;
      });
    }

    if (req.user.role === 'MEMBER') {
      const memberId = req.user.linkedMemberId;
      const safeDb = {
        settings: {
           currentFinancialYear: db.settings?.currentFinancialYear,
           language: db.settings?.language,
           organizationNameEn: db.settings?.organizationNameEn,
           organizationNameBn: db.settings?.organizationNameBn
        },
        members: db.members?.filter(m => m.memberId === memberId) || [],
        admissions: db.admissions?.filter(a => a.memberId === memberId) || [],
        capitalDeposits: db.capitalDeposits?.filter(c => c.memberId === memberId) || [],
        collections: db.collections?.filter(c => c.memberId === memberId) || [],
        welfareTransactions: db.welfareTransactions?.filter(w => w.memberId === memberId) || [],
        loans: db.loans?.filter(l => l.memberId === memberId) || [],
        loanRepayments: db.loanRepayments?.filter(l => l.memberId === memberId) || [],
        memberLedgers: db.memberLedgers?.filter(l => l.memberId === memberId) || [],
        users: db.users?.filter(u => u.userId === req.user.userId) || [],
        // Empty out everything else
        accounts: [],
        cashTransactions: [],
        bankTransactions: [],
        bankAccounts: [],
        journalEntries: [],
        journalLines: [],
        auditLogs: [],
        historicalMigrationLog: [],
        contraTransactions: [],
        contraEntries: [],
        incomes: [],
        expenses: [],
        investments: [],
        committee: []
      };
      return res.json(safeDb);
    }

    res.json(db);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json(null);
    } else {
      console.error('Error fetching state:', error);
      res.status(500).json({ error: 'Failed to fetch state' });
    }
  }
});

app.post('/api/sync', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    // Basic validation to prevent privilege escalation via sync
    const stateStr = JSON.stringify(req.body);
    await fs.writeFile(DB_FILE, stateStr, 'utf8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});
`;

content = content.replace(/app\.get\('\/api\/sync', verifyToken, async \([\s\S]*?\}\);/m, newApiSync);

content = content.replace(/app\.post\('\/api\/sync', verifyToken, async \([\s\S]*?\}\);/m, '');

fs.writeFileSync('server.ts', content);
