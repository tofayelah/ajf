const fs = require('fs');
let content = fs.readFileSync('src/components/reports/MemberExitReport.tsx', 'utf8');

// Replace imports
content = content.replace(
  /import \{ MemberExitModal \} from '\.\.\/members\/MemberExitModal';/,
  `import { SettlementManagerModal } from '../members/SettlementManagerModal';`
);

content = content.replace(
  /<MemberExitModal/g,
  `<SettlementManagerModal`
);

// Update status filter options
content = content.replace(
  /<option value="EXIT_REQUESTED">Exit Requested<\/option>/,
  `<option value="NORMAL_EXIT_REQUESTED">Normal Exit Requested</option>
            <option value="EARLY_EXIT_REQUESTED">Early Exit Requested</option>
            <option value="DEATH_REPORTED">Death Reported</option>`
);

content = content.replace(
  /<option value="EXITED">Exited<\/option>/,
  `<option value="EXITED">Exited</option>
            <option value="DECEASED">Deceased</option>`
);

// Add Type Filter
const typeFilterHTML = `
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border-slate-300 rounded-lg p-2 text-sm">
            <option value="ALL">All Types</option>
            <option value="NORMAL">Normal Exit</option>
            <option value="EARLY">Early Exit</option>
            <option value="DEATH_SETTLEMENT">Death Settlement</option>
          </select>
`;

content = content.replace(
  /const \[statusFilter, setStatusFilter\] = useState\('ALL'\);/,
  `const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');`
);

content = content.replace(
  /if \(statusFilter !== 'ALL' && e.status !== statusFilter\) matches = false;/,
  `if (statusFilter !== 'ALL' && e.status !== statusFilter) matches = false;
    if (typeFilter !== 'ALL' && e.exitType !== typeFilter) matches = false;`
);

content = content.replace(
  /<select value=\{statusFilter\}/,
  typeFilterHTML + '\n          <select value={statusFilter}'
);

// Update headers and rows
content = content.replace(
  /const headers = \['Request ID', 'Request Date', 'Member ID', 'Exit Type', 'Status', 'Tenure \(Y\/M\)', 'Original Capital', 'S\.Charge %', 'Service Charge', 'Net Refund', 'Approved By', 'Voucher'\];/,
  `const headers = ['Request ID', 'Request Date', 'Member ID', 'Exit Type', 'Status', 'Tenure (Y/M)', 'Original Capital', 'S.Charge %', 'Service Charge', 'Eligible Benefit', 'Net Settlement', 'Approved By', 'Voucher'];`
);

content = content.replace(
  /e.serviceChargeAmount\.toString\(\),\n\s*e\.netRefundAmount\.toString\(\),/,
  `e.serviceChargeAmount.toString(),
      (e.eligibleBenefitAmount || 0).toString(),
      (e.netSettlementAmount || e.netRefundAmount).toString(),`
);

content = content.replace(
  /<th className="px-4 py-3 text-right">S\.Charge<\/th>\s*<th className="px-4 py-3 text-right">Refund<\/th>/,
  `<th className="px-4 py-3 text-right">S.Charge</th>
              <th className="px-4 py-3 text-right">Benefit</th>
              <th className="px-4 py-3 text-right">Settlement</th>`
);

content = content.replace(
  /<td className="px-4 py-2 text-right text-rose-600">\{e\.serviceChargeAmount > 0 \? formatCurrency\(e\.serviceChargeAmount\) : '-'\}<\/td>\s*<td className="px-4 py-2 text-right font-bold text-emerald-700">\{formatCurrency\(e\.netRefundAmount\)\}<\/td>/,
  `<td className="px-4 py-2 text-right text-rose-600">{e.serviceChargeAmount > 0 ? formatCurrency(e.serviceChargeAmount) : '-'}</td>
                   <td className="px-4 py-2 text-right text-emerald-600">{e.eligibleBenefitAmount ? formatCurrency(e.eligibleBenefitAmount) : '-'}</td>
                   <td className="px-4 py-2 text-right font-bold text-purple-700">{formatCurrency(e.netSettlementAmount || e.netRefundAmount)}</td>`
);

content = content.replace(
  /<td className="px-4 py-3 text-right text-emerald-700">\{formatCurrency\(totalRefund\)\}<\/td>/,
  `<td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(filteredExits.reduce((sum, e) => sum + (e.eligibleBenefitAmount || 0), 0))}</td>
              <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(filteredExits.reduce((sum, e) => sum + (e.netSettlementAmount || e.netRefundAmount || 0), 0))}</td>`
);

// We should also replace the total text to have enough colSpans
content = content.replace(
  /<td colSpan=\{6\} className="px-4 py-3 text-right text-slate-700">Total:<\/td>/,
  `<td colSpan={6} className="px-4 py-3 text-right text-slate-700">Total:</td>` // Still 6 because columns shifted to right 
);

fs.writeFileSync('src/components/reports/MemberExitReport.tsx', content);
console.log('Fixed MemberExitReport');
