import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

let unbalanced = 0;
let orphans = 0;
let duplicates = 0;

const journalSet = new Set();
(db.journalEntries || []).forEach(j => {
  if (journalSet.has(j.journalNo)) {
    duplicates++;
  }
  journalSet.add(j.journalNo);
  
  const lines = (db.journalLines || []).filter(l => l.journalNo === j.journalNo);
  let d = 0;
  let c = 0;
  lines.forEach(l => {
    d += (l.debit || 0);
    c += (l.credit || 0);
  });
  if (d !== c) unbalanced++;
});

(db.journalLines || []).forEach(l => {
  if (!journalSet.has(l.journalNo)) orphans++;
});

console.log(`Unbalanced Journals = ${unbalanced}`);
console.log(`Orphan Journal Lines = ${orphans}`);
console.log(`Duplicate Journals = ${duplicates}`);
