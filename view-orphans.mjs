import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const journalSet = new Set();
(db.journalEntries || []).forEach(j => {
  journalSet.add(j.journalNo);
});

(db.journalLines || []).forEach(l => {
  if (!journalSet.has(l.journalNo)) {
    console.log("Orphan line:", l);
  }
});
