import fs from 'fs';
const filePath = 'src/components/settlement/MemberSettlementDashboardView.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/yyyyMm/g, 'monthStr');
fs.writeFileSync(filePath, content, 'utf8');
