import fs from 'fs';

if (fs.existsSync('database.backup.json')) {
  const bkp = JSON.parse(fs.readFileSync('database.backup.json', 'utf8') || '{}');
  console.log('Backup keys:', Object.keys(bkp));
  console.log('Backup cashTransactions:', JSON.stringify(bkp.cashTransactions, null, 2));
  console.log('Backup incomes:', JSON.stringify(bkp.incomes, null, 2));
  console.log('Backup capitalDeposits:', JSON.stringify(bkp.capitalDeposits, null, 2));
  console.log('Backup admissions:', JSON.stringify(bkp.admissions, null, 2));
  console.log('Backup journalEntries:', JSON.stringify(bkp.journalEntries, null, 2));
} else {
  console.log('database.backup.json does not exist');
}
