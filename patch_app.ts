import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// add imports
const imports = `
import { MemberSettlementDashboardView } from './components/settlement/MemberSettlementDashboardView';
import { NormalMemberExitView } from './components/settlement/NormalMemberExitView';
import { EarlyMemberExitView } from './components/settlement/EarlyMemberExitView';
import { EarlyExitRequestsView } from './components/settlement/EarlyExitRequestsView';
import { DeathSettlementView } from './components/settlement/DeathSettlementView';
import { PendingSettlementApprovalsView } from './components/settlement/PendingSettlementApprovalsView';
import { CompletedSettlementsView } from './components/settlement/CompletedSettlementsView';
import { SettlementReportsView } from './components/settlement/SettlementReportsView';
`;

content = content.replace(
  /import \{ DashboardView \} from '\.\/components\/dashboard\/DashboardView';/,
  imports + "\n" + `import { DashboardView } from './components/dashboard/DashboardView';`
);

// add cases
const cases = `
    case 'MEMBER_SETTLEMENT':
    case 'SETTLEMENT_DASHBOARD': return <MemberSettlementDashboardView />;
    case 'NORMAL_MEMBER_EXIT': return <NormalMemberExitView />;
    case 'EARLY_MEMBER_EXIT': return <EarlyMemberExitView />;
    case 'EARLY_EXIT_REQUESTS': return <EarlyExitRequestsView />;
    case 'DEATH_SETTLEMENT': return <DeathSettlementView />;
    case 'PENDING_SETTLEMENT_APPROVALS': return <PendingSettlementApprovalsView />;
    case 'COMPLETED_SETTLEMENTS': return <CompletedSettlementsView />;
    case 'SETTLEMENT_REPORTS': return <SettlementReportsView />;
`;

content = content.replace(
  /case 'NOTIFICATIONS': return <MemberNotificationsView \/>;/,
  `case 'NOTIFICATIONS': return <MemberNotificationsView />;\n${cases}`
);

fs.writeFileSync(filePath, content);
