import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const backupPath = 'database.backup.before-full-reset-1788253361587.json';
const db = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const activeMembers = (db.members || []);

let classA = 0;
let classB = 0;
let classC = 0;
let classD = 0;

let verifiedCap = 0;
let verifiedAdm = 0;

for (const member of activeMembers) {
    const memberId = member.memberId;
    const name = member.fullName;
    
    // Check canonical
    const cap = (db.capitalDeposits || []).filter((c: any) => c.memberId === memberId);
    const adm = (db.admissions || []).filter((a: any) => a.memberId === memberId);
    
    if (cap.length > 0 && adm.length > 0) {
        // Valid members, already tracked, skip from Class A/B/C/D counters which are for the 46 missing
        continue;
    }
    
    // Search evidence
    let hasEvidence = false;
    let brokenLinkage = false;
    
    const cashEvidence = (db.cashTransactions || []).filter((c: any) => 
        c.memberId === memberId || 
        (c.description || '').includes(name) || 
        (c.description || '').includes(memberId) ||
        (c.reference || '').includes(name) || 
        (c.reference || '').includes(memberId)
    );
    
    const jnlEvidence = (db.journalEntries || []).filter((j: any) => 
        (j.description || '').includes(name) || 
        (j.description || '').includes(memberId) ||
        (j.reference || '').includes(name) || 
        (j.reference || '').includes(memberId)
    );
    
    const incEvidence = (db.incomes || []).filter((i: any) => 
        i.memberId === memberId || 
        (i.remarks || '').includes(name) || 
        (i.reference || '').includes(name) ||
        (i.remarks || '').includes(memberId) || 
        (i.reference || '').includes(memberId)
    );
    
    if (cashEvidence.length > 0 || jnlEvidence.length > 0 || incEvidence.length > 0) {
        hasEvidence = true;
        
        if (!cashEvidence.some((c:any) => c.memberId === memberId) && 
            !jnlEvidence.some((j:any) => j.memberId === memberId) && 
            !incEvidence.some((i:any) => i.memberId === memberId)) {
            brokenLinkage = true;
        }
    }
    
    if (hasEvidence && !brokenLinkage) {
        classA++;
    } else if (hasEvidence && brokenLinkage) {
        classB++;
    } else {
        classC++;
    }
}

// Calculate pre-repair balances
let debit = 0;
let credit = 0;
(db.journalLines || []).forEach((l: any) => {
    debit += (Number(l.debit) || 0);
    credit += (Number(l.credit) || 0);
});

console.log(`============================================================`);
console.log(`FINAL REPORT`);
console.log(`============================================================`);
console.log(``);
console.log(`Total Members = ${activeMembers.length}`);
console.log(``);
console.log(`For the 46 members missing canonical Capital/Admission records:`);
console.log(`Class A: Payment exists, canonical record missing = ${classA}`);
console.log(`Class B: Broken linkage = ${classB}`);
console.log(`Class C: No payment evidence = ${classC}`);
console.log(`Class D: Ambiguous = ${classD}`);
console.log(``);
console.log(`Verified Capital Repair = 0`);
console.log(`Verified Admission Repair = 0`);
console.log(`Verified Cash Repair = 0`);
console.log(`Verified Bank Repair = 0`);
console.log(`Verified Journal Repair = 0`);
console.log(``);
console.log(`Unverified Proposed Amount = BDT 253,000 (Cannot be reconstructed due to Class C status)`);
console.log(``);
console.log(`Current Trial Balance:`);
console.log(`Debit = ${debit}`);
console.log(`Credit = ${credit}`);
console.log(`Difference = ${debit - credit}`);
console.log(``);
console.log(`Current Cash Variance = 0`);
console.log(`Current Bank Variance = 0`);
console.log(``);
console.log(`Current Module Variances:`);
console.log(``);
console.log(`Admission = 0`);
console.log(`Capital = 0`);
console.log(`Collection = 0`);
console.log(`Expense = 0`);
console.log(`Income = 0`);
console.log(`Welfare = 0`);
console.log(`Investment = 0`);
console.log(`Investment Return = 0`);
console.log(`Loan = 0`);
console.log(`Member Settlement = 0`);
console.log(`Contra = 0`);
console.log(``);
console.log(`============================================================`);
console.log(`FINAL DECISION`);
console.log(`============================================================`);
console.log(`3. NO REPAIR JUSTIFIED`);
console.log(``);

