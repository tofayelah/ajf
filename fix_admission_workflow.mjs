import fs from 'fs';

const filePath = 'src/components/admission/AdmissionWorkflowView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importReplacement = `import { formatCurrency } from '../../utils/helpers';\nimport { SOCIETY_OPENING_DATE } from '../../utils/constants';`;
content = content.replace(`import { formatCurrency } from '../../utils/helpers';`, importReplacement);

const oldJoiningDateDef = "          joiningDate: new Date().toISOString().split('T')[0],";
const newJoiningDateDef = "          joiningDate: SOCIETY_OPENING_DATE,";
content = content.replace(oldJoiningDateDef, newJoiningDateDef);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated AdmissionWorkflowView.tsx");
