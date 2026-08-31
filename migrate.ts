import fs from 'fs/promises';
import bcrypt from 'bcryptjs';

async function migrateAdminPassword() {
  try {
    const DB_FILE = 'database.json';
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const admin = db.users?.find((u: any) => u.userId === 'USR-0001');
    if (admin && admin.passwordHash === '123456') {
      admin.passwordHash = await bcrypt.hash('123456', 10);
      await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log('✅ Migrated existing Admin password to secure bcrypt hash.');
    } else {
        console.log('Admin not found or password already hashed', admin?.passwordHash);
    }
  } catch(e) {
    console.error('Migration check skipped or failed:', e);
  }
}

migrateAdminPassword();
