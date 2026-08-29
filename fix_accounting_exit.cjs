const fs = require('fs');

let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

// The replacement for requestMemberExit
const requestMemberExitReplacement = `
  static requestMemberExit(
    db: AppDatabaseState,
    params: {
      memberId: string;
      requestDate: string;
      exitType: ExitType;
      exitReason: string;
      userId: string;
      userName: string;
      
      // For Death Settlement
      dateOfDeath?: string;
      nomineeName?: string;
      nomineeRelation?: string;
      nomineeNid?: string;
      nomineeMobile?: string;
      nomineeAddress?: string;
      eligibleBenefitAmount?: number;
    }
  ) {
    // Check if there is already a pending request
    const existing = db.memberExits?.find(e => e.memberId === params.memberId && e.status !== "EXITED" && e.status !== "REJECTED" && e.status !== "REFUNDED" && e.status !== "DECEASED" && e.status !== "SETTLED");
    if (existing) {
      return { success: false, message: "An exit or settlement request is already in progress for this member." };
    }

    const member = db.members.find(m => m.memberId === params.memberId);
    if (!member) {
      return { success: false, message: "Member not found." };
    }
    
    if (member.status === 'EXITED' || member.status === 'DECEASED') {
        return { success: false, message: "Member is already exited or deceased." };
    }

    // Calculate tenure
    const joinDate = new Date(member.joiningDate);
    const reqDate = new Date(params.requestDate);
    let diffMonths = (reqDate.getFullYear() - joinDate.getFullYear()) * 12 + (reqDate.getMonth() - joinDate.getMonth());
    if (reqDate.getDate() < joinDate.getDate()) {
      diffMonths--;
    }
    const tenureYears = Math.floor(Math.max(0, diffMonths) / 12);
    const tenureMonths = Math.max(0, diffMonths) % 12;

    // Financials (using standard approach for member capital)
    const capitalDeposits = db.capitalDeposits.filter(d => d.memberId === params.memberId).reduce((sum, d) => sum + d.amount, 0);
    const memberCapital = capitalDeposits; 
    
    // Check 3 year rule
    if (tenureYears < 3 && params.exitType === "NORMAL") {
      return { success: false, message: "Member has not completed 3 years. Normal Exit is blocked." };
    }

    let eligibleRefundAmount = memberCapital;
    let serviceChargePercentage = 15; // 15% for both Normal and Early Exit
    
    let netSettlementAmount = 0;

    if (params.exitType === 'DEATH_SETTLEMENT') {
        serviceChargePercentage = 0; // 0% for death
        eligibleRefundAmount = memberCapital + (params.eligibleBenefitAmount || 0); // Include benefit
        netSettlementAmount = eligibleRefundAmount;
    }
    
    const serviceChargeAmount = (eligibleRefundAmount * serviceChargePercentage) / 100;
    const netRefundAmount = eligibleRefundAmount - serviceChargeAmount;

    let initialStatus = params.exitType === 'DEATH_SETTLEMENT' ? 'DEATH_REPORTED' : (params.exitType === 'EARLY' ? 'EARLY_EXIT_REQUESTED' : 'NORMAL_EXIT_REQUESTED');
    let auditAction = params.exitType === 'DEATH_SETTLEMENT' ? 'DEATH_REPORTED' : (params.exitType === 'EARLY' ? 'EARLY_EXIT_REQUESTED' : 'NORMAL_EXIT_REQUESTED');

    const request: MemberExitRequest = {
      exitRequestId: "ER" + Date.now(),
      memberId: params.memberId,
      requestDate: params.requestDate,
      exitType: params.exitType,
      exitReason: params.exitReason,
      
      // Death specific
      dateOfDeath: params.dateOfDeath,
      nomineeName: params.nomineeName,
      nomineeRelation: params.nomineeRelation,
      nomineeNid: params.nomineeNid,
      nomineeMobile: params.nomineeMobile,
      nomineeAddress: params.nomineeAddress,
      eligibleBenefitAmount: params.eligibleBenefitAmount || 0,
      netSettlementAmount: netSettlementAmount || netRefundAmount,
      
      membershipTenureYears: tenureYears,
      membershipTenureMonths: tenureMonths,
      memberCapital,
      totalDeposits: capitalDeposits,
      outstandingDue: 0, // calculate if needed
      outstandingLoan: 0, // calculate if needed
      eligibleRefundAmount,
      serviceChargePercentage,
      serviceChargeAmount,
      netRefundAmount,
      
      status: initialStatus as any,
      userId: params.userId,
      userName: params.userName
    };

    const newDb = {
      ...db,
      memberExits: [...(db.memberExits || []), request],
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: auditAction as AuditAction,
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: params.memberId,
        referenceId: request.exitRequestId,
        remarks: \`\${params.exitType} Exit requested: \${params.exitReason}\`
      }]
    };

    return { success: true, message: "Exit request created.", db: newDb };
  }

  static reviewMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
    }
  ) {
    const request = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!request) return { success: false, message: "Request not found." };
    if (request.status !== "NORMAL_EXIT_REQUESTED" && request.status !== "EARLY_EXIT_REQUESTED" && request.status !== "DEATH_REPORTED" && request.status !== "EXIT_REQUESTED") {
      return { success: false, message: "Invalid status for review." };
    }

    let auditAction = request.exitType === 'DEATH_SETTLEMENT' ? 'DEATH_SETTLEMENT_REVIEWED' : (request.exitType === 'EARLY' ? 'EARLY_EXIT_REVIEWED' : 'NORMAL_EXIT_REVIEWED');

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? { ...e, status: "UNDER_REVIEW" as any } : e),
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: auditAction as AuditAction,
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: request.memberId,
        referenceId: request.exitRequestId,
        remarks: "Exit request moved to under review"
      }]
    };

    return { success: true, message: "Request marked for review.", db: newDb };
  }

  static approveMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
    }
  ) {
    const request = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!request) return { success: false, message: "Request not found." };
    if (request.status !== "UNDER_REVIEW") {
      return { success: false, message: "Request must be under review to approve." };
    }
    
    if (request.userId === params.userId) {
       return { success: false, message: "You cannot approve your own request." };
    }
    
    let auditAction = request.exitType === 'DEATH_SETTLEMENT' ? 'DEATH_SETTLEMENT_APPROVED' : (request.exitType === 'EARLY' ? 'EARLY_EXIT_APPROVED' : 'NORMAL_EXIT_APPROVED');

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? { ...e, status: "APPROVED" as any, approvedByUserId: params.userId, approvedByUserName: params.userName } : e),
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: auditAction as AuditAction,
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: request.memberId,
        referenceId: request.exitRequestId,
        remarks: "Exit request approved"
      }]
    };

    return { success: true, message: "Request approved.", db: newDb };
  }

  static rejectMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      reason: string;
      userId: string;
      userName: string;
    }
  ) {
    const request = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!request) return { success: false, message: "Request not found." };
    if (request.status !== "UNDER_REVIEW") {
      return { success: false, message: "Request must be under review to reject." };
    }

    let auditAction = request.exitType === 'DEATH_SETTLEMENT' ? 'DEATH_SETTLEMENT_REJECTED' : (request.exitType === 'EARLY' ? 'EARLY_EXIT_REJECTED' : 'NORMAL_EXIT_REJECTED');

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? { ...e, status: "REJECTED" as any, rejectionReason: params.reason } : e),
      members: db.members.map(m => m.memberId === request.memberId ? { ...m, status: "ACTIVE" as any } : m), // revert status
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: auditAction as AuditAction,
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: request.memberId,
        referenceId: request.exitRequestId,
        remarks: \`Exit request rejected: \${params.reason}\`
      }]
    };

    return { success: true, message: "Request rejected.", db: newDb };
  }

  static processMemberExitRefund(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      paymentMethod: PaymentMethod;
      bankAccountId?: string;
      paymentReference?: string;
      processDate: string;
      userId: string;
      userName: string;
    }
  ) {
    // 1. Validation & FY Check
    if (this.isDateInClosedYear(db, params.processDate)) {
      return { success: false, message: "Cannot process refund in a closed financial year." };
    }

    const request = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!request) return { success: false, message: "Request not found." };
    
    if (request.status !== "APPROVED") {
      return { success: false, message: "Request is not in APPROVED status." };
    }
    
    const member = db.members.find(m => m.memberId === request.memberId);
    if (!member) return { success: false, message: "Member not found." };
    
    // Bank check
    let bankAccount = null;
    if (params.paymentMethod === 'Bank') {
       if (!params.bankAccountId) return { success: false, message: "Bank account is required for bank payment." };
       bankAccount = db.bankAccounts.find(b => b.id === params.bankAccountId || b.accountId === params.bankAccountId);
       if (!bankAccount) return { success: false, message: "Bank account not found." };
       if (bankAccount.currentBalance < request.netRefundAmount) {
         return { success: false, message: "Insufficient balance in selected bank account." };
       }
    } else if (params.paymentMethod === 'Cash') {
       if (db.cashBook.currentBalance < request.netRefundAmount) {
         return { success: false, message: "Insufficient cash balance." };
       }
    }
    
    // Duplicate check
    const existingTxn = db.cashTransactions.find(t => t.referenceId === request.exitRequestId);
    const existingBankTxn = db.bankTransactions.find(t => t.referenceId === request.exitRequestId);
    if (existingTxn || existingBankTxn) {
      return { success: false, message: "Refund already processed for this request." };
    }

    const isDeath = request.exitType === 'DEATH_SETTLEMENT';
    const finalMemberStatus = isDeath ? "DECEASED" : "EXITED";
    const finalRequestStatus = isDeath ? "SETTLED" : "REFUNDED"; // EXITED can also be used, matching instructions for request
    const netAmount = isDeath ? (request.netSettlementAmount || request.netRefundAmount) : request.netRefundAmount;
    const voucherNo = (isDeath ? "DSV" : "ERV") + Date.now();

    const newDb = { ...db };
    
    // Mark Request and Member
    newDb.memberExits = newDb.memberExits.map(e => 
      e.exitRequestId === request.exitRequestId ? {
        ...e, 
        status: finalRequestStatus as any,
        refundVoucherNo: voucherNo,
        refundPaymentMethod: params.paymentMethod,
        refundBankAccountId: params.bankAccountId,
        refundPaymentReference: params.paymentReference,
        refundProcessDate: params.processDate
      } : e
    );
    newDb.members = newDb.members.map(m => 
      m.memberId === request.memberId ? { ...m, status: finalMemberStatus as any } : m
    );

    // Create journal entries (Double Entry)
    const je: JournalEntry = {
      journalId: "JE" + Date.now(),
      date: params.processDate,
      description: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} for \${member.fullName} (\${member.memberId})\`,
      referenceType: "MEMBER_EXIT",
      referenceId: request.exitRequestId,
      userId: params.userId,
      userName: params.userName,
      entries: []
    };

    // Debit Capital (reducing capital)
    je.entries.push({
      accountId: "MEMBER_CAPITAL", // Abstract account or specific
      type: "DEBIT",
      amount: request.memberCapital,
      particulars: \`Refund of capital deposits\`
    });
    
    if (isDeath && request.eligibleBenefitAmount && request.eligibleBenefitAmount > 0) {
      je.entries.push({
        accountId: "PROFIT_DISTRIBUTION", // or ACCRUED_PROFIT
        type: "DEBIT",
        amount: request.eligibleBenefitAmount,
        particulars: \`Death settlement benefit payable\`
      });
    }

    // Credit Income (Service Charge) - if > 0
    if (request.serviceChargeAmount > 0) {
      je.entries.push({
        accountId: "SERVICE_CHARGE_INCOME",
        type: "CREDIT",
        amount: request.serviceChargeAmount,
        particulars: \`Service charge for member exit (\${request.serviceChargePercentage}%)\`
      });
    }

    // Credit Asset (Cash or Bank)
    const assetAccountId = params.paymentMethod === 'Cash' ? "CASH_IN_HAND" : (\`BANK_\${params.bankAccountId}\`);
    je.entries.push({
      accountId: assetAccountId,
      type: "CREDIT",
      amount: netAmount,
      particulars: \`Payment via \${params.paymentMethod}\`
    });

    newDb.journalEntries = [...newDb.journalEntries, je];

    // Cash/Bank Transactions
    if (params.paymentMethod === 'Cash') {
      const newBalance = newDb.cashBook.currentBalance - netAmount;
      newDb.cashBook.currentBalance = newBalance;
      newDb.cashTransactions = [...newDb.cashTransactions, {
        transactionId: "CT" + Date.now(),
        date: params.processDate,
        type: "PAYMENT",
        amount: netAmount,
        particulars: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} (\${member.memberId})\`,
        voucherNo: voucherNo,
        referenceType: "MEMBER_EXIT",
        referenceId: request.exitRequestId,
        balance: newBalance,
        userId: params.userId,
        userName: params.userName
      }];
    } else if (params.paymentMethod === 'Bank' && bankAccount) {
      const newBalance = bankAccount.currentBalance - netAmount;
      newDb.bankAccounts = newDb.bankAccounts.map(b => 
        (b.id === params.bankAccountId || b.accountId === params.bankAccountId) ? { ...b, currentBalance: newBalance } : b
      );
      newDb.bankTransactions = [...newDb.bankTransactions, {
        transactionId: "BT" + Date.now(),
        bankAccountId: bankAccount.id || bankAccount.accountId,
        date: params.processDate,
        type: "WITHDRAWAL",
        amount: netAmount,
        particulars: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} (\${member.memberId})\`,
        reference: params.paymentReference || voucherNo,
        referenceType: "MEMBER_EXIT",
        referenceId: request.exitRequestId,
        balance: newBalance,
        userId: params.userId,
        userName: params.userName,
        status: "CLEARED"
      }];
    }

    let auditAction = isDeath ? 'DEATH_SETTLEMENT_COMPLETED' : (request.exitType === 'EARLY' ? 'EARLY_EXIT_REFUNDED' : 'NORMAL_EXIT_REFUNDED');

    newDb.auditLogs = [...newDb.auditLogs, {
      auditId: "AUD" + Date.now() + 1,
      action: auditAction as AuditAction,
      userId: params.userId,
      userName: params.userName,
      dateTime: new Date().toISOString(),
      memberId: request.memberId,
      referenceId: request.exitRequestId,
      remarks: \`Processed \${params.paymentMethod} refund of ৳\${netAmount}. Voucher: \${voucherNo}\`
    }];

    return { success: true, message: "Refund processed and settlement complete.", db: newDb };
  }
`;

const startIndex = content.indexOf('static requestMemberExit(');
const processMemberExitRefundEnd = content.indexOf('// =========================================================================', startIndex);

content = content.substring(0, startIndex) + requestMemberExitReplacement.trim() + '\n\n  ' + content.substring(processMemberExitRefundEnd);

fs.writeFileSync('src/services/accounting.ts', content);
console.log('Accounting updated');
