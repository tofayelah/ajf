import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('src');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/'SUPER_ADMIN'/g, "'ADMIN'");
    content = content.replace(/"SUPER_ADMIN"/g, '"ADMIN"');
    content = content.replace(/'FINANCE_MANAGER'/g, "'ACCOUNTANT'");
    content = content.replace(/"FINANCE_MANAGER"/g, '"ACCOUNTANT"');
    content = content.replace(/'PRESIDENT'/g, "'ADMIN'");
    content = content.replace(/"PRESIDENT"/g, '"ADMIN"');
    content = content.replace(/'GENERAL_SECRETARY'/g, "'ADMIN'");
    content = content.replace(/"GENERAL_SECRETARY"/g, '"ADMIN"');
    content = content.replace(/'TREASURER'/g, "'ACCOUNTANT'");
    content = content.replace(/"TREASURER"/g, '"ACCOUNTANT"');
    content = content.replace(/'COMMITTEE_MEMBER'/g, "'AUDITOR'");
    content = content.replace(/"COMMITTEE_MEMBER"/g, '"AUDITOR"');
    content = content.replace(/'VIEWER'/g, "'AUDITOR'");
    content = content.replace(/"VIEWER"/g, '"AUDITOR"');
    
    // clean up redundant roles again
    content = content.replace(/activeUser\?\.role === 'ADMIN' \|\| activeUser\?\.role === 'ADMIN'/g, "activeUser?.role === 'ADMIN'");
    content = content.replace(/currentUser\?\.role === 'ADMIN' \|\| currentUser\?\.role === 'ADMIN'/g, "currentUser?.role === 'ADMIN'");
    content = content.replace(/userRole === 'ADMIN' \|\| userRole === 'ADMIN'/g, "userRole === 'ADMIN'");
    content = content.replace(/user\.role === 'ADMIN' \|\| user\.role === 'ADMIN'/g, "user.role === 'ADMIN'");
    
    // string array deduplication
    content = content.replace(/\[\s*'ADMIN'\s*,\s*'ADMIN'\s*\]/g, "['ADMIN']");
    content = content.replace(/\[\s*'ADMIN'\s*,\s*'ADMIN'\s*,\s*'ACCOUNTANT'\s*\]/g, "['ADMIN', 'ACCOUNTANT']");
    content = content.replace(/\[\s*'ADMIN'\s*,\s*'ADMIN'\s*,\s*'ACCOUNTANT'\s*,\s*'MEMBER'\s*\]/g, "['ADMIN', 'ACCOUNTANT', 'MEMBER']");
    content = content.replace(/\[\s*'ADMIN'\s*,\s*'ADMIN'\s*,\s*'ACCOUNTANT'\s*,\s*'ACCOUNTANT'\s*,\s*'ADMIN'\s*,\s*'ADMIN'\s*,\s*'ACCOUNTANT'\s*\]/g, "['ADMIN', 'ACCOUNTANT']");

    if (content !== original) {
        fs.writeFileSync(file, content);
    }
}
