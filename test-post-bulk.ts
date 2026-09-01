import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));

for (const m of db.members) {
  try {
    const res = AccountingService.postBulkCollection(db, {
      memberId: m.memberId,
      months: ['2026-06', '2026-07'],
      monthlyContribution: 500,
      totalLateFine: 40,
      totalDiscount: 0,
      totalPaidAmount: 1040,
      paymentMethod: 'CASH',
      receivedBy: 'SYSTEM',
      waivedMonths: []
    });
    // console.log(res);
  } catch(e) {
    console.error("CRASH ON BULK", m.memberId, e);
  }
}
