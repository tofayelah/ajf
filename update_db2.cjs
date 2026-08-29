const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');

// Import MemberExitRequest
content = content.replace(/Member,/, `MemberExitRequest,\n  Member,`);

// Add to interface
content = content.replace(/activeUserId: string \| null;/, `memberExits: MemberExitRequest[];\n  activeUserId: string | null;`);

// Add to getInitialDatabase
content = content.replace(/activeUserId: null,/, `memberExits: [],\n    activeUserId: null,`);

// Add to parse
content = content.replace(/activeUserId: null,/, `memberExits: [],\n      activeUserId: null,`);

fs.writeFileSync('src/services/db.ts', content);
console.log("db.ts updated");
