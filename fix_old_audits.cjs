const fs = require('fs');
let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

acc = acc.replace(
  /module: 'MEMBER_EXIT',\n\s*action: 'MEMBER_EXIT_([A-Z_]+)',\n\s*description:/g,
  (m, p1) => `module: 'MEMBER_EXIT',\n          action: 'MEMBER_EXIT_${p1}',\n          remarks:`
);

fs.writeFileSync('src/services/accounting.ts', acc);
