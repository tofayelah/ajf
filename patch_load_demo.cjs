const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const targetStr = `const loadDemoData = async () => {`;
const newStr = `const loadDemoData = async () => {
    if (import.meta.env.VITE_APP_MODE === "production") {
      console.warn("BLOCKED: Cannot load demo data in production.");
      showNotification("Demo data disabled in production mode.", "error");
      return;
    }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
console.log('Updated loadDemoData');
