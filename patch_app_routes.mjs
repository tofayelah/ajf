import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("case 'MEMBER_PROFILE': return <MemberProfileView />")) {
  content = content.replace(
    "case 'MEMBER_LEDGER':",
    "case 'MEMBER_PROFILE': return <MemberProfileView />;\n    case 'MEMBER_LEDGER':"
  );
  
  fs.writeFileSync('src/App.tsx', content);
}
