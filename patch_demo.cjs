const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');

const oldDemo = `export function populateDemoData(db: AppDatabaseState): AppDatabaseState {`;
const newDemo = `export function populateDemoData(db: AppDatabaseState): AppDatabaseState {
  if (import.meta.env.VITE_APP_MODE === "production") {
    console.warn("BLOCKED: Cannot populate demo data in production.");
    return db;
  }`;

if (!content.includes('Cannot populate demo data in production.')) {
  content = content.replace(oldDemo, newDemo);
  fs.writeFileSync('src/services/db.ts', content, 'utf8');
  console.log('Updated populateDemoData');
}
