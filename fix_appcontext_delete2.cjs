const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(
  /const user = db\.users\?\.find\(u => u\.userId === activeUserId\);\n\s*const res = AccountingService\.deleteMemberPermanently\(db, memberId, activeUserId \|\| 'SYSTEM', user\?\.fullName \|\| 'SYSTEM'\);/,
  `const user = (db.users || []).find(u => u.userId === db.activeUserId);
    const res = AccountingService.deleteMemberPermanently(db, memberId, db.activeUserId || 'SYSTEM', user?.fullName || 'SYSTEM');`
);

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('Fixed AppContext activeUserId');
