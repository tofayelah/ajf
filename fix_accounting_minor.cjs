const fs = require('fs');

let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

// Fix DECEASED check in memberExits find
content = content.replace(/e\.status !== "DECEASED" && /g, '');

// Fix referenceId in processMemberExitRefund
content = content.replace(/referenceId: request\.exitRequestId/g, 'recordId: request.exitRequestId');

fs.writeFileSync('src/services/accounting.ts', content);
console.log('Fixed minor accounting errors');
