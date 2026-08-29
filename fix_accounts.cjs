const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');
acc = acc.replace(
  /accountId: "3001", \/\/ Assuming 3001 is Member Capital account\. Let's verify\./,
  `accountId: "3000", // Member Capital (Share)`
);
acc = acc.replace(
  /accountId: "4004", \/\/ Service Charge Income\?/,
  `accountId: "4110", // Service Charge Income`
);

fs.writeFileSync('src/services/accounting.ts', acc);
console.log("Fixed account codes in accounting.ts");
