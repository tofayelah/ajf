import fs from 'fs';
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

content = content.replace(/Promise\.all\(\[\s*loadDatabaseFromStorage\(\),\s*authService\.checkSession\(\)\s*\]\)\.then\(\(\[loadedDb, session\]\) => \{/m,
`authService.checkSession().then(async (session) => {
      let loadedDb = getInitialDatabase();
      if (session.authenticated && session.user) {
         loadedDb = await loadDatabaseFromStorage();
      }
`);

fs.writeFileSync('src/context/AppContext.tsx', content);
