import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const m1 = db.members.find(m => m.memberId === 'AJM-000001');
if(m1) {
  const memberId = m1.memberId;
  console.log("Selected Member ID =", memberId);
  
  const cap = (db.capitalDeposits||[]).filter(c => c.memberId === memberId).reduce((sum, c) => sum + Number(c.amount||0), 0);
  console.log("Canonical Capital =", cap);
  
  const adm = (db.admissions||[]).filter(a => a.memberId === memberId).reduce((sum, a) => sum + Number(a.admissionFee||0), 0);
  console.log("Canonical Admission Fee =", adm);
  
  const mlSub = (db.memberLedgers||[]).filter(l => l.memberId === memberId && l.transactionType === 'MONTHLY_COLLECTION').reduce((sum, l) => sum + Number(l.credit||0) - Number(l.debit||0), 0);
  console.log("Canonical Monthly Sub (Member Ledgers) =", mlSub);
  
  const mlJorimana = (db.memberLedgers||[]).filter(l => l.memberId === memberId && l.transactionType === 'LATE_FINE').reduce((sum, l) => sum + Number(l.credit||0) - Number(l.debit||0), 0);
  console.log("Canonical Jorimana (Member Ledgers) =", mlJorimana);
}

