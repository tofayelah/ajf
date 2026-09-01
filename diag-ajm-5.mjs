import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));

console.log("All member IDs:", (db.members || []).map(m => m.memberId));
