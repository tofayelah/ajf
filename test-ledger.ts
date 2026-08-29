import fs from 'fs';
import { AccountingService } from './src/services/accounting';
const db = JSON.parse(fs.readFileSync('database.json', 'utf-8') || '{}');
try {
  AccountingService.getComprehensiveMemberLedger(db, 'AJM-000001');
  console.log('Done');
} catch (e) {
  console.error(e);
}
