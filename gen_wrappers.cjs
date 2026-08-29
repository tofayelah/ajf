const fs = require('fs');

const code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Get all the interface methods
const ifaceMatch = code.match(/interface AppContextType \{([\s\S]*?)\}/);
const ifaceCode = ifaceMatch[1];
const regex = /^\s+([a-zA-Z0-9_]+)[\(\:]/gm;
let m;
const ifaceMethods = [];
while ((m = regex.exec(ifaceCode)) !== null) {
  ifaceMethods.push(m[1]);
}

// Get all AccountingService static methods
const serviceCode = fs.readFileSync('src/services/accounting.ts', 'utf8');
const sRegex = /^\s*static\s+([a-zA-Z0-9_]+)\s*\(/gm;
const sMethods = [];
while ((m = sRegex.exec(serviceCode)) !== null) {
  sMethods.push(m[1]);
}

// Intersect them
const wrappers = ifaceMethods.filter(name => sMethods.includes(name));
console.log(wrappers);

