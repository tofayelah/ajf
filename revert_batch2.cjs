const fs = require('fs');

let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const regex = /\/\/ AUTO-GENERATED WRAPPERS BATCH 2[\s\S]*?(?=  if \(isDbLoading\) \{)/;
code = code.replace(regex, '');
fs.writeFileSync('src/context/AppContext.tsx', code);
console.log("Reverted BATCH 2");
