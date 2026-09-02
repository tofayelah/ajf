import fs from 'fs';
let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

// Inside getComprehensiveMemberLedger, we can track if we've added an admission fee.
// Since a member only pays admission once, we can just use a boolean flag.

const blockStart = content.indexOf('const rawItems: {');
if (blockStart !== -1) {
    // Find the end of rawItems array declaration
    const arrayDeclEnd = content.indexOf('}[] = [];', blockStart);
    if (arrayDeclEnd !== -1) {
        const insertionPoint = arrayDeclEnd + '}[] = [];'.length;
        
        let newContent = content.slice(0, insertionPoint) + `\n    let hasAddedAdmission = false;` + content.slice(insertionPoint);
        
        // Now replace `rawItems.push({ ... transactionType: 'ADMISSION_FEE'` with a check.
        // There are a few places where ADMISSION_FEE is pushed.
        newContent = newContent.replace(/transactionType: 'ADMISSION_FEE',/g, "transactionType: 'ADMISSION_FEE',");
        
        // Actually, the best way to filter duplicate admission fees is right before sorting.
        // We can just filter rawItems.
        const sortStart = newContent.indexOf('// Sort chronologically');
        if (sortStart !== -1) {
            const filterCode = `
    // Deduplicate admission fees (a member can only have one admission fee)
    const admissionItems = rawItems.filter(i => i.transactionType === 'ADMISSION_FEE');
    if (admissionItems.length > 1) {
        // Keep the one from db.incomes if it exists, or just the first one
        const incomeAdm = admissionItems.find(i => i.id.startsWith('INC-'));
        const admToKeep = incomeAdm || admissionItems[0];
        
        // Remove all admission fees
        for (let i = rawItems.length - 1; i >= 0; i--) {
            if (rawItems[i].transactionType === 'ADMISSION_FEE' && rawItems[i].id !== admToKeep.id) {
                rawItems.splice(i, 1);
            }
        }
    }
`;
            newContent = newContent.slice(0, sortStart) + filterCode + newContent.slice(sortStart);
            fs.writeFileSync('src/services/accounting.ts', newContent);
            console.log('Admission fee deduplication applied.');
        }
    }
}
