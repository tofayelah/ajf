const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Update preview endpoint requiredPhrase
content = content.replace(
  /requiredPhrase:\s*"DELETE ALL MEMBER DATA"/g,
  `requiredPhrase: "FACTORY RESET AJF PRODUCTION DATA"`
);

// Update execute endpoint condition
content = content.replace(
  /!== "DELETE ALL MEMBER DATA"\)/g,
  `!== "FACTORY RESET AJF PRODUCTION DATA")`
);

content = content.replace(
  /Confirmation phrase mismatch\. You must provide exactly 'DELETE ALL MEMBER DATA' to execute factory reset\./g,
  `Confirmation phrase mismatch. You must provide exactly 'FACTORY RESET AJF PRODUCTION DATA' to execute factory reset.`
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Updated factory reset requiredPhrase');
