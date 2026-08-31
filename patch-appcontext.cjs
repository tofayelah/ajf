const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const rpcHelper = `
  const executeAccountingRPC = async (action: string, args: any[]) => {
    try {
      const response = await fetch('/api/accounting/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${localStorage.getItem('authToken') || ''}\`
        },
        body: JSON.stringify({ action, params: args })
      });
      if (!response.ok) {
        throw new Error('RPC failed');
      }
      const result = await response.json();
      
      if (result && result.success) {
        const newDbResponse = await fetch('/api/sync', {
          headers: { 'Authorization': \`Bearer \${localStorage.getItem('authToken') || ''}\` }
        });
        if (newDbResponse.ok) {
           const newDb = await newDbResponse.json();
           (window as any).skipNextDbSave = true;
           setDb(newDb);
        }
      }
      
      return result;
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  };
`;

if (!content.includes('executeAccountingRPC')) {
  content = content.replace(
    '  const completeAdmission =',
    rpcHelper + '\n  const completeAdmission ='
  );
}

// Manually replace all those functions
const toReplace = [
  {
    find: `  const completeAdmission = async (params: any) => {
    const res = AccountingService.completeAdmission(db, params);
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`,
    repl: `  const completeAdmission = async (params: any) => { return executeAccountingRPC('completeAdmission', [params]); };`
  },
  {
    find: `  const deleteMemberPermanently = async (memberId: string) => {
    const res = AccountingService.deleteMemberPermanently(db, memberId, db.activeUserId || 'SYSTEM', user?.fullName || 'SYSTEM');
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`,
    repl: `  const deleteMemberPermanently = async (memberId: string) => { return executeAccountingRPC('deleteMemberPermanently', [memberId, db.activeUserId || 'SYSTEM', user?.fullName || 'SYSTEM']); };`
  }
];

const methods = [
  'deactivateMember', 'reactivateMember',
  'postCollection', 'postBulkCollection', 'reverseCollection', 'postCapitalDeposit',
  'postLoanApplication', 'approveLoan', 'rejectLoan', 'disburseLoan', 'postLoanRepayment',
  'postIncome', 'postCashToBankDeposit', 'postContraEntry', 'editDraftContraEntry',
  'deleteDraftContraEntry', 'postDraftContraEntry', 'reverseContraEntry', 'reverseAndCorrectContraEntry',
  'addBankAccount', 'updateBankAccount', 'postExpense', 'postCashTransaction', 'saveCashTransactionDraft',
  'editDraftCashTransaction', 'deleteDraftCashTransaction', 'postDraftCashTransaction',
  'reverseCashTransaction', 'reverseAndCorrectCashTransaction', 'postWelfarePayment',
  'updateWelfareTransaction', 'deleteWelfareTransaction', 'reverseWelfareTransaction',
  'postInvestmentProject', 'approveInvestment', 'rejectInvestment', 'updateInvestment',
  'deleteInvestment', 'cancelInvestment', 'executeInvestment', 'postInvestmentReturn',
  'requestMemberExit', 'reviewMemberExit', 'approveMemberExit', 'rejectMemberExit',
  'processMemberExitRefund'
];

for (const m of methods) {
  const block1 = `  const ${m} = async (...args: any[]) => {
    const res = (AccountingService as any).${m}(db, ...args);
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`;
  toReplace.push({
    find: block1,
    repl: `  const ${m} = async (...args: any[]) => { return executeAccountingRPC('${m}', args); };`
  });
  
  const block2 = `  const ${m} = async (...args: any[]) => {
    const res = AccountingService.${m}(db, ...args);
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`;
  toReplace.push({
    find: block2,
    repl: `  const ${m} = async (...args: any[]) => { return executeAccountingRPC('${m}', args); };`
  });
  
  // also handle the one with params
  const block3 = `  const ${m} = async (params: any) => {
    const res = AccountingService.${m}(db, params);
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`;
  toReplace.push({
    find: block3,
    repl: `  const ${m} = async (params: any) => { return executeAccountingRPC('${m}', [params]); };`
  });
}

toReplace.push({
  find: `  const saveDraftContraEntry = async (...args: any[]) => {
    const res = (AccountingService as any).postContraEntry(db, { ...args[0], isDraft: true, status: 'DRAFT' });
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };`,
  repl: `  const saveDraftContraEntry = async (...args: any[]) => { return executeAccountingRPC('postContraEntry', [{ ...args[0], isDraft: true, status: 'DRAFT' }]); };`
});

for (const pair of toReplace) {
  content = content.replace(pair.find, pair.repl);
}

fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
console.log('AppContext.tsx patched successfully');
