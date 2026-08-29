const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');

// Replace the hardcoded demo data inside createFreshDatabase back to empty arrays.
content = content.replace(/committees: \[\s*\{\s*committeeId: "COM-001"[^]*?\}\s*\],\s*memberExits: \[\]/g, 'committees: [],\n    committeeMembers: [],\n    committeeHistory: [],\n    memberExits: []');

fs.writeFileSync('src/services/db.ts', content);
