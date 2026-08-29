const fs = require('fs');
const db = JSON.parse(fs.readFileSync('database.json', 'utf-8'));
// We load from dist/server.cjs or src using tsx if we need to. Let's just use tsx.
