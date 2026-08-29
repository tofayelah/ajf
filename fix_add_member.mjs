import fs from 'fs';

const filePath = 'src/components/members/AddMemberModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { processImageFile } from '../../utils/imageUtils';\nimport { SOCIETY_OPENING_DATE } from '../../utils/constants';`;
content = content.replace(`import { processImageFile } from '../../utils/imageUtils';`, importReplacement);

const oldJoiningDateDef = "    initialMember?.joiningDate || new Date().toISOString().split('T')[0]";
const newJoiningDateDef = "    initialMember?.joiningDate || SOCIETY_OPENING_DATE";
content = content.replace(oldJoiningDateDef, newJoiningDateDef);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated AddMemberModal.tsx");
