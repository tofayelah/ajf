import fs from 'fs';
import { AccountingService } from './src/services/accounting.ts';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));

try {
  const res = AccountingService.postBulkCollection(db, {
    memberId: db.members[0].memberId,
    months: ['2026-08'],
    monthlyContribution: 1000,
    totalLateFine: 20,
    totalDiscount: 0,
    totalPaidAmount: 1020,
    paymentMethod: 'CASH',
    receivedBy: 'SYSTEM',
    lateFeeWaived: false,
    waivedMonths: []
  });
  console.log(res);
} catch(e) {
  console.error("CRASHED!", e);
}
