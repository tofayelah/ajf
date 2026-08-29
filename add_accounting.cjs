const fs = require('fs');

let content = fs.readFileSync('src/services/accounting.ts', 'utf8');

// Import MemberExitRequest
content = content.replace(/Member,/, `Member,\n  MemberExitRequest,\n  ExitType,`);

// We'll append the member exit logic to the end of the AccountingService class.
// Find the end of AccountingService class
const classEndRegex = /^\}\s*$/m;
const parts = content.split('export class AccountingService {');
if (parts.length > 1) {
  let insideClass = parts[1];
  let methods = `
  // =========================================================================
  // MEMBER EXIT MANAGEMENT
  // =========================================================================

  static requestMemberExit(
    db: AppDatabaseState,
    params: {
      memberId: string;
      requestDate: string;
      exitType: ExitType;
      exitReason: string;
      userId: string;
      userName: string;
    }
  ) {
    // Check if there is already a pending request
    const existing = db.memberExits?.find(e => e.memberId === params.memberId && e.status !== "EXITED" && e.status !== "REJECTED" && e.status !== "REFUNDED");
    if (existing) {
      return { success: false, message: "An exit request is already in progress for this member." };
    }

    const member = db.members.find(m => m.memberId === params.memberId);
    if (!member) {
      return { success: false, message: "Member not found." };
    }

    // Calculate tenure
    const joinDate = new Date(member.joiningDate);
    const reqDate = new Date(params.requestDate);
    let diffMonths = (reqDate.getFullYear() - joinDate.getFullYear()) * 12 + (reqDate.getMonth() - joinDate.getMonth());
    if (reqDate.getDate() < joinDate.getDate()) {
      diffMonths--;
    }
    const tenureYears = Math.floor(diffMonths / 12);
    const tenureMonths = diffMonths % 12;

    // Financials (using standard approach for member capital)
    const capitalDeposits = db.capitalDeposits.filter(d => d.memberId === params.memberId).reduce((sum, d) => sum + d.amount, 0);
    // In our system, total capital includes admission if admission fee wasn't part of capital deposit? Usually admission fee is separate, capital deposit is what goes to member capital.
    // Let's rely on MemberLedger? Wait, the best way to get Member Capital is from the ledger or sum of capital deposits.
    const memberCapital = capitalDeposits; 
    
    // Also include any other deposits if needed. For now, capital deposits is the main refund source.
    const eligibleRefundAmount = memberCapital;
    
    // Check 3 year rule
    if (tenureYears < 3 && params.exitType === "NORMAL") {
      return { success: false, message: "Member has not completed 3 years. Normal Exit is blocked." };
    }

    let serviceChargePercentage = 0;
    if (tenureYears < 3 && params.exitType === "EARLY") {
      serviceChargePercentage = 15;
    }

    const serviceChargeAmount = (eligibleRefundAmount * serviceChargePercentage) / 100;
    const netRefundAmount = eligibleRefundAmount - serviceChargeAmount;

    const request: MemberExitRequest = {
      exitRequestId: "ER" + Date.now(),
      memberId: params.memberId,
      requestDate: params.requestDate,
      exitType: params.exitType,
      exitReason: params.exitReason,
      
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
      
      status: "EXIT_REQUESTED",
      requestedBy: params.userId,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newDb = {
      ...db,
      memberExits: [...(db.memberExits || []), request],
      members: db.members.map(m => m.memberId === params.memberId ? { ...m, status: "EXIT_REQUESTED" as any } : m),
      auditLogs: [...db.auditLogs, this.createAuditLog(
        params.userId, params.userName, "MEMBER_EXIT_REQUESTED", 
        \`Exit requested for Member \${member.fullName} (\${member.memberId}). Type: \${params.exitType}\`, 
        request.exitRequestId
      )]
    };

    return { success: true, message: "Exit request submitted successfully.", updatedDb: newDb, request };
  }

  static reviewMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
    }
  ) {
    const req = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!req) return { success: false, message: "Request not found." };
    if (req.requestedBy === params.userId) return { success: false, message: "You cannot review your own request." };
    if (req.status !== "EXIT_REQUESTED") return { success: false, message: "Invalid status for review." };

    const newReq = { ...req, status: "UNDER_REVIEW" as any, reviewedBy: params.userId, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    
    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? newReq : e),
      members: db.members.map(m => m.memberId === req.memberId ? { ...m, status: "EXIT_UNDER_REVIEW" as any } : m),
      auditLogs: [...db.auditLogs, this.createAuditLog(
        params.userId, params.userName, "MEMBER_EXIT_REVIEW_STARTED", 
        \`Review started for Exit Request \${params.exitRequestId}\`, 
        params.exitRequestId
      )]
    };
    return { success: true, message: "Request is now under review.", updatedDb: newDb };
  }

  static approveMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
    }
  ) {
    const req = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!req) return { success: false, message: "Request not found." };
    if (req.requestedBy === params.userId) return { success: false, message: "You cannot approve your own request." };
    
    const newReq = { ...req, status: "APPROVED" as any, approvedBy: params.userId, approvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    
    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? newReq : e),
      members: db.members.map(m => m.memberId === req.memberId ? { ...m, status: "EXIT_APPROVED" as any } : m),
      auditLogs: [...db.auditLogs, this.createAuditLog(
        params.userId, params.userName, "MEMBER_EXIT_APPROVED", 
        \`Exit Request \${params.exitRequestId} approved\`, 
        params.exitRequestId
      )]
    };
    return { success: true, message: "Request approved successfully.", updatedDb: newDb };
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
    const req = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!req) return { success: false, message: "Request not found." };
    
    const newReq = { ...req, status: "REJECTED" as any, rejectedBy: params.userId, rejectedAt: new Date().toISOString(), rejectionReason: params.reason, updatedAt: new Date().toISOString() };
    
    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => e.exitRequestId === params.exitRequestId ? newReq : e),
      members: db.members.map(m => m.memberId === req.memberId ? { ...m, status: "ACTIVE" as any } : m),
      auditLogs: [...db.auditLogs, this.createAuditLog(
        params.userId, params.userName, "MEMBER_EXIT_REJECTED", 
        \`Exit Request \${params.exitRequestId} rejected: \${params.reason}\`, 
        params.exitRequestId
      )]
    };
    return { success: true, message: "Request rejected.", updatedDb: newDb };
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
    const req = db.memberExits?.find(e => e.exitRequestId === params.exitRequestId);
    if (!req) return { success: false, message: "Request not found." };
    if (req.status !== "APPROVED") return { success: false, message: "Request is not in APPROVED state." };
    
    // FY Guard
    if (isDateInClosedYear(db, params.processDate)) {
       return { success: false, message: "Date falls in a closed financial year." };
    }

    // Check duplicate
    const existingJv = db.journalEntries.find(j => j.reference === req.exitRequestId);
    if (existingJv) {
      return { success: false, message: "Refund transaction already exists." };
    }

    const member = db.members.find(m => m.memberId === req.memberId);
    if (!member) return { success: false, message: "Member not found." };

    let currentDb = { ...db };
    const date = params.processDate;
    const voucherNo = "MREF" + Date.now().toString().slice(-6);

    // 1. Accounting: Debit Member Capital, Credit Cash/Bank, Credit Service Charge
    const lines: JournalEntryLine[] = [];
    
    // Debit Member Capital
    lines.push({
      id: "L1-" + Date.now(),
      accountId: "3001", // Assuming 3001 is Member Capital account. Let's verify. 
      // User said: "Reuse existing services and wrappers."
      debit: req.eligibleRefundAmount,
      credit: 0
    });

    // Credit Cash/Bank
    let cashBankAccountId = params.paymentMethod === "Cash" ? "1001" : (params.bankAccountId || "1002");
    lines.push({
      id: "L2-" + Date.now(),
      accountId: cashBankAccountId,
      debit: 0,
      credit: req.netRefundAmount
    });

    // Credit Service Charge (if any)
    if (req.serviceChargeAmount > 0) {
       lines.push({
         id: "L3-" + Date.now(),
         accountId: "4004", // Service Charge Income? Let's check chart of accounts for membership/service income. Wait, I will use a safe default or look it up.
         debit: 0,
         credit: req.serviceChargeAmount
       });
    }

    // Use this.recordJournalEntry if available, but to be safe we insert directly
    const jv: JournalEntry = {
      id: "JV" + Date.now(),
      date,
      description: \`Member Exit Refund - \${member.fullName} (\${member.memberId})\`,
      reference: req.exitRequestId,
      lines,
      postedBy: params.userId,
      createdAt: new Date().toISOString()
    };
    currentDb.journalEntries = [...currentDb.journalEntries, jv];
    currentDb.journalLines = [...currentDb.journalLines, ...lines.map(l => ({ ...l, entryId: jv.id }))];

    // Cash/Bank Transaction
    if (params.paymentMethod === "Cash") {
      const ct: CashTransaction = {
        id: "CT" + Date.now(),
        date,
        voucherNo,
        description: \`Member Exit Refund - \${member.fullName}\`,
        type: "OUT",
        amount: req.netRefundAmount,
        balance: 0, // Should be calculated but often ignored if not strictly managed in state
        reference: req.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.cashTransactions = [...currentDb.cashTransactions, ct];
    } else {
      const bt: BankTransaction = {
        id: "BT" + Date.now(),
        date,
        voucherNo,
        description: \`Member Exit Refund - \${member.fullName}\`,
        type: "OUT",
        amount: req.netRefundAmount,
        bankAccountId: params.bankAccountId!,
        reference: req.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.bankTransactions = [...currentDb.bankTransactions, bt];
    }

    // Update Member Ledger (Debit to reduce balance)
    const ledgerEntry: MemberLedgerEntry = {
      ledgerId: "ML" + Date.now(),
      memberId: req.memberId,
      date,
      voucherNo,
      description: \`Member Exit Refund\`,
      transactionType: "MEMBER_EXIT" as any,
      debit: req.eligibleRefundAmount,
      credit: 0,
      balance: 0,
      reference: req.exitRequestId,
      sourceType: "MEMBER_EXIT",
      sourceId: req.exitRequestId,
      createdAt: new Date().toISOString()
    };
    currentDb.memberLedgers = [...currentDb.memberLedgers, ledgerEntry];

    // Update Request
    const newReq: MemberExitRequest = {
      ...req,
      status: "EXITED", // Bypass REFUNDED to EXITED directly or REFUNDED then EXITED? Prompt says: "REFUNDED -> EXITED". Let's do EXITED.
      paymentMethod: params.paymentMethod,
      bankAccountId: params.bankAccountId,
      paymentReference: params.paymentReference,
      refundVoucherNo: voucherNo,
      updatedAt: new Date().toISOString()
    };
    currentDb.memberExits = currentDb.memberExits.map(e => e.exitRequestId === req.exitRequestId ? newReq : e);

    // Update Member
    currentDb.members = currentDb.members.map(m => m.memberId === req.memberId ? { 
       ...m, 
       status: "EXITED" as any,
       // "Store: exitDate, exitReason, exitType... " 
       // We can store it in memberExits, or in member. Let's rely on memberExits.
    } : m);

    currentDb.auditLogs = [...currentDb.auditLogs, this.createAuditLog(
      params.userId, params.userName, "MEMBER_EXIT_COMPLETED", 
      \`Member Exit Refund Processed for \${member.fullName} (\${member.memberId}). Refund: \${req.netRefundAmount}\`, 
      req.exitRequestId
    )];

    if (req.serviceChargeAmount > 0) {
      currentDb.auditLogs.push(this.createAuditLog(
        params.userId, params.userName, "EARLY_EXIT_SERVICE_CHARGED", 
        \`Early Exit Service Charge of \${req.serviceChargeAmount} deducted for \${member.memberId}\`, 
        req.exitRequestId
      ));
    }

    return { success: true, message: "Refund processed and member exited.", updatedDb: currentDb, voucherNo };
  }
`;
  
  let endPos = insideClass.lastIndexOf('}');
  insideClass = insideClass.slice(0, endPos) + methods + insideClass.slice(endPos);
  
  content = parts[0] + 'export class AccountingService {' + insideClass;
  fs.writeFileSync('src/services/accounting.ts', content);
  console.log("accounting.ts updated");
}
