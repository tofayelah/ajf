const fs = require('fs');
const path = 'src/components/settings/SettingsView.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    downloadAnchor.remove();
    showNotification(
    isBangla ? 'ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে' : 'Backup download completed', 'success');`;

const replacement = `    downloadAnchor.remove();
    if (updateSettings) {
      updateSettings({ lastBackupDate: new Date().toISOString() });
    }
    showNotification(
    isBangla ? 'ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে' : 'Backup download completed', 'success');`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
