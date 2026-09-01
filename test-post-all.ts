import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
const month = '2026-08';
for (const m of db.members) {
  try {
    const res = AccountingService.postCollection(db, {
      memberId: m.memberId,
      collectionMonth: month,
      paidAmount: 500,
      discount: 0,
      paymentMethod: 'CASH',
      receivedBy: 'SYSTEM',
      isLateFineOnly: false,
      lateFeeWaived: false
    });
    // console.log(m.memberId, res.success);
  } catch(e) {
    console.error("CRASH ON", m.memberId, e);
  }
}
