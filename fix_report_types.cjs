const fs = require('fs');
let file = fs.readFileSync('src/components/reports/MemberExitReport.tsx', 'utf8');

file = file.replace(/import \{ AppDatabaseState \} from '\.\.\/\.\.\/types';/, `import { AppDatabaseState } from '../../services/db';`);

fs.writeFileSync('src/components/reports/MemberExitReport.tsx', file);
console.log('Fixed MemberExitReport imports');
