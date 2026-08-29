const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf8') || '{}');
const memberId = 'AJM-000001';
const member = (db.members || []).find(m => m.memberId === memberId);
let totalAdmissionFee = 0;
if (member) {
  const incomes = db.incomes || [];
  totalAdmissionFee = incomes.filter(i => {
    const inc = i;
    const desc = [inc.description, inc.incomeHead, inc.remarks, inc.reference].filter(Boolean).join(' ').toLowerCase();
    const isMemMatch = inc.memberId === memberId || (desc.includes(member.memberId.toLowerCase()) || desc.includes(member.fullName.toLowerCase()));
    const isAdmCategory = inc.category === 'ADMISSION' || inc.category === 'MEMBERSHIP_FEE' || inc.sourceType === 'ADMISSION' || desc.includes('admission') || desc.includes('ভর্তি');
    return isMemMatch && isAdmCategory;
  }).reduce((sum, i) => sum + (i.amount || 0), 0);
}
console.log('Total Admission Fee calculated:', totalAdmissionFee);
