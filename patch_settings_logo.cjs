const fs = require('fs');

let content = fs.readFileSync('src/components/settings/SettingsView.tsx', 'utf8');

// We will replace the image rendering block for orgLogoUrl to just always use AJFLogo.
content = content.replace(/\{formData\.orgLogoUrl \? \([\s\S]*?\([\s\S]*?<AJFLogo variant="md" className="w-20 h-20" alt="Organization Logo" \/>\n\s*?\)\}/, '<AJFLogo variant="md" className="w-20 h-20" alt="Organization Logo" />');

fs.writeFileSync('src/components/settings/SettingsView.tsx', content, 'utf8');
console.log('Patched SettingsView.tsx to always use canonical logo');
