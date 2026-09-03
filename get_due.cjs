const fs = require('fs');

const db = JSON.parse(fs.readFileSync('database.json', 'utf8'));
const memberId = 'AJM-000038';

// Simple calculation for due based on current structure.
// But let's look at what the backend does.
// I will just read the output from server by hitting an endpoint if possible, or replicate it.
