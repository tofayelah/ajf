const fs = require('fs');
let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

acc = acc.replace(
  /module: 'MEMBER_EXIT',\n\s*action: 'MEMBER_EXIT_([A-Z_]+)',\n\s*remarks: `([^`]+)`,\n\s*referenceId: /g,
  (m, p1, p2) => `module: 'MEMBER_EXIT',\n          action: 'MEMBER_EXIT_${p1}' as any,\n          remarks: \`${p2}\`,\n          recordId: `
);

fs.writeFileSync('src/services/accounting.ts', acc);
