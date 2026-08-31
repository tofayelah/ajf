import fs from 'fs';
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Replace the buggy `isAuthenticated` dependency for saveDatabaseToStorage
content = content.replace(/if \(!isDbLoading && isAuthenticated\) \{[\s\S]*?saveDatabaseToStorage\(db\);[\s\S]*?\}/m,
`if (!isDbLoading) {
      if (isAuthenticated) {
        saveDatabaseToStorage(db);
      }
    }`);

fs.writeFileSync('src/context/AppContext.tsx', content);
