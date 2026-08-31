import fs from 'fs';

// 1. Fix AppContext.tsx ActiveScreen
let appContext = fs.readFileSync('src/context/AppContext.tsx', 'utf8');
if (!appContext.includes('"MEMBER_PROFILE"')) {
  appContext = appContext.replace(
    '| "MEMBER_LEDGER"',
    '| "MEMBER_PROFILE"\n  | "MEMBER_LEDGER"'
  );
  fs.writeFileSync('src/context/AppContext.tsx', appContext);
}

// 2. Fix server.ts UserAccount creation and salt omission
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(
  'db.users.push({ userId: \'USR-0001\', username: \'admin\', mobile: \'01700000000\', role: \'ADMIN\', status: \'ACTIVE\', passwordHash });',
  'db.users.push({ userId: \'USR-0001\', username: \'admin\', fullName: \'System Admin\', mobile: \'01700000000\', role: \'ADMIN\', status: \'ACTIVE\', passwordHash, pinHash: \'\', createdAt: new Date().toISOString() });'
);
server = server.replace(
  'const { passwordHash, pinHash, salt, ...safeUser } = u;',
  'const { passwordHash, pinHash, salt, ...safeUser } = u as any;'
);
fs.writeFileSync('server.ts', server);

// 3. Remove GUEST from permissions.ts to fix UserRole Record mismatch
let perms = fs.readFileSync('src/utils/permissions.ts', 'utf8');
perms = perms.replace(/,\s*GUEST:\s*\[\]/g, '');
fs.writeFileSync('src/utils/permissions.ts', perms);

console.log("Patched final TS issues");
