const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const backupCode = `
// Automated Daily Backup
import schedule from 'node-schedule';
import AdmZip from 'adm-zip';
import crypto from 'crypto';

function performAutomatedBackup() {
  const isProduction = process.env.VITE_APP_MODE === "production";
  if (!isProduction) return;
  
  try {
    if (!fsSync.existsSync(DB_FILE)) return;
    const dbRaw = fsSync.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(dbRaw);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = \`AJF_AUTO_BACKUP_\${timestamp}.zip\`;
    const backupPath = path.join(process.cwd(), backupName);
    
    const zip = new AdmZip();
    zip.addFile("database.json", Buffer.from(dbRaw, "utf8"));
    
    const checksums = {
      "database.json": crypto.createHash("sha256").update(dbRaw).digest("hex")
    };
    zip.addFile("checksums.json", Buffer.from(JSON.stringify(checksums, null, 2), "utf8"));
    
    const manifest = {
      timestamp,
      activeFinancialYear: db.settings?.currentFinancialYear,
      memberCount: (db.members || []).length,
      journalCount: (db.journalEntries || []).length,
      cashCount: (db.cashTransactions || []).length,
      bankCount: (db.bankTransactions || []).length
    };
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
    zip.addFile("schema-version.json", Buffer.from(JSON.stringify({ version: "1.0" }), "utf8"));
    zip.addFile("backup-info.txt", Buffer.from("Automated production backup.", "utf8"));
    zip.addFile("README-RESTORE.md", Buffer.from("Restore via the admin interface.", "utf8"));
    
    zip.writeZip(backupPath);
    console.log(\`Automated daily backup created: \${backupName}\`);
    
    // Retention logic: keep last 14 backups
    const files = fsSync.readdirSync(process.cwd());
    const backups = files.filter(f => f.startsWith('AJF_AUTO_BACKUP_') && f.endsWith('.zip'))
                         .map(f => ({ name: f, time: fsSync.statSync(f).mtime.getTime() }))
                         .sort((a, b) => b.time - a.time);
    
    if (backups.length > 14) {
      for (let i = 14; i < backups.length; i++) {
        fsSync.unlinkSync(backups[i].name);
        console.log(\`Deleted old backup: \${backups[i].name}\`);
      }
    }
  } catch (error) {
    console.error("Error creating automated backup:", error);
  }
}

// Schedule backup to run every day at 2:00 AM
schedule.scheduleJob('0 2 * * *', performAutomatedBackup);
// Run a backup immediately on startup in production if no backup from today exists
if (process.env.VITE_APP_MODE === "production") {
    setTimeout(() => performAutomatedBackup(), 5000);
}
`;

if (!content.includes('performAutomatedBackup()')) {
  // We need to inject this after the imports
  content = content.replace(/import express from "express";/, `import express from "express";\n${backupCode}`);
  fs.writeFileSync('server.ts', content, 'utf8');
  console.log("Injected performAutomatedBackup");
}
