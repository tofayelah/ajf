import fs from 'fs/promises';
import { createFreshDatabase } from './src/services/db';

async function seed() {
  const db = createFreshDatabase(true);
  await fs.writeFile('database.json', JSON.stringify(db, null, 2), 'utf8');
  console.log('Database seeded!');
}

seed();
