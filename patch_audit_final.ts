import fs from 'fs';

const filePath = 'src/components/reports/AuditExceptionsView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldLogic = `  // 2. Duplicate Voucher Numbers across primary financial transaction records
  const voucherSources = new Map<string, Array<{ moduleName: string; record: any }>>();
  
  const checkVoucher = (record: any, moduleName: string) => {
    const vNo = record.voucherNo || record.loanId;
    if (!vNo) return;
    
    const existingRecords = voucherSources.get(vNo) || [];
    
    let isDuplicate = false;
    let dupDetails = '';
    
    for (const existing of existingRecords) {
      // Different modules using the same voucher number is always a collision (e.g. Income vs Expense)
      if (existing.moduleName !== moduleName) {
        isDuplicate = true;
        dupDetails = \`across \${existing.moduleName} and \${moduleName}\`;
        break;
      }
      
      // If they are in the same module, check if they are TRUE financial duplicates
      // (same amount, same account/purpose, same member)
      // We allow split records (e.g. 1000 Chanda + 20 Late Fee) if they have different amounts or purposes
      const sameAmount = (existing.record.amount || 0) === (record.amount || 0);
      const sameAccount = (existing.record.accountId || '') === (record.accountId || '');
      const sameHead = (existing.record.incomeHead || '') === (record.incomeHead || '');
      const sameMember = (existing.record.memberId || '') === (record.memberId || '');
      
      // Additional safety: if they have the exact same description, they are likely duplicates
      const sameDesc = (existing.record.description || existing.record.remarks || '') === (record.description || record.remarks || '');

      if (sameAmount && (sameAccount || sameHead) && sameMember) {
         // Even if it's a supplemental correction, if it's exactly identical in amount, account, and member for the SAME voucher, it's flagged as a duplicate.
         // If a correction is needed for the same amount/account, they should use a distinct voucher number (e.g. REC-123-CORR)
         isDuplicate = true;
         dupDetails = \`identical financial transaction in \${moduleName}\`;
         break;
      }
    }

    if (isDuplicate && existingRecords.length > 0) {
      const alreadyFlagged = exceptions.some(e => e.id === \`EXC-DUP-VOUCHER-\${vNo}\`);
      if (!alreadyFlagged) {
        exceptions.push({
          id: \`EXC-DUP-VOUCHER-\${vNo}\`,
          severity: 'CRITICAL',
          category: 'CASH_BANK',
          title: 'Duplicate Voucher Number Detected (দ্বৈত ভাউচার নম্বর)',
          description: \`Voucher No "\${vNo}" has duplicate financial transactions (\${dupDetails}).\`,
          referenceId: vNo,
          voucherNo: vNo,
          suggestedAction: 'Inspect records using this voucher and remove or re-assign duplicate financial transactions.'
        });
      }
    }
    
    existingRecords.push({ moduleName, record });
    voucherSources.set(vNo, existingRecords);
  };`;

const newLogic = `  // 2. Duplicate Voucher Numbers across primary financial transaction records
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
        dupDetails = \`Voucher assigned to multiple members (\${existing.record.memberId} vs \${record.memberId})\`;
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
              dupDetails = \`True duplicate financial transaction (same amount and head: \${head1})\`;
              break;
            }
          }
        }
      }
    }

    if (isDuplicate) {
      const alreadyFlagged = exceptions.some(e => e.id === \`EXC-DUP-VOUCHER-\${vNo}\`);
      if (!alreadyFlagged) {
        exceptions.push({
          id: \`EXC-DUP-VOUCHER-\${vNo}\`,
          severity: 'CRITICAL',
          category: 'CASH_BANK',
          title: 'Duplicate Voucher Number Detected (দ্বৈত ভাউচার নম্বর)',
          description: \`Voucher No "\${vNo}" has duplicate financial transactions (\${dupDetails}).\`,
          referenceId: vNo,
          voucherNo: vNo,
          suggestedAction: 'Inspect records using this voucher and remove or re-assign duplicate financial transactions.'
        });
      }
    }
    
    existingRecords.push({ moduleName, record });
    voucherSources.set(vNo, existingRecords);
  };`;

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Patched successfully!");
} else {
    console.log("Could not find the exact old logic to replace. Let me do a targeted replace.");
}
