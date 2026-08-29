const fs = require('fs');
const path = 'src/components/settings/BackupRestoreView.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'const { db, language, showNotification } = useApp();',
  'const { db, language, showNotification, updateSettings } = useApp();'
);

content = content.replace(
  `      linkElement.click();
      
      showNotification(isBangla ? 'ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে' : 'Backup downloaded successfully', 'success');`,
  `      linkElement.click();
      if (updateSettings) {
        updateSettings({ lastBackupDate: new Date().toISOString() });
      }
      showNotification(isBangla ? 'ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে' : 'Backup downloaded successfully', 'success');`
);

fs.writeFileSync(path, content);
