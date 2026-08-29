const fs = require('fs');

// 1. Update accounting.ts
let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');
acc = acc.replace(
  /let serviceChargePercentage = 0;\s*if \(tenureYears < 3 && params\.exitType === "EARLY"\) \{\s*serviceChargePercentage = 15;\s*\}/,
  `let serviceChargePercentage = 15; // 15% for both Normal and Early Exit`
);
fs.writeFileSync('src/services/accounting.ts', acc);

// 2. Update MemberExitModal.tsx
let modal = fs.readFileSync('src/components/members/MemberExitModal.tsx', 'utf8');
modal = modal.replace(
  /const serviceChargePercentage = \(\!isEligibleForNormal && exitType === 'EARLY'\) \? 15 : 0;/,
  `const serviceChargePercentage = 15;`
);
fs.writeFileSync('src/components/members/MemberExitModal.tsx', modal);

// 3. Update MemberExitReport.tsx
let report = fs.readFileSync('src/components/reports/MemberExitReport.tsx', 'utf8');

// Add "S.Charge %" to Headers in CSV
report = report.replace(
  /const headers = \['Request Date', 'Member ID', 'Exit Type', 'Status', 'Tenure \(Y\/M\)', 'Original Capital', 'Service Charge', 'Net Refund', 'Voucher'\];/,
  `const headers = ['Request Date', 'Member ID', 'Exit Type', 'Status', 'Tenure (Y/M)', 'Original Capital', 'S.Charge %', 'Service Charge', 'Net Refund', 'Voucher'];`
);

// Add e.serviceChargePercentage to CSV rows
report = report.replace(
  /e\.eligibleRefundAmount\.toString\(\),\s*e\.serviceChargeAmount\.toString\(\),/,
  `e.eligibleRefundAmount.toString(),
      e.serviceChargePercentage.toString() + '%',
      e.serviceChargeAmount.toString(),`
);

// Add to Table Headers
report = report.replace(
  /<th className="px-4 py-3 text-right">Capital<\/th>\s*<th className="px-4 py-3 text-right">S\.Charge<\/th>/,
  `<th className="px-4 py-3 text-right">Capital</th>
              <th className="px-4 py-3 text-right">S.Charge %</th>
              <th className="px-4 py-3 text-right">S.Charge</th>`
);

// Add to Table Body
report = report.replace(
  /<td className="px-4 py-2 text-right">\{formatCurrency\(e\.eligibleRefundAmount\)\}<\/td>\s*<td className="px-4 py-2 text-right text-rose-600">\{e\.serviceChargeAmount > 0 \? formatCurrency\(e\.serviceChargeAmount\) : '-'\}<\/td>/,
  `<td className="px-4 py-2 text-right">{formatCurrency(e.eligibleRefundAmount)}</td>
                   <td className="px-4 py-2 text-right">{e.serviceChargePercentage}%</td>
                   <td className="px-4 py-2 text-right text-rose-600">{e.serviceChargeAmount > 0 ? formatCurrency(e.serviceChargeAmount) : '-'}</td>`
);

// Fix colspan in tfoot
report = report.replace(
  /<td colSpan=\{5\} className="px-4 py-3 text-right text-slate-700">Total:<\/td>/,
  `<td colSpan={5} className="px-4 py-3 text-right text-slate-700">Total:</td>`
);
report = report.replace(
  /<td className="px-4 py-3 text-right text-slate-800">\{formatCurrency\(filteredExits\.reduce\(\(sum, e\) => sum \+ e\.eligibleRefundAmount, 0\)\)\}<\/td>\s*<td className="px-4 py-3 text-right text-rose-700">/,
  `<td className="px-4 py-3 text-right text-slate-800">{formatCurrency(filteredExits.reduce((sum, e) => sum + e.eligibleRefundAmount, 0))}</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right text-rose-700">`
);
// Fix empty state colspan
report = report.replace(
  /<td colSpan=\{8\} className="text-center py-6 text-slate-500">/,
  `<td colSpan={9} className="text-center py-6 text-slate-500">`
);

fs.writeFileSync('src/components/reports/MemberExitReport.tsx', report);

console.log("Updated service charge rules to 15% for all.");
