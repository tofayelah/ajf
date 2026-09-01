import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
console.log(db.members[0]);
