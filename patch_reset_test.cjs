const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const targetStr = `const resetTestData = async (): Promise<boolean> => {`;
const newStr = `const resetTestData = async (): Promise<boolean> => {
    if (import.meta.env.VITE_APP_MODE === "production") {
      console.warn("BLOCKED: Cannot reset test data in production.");
      showNotification("Test reset disabled in production mode.", "error");
      return false;
    }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
console.log('Updated resetTestData');
