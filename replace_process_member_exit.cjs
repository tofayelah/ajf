const fs = require('fs');
let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

const newMethod = `  static processMemberExitRefund(
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

    const member = db.members.find(m => m.memberId === req.memberId);
    if (!member) return { success: false, message: "Member not found." };
    let currentDb = { ...db };
    const date = params.processDate;
    const voucherNo = "MREF" + Date.now().toString().slice(-6);

    const cashBankAccountId = params.paymentMethod === "Cash" ? "1000" : (params.bankAccountId || "1010");

    const jnlLines = [
      {
        accountId: "3000",
        accountName: "Member Capital (Share)",
        debit: req.eligibleRefundAmount,
        credit: 0
      },
      {
        accountId: cashBankAccountId,
        accountName: params.paymentMethod === "Cash" ? "Cash in Hand" : "Bank Account",
        debit: 0,
        credit: req.netRefundAmount
      }
    ];

    if (req.serviceChargeAmount > 0) {
      jnlLines.push({
        accountId: "4110",
        accountName: "Service Charge Income",
        debit: 0,
        credit: req.serviceChargeAmount
      });
    }

    const journalRes = this.postJournalEntry(currentDb, {
      journalNo: this.generateVoucherNo(currentDb, 'JNL'),
      date,
      reference: req.exitRequestId,
      description: \`Member Exit Refund - \${member.fullName} (\${member.memberId})\`,
      sourceType: "MEMBER_EXIT",
      sourceId: req.exitRequestId,
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
        description: \`Member Exit Refund - \${member.fullName}\`,
        cashIn: 0,
        cashOut: req.netRefundAmount,
        balance: 0,
        reference: req.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.cashTransactions = [...currentDb.cashTransactions, ct];
    } else {
      const bank = currentDb.bankAccounts?.find(b => b.accountId === params.bankAccountId);
      const bt = {
        transactionId: "BT" + Date.now(),
        date,
        voucherNo,
        description: \`Member Exit Refund - \${member.fullName}\`,
        deposit: 0,
        withdrawal: req.netRefundAmount,
        balance: 0,
        bankAccountId: params.bankAccountId!,
        bankName: bank ? bank.bankName : "Bank",
        accountNumberMasked: bank ? bank.accountNo : "",
        reference: req.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.bankTransactions = [...currentDb.bankTransactions, bt];
    }

    const newReq = {
      ...req,
      status: "EXITED" as any,
      paymentMethod: params.paymentMethod,
      bankAccountId: params.bankAccountId,
      paymentReference: params.paymentReference,
      refundVoucherNo: voucherNo,
      updatedAt: new Date().toISOString()
    };
    currentDb.memberExits = currentDb.memberExits.map(e => e.exitRequestId === req.exitRequestId ? newReq : e);

    currentDb.members = currentDb.members.map(m => m.memberId === req.memberId ? {
        ...m,
        status: "EXITED" as any
    } : m);

    currentDb.auditLogs = [...currentDb.auditLogs, {
      auditId: \`AUD-\${Date.now()}\`,
      userId: params.userId,
      userName: params.userName,
      dateTime: new Date().toISOString(),
      module: 'MEMBER_EXIT',
      action: 'MEMBER_EXIT_COMPLETED',
      description: \`Refund Processed for \${member.fullName} (\${member.memberId}). Refund: \${req.netRefundAmount}\`,
      referenceId: req.exitRequestId
    }];

    if (req.serviceChargeAmount > 0) {
      currentDb.auditLogs.push({
        auditId: \`AUD-\${Date.now()}-SC\`,
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        module: 'MEMBER_EXIT',
        action: 'MEMBER_EXIT_COMPLETED',
        description: \`Service Charge \${req.serviceChargeAmount} deducted for \${member.memberId}\`,
        referenceId: req.exitRequestId
      });
    }

    return { success: true, message: "Refund processed and member exited.", updatedDb: currentDb, voucherNo };
  }
`;

// Replace it! I need to slice from "static processMemberExitRefund" to the end of that method.
// Since it's the last method in the file before the end of the class, I can just slice to the closing brace.
const searchStr = 'static processMemberExitRefund(';
let start = acc.indexOf(searchStr);
if (start !== -1) {
  let methodBodyStr = acc.slice(start);
  let endIndex = methodBodyStr.indexOf('  }\n}') + 3; // Find the end of the class!
  let afterStr = methodBodyStr.slice(endIndex);
  
  let newAcc = acc.slice(0, start) + newMethod + '\n}\n\n' + 'export { validateJournalIntegrity };\nexport type { JournalIntegrityValidationResult, UnbalancedJournalDetail };';
  
  fs.writeFileSync('src/services/accounting.ts', newAcc);
  console.log('Replaced processMemberExitRefund');
}
