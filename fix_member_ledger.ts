import fs from 'fs';

const p = 'src/services/accounting.ts';
let code = fs.readFileSync(p, 'utf-8');

// We will do some targeted replacements on getComprehensiveMemberLedger

// 1. In db.collections fallback mapping, we should split LATE_FINE and MONTHLY_COLLECTION
const oldCollectionsFallback = `
    (db.collections || []).filter(c => c.memberId === memberId && c.status !== 'REVERSED' && c.status !== 'CANCELLED').forEach(c => {
      const col = c as any;
      const vNo = col.voucherNo || col.receiptNo;
      if ((col.voucherNo && processedVouchers.has(col.voucherNo)) || (col.receiptNo && processedVouchers.has(col.receiptNo))) return;
      rawItems.push({
        id: col.collectionId,
        date: col.collectionDate || col.date,
        voucherNo: vNo,
        receiptNo: col.receiptNo,
        transactionType: 'MONTHLY_COLLECTION',
        particulars: \`\${col.collectionMonth ? col.collectionMonth + ' ' : ''}Monthly Subscription / মাসিক চাঁদা\`,
        debit: 0,
        credit: col.paidAmount,
        reference: col.receiptNo || col.voucherNo,
        status: col.status || 'ACTIVE',
        sourceType: 'COLLECTION',
        sourceId: col.collectionId,
        accountCode: '2000',
        accountName: 'সদস্য সঞ্চয় ও চাঁদা তহবিল',
        createdAt: col.createdAt
      });
      if (col.voucherNo) processedVouchers.add(col.voucherNo);
      if (col.receiptNo) processedVouchers.add(col.receiptNo);
    });
`;

const newCollectionsFallback = `
    (db.collections || []).filter(c => c.memberId === memberId && c.status !== 'REVERSED' && c.status !== 'CANCELLED').forEach(c => {
      const col = c as any;
      const vNo = col.voucherNo || col.receiptNo;
      if ((col.voucherNo && processedVouchers.has(col.voucherNo)) || (col.receiptNo && processedVouchers.has(col.receiptNo))) return;
      
      const monthlyFee = Number(col.monthlyAmount) || 0;
      const discount = Number(col.discount) || 0;
      const paidAmount = Number(col.paidAmount) || 0;
      const netExpected = Math.max(0, monthlyFee - discount);
      const actualMonthlyPaid = Math.min(paidAmount, netExpected);
      const actualLateFinePaid = Math.max(0, paidAmount - netExpected);
      
      if (actualMonthlyPaid > 0) {
        rawItems.push({
          id: col.collectionId + '-M',
          date: col.collectionDate || col.date,
          voucherNo: vNo,
          receiptNo: col.receiptNo,
          transactionType: 'MONTHLY_COLLECTION',
          particulars: \`\${col.collectionMonth ? col.collectionMonth + ' ' : ''}Monthly Subscription / মাসিক চাঁদা\`,
          debit: 0,
          credit: actualMonthlyPaid,
          reference: col.receiptNo || col.voucherNo,
          status: col.status || 'ACTIVE',
          sourceType: 'COLLECTION',
          sourceId: col.collectionId,
          accountCode: '2000',
          accountName: 'সদস্য সঞ্চয় ও চাঁদা তহবিল',
          createdAt: col.createdAt
        });
      }
      
      if (actualLateFinePaid > 0) {
        rawItems.push({
          id: col.collectionId + '-LF',
          date: col.collectionDate || col.date,
          voucherNo: vNo,
          receiptNo: col.receiptNo,
          transactionType: 'LATE_FINE',
          particulars: \`\${col.collectionMonth ? col.collectionMonth + ' ' : ''}Late Fine / বিলম্ব ফি\`,
          debit: 0,
          credit: actualLateFinePaid,
          reference: col.receiptNo || col.voucherNo,
          status: col.status || 'ACTIVE',
          sourceType: 'COLLECTION',
          sourceId: col.collectionId,
          accountCode: '4300',
          accountName: 'বিলম্ব ফি',
          createdAt: col.createdAt
        });
      }

      if (col.voucherNo) processedVouchers.add(col.voucherNo);
      if (col.receiptNo) processedVouchers.add(col.receiptNo);
    });
`;

code = code.replace(oldCollectionsFallback.trim(), newCollectionsFallback.trim());

