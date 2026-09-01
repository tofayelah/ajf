import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
const ledger = AccountingService.getComprehensiveMemberLedger(db, 'AJM-000001');

console.log("totalCapital:", ledger.totalCapital);
console.log("totalAdmissionFee:", ledger.totalAdmissionFee);
console.log("totalJorimana:", ledger.totalJorimana);
console.log("totalMonthlySubscription:", ledger.totalMonthlySubscription);
console.log("currentMemberBalance:", ledger.currentMemberBalance);

