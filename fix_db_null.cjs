const fs = require('fs');
let content = fs.readFileSync('src/services/db.ts', 'utf8');

content = content.replace(
  'const prodDb = await fetchDatabaseFromAPI();',
  'let prodDb = await fetchDatabaseFromAPI();\n    if (!prodDb) {\n      console.warn("No prod DB found, falling back to fresh database");\n      prodDb = createFreshDatabase(false);\n    }'
);

fs.writeFileSync('src/services/db.ts', content);
