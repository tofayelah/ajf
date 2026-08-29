const fs = require('fs');

let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

const startIndex = content.indexOf('  static requestMemberExit(');
if (startIndex === -1) {
    console.error("Could not find static requestMemberExit(");
    process.exit(1);
}

const replacement = `  static requestMemberExit(
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

    const request: any = {
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
      outstandingDue: 0,
      outstandingLoan: 0,
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
        action: auditAction as any,
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
        action: auditAction as any,
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
        action: auditAction as any,
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
        action: auditAction as any,
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
    if (isDateInClosedYear(params.processDate, db)) {
      return { success: false, message: "Cannot process refund in a closed financial year." };
    }

    const request = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!request) return { success: false, message: "Request not found." };
    
    if (request.status !== "APPROVED") {
      return { success: false, message: "Request is not in APPROVED status." };
    }
    
    const member = db.members.find(m => m.memberId === request.memberId);
    if (!member) return { success: false, message: "Member not found." };
    
    let currentDb = { ...db };
    const date = params.processDate;
    
    const isDeath = request.exitType === 'DEATH_SETTLEMENT';
    const finalMemberStatus = isDeath ? "DECEASED" : "EXITED";
    const finalRequestStatus = isDeath ? "SETTLED" : "REFUNDED"; 
    const netAmount = isDeath ? (request.netSettlementAmount || request.netRefundAmount) : request.netRefundAmount;
    const voucherNo = (isDeath ? "DSV" : "MREF") + Date.now().toString().slice(-6);

    const cashBankAccountId = params.paymentMethod === "Cash" ? "1000" : (params.bankAccountId || "1010");

    const jnlLines = [
      {
        accountId: "3000",
        accountName: "Member Capital (Share)",
        debit: request.memberCapital,
        credit: 0
      },
      {
        accountId: cashBankAccountId,
        accountName: params.paymentMethod === "Cash" ? "Cash in Hand" : "Bank Account",
        debit: 0,
        credit: netAmount
      }
    ];

    if (isDeath && request.eligibleBenefitAmount && request.eligibleBenefitAmount > 0) {
      jnlLines.push({
        accountId: "4000", // Using general profit account or dividend account
        accountName: "Profit Distribution", 
        debit: request.eligibleBenefitAmount,
        credit: 0
      });
    }

    if (request.serviceChargeAmount > 0) {
      jnlLines.push({
        accountId: "4110",
        accountName: "Service Charge Income",
        debit: 0,
        credit: request.serviceChargeAmount
      });
    }

    const journalRes = this.postJournalEntry(currentDb, {
      journalNo: this.generateVoucherNo(currentDb, 'JNL'),
      date,
      reference: request.exitRequestId,
      description: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} for \${member.fullName} (\${member.memberId})\`,
      sourceType: "MEMBER_EXIT",
      sourceId: request.exitRequestId,
      createdBy: params.userId,
      status: "ACTIVE"
    }, jnlLines);

    if (journalRes.success && journalRes.entry && journalRes.lines) {
      currentDb.journalEntries = [...currentDb.journalEntries, journalRes.entry];
      currentDb.journalLines = [...currentDb.journalLines, ...journalRes.lines];
    } else {
      return { success: false, message: journalRes.message || "Failed to generate journal entry" };
    }

    if (params.paymentMethod === "Cash") {
      const ct = {
        transactionId: "CT" + Date.now(),
        date,
        voucherNo,
        description: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} - \${member.fullName}\`,
        cashIn: 0,
        cashOut: netAmount,
        balance: 0,
        reference: request.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.cashTransactions = [...currentDb.cashTransactions, ct as any];
    } else {
      const bank = currentDb.bankAccounts?.find(b => b.id === params.bankAccountId);
      const bt = {
        transactionId: "BT" + Date.now(),
        date,
        voucherNo,
        description: \`\${isDeath ? 'Death Settlement' : 'Member Exit Refund'} - \${member.fullName}\`,
        deposit: 0,
        withdrawal: netAmount,
        balance: 0,
        bankAccountId: params.bankAccountId!,
        bankName: bank ? bank.bankName : "Bank",
        accountNumberMasked: bank ? bank.accountNumber : "",
        transactionNo: params.paymentReference || voucherNo,
        sourceType: "MEMBER_EXIT" as any,
        sourceId: request.exitRequestId,
        reference: request.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.bankTransactions = [...currentDb.bankTransactions, bt as any];
    }

    const newReq = {
      ...request,
      status: finalRequestStatus as any,
      refundPaymentMethod: params.paymentMethod,
      refundBankAccountId: params.bankAccountId,
      refundPaymentReference: params.paymentReference,
      refundVoucherNo: voucherNo,
      updatedAt: new Date().toISOString()
    };
    currentDb.memberExits = currentDb.memberExits.map(e => e.exitRequestId === request.exitRequestId ? newReq as any : e);
    currentDb.members = currentDb.members.map(m => m.memberId === request.memberId ? {
        ...m,
        status: finalMemberStatus as any
    } : m);

    let auditAction = isDeath ? 'DEATH_SETTLEMENT_COMPLETED' : (request.exitType === 'EARLY' ? 'EARLY_EXIT_REFUNDED' : 'NORMAL_EXIT_REFUNDED');

    currentDb.auditLogs = [...currentDb.auditLogs, {
      auditId: \`AUD-\${Date.now()}\`,
      userId: params.userId,
      userName: params.userName,
      dateTime: new Date().toISOString(),
      action: auditAction as AuditAction,
      remarks: \`Processed \${params.paymentMethod} refund of ৳\${netAmount}. Voucher: \${voucherNo}\`,
      referenceId: request.exitRequestId
    }];

    return { success: true, message: "Refund processed and member settled.", db: currentDb, voucherNo };
  }
}

export { validateJournalIntegrity };
export type { JournalIntegrityValidationResult, UnbalancedJournalDetail };
`;

const newContent = content.substring(0, startIndex) + replacement;

fs.writeFileSync('src/services/accounting.ts', newContent);
console.log("Accounting updated successfully.");
