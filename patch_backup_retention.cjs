const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const oldRetentionLogic = `    // Retention logic: keep last 14 backups
    const files = fsSync.readdirSync(process.cwd());
    const backups = files.filter(f => f.startsWith('AJF_AUTO_BACKUP_') && f.endsWith('.zip'))
                         .map(f => ({ name: f, time: fsSync.statSync(f).mtime.getTime() }))
                         .sort((a, b) => b.time - a.time);
    
    if (backups.length > 14) {
      for (let i = 14; i < backups.length; i++) {
        fsSync.unlinkSync(backups[i].name);
        console.log(\`Deleted old backup: \${backups[i].name}\`);
      }
    }`;

const newRetentionLogic = `    // Tiered Retention logic
    const files = fsSync.readdirSync(process.cwd());
    const backups = files.filter(f => f.startsWith('AJF_AUTO_BACKUP_') && f.endsWith('.zip'))
                         .map(f => {
                           const stat = fsSync.statSync(f);
                           return { name: f, time: stat.mtime.getTime(), date: new Date(stat.mtime) };
                         })
                         .sort((a, b) => b.time - a.time);

    if (backups.length > 1) {
      // Never delete the newest backup (index 0).
      const now = new Date();
      const dailyRetentionMs = 14 * 24 * 60 * 60 * 1000;
      const weeklyRetentionMs = 8 * 7 * 24 * 60 * 60 * 1000;
      const monthlyRetentionMs = 365 * 24 * 60 * 60 * 1000;

      // Group by week and month for the older ones
      const keptBackups = new Set([backups[0].name]); // Always keep the newest

      backups.forEach((b, i) => {
        if (i === 0) return; // already kept

        const ageMs = now.getTime() - b.time;
        let keep = false;

        // Daily tier: within 14 days
        if (ageMs <= dailyRetentionMs) {
          keep = true;
        } else if (ageMs <= weeklyRetentionMs) {
          // Weekly tier: keep 1 per week (e.g. if it's the first one seen in that week block)
          // Simplified: we'll check if we already kept one for this week.
          // Since we are iterating newest to oldest, we can just track weeks.
          // Actually, a simple approach is to keep the backup if it's a Sunday (getDay() === 0)
          if (b.date.getDay() === 0) keep = true;
        } else if (ageMs <= monthlyRetentionMs) {
          // Monthly tier: keep 1 per month (e.g. if it's the 1st of the month)
          if (b.date.getDate() === 1) keep = true;
        }

        if (keep) {
          keptBackups.add(b.name);
        } else {
          // Delete
          try {
            fsSync.unlinkSync(b.name);
            console.log(\`Deleted old backup: \${b.name}\`);
          } catch (err) {
            console.error(\`Failed to delete old backup \${b.name}:\`, err);
          }
        }
      });
    }`;

content = content.replace(oldRetentionLogic, newRetentionLogic);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Patched backup retention.");
