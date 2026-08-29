const fs = require('fs');

let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

// Fix AuditLog referenceId -> recordId
content = content.replace(/referenceId: request\.exitRequestId,/g, 'recordId: request.exitRequestId,');

// Fix return values to use updatedDb
content = content.replace(/db: newDb/g, 'updatedDb: newDb');
content = content.replace(/db: currentDb/g, 'updatedDb: currentDb');

// Also fix some AuditAction type casting
content = content.replace(/action: auditAction as any,/g, 'action: auditAction as any, module: "MEMBER_EXIT",');
content = content.replace(/action: auditAction as AuditAction,/g, 'action: auditAction as any, module: "MEMBER_EXIT",');

fs.writeFileSync('src/services/accounting.ts', content);
console.log('Fixed accounting.ts props');
