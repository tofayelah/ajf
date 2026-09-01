import fs from 'fs';
const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
for (const key of Object.keys(db)) {
  if (Array.isArray(db[key])) {
    console.log(`${key}: ${db[key].length}`);
  }
}
