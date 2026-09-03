const exceptions: any[] = [];
const voucherSources = new Map<string, Array<{ moduleName: string; record: any }>>();

const checkVoucher = (record: any, moduleName: string) => {
    const vNo = record.voucherNo || record.loanId;
    if (!vNo) return;
    
    const existingRecords = voucherSources.get(vNo) || [];
    
    let isDuplicate = false;
    let dupDetails = '';
    
    for (const existing of existingRecords) {
      // RULE 2: Different member under same voucher
      const hasMember1 = Boolean(existing.record.memberId);
      const hasMember2 = Boolean(record.memberId);
      if (hasMember1 && hasMember2 && existing.record.memberId !== record.memberId) {
        isDuplicate = true;
        dupDetails = `Voucher assigned to multiple members (${existing.record.memberId} vs ${record.memberId})`;
        break;
      }
      
      // RULE 3 & 6: Same Member + Same Financial Component (TRUE DUPLICATE)
      const isActive1 = ['POSTED', 'ACTIVE', 'APPROVED'].includes(existing.record.status?.toUpperCase() || 'POSTED');
      const isActive2 = ['POSTED', 'ACTIVE', 'APPROVED'].includes(record.status?.toUpperCase() || 'POSTED');
      
      if (isActive1 && isActive2) {
        if (existing.record.memberId === record.memberId) {
          const sameAmount = (existing.record.amount || existing.record.paidAmount || 0) === (record.amount || record.paidAmount || 0);
          
          const head1 = existing.record.incomeHead || existing.record.expenseHead || existing.record.accountId || existing.record.type || '';
          const head2 = record.incomeHead || record.expenseHead || record.accountId || record.type || '';
          const sameHead = head1 === head2;
          
          if (sameAmount && sameHead && head1 !== '') {
            const sourceType1 = existing.record.sourceType || '';
            const sourceType2 = record.sourceType || '';
            const isCorrection = (sourceType1 !== sourceType2) && (sourceType1.includes('CORRECTION') || sourceType2.includes('CORRECTION') || sourceType1.includes('REVERSAL') || sourceType2.includes('REVERSAL'));
            
            if (!isCorrection) {
              isDuplicate = true;
              dupDetails = `True duplicate financial transaction (same amount and head: ${head1})`;
              break;
            }
          }
        }
      }
    }

    if (isDuplicate) {
        const alreadyFlagged = exceptions.some(e => e.id === `EXC-DUP-VOUCHER-${vNo}`);
        if (!alreadyFlagged) {
            exceptions.push({
                id: `EXC-DUP-VOUCHER-${vNo}`,
                vNo: vNo,
                title: `Duplicate Voucher No "${vNo}" - ${dupDetails}`
            });
        }
    }
    
    existingRecords.push({ moduleName, record });
    voucherSources.set(vNo, existingRecords);
};

// Clean exceptions for each run
const runTest = (name: string, records: any[]) => {
    exceptions.length = 0;
    voucherSources.clear();
    records.forEach(r => checkVoucher(r.rec, r.mod));
    const flagged = exceptions.length > 0;
    console.log(`Test: ${name} -> Flagged: ${flagged}`);
    if (flagged) {
        exceptions.forEach(e => console.log(`   Reason: ${e.title}`));
    }
}

// Case A: Same voucher, same module, same amount, same member, same head (True Duplicate)
runTest("CASE A (True Duplicate) - Exp: true", [
    { mod: 'Income', rec: { voucherNo: 'VCH-A', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-A', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } }
]);

// Case B: Same voucher, same module, different amount, same member, different head (Legitimate Split)
runTest("CASE B (Legitimate Split) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-B', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-B', amount: 20, memberId: 'M-1', incomeHead: 'Late Fee' } }
]);

// Case C: Same voucher, same module, same amount, different member (Typo/Reuse of Receipt No)
runTest("CASE C (Different Member Same Voucher) - Exp: true", [
    { mod: 'Income', rec: { voucherNo: 'VCH-C', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-C', amount: 1000, memberId: 'M-2', incomeHead: 'Chanda' } }
]);

// Case D: Same voucher, different module (Cross-Module legitimate split? e.g. combined receipt)
runTest("CASE D (Cross Module Shared Receipt) - Exp: false", [
    { mod: 'Capital Deposit', rec: { voucherNo: 'VCH-D', amount: 5000, memberId: 'M-1' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-D', amount: 1000, memberId: 'M-1' } }
]);

// Case E: Original + Reversal (Negative Amount)
runTest("CASE E (Reversal) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-E', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-E', amount: -1000, memberId: 'M-1', incomeHead: 'Chanda Reversal' } }
]);

// Case F: Two Independently posted identical transactions
runTest("CASE F (Independently Posted Identical) - Exp: true", [
    { mod: 'Expense', rec: { voucherNo: 'VCH-F', amount: 500, memberId: 'M-0', accountId: 'EXP-1' } },
    { mod: 'Expense', rec: { voucherNo: 'VCH-F', amount: 500, memberId: 'M-0', accountId: 'EXP-1' } }
]);

// Case G: Same receipt with Chanda + Late Fee + Capital
runTest("CASE G (Combined Receipt) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-G', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-G', amount: 20, memberId: 'M-1', incomeHead: 'Late Fee' } },
    { mod: 'Capital Deposit', rec: { voucherNo: 'VCH-G', amount: 5000, memberId: 'M-1', incomeHead: 'Capital' } }
]);

// Case H: Original + legitimate reversal/correction with same amount/head but one is marked as REVERSED
runTest("CASE H (Same amount/head but reversed status) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-H', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda', status: 'POSTED' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-H', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda', status: 'REVERSED' } }
]);

// Case I: Same voucher + different members + different modules.
runTest("CASE I (Different Members Cross Module) - Exp: true", [
    { mod: 'Income', rec: { voucherNo: 'VCH-I', amount: 1000, memberId: 'M-1' } },
    { mod: 'Expense', rec: { voucherNo: 'VCH-I', amount: 500, memberId: 'M-2' } }
]);

// Case J: Same voucher + same member + same amount but different accounting heads.
runTest("CASE J (Same amount different head) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-J', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-J', amount: 1000, memberId: 'M-1', incomeHead: 'Donation' } }
]);

// Case K: Same voucher + same member + same head but different amounts.
runTest("CASE K (Same head different amount) - Exp: false", [
    { mod: 'Income', rec: { voucherNo: 'VCH-K', amount: 1000, memberId: 'M-1', incomeHead: 'Chanda' } },
    { mod: 'Income', rec: { voucherNo: 'VCH-K', amount: 500, memberId: 'M-1', incomeHead: 'Chanda' } }
]);

