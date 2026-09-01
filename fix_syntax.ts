import fs from 'fs';

const filePath = 'src/components/members/MemberLedgerView.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Remove the incorrectly added `)}` before the print statement
code = code.replace(
  /<\/div>\n      \)\}\n\n      \{\/\* 6\. FORMAL PRINT-ONLY STATEMENT TEMPLATE \*\/\}/,
  '</div>\n\n      {/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}'
);

// 2. We need to wrap everything starting from `{/* 3. SELECTED MEMBER CARD & SUMMARY INFO */}` 
// down to just before `{/* 6. FORMAL PRINT-ONLY STATEMENT TEMPLATE */}` inside `{selectedMember && ( ... )}`
// BUT WAIT! We can just use standard `if (!selectedMember) { return <div>{renderAllMembers}</div>; }` 
// Or render it right before section 3!

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Fixed unmatched )}');
