import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

const memberId = 'AJM-000002';
const m = (db.members || []).find(x => x.memberId === memberId);
console.log("Member:", m);

// Oh wait, why did it return undefined earlier?
// const member = (db.members || []).find(m => m.memberId === memberId);
// console.log(member);
// Maybe it was deleted?
