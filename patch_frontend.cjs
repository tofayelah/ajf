const fs = require('fs');

const path1 = 'src/components/settings/SettingsView.tsx';
let c1 = fs.readFileSync(path1, 'utf8');
c1 = c1.replace(/'DELETE ALL MEMBER DATA'/g, "'FACTORY RESET AJF PRODUCTION DATA'");
fs.writeFileSync(path1, c1, 'utf8');

const path2 = 'src/context/AppContext.tsx';
let c2 = fs.readFileSync(path2, 'utf8');
c2 = c2.replace(/"DELETE ALL MEMBER DATA"/g, '"FACTORY RESET AJF PRODUCTION DATA"');
fs.writeFileSync(path2, c2, 'utf8');

console.log('Updated frontend files');
