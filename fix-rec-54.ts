import fs from 'fs';
import { AccountingService } from './src/services/accounting';

const dbPath = 'database.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const recNo = 'REC-2026-000054';
const memberId = 'AJM-000038';
const monthToRemove = '2026-08';

console.log(`Starting correction for ${recNo} - removing ${monthToRemove}`);

// 1. Remove from collections
const cols = db.collections.filter(c => c.receiptNo === recNo || c.voucherNo === recNo);
const colToRemove = cols.find(c => c.collectionMonth === monthToRemove);
if (colToRemove) {
    const colId = colToRemove.collectionId;
    db.collections = db.collections.filter(c => c.collectionId !== colId);
    console.log(`Removed collection: ${colId}`);
}

// 2. Update incomes
const income = db.incomes.find(i => (i.voucherNo === recNo || i.reference === recNo) && i.amount > 0);
if (income) {
    if (income.amount === 3000) {
        income.amount = 2000;
        income.remarks = (income.remarks || '').replace('3 মাসের', '2 মাসের').replace('2026-08', '2026-07');
        console.log(`Updated income ${income.incomeId} to amount ${income.amount}`);
    }
}

// 3. Update journals
const journal = db.journalEntries.find(j => j.reference === recNo || j.sourceId === recNo);
if (journal) {
    let jId = journal.journalId || journal.id;
    if (db.journalLines) {
        db.journalLines = db.journalLines.map(l => {
            if (l.journalId === jId || l.journalEntryId === jId) {
                if (l.debit === 3000) l.debit = 2000;
                if (l.credit === 3000) l.credit = 2000;
            }
            return l;
        });
    } else {
        // If embedded
        journal.lines?.forEach(l => {
            if (l.debit === 3000) l.debit = 2000;
            if (l.credit === 3000) l.credit = 2000;
        });
    }
    console.log(`Updated journal lines for ${jId}`);
}

// 4. Update cash transactions
const cashIndex = db.cashTransactions.findIndex(c => c.voucherNo === recNo || c.sourceId === recNo);
if (cashIndex !== -1) {
    if (db.cashTransactions[cashIndex].inflow === 3000) {
        db.cashTransactions[cashIndex].inflow = 2000;
        // Recalculate balances
        for (let i = cashIndex; i < db.cashTransactions.length; i++) {
            db.cashTransactions[i].balance -= 1000;
        }
        console.log('Updated cash transactions and balances.');
    }
}

// 5. Update member ledgers
if (db.memberLedgers) {
    const mlIndex = db.memberLedgers.findIndex(l => (l.voucherNo === recNo || l.receiptNo === recNo) && l.particulars && l.particulars.includes(monthToRemove));
    if (mlIndex !== -1) {
        db.memberLedgers.splice(mlIndex, 1);
        console.log(`Removed member ledger entry for ${monthToRemove}`);
        // adjust subsequent member balances
        const allLedgers = db.memberLedgers.filter(l => l.memberId === memberId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let bal = 0;
        allLedgers.forEach(l => {
            bal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
            l.balance = bal;
        });
    }
}

// 6. Update member balances in members array
const member = db.members.find(m => m.memberId === memberId);
if (member) {
    // Only reduce if not already reduced
    // Wait, how do I know if I already reduced it? I'll check current balance against ledger
    member.monthlySubscriptionBalance = (member.monthlySubscriptionBalance || 3000) - 1000;
    member.totalBalance = (member.totalBalance || 8000) - 1000;
    console.log(`Updated member balances. New total: ${member.totalBalance}`);
}

// Save db
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('Correction completed and saved successfully.');
