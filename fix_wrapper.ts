import fs from 'fs';
const p = 'src/components/members/MemberLedgerView.tsx';
let c = fs.readFileSync(p, 'utf-8');

// I need to close the `<div className={!selectedMember ? 'hidden' : 'space-y-6'}>`
// right before `{/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}`
c = c.replace(
  /\{\/\* 6\. FORMAL PRINT-ONLY STATEMENT TEMPLATE \*\/\}/,
  '</div>\n\n      {/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}'
);

fs.writeFileSync(p, c, 'utf-8');
console.log('Fixed wrapper div');
