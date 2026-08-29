const fs = require('fs');

let content = fs.readFileSync('src/components/members/MemberExitModal.tsx', 'utf8');
content = content.replace(
  /const { db, activeUserId, requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund } = useApp\(\);/,
  `const { db, activeUser, requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund } = useApp();`
);
content = content.replace(
  /const user = db.users\?\.find\(u => u.userId === activeUserId\);/,
  `const user = activeUser;`
);

fs.writeFileSync('src/components/members/MemberExitModal.tsx', content);
console.log('Fixed user in modal');
