import fs from 'fs';
let content = fs.readFileSync('src/components/layout/AppDrawer.tsx', 'utf8');

const newMemberSection = `
    {
      title: isBangla ? 'আমার পোর্টাল' : 'My Portal',
      roles: ['MEMBER'],
      items: [
        { id: 'DASHBOARD', icon: BarChart3, label: isBangla ? 'আমার ড্যাশবোর্ড' : 'Dashboard', roles: ['MEMBER'] },
        { id: 'MEMBER_PROFILE', icon: Users, label: isBangla ? 'আমার প্রোফাইল' : 'My Profile', roles: ['MEMBER'] },
        { id: 'MEMBER_LEDGER', icon: BookOpen, label: isBangla ? 'আমার খতিয়ান' : 'My Ledger', roles: ['MEMBER'] },
      ]
    },`;

content = content.replace("const sections = [", "const sections = [" + newMemberSection);

// Strip MEMBER from other sections
content = content.replace(/, 'MEMBER'/g, "");
content = content.replace(/'MEMBER', /g, "");
content = content.replace(/\[ 'MEMBER' \]/g, "[]");

fs.writeFileSync('src/components/layout/AppDrawer.tsx', content);
