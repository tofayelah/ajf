const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
const importTarget = "import { GlobalSearchModal } from './components/layout/GlobalSearchModal';";
const importReplacement = importTarget + "\nimport { BackupPromptAlert } from './components/layout/BackupPromptAlert';";

content = content.replace(importTarget, importReplacement);

// Render before main element
const layoutTarget = `<main className="flex-1 overflow-y-auto pb-16 md:pb-0">`;
const layoutReplacement = `<BackupPromptAlert />\n      ` + layoutTarget;

content = content.replace(layoutTarget, layoutReplacement);

fs.writeFileSync(path, content);
