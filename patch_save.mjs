import fs from 'fs';
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(/if \(!isDbLoading\) \{[\s\S]*?saveDatabaseToStorage\(db\);[\s\S]*?\}/m,
`if (!isDbLoading && isAuthenticated) {
      saveDatabaseToStorage(db);
    }`);

fs.writeFileSync('src/context/AppContext.tsx', content);
