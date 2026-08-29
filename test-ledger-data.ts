import fs from 'fs';
import { AccountingService } from './src/services/accounting';
const db = JSON.parse(fs.readFileSync('database.json', 'utf-8') || '{}');
const ledgerData = AccountingService.getComprehensiveMemberLedger(db, 'AJM-000001');
console.log('Admission Fee:', ledgerData.totalAdmissionFee);
console.log('Total Capital:', ledgerData.totalCapital);
console.log('Member Balance:', ledgerData.currentMemberBalance);
console.log('Transaction Count:', ledgerData.items.length);
