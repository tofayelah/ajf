const fs = require('fs');
let content = fs.readFileSync('src/components/reports/ReportsCenterView.tsx', 'utf8');

// Add import
content = content.replace(/import \{ ContraReport \} from '\.\/ContraReport';/, 
`import { ContraReport } from './ContraReport';
import { MemberExitReport } from './MemberExitReport';`);

// Add to tabs array
const tabsSearch = `{ id: 'CONTRA_REPORT', label: '১৭. কন্ট্রা এন্ট্রি রিপোর্ট (Contra Transfers)' }`;
content = content.replace(tabsSearch, 
`{ id: 'CONTRA_REPORT', label: '১৭. কন্ট্রা এন্ট্রি রিপোর্ট (Contra Transfers)' },
          { id: 'MEMBER_EXIT_REPORT', label: '১৮. সদস্য প্রস্থান রিপোর্ট (Member Exit)' }`);

// Add rendering logic
const renderSearch = `{selectedReport === 'CONTRA_REPORT' && <ContraReport />}`;
content = content.replace(renderSearch, 
`{selectedReport === 'CONTRA_REPORT' && <ContraReport />}
        {selectedReport === 'MEMBER_EXIT_REPORT' && <MemberExitReport db={db} />}`);

fs.writeFileSync('src/components/reports/ReportsCenterView.tsx', content);
console.log("ReportsCenterView updated");
