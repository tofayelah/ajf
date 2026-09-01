import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const journalSet = new Set();
(db.journalEntries || []).forEach(j => {
  journalSet.add(j.id || j.journalId || j.journalNo);
});

let orphans = 0;
(db.journalLines || []).forEach(l => {
  if (!journalSet.has(l.journalEntryId || l.journalNo)) {
    orphans++;
  }
});
console.log(`Orphan Journal Lines: ${orphans}`);
