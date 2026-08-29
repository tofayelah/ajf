const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

// For MEMBER_EXIT_COMPLETED AuditLog
acc = acc.replace(
  /referenceId: req\.exitRequestId/g,
  `recordId: req.exitRequestId`
);

fs.writeFileSync('src/services/accounting.ts', acc);
console.log('Fixed referenceId to recordId');
