import fs from 'fs';
import { AccountingService } from './src/services/accounting.ts';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));

// Inject a ledger entry for the month to trigger the bug!
db.memberLedgers.push({
  ledgerId: 'dummy',
  memberId: db.members[0].memberId,
  date: '2026-08-01',
  voucherNo: 'dummy',
  description: 'Collection - 2026-08',
  transactionType: 'MONTHLY_COLLECTION',
  debit: 0,
  credit: 0,
  balance: 0,
  sourceType: 'COLLECTION',
  sourceId: 'dummy',
  createdAt: '2026-08-01'
});

try {
  const res = AccountingService.postBulkCollection(db, {
    memberId: db.members[0].memberId,
    months: ['2026-08'],
    monthlyContribution: 1000,
    totalLateFine: 0,
    totalDiscount: 0,
    totalPaidAmount: 1000,
    paymentMethod: 'CASH',
    receivedBy: 'SYSTEM',
    lateFeeWaived: false,
    waivedMonths: []
  });
  console.log(res);
} catch(e) {
  console.error("CRASHED!", e);
}
