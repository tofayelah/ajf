const fs = require('fs');

let content = fs.readFileSync('src/components/members/MemberMasterView.tsx', 'utf8');

// Replace MemberExitModal with SettlementManagerModal
content = content.replace(
  /import \{ MemberExitModal \} from '\.\/MemberExitModal';/g,
  `import { SettlementManagerModal } from './SettlementManagerModal';`
);

content = content.replace(
  /<MemberExitModal\s*member=\{exitRequestMember\}\s*onClose=\{\(\) => setExitRequestMember\(null\)\}\s*\/>/g,
  `<SettlementManagerModal member={exitRequestMember} onClose={() => setExitRequestMember(null)} />`
);

content = content.replace(
  /isBangla \? "সদস্য প্রস্থান\/পদত্যাগ" : "Exit\/Resign Member"/g,
  `isBangla ? "হিসাব নিষ্পত্তি / Settlement" : "Settlement"`
);

// We should also look at the tooltip title block if we had one
const badBlockStart = content.indexOf(`isBangla
                            ? (() => {`);
if (badBlockStart !== -1) {
    // If the complex title block exists, we can replace it with simpler text since SettlementManagerModal handles the internal state view
    // Actually, I'll just leave it or replace the whole button if it exists.
}

fs.writeFileSync('src/components/members/MemberMasterView.tsx', content);
console.log('Fixed MemberMasterView imports');
