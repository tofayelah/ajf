const fs = require('fs');
let code = fs.readFileSync('src/components/committee/CommitteeManagementView.tsx', 'utf8');

code = code.replace(/const { setDb, showNotification, language } = useApp\(\);\n  const isBangla = language === "bn";/, '');
code = code.replace(/const { db, activeUser, language } = useApp\(\);\n  const isBangla = language === "bn";/, 'const { db, activeUser, language, setDb, showNotification } = useApp();\n  const isBangla = language === "bn";');

fs.writeFileSync('src/components/committee/CommitteeManagementView.tsx', code);
