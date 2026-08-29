import fs from 'fs';

const filePath = 'src/services/accounting.ts';
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { generateId } from './db';\nimport { SOCIETY_OPENING_DATE } from '../utils/constants';`;
content = content.replace(`import { generateId } from './db';`, importReplacement);

content = content.replace(/params\.memberData\.joiningDate \|\| '2026-06-01'/g, "params.memberData.joiningDate || SOCIETY_OPENING_DATE");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated accounting.ts imports");
