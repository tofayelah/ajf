const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

function replaceAudit(action, description, ref) {
   return `{
          auditId: \`AUD-\${Date.now()}\`,
          userId: params.userId,
          userName: params.userName,
          dateTime: new Date().toISOString(),
          module: 'MEMBER_EXIT',
          action: '${action}',
          description: \`${description}\`,
          referenceId: ${ref}
        }`;
}

acc = acc.replace(
  /this\.createAuditLog\(\s*params\.userId,\s*params\.userName,\s*"([^"]+)",\s*`([^`]+)`,\s*([^)\n]+)\s*\)/g,
  (match, action, description, ref) => {
     return replaceAudit(action, description, ref.trim());
  }
);

fs.writeFileSync('src/services/accounting.ts', acc);
console.log("Fixed audit logs in accounting.ts");