// 2. In summary calculations, replace the current logic to clearly separate them
const oldSummary = `
    // Calculate sequential running balance
    let runningBalance = 0;
    const itemsWithBalance = rawItems.map(item => {
      runningBalance += (item.credit - item.debit);
      return {
        ...item,
        balance: runningBalance
      };
    });

    // Summary calculation
    const totalCapital = (db.capitalDeposits || [])
      .filter(c => c.memberId === memberId && c.status !== 'REVERSED' && c.status !== 'CANCELLED')
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalMonthlySubscription = (db.collections || [])
      .filter(c => c.memberId === memberId && c.status !== 'REVERSED' && c.status !== 'CANCELLED')
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    const totalAdmissionFee = AccountingService.getMemberAdmissionFee(db, memberId);

    const totalBenefitProfit = rawItems
      .filter(i => ['BENEFIT', 'PROFIT_DISTRIBUTION'].includes(i.transactionType))
      .reduce((sum, i) => sum + i.credit, 0);

    const totalSettlement = rawItems
      .filter(i => ['NORMAL_EXIT', 'EARLY_EXIT', 'DEATH_SETTLEMENT', 'SETTLEMENT_PAYMENT'].includes(i.transactionType))
      .reduce((sum, i) => sum + i.debit, 0);

    // Current Member Deposited Balance = Member Capital + Monthly Subscriptions + Benefits - Settlements
    const currentMemberBalance = totalCapital + totalMonthlySubscription + totalBenefitProfit - totalSettlement;
`;

const newSummary = `
    // Summary calculation based strictly on classified rawItems to avoid double counting
    const totalCapital = rawItems
      .filter(i => i.transactionType === 'CAPITAL_DEPOSIT')
      .reduce((sum, i) => sum + i.credit - i.debit, 0);

    const totalMonthlySubscription = rawItems
      .filter(i => i.transactionType === 'MONTHLY_COLLECTION')
      .reduce((sum, i) => sum + i.credit - i.debit, 0);

    const totalAdmissionFee = rawItems
      .filter(i => i.transactionType === 'ADMISSION_FEE')
      .reduce((sum, i) => sum + i.credit, 0);

    const totalJorimana = rawItems
      .filter(i => i.transactionType === 'LATE_FEE' || i.transactionType === 'LATE_FINE')
      .reduce((sum, i) => sum + i.credit, 0);

    const totalBenefitProfit = rawItems
      .filter(i => ['BENEFIT', 'PROFIT_DISTRIBUTION'].includes(i.transactionType))
      .reduce((sum, i) => sum + i.credit, 0);

    const totalSettlement = rawItems
      .filter(i => ['NORMAL_EXIT', 'EARLY_EXIT', 'DEATH_SETTLEMENT', 'SETTLEMENT_PAYMENT'].includes(i.transactionType))
      .reduce((sum, i) => sum + i.debit, 0);

    // Current Member Deposited Balance = Member Capital + Monthly Subscriptions + Benefits - Settlements
    // Crucially: ADMISSION_FEE and JORIMANA (LATE_FINE) are NEVER included here.
    const currentMemberBalance = totalCapital + totalMonthlySubscription + totalBenefitProfit - totalSettlement;

    // Calculate sequential running balance
    // The running balance MUST only accumulate eligible refundable balance components
    let runningBalance = 0;
    const itemsWithBalance = rawItems.map(item => {
      if (item.transactionType !== 'ADMISSION_FEE' && item.transactionType !== 'LATE_FEE' && item.transactionType !== 'LATE_FINE') {
        runningBalance += (item.credit - item.debit);
      }
      return {
        ...item,
        balance: runningBalance
      };
    });
`;

code = code.replace(oldSummary.trim(), newSummary.trim());

// 3. We also need to add `totalJorimana` to the returned object type
const oldReturn = `
    return {
      member,
      totalCapital,
      totalMonthlySubscription,
      totalAdmissionFee,
      totalBenefitProfit,
      totalSettlement,
      currentMemberBalance,
      openingBalance: 0,
      closingBalance: runningBalance,
      totalDebit,
      totalCredit,
      items: filteredItems,
      allItems: itemsWithBalance
    };
`;

const newReturn = `
    return {
      member,
      totalCapital,
      totalMonthlySubscription,
      totalAdmissionFee,
      totalJorimana,
      totalBenefitProfit,
      totalSettlement,
      currentMemberBalance,
      openingBalance: 0,
      closingBalance: runningBalance,
      totalDebit,
      totalCredit,
      items: filteredItems,
      allItems: itemsWithBalance
    };
`;
code = code.replace(oldReturn.trim(), newReturn.trim());

fs.writeFileSync(p, code, 'utf-8');
console.log('accounting.ts updated');
