const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

code = code.replace('const token = getAuthToken();', 'const token = getInMemoryToken();');
code = code.replace('${API_URL}/api', '${API_BASE_URL}');

fs.writeFileSync('src/services/api.ts', code);
