const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(
  /const res = AccountingService\.deleteMemberPermanently\(db, memberId\);/,
  `const user = db.users?.find(u => u.userId === activeUserId);
    const res = AccountingService.deleteMemberPermanently(db, memberId, activeUserId || 'SYSTEM', user?.fullName || 'SYSTEM');`
);

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log('Fixed AppContext deleteMemberPermanently call');
