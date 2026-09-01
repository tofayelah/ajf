import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

console.log("=== DATABASE ===");
console.log("capitalDeposits count =", db.capitalDeposits?.length || 0);
console.log("admissions count =", db.admissions?.length || 0);
console.log("incomes count =", db.incomes?.length || 0);
console.log("members count =", db.members?.length || 0);
if(db.members?.length > 0) {
  const m = db.members[0];
  const memberId = m.memberId;
  console.log("Selected Member ID =", memberId);
  
  const cap = (db.capitalDeposits||[]).filter(c => c.memberId === memberId).reduce((sum, c) => sum + Number(c.amount||0), 0);
  console.log("Canonical Capital =", cap);
  
  const adm = (db.admissions||[]).filter(a => a.memberId === memberId).reduce((sum, a) => sum + Number(a.admissionFee||0), 0);
  console.log("Canonical Admission Fee =", adm);
  
  // incomes for admission?
  const incAdm = (db.incomes||[]).filter(i => i.memberId === memberId && (i.incomeHead === 'Admission Fee' || String(i.remarks).includes('ভর্তি'))).reduce((sum, i) => sum + Number(i.amount||0), 0);
  console.log("Canonical Admission Fee (Incomes) =", incAdm);
  
  // Monthly Sub
  const monthlySub = (db.collections||[]).filter(c => c.memberId === memberId).reduce((sum, c) => sum + Number(c.paidAmount||0), 0);
  console.log("Canonical Monthly Sub (Collections paidAmount) =", monthlySub);
  
  // Let's also check member ledgers to see if monthly sub is populated there
  const mlSub = (db.memberLedgers||[]).filter(l => l.memberId === memberId && l.transactionType === 'MONTHLY_COLLECTION').reduce((sum, l) => sum + Number(l.credit||0) - Number(l.debit||0), 0);
  console.log("Canonical Monthly Sub (Member Ledgers) =", mlSub);
  
}

