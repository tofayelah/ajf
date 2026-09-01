import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

db.members.forEach(m => {
  const memberId = m.memberId;
  const cols = (db.collections || []).filter(c => c.memberId === memberId).reduce((s, c) => s + Number(c.paidAmount||0), 0);
  console.log(`Member ${memberId} has ${cols} Monthly Sub`);
});

