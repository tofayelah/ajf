import fs from 'fs';
import { AccountingService } from './src/services/accounting.ts';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));

try {
  const res = AccountingService.postCollection(db, {
    memberId: db.members[0].memberId,
    months: ['2026-08'],
    totalPaidAmount: 1000,
    paymentMethod: 'CASH',
    receivedBy: 'SYSTEM'
  });
  console.log(res);
} catch(e) {
  console.error("CRASHED!", e);
}
