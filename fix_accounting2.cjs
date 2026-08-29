const fs = require('fs');
let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

const splitIndex = content.indexOf('  // =========================================================================\n  // MEMBER EXIT MANAGEMENT');

if (splitIndex !== -1) {
  let methodsStr = content.slice(splitIndex);
  let cleaned = content.split('export { validateJournalIntegrity };')[0];
  
  let newContent = cleaned.trim();
  if (newContent.endsWith('}')) {
     newContent = newContent.slice(0, -1);
  }
  
  // Clean methodsStr end
  methodsStr = methodsStr.replace(/\}\s*;\s*$/, '}'); // remove trailing }; if present
  
  newContent += '\n\n' + methodsStr;
  
  newContent += '\n}\n\nexport { validateJournalIntegrity };\nexport type { JournalIntegrityValidationResult, UnbalancedJournalDetail };\n';
  
  fs.writeFileSync('src/services/accounting.ts', newContent);
  console.log('Fixed accounting.ts');
}
