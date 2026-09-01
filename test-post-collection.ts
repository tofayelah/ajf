import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
const res = AccountingService.postCollection(db, {
  memberId: db.members[0].memberId,
  collectionMonth: '2026-08',
  paidAmount: 500,
  discount: 0,
  paymentMethod: 'CASH',
  receivedBy: 'SYSTEM'
});
console.log(res);
