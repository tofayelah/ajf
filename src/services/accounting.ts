import { SOCIETY_OPENING_DATE } from "../utils/constants";
  import { AppDatabaseState } from './db';
import {
  validateJournalIntegrity,
  JournalIntegrityValidationResult,
  UnbalancedJournalDetail,
  verifyVoucherRangeBalance,
  VoucherRangeFilter,
  VoucherRangeValidationResult,
  VoucherBalanceDiscrepancy,
  VoucherBalanceSummary,
  VoucherLineDetail,
  validateCashMovementsReconciliation,
  CashMovementReconciliationResult,
  CashReconciliationItem,
  runComprehensiveDiagnosticAudit,
  ComprehensiveIntegrityReport,
  auditAccountingIntegrity,
  AccountingIntegrityAuditReport,
  getAdmissionReconciliationDebugReport,
  AdmissionReconciliationDebugReport,
  getCashBookTransactionsForSource,
  reconcileCashBookWithSubLedger,
  getComprehensiveReconciliationTrace,
  MemberFinancialChainTrace
} from '../utils/accountingIntegrity';
import { isDateInClosedYear } from '../utils/fyGuard';
import {
  Collection,
  CapitalDeposit,
  LoanApplication,
  LoanRepayment,
  Income,
  Expense,
  Investment,
  InvestmentStatus,
  WelfareFundTransaction,
  MemberLedgerEntry,
  JournalEntry,
  JournalEntryLine,
  CashTransaction,
  BankTransaction,
  BankAccount,
  ContraTransaction,
  ContraType,
  AuditLog,
  PaymentMethod,
  Member,
  MemberExitRequest,
  ExitType,
  Admission,
  Nominee,
  IncomeStatus,
  ExpenseStatus,
  LateFeeWaiver
} from '../types';
import {
  calculateInvestmentOutstanding,
  getInvestmentStatus,
  InvestmentService
} from './InvestmentService';
import { ACCOUNT_CODES, resolveCanonicalAccount } from '../utils/accountMapping';

export {
  calculateInvestmentOutstanding,
  getInvestmentStatus,
  InvestmentService,
  ACCOUNT_CODES
};

export class AccountingService {

  static calculateInvestmentOutstanding(investment: Partial<Investment> | any): number {
    return calculateInvestmentOutstanding(investment);
  }

  static getInvestmentStatus(investment: Partial<Investment> | any): InvestmentStatus {
    return getInvestmentStatus(investment);
  }

  static auditAccountingIntegrity(db: AppDatabaseState): AccountingIntegrityAuditReport {
    return auditAccountingIntegrity(db);
  }

  static getAdmissionReconciliationDebugReport(db: AppDatabaseState): AdmissionReconciliationDebugReport {
    return getAdmissionReconciliationDebugReport(db);
  }

  static getCashBookTransactionsForSource(
    db: AppDatabaseState,
    options: {
      sourceType?: string;
      sourceId?: string;
      memberId?: string;
      voucherNo?: string;
      accountId?: string;
      dateRange?: { startDate?: string; endDate?: string };
      includeDrafts?: boolean;
    }
  ): CashTransaction[] {
    return getCashBookTransactionsForSource(db, options);
  }

  static reconcileCashBookWithSubLedger(
    db: AppDatabaseState,
    dateRange?: { startDate?: string; endDate?: string; tolerance?: number }
  ): CashMovementReconciliationResult {
    return reconcileCashBookWithSubLedger(db, dateRange);
  }

  static getComprehensiveReconciliationTrace(db: AppDatabaseState): {
    timestamp: string;
    traces: MemberFinancialChainTrace[];
    summary: {
      totalMembers: number;
      fullyReconciledMembers: number;
      unreconciledMembers: number;
      totalAdmissionVariance: number;
      totalCapitalVariance: number;
      totalSystemVariance: number;
    };
  } {
    return getComprehensiveReconciliationTrace(db);
  }

  /**
   * Centralized atomic receipt poster for cash/bank ledgers.
   * Guarantees consistent balance recalculation, valid IDs, strict idempotency, and atomic state return.
   */
  static postCashReceiptAtomic(
    db: AppDatabaseState,
    params: {
      date: string;
      amount: number;
      paymentMethod: PaymentMethod;
      sourceType: string;
      sourceId: string;
      voucherNo: string;
      description: string;
      reference?: string;
      accountId: string;
      accountName: string;
      createdBy: string;
      memberId?: string;
      bankAccountId?: string;
      bankName?: string;
      accountNumberMasked?: string;
    }
  ): {
    success: boolean;
    message?: string;
    cashTx?: CashTransaction;
    bankTx?: BankTransaction;
    newCashBalance?: number;
    newBankBalance?: number;
    updatedDb?: AppDatabaseState;
    isExisting?: boolean;
  } {
    if (!params.amount || params.amount <= 0) {
      return { success: false, message: 'Receipt amount must be greater than zero.' };
    }

    const updatedCash = [...(db.cashTransactions || [])];
    const updatedBank = [...(db.bankTransactions || [])];

    let currentCash = this.getCashBalance(updatedCash);
    let currentBank = this.getBankBalance(updatedBank);

    // IDEMPOTENCY CHECK: Look for existing active/posted transaction for same sourceType + sourceId or voucherNo
    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const existingCashTx = updatedCash.find(
        (c) =>
          c.status !== 'CANCELLED' &&
          c.status !== 'REVERSED' &&
          ((params.sourceId && c.sourceId === params.sourceId && c.sourceType === params.sourceType) ||
            (params.voucherNo && c.voucherNo === params.voucherNo))
      );

      if (existingCashTx) {
        return {
          success: true,
          isExisting: true,
          cashTx: existingCashTx,
          newCashBalance: currentCash,
          newBankBalance: currentBank,
          updatedDb: db
        };
      }

      const timeSeed = Date.now();
      const uniqueRand = Math.random().toString(36).substring(2, 7);
      currentCash += params.amount;
      const newCashTx: CashTransaction = {
        transactionId: `CSH-${timeSeed}-${uniqueRand}`,
        date: params.date,
        voucherNo: params.voucherNo,
        reference: params.reference || params.voucherNo,
        description: params.description,
        accountId: params.accountId,
        accountName: params.accountName,
        accountCode: params.accountId,
        cashIn: params.amount,
        cashOut: 0,
        balance: currentCash,
        sourceType: params.sourceType as any,
        sourceId: params.sourceId,
        memberId: params.memberId,
        createdBy: params.createdBy,
        status: "POSTED" as any,
        createdAt: new Date().toISOString()
      };
      updatedCash.push(newCashTx);

      return {
        success: true,
        cashTx: newCashTx,
        newCashBalance: currentCash,
        newBankBalance: currentBank,
        updatedDb: {
          ...db,
          cashTransactions: updatedCash
        }
      };
    } else {
      const existingBankTx = updatedBank.find(
        (b) =>
          (params.sourceId && b.sourceId === params.sourceId && b.sourceType === params.sourceType) ||
          (params.voucherNo && (b.reference === params.voucherNo || b.transactionNo === params.voucherNo))
      );

      if (existingBankTx) {
        return {
          success: true,
          isExisting: true,
          bankTx: existingBankTx,
          newCashBalance: currentCash,
          newBankBalance: currentBank,
          updatedDb: db
        };
      }

      const timeSeed = Date.now();
      const uniqueRand = Math.random().toString(36).substring(2, 7);
      currentBank += params.amount;
      const bankName = params.bankName || db.settings?.bankName || 'Bank';
      const accountNumberMasked = params.accountNumberMasked || db.settings?.bankAccountMask || '';
      const newBankTx: BankTransaction = {
        transactionId: `BNK-${timeSeed}-${uniqueRand}`,
        date: params.date,
        reference: params.voucherNo,
        description: params.description,
        bankName,
        accountNumberMasked,
        deposit: params.amount,
        withdrawal: 0,
        balance: currentBank,
        transactionNo: params.reference || params.voucherNo,
        sourceType: params.sourceType as any,
        sourceId: params.sourceId,
        createdAt: new Date().toISOString()
      };
      updatedBank.push(newBankTx);

      return {
        success: true,
        bankTx: newBankTx,
        newCashBalance: currentCash,
        newBankBalance: currentBank,
        updatedDb: {
          ...db,
          bankTransactions: updatedBank
        }
      };
    }
  }


  static generateMemberId(db: AppDatabaseState): string {
    const rawPrefix = (db.settings?.memberIdPrefix || 'AJM').trim();
    // Safely remove all trailing separators (-, _, etc.) to prevent double hyphens
    const cleanPrefix = rawPrefix.replace(/[-_]+$/, '').trim() || 'AJM';
    const basePrefix = `${cleanPrefix}-`;
    const existingNumbers = new Set<string>();
    (db.members || []).forEach(m => {
      if (m && m.memberId) existingNumbers.add(m.memberId);
    });
    let nextSequence = 1;
    const escapedPrefix = cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`);
    existingNumbers.forEach(num => {
      if (!num) return;
      const match = num.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq >= nextSequence) nextSequence = seq + 1;
      }
    });
    if (nextSequence === 1) {
      const numbers = (db.members || []).map(m => {
        const match = m?.memberId?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter(n => !isNaN(n));
      if (numbers.length > 0) nextSequence = Math.max(...numbers) + 1;
    }
    let generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    while (existingNumbers.has(generated)) {
      nextSequence++;
      generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    }
    return generated;
  }

  static postMemberAdmission(
    db: AppDatabaseState,
    params: Parameters<typeof AccountingService.completeAdmission>[1]
  ) {
    return this.completeAdmission(db, params);
  }

  static completeAdmission(
    db: AppDatabaseState,
    params: {
      memberData: {
        fullName: string;
        fatherName?: string;
        motherName?: string;
        dateOfBirth?: string;
        nid: string;
        occupation?: string;
        maritalStatus?: string;
        mobile: string;
        email?: string;
        presentAddress?: string;
        permanentAddress?: string;
        bloodGroup?: string;
        joiningDate?: string;
        remarks?: string;
        nominees?: Nominee[];
        photo?: string;
        photoUrl?: string;
      };
      admissionFee: number;
      capitalDeposit: number;
      paymentMethod: PaymentMethod;
      transactionNo?: string;
      approvedBy: string;
      remarks?: string;
      resolutionNo?: string;
      createdBy: string;
      skipCapitalPosting?: boolean;
      skipIncomePosting?: boolean;
      isCapitalAlreadyPosted?: boolean;
      isAdmissionFeeAlreadyPosted?: boolean;
    }
  ): {
    success: boolean;
    message: string;
    member?: Member;
    admission?: Admission;
    updatedDb?: AppDatabaseState;
  } {
    if (!params.memberData.fullName?.trim() || !params.memberData.nid?.trim() || !params.memberData.mobile?.trim()) {
      return { success: false, message: 'সদস্যের নাম, এনআইডি এবং মোবাইল নম্বর প্রদান করা আবশ্যক।' };
    }

    const cleanNid = params.memberData.nid.trim();
    const cleanMobile = params.memberData.mobile.trim();

    const existingNid = (db.members || []).find(m => m.nid.trim() === cleanNid);
    if (existingNid) {
      return { success: false, message: `এই এনআইডি (${cleanNid}) ইতিমধ্যে সদস্য ${existingNid.fullName} (${existingNid.memberId}) এর নামে নিবন্ধিত!` };
    }

    const existingMobile = (db.members || []).find(m => m.mobile.trim() === cleanMobile);
    if (existingMobile) {
      return { success: false, message: `এই মোবাইল নম্বর (${cleanMobile}) ইতিমধ্যে সদস্য ${existingMobile.fullName} (${existingMobile.memberId}) এর নামে ব্যবহৃত!` };
    }

    const newMemberId = this.generateMemberId(db);
    
    // Auto-generate membershipNo by finding the max existing numeric value
    const maxM = (db.members || []).reduce((max, m) => {
      const match = m.membershipNo?.match(/^M-(\d+)$/i);
      if (match) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 0);
    const membershipNo = `M-${String(maxM + 1).padStart(3, '0')}`;
    
    const transactionDate = new Date().toISOString().split('T')[0];
    const joiningDate = params.memberData.joiningDate || SOCIETY_OPENING_DATE;

    const timeSeed = Date.now();
    const uniqueRand = Math.random().toString(36).substring(2, 7);

    const newMember: Member = {
      memberId: newMemberId,
      membershipNo,
      fullName: params.memberData.fullName.trim(),
      fatherName: (params.memberData.fatherName || '').trim(),
      motherName: (params.memberData.motherName || '').trim(),
      dateOfBirth: params.memberData.dateOfBirth || '1990-01-01',
      nid: cleanNid,
      occupation: (params.memberData.occupation || 'ব্যবসা').trim(),
      maritalStatus: params.memberData.maritalStatus || 'বিবাহিত',
      mobile: cleanMobile,
      email: (params.memberData.email || '').trim() || undefined,
      presentAddress: (params.memberData.presentAddress || '').trim(),
      permanentAddress: (params.memberData.permanentAddress || '').trim(),
      bloodGroup: params.memberData.bloodGroup || 'B+',
      joiningDate,
      
      remarks: params.remarks || `ভর্তি কার্যনির্বাহী পর্ষদ কর্তৃক অনুমোদিত (অনুমোদনকারী: ${params.approvedBy})`,
      nominees: (params.memberData.nominees || []).map((nom, idx) => ({
        ...nom,
        nomineeId: nom.nomineeId || `NOM-${timeSeed}-${idx}`,
        memberId: newMemberId,
      })),
      photo: params.memberData.photo,
      photoUrl: params.memberData.photoUrl || params.memberData.photo,
      photoPath: params.memberData.photo,
      createdAt: new Date().toISOString(),
      

      syncStatus: 'LOCAL',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    const admissionId = `ADM-${timeSeed}-${uniqueRand}`;
    const newAdmission: Admission = {
      admissionId,
      memberId: newMemberId,
      applicationDate: transactionDate,
      approvalDate: transactionDate,
      admissionFee: params.admissionFee,
      capitalDeposit: params.capitalDeposit,
      paymentMethod: params.paymentMethod,
      transactionNo: params.transactionNo || `ADM-TXN-${timeSeed}-${uniqueRand}`,
      approvedBy: params.approvedBy,
      status: 'APPROVED',
      remarks: params.remarks || 'সদস্যপদ সক্রিয় ও ভর্তি সম্পন্ন',
      createdAt: new Date().toISOString()
    };

    let updatedIncomes = [...(db.incomes || [])];
    let updatedCapitalDeposits = [...(db.capitalDeposits || [])];
    let updatedMemberLedgers = [...(db.memberLedgers || [])];
    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournals = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];

    let currentCash = this.getCashBalance(db.cashTransactions);
    let currentBank = this.getBankBalance(db.bankTransactions);

    const reservedVoucherNos = new Set<string>();

    // Single-execution state checks for Admission Fee posting
    const shouldPostAdmissionFee = params.admissionFee > 0 &&
      !params.skipIncomePosting &&
      !params.isAdmissionFeeAlreadyPosted &&
      !(db.incomes || []).some(inc => 
        inc.reference === `ভর্তি ফি (${newMemberId})` || 
        (params.transactionNo && inc.voucherNo === params.transactionNo)
      );

    const shouldPostCapital = params.capitalDeposit > 0 &&
      !params.skipCapitalPosting &&
      !params.isCapitalAlreadyPosted &&
      !(db.capitalDeposits || []).some(cd => 
        (cd.memberId === newMemberId && cd.amount === params.capitalDeposit) ||
        (params.transactionNo && cd.transactionNo === params.transactionNo)
      );

    const totalCashBankAmount = (shouldPostAdmissionFee ? params.admissionFee : 0) + (shouldPostCapital ? params.capitalDeposit : 0);

    let feeVoucherNo = '';
    let capVoucherNo = '';
    let incomeId = '';
    let depositId = '';

    if (shouldPostAdmissionFee) {
      feeVoucherNo = this.generateVoucherNo(db, 'INC', reservedVoucherNos);
      reservedVoucherNos.add(feeVoucherNo);
      incomeId = `INC-${timeSeed}-${uniqueRand}`;
      const newIncome: Income = {
        incomeId,
        voucherNo: feeVoucherNo,
        date: transactionDate,
        incomeHead: 'Admission Fee',
        memberId: newMemberId,
        memberName: newMember.fullName,
        amount: params.admissionFee,
        paymentMethod: params.paymentMethod,
        reference: `ভর্তি ফি (${newMemberId})`,
        remarks: `${newMember.fullName} এর নতুন সদস্য ভর্তি ফি`,
        createdBy: params.createdBy,
        status: "POSTED" as any,
        createdAt: new Date().toISOString()
      };
      updatedIncomes.unshift(newIncome);
    }

    if (shouldPostCapital) {
      capVoucherNo = this.generateVoucherNo(db, 'CAP', reservedVoucherNos);
      reservedVoucherNos.add(capVoucherNo);
      depositId = `CAP-DEP-${timeSeed}-${uniqueRand}`;
      const newDeposit: CapitalDeposit = {
        depositId,
        voucherNo: capVoucherNo,
        date: transactionDate,
        memberId: newMemberId,
        memberName: newMember.fullName,
        amount: params.capitalDeposit,
        paymentMethod: params.paymentMethod,
        transactionNo: params.transactionNo || `ADM-CAP-${timeSeed}-${uniqueRand}`,
        remarks: 'ভর্তিকালীন প্রাথমিক মূলধন জমা',
        createdBy: params.createdBy,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        syncStatus: 'LOCAL'
      };
      updatedCapitalDeposits.unshift(newDeposit);

      const ledgerEntry: MemberLedgerEntry = {
        ledgerId: `LED-${timeSeed}-CAP-${uniqueRand}`,
        memberId: newMemberId,
        date: transactionDate,
        voucherNo: capVoucherNo,
        receiptNo: capVoucherNo,
        description: `সদস্য মূলধন জমা: ৳${params.capitalDeposit}`,
        transactionType: 'CAPITAL_DEPOSIT',
        debit: 0,
        credit: params.capitalDeposit,
        balance: params.capitalDeposit,
        reference: newDeposit.transactionNo,
        sourceType: 'CAPITAL',
        sourceId: depositId,
        createdAt: new Date().toISOString()
      };
      updatedMemberLedgers.push(ledgerEntry);
    }

    if (totalCashBankAmount > 0) {
      // 1. Single Cash/Bank Transaction
      const combinedVoucherNo = capVoucherNo || feeVoucherNo || `ADM-${timeSeed}`;
      const combinedReceiptRes = this.postCashReceiptAtomic(
        { ...db, cashTransactions: updatedCash, bankTransactions: updatedBank },
        {
          date: transactionDate,
          amount: totalCashBankAmount,
          paymentMethod: params.paymentMethod,
          sourceType: 'ADMISSION',
          sourceId: admissionId,
          voucherNo: combinedVoucherNo,
          description: `সদস্য ভর্তি: ${newMember.fullName} (${newMemberId})`,
          reference: `ভর্তি ও মূলধন: ${newMemberId}`,
          accountId: ACCOUNT_CODES.CASH, // postCashReceiptAtomic resolves bank vs cash
          accountName: 'সদস্য ভর্তি',
          memberId: newMemberId,
          createdBy: params.createdBy
        }
      );

      if (combinedReceiptRes.success) {
        if (combinedReceiptRes.cashTx && !combinedReceiptRes.isExisting) {
          updatedCash.push(combinedReceiptRes.cashTx);
          currentCash = combinedReceiptRes.newCashBalance || currentCash;
        }
        if (combinedReceiptRes.bankTx && !combinedReceiptRes.isExisting) {
          updatedBank.push(combinedReceiptRes.bankTx);
          currentBank = combinedReceiptRes.newBankBalance || currentBank;
        }
      }

      // 2. Single Balanced Journal
      const journalNo = this.generateVoucherNo(db, 'JNL', reservedVoucherNos);
      reservedVoucherNos.add(journalNo);

      const debitAccountId = String(params.paymentMethod).toUpperCase() === 'CASH' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK_SONALI;
      const debitAccountName = String(params.paymentMethod).toUpperCase() === 'CASH' ? 'হাতে নগদ' : 'ব্যাংক হিসাব';

      const journalLines: any[] = [
        {
          accountId: debitAccountId,
          accountName: debitAccountName,
          debit: totalCashBankAmount,
          credit: 0,
          description: 'নগদ/ব্যাংক ডেবিট (ভর্তি)'
        }
      ];

      if (shouldPostCapital) {
        journalLines.push({
          accountId: ACCOUNT_CODES.MEMBER_CAPITAL,
          accountName: 'সদস্যদের মূলধন তহবিল',
          debit: 0,
          credit: params.capitalDeposit,
          description: 'মূলধন ক্রেডিট'
        });
      }

      if (shouldPostAdmissionFee) {
        journalLines.push({
          accountId: ACCOUNT_CODES.ADMISSION_FEE,
          accountName: 'ভর্তি ফি আয়',
          debit: 0,
          credit: params.admissionFee,
          description: 'ভর্তি ফি আয় ক্রেডিট'
        });
      }

      const journalRes = this.postJournalEntry(
        { ...db, journalEntries: updatedJournals },
        {
          journalNo,
          date: transactionDate,
          reference: combinedVoucherNo,
          sourceType: 'ADMISSION',
          sourceId: admissionId,
          description: `নতুন সদস্য ${newMember.fullName} (${newMemberId}) এর ভর্তি সম্পন্ন`,
          createdBy: params.createdBy,
          status: "POSTED" as any,
        },
        journalLines
      );

      if (journalRes.success && journalRes.entry && journalRes.lines) {
        updatedJournals.unshift(journalRes.entry);
        updatedJournalLines.push(...journalRes.lines);
      }
    }

    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: db.activeUserId || 'SYSTEM',
      userName: params.createdBy,
      dateTime: new Date().toISOString(),
      module: 'ADMISSION',
      action: 'POST',
      recordId: newMemberId,
      newValue: `নতুন সদস্য ভর্তি: ${newMember.fullName} (${newMemberId}), ফি: ৳${params.admissionFee}, মূলধন: ৳${params.capitalDeposit}`,
      remarks: 'সদস্য ভর্তি ও একাউন্ট সক্রিয়করণ সফলভাবে সম্পন্ন'
    };

    const updatedDb: AppDatabaseState = {
      ...db,
      members: [newMember, ...(db.members || [])],
      admissions: [newAdmission, ...(db.admissions || [])],
      incomes: updatedIncomes,
      capitalDeposits: updatedCapitalDeposits,
      memberLedgers: updatedMemberLedgers,
      cashTransactions: updatedCash,
      bankTransactions: updatedBank,
      journalEntries: updatedJournals,
      journalLines: updatedJournalLines,
      auditLogs: [auditLog, ...(db.auditLogs || [])]
    };

    return {
      success: true,
      message: `সদস্য ${newMember.fullName} (${newMemberId}) এর ভর্তি ও একাউন্ট সক্রিয়করণ সফলভাবে সম্পন্ন হয়েছে!`,
      member: newMember,
      admission: newAdmission,
      updatedDb
    };
  }

  static postFormFee(
    db: AppDatabaseState,
    params: {
      applicantName: string;
      mobile?: string;
      formFee: number;
      paymentMethod: PaymentMethod;
      transactionNo?: string;
      receivedBy: string;
      remarks?: string;
    }
  ): {
    success: boolean;
    message: string;
    income?: Income;
    updatedDb?: AppDatabaseState;
  } {
    if (!params.applicantName?.trim()) {
      return { success: false, message: 'আবেদনকারীর নাম প্রদান করা আবশ্যক।' };
    }
    if (params.formFee <= 0) {
      return { success: false, message: 'ফরম ফি অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' };
    }

    const timeSeed = Date.now();
    const uniqueRand = Math.random().toString(36).substring(2, 7);
    const dateStr = new Date().toISOString().split('T')[0];
    const reservedVoucherNos = new Set<string>();
    const voucherNo = this.generateVoucherNo(db, 'INC', reservedVoucherNos);
    reservedVoucherNos.add(voucherNo);

    const incomeId = `INC-FORM-${timeSeed}-${uniqueRand}`;
    const newIncome: Income = {
      incomeId,
      voucherNo,
      date: dateStr,
      incomeHead: 'Form Fee',
      amount: params.formFee,
      paymentMethod: params.paymentMethod,
      reference: `ফরম ফি (${params.applicantName})`,
      remarks: params.remarks || `${params.applicantName} এর ভর্তি ফরম ফি`,
      createdBy: params.receivedBy,
      status: 'POSTED' as any,
      createdAt: new Date().toISOString()
    };

    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournals = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];

    const feeReceiptRes = this.postCashReceiptAtomic(
      { ...db, cashTransactions: updatedCash, bankTransactions: updatedBank },
      {
        date: dateStr,
        amount: params.formFee,
        paymentMethod: params.paymentMethod,
        sourceType: 'INCOME',
        sourceId: incomeId,
        voucherNo,
        description: `ভর্তি ফরম ফি (${params.applicantName})`,
        reference: `ফরম ফি: ${params.applicantName}`,
        accountId: ACCOUNT_CODES.FORM_FEE,
        accountName: 'ফরম ফি আয়',
        createdBy: params.receivedBy
      }
    );

    if (feeReceiptRes.success) {
      if (feeReceiptRes.cashTx && !feeReceiptRes.isExisting) {
        updatedCash.push(feeReceiptRes.cashTx);
      }
      if (feeReceiptRes.bankTx && !feeReceiptRes.isExisting) {
        updatedBank.push(feeReceiptRes.bankTx);
      }
    }

    const feeJournalNo = this.generateVoucherNo(db, 'JNL', reservedVoucherNos);
    const debitAccountId = String(params.paymentMethod).toUpperCase() === 'CASH' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK_SONALI;
    const debitAccountName = String(params.paymentMethod).toUpperCase() === 'CASH' ? 'Cash in Hand' : 'Bank Account';

    const journalRes = this.postJournalEntry(
      { ...db, journalEntries: updatedJournals },
      {
        journalNo: feeJournalNo,
        date: dateStr,
        reference: voucherNo,
        sourceType: 'INCOME',
        sourceId: incomeId,
        description: `${params.applicantName} এর ভর্তি ফরম ফি বাবদ গ্রহণ`,
        createdBy: params.receivedBy,
        status: 'POSTED' as any,
      },
      [
        {
          accountId: debitAccountId,
          accountName: debitAccountName,
          debit: params.formFee,
          credit: 0,
          description: 'নগদ/ব্যাংক ডেবিট'
        },
        {
          accountId: ACCOUNT_CODES.FORM_FEE,
          accountName: 'ফরম ফি আয়',
          debit: 0,
          credit: params.formFee,
          description: 'ফরম ফি আয় ক্রেডিট'
        }
      ]
    );

    if (!journalRes.success || !journalRes.entry || !journalRes.lines) {
      return { success: false, message: journalRes.message };
    }

    return {
      success: true,
      message: 'ভর্তি ফরম ফি সফলভাবে গ্রহণ ও পোস্ট করা হয়েছে।',
      income: newIncome,
      updatedDb: {
        ...db,
        incomes: [newIncome, ...(db.incomes || [])],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: [journalRes.entry, ...updatedJournals],
        journalLines: [...updatedJournalLines, ...journalRes.lines]
      }
    };
  }

  // Check comprehensive member dependencies across all database collections
  static checkMemberDependencies(
    db: AppDatabaseState,
    memberId: string
  ): {
    hasFinancialHistory: boolean;
    canPermanentlyDelete: boolean;
    hasDuplicateWarning?: boolean;
    reason?: string;
    details: {
      admissionsCount: number;
      collectionsCount: number;
      capitalDepositsCount: number;
      loansCount: number;
      loanRepaymentsCount: number;
      investmentsCount: number;
      memberLedgerCount: number;
      profitDistributionsCount: number;
      welfareTransactionsCount: number;
      incomesCount: number;
      cashTransactionsCount: number;
      bankTransactionsCount: number;
      linkedUserAccountsCount: number;
      auditLogsCount: number;
    };
  } {
    const member = (db.members || []).find(m => m.memberId === memberId);
    const memberName = member ? member.fullName : '';

    const admissionsCount = (db.admissions || []).filter(
      a => a.memberId === memberId && (a.status === 'APPROVED' || (a.admissionFee && a.admissionFee > 0) || (a.capitalDeposit && a.capitalDeposit > 0))
    ).length;

    const collectionsCount = (db.collections || []).filter(
      c => c.memberId === memberId && (c.status === 'ACTIVE' || c.status === 'POSTED')
    ).length;

    const capitalDepositsCount = (db.capitalDeposits || []).filter(
      cd => cd.memberId === memberId && cd.status === 'ACTIVE'
    ).length;

    const loansCount = (db.loans || []).filter(
      l => l.memberId === memberId && l.status !== 'CANCELLED'
    ).length;

    const loanRepaymentsCount = (db.loanRepayments || []).filter(
      lr => lr.memberId === memberId && lr.status === 'ACTIVE'
    ).length;

    const investmentsCount = (db.investments || []).filter(
      i => (i as any).memberId === memberId
    ).length;

    const memberLedgerCount = (db.memberLedgers || []).filter(
      ml => ml.memberId === memberId
    ).length;

    const profitDistributionsCount =
      (db.historicalProfits || []).filter(hp => (hp as any).distributionList?.some((d: any) => d.memberId === memberId)).length +
      (db.profitAllocations || []).filter(ap => (ap as any).distributionList?.some((d: any) => d.memberId === memberId)).length;

    const welfareTransactionsCount = (db.welfareTransactions || []).filter(
      wt => wt.memberId === memberId || (memberName && wt.beneficiary?.includes(memberName)) || (wt as any).memberName === memberName
    ).length;

    const incomesCount = (db.incomes || []).filter(
      i => (i.memberId === memberId || (i.reference && i.reference.includes(memberId))) && i.status === 'POSTED'
    ).length;

    const cashTransactionsCount = (db.cashTransactions || []).filter(
      ct => ct.sourceId === memberId || (memberId && ct.reference?.includes(memberId)) || (memberId && ct.description?.includes(memberId))
    ).length;

    const bankTransactionsCount = (db.bankTransactions || []).filter(
      bt => bt.sourceId === memberId || (memberId && bt.reference?.includes(memberId)) || (memberId && bt.description?.includes(memberId))
    ).length;

    const linkedUserAccountsCount = (db.users || []).filter(
      u => u.linkedMemberId === memberId
    ).length;

    const auditLogsCount = (db.auditLogs || []).filter(
      al => al.recordId === memberId
    ).length;

    // Check duplicates
    const duplicateMembers = (db.members || []).filter(
      m => m.memberId !== memberId && ((member?.nid && m.nid === member.nid) || (member?.mobile && m.mobile === member.mobile))
    );
    const hasDuplicateWarning = duplicateMembers.length > 0;

    const hasFinancialHistory =
      collectionsCount > 0 ||
      capitalDepositsCount > 0 ||
      loansCount > 0 ||
      loanRepaymentsCount > 0 ||
      memberLedgerCount > 0 ||
      profitDistributionsCount > 0 ||
      welfareTransactionsCount > 0 ||
      incomesCount > 0 ||
      admissionsCount > 0 ||
      investmentsCount > 0 ||
      cashTransactionsCount > 0 ||
      bankTransactionsCount > 0;

    const canPermanentlyDelete = !hasFinancialHistory;
    const reason = hasFinancialHistory
      ? 'এই সদস্যের আর্থিক/সদস্যতা ইতিহাস রয়েছে। নিরাপত্তার কারণে সদস্যটি মুছে ফেলা যাবে না।'
      : undefined;

    return {
      hasFinancialHistory,
      canPermanentlyDelete,
      hasDuplicateWarning,
      reason,
      details: {
        admissionsCount,
        collectionsCount,
        capitalDepositsCount,
        loansCount,
        loanRepaymentsCount,
        investmentsCount,
        memberLedgerCount,
        profitDistributionsCount,
        welfareTransactionsCount,
        incomesCount,
        cashTransactionsCount,
        bankTransactionsCount,
        linkedUserAccountsCount,
        auditLogsCount
      }
    };
  }

  // Deactivate Member safely
  static deactivateMember(
    db: AppDatabaseState,
    memberId: string,
    performedByUserId: string,
    performedByUserName: string
  ): {
    success: boolean;
    message: string;
    updatedDb?: AppDatabaseState;
  } {
    const memberIndex = (db.members || []).findIndex(m => m.memberId === memberId);
    if (memberIndex === -1) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }

    const member = db.members[memberIndex];
    if (member.status === 'INACTIVE') {
      return { success: false, message: 'সদস্য ইতিমধ্যে নিষ্ক্রিয় রয়েছে।' };
    }

    const now = new Date().toISOString();
    const updatedMember: Member = {
      ...member,
      status: 'INACTIVE',
      updatedAt: now
    };

    const updatedMembers = [...db.members];
    updatedMembers[memberIndex] = updatedMember;

    // Handle linked user account (disable it)
    let updatedUsers = [...(db.users || [])];
    const linkedUserIndex = updatedUsers.findIndex(u => u.linkedMemberId === memberId && u.role === 'MEMBER');
    const newAuditLogs: AuditLog[] = [];

    if (linkedUserIndex !== -1) {
      const linkedUser = updatedUsers[linkedUserIndex];
      updatedUsers[linkedUserIndex] = {
        ...linkedUser,
        status: 'DISABLED',
        updatedAt: now
      };

      newAuditLogs.push({
        auditId: `AUD-${Date.now()}-U`,
        userId: performedByUserId || 'SYSTEM',
        userName: performedByUserName || 'Admin',
        dateTime: now,
        module: 'USERS',
        action: 'MEMBER_ACCOUNT_DISABLED',
        recordId: linkedUser.userId,
        remarks: `সদস্য ${member.fullName} (${memberId}) নিষ্ক্রিয় করার কারণে ইউজার অ্যাকাউন্ট ${linkedUser.username} নিষ্ক্রিয় করা হয়েছে`
      });
    }

    newAuditLogs.push({
      auditId: `AUD-${Date.now()}-M`,
      userId: performedByUserId || 'SYSTEM',
      userName: performedByUserName || 'Admin',
      dateTime: now,
      module: 'MEMBER',
      action: 'MEMBER_DEACTIVATED',
      recordId: memberId,
      oldValue: `স্ট্যাটাস: ${member.status}`,
      newValue: 'স্ট্যাটাস: INACTIVE',
      remarks: `সদস্য ${member.fullName} (${memberId}) কে নিষ্ক্রিয় করা হয়েছে। পুরনো হিসাব ও ইতিহাস সংরক্ষিত রয়েছে।`
    });

    const updatedDb: AppDatabaseState = {
      ...db,
      members: updatedMembers,
      users: updatedUsers,
      auditLogs: [...newAuditLogs, ...(db.auditLogs || [])]
    };

    return {
      success: true,
      message: `সদস্য ${member.fullName} (${memberId}) সফলভাবে নিষ্ক্রিয় করা হয়েছে।`,
      updatedDb
    };
  }

  // Reactivate Member
  static reactivateMember(
    db: AppDatabaseState,
    memberId: string,
    performedByUserId: string,
    performedByUserName: string
  ): {
    success: boolean;
    message: string;
    updatedDb?: AppDatabaseState;
  } {
    const memberIndex = (db.members || []).findIndex(m => m.memberId === memberId);
    if (memberIndex === -1) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }

    const member = db.members[memberIndex];
    if (member.status === 'ACTIVE') {
      return { success: false, message: 'সদস্য ইতিমধ্যে সক্রিয় রয়েছে।' };
    }

    const now = new Date().toISOString();
    const updatedMember: Member = {
      ...member,
      
      updatedAt: now
    };

    const updatedMembers = [...db.members];
    updatedMembers[memberIndex] = updatedMember;

    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}-M`,
      userId: performedByUserId || 'SYSTEM',
      userName: performedByUserName || 'Admin',
      dateTime: now,
      module: 'MEMBER',
      action: 'MEMBER_REACTIVATED',
      recordId: memberId,
      oldValue: `স্ট্যাটাস: ${member.status}`,
      newValue: 'স্ট্যাটাস: ACTIVE',
      remarks: `সদস্য ${member.fullName} (${memberId}) কে পুনরায় সক্রিয় করা হয়েছে।`
    };

    const updatedDb: AppDatabaseState = {
      ...db,
      members: updatedMembers,
      auditLogs: [auditLog, ...(db.auditLogs || [])]
    };

    return {
      success: true,
      message: `সদস্য ${member.fullName} (${memberId}) সফলভাবে সক্রিয় করা হয়েছে।`,
      updatedDb
    };
  }

  // Permanently Delete Member (ONLY if no financial/accounting history exists)
  static deleteMemberPermanently(
    db: AppDatabaseState,
    memberId: string,
    performedByUserId: string,
    performedByUserName: string
  ): {
    success: boolean;
    message: string;
    updatedDb?: AppDatabaseState;
  } {
    const member = (db.members || []).find(m => m.memberId === memberId);
    if (!member) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }

    const depCheck = this.checkMemberDependencies(db, memberId);
    if (!depCheck.canPermanentlyDelete) {
      return {
        success: false,
        message: depCheck.reason || 'এই সদস্যের আর্থিক/সদস্যতা ইতিহাস রয়েছে। নিরাপত্তার কারণে সদস্যটি মুছে ফেলা যাবে না।'
      };
    }

    const now = new Date().toISOString();

    // Clean member
    const updatedMembers = (db.members || []).filter(m => m.memberId !== memberId);

    // Clean non-financial draft admissions if any
    const updatedAdmissions = (db.admissions || []).filter(a => a.memberId !== memberId);

    // Clean unneeded linked member user account if any
    const updatedUsers = (db.users || []).filter(u => u.linkedMemberId !== memberId);

    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}-D`,
      userId: performedByUserId || 'SYSTEM',
      userName: performedByUserName || 'Admin',
      dateTime: now,
      module: 'MEMBER',
      action: 'MEMBER_DELETED',
      recordId: memberId,
      oldValue: `নাম: ${member.fullName}, আইডি: ${memberId}, মোবাইল: ${member.mobile}`,
      remarks: `কোনো আর্থিক ইতিহাস না থাকায় সদস্য ${member.fullName} (${memberId}) কে স্থায়ীভাবে মুছে ফেলা হয়েছে`
    };

    const updatedDb: AppDatabaseState = {
      ...db,
      members: updatedMembers,
      admissions: updatedAdmissions,
      users: updatedUsers,
      auditLogs: [auditLog, ...(db.auditLogs || [])]
    };

    return {
      success: true,
      message: `সদস্য ${member.fullName} (${memberId}) স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
      updatedDb
    };
  }

  static generateReceiptNo(db: AppDatabaseState, reservedNumbers?: (string | undefined)[] | Set<string>): string {
    const rawPrefix = (db.settings.receiptPrefix || 'REC').trim();
    const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');
    const yearStr = activeYear ? (activeYear.yearCode.split('-')[0] || activeYear.yearCode) : new Date().getFullYear().toString();
    
    // Normalize prefix: vigorously strip any trailing years or separators
    let cleanPrefix = rawPrefix.trim().toUpperCase();
    cleanPrefix = cleanPrefix.replace(/[-_]+/g, '-').replace(/^-+|-+$/g, '');
    
    let previous;
    do {
      previous = cleanPrefix;
      cleanPrefix = cleanPrefix.replace(new RegExp(`-${yearStr}$`), '');
      if (cleanPrefix.endsWith(yearStr)) {
        cleanPrefix = cleanPrefix.substring(0, cleanPrefix.length - yearStr.length);
      }
      cleanPrefix = cleanPrefix.replace(/-+$/, '');
    } while (cleanPrefix !== previous);
    
    cleanPrefix = cleanPrefix || 'REC';

    const basePrefix = `${cleanPrefix}-${yearStr}-`;
    const existingNumbers = new Set<string>();
    db.collections?.forEach(c => { if (c.receiptNo) existingNumbers.add(c.receiptNo); });
    db.incomes?.forEach(i => { if (i.voucherNo) existingNumbers.add(i.voucherNo); });
    db.capitalDeposits?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
    db.loanRepayments?.forEach(r => { if (r.voucherNo) existingNumbers.add(r.voucherNo); });
    db.cashTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
    db.bankTransactions?.forEach(b => { if (b.transactionNo) existingNumbers.add(b.transactionNo); });

    if (reservedNumbers) {
      reservedNumbers.forEach(num => { if (num) existingNumbers.add(num); });
    }
    
    let nextSequence = 1;
    const escapedCleanPrefix = cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedCleanPrefix}.*?(\\d{4,6})$`);
    
    existingNumbers.forEach(num => {
      if (!num) return;
      const match = num.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq >= nextSequence) nextSequence = seq + 1;
      }
    });
    
    let generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    while (existingNumbers.has(generated)) {
      nextSequence++;
      generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    }
    return generated;
  }

  static generateVoucherNo(db: AppDatabaseState, oldType?: string, reservedNumbers?: (string | undefined)[] | Set<string>): string {
    let rawPrefix = (db.settings.voucherPrefix || 'VCH').trim();
    
    // Support custom prefixes based on transaction type if specified
    if (oldType === 'LN') rawPrefix = (db.settings.loanPrefix || 'LN').trim();
    else if (oldType === 'INV') rawPrefix = (db.settings.investmentPrefix || 'INV').trim();
    else if (oldType === 'RES') rawPrefix = (db.settings.resolutionPrefix || 'RES').trim();
    else if (oldType === 'CON') rawPrefix = 'CON';
    else if (oldType === 'JNL') rawPrefix = ((db.settings as any).journalPrefix || 'JNL').trim();
    else if (oldType && !['VCH', 'CAP', 'INC', 'EXP', 'WLF', 'LNR'].includes(oldType)) {
      rawPrefix = oldType.trim();
    }
    
    const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');
    const yearStr = activeYear ? (activeYear.yearCode.split('-')[0] || activeYear.yearCode) : new Date().getFullYear().toString();
    
    // Normalize prefix: vigorously strip any trailing years or separators
    let cleanPrefix = rawPrefix.trim().toUpperCase();
    cleanPrefix = cleanPrefix.replace(/[-_]+/g, '-').replace(/^-+|-+$/g, '');
    
    let previous;
    do {
      previous = cleanPrefix;
      cleanPrefix = cleanPrefix.replace(new RegExp(`-${yearStr}$`), '');
      if (cleanPrefix.endsWith(yearStr)) {
        cleanPrefix = cleanPrefix.substring(0, cleanPrefix.length - yearStr.length);
      }
      cleanPrefix = cleanPrefix.replace(/-+$/, '');
    } while (cleanPrefix !== previous);
    
    cleanPrefix = cleanPrefix || (oldType === 'JNL' ? 'JNL' : 'VCH');

    const basePrefix = `${cleanPrefix}-${yearStr}-`;
    const existingNumbers = new Set<string>();
    
    db.expenses?.forEach(e => { if (e.voucherNo) existingNumbers.add(e.voucherNo); });
    db.journalEntries?.forEach(j => {
      if (j.journalNo) existingNumbers.add(j.journalNo);
      if (j.reference) existingNumbers.add(j.reference);
    });
    // Also include capital deposits, loans, contra, etc. for uniqueness
    db.capitalDeposits?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
    db.contraTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
    db.loans?.forEach(l => { if (l.loanId) existingNumbers.add(l.loanId); });
    db.loanRepayments?.forEach(r => { if (r.voucherNo) existingNumbers.add(r.voucherNo); });
    db.incomes?.forEach(i => { if (i.voucherNo) existingNumbers.add(i.voucherNo); });
    db.welfareTransactions?.forEach(w => { if (w.voucherNo) existingNumbers.add(w.voucherNo); });
    db.cashTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });

    if (reservedNumbers) {
      reservedNumbers.forEach(num => { if (num) existingNumbers.add(num); });
    }

    let nextSequence = 1;
    const escapedCleanPrefix = cleanPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedCleanPrefix}.*?(\\d{4,6})$`);
    
    existingNumbers.forEach(num => {
      if (!num) return;
      const match = num.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq >= nextSequence) nextSequence = seq + 1;
      }
    });
    
    let generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    while (existingNumbers.has(generated)) {
      nextSequence++;
      generated = `${basePrefix}${String(nextSequence).padStart(6, '0')}`;
    }
    return generated;
  }

  static postJournalEntry(db: AppDatabaseState, entry: Omit<JournalEntry, 'id' | 'createdAt'>, lines: Omit<JournalEntryLine, 'id' | 'journalEntryId'>[]): { success: boolean, message: string, entry?: JournalEntry, lines?: JournalEntryLine[] } {
    if (!lines || lines.length < 2) {
      return { success: false, message: 'জার্নাল এন্ট্রিতে কমপক্ষে দুটি লাইন (ডেবিট এবং ক্রেডিট) থাকা আবশ্যক।' };
    }

    // Validate line syntax and account definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.accountId || !String(line.accountId).trim()) {
        return { success: false, message: `লাইন #${i + 1}-এ হিসাব কোড (Account ID) অনুপস্থিত।` };
      }
      if (line.debit < 0 || line.credit < 0) {
        return { success: false, message: `লাইন #${i + 1}-এ ঋণাত্মক মান গ্রহণযোগ্য নয়।` };
      }
      if (line.debit === 0 && line.credit === 0) {
        return { success: false, message: `লাইন #${i + 1}-এ ডেবিট এবং ক্রেডিট উভয়ই শূন্য হতে পারে না।` };
      }
      if (line.debit > 0 && line.credit > 0) {
        return { success: false, message: `লাইন #${i + 1}-এ একই সাথে ডেবিট এবং ক্রেডিট উভয়ই থাকতে পারে না।` };
      }

      if (db.accounts && db.accounts.length > 0) {
        const canonical = resolveCanonicalAccount(line.accountId, line.accountName);
        const coaAccount = db.accounts.find(
          a => a.accountCode === line.accountId || a.accountCode === canonical.accountCode
        );
        if (coaAccount && coaAccount.isActive === false) {
          return { success: false, message: `হিসাব (${coaAccount.accountCode} - ${coaAccount.accountName}) নিষ্ক্রিয় বিধায় জার্নাল পোস্ট করা যাবে না।` };
        }
      }
    }

    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    
    // Total must be positive and balanced
    if (totalDebit <= 0 || totalCredit <= 0) {
      return { success: false, message: 'জার্নাল এন্ট্রির পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।' };
    }

    // Allow small floating point variations
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
       return { success: false, message: 'হিসাবের ডেবিট ও ক্রেডিট সমান নয়। লেনদেন সংরক্ষণ করা যাবে না।' };
    }
    
    // Check duplicate by source_type + source_id
    if (entry.sourceType && entry.sourceId) {
      const existing = (db.journalEntries || []).find(
        j => j.sourceType === entry.sourceType && 
             j.sourceId === entry.sourceId && 
             (j.status as string) !== 'CANCELLED' && 
             j.status !== 'REVERSED'
      );
      if (existing) {
        const existingLines = (db.journalLines || []).filter(l => l.journalEntryId === existing.id);
        const exDeb = existingLines.reduce((s, l) => s + l.debit, 0);
        const exCred = existingLines.reduce((s, l) => s + l.credit, 0);
        if (existingLines.length >= 2 && Math.abs(exDeb - exCred) <= 0.01 && exDeb > 0) {
          return { success: true, message: 'এই লেনদেনের হিসাব ইতিমধ্যে পোস্ট করা হয়েছে (ইডেমপোটেন্ট)।', entry: existing, lines: existingLines };
        }
      }
    }
    
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const journalEntryId = entry.journalNo 
      ? (entry.journalNo.startsWith('JNL-') ? entry.journalNo : `JNL-${entry.journalNo}`)
      : `JNL-${Date.now()}-${uniqueSuffix}`;

    // Verify no collision on journal entry ID
    const existingWithId = (db.journalEntries || []).find(j => j.id === journalEntryId && (j.status as string) !== 'CANCELLED' && j.status !== 'REVERSED');
    if (existingWithId) {
      const existingLines = (db.journalLines || []).filter(l => l.journalEntryId === existingWithId.id);
      return { success: true, message: 'এই জার্নাল নম্বর ইতিমধ্যে বিদ্যমান (ইডেমপোটেন্ট)।', entry: existingWithId, lines: existingLines };
    }

    const newEntry: JournalEntry = {
       ...entry,
       id: journalEntryId,
       createdAt: new Date().toISOString()
    };
    
    const newLines: JournalEntryLine[] = (lines || []).map((line, idx) => ({
       ...line,
       id: `JNL-LINE-${journalEntryId}-${idx}`,
       journalEntryId
    }));
    
    return { success: true, message: 'Success', entry: newEntry, lines: newLines };
  }

  static calculateMemberDue(
    member: Member,
    collections: Collection[],
    monthlyFee: number,
    lateFinePerMonth: number,
    lateCutoffDay: number,
    lateFeeWaivers?: LateFeeWaiver[]
  ): {
    monthsDueCount: number;
    unpaidMonths: string[];
    unpaidMonthDetails: {
      month: string;
      due: number;
      paid: number;
      expected: number;
      monthlyAmount: number;
      contributionDue: number;
      isContributionPaid: boolean;
      lateFine: number;
      paidLateFine: number;
      waivedLateFine: number;
      lateFineDue: number;
      isLateFinePaid: boolean;
      totalDue: number;
    }[];
    allMonthDetails: {
      month: string;
      due: number;
      paid: number;
      expected: number;
      monthlyAmount: number;
      contributionDue: number;
      isContributionPaid: boolean;
      lateFine: number;
      paidLateFine: number;
      waivedLateFine: number;
      lateFineDue: number;
      isLateFinePaid: boolean;
      totalDue: number;
      isFullyPaid: boolean;
    }[];
    monthsOverdue: number;
    totalDueAmount: number;
    totalContributionDue: number;
    totalLateFineDue: number;
    totalWaivedLateFine: number;
    estimatedLateFine: number;
  } {
    if (member.status !== 'ACTIVE') {
      return {
        monthsDueCount: 0,
        unpaidMonths: [],
        totalDueAmount: 0,
        totalContributionDue: 0,
        totalLateFineDue: 0,
        totalWaivedLateFine: 0,
        estimatedLateFine: 0,
        unpaidMonthDetails: [],
        allMonthDetails: [],
        monthsOverdue: 0
      };
    }

    const now = new Date();
    const joinDate = new Date(member.joiningDate || '2026-06-01');
    const unpaidMonths: string[] = [];

    // Check months from joining or past 12 months up to current month
    let iter = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    const currentMonthIter = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalDueAmount = 0;
    let totalContributionDue = 0;
    let totalLateFineDue = 0;
    let totalWaivedLateFine = 0;
    const unpaidMonthDetails: {
      month: string;
      due: number;
      paid: number;
      expected: number;
      monthlyAmount: number;
      contributionDue: number;
      isContributionPaid: boolean;
      lateFine: number;
      paidLateFine: number;
      waivedLateFine: number;
      lateFineDue: number;
      isLateFinePaid: boolean;
      totalDue: number;
    }[] = [];

    const allMonthDetails: {
      month: string;
      due: number;
      paid: number;
      expected: number;
      monthlyAmount: number;
      contributionDue: number;
      isContributionPaid: boolean;
      lateFine: number;
      paidLateFine: number;
      waivedLateFine: number;
      lateFineDue: number;
      isLateFinePaid: boolean;
      totalDue: number;
      isFullyPaid: boolean;
    }[] = [];

    while (iter <= currentMonthIter) {
      const monthStr = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}`;
      const monthColls = (collections || []).filter(
        c => c?.memberId === member.memberId && c?.collectionMonth === monthStr && (c?.status === 'ACTIVE' || c?.status === 'POSTED' || !c?.status)
      );
      
      const isPastCutoff = (now.getDate() > lateCutoffDay && monthStr === currentMonthStr) || (iter < currentMonthIter);
      const defaultLateFine = isPastCutoff ? lateFinePerMonth : 0;

      let monthlyAmount = monthlyFee;
      let totalPaid = 0;
      let totalDiscount = 0;
      let assessedLateFine = 0;

      if (monthColls.length > 0) {
        totalPaid = monthColls.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
        totalDiscount = monthColls.reduce((sum, c) => sum + (c.discount || 0), 0);
        monthlyAmount = monthColls[0].monthlyAmount > 0 ? monthColls[0].monthlyAmount : monthlyFee;
        assessedLateFine = Math.max(...monthColls.map(c => c.lateFine || 0), defaultLateFine);
      } else {
        assessedLateFine = defaultLateFine;
      }

      const netContributionExpected = Math.max(0, monthlyAmount - totalDiscount);
      const contributionPaid = Math.min(totalPaid, netContributionExpected);
      const contributionDue = Math.max(0, netContributionExpected - contributionPaid);
      const isContributionPaid = contributionDue === 0;

      const paidLateFine = Math.max(0, totalPaid - netContributionExpected);
      const remainingFineBeforeWaiver = Math.max(0, assessedLateFine - paidLateFine);

      // Check waiver register
      const monthWaivers = (lateFeeWaivers || []).filter(
        w => w.memberId === member.memberId && w.collectionMonth === monthStr && w.status !== 'REVERSED' && w.status !== 'CANCELLED'
      );
      const registeredWaived = monthWaivers.reduce((sum, w) => sum + (Number(w.waivedAmount) || 0), 0);
      const isCollectionWaived = monthColls.some(c => c.lateFeeWaived || c.late_fee_waived);
      const waivedLateFine = (registeredWaived > 0 || isCollectionWaived)
        ? Math.min(remainingFineBeforeWaiver, Math.max(registeredWaived, isCollectionWaived ? remainingFineBeforeWaiver : 0))
        : 0;

      const lateFineDue = Math.max(0, remainingFineBeforeWaiver - waivedLateFine);
      const isLateFinePaid = lateFineDue === 0;

      const totalDue = contributionDue + lateFineDue;
      const expected = netContributionExpected + assessedLateFine;
      const isFullyPaid = totalDue <= 0;

      totalWaivedLateFine += waivedLateFine;

      if (!isFullyPaid) {
        unpaidMonths.push(monthStr);
        totalDueAmount += totalDue;
        totalContributionDue += contributionDue;
        totalLateFineDue += lateFineDue;
        unpaidMonthDetails.push({
          month: monthStr,
          due: totalDue,
          paid: totalPaid,
          expected,
          monthlyAmount,
          contributionDue,
          isContributionPaid,
          lateFine: assessedLateFine,
          paidLateFine,
          waivedLateFine,
          lateFineDue,
          isLateFinePaid,
          totalDue
        });
      }

      allMonthDetails.push({
        month: monthStr,
        due: totalDue,
        paid: totalPaid,
        expected,
        monthlyAmount,
        contributionDue,
        isContributionPaid,
        lateFine: assessedLateFine,
        paidLateFine,
        waivedLateFine,
        lateFineDue,
        isLateFinePaid,
        totalDue,
        isFullyPaid
      });

      iter.setMonth(iter.getMonth() + 1);
    }

    const monthsDueCount = unpaidMonths.length;
    const estimatedLateFine = totalLateFineDue;

    return {
      monthsDueCount,
      unpaidMonths,
      totalDueAmount,
      totalContributionDue,
      totalLateFineDue,
      totalWaivedLateFine,
      estimatedLateFine,
      unpaidMonthDetails,
      allMonthDetails,
      monthsOverdue: monthsDueCount
    };
  }

  // Post Monthly Collection
  static postCollection(
    db: AppDatabaseState,
    params: {
      memberId: string;
      collectionMonth: string;
      paidAmount: number;
      discount: number;
      paymentMethod: PaymentMethod;
      transactionNo?: string;
      collectionDate?: string;
      receivedBy: string;
      remarks?: string;
      isLateFineOnly?: boolean;
      lateFeeWaived?: boolean;
    }
  ): { success: boolean; message: string; receiptNo?: string; updatedDb?: AppDatabaseState } {
    const member = (db.members || []).find(m => m.memberId === params.memberId);
    if (!member) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }

    const monthColls = (db.collections || []).filter(
      c =>
        c.memberId === params.memberId &&
        c.collectionMonth === params.collectionMonth &&
        (c.status === 'ACTIVE' || c.status === 'POSTED' || !c.status)
    );

    const dateStr = params.collectionDate || new Date().toISOString().split('T')[0];
    const collDate = new Date(dateStr);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = collDate.getDate();
    
    const isPastCutoff = params.collectionMonth < currentMonthStr || (params.collectionMonth === currentMonthStr && day > db.settings.latePaymentDay);
    const defaultLateFine = isPastCutoff ? db.settings.lateFine : 0;

    let isContributionPaid = false;
    let assessedLateFine = defaultLateFine;
    let lateFineDue = defaultLateFine;

    if (monthColls.length > 0) {
      const totalPaid = monthColls.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const totalDiscount = monthColls.reduce((sum, c) => sum + (c.discount || 0), 0);
      const maxMonthlyAmount = Math.max(db.settings.monthlyContribution, ...monthColls.map(c => c.monthlyAmount || 0));
      assessedLateFine = Math.max(...monthColls.map(c => c.lateFine || 0), defaultLateFine);
      
      const netContributionExpected = Math.max(0, maxMonthlyAmount - totalDiscount);
      const contributionPaid = Math.min(totalPaid, netContributionExpected);
      isContributionPaid = (netContributionExpected - contributionPaid) <= 0;
      
      const paidLateFine = Math.max(0, totalPaid - netContributionExpected);
      lateFineDue = Math.max(0, assessedLateFine - paidLateFine);
    }

    if (params.isLateFineOnly) {
      if (!isContributionPaid) {
        return { success: false, message: 'এই মাসের মূল চাঁদা এখনও বকেয়া আছে!' };
      }
      if (lateFineDue <= 0) {
        return { success: false, message: 'এই মাসের কোনো বিলম্ব ফি বকেয়া নেই!' };
      }
    } else {
      if (isContributionPaid) {
        const [year, month] = params.collectionMonth.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, 1);
        const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
        const monthYear = `${monthName} ${year}`;
        const firstCol = monthColls[0];
        return {
          success: false,
          message: lateFineDue > 0 
            ? `এই সদস্যের জন্য ${params.collectionMonth} মাসের মূল চাঁদা ইতিমধ্যে পরিশোধিত (রসিদ নং: ${firstCol?.receiptNo || 'N/A'})। অবশিষ্ট বিলম্ব ফি (৳${lateFineDue}) আদায়ের জন্য 'বিলম্ব ফি পরিশোধ' অপশন ব্যবহার করুন!` 
            : `এই সদস্যের জন্য ${params.collectionMonth} (${monthYear}) মাসের চাঁদা ইতিমধ্যে সক্রিয়ভাবে রেকর্ডভুক্ত রয়েছে (রসিদ নং: ${firstCol?.receiptNo || 'N/A'})। একই মাসে একাধিক সক্রিয় চাঁদা এন্ট্রি অনুমোদিত নয়।`
        };
      }
    }

    const monthlyFee = params.isLateFineOnly ? 0 : db.settings.monthlyContribution;
    const calculatedLateFine = params.isLateFineOnly ? lateFineDue : assessedLateFine;
    const lateFine = params.lateFeeWaived ? 0 : calculatedLateFine;
    
    const totalPayable = monthlyFee + lateFine - (params.discount || 0);
    const currentDue = Math.max(0, totalPayable - params.paidAmount);

    if (totalPayable <= 0) {
      return { success: false, message: 'এই সদস্যের কোনো বকেয়া নেই। নতুন রসিদ তৈরি করা যাবে না।' };
    }

    if (params.paidAmount <= 0) {
      return { success: false, message: 'আদায়কৃত টাকার পরিমাণ ০ বা ঋণাত্মক হতে পারে না। অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' };
    }

    if (params.paidAmount > totalPayable) {
      return { success: false, message: 'পরিশোধের পরিমাণ মোট বকেয়ার চেয়ে বেশি হতে পারবে না।' };
    }

    const receiptNo = this.generateReceiptNo(db);
    const collectionId = `COL-${Date.now()}`;

    const newCollection: Collection = {
      collectionId,
      receiptNo,
      memberId: member.memberId,
      memberName: member.fullName,
      collectionMonth: params.collectionMonth,
      monthlyAmount: monthlyFee,
      previousDue: 0,
      lateFine,
      lateFeeWaived: !!params.lateFeeWaived,
      late_fee_waived: !!params.lateFeeWaived,
      
      discount: params.discount || 0,
      totalPayable,
      paidAmount: params.paidAmount,
      currentDue,
      paymentMethod: params.paymentMethod,
      transactionNo: params.transactionNo || `TXN-${Date.now()}`,
      collectionDate: dateStr,
      receivedBy: params.receivedBy,
      remarks: params.remarks || (params.lateFeeWaived ? 'বিলম্ব ফি মওকুফকৃত' : undefined),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),

      syncStatus: 'LOCAL'
    };

    const netContributionExpected = Math.max(0, monthlyFee - (params.discount || 0));
    const actualMonthlyPaid = Math.min(params.paidAmount, netContributionExpected);
    const actualLateFinePaid = Math.max(0, params.paidAmount - netContributionExpected);

    // Member Ledger
    let currentBalance = this.getMemberRunningBalance(db.memberLedgers, member.memberId);
    const newLedgerEntries: MemberLedgerEntry[] = [];

    if (actualMonthlyPaid > 0) {
      currentBalance += actualMonthlyPaid;
      newLedgerEntries.push({
        ledgerId: `LED-${Date.now()}-M`,
        memberId: member.memberId,
        date: dateStr,
        voucherNo: receiptNo,
        receiptNo,
        description: `Collection - ${params.collectionMonth}`,
        transactionType: 'MONTHLY_COLLECTION',
        debit: 0,
        credit: actualMonthlyPaid,
        balance: currentBalance,
        reference: params.transactionNo,
        sourceType: 'COLLECTION',
        sourceId: collectionId,
        createdAt: new Date().toISOString()
      });
    }

    if (actualLateFinePaid > 0) {
      currentBalance += actualLateFinePaid;
      newLedgerEntries.push({
        ledgerId: `LED-${Date.now()}-LF`,
        memberId: member.memberId,
        date: dateStr,
        voucherNo: receiptNo,
        receiptNo,
        description: `Late Fine - ${params.collectionMonth}`,
        transactionType: 'LATE_FINE',
        debit: 0,
        credit: actualLateFinePaid,
        balance: currentBalance,
        reference: params.transactionNo,
        sourceType: 'COLLECTION',
        sourceId: collectionId,
        createdAt: new Date().toISOString()
      });
    }

    // Update Cash/Bank Book
    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];
    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo: receiptNo,
        reference: params.isLateFineOnly ? `বিলম্ব ফি: ${member.fullName}` : `চাঁদা: ${member.fullName}`,
        description: params.isLateFineOnly ? `${params.collectionMonth} মাসের বিলম্ব ফি আদায়` : `${params.collectionMonth} মাসের চাঁদা আদায়`,
        accountId: params.isLateFineOnly ? ACCOUNT_CODES.LATE_FINE : ACCOUNT_CODES.MONTHLY_SUBSCRIPTION,
        accountName: params.isLateFineOnly ? 'Late Fine Income' : 'মাসিক চাঁদা আয়',
        cashIn: params.paidAmount,
        cashOut: 0,
        balance: currentCash + params.paidAmount,
        sourceType: 'COLLECTION',
        sourceId: collectionId,
        createdBy: params.receivedBy, status: "POSTED" as any,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: receiptNo,
        description: params.isLateFineOnly ? `${member.fullName} এর ${params.collectionMonth} বিলম্ব ফি জমা (${params.paymentMethod})` : `${member.fullName} এর ${params.collectionMonth} চাঁদা জমা (${params.paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: params.paidAmount,
        withdrawal: 0,
        balance: currentBank + params.paidAmount,
        transactionNo: params.transactionNo || `TXN-${Date.now()}`,
        sourceType: 'COLLECTION',
        sourceId: collectionId,
        createdAt: new Date().toISOString()
      });
    }

    // Income records for Collection and Late Fine
    let updatedIncomes = [...db.incomes];
    
    // Monthly Contribution Income
    if (actualMonthlyPaid > 0) {
      updatedIncomes.push({
        incomeId: `INC-${Date.now()}-MAIN`,
        voucherNo: receiptNo,
        date: dateStr,
        incomeHead: 'Monthly Collection',
        memberId: member.memberId,
        memberName: member.fullName,
        amount: actualMonthlyPaid,
        paymentMethod: params.paymentMethod,
        reference: receiptNo,
        remarks: `${params.collectionMonth} মাসিক চাঁদা`,
        createdBy: params.receivedBy, status: "POSTED" as any,
        
        createdAt: new Date().toISOString()
      });
    }

    if (actualLateFinePaid > 0) {
      updatedIncomes.push({
        incomeId: `INC-${Date.now()}-LATE`,
        voucherNo: receiptNo,
        date: dateStr,
        incomeHead: 'Late Fine',
        memberId: member.memberId,
        memberName: member.fullName,
        amount: actualLateFinePaid,
        paymentMethod: params.paymentMethod,
        reference: receiptNo,
        remarks: `${params.collectionMonth} বিলম্ব ফি`,
        createdBy: params.receivedBy, status: "POSTED" as any,
        
        createdAt: new Date().toISOString()
      });
    }
    
    // Journal Entry (Double Entry)
    const debitAccountId = String(params.paymentMethod).toUpperCase() === 'CASH' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK_SONALI; // 1000=Cash, 1010=Bank
    const debitAccountName = String(params.paymentMethod).toUpperCase() === 'CASH' ? 'Cash in Hand' : 'Bank Account';
    
    const lines: Array<{
      accountId: string;
      accountName: string;
      debit: number;
      credit: number;
      description?: string;
    }> = [
      {
        accountId: debitAccountId,
        accountName: debitAccountName,
        debit: params.paidAmount,
        credit: 0,
        description: `Collection Received: ${receiptNo}`
      }
    ];

    if (actualMonthlyPaid > 0) {
      lines.push({
        accountId: ACCOUNT_CODES.MONTHLY_SUBSCRIPTION, // 4020 Monthly Subscription Income
        accountName: 'Monthly Subscription Income',
        debit: 0,
        credit: actualMonthlyPaid,
        description: `Monthly Fee ${params.collectionMonth}`
      });
    }

    if (actualLateFinePaid > 0) {
      lines.push({
        accountId: ACCOUNT_CODES.LATE_FINE, // 4300 Late Fine Income
        accountName: 'Late Fine Income',
        debit: 0,
        credit: actualLateFinePaid,
        description: `Late Fine ${params.collectionMonth}`
      });
    }

    const journalRes = this.postJournalEntry(db, {
      journalNo: `JNL-${receiptNo}`,
      date: dateStr,
      reference: receiptNo,
      description: `Monthly Collection for ${member.fullName}`,
      sourceType: 'COLLECTION',
      sourceId: collectionId,
      
      createdBy: params.receivedBy
    }, lines);

    if (!journalRes.success || !journalRes.entry || !journalRes.lines) {
      return { success: false, message: journalRes.message }; // Atomicity constraint
    }
    
    const updatedJournalEntries = [...(db.journalEntries || []), journalRes.entry];
    const updatedJournalLines = [...(db.journalLines || []), ...journalRes.lines];
    

    // Audit Log
    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: db.activeUserId || 'SYSTEM',
      userName: params.receivedBy,
      dateTime: new Date().toISOString(),
      module: 'COLLECTION',
      action: 'POST',
      recordId: receiptNo,
      newValue: `সদস্য: ${member.fullName}, মাস: ${params.collectionMonth}, পরিমাণ: ৳${params.paidAmount}`,
      remarks: params.lateFeeWaived 
        ? 'মাসিক চাঁদা সংগ্রহ (বিলম্ব ফি মওকুফ অনুমোদিত)' 
        : 'মাসিক চাঁদা সংগ্রহ সফলভাবে লিপিবদ্ধ হয়েছে'
    };

    // Late Fee Waiver Register entry if waived
    const newWaivers: LateFeeWaiver[] = [];
    if (params.lateFeeWaived && calculatedLateFine > 0) {
      newWaivers.push({
        waiverId: `WVR-${receiptNo}-${params.collectionMonth}`,
        memberId: member.memberId,
        memberName: member.fullName,
        collectionId,
        receiptNo,
        collectionMonth: params.collectionMonth,
        calculatedLateFee: calculatedLateFine,
        waivedAmount: calculatedLateFine,
        collectedLateFee: 0,
        waiverDate: dateStr,
        reason: 'বকেয়া আদায়ের সময় বিলম্ব ফি মওকুফ',
        approvedBy: params.receivedBy || 'System Admin',
        approvedByUserId: db.activeUserId || 'USR-0001',
        remarks: params.remarks || 'বিলম্ব ফি মওকুফকৃত',
        status: 'ACTIVE',
        financialYearId: db.settings?.currentFinancialYear || '2026-2027',
        createdAt: new Date().toISOString(),
        sourceType: 'COLLECTION',
        sourceId: collectionId
      });
    }

    const updatedDb: AppDatabaseState = {
      ...db,
      collections: [newCollection, ...db.collections],
      memberLedgers: [...db.memberLedgers, ...newLedgerEntries],
      cashTransactions: updatedCash,
      bankTransactions: updatedBank,
      incomes: updatedIncomes,
      journalEntries: updatedJournalEntries,
      journalLines: updatedJournalLines,
      lateFeeWaivers: [...newWaivers, ...(db.lateFeeWaivers || [])],
      auditLogs: [auditLog, ...db.auditLogs]
    };

    return {
      success: true,
      message: `রসিদ নং ${receiptNo} সফলভাবে তৈরি ও সংরক্ষণ করা হয়েছে!`,
      receiptNo,
      updatedDb
    };
  }

  // Post Multi-Month / Bulk Due Collection
  static postBulkCollection(
    db: AppDatabaseState,
    params: {
      memberId: string;
      months: string[];
      monthlyContribution: number;
      totalLateFine: number;
      totalDiscount: number;
      totalPaidAmount: number;
      paymentMethod: PaymentMethod;
      transactionNo?: string;
      collectionDate?: string;
      receivedBy: string;
      remarks?: string;
      waivedMonths?: string[];
      isLateFineOnly?: boolean;
      lateFeeWaived?: boolean;
    }
  ): { success: boolean; message: string; receiptNo?: string; updatedDb?: AppDatabaseState } {
    const member = (db.members || []).find(m => m.memberId === params.memberId);
    if (!member) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }

    if (!params.months || params.months.length === 0) {
      return { success: false, message: 'বকেয়া আদায়ের জন্য কমপক্ষে একটি মাস নির্বাচন করতে হবে!' };
    }

    const sortedMonths = [...params.months].sort();
    
    // Instead of completely failing on ANY duplicate, let's calculate what's actually due for each selected month
    const dueInfo = this.calculateMemberDue(
        member,
        db.collections,
        db.settings.monthlyContribution,
        db.settings.lateFine,
        db.settings.latePaymentDay
    );

    const monthConfigs: Array<{
      month: string;
      baseDue: number;
      lateFineDue: number;
      alreadyPaidLateFine: number;
      isLateFeeWaived: boolean;
      isLateFineOnly: boolean;
    }> = [];

    let totalPrincipal = 0;
    let totalLateFine = 0;

    for (const month of sortedMonths) {
        const details = dueInfo.unpaidMonthDetails?.find(d => d.month === month);
        const isLateFineOnlyMonth = details ? (details.contributionDue <= 0 && details.lateFineDue > 0) : false;

        const existingActiveCol = (db.collections || []).find(
          c =>
            c.memberId === params.memberId &&
            c.collectionMonth === month &&
            (c.status === 'ACTIVE' || c.status === 'POSTED' || !c.status)
        );
        if (existingActiveCol && !isLateFineOnlyMonth && (!details || details.totalDue <= 0)) {
          return {
            success: false,
            message: `${month} মাসের জন্য ইতিমধ্যে একটি সক্রিয় রসিদ (${existingActiveCol.receiptNo}) বিদ্যমান। ডুপ্লিকেট এন্ট্রি গ্রহণ করা যাবে না।`
          };
        }

        const isMonthWaived = !!params.lateFeeWaived || (params.waivedMonths && params.waivedMonths.includes(month));
        const baseDue = details ? details.contributionDue : (params.monthlyContribution || db.settings.monthlyContribution);
        const monthLateFine = isMonthWaived ? 0 : (details ? details.lateFineDue : 0);
        totalPrincipal += baseDue;
        totalLateFine += monthLateFine;
        
        monthConfigs.push({
            month,
            baseDue,
            lateFineDue: monthLateFine,
            isLateFineOnly: isLateFineOnlyMonth,
            alreadyPaidLateFine: details ? details.paidLateFine : 0,
            isLateFeeWaived: !!isMonthWaived
        });
    }

    const dateStr = params.collectionDate || new Date().toISOString().split('T')[0];
    const monthCount = sortedMonths.length;
    
    const totalDiscount = Math.max(0, params.totalDiscount || 0);
    const totalPayable = totalPrincipal + totalLateFine - totalDiscount;
    const totalPaid = params.totalPaidAmount;

    if (totalPayable <= 0) {
      return { success: false, message: 'এই সদস্যের কোনো বকেয়া নেই। নতুন রসিদ তৈরি করা যাবে না।' };
    }

    if (totalPaid <= 0) {
      return { success: false, message: 'আদায়কৃত টাকার পরিমাণ ০ বা ঋণাত্মক হতে পারে না। অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।' };
    }

    if (totalPaid > totalPayable) {
      return { success: false, message: 'পরিশোধের পরিমাণ মোট বকেয়ার চেয়ে বেশি হতে পারবে না।' };
    }

    const receiptNo = this.generateReceiptNo(db);

    // Use accurate per-month late fine from config, do not distribute evenly
    // Distribute ONLY discount evenly across individual monthly collection records
    const perMonthDiscount = Math.floor(totalDiscount / monthCount);
    const discountRemainder = totalDiscount % monthCount;

    const newCollections: Collection[] = [];
    const newLedgerEntries: MemberLedgerEntry[] = [];
    let currentBalance = this.getMemberRunningBalance(db.memberLedgers, member.memberId);
    let remainingPayment = totalPaid;
    let totalActualMonthlyPaid = 0;
    let totalActualLateFinePaid = 0;

    monthConfigs.forEach((config, idx) => {
      const isLast = idx === monthCount - 1;
      const monthLateFine = config.lateFineDue; // Use exact month-specific late fine (0 if waived)
      const monthDiscount = isLast ? perMonthDiscount + discountRemainder : perMonthDiscount;
      const monthTotalPayable = config.baseDue + monthLateFine - monthDiscount;
      
      const monthPaidAmount = Math.min(remainingPayment, monthTotalPayable);
      remainingPayment -= monthPaidAmount;

      if (monthPaidAmount > 0) {
          const collectionId = `COL-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

          // 1. Individual Monthly Collection Record
          newCollections.push({
            collectionId,
            receiptNo,
            memberId: member.memberId,
            memberName: member.fullName,
            collectionMonth: config.month,
            monthlyAmount: config.baseDue,
            previousDue: 0,
            lateFine: monthLateFine,
            lateFeeWaived: config.isLateFeeWaived,
            late_fee_waived: config.isLateFeeWaived,
            isLateFineOnly: config.isLateFineOnly,
            discount: monthDiscount,
            totalPayable: monthTotalPayable,
            paidAmount: monthPaidAmount,
            currentDue: monthTotalPayable - monthPaidAmount,
            paymentMethod: params.paymentMethod,
            transactionNo: params.transactionNo || `TXN-${Date.now()}`,
            collectionDate: dateStr,
            receivedBy: params.receivedBy,
            remarks: params.remarks || (config.isLateFeeWaived ? `বকেয়া আদায় (বিলম্ব ফি মওকুফ)` : (config.isLateFineOnly ? `বকেয়া বিলম্ব ফি আদায়` : `বকেয়া আদায়`)),
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
      
      syncStatus: 'LOCAL'
          });

          // Accurate Contribution vs Late Fine split for this specific month
          const netContributionExpected = Math.max(0, config.baseDue - monthDiscount);
          const contributionPaidForMonth = Math.min(monthPaidAmount, netContributionExpected);
          const lateFinePaidForMonth = Math.max(0, monthPaidAmount - netContributionExpected);

          totalActualMonthlyPaid += contributionPaidForMonth;
          totalActualLateFinePaid += lateFinePaidForMonth;

          // 2a. Member Ledger Entry for Month Contribution
          if (contributionPaidForMonth > 0) {
              currentBalance += contributionPaidForMonth;
              newLedgerEntries.push({
                ledgerId: `LED-${Date.now()}-${idx}-M`,
                memberId: member.memberId,
                date: dateStr,
                voucherNo: receiptNo,
                receiptNo,
                description: `Collection - ${config.month}`,
                transactionType: 'MONTHLY_COLLECTION',
                debit: 0,
                credit: contributionPaidForMonth,
                balance: currentBalance,
                reference: params.transactionNo || receiptNo,
                sourceType: 'COLLECTION',
                sourceId: collectionId,
                createdAt: new Date().toISOString()
              });
          }

          // 2b. Member Ledger Entry for Month Late Fine
          if (lateFinePaidForMonth > 0) {
              currentBalance += lateFinePaidForMonth;
              newLedgerEntries.push({
                ledgerId: `LED-${Date.now()}-${idx}-LF`,
                memberId: member.memberId,
                date: dateStr,
                voucherNo: receiptNo,
                receiptNo,
                description: `Late Fine - ${config.month}`,
                transactionType: 'LATE_FINE',
                debit: 0,
                credit: lateFinePaidForMonth,
                balance: currentBalance,
                reference: params.transactionNo || receiptNo,
                sourceType: 'COLLECTION',
                sourceId: collectionId,
                createdAt: new Date().toISOString()
              });
          }
      }
    });

    // Remove the old combined Late Fine ledger entry code since we now do it per-month

    // 3. ONE Cash/Bank Book Entry for the entire payment
    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];

    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo: receiptNo,
        reference: `বকেয়া চাঁদা: ${member.fullName}`,
        description: `${member.fullName} এর ${monthCount} মাসের বকেয়া চাঁদা আদায় (${sortedMonths[0]} হতে ${sortedMonths[sortedMonths.length - 1]})`,
        accountId: ACCOUNT_CODES.MONTHLY_SUBSCRIPTION,
        accountName: 'মাসিক চাঁদা আয়',
        cashIn: totalPaid,
        cashOut: 0,
        balance: currentCash + totalPaid,
        sourceType: 'COLLECTION',
        sourceId: receiptNo,
        createdBy: params.receivedBy, status: "POSTED" as any,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: receiptNo,
        description: `${member.fullName} এর ${monthCount} মাসের বকেয়া চাঁদা জমা (${params.paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: totalPaid,
        withdrawal: 0,
        balance: currentBank + totalPaid,
        transactionNo: params.transactionNo || `TXN-${Date.now()}`,
        sourceType: 'COLLECTION',
        sourceId: receiptNo,
        createdAt: new Date().toISOString()
      });
    }

    // 4. Incomes Register
    let updatedIncomes = [...db.incomes];
    const actualLateFinePaid = totalActualLateFinePaid;
    const actualMonthlyPaid = totalActualMonthlyPaid;

    // Main Monthly Contribution Income
    if (actualMonthlyPaid > 0) {
      updatedIncomes.push({
        incomeId: `INC-${Date.now()}-MAIN`,
        voucherNo: receiptNo,
        date: dateStr,
        incomeHead: 'Monthly Collection',
        memberId: member.memberId,
        memberName: member.fullName,
        amount: actualMonthlyPaid,
        paymentMethod: params.paymentMethod,
        reference: receiptNo,
        remarks: `${monthCount} মাসের বকেয়া চাঁদা (${sortedMonths[0]} হতে ${sortedMonths[sortedMonths.length - 1]})`,
        createdBy: params.receivedBy, status: "POSTED" as any,
        
        createdAt: new Date().toISOString()
      });
    }

    // Late Fine Income (Separately Identifiable)
    if (actualLateFinePaid > 0) {
      updatedIncomes.push({
        incomeId: `INC-${Date.now()}-LATE`,
        voucherNo: receiptNo,
        date: dateStr,
        incomeHead: 'Late Fine',
        memberId: member.memberId,
        memberName: member.fullName,
        amount: actualLateFinePaid,
        paymentMethod: params.paymentMethod,
        reference: receiptNo,
        remarks: `${monthCount} মাসের বকেয়া চাঁদার বিলম্ব ফি`,
        createdBy: params.receivedBy, status: "POSTED" as any,
        
        createdAt: new Date().toISOString()
      });
    }

    // 5. Journal Entry (Double Entry)
    const debitAccountId = String(params.paymentMethod).toUpperCase() === 'CASH' ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK_SONALI;
    const debitAccountName = String(params.paymentMethod).toUpperCase() === 'CASH' ? 'Cash in Hand' : 'Bank Account';

    const journalLines: Array<{
      accountId: string;
      accountName: string;
      debit: number;
      credit: number;
      description?: string;
    }> = [
      {
        accountId: debitAccountId,
        accountName: debitAccountName,
        debit: totalPaid,
        credit: 0,
        description: `Bulk Collection Received (${monthCount} months): ${receiptNo}`
      }
    ];

    if (actualMonthlyPaid > 0) {
      journalLines.push({
        accountId: ACCOUNT_CODES.MONTHLY_SUBSCRIPTION, // 4020 Monthly Subscription Income
        accountName: 'Monthly Subscription Income',
        debit: 0,
        credit: actualMonthlyPaid,
        description: `Monthly Fee (${sortedMonths[0]} to ${sortedMonths[sortedMonths.length - 1]})`
      });
    }

    if (actualLateFinePaid > 0) {
      journalLines.push({
        accountId: ACCOUNT_CODES.LATE_FINE, // 4300 Late Fine Income
        accountName: 'Late Fine Income',
        debit: 0,
        credit: actualLateFinePaid,
        description: `Late Fine for ${monthCount} months`
      });
    }

    const journalRes = this.postJournalEntry(db, {
      journalNo: `JNL-${receiptNo}`,
      date: dateStr,
      reference: receiptNo,
      description: `Bulk Collection for ${member.fullName} (${monthCount} months)`,
      sourceType: 'COLLECTION',
      sourceId: receiptNo,
      
      createdBy: params.receivedBy
    }, journalLines);

    if (!journalRes.success || !journalRes.entry || !journalRes.lines) {
      return { success: false, message: journalRes.message };
    }

    const updatedJournalEntries = [...(db.journalEntries || []), journalRes.entry];
    const updatedJournalLines = [...(db.journalLines || []), ...journalRes.lines];

    // 6. Audit Log
    const isAnyWaived = !!params.lateFeeWaived || (params.waivedMonths && params.waivedMonths.length > 0);
    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: db.activeUserId || 'SYSTEM',
      userName: params.receivedBy,
      dateTime: new Date().toISOString(),
      module: 'COLLECTION',
      action: 'POST',
      recordId: receiptNo,
      newValue: `সদস্য: ${member.fullName}, মোট মাস: ${monthCount}, মূল চাঁদা: ৳${totalPrincipal}, জরিমানা: ৳${totalLateFine}, মোট আদায়: ৳${totalPaid}`,
      remarks: isAnyWaived
        ? `${monthCount} মাসের বকেয়া চাঁদা আদায় (বিলম্ব ফি মওকুফ অনুমোদিত)`
        : `${monthCount} মাসের বকেয়া চাঁদা একসাথে সফলভাবে আদায় ও সংরক্ষণ করা হয়েছে`
    };

    // 7. Late Fee Waiver Register entries for bulk collection
    const newBulkWaivers: LateFeeWaiver[] = [];
    monthConfigs.forEach((config, idx) => {
      if (config.isLateFeeWaived) {
        const details = dueInfo.unpaidMonthDetails?.find(d => d.month === config.month);
        const calculatedFee = details ? (details.lateFineDue || details.lateFine || db.settings.lateFine) : db.settings.lateFine;
        const waiverId = `WVR-${receiptNo}-${config.month}`;
        const collId = newCollections[idx]?.collectionId || receiptNo;

        // Idempotency: verify not duplicate
        const isDup = (db.lateFeeWaivers || []).some(w =>
          w.memberId === member.memberId &&
          (w.receiptNo === receiptNo || w.sourceId === collId) &&
          w.collectionMonth === config.month &&
          w.status === 'ACTIVE'
        );

        if (!isDup && calculatedFee > 0) {
          newBulkWaivers.push({
            waiverId,
            memberId: member.memberId,
            memberName: member.fullName,
            collectionId: collId,
            receiptNo,
            collectionMonth: config.month,
            calculatedLateFee: calculatedFee,
            waivedAmount: calculatedFee,
            collectedLateFee: 0,
            waiverDate: dateStr,
            reason: 'বকেয়া আদায়ের সময় বিলম্ব ফি মওকুফ',
            approvedBy: params.receivedBy || 'System Admin',
            approvedByUserId: db.activeUserId || 'USR-0001',
            remarks: params.remarks || 'একসাথে বকেয়া আদায়কালীন বিলম্ব ফি মওকুফ',
            status: 'ACTIVE',
            financialYearId: db.settings?.currentFinancialYear || '2026-2027',
            createdAt: new Date().toISOString(),
            sourceType: 'BULK_COLLECTION',
            sourceId: receiptNo
          });
        }
      }
    });

    const updatedDb: AppDatabaseState = {
      ...db,
      collections: [...newCollections, ...db.collections],
      memberLedgers: [...db.memberLedgers, ...newLedgerEntries],
      cashTransactions: updatedCash,
      bankTransactions: updatedBank,
      incomes: updatedIncomes,
      journalEntries: updatedJournalEntries,
      journalLines: updatedJournalLines,
      lateFeeWaivers: [...newBulkWaivers, ...(db.lateFeeWaivers || [])],
      auditLogs: [auditLog, ...db.auditLogs]
    };

    return {
      success: true,
      message: `বকেয়া আদায় সফল হয়েছে। (পরিশোধিত মাস: ${monthCount}, মূল চাঁদা: ৳${totalPrincipal.toLocaleString()}, জরিমানা: ৳${totalLateFine.toLocaleString()}, মোট গ্রহণ: ৳${totalPaid.toLocaleString()})`,
      receiptNo,
      updatedDb
    };
  }

  // Reverse / Cancel Collection
  static reverseCollection(
    db: AppDatabaseState,
    receiptNo: string,
    reason: string,
    reversedBy: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const targetCollections = (db.collections || []).filter(c => c.receiptNo === receiptNo && c.status !== 'REVERSED');
    if (targetCollections.length === 0) {
      return { success: false, message: 'সংশ্লিষ্ট রসিদ নম্বরের কোনো সক্রিয় কালেকশন পাওয়া যায়নি।' };
    }

    const totalReversedAmount = targetCollections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const dateStr = new Date().toISOString().split('T')[0];
    const memberId = targetCollections[0].memberId;
    const memberName = targetCollections[0].memberName;

    // 1. Mark collections as REVERSED
    const updatedCollections: Collection[] = (db.collections || []).map(c => {
      if (c.receiptNo === receiptNo) {
        return {
          ...c,
          status: 'REVERSED' as any,
          remarks: `${c.remarks || ''} [বাতিল/রিভার্সড: ${reason}]`.trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    // 2. Member ledger reversal
    let currentBalance = this.getMemberRunningBalance(db.memberLedgers, memberId);
    const reversalLedgerEntry: MemberLedgerEntry = {
      ledgerId: `LED-${Date.now()}-REV`,
      memberId,
      date: dateStr,
      voucherNo: receiptNo,
      receiptNo,
      description: `কালেকশন রিভার্সাল / বাতিল: ${reason}`,
      transactionType: 'OTHER',
      debit: totalReversedAmount,
      credit: 0,
      balance: Math.max(0, currentBalance - totalReversedAmount),
      reference: receiptNo,
      sourceType: 'COLLECTION',
      sourceId: targetCollections[0].collectionId,
      createdAt: new Date().toISOString()
    };

    // 3. Cash / Bank reversal
    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    const paymentMethod = targetCollections[0].paymentMethod;

    if (paymentMethod === 'Cash') {
      const currentCash = this.getCashBalance(updatedCash);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-REV`,
        date: dateStr,
        voucherNo: receiptNo,
        description: `কালেকশন বাতিল রিভার্সাল (${memberName}, রসিদ: ${receiptNo}): ${reason}`,
        accountId: '1000',
        accountName: 'হাতে নগদ',
        cashIn: 0,
        cashOut: totalReversedAmount,
        balance: currentCash - totalReversedAmount,
        reference: receiptNo,
        sourceType: 'COLLECTION',
        sourceId: targetCollections[0].collectionId,
        createdBy: reversedBy,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(updatedBank);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV`,
        date: dateStr,
        reference: receiptNo,
        description: `কালেকশন বাতিল রিভার্সাল (${memberName}, রসিদ: ${receiptNo}): ${reason}`,
        bankName: 'ব্যাংক হিসাব',
        accountNumberMasked: '***',
        deposit: 0,
        withdrawal: totalReversedAmount,
        balance: currentBank - totalReversedAmount,
        transactionNo: receiptNo,
        sourceType: 'COLLECTION',
        sourceId: targetCollections[0].collectionId,
        createdAt: new Date().toISOString()
      });
    }

    // 4. Update Late Fee Waivers
    const updatedWaivers = (db.lateFeeWaivers || []).map(w => {
      if (w.receiptNo === receiptNo || (targetCollections.some(c => c.collectionId === w.collectionId))) {
        return {
          ...w,
          status: 'REVERSED' as const,
          remarks: `${w.remarks || ''} [বাতিল/রিভার্সড: ${reason}]`.trim()
        };
      }
      return w;
    });

    // 5. Audit Log
    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: db.activeUserId || 'SYSTEM',
      userName: reversedBy || 'ADMIN',
      dateTime: new Date().toISOString(),
      module: 'COLLECTION',
      action: 'REVERSE',
      recordId: receiptNo,
      newValue: `পরিমাণ: ৳${totalReversedAmount}`,
      remarks: `কালেকশন রসিদ ${receiptNo} বাতিল/রিভার্স করা হয়েছে (কারণ: ${reason})`
    };

    const updatedDb: AppDatabaseState = {
      ...db,
      collections: updatedCollections,
      memberLedgers: [...(db.memberLedgers || []), reversalLedgerEntry],
      cashTransactions: updatedCash,
      bankTransactions: updatedBank,
      lateFeeWaivers: updatedWaivers,
      auditLogs: [auditLog, ...(db.auditLogs || [])]
    };

    return {
      success: true,
      message: `রসিদ নং ${receiptNo} এর কালেকশন সফলভাবে রিভার্স/বাতিল করা হয়েছে।`,
      updatedDb
    };
  }

  // Post Capital Deposit
  static postCapitalDeposit(
    db: AppDatabaseState,
    params: {
      memberId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      transactionNo?: string;
      date?: string;
      remarks?: string;
      createdBy: string;
    }
  ): { success: boolean; message: string; voucherNo?: string; updatedDb?: AppDatabaseState } {
    const member = (db.members || []).find(m => m.memberId === params.memberId);
    if (!member) {
      return { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি!' };
    }
    if (params.amount <= 0) {
      return { success: false, message: 'মূলধনের পরিমাণ অবশ্যই ধনাত্মক হতে হবে!' };
    }

    const dateStr = params.date || new Date().toISOString().split('T')[0];
    const voucherNo = this.generateVoucherNo(db, 'CAP');
    const depositId = `CAP-DEP-${Date.now()}`;

    const newDeposit: CapitalDeposit = {
      depositId,
      voucherNo,
      date: dateStr,
      memberId: member.memberId,
      memberName: member.fullName,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      transactionNo: params.transactionNo || `TXN-${Date.now()}`,
      remarks: params.remarks || 'সদস্য মূলধন তহবিল জমা',
      createdBy: params.createdBy, status: "ACTIVE", /* journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`, removed duplicate */
      
      createdAt: new Date().toISOString(),

      syncStatus: 'LOCAL'
    };

    // Ledger
    const currentBalance = this.getMemberRunningBalance(db.memberLedgers, member.memberId);
    const ledgerEntry: MemberLedgerEntry = {
      ledgerId: `LED-${Date.now()}`,
      memberId: member.memberId,
      date: dateStr,
      voucherNo,
      receiptNo: voucherNo,
      description: `সদস্য মূলধন জমা: ৳${params.amount}`,
      transactionType: 'CAPITAL_DEPOSIT',
      debit: 0,
      credit: params.amount,
      balance: currentBalance + params.amount,
      reference: params.transactionNo,
      sourceType: 'CAPITAL',
      sourceId: depositId,
      createdAt: new Date().toISOString()
    };

    // Cash/Bank Book
    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];

    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo,
        reference: `মূলধন: ${member.fullName}`,
        description: 'সদস্য মূলধন তহবিল জমা',
        accountId: '3000',
        accountName: 'সদস্যদের মূলধন তহবিল',
        cashIn: params.amount,
        cashOut: 0,
        balance: currentCash + params.amount,
        sourceType: 'CAPITAL',
        sourceId: depositId,
        createdBy: params.createdBy, status: "POSTED" as any,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: voucherNo,
        description: `${member.fullName} এর মূলধন জমা (${params.paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: params.amount,
        withdrawal: 0,
        balance: currentBank + params.amount,
        transactionNo: params.transactionNo || `TXN-${Date.now()}`,
        sourceType: 'CAPITAL',
        sourceId: depositId,
        createdAt: new Date().toISOString()
      });
    }

    const auditLog: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: db.activeUserId || 'SYSTEM',
      userName: params.createdBy,
      dateTime: new Date().toISOString(),
      module: 'CAPITAL',
      action: 'POST',
      recordId: voucherNo,
      newValue: `সদস্য: ${member.fullName}, মূলধন: ৳${params.amount}`,
      remarks: 'সদস্য মূলধন জমা ভাউচার সম্পন্ন হয়েছে'
    };

    return {
      success: true,
      message: `মূলধন ভাউচার ${voucherNo} সফলভাবে সম্পন্ন হয়েছে!`,
      voucherNo,
      updatedDb: {
        ...db,
        capitalDeposits: [newDeposit, ...db.capitalDeposits],
        memberLedgers: [...db.memberLedgers, ledgerEntry],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        auditLogs: [auditLog, ...db.auditLogs]
      }
    };
  }

  // Post Loan Application & Disbursement
  static postLoanApplication(
    db: AppDatabaseState,
    params: {
      memberId: string;
      requestedAmount?: number;
      appliedAmount?: number;
      purpose: string;
      termMonths?: number;
      durationMonths?: number;
      interestRate?: number;
      interestRatePercentage?: number;
      securityDetails?: string;
      guarantorMemberId?: string;
      guarantor1Name?: string;
      guarantor2Name?: string;
      remarks?: string;
    }
  ): { success: boolean; message: string; loanId?: string; updatedDb?: AppDatabaseState } {
    const member = (db.members || []).find(m => m.memberId === params.memberId);
    if (!member) return { success: false, message: 'সদস্য পাওয়া যায়নি!' };

    const amount = params.requestedAmount ?? params.appliedAmount ?? 0;
    const duration = params.termMonths ?? params.durationMonths ?? 10;
    const rate = params.interestRatePercentage ?? params.interestRate ?? 0;

    const guarantor = params.guarantorMemberId
      ? (db.members || []).find(m => m.memberId === params.guarantorMemberId)
      : undefined;

    const loanId = this.generateVoucherNo(db, 'LN');

    const newLoan: LoanApplication = {
      loanId,
      memberId: member.memberId,
      memberName: member.fullName,
      applicationDate: new Date().toISOString().split('T')[0],
      requestedAmount: amount,
      appliedAmount: amount,
      purpose: params.purpose,
      termMonths: duration,
      durationMonths: duration,
      interestRatePercentage: rate,
      interestRate: rate,
      monthlyInstallment: Math.round(amount / Math.max(1, duration)),
      securityDetails: params.securityDetails || 'N/A',
      guarantorMemberId: guarantor?.memberId,
      guarantorName: guarantor?.fullName || params.guarantor1Name,
      guarantor1Name: params.guarantor1Name || guarantor?.fullName,
      guarantor2Name: params.guarantor2Name,
      repaidPrincipal: 0,
      repaidProfitOrCharge: 0,
      totalOutstanding: amount,
      status: 'PENDING',
      remarks: params.remarks,
      createdAt: new Date().toISOString(),

      syncStatus: 'LOCAL'
    };

    return {
      success: true,
      message: `ঋণ আবেদন নং ${loanId} জমা হয়েছে। অনুমোদনের অপেক্ষায় আছে।`,
      loanId,
      updatedDb: {
        ...db,
        loans: [newLoan, ...(db.loans || [])],
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: 'ব্যবহারকারী',
            dateTime: new Date().toISOString(),
            module: 'LOAN',
            action: 'CREATE',
            recordId: loanId,
            newValue: `আবেদনকারী: ${member.fullName}, পরিমাণ: ৳${amount}`,
            remarks: 'নতুন ঋণ আবেদন দাখিল করা হয়েছে'
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Approve Loan
  static approveLoan(
    db: AppDatabaseState,
    params: {
      loanId: string;
      approvedAmount?: number;
      approvedBy?: string;
      resolutionNo?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const loan = (db.loans || []).find(l => l.loanId === params.loanId);
    if (!loan) return { success: false, message: 'ঋণ পাওয়া যায়নি!' };

    const approvedAmount = params.approvedAmount ?? loan.approvedAmount ?? loan.requestedAmount ?? (loan as any).appliedAmount ?? 0;
    const dateStr = new Date().toISOString().split('T')[0];
    const approvedBy = params.approvedBy || 'Admin';
    const resolutionNo = params.resolutionNo || loan.resolutionNo || 'RES-AUTO';

    const updatedLoan: LoanApplication = {
      ...loan,
      approvedAmount,
      appliedAmount: loan.appliedAmount || loan.requestedAmount,
      requestedAmount: loan.requestedAmount || approvedAmount,
      approvalDate: dateStr,
      approvedBy,
      resolutionNo,
      status: 'APPROVED',
      totalOutstanding: approvedAmount
    };

    return {
      success: true,
      message: `ঋণ আবেদন নং ${loan.loanId} অনুমোদন করা হয়েছে (অনুমোদিত পরিমাণ: ৳${approvedAmount})!`,
      updatedDb: {
        ...db,
        loans: (db.loans || []).map(l => (l.loanId === loan.loanId ? updatedLoan : l)),
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: approvedBy,
            dateTime: new Date().toISOString(),
            module: 'LOAN',
            action: 'APPROVE',
            recordId: loan.loanId,
            newValue: `অনুমোদিত পরিমাণ: ৳${approvedAmount}, রেজুলেশন: ${resolutionNo}`,
            remarks: `ঋণ #${loan.loanId} অনুমোদন করা হয়েছে`
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Reject Loan
  static rejectLoan(
    db: AppDatabaseState,
    params: {
      loanId: string;
      rejectedBy?: string;
      reason?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const loan = (db.loans || []).find(l => l.loanId === params.loanId);
    if (!loan) return { success: false, message: 'ঋণ পাওয়া যায়নি!' };

    const updatedLoan: LoanApplication = {
      ...loan,
      status: 'REJECTED',
      remarks: params.reason ? `${loan.remarks || ''} [বাতিলের কারণ: ${params.reason}]` : loan.remarks
    };

    return {
      success: true,
      message: `ঋণ আবেদন নং ${loan.loanId} বাতিল করা হয়েছে।`,
      updatedDb: {
        ...db,
        loans: (db.loans || []).map(l => (l.loanId === loan.loanId ? updatedLoan : l)),
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.rejectedBy || 'Admin',
            dateTime: new Date().toISOString(),
            module: 'LOAN',
            action: 'REJECT',
            recordId: loan.loanId,
            newValue: `স্ট্যাটাস: বাতিল, কারণ: ${params.reason || 'N/A'}`,
            remarks: `ঋণ #${loan.loanId} বাতিল করা হয়েছে`
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Approve and Disburse Loan
  static disburseLoan(
    db: AppDatabaseState,
    params: {
      loanId: string;
      approvedAmount?: number;
      paymentMethod?: PaymentMethod;
      resolutionNo?: string;
      approvedBy?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const loan = (db.loans || []).find(l => l.loanId === params.loanId);
    if (!loan) return { success: false, message: 'ঋণ পাওয়া যায়নি!' };
    
    if (loan.status === 'ACTIVE' || loan.status === 'COMPLETED') {
       return { success: false, message: 'এই ঋণটি ইতিমধ্যে বিতরণ করা হয়েছে।' };
    }

    const amountToDisburse = params.approvedAmount ?? loan.approvedAmount ?? loan.requestedAmount ?? (loan as any).appliedAmount ?? 0;
    
    if (amountToDisburse <= 0) {
      return { success: false, message: 'বিতরণের পরিমাণ অবশ্যই ধনাত্মক হতে হবে (শূন্য বা তার কম হতে পারবে না)!' };
    }

    const paymentMethod: PaymentMethod = params.paymentMethod || loan.paymentMethod || 'Cash';
    const resolutionNo = params.resolutionNo || loan.resolutionNo || `RES-DISB-${loan.loanId}`;
    const approvedBy = params.approvedBy || loan.approvedBy || 'Admin';

    // Check cash/bank balance before disbursement
    const isCash = paymentMethod === 'Cash';
    if (isCash) {
      const cash = this.getCashBalance(db.cashTransactions);
      if (cash < amountToDisburse) {
        return { success: false, message: `পর্যাপ্ত নগদ ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${cash}` };
      }
    } else {
      const bank = this.getBankBalance(db.bankTransactions);
      if (bank < amountToDisburse) {
        return { success: false, message: `পর্যাপ্ত ব্যাংক ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${bank}` };
      }
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const voucherNo = this.generateVoucherNo(db, 'VCH');

    const updatedLoan: LoanApplication = {
      ...loan,
      approvedAmount: amountToDisburse,
      approvalDate: loan.approvalDate || dateStr,
      disbursementDate: dateStr,
      disbursementVoucherNo: voucherNo,
      paymentMethod,
      resolutionNo,
      approvedBy,
      totalOutstanding: amountToDisburse,
      status: 'ACTIVE'
    };

    // Member Ledger
    const currentBalance = this.getMemberRunningBalance(db.memberLedgers, loan.memberId);
    const ledgerEntry: MemberLedgerEntry = {
      ledgerId: `LED-${Date.now()}`,
      memberId: loan.memberId,
      date: dateStr,
      voucherNo,
      receiptNo: voucherNo,
      description: `ঋণ বিতরণ: ৳${amountToDisburse} (রেজুলেশন: ${resolutionNo})`,
      transactionType: 'LOAN_DISBURSED',
      debit: amountToDisburse,
      credit: 0,
      balance: currentBalance - amountToDisburse,
      reference: loan.loanId,
      sourceType: 'LOAN',
      sourceId: loan.loanId,
          status: "ACTIVE",
      createdAt: new Date().toISOString()
    };

    // Cash/Bank Out
    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];

    if (isCash) {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo,
        reference: `ঋণ বিতরণ: ${loan.memberName}`,
        description: `ঋণ বিতরণ (${loan.loanId})`,
        accountId: '1200',
        accountName: 'প্রদত্ত ঋণ হিসাব',
        cashIn: 0,
        cashOut: amountToDisburse,
        balance: currentCash - amountToDisburse,
        sourceType: 'LOAN_DISBURSEMENT',
        sourceId: loan.loanId,
          status: "ACTIVE",
        createdBy: approvedBy,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: voucherNo,
        description: `${loan.memberName} কে ঋণ বিতরণ (${paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: 0,
        withdrawal: amountToDisburse,
        balance: currentBank - amountToDisburse,
        transactionNo: voucherNo,
        sourceType: 'LOAN_DISBURSEMENT',
        sourceId: loan.loanId,
        createdAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: `ঋণ নং ${loan.loanId} সফলভাবে বিতরণ করা হয়েছে!`,
      updatedDb: {
        ...db,
        loans: (db.loans || []).map(l => (l.loanId === loan.loanId ? updatedLoan : l)),
        memberLedgers: [...db.memberLedgers, ledgerEntry],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: approvedBy,
            dateTime: new Date().toISOString(),
            module: 'LOAN',
            action: 'APPROVE',
            recordId: loan.loanId,
            newValue: `বিতরণকৃত পরিমাণ: ৳${amountToDisburse}`,
            remarks: `ঋণ নং ${loan.loanId} বিতরণ করা হয়েছে`
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Post Loan Repayment
  static postLoanRepayment(
    db: AppDatabaseState,
    params: {
      loanId: string;
      principalAmount: number;
      profitOrCharge?: number;
      interestAmount?: number;
      lateFine?: number;
      paymentMethod: PaymentMethod;
      remarks?: string;
      receivedBy: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const loan = (db.loans || []).find(l => l.loanId === params.loanId);
    if (!loan) return { success: false, message: 'ঋণ রেকর্ড খুঁজে পাওয়া যায়নি!' };

    if (params.principalAmount > loan.totalOutstanding) {
      return {
        success: false,
        message: `এই ঋণের বকেয়া (৳${loan.totalOutstanding}) এর চেয়ে বেশি টাকা জমা দেওয়া যাবে না!`
      };
    }

    const profitOrCharge = params.profitOrCharge ?? params.interestAmount ?? 0;
    const lateFine = params.lateFine ?? 0;
    const dateStr = new Date().toISOString().split('T')[0];
    const voucherNo = this.generateVoucherNo(db, 'LN').replace('LN-', 'LNR-');
    const totalPaid = params.principalAmount + profitOrCharge + lateFine;
    const remainingBalance = Math.max(0, loan.totalOutstanding - params.principalAmount);

    const repayment: LoanRepayment = {
      repaymentId: `LNR-${Date.now()}`,
      loanId: loan.loanId,
      memberId: loan.memberId,
      memberName: loan.memberName,
      date: dateStr,
      installmentNo: (db.loanRepayments || []).filter(r => r.loanId === loan.loanId).length + 1,
      principalAmount: params.principalAmount,
      profitOrCharge,
      totalPaid,
      remainingBalance,
      paymentMethod: params.paymentMethod,
      voucherNo,
      remarks: params.remarks,
      receivedBy: params.receivedBy,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    const isCompleted = remainingBalance <= 0;
    const updatedLoan: LoanApplication = {
      ...loan,
      repaidPrincipal: loan.repaidPrincipal + params.principalAmount,
      repaidProfitOrCharge: loan.repaidProfitOrCharge + profitOrCharge,
      totalOutstanding: remainingBalance,
      status: isCompleted ? 'COMPLETED' : loan.status
    };

    // Member Ledger
    const currentBalance = this.getMemberRunningBalance(db.memberLedgers, loan.memberId);
    const ledgerEntry: MemberLedgerEntry = {
      ledgerId: `LED-${Date.now()}`,
      memberId: loan.memberId,
      date: dateStr,
      voucherNo,
      receiptNo: voucherNo,
      description: `ঋণ কিস্তি জমা: ৳${totalPaid} (অবশিষ্ট: ৳${remainingBalance})`,
      transactionType: 'LOAN_REPAYMENT',
      debit: 0,
      credit: totalPaid,
      balance: currentBalance + totalPaid,
      reference: loan.loanId,
      sourceType: 'LOAN_REPAYMENT',
      sourceId: repayment.repaymentId,
      createdAt: new Date().toISOString()
    };

    // Cash/Bank In
    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];

    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo,
        reference: `ঋণ কিস্তি: ${loan.memberName}`,
        description: `ঋণ কিস্তি আদায় (${loan.loanId})`,
        accountId: '1200',
        accountName: 'প্রদত্ত ঋণ হিসাব',
        cashIn: totalPaid,
        cashOut: 0,
        balance: currentCash + totalPaid,
        sourceType: 'LOAN_REPAYMENT',
        sourceId: repayment.repaymentId,
        createdBy: params.receivedBy, status: "POSTED" as any,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: voucherNo,
        description: `${loan.memberName} এর ঋণ কিস্তি (${params.paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: totalPaid,
        withdrawal: 0,
        balance: currentBank + totalPaid,
        transactionNo: voucherNo,
        sourceType: 'LOAN_REPAYMENT',
        sourceId: repayment.repaymentId,
        createdAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: `ঋণ কিস্তি নং ${repayment.installmentNo} (৳${totalPaid}) সফলভাবে আদায় করা হয়েছে!`,
      updatedDb: {
        ...db,
        loans: (db.loans || []).map(l => (l.loanId === loan.loanId ? updatedLoan : l)),
        loanRepayments: [repayment, ...db.loanRepayments],
        memberLedgers: [...db.memberLedgers, ledgerEntry],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.receivedBy,
            dateTime: new Date().toISOString(),
            module: 'LOAN',
            action: 'POST',
            recordId: voucherNo,
            newValue: `আদায়: ৳${totalPaid}, ঋণ নং: ${loan.loanId}`,
            remarks: 'ঋণ কিস্তি পরিশোধ লিপিবদ্ধ হয়েছে'
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Post Income
  static postIncome(
    db: AppDatabaseState,
    params: {
      incomeHead: string;
      amount: number;
      paymentMethod: PaymentMethod;
      memberId?: string;
      reference?: string;
      remarks?: string;
      createdBy: string;
    }
  ): { success: boolean; message: string; voucherNo?: string; updatedDb?: AppDatabaseState } {
    if (params.amount <= 0) return { success: false, message: 'আয়ের পরিমাণ সঠিক নয়!' };

    const dateStr = new Date().toISOString().split('T')[0];
    const voucherNo = this.generateVoucherNo(db, 'INC');
    const member = params.memberId ? (db.members || []).find(m => m.memberId === params.memberId) : undefined;

    const newIncome: Income = {
      incomeId: `INC-${Date.now()}`,
      voucherNo,
      date: dateStr,
      incomeHead: params.incomeHead,
      memberId: member?.memberId,
      memberName: member?.fullName,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      reference: params.reference || voucherNo,
      remarks: params.remarks,
      createdBy: params.createdBy, status: "POSTED" as any,
      
      createdAt: new Date().toISOString()
    };

    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];

    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo,
        reference: `আয়: ${params.incomeHead}`,
        description: params.remarks || `${params.incomeHead} বাবদ আয়`,
        accountId: '4050',
        accountName: 'অন্যান্য আয়',
        cashIn: params.amount,
        cashOut: 0,
        balance: currentCash + params.amount,
        sourceType: 'INCOME',
        sourceId: newIncome.incomeId,
        createdBy: params.createdBy, status: "POSTED" as any,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: voucherNo,
        description: `${params.incomeHead} বাবদ জমা (${params.paymentMethod})`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: params.amount,
        withdrawal: 0,
        balance: currentBank + params.amount,
        transactionNo: voucherNo,
        sourceType: 'INCOME',
        sourceId: newIncome.incomeId,
        createdAt: new Date().toISOString()
      });
    }

    let updatedJournalEntries = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];

    const jnlLines = [
      {
        accountId: String(params.paymentMethod).toUpperCase() === 'CASH' ? '1000' : '1010',
        accountName: String(params.paymentMethod).toUpperCase() === 'CASH' ? 'হাতে নগদ' : 'ব্যাংক হিসাব',
        debit: params.amount,
        credit: 0
      },
      {
        accountId: '4050',
        accountName: 'অন্যান্য আয়',
        debit: 0,
        credit: params.amount
      }
    ];

    const journalRes = this.postJournalEntry(db, {
      journalNo: this.generateVoucherNo(db, 'JNL'),
      date: dateStr,
      reference: voucherNo,
      description: params.remarks || `${params.incomeHead} বাবদ আয়`,
      sourceType: 'INCOME',
      sourceId: newIncome.incomeId,
      createdBy: params.createdBy,
      status: 'ACTIVE'
    }, jnlLines);

    if (journalRes.success && journalRes.entry && journalRes.lines) {
      updatedJournalEntries.push(journalRes.entry);
      updatedJournalLines.push(...journalRes.lines);
    }

    return {
      success: true,
      message: `আয় ভাউচার ${voucherNo} সফলভাবে রেকর্ড হয়েছে!`,
      voucherNo,
      updatedDb: {
        ...db,
        incomes: [newIncome, ...db.incomes],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: updatedJournalEntries,
        journalLines: updatedJournalLines,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.createdBy,
            dateTime: new Date().toISOString(),
            module: 'INCOME',
            action: 'POST',
            recordId: voucherNo,
            newValue: `খাত: ${params.incomeHead}, পরিমাণ: ৳${params.amount}`,
            remarks: 'আয় ভাউচার এন্ট্রি'
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Post Expense
  static postExpense(
    db: AppDatabaseState,
    params: {
      expenseHead: string;
      payee: string;
      amount: number;
      paymentMethod: PaymentMethod;
      billNumber?: string;
      approvedBy?: string;
      approvalStatus?: 'DRAFT' | 'APPROVED' | 'PAID';
      remarks?: string;
      createdBy: string;
      idempotencyKey?: string;
    }
  ): { success: boolean; message: string; voucherNo?: string; updatedDb?: AppDatabaseState } {
    if (params.amount <= 0) return { success: false, message: 'ব্যয়ের পরিমাণ সঠিক নয়!' };

    const businessIdempotencyKey = params.idempotencyKey || `EXP-${params.expenseHead}-${params.payee}-${params.amount}-${params.paymentMethod}-${params.billNumber || ''}`;
    const recentDuplicate = (db.expenses || []).find(e => 
      e.idempotencyKey === businessIdempotencyKey ||
      (e.expenseHead === params.expenseHead && e.payee === params.payee && e.amount === params.amount && e.paymentMethod === params.paymentMethod && e.billNumber === params.billNumber)
    );
    if (recentDuplicate) {
      return { success: true, message: 'এন্ট্রিটি ইতোমধ্যে সংরক্ষিত হয়েছে।', voucherNo: recentDuplicate.voucherNo, updatedDb: db };
    }

    const status = params.approvalStatus || 'PAID';
    const isPaid = status === 'PAID';

    if (isPaid) {
      if (String(params.paymentMethod).toUpperCase() === 'CASH') {
        const cash = this.getCashBalance(db.cashTransactions);
        if (cash < params.amount) {
          return { success: false, message: `পর্যাপ্ত নগদ ব্যালেন্স নেই! বর্তমান ক্যাশ: ৳${cash}` };
        }
      } else {
        const bank = this.getBankBalance(db.bankTransactions);
        if (bank < params.amount) {
          return { success: false, message: `পর্যাপ্ত ব্যাংক ব্যালেন্স নেই! বর্তমান ব্যালেন্স: ৳${bank}` };
        }
      }
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const voucherNo = this.generateVoucherNo(db, 'EXP');

    const newExpense: Expense = {
      expenseId: `EXP-${Date.now()}`,
      idempotencyKey: businessIdempotencyKey,
      voucherNo,
      date: dateStr,
      expenseHead: params.expenseHead,
      payee: params.payee,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      billNumber: params.billNumber,
      approvedBy: params.approvedBy,
      approvalStatus: status,
      remarks: params.remarks,
      createdBy: params.createdBy,       createdAt: new Date().toISOString()
    };

    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];
    let updatedJournalEntries = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];

    if (isPaid) {
      if (String(params.paymentMethod).toUpperCase() === 'CASH') {
        const currentCash = this.getCashBalance(db.cashTransactions);
        updatedCash.push({
          transactionId: `CSH-${Date.now()}`,
          date: dateStr,
          voucherNo,
          reference: `ব্যয়: ${params.expenseHead}`,
          description: `${params.payee} কে পরিশোধ (${params.remarks || ''})`,
          accountId: '5000',
          accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
          cashIn: 0,
          cashOut: params.amount,
          balance: currentCash - params.amount,
          sourceType: 'EXPENSE',
          sourceId: newExpense.expenseId,
          createdBy: params.createdBy, status: "POSTED" as any,
          createdAt: new Date().toISOString()
        });
      } else {
        const currentBank = this.getBankBalance(db.bankTransactions);
        updatedBank.push({
          transactionId: `BNK-${Date.now()}`,
          date: dateStr,
          reference: voucherNo,
          description: `${params.payee} কে বিল পরিশোধ (${params.paymentMethod})`,
          bankName: db.settings.bankName,
          accountNumberMasked: db.settings.bankAccountMask,
          deposit: 0,
          withdrawal: params.amount,
          balance: currentBank - params.amount,
          transactionNo: voucherNo,
          sourceType: 'EXPENSE',
          sourceId: newExpense.expenseId,
          createdAt: new Date().toISOString()
        });
      }

      const jnlLines = [
        {
          accountId: '5000',
          accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
          debit: params.amount,
          credit: 0
        },
        {
          accountId: String(params.paymentMethod).toUpperCase() === 'CASH' ? '1000' : '1010',
          accountName: String(params.paymentMethod).toUpperCase() === 'CASH' ? 'হাতে নগদ' : 'ব্যাংক হিসাব',
          debit: 0,
          credit: params.amount
        }
      ];

      const journalRes = this.postJournalEntry(db, {
        journalNo: this.generateVoucherNo(db, 'JNL'),
        date: dateStr,
        reference: voucherNo,
        description: `${params.payee} কে পরিশোধ (${params.remarks || params.expenseHead})`,
        sourceType: 'EXPENSE',
        sourceId: newExpense.expenseId,
        createdBy: params.createdBy,
        status: 'ACTIVE'
      }, jnlLines);

      if (journalRes.success && journalRes.entry && journalRes.lines) {
        updatedJournalEntries.push(journalRes.entry);
        updatedJournalLines.push(...journalRes.lines);
      }
    }

    return {
      success: true,
      message: `ব্যয় ভাউচার ${voucherNo} (${status === 'PAID' ? 'পরিশোধিত' : 'সংরক্ষিত'}) সফল হয়েছে!`,
      voucherNo,
      updatedDb: {
        ...db,
        expenses: [newExpense, ...db.expenses],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: updatedJournalEntries,
        journalLines: updatedJournalLines,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.createdBy,
            dateTime: new Date().toISOString(),
            module: 'EXPENSE',
            action: 'POST',
            recordId: voucherNo,
            newValue: `খাত: ${params.expenseHead}, প্রাপক: ${params.payee}, পরিমাণ: ৳${params.amount}`,
            remarks: 'ব্যয় ভাউচার লিপিবদ্ধ করা হয়েছে'
          },
          ...db.auditLogs
        ]
      }
    };
  }

  // Post Welfare Fund Transaction (Requires 3 signatures for Emergency if configured)
  static postWelfarePayment(
    db: any,
    params: {
      fundType: 'WELFARE' | 'EMERGENCY' | 'RESERVE';
      amount: number;
      beneficiary?: string;
      beneficiaryName?: string;
      beneficiaryMobile?: string;
      beneficiaryAddress?: string;
      beneficiaryType?: 'MEMBER' | 'NON_MEMBER';
      reason?: string;
      purpose?: string;
      memberId?: string;
      paymentMethod?: PaymentMethod;
      transactionNumber?: string;
      approvedBy?: string;
      approvedByPresident?: boolean;
      approvedBySecretary?: boolean;
      approvedByTreasurer?: boolean;
      resolutionNo?: string;
      remarks?: string;
      date?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    if (params.amount <= 0) return { success: false, message: 'অনুদান/ব্যয়ের পরিমাণ সঠিক নয়!' };

    const dateStr = params.date || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(dateStr, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। নতুন বা পরিবর্তিত লেনদেন করা যাবে না।' };
    }

    if (params.fundType === 'EMERGENCY' && db.settings.requireThreeSignaturesForEmergency) {
      if (!params.approvedByPresident || !params.approvedBySecretary || !params.approvedByTreasurer) {
        return {
          success: false,
          message: 'জরুরী তহবিল অনুদানের ক্ষেত্রে সভাপতি, সাধারণ সম্পাদক ও কোষাধ্যক্ষ—তিনজনেরই অনুমোদন আবশ্যক!'
        };
      }
    }

    const payMethod: PaymentMethod = params.paymentMethod || 'Cash';
    if (payMethod === 'Cash') {
      const cash = this.getCashBalance(db.cashTransactions);
      if (cash < params.amount) {
        return { success: false, message: `পর্যাপ্ত নগদ ক্যাশ নেই! বর্তমান ক্যাশ: ৳${cash.toLocaleString()}` };
      }
    } else {
      const bank = this.getBankBalance(db.bankTransactions);
      if (bank < params.amount) {
        return { success: false, message: `পর্যাপ্ত ব্যাংক ব্যালেন্স নেই! বর্তমান ব্যাংক ব্যালেন্স: ৳${bank.toLocaleString()}` };
      }
    }

    const voucherNo = this.generateVoucherNo(db, 'WLF');
    const member = params.memberId ? (db.members || []).find((m: any) => m.memberId === params.memberId || m.id === params.memberId) : undefined;
    const resolvedBeneficiaryName = member ? member.fullName : (params.beneficiaryName || params.beneficiary || 'সাহায্যপ্রাপক');
    const resolvedReason = params.purpose || params.reason || 'কল্যাণ ও সামাজিক সহায়তা অনুদান';
    const fundId = `WLF-${Date.now()}`;

    const welfareTx: WelfareFundTransaction = {
      fundId,
      id: fundId,
      date: dateStr,
      fundType: params.fundType,
      income: 0,
      expense: params.amount,
      beneficiary: resolvedBeneficiaryName,
      beneficiaryName: resolvedBeneficiaryName,
      beneficiaryMobile: params.beneficiaryMobile || member?.mobile,
      beneficiaryAddress: params.beneficiaryAddress || member?.presentAddress,
      beneficiaryType: params.memberId ? 'MEMBER' : (params.beneficiaryType || 'NON_MEMBER'),
      memberId: member?.memberId || params.memberId,
      memberName: member?.fullName,
      reason: resolvedReason,
      purpose: resolvedReason,
      amount: params.amount,
      paymentMethod: payMethod,
      transactionNumber: params.transactionNumber,
      approvedBy: params.approvedBy || 'কার্যনির্বাহী পরিষদ',
      approvedByPresident: params.approvedByPresident ?? true,
      approvedBySecretary: params.approvedBySecretary ?? true,
      approvedByTreasurer: params.approvedByTreasurer ?? true,
      approvalStatus: 'APPROVED' as any,
      status: 'APPROVED',
      resolutionNo: params.resolutionNo,
      voucherNo,
      remarks: params.remarks,
      createdBy: db.activeUserId || 'Admin',
      createdAt: new Date().toISOString()
    };

    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournalEntries = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];

    if (payMethod === 'Cash') {
      const currentCash = this.getCashBalance(updatedCash);
      const cashEntry: any = {
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo,
        reference: `${params.fundType} তহবিল অনুদান`,
        description: `${resolvedBeneficiaryName} কে সহায়তা (${resolvedReason})`,
        accountId: '5100',
        accountName: 'সদস্য কল্যাণ ব্যয়',
        cashIn: 0,
        cashOut: params.amount,
        balance: currentCash - params.amount,
        sourceType: 'WELFARE',
        sourceId: welfareTx.fundId,
        createdBy: params.approvedBy || 'কোষাধ্যক্ষ',
        createdAt: new Date().toISOString()
      };
      updatedCash.push(cashEntry);
    } else {
      const currentBank = this.getBankBalance(updatedBank);
      const bankEntry: any = {
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: voucherNo,
        description: `${resolvedBeneficiaryName} কে সহায়তা (${resolvedReason}) [${payMethod}]`,
        bankName: db.settings.bankName || 'ব্যাংক হিসাব',
        accountNumberMasked: db.settings.bankAccountMask || '***',
        deposit: 0,
        withdrawal: params.amount,
        balance: currentBank - params.amount,
        transactionNo: params.transactionNumber || voucherNo,
        sourceType: 'WELFARE',
        sourceId: welfareTx.fundId,
        createdBy: params.approvedBy || 'কোষাধ্যক্ষ',
        createdAt: new Date().toISOString()
      };
      updatedBank.push(bankEntry);
    }

    const jnlLines = [
      {
        accountId: '5100',
        accountName: 'সদস্য কল্যাণ ব্যয়',
        debit: params.amount,
        credit: 0
      },
      {
        accountId: payMethod === 'Cash' ? '1000' : '1010',
        accountName: payMethod === 'Cash' ? 'হাতে নগদ' : 'ব্যাংক হিসাব',
        debit: 0,
        credit: params.amount
      }
    ];

    const journalRes = this.postJournalEntry(db, {
      journalNo: this.generateVoucherNo(db, 'JNL'),
      date: dateStr,
      reference: voucherNo,
      description: `${resolvedBeneficiaryName} কে সহায়তা (${resolvedReason})`,
      sourceType: 'WELFARE',
      sourceId: welfareTx.fundId,
      createdBy: params.approvedBy || 'Admin',
      status: 'ACTIVE'
    }, jnlLines);

    if (journalRes.success && journalRes.entry && journalRes.lines) {
      updatedJournalEntries.push(journalRes.entry);
      updatedJournalLines.push(...journalRes.lines);
    }

    return {
      success: true,
      message: `${params.fundType === 'WELFARE' ? 'কল্যাণ' : 'জরুরী'} তহবিল অনুদান ভাউচার ${voucherNo} সফলভাবে প্রদান করা হয়েছে!`,
      updatedDb: {
        ...db,
        welfareTransactions: [welfareTx, ...(db.welfareTransactions || [])],
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: updatedJournalEntries,
        journalLines: updatedJournalLines,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.approvedBy || 'Admin',
            dateTime: new Date().toISOString(),
            module: 'WELFARE',
            action: 'WELFARE_TRANSACTION_CREATED',
            recordId: welfareTx.fundId,
            newValue: `${params.fundType} অনুদান প্রদান: ৳${params.amount.toLocaleString()} - ${resolvedBeneficiaryName} (${voucherNo})`,
            remarks: resolvedReason
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  // Update Welfare Transaction (Metadata & Non-financial or Draft updates)
  static updateWelfareTransaction(
    db: any,
    params: {
      fundId: string;
      beneficiaryName?: string;
      beneficiary?: string;
      beneficiaryMobile?: string;
      beneficiaryAddress?: string;
      beneficiaryType?: 'MEMBER' | 'NON_MEMBER';
      memberId?: string;
      purpose?: string;
      reason?: string;
      amount?: number;
      paymentMethod?: PaymentMethod;
      transactionNumber?: string;
      approvedBy?: string;
      resolutionNo?: string;
      remarks?: string;
      updatedBy?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const list = db.welfareTransactions || [];
    const index = list.findIndex((w: any) => w.fundId === params.fundId || w.id === params.fundId);
    if (index === -1) {
      return { success: false, message: 'অনুদান লেনদেনের তথ্য খুঁজে পাওয়া যায়নি!' };
    }

    const currentTx = list[index];
    if (isDateInClosedYear(currentTx.date, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। লেনদেন সম্পাদনা করা যাবে না।' };
    }

    // Check if there are posted cash/bank accounting records
    const hasCash = (db.cashTransactions || []).some((c: any) => c.sourceId === currentTx.fundId || c.voucherNo === currentTx.voucherNo);
    const hasBank = (db.bankTransactions || []).some((b: any) => b.sourceId === currentTx.fundId || b.transactionNo === currentTx.voucherNo || b.reference === currentTx.voucherNo);
    const hasPostedAccounting = hasCash || hasBank;

    if (hasPostedAccounting && params.amount !== undefined && Number(params.amount) !== Number(currentTx.amount)) {
      return {
        success: false,
        message: 'এই লেনদেনের হিসাব সংক্রান্ত রেকর্ড (ক্যাশ/ব্যাংক) রয়েছে। সরাসরি টাকার পরিমাণ পরিবর্তন করা যাবে না। সংশোধনের জন্য Reversal workflow ব্যবহার করুন।'
      };
    }

    const member = params.memberId ? (db.members || []).find((m: any) => m.memberId === params.memberId || m.id === params.memberId) : undefined;
    const resolvedBeneficiaryName = member ? member.fullName : (params.beneficiaryName || params.beneficiary || currentTx.beneficiaryName || currentTx.beneficiary);
    const resolvedReason = params.purpose || params.reason || currentTx.purpose || currentTx.reason;

    const updatedTx: WelfareFundTransaction = {
      ...currentTx,
      beneficiary: resolvedBeneficiaryName,
      beneficiaryName: resolvedBeneficiaryName,
      beneficiaryMobile: params.beneficiaryMobile ?? currentTx.beneficiaryMobile ?? member?.mobile,
      beneficiaryAddress: params.beneficiaryAddress ?? currentTx.beneficiaryAddress ?? member?.presentAddress,
      beneficiaryType: params.memberId ? 'MEMBER' : (params.beneficiaryType || (currentTx.memberId ? 'MEMBER' : 'NON_MEMBER')),
      memberId: params.memberId !== undefined ? (params.memberId || undefined) : currentTx.memberId,
      memberName: member?.fullName || (params.memberId === '' ? undefined : currentTx.memberName),
      reason: resolvedReason,
      purpose: resolvedReason,
      approvedBy: params.approvedBy ?? currentTx.approvedBy,
      resolutionNo: params.resolutionNo !== undefined ? params.resolutionNo : currentTx.resolutionNo,
      transactionNumber: params.transactionNumber !== undefined ? params.transactionNumber : currentTx.transactionNumber,
      remarks: params.remarks !== undefined ? params.remarks : currentTx.remarks,
      
      updatedBy: params.updatedBy || 'Admin'
    };

    if (!hasPostedAccounting && params.amount !== undefined && Number(params.amount) > 0) {
      updatedTx.amount = Number(params.amount);
      updatedTx.expense = Number(params.amount);
    }
    if (!hasPostedAccounting && params.paymentMethod) {
      updatedTx.paymentMethod = params.paymentMethod;
    }

    const updatedTransactions = [...list];
    updatedTransactions[index] = updatedTx;

    return {
      success: true,
      message: `অনুদান ভাউচার ${currentTx.voucherNo} এর তথ্য সফলভাবে আপডেট করা হয়েছে।`,
      updatedDb: {
        ...db,
        welfareTransactions: updatedTransactions,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: params.updatedBy || 'Admin',
            dateTime: new Date().toISOString(),
            module: 'WELFARE',
            action: 'WELFARE_TRANSACTION_UPDATED',
            recordId: currentTx.fundId,
            newValue: `আপডেট: ${resolvedBeneficiaryName} (${currentTx.voucherNo})`,
            remarks: `উদ্দেশ্য: ${resolvedReason}, অনুমোদনকারী: ${updatedTx.approvedBy}`
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  // Delete Welfare Transaction (Safe State-Aware Deletion)
  static deleteWelfareTransaction(
    db: any,
    fundId: string,
    deletedBy?: string
  ): { success: boolean; message: string; updatedDb?: any } {
    const list = db.welfareTransactions || [];
    const tx = list.find((w: any) => w.fundId === fundId || w.id === fundId);
    if (!tx) {
      return { success: false, message: 'অনুদান লেনদেনের তথ্য খুঁজে পাওয়া যায়নি!' };
    }

    if (isDateInClosedYear(tx.date, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। লেনদেন ডিলিট করা যাবে না।' };
    }

    // Check if there are posted accounting records
    const hasCash = (db.cashTransactions || []).some((c: any) => c.sourceId === tx.fundId || c.voucherNo === tx.voucherNo);
    const hasBank = (db.bankTransactions || []).some((b: any) => b.sourceId === tx.fundId || b.transactionNo === tx.voucherNo || b.reference === tx.voucherNo);
    const hasJournal = (db.journalEntries || []).some((j: any) => j.sourceId === tx.fundId || j.journalNo === tx.voucherNo);

    if (hasCash || hasBank || hasJournal) {
      return {
        success: false,
        message: 'এই লেনদেনের হিসাব সংক্রান্ত রেকর্ড রয়েছে। সরাসরি Delete করা যাবে না। Reversal workflow ব্যবহার করুন।'
      };
    }

    const updatedTransactions = list.filter((w: any) => w.fundId !== fundId && w.id !== fundId);

    return {
      success: true,
      message: `অনুদান লেনদেন ${tx.voucherNo} সফলভাবে মুছে ফেলা হয়েছে।`,
      updatedDb: {
        ...db,
        welfareTransactions: updatedTransactions,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: deletedBy || 'Admin',
            dateTime: new Date().toISOString(),
            module: 'WELFARE',
            action: 'WELFARE_TRANSACTION_DELETED',
            recordId: tx.fundId,
            newValue: `মুছে ফেলা হয়েছে: ভাউচার ${tx.voucherNo}, গ্রহীতা: ${tx.beneficiary || tx.beneficiaryName}`,
            remarks: `পরিমাণ: ৳${tx.amount}`
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  // Reverse Welfare Transaction (Accounting Integrity Workflow)
  static reverseWelfareTransaction(
    db: any,
    fundId: string,
    reason: string,
    reversedBy: string
  ): { success: boolean; message: string; updatedDb?: any } {
    const list = db.welfareTransactions || [];
    const index = list.findIndex((w: any) => w.fundId === fundId || w.id === fundId);
    if (index === -1) {
      return { success: false, message: 'অনুদান লেনদেনের তথ্য খুঁজে পাওয়া যায়নি!' };
    }

    const tx = list[index];
    if (tx.approvalStatus === 'REVERSED' || tx.status === 'REVERSED') {
      return { success: false, message: 'এই লেনদেনটি ইতোমধ্যে বাতিল/রিভার্স করা হয়েছে।' };
    }

    const dateStr = new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(tx.date, db) || isDateInClosedYear(dateStr, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। রিভার্সাল করা যাবে না।' };
    }

    // 1. Mark welfare transaction as REVERSED
    const updatedTx: WelfareFundTransaction = {
      ...tx,
      approvalStatus: 'REVERSED' as ExpenseStatus as any,
      status: 'REVERSED' as any,
      remarks: `${tx.remarks || ''} [বাতিল/রিভার্সড: ${reason}]`.trim(),
      
      updatedBy: reversedBy
    };

    const updatedTransactions = [...list];
    updatedTransactions[index] = updatedTx;

    // 2. Offsetting Cash / Bank Reversal entry
    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    const isBank = tx.paymentMethod === 'Bank' || (db.bankTransactions || []).some((b: any) => b.sourceId === tx.fundId || b.transactionNo === tx.voucherNo);

    if (isBank) {
      const currentBank = this.getBankBalance(updatedBank);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV`,
        date: dateStr,
        reference: tx.voucherNo,
        description: `কল্যাণ অনুদান বাতিল রিভার্সাল (${tx.beneficiary || tx.memberName || ''}, ভাউচার: ${tx.voucherNo}): ${reason}`,
        bankName: db.settings.bankName || 'ব্যাংক হিসাব',
        accountNumberMasked: db.settings.bankAccountMask || '***',
        deposit: tx.amount || tx.expense,
        withdrawal: 0,
        balance: currentBank + (tx.amount || tx.expense),
        transactionNo: tx.voucherNo,
        sourceType: 'WELFARE',
        sourceId: tx.fundId,
        createdBy: reversedBy,
        createdAt: new Date().toISOString()
      });
    } else {
      const currentCash = this.getCashBalance(updatedCash);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-REV`,
        date: dateStr,
        voucherNo: tx.voucherNo,
        reference: tx.voucherNo,
        description: `কল্যাণ অনুদান বাতিল রিভার্সাল (${tx.beneficiary || tx.memberName || ''}, ভাউচার: ${tx.voucherNo}): ${reason}`,
        accountId: '5020',
        accountName: 'কল্যাণ অনুদান ব্যয় (রিভার্সাল)',
        cashIn: tx.amount || tx.expense,
        cashOut: 0,
        balance: currentCash + (tx.amount || tx.expense),
        sourceType: 'WELFARE',
        sourceId: tx.fundId,
        createdBy: reversedBy,
        createdAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: `অনুদান ভাউচার ${tx.voucherNo} সফলভাবে বাতিল ও রিভার্স করা হয়েছে।`,
      updatedDb: {
        ...db,
        welfareTransactions: updatedTransactions,
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        auditLogs: [
          {
            auditId: `AUD-${Date.now()}`,
            userId: db.activeUserId || 'SYSTEM',
            userName: reversedBy,
            dateTime: new Date().toISOString(),
            module: 'WELFARE',
            action: 'WELFARE_TRANSACTION_REVERSED',
            recordId: tx.fundId,
            newValue: `রিভার্সড: ভাউচার ${tx.voucherNo}, পরিমাণ: ৳${(tx.amount || tx.expense).toLocaleString()}`,
            remarks: reason
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static calculateInvestmentBalance(inv: any): { originalPrincipal: number, returnedPrincipal: number, outstandingPrincipal: number, profit: number } {
    const originalPrincipal = inv.originalPrincipal ?? inv.investmentAmount ?? 0;
    const returnedPrincipal = inv.returnedPrincipal ?? 0;
    const outstandingPrincipal = calculateInvestmentOutstanding(inv);
    const profit = inv.profit ?? 0;
    return { originalPrincipal, returnedPrincipal, outstandingPrincipal, profit };
  }

  static postInvestmentProject(
    db: any,
    params: {
      projectName: string;
      projectType: string;
      amount: number;
      expectedReturnRate: number;
      manager: string;
      paymentMethod?: string;
      description: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const investmentId = `INV-${Date.now()}`;
    const initialOutstanding = calculateInvestmentOutstanding({
      originalPrincipal: params.amount,
      returnedPrincipal: 0
    });

    const newInvestment = {
      investmentId,
      investmentDate: new Date().toISOString().split('T')[0],
      investmentType: params.projectType,
      partner: params.manager,
      description: params.projectName + ' - ' + params.description,
      investmentAmount: params.amount,
      originalPrincipal: params.amount,
      returnedPrincipal: 0,
      outstandingPrincipal: initialOutstanding,
      expectedReturn: params.amount + (params.amount * params.expectedReturnRate) / 100,
      actualReturn: 0,
      profit: 0,
      loss: 0,
      roiPercentage: params.expectedReturnRate,
      maturityDate: '',
      status: getInvestmentStatus({ status: 'PENDING_APPROVAL' }),
      createdAt: new Date().toISOString()
    };

    return {
      success: true,
      message: 'বিনিয়োগ প্রস্তাব সফলভাবে এন্ট্রি করা হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।',
      updatedDb: {
        ...db,
        investments: [newInvestment, ...(db.investments || [])],
        auditLogs: [
          {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            action: 'INVESTMENT_CREATED',
            performedBy: params.manager || 'Admin',
            details: `Created new investment proposal ${investmentId} (${params.projectName}) for ৳${params.amount.toLocaleString()}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static approveInvestment(
    db: any,
    params: {
      projectId: string;
      approvedAmount: number;
      approvedBy: string;
      remarks?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };
    
    const inv = db.investments[invIndex];
    if (inv.status === 'APPROVED') return { success: false, message: 'এই বিনিয়োগটি ইতিমধ্যে অনুমোদিত।' };
    if (inv.status !== 'PENDING_APPROVAL' && inv.status !== 'PROPOSED') {
      return { success: false, message: 'বিনিয়োগটি অনুমোদনের অপেক্ষায় থাকতে হবে।' };
    }
    if (!params.approvedAmount || params.approvedAmount <= 0) {
      return { success: false, message: 'অনুমোদিত টাকার পরিমাণ শূন্য বা ঋণাত্মক হতে পারবে না।' };
    }

    const approvedAt = new Date().toISOString();
    const approvalDate = approvedAt.split('T')[0];
    const outstanding = calculateInvestmentOutstanding({
      originalPrincipal: params.approvedAmount,
      returnedPrincipal: inv.returnedPrincipal ?? 0
    });

    const updatedInv = {
      ...inv,
      status: getInvestmentStatus({ status: 'APPROVED' }),
      investmentAmount: params.approvedAmount,
      originalPrincipal: params.approvedAmount,
      outstandingPrincipal: outstanding,
      expectedReturn: params.approvedAmount + (params.approvedAmount * (inv.roiPercentage || 0)) / 100,
      approvedAmount: params.approvedAmount,
      approvedBy: params.approvedBy,
      approvedAt: approvedAt,
      approvalDate: approvalDate,
      approvalRemarks: params.remarks || ''
    };

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    return {
      success: true,
      message: 'বিনিয়োগ সফলভাবে অনুমোদন করা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: approvedAt,
            action: 'INVESTMENT_APPROVED',
            performedBy: params.approvedBy,
            details: `Approved investment ${inv.investmentId} for ৳${params.approvedAmount.toLocaleString()}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static rejectInvestment(
    db: any,
    params: {
      projectId: string;
      rejectedBy: string;
      reason: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };

    const inv = db.investments[invIndex];
    if (inv.status !== 'PENDING_APPROVAL' && inv.status !== 'PROPOSED') {
      return { success: false, message: 'শুধুমাত্র অপেক্ষমান বিনিয়োগ প্রত্যাখ্যান করা যাবে।' };
    }
    if (!params.reason?.trim()) {
      return { success: false, message: 'প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।' };
    }

    const rejectedAt = new Date().toISOString();
    const updatedInv = {
      ...inv,
      status: getInvestmentStatus({ status: 'REJECTED' }),
      rejectedBy: params.rejectedBy,
      rejectedAt: rejectedAt,
      rejectionReason: params.reason.trim()
    };

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    return {
      success: true,
      message: 'বিনিয়োগ প্রস্তাব প্রত্যাখ্যান করা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: rejectedAt,
            action: 'INVESTMENT_REJECTED',
            performedBy: params.rejectedBy,
            details: `Rejected investment ${inv.investmentId}. Reason: ${params.reason.trim()}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static updateInvestment(
    db: any,
    params: {
      projectId: string;
      updatedBy: string;
      data: {
        projectName?: string;
        projectType?: string;
        partner?: string;
        description?: string;
        amount?: number;
        expectedReturnRate?: number;
        maturityDate?: string;
        remarks?: string;
      };
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };

    const inv = db.investments[invIndex];
    const { data } = params;

    let updatedInv = { ...inv };

    if (inv.status === 'PENDING_APPROVAL' || inv.status === 'PROPOSED' || inv.status === 'DRAFT') {
      const newAmount = data.amount !== undefined ? Number(data.amount) : (inv.originalPrincipal ?? inv.investmentAmount ?? 0);
      const newRate = data.expectedReturnRate !== undefined ? Number(data.expectedReturnRate) : (inv.roiPercentage ?? 0);
      const returned = inv.returnedPrincipal ?? 0;
      const newOutstanding = calculateInvestmentOutstanding({
        originalPrincipal: newAmount,
        returnedPrincipal: returned
      });

      updatedInv = {
        ...updatedInv,
        investmentType: data.projectType ?? inv.investmentType,
        partner: data.partner ?? inv.partner,
        description: data.description ? (data.projectName ? `${data.projectName} - ${data.description}` : data.description) : inv.description,
        investmentAmount: newAmount,
        originalPrincipal: newAmount,
        outstandingPrincipal: newOutstanding,
        roiPercentage: newRate,
        expectedReturn: newAmount + (newAmount * newRate) / 100,
        maturityDate: data.maturityDate !== undefined ? data.maturityDate : inv.maturityDate,
        remarks: data.remarks !== undefined ? data.remarks : inv.remarks
      };
    } else if (inv.status === 'APPROVED') {
      if (data.amount !== undefined && Number(data.amount) !== (inv.originalPrincipal ?? inv.investmentAmount)) {
        return {
          success: false,
          message: 'অনুমোদিত বিনিয়োগের আর্থিক তথ্য পরিবর্তনের জন্য অনুমোদিত Amendment workflow প্রয়োজন।'
        };
      }
      updatedInv = {
        ...updatedInv,
        investmentType: data.projectType ?? inv.investmentType,
        partner: data.partner ?? inv.partner,
        description: data.description ?? inv.description,
        maturityDate: data.maturityDate !== undefined ? data.maturityDate : inv.maturityDate,
        remarks: data.remarks !== undefined ? data.remarks : inv.remarks
      };
    } else if (inv.status === 'ACTIVE' || inv.status === 'PARTIAL_RETURN' || inv.status === 'COMPLETED') {
      if (data.amount !== undefined && Number(data.amount) !== (inv.originalPrincipal ?? inv.investmentAmount)) {
        return {
          success: false,
          message: 'চলমান বিনিয়োগের আর্থিক মূলধন সরাসরি পরিবর্তন করা যাবে না। লেনদেনের মাধ্যমে রিটার্ন বা সমন্বয় করুন।'
        };
      }
      updatedInv = {
        ...updatedInv,
        partner: data.partner ?? inv.partner,
        description: data.description ?? inv.description,
        maturityDate: data.maturityDate !== undefined ? data.maturityDate : inv.maturityDate,
        remarks: data.remarks !== undefined ? data.remarks : inv.remarks
      };
    }

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    return {
      success: true,
      message: 'বিনিয়োগের তথ্য সফলভাবে আপডেট করা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            action: 'INVESTMENT_UPDATED',
            performedBy: params.updatedBy,
            details: `Updated investment details for ${inv.investmentId}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static deleteInvestment(
    db: any,
    params: {
      projectId: string;
      deletedBy: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };

    const inv = db.investments[invIndex];

    if (inv.status === 'ACTIVE' || inv.status === 'PARTIAL_RETURN' || inv.status === 'COMPLETED') {
      return {
        success: false,
        message: 'এই বিনিয়োগে accounting transaction রয়েছে। এটি Delete করা যাবে না।'
      };
    }

    if (inv.status === 'APPROVED') {
      return {
        success: false,
        message: 'অনুমোদিত বিনিয়োগ মুছে ফেলা যাবে না। এটি বাতিল (Cancel) করতে পারেন।'
      };
    }

    const newInvestments = (db.investments || []).filter(
      (i: any) => i.investmentId !== inv.investmentId && i.id !== inv.investmentId
    );

    return {
      success: true,
      message: 'বিনিয়োগের আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            action: 'INVESTMENT_DELETED',
            performedBy: params.deletedBy,
            details: `Deleted pending investment application ${inv.investmentId} (${inv.description || inv.partner})`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static cancelInvestment(
    db: any,
    params: {
      projectId: string;
      cancelledBy: string;
      reason?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };

    const inv = db.investments[invIndex];
    if (inv.status === 'ACTIVE' || inv.status === 'PARTIAL_RETURN' || inv.status === 'COMPLETED') {
      return {
        success: false,
        message: 'কার্যকর বা চলমান বিনিয়োগ সরাসরি বাতিল করা যাবে না। লেনদেন রিভার্সাল প্রয়োজন।'
      };
    }

    const cancelledAt = new Date().toISOString();
    const updatedInv = {
      ...inv,
      status: getInvestmentStatus({ status: 'CANCELLED' }),
      cancelledBy: params.cancelledBy,
      cancelledAt,
      cancellationReason: params.reason || 'ব্যবহারকারী কর্তৃক বাতিল'
    };

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    return {
      success: true,
      message: 'বিনিয়োগ সফলভাবে বাতিল করা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: cancelledAt,
            action: 'INVESTMENT_CANCELLED',
            performedBy: params.cancelledBy,
            details: `Cancelled investment ${inv.investmentId}. Reason: ${params.reason || 'Cancelled'}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static executeInvestment(
    db: any,
    params: {
      projectId: string;
      paymentMethod: string;
      transactionDate?: string;
      executedBy?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };
    
    const inv = db.investments[invIndex];
    if (inv.status === 'ACTIVE' || inv.status === 'PARTIAL_RETURN' || inv.status === 'COMPLETED') {
      return { success: false, message: 'এই বিনিয়োগটি ইতিমধ্যে কার্যকর/বিতরণ করা হয়েছে।' };
    }
    if (inv.status !== 'APPROVED') return { success: false, message: 'কার্যকরের পূর্বে বিনিয়োগটি অনুমোদিত হতে হবে।' };

    const txDate = params.transactionDate || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(txDate, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। নতুন বা পরিবর্তিত লেনদেন করা যাবে না।' };
    }

    const amount = inv.originalPrincipal || inv.investmentAmount;
    const initialOutstanding = calculateInvestmentOutstanding({
      originalPrincipal: amount,
      returnedPrincipal: inv.returnedPrincipal ?? 0
    });

    // Derive the status on execution using getInvestmentStatus
    const executedStatus = getInvestmentStatus({
      ...inv,
      status: undefined,
      originalPrincipal: amount,
      returnedPrincipal: inv.returnedPrincipal ?? 0
    });

    const updatedInv = {
      ...inv,
      originalPrincipal: amount,
      investmentAmount: amount,
      outstandingPrincipal: initialOutstanding,
      status: executedStatus,
      investmentDate: txDate
    };

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];
    const executedBy = params.executedBy || 'Admin';

    if (String(params.paymentMethod).toUpperCase() === 'CASH') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: txDate,
        voucherNo: inv.investmentId,
        description: `বিনিয়োগ কার্যকর ও তহবিল বিতরণ: ${inv.description || inv.partner}`,
        accountId: '1500',
        accountName: 'বিনিয়োগ হিসাব',
        cashIn: 0,
        cashOut: amount,
        balance: currentCash - amount,
        reference: inv.investmentId,
        sourceType: 'INVESTMENT' as any,
        sourceId: inv.investmentId,
        createdBy: executedBy, 
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: txDate,
        description: `বিনিয়োগ কার্যকর ও তহবিল বিতরণ: ${inv.description || inv.partner}`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: 0,
        withdrawal: amount,
        transactionNo: inv.investmentId,
        balance: currentBank - amount,
        reference: inv.investmentId,
        sourceType: 'INVESTMENT' as any,
        sourceId: inv.investmentId,
        createdAt: new Date().toISOString()
      });
    }

    const journalEntries = [...(db.journalEntries || [])];
    const journalLines = [...(db.journalLines || [])];
    const voucherNo = `JNL-INV-${Date.now()}`;

    journalEntries.push({
      id: voucherNo,
      entryId: voucherNo,
      date: txDate,
      voucherNo: voucherNo,
      description: `বিনিয়োগ কার্যকর ও তহবিল বিতরণ: ${inv.description || inv.partner}`,
      sourceType: 'INVESTMENT' as any,
      sourceId: inv.investmentId,
      status: 'ACTIVE',
      isPosted: true,
      createdAt: new Date().toISOString()
    });

    journalLines.push({
      id: `JNL-L-${Date.now()}-1`,
      lineId: `JNL-L-${Date.now()}-1`,
      journalEntryId: voucherNo,
      entryId: voucherNo,
      accountId: '1500',
      accountName: 'প্রকল্প বিনিয়োগ হিসাব',
      debit: amount,
      credit: 0
    });

    journalLines.push({
      id: `JNL-L-${Date.now()}-2`,
      lineId: `JNL-L-${Date.now()}-2`,
      journalEntryId: voucherNo,
      entryId: voucherNo,
      accountId: String(params.paymentMethod).toUpperCase() === 'CASH' ? '1000' : '1010',
      accountName: String(params.paymentMethod).toUpperCase() === 'CASH' ? 'হাতে নগদ' : 'ব্যাংক হিসাব',
      debit: 0,
      credit: amount
    });

    return {
      success: true,
      message: 'বিনিয়োগ সফলভাবে বিতরণ ও কার্যকর করা হয়েছে।',
      updatedDb: {
        ...db,
        investments: newInvestments,
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries,
        journalLines,
        auditLogs: [
          {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            action: 'INVESTMENT_EXECUTED',
            performedBy: executedBy,
            details: `Executed investment ${inv.investmentId} for ৳${amount.toLocaleString()} via ${params.paymentMethod}`,
            ipAddress: '127.0.0.1',
          },
          ...(db.auditLogs || [])
        ]
      }
    };
  }

  static postInvestmentReturn(
    db: any,
    params: {
      projectId: string;
      returnPrincipal: number;
      returnProfit: number;
      returnPaymentMethod: string;
      remarks: string;
      transactionDate?: string;
      receivedBy?: string;
    }
  ): { success: boolean; message: string; updatedDb?: any } {
    const invIndex = (db.investments || []).findIndex(
      (i: any) => (i.investmentId && String(i.investmentId).trim() === String(params.projectId).trim()) ||
                  (i.id && String(i.id).trim() === String(params.projectId).trim())
    );
    if (invIndex === -1) return { success: false, message: 'বিনিয়োগের রেকর্ড পাওয়া যায়নি।' };

    const inv = db.investments[invIndex];
    if (inv.status !== 'ACTIVE' && inv.status !== 'PARTIAL_RETURN') {
      return { success: false, message: 'শুধুমাত্র চলমান বা আংশিক ফেরত থাকা বিনিয়োগে রিটার্ন জমা দেওয়া যাবে।' };
    }

    const outstandingPrincipal = calculateInvestmentOutstanding(inv);
    
    if (params.returnPrincipal > outstandingPrincipal) {
      return { success: false, message: `ফেরত দেওয়া আসল (৳${params.returnPrincipal.toLocaleString()}) বাকি আসলের (৳${outstandingPrincipal.toLocaleString()}) চেয়ে বেশি হতে পারবে না।` };
    }
    
    if (params.returnPrincipal <= 0 && params.returnProfit <= 0) {
      return { success: false, message: 'ফেরতের পরিমাণ শূন্য হতে পারে না।' };
    }

    const txDate = params.transactionDate || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(txDate, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। নতুন বা পরিবর্তিত লেনদেন করা যাবে না।' };
    }

    const newReturnedPrincipal = (inv.returnedPrincipal || 0) + params.returnPrincipal;
    const newOutstandingPrincipal = calculateInvestmentOutstanding({
      originalPrincipal: inv.originalPrincipal || inv.investmentAmount,
      returnedPrincipal: newReturnedPrincipal
    });
    const newProfit = (inv.profit || 0) + params.returnProfit;
    const newActualReturn = (inv.actualReturn || 0) + params.returnPrincipal + params.returnProfit;

    let updatedInv = {
      ...inv,
      returnedPrincipal: newReturnedPrincipal,
      outstandingPrincipal: newOutstandingPrincipal,
      profit: newProfit,
      actualReturn: newActualReturn,
      remarks: params.remarks || inv.remarks
    };
    
    // Use getInvestmentStatus to derive the status without hardcoding
    updatedInv.status = getInvestmentStatus({
      ...updatedInv,
      status: undefined
    }) as any;

    const newInvestments = [...db.investments];
    newInvestments[invIndex] = updatedInv;

    let updatedCash = [...db.cashTransactions];
    let updatedBank = [...db.bankTransactions];
    const totalReturn = params.returnPrincipal + params.returnProfit;
    const returnVoucherNo = `INV-RET-${Date.now()}`;
    const user = params.receivedBy || 'Admin';

    if (params.returnPaymentMethod === 'Cash') {
      const currentCash = this.getCashBalance(db.cashTransactions);
      updatedCash.push({
        transactionId: `CSH-${Date.now()}`,
        date: txDate,
        voucherNo: returnVoucherNo,
        description: `বিনিয়োগ ফেরত (আসল: ৳${params.returnPrincipal}, মুনাফা: ৳${params.returnProfit}): ${inv.description || inv.partner}`,
        accountId: '1500',
        accountName: 'বিনিয়োগ হিসাব',
        cashIn: totalReturn,
        cashOut: 0,
        balance: currentCash + totalReturn,
        reference: inv.investmentId,
        sourceType: 'INVESTMENT_RETURN' as any,
        sourceId: inv.investmentId,
        createdBy: user, 
        createdAt: new Date().toISOString()
      });
    } else {
      const currentBank = this.getBankBalance(db.bankTransactions);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}`,
        date: txDate,
        description: `বিনিয়োগ ফেরত (আসল: ৳${params.returnPrincipal}, মুনাফা: ৳${params.returnProfit}): ${inv.description || inv.partner}`,
        bankName: db.settings.bankName,
        accountNumberMasked: db.settings.bankAccountMask,
        deposit: totalReturn,
        withdrawal: 0,
        transactionNo: returnVoucherNo,
        balance: currentBank + totalReturn,
        reference: inv.investmentId,
        sourceType: 'INVESTMENT_RETURN' as any,
        sourceId: inv.investmentId,
        createdAt: new Date().toISOString()
      });
    }

    const journalEntries = [...(db.journalEntries || [])];
    const journalLines = [...(db.journalLines || [])];
    
    const je = {
      id: returnVoucherNo,
      entryId: returnVoucherNo,
      date: txDate,
      voucherNo: returnVoucherNo,
      description: `বিনিয়োগ ফেরত (আসল: ৳${params.returnPrincipal}, মুনাফা: ৳${params.returnProfit})`,
      sourceType: 'INVESTMENT_RETURN' as any,
      sourceId: inv.investmentId,
      status: 'ACTIVE',
      isPosted: true,
      createdAt: new Date().toISOString()
    };
    journalEntries.push(je);

    journalLines.push({
      id: `JNL-${Date.now()}-1`,
      lineId: `JNL-${Date.now()}-1`,
      journalEntryId: returnVoucherNo,
      entryId: returnVoucherNo,
      accountId: params.returnPaymentMethod === 'Cash' ? '1000' : '1010',
      accountName: params.returnPaymentMethod === 'Cash' ? 'হাতে নগদ' : 'ব্যাংক হিসাব',
      debit: totalReturn,
      credit: 0
    });

    if (params.returnPrincipal > 0) {
      journalLines.push({
        id: `JNL-${Date.now()}-2`,
        lineId: `JNL-${Date.now()}-2`,
        journalEntryId: returnVoucherNo,
        entryId: returnVoucherNo,
        accountId: '1500',
        accountName: 'প্রকল্প বিনিয়োগ হিসাব',
        debit: 0,
        credit: params.returnPrincipal
      });
    }

    if (params.returnProfit > 0) {
      journalLines.push({
        id: `JNL-${Date.now()}-3`,
        lineId: `JNL-${Date.now()}-3`,
        journalEntryId: returnVoucherNo,
        entryId: returnVoucherNo,
        accountId: '4100',
        accountName: 'বিনিয়োগ মুনাফা আয়',
        debit: 0,
        credit: params.returnProfit
      });
    }

    const isCompleted = updatedInv.status === 'COMPLETED';

    const newAuditLogs = [
      {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        action: 'INVESTMENT_RETURNED' as any,
        performedBy: user,
        details: `Received return for investment ${inv.investmentId} (Principal: ৳${params.returnPrincipal}, Profit: ৳${params.returnProfit})`,
        ipAddress: '127.0.0.1',
      }
    ];

    if (params.returnProfit > 0) {
      newAuditLogs.push({
        id: (Date.now() + 1).toString(),
        date: new Date().toISOString(),
        action: 'INVESTMENT_PROFIT_RECEIVED' as any,
        performedBy: user,
        details: `Recorded profit ৳${params.returnProfit} from investment ${inv.investmentId}`,
        ipAddress: '127.0.0.1',
      });
    }

    if (isCompleted) {
      newAuditLogs.push({
        id: (Date.now() + 2).toString(),
        date: new Date().toISOString(),
        action: 'INVESTMENT_COMPLETED' as any,
        performedBy: user,
        details: `Investment ${inv.investmentId} principal fully settled and marked COMPLETED`,
        ipAddress: '127.0.0.1',
      });
    }

    return {
      success: true,
      message: isCompleted ? 'বিনিয়োগের মূলধন সম্পূর্ণ পরিশোধিত হয়েছে এবং সমাপ্ত হয়েছে।' : 'বিনিয়োগ ফেরত সফলভাবে এন্ট্রি করা হয়েছে',
      updatedDb: {
        ...db,
        investments: newInvestments,
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries,
        journalLines,
        auditLogs: [
          ...newAuditLogs,
          ...(db.auditLogs || [])
        ]
      }
    };
  }


  static postReserveUtilization(
    db: AppDatabaseState,
    params: {
      utilizationId: string;
      paymentMethod: PaymentMethod;
      amount: number;
      approvedBy: string;
      resolutionNo?: string;
      purpose: string;
    }
  ): { success: boolean; message: string; db?: AppDatabaseState } {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const voucherNo = `RES-PAY-${Date.now()}`;

      // Find the utilization
      const utilIndex = (db.reserveUtilizations || []).findIndex(u => u.utilizationId === params.utilizationId);
      if (utilIndex === -1) throw new Error("Utilization request not found.");
      
      const util = db.reserveUtilizations[utilIndex];
      if (util.status === 'PAID') throw new Error("এই রিজার্ভ তহবিলের পেমেন্ট ইতিমধ্যে সম্পন্ন হয়েছে।");
      if (util.status !== 'APPROVED') throw new Error("Utilization must be approved before payment.");
      
      const reserveFundBalance = (db.welfareTransactions || [])
        .filter(w => w.fundType === 'RESERVE')
        .reduce((sum, w) => sum + w.income - w.expense, 0);
        
      if (params.amount > reserveFundBalance) {
        throw new Error("রিজার্ভ তহবিলে পর্যাপ্ত ব্যালেন্স নেই।");
      }
      
      const duplicateJournal = (db.journalEntries || []).find(j => j.sourceType === 'RESERVE_UTILIZATION' && j.sourceId === params.utilizationId);
      if (duplicateJournal) {
         throw new Error("এই রিজার্ভ তহবিলের পেমেন্ট ইতিমধ্যে সম্পন্ন হয়েছে।");
      }

      // Credit Cash/Bank
      const cashAccountId = String(params.paymentMethod).toUpperCase() === 'CASH' ? '1001' : '1002'; // Mock IDs
      const cashAccountName = String(params.paymentMethod).toUpperCase() === 'CASH' ? 'Cash in Hand' : 'Bank Account';

      // Debit Reserve Fund Equity/Liability
      const reserveAccountId = '3003'; 
      const reserveAccountName = 'Reserve Fund';

      const journalId = `JNL-${Date.now()}`;
      const jnls = [
        {
          id: `JL-${Date.now()}-1`,
          journalEntryId: journalId,
          accountId: reserveAccountId,
          accountName: reserveAccountName,
          debit: params.amount,
          credit: 0
        },
        {
          id: `JL-${Date.now()}-2`,
          journalEntryId: journalId,
          accountId: cashAccountId,
          accountName: cashAccountName,
          debit: 0,
          credit: params.amount
        }
      ];

      const je: JournalEntry = {
        id: journalId,
        journalNo: `JE-${Date.now()}`,
        date: dateStr,
        description: `Reserve Fund Payment: ${params.purpose}`,
        sourceType: 'RESERVE_UTILIZATION',
        sourceId: util.utilizationId,
        
        createdBy: params.approvedBy,
        createdAt: new Date().toISOString()
      };

      // Add Welfare/Fund transaction (to reduce the reserve balance visually in the funds UI)
      const fundTx: any = {
        fundId: `FND-${Date.now()}`,
        date: dateStr,
        fundType: 'RESERVE',
        income: 0,
        expense: params.amount,
        beneficiary: 'Society Reserve',
        reason: params.purpose,
        amount: params.amount,
        approvedBy: params.approvedBy,
        resolutionNo: params.resolutionNo,
        voucherNo: voucherNo
      };

      const updatedUtils = [...db.reserveUtilizations];
      updatedUtils[utilIndex] = {
        ...util,
        status: 'PAID',
        voucherNo: voucherNo,
        paymentMethod: params.paymentMethod,
        approvedBy: params.approvedBy,
        resolutionNo: params.resolutionNo
      };
      
      const isCash = String(params.paymentMethod).toUpperCase() === 'CASH';
      const cashTx = isCash ? {
        transactionId: `CSH-${Date.now()}`,
        date: dateStr,
        voucherNo: voucherNo,
        reference: `RES-${params.utilizationId}`,
        description: `Reserve Fund Payment: ${params.purpose}`,
        accountId: reserveAccountId,
        accountName: reserveAccountName,
        cashIn: 0,
        cashOut: params.amount,
        balance: 0,
        sourceType: 'RESERVE_UTILIZATION' as const,
        sourceId: util.utilizationId,
        createdAt: new Date().toISOString(),
        createdBy: params.approvedBy
      } : null;

      const bankTx = !isCash ? {
        transactionId: `BNK-${Date.now()}`,
        date: dateStr,
        reference: `RES-${params.utilizationId}`,
        description: `Reserve Fund Payment: ${params.purpose}`,
        bankName: db.settings.bankName || 'Default Bank',
        accountNumberMasked: db.settings.bankAccountMask || 'XXXX',
        deposit: 0,
        withdrawal: params.amount,
        balance: 0,
        transactionNo: voucherNo,
        sourceType: 'RESERVE_UTILIZATION' as const,
        sourceId: util.utilizationId,
        createdAt: new Date().toISOString(),
        createdBy: params.approvedBy
      } : null;
      
      return {
        success: true,
        message: 'Reserve fund utilized and paid successfully.',
        db: {
          ...db,
          journalEntries: [...db.journalEntries, je],
          journalLines: [...db.journalLines, ...jnls],
          welfareTransactions: [...(db.welfareTransactions || []), fundTx],
          cashTransactions: isCash ? [...(db.cashTransactions || []), cashTx] : (db.cashTransactions || []),
          bankTransactions: !isCash ? [...(db.bankTransactions || []), bankTx] : (db.bankTransactions || []),
          auditLogs: [...(db.auditLogs || []), {
             auditId: `AL-${Date.now()}-P`,
             dateTime: new Date().toISOString(),
             userId: 'SYSTEM',
             userName: params.approvedBy,
             module: 'RESERVE_FUND',
             action: 'RESERVE_PAYMENT_COMPLETED' as any,
             recordId: params.utilizationId,
             remarks: `Payment completed for Reserve Utilization ${params.utilizationId}`
          }],
          reserveUtilizations: updatedUtils
        }
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  static getBankAccountBalance(db: AppDatabaseState, bankAccountIdOrAccNo: string): number {
    const bankAccount = (db.bankAccounts || []).find(
      b => b.id === bankAccountIdOrAccNo || b.accountNumber === bankAccountIdOrAccNo
    );
    const opening = bankAccount ? Number(bankAccount.openingBalance || 0) : 0;
    const targetId = bankAccount ? bankAccount.id : bankAccountIdOrAccNo;
    const targetAccNo = bankAccount ? bankAccount.accountNumber : bankAccountIdOrAccNo;

    const txBalance = (db.bankTransactions || []).reduce((acc, t) => {
      const isThisAccount =
        t.bankAccountId === targetId ||
        (t.accountNumberMasked && t.accountNumberMasked === targetAccNo) ||
        (targetAccNo && t.accountNumberMasked && t.accountNumberMasked.includes(targetAccNo));
      if (isThisAccount) {
        const dep = Number(t.deposit || 0);
        const wth = Number(t.withdrawal || 0);
        return acc + dep - wth;
      }
      return acc;
    }, 0);

    return opening + txBalance;
  }

  static postContraEntry(
    db: AppDatabaseState,
    params: {
      type: ContraType;
      date?: string;
      fromAccountId?: string;
      toAccountId?: string;
      fromBankAccountId?: string;
      toBankAccountId?: string;
      amount: number;
      transactionNo?: string;
      reference?: string;
      remarks?: string;
      createdBy: string;
      createdByName?: string;
      isDraft?: boolean;
      status?: 'DRAFT' | 'POSTED';
      idempotencyKey?: string;
    }
  ): { success: boolean; message: string; voucherNo?: string; contraId?: string; updatedDb?: AppDatabaseState } {
    if (params.amount <= 0 || isNaN(params.amount)) {
      return { success: false, message: 'স্থানান্তরের পরিমাণ ০ অপেক্ষা বেশি হতে হবে।' };
    }

    const fromAccountId = params.fromAccountId || params.fromBankAccountId;
    const toAccountId = params.toAccountId || params.toBankAccountId;
    const isDraft = Boolean(params.isDraft || params.status === 'DRAFT');

    const businessIdempotencyKey = params.idempotencyKey || `CON-${params.type}-${params.date}-${params.amount}-${fromAccountId || ''}-${toAccountId || ''}-${params.transactionNo || ''}`;

    // Idempotency / Double-Submission Prevention
    const recentDuplicate = (db.contraTransactions || []).find(c => 
      c.idempotencyKey === businessIdempotencyKey ||
      (
        c.type === params.type && 
        c.amount === params.amount && 
        c.fromAccountId === fromAccountId &&
        c.toAccountId === toAccountId &&
        c.date === params.date &&
        (c.transactionNo || '') === (params.transactionNo || '')
      )
    );

    if (recentDuplicate && !isDraft) {
      return { 
        success: true, 
        message: 'এন্ট্রিটি ইতোমধ্যে সংরক্ষিত হয়েছে।', 
        voucherNo: recentDuplicate.voucherNo, 
        contraId: recentDuplicate.id, 
        updatedDb: db 
      };
    }

    const dateStr = params.date || new Date().toISOString().split('T')[0];
    if (!isDraft && isDateInClosedYear(dateStr, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে কন্ট্রা এন্ট্রি তৈরি করা সম্ভব নয়।' };
    }

    const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');
    const fyCode = activeYear ? activeYear.yearCode : (db.settings?.currentFinancialYear || '2026-2027');

    const contraId = isDraft ? `DRF-CON-${Date.now()}` : `CON-${Date.now()}`;
    const voucherNo = isDraft ? this.generateVoucherNo(db, 'DRF') : this.generateVoucherNo(db, 'CON');
    const jnlVoucherNo = this.generateVoucherNo(db, 'JNL');
    const journalEntryId = `JNL-${Date.now()}`;

    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournals = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];
    let updatedContra = [...(db.contraTransactions || [])];
    let updatedAudit = [...(db.auditLogs || [])];

    let currentCash = this.getCashBalance(db.cashTransactions);
    let fromAccountName = '';
    let fromAccountNumber = '';
    let toAccountName = '';
    let toAccountNumber = '';

    if (params.type === 'CASH_TO_BANK') {
      if (!toAccountId) {
        return { success: false, message: 'গন্তব্য ব্যাংক হিসাব নির্বাচন করুন।' };
      }
      const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);
      if (!toBank || toBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত গন্তব্য ব্যাংক হিসাবটি সক্রিয় নয়।' };
      }

      if (!isDraft && currentCash < params.amount) {
        return { success: false, message: `পর্যাপ্ত নগদ ব্যালেন্স নেই। বর্তমান নগদ স্থিতি: ৳${currentCash.toLocaleString()}` };
      }

      fromAccountName = 'হাতে নগদ (Cash in Hand)';
      fromAccountNumber = 'CASH';
      toAccountName = `${toBank.bankName} (${toBank.branchName})`;
      toAccountNumber = toBank.accountNumber;

      if (!isDraft) {
        // Cash transaction (Outflow)
        currentCash -= params.amount;
        updatedCash.push({
          transactionId: `CSH-${Date.now()}-CON`,
          date: dateStr,
          voucherNo,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `ব্যাংকে নগদ জমা (${toBank.bankName} - ${toBank.accountNumber})${params.remarks ? ' - ' + params.remarks : ''}`,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          cashIn: 0,
          cashOut: params.amount,
          balance: currentCash,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdBy: params.createdBy, status: "POSTED" as any,
          createdAt: new Date().toISOString()
        });

        // Bank transaction (Inflow)
        const currentBankBal = this.getBankBalance(db.bankTransactions);
        updatedBank.push({
          transactionId: `BNK-${Date.now()}-CON`,
          bankAccountId: toBank.id,
          date: dateStr,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `নগদ জমা${params.remarks ? ' - ' + params.remarks : ''}`,
          bankName: toBank.bankName,
          accountNumberMasked: toBank.accountNumber,
          deposit: params.amount,
          withdrawal: 0,
          balance: currentBankBal + params.amount,
          transactionNo: voucherNo,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdAt: new Date().toISOString()
        });

        // Balanced Journal Entry: Debit Bank, Credit Cash
        updatedJournals.push({
          id: journalEntryId,
          journalNo: jnlVoucherNo,
          date: dateStr,
          reference: voucherNo,
          description: `কন্ট্রা এন্ট্রি: নগদ টাকা ব্যাংকে জমা (${toBank.bankName} - ${toBank.accountNumber})`,
          sourceType: 'CONTRA',
          sourceId: contraId,
          
          createdBy: params.createdBy, status: "ACTIVE", /* journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`, removed duplicate */
          createdAt: new Date().toISOString()
        });

        updatedJournalLines.push(
          {
            id: `JL-${Date.now()}-1`,
            journalEntryId,
            accountId: '1010',
            accountName: `ব্যাংক হিসাব (${toBank.bankName})`,
            debit: params.amount,
            credit: 0,
            description: `ব্যাংকে জমা (ডেবিট)`
          },
          {
            id: `JL-${Date.now()}-2`,
            journalEntryId,
            accountId: '1000',
            accountName: 'হাতে নগদ',
            debit: 0,
            credit: params.amount,
            description: `হাতে নগদ (ক্রেডিট)`
          }
        );
      }

    } else if (params.type === 'BANK_TO_CASH') {
      if (!fromAccountId) {
        return { success: false, message: 'উৎস ব্যাংক হিসাব নির্বাচন করুন।' };
      }
      const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
      if (!fromBank || fromBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত উৎস ব্যাংক হিসাবটি সক্রিয় নয়।' };
      }

      if (!isDraft) {
        const fromBankBal = this.getBankAccountBalance(db, fromBank.id);
        if (fromBankBal < params.amount) {
          return { success: false, message: `উৎস ব্যাংক (${fromBank.bankName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান স্থিতি: ৳${fromBankBal.toLocaleString()}` };
        }
      }

      fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
      fromAccountNumber = fromBank.accountNumber;
      toAccountName = 'হাতে নগদ (Cash in Hand)';
      toAccountNumber = 'CASH';

      if (!isDraft) {
        // Cash transaction (Inflow)
        currentCash += params.amount;
        updatedCash.push({
          transactionId: `CSH-${Date.now()}-CON`,
          date: dateStr,
          voucherNo,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `ব্যাংক থেকে নগদ উত্তোলন (${fromBank.bankName} - ${fromBank.accountNumber})${params.remarks ? ' - ' + params.remarks : ''}`,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          cashIn: params.amount,
          cashOut: 0,
          balance: currentCash,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdBy: params.createdBy, status: "POSTED" as any,
          createdAt: new Date().toISOString()
        });

        // Bank transaction (Outflow)
        const currentBankBal = this.getBankBalance(db.bankTransactions);
        updatedBank.push({
          transactionId: `BNK-${Date.now()}-CON`,
          bankAccountId: fromBank.id,
          date: dateStr,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `নগদ উত্তোলন${params.remarks ? ' - ' + params.remarks : ''}`,
          bankName: fromBank.bankName,
          accountNumberMasked: fromBank.accountNumber,
          deposit: 0,
          withdrawal: params.amount,
          balance: currentBankBal - params.amount,
          transactionNo: voucherNo,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdAt: new Date().toISOString()
        });

        // Balanced Journal Entry: Debit Cash, Credit Bank
        updatedJournals.push({
          id: journalEntryId,
          journalNo: jnlVoucherNo,
          date: dateStr,
          reference: voucherNo,
          description: `কন্ট্রা এন্ট্রি: ব্যাংক থেকে নগদ উত্তোলন (${fromBank.bankName} - ${fromBank.accountNumber})`,
          sourceType: 'CONTRA',
          sourceId: contraId,
          
          createdBy: params.createdBy, status: "ACTIVE", /* journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`, removed duplicate */
          createdAt: new Date().toISOString()
        });

        updatedJournalLines.push(
          {
            id: `JL-${Date.now()}-1`,
            journalEntryId,
            accountId: '1000',
            accountName: 'হাতে নগদ',
            debit: params.amount,
            credit: 0,
            description: `হাতে নগদ বৃদ্ধি (ডেবিট)`
          },
          {
            id: `JL-${Date.now()}-2`,
            journalEntryId,
            accountId: '1010',
            accountName: `ব্যাংক হিসাব (${fromBank.bankName})`,
            debit: 0,
            credit: params.amount,
            description: `ব্যাংক হিসাব হ্রাস (ক্রেডিট)`
          }
        );
      }

    } else if (params.type === 'BANK_TO_BANK') {
      if (!fromAccountId || !toAccountId) {
        return { success: false, message: 'উৎস এবং গন্তব্য উভয় ব্যাংক হিসাব নির্বাচন করুন।' };
      }
      if (fromAccountId === toAccountId) {
        return { success: false, message: 'উৎস ও গন্তব্য ব্যাংক হিসাব একই হতে পারে না।' };
      }

      const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
      const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);

      if (!fromBank || fromBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত উৎস ব্যাংক হিসাবটি সক্রিয় নয়।' };
      }
      if (!toBank || toBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত গন্তব্য ব্যাংক হিসাবটি সক্রিয় নয়।' };
      }

      if (!isDraft) {
        const fromBankBal = this.getBankAccountBalance(db, fromBank.id);
        if (fromBankBal < params.amount) {
          return { success: false, message: `উৎস ব্যাংক (${fromBank.bankName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান স্থিতি: ৳${fromBankBal.toLocaleString()}` };
        }
      }

      fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
      fromAccountNumber = fromBank.accountNumber;
      toAccountName = `${toBank.bankName} (${toBank.branchName})`;
      toAccountNumber = toBank.accountNumber;

      if (!isDraft) {
        const currentBankBal = this.getBankBalance(db.bankTransactions);

        // Bank 1: Withdrawal from source bank
        updatedBank.push({
          transactionId: `BNK-${Date.now()}-CON-SRC`,
          bankAccountId: fromBank.id,
          date: dateStr,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `আন্তঃব্যাংক স্থানান্তর -> ${toBank.bankName} (${toBank.accountNumber})${params.remarks ? ' - ' + params.remarks : ''}`,
          bankName: fromBank.bankName,
          accountNumberMasked: fromBank.accountNumber,
          deposit: 0,
          withdrawal: params.amount,
          balance: currentBankBal - params.amount,
          transactionNo: voucherNo,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdAt: new Date().toISOString()
        });

        // Bank 2: Deposit into destination bank
        updatedBank.push({
          transactionId: `BNK-${Date.now()}-CON-DST`,
          bankAccountId: toBank.id,
          date: dateStr,
          reference: params.transactionNo || params.reference || voucherNo,
          description: `আন্তঃব্যাংক স্থানান্তর <- ${fromBank.bankName} (${fromBank.accountNumber})${params.remarks ? ' - ' + params.remarks : ''}`,
          bankName: toBank.bankName,
          accountNumberMasked: toBank.accountNumber,
          deposit: params.amount,
          withdrawal: 0,
          balance: currentBankBal,
          transactionNo: voucherNo,
          sourceType: 'CONTRA',
          sourceId: contraId,
          createdAt: new Date().toISOString()
        });

        // Balanced Journal Entry: Debit Destination Bank, Credit Source Bank
        updatedJournals.push({
          id: journalEntryId,
          journalNo: jnlVoucherNo,
          date: dateStr,
          reference: voucherNo,
          description: `কন্ট্রা এন্ট্রি: আন্তঃব্যাংক তহবিল স্থানান্তর (${fromBank.bankName} -> ${toBank.bankName})`,
          sourceType: 'CONTRA',
          sourceId: contraId,
          
          createdBy: params.createdBy, status: "ACTIVE", /* journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`, removed duplicate */
          createdAt: new Date().toISOString()
        });

        updatedJournalLines.push(
          {
            id: `JL-${Date.now()}-1`,
            journalEntryId,
            accountId: '1010',
            accountName: `ব্যাংক হিসাব (${toBank.bankName})`,
            debit: params.amount,
            credit: 0,
            description: `গন্তব্য ব্যাংক হিসাব বৃদ্ধি (ডেবিট)`
          },
          {
            id: `JL-${Date.now()}-2`,
            journalEntryId,
            accountId: '1010',
            accountName: `ব্যাংক হিসাব (${fromBank.bankName})`,
            debit: 0,
            credit: params.amount,
            description: `উৎস ব্যাংক হিসাব হ্রাস (ক্রেডিট)`
          }
        );
      }
    }

    const newContra: ContraTransaction = {
      id: contraId,
      idempotencyKey: businessIdempotencyKey,
      voucherNo,
      date: dateStr,
      type: params.type,
      fromAccountType: params.type === 'CASH_TO_BANK' ? 'CASH' : 'BANK',
      fromAccountId,
      fromAccountName,
      fromAccountNumber,
      toAccountType: params.type === 'BANK_TO_CASH' ? 'CASH' : 'BANK',
      toAccountId,
      toAccountName,
      toAccountNumber,
      amount: params.amount,
      transactionNo: params.transactionNo || voucherNo,
      reference: params.reference || params.transactionNo,
      remarks: params.remarks,
      particulars: params.remarks,
      financialYear: fyCode,
      journalEntryId: isDraft ? undefined : journalEntryId,
      status: isDraft ? 'DRAFT' : 'POSTED',
      enteredBy: params.createdBy,
      enteredByName: params.createdByName || params.createdBy,
      enteredAt: new Date().toISOString(),
      postedBy: isDraft ? undefined : params.createdBy,
      postedByName: isDraft ? undefined : (params.createdByName || params.createdBy),
      postedAt: isDraft ? undefined : new Date().toISOString(),
      createdBy: params.createdBy,       createdAt: new Date().toISOString(),
      updatedBy: params.createdBy,
      updatedAt: new Date().toISOString()
    };

    updatedContra.unshift(newContra);

    updatedAudit.unshift({
      auditId: `AUD-${Date.now()}`,
      userId: params.createdBy,
      userName: params.createdByName || params.createdBy,
      dateTime: new Date().toISOString(),
      module: 'CONTRA',
      action: isDraft ? ('CONTRA_DRAFT_CREATED' as any) : 'CONTRA_POSTED',
      recordId: contraId,
      newValue: JSON.stringify(newContra),
      remarks: isDraft
        ? `খসড়া কন্ট্রা এন্ট্রি সংরক্ষণ: ${voucherNo} - ৳${params.amount.toLocaleString()} (${params.type})`
        : `কন্ট্রা এন্ট্রি পোস্ট সম্পন্ন: ${voucherNo} - ৳${params.amount.toLocaleString()} (${params.type})`
    });

    return {
      success: true,
      message: isDraft
        ? `খসড়া কন্ট্রা এন্ট্রি ${voucherNo} সফলভাবে সংরক্ষিত হয়েছে`
        : `কন্ট্রা এন্ট্রি ভাউচার ${voucherNo} সফলভাবে পোস্ট করা হয়েছে`,
      voucherNo,
      contraId,
      updatedDb: {
        ...db,
        cashTransactions: isDraft ? db.cashTransactions : updatedCash,
        bankTransactions: isDraft ? db.bankTransactions : updatedBank,
        journalEntries: isDraft ? db.journalEntries : updatedJournals,
        journalLines: isDraft ? db.journalLines : updatedJournalLines,
        contraTransactions: updatedContra,
        
        auditLogs: updatedAudit
      }
    };
  }

  // Edit DRAFT Contra Entry (Only drafts can be directly edited)
  static editDraftContraEntry(
    db: AppDatabaseState,
    params: {
      contraId: string;
      type?: ContraType;
      date?: string;
      fromAccountId?: string;
      toAccountId?: string;
      fromBankAccountId?: string;
      toBankAccountId?: string;
      amount?: number;
      transactionNo?: string;
      reference?: string;
      remarks?: string;
      updatedBy: string;
      updatedByName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const contra = (db.contraTransactions || []).find(c => c.id === params.contraId);
    if (!contra) {
      return { success: false, message: 'কন্ট্রা এন্ট্রি রেকর্ড পাওয়া যায়নি।' };
    }

    if (contra.status !== 'DRAFT') {
      return {
        success: false,
        message: 'পোস্ট করা কন্ট্রা এন্ট্রি সরাসরি পরিবর্তন করা যাবে না। সংশোধন করতে রিভার্সাল করুন।'
      };
    }

    const newType = params.type || contra.type;
    const newAmount = params.amount !== undefined ? params.amount : contra.amount;
    const fromAccountId = params.fromAccountId || params.fromBankAccountId || contra.fromAccountId;
    const toAccountId = params.toAccountId || params.toBankAccountId || contra.toAccountId;

    let fromAccountName = contra.fromAccountName;
    let fromAccountNumber = contra.fromAccountNumber;
    let toAccountName = contra.toAccountName;
    let toAccountNumber = contra.toAccountNumber;

    if (newType === 'CASH_TO_BANK') {
      fromAccountName = 'হাতে নগদ (Cash in Hand)';
      fromAccountNumber = 'CASH';
      if (toAccountId) {
        const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);
        if (toBank) {
          toAccountName = `${toBank.bankName} (${toBank.branchName})`;
          toAccountNumber = toBank.accountNumber;
        }
      }
    } else if (newType === 'BANK_TO_CASH') {
      toAccountName = 'হাতে নগদ (Cash in Hand)';
      toAccountNumber = 'CASH';
      if (fromAccountId) {
        const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
        if (fromBank) {
          fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
          fromAccountNumber = fromBank.accountNumber;
        }
      }
    } else if (newType === 'BANK_TO_BANK') {
      if (fromAccountId) {
        const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
        if (fromBank) {
          fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
          fromAccountNumber = fromBank.accountNumber;
        }
      }
      if (toAccountId) {
        const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);
        if (toBank) {
          toAccountName = `${toBank.bankName} (${toBank.branchName})`;
          toAccountNumber = toBank.accountNumber;
        }
      }
    }

    const updatedContra = (db.contraTransactions || []).map(c => {
      if (c.id === params.contraId) {
        return {
          ...c,
          type: newType,
          date: params.date || c.date,
          amount: newAmount,
          fromAccountId,
          fromAccountName,
          fromAccountNumber,
          toAccountId,
          toAccountName,
          toAccountNumber,
          fromAccountType: (newType === 'CASH_TO_BANK' ? 'CASH' : 'BANK') as 'CASH' | 'BANK',
          toAccountType: (newType === 'BANK_TO_CASH' ? 'CASH' : 'BANK') as 'CASH' | 'BANK',
          transactionNo: params.transactionNo !== undefined ? params.transactionNo : c.transactionNo,
          reference: params.reference !== undefined ? params.reference : c.reference,
          remarks: params.remarks !== undefined ? params.remarks : c.remarks,
          particulars: params.remarks !== undefined ? params.remarks : c.particulars,
          updatedBy: params.updatedBy,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.updatedBy,
        userName: params.updatedByName || params.updatedBy,
        dateTime: new Date().toISOString(),
        module: 'CONTRA',
        action: 'CONTRA_DRAFT_UPDATED' as any,
        recordId: contra.id,
        remarks: `খসড়া কন্ট্রা এন্ট্রি হালনাগাদ: ${contra.voucherNo}`
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: `খসড়া কন্ট্রা এন্ট্রি ${contra.voucherNo} সফলভাবে হালনাগাদ করা হয়েছে`,
      updatedDb: {
        ...db,
        contraTransactions: updatedContra,
        
        auditLogs: updatedAudit
      }
    };
  }

  // Delete DRAFT Contra Entry (Only drafts can be deleted)
  static deleteDraftContraEntry(
    db: AppDatabaseState,
    params: {
      contraId: string;
      deletedBy: string;
      deletedByName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const contra = (db.contraTransactions || []).find(c => c.id === params.contraId);
    if (!contra) {
      return { success: false, message: 'কন্ট্রা এন্ট্রি রেকর্ড পাওয়া যায়নি।' };
    }

    if (contra.status !== 'DRAFT') {
      return {
        success: false,
        message: 'পোস্ট করা কন্ট্রা এন্ট্রি মুছে ফেলা যাবে না। কেবলমাত্র খসড়া (Draft) এন্ট্রি মুছে ফেলা সম্ভব।'
      };
    }

    const updatedContra = (db.contraTransactions || []).filter(c => c.id !== params.contraId);

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.deletedBy,
        userName: params.deletedByName || params.deletedBy,
        dateTime: new Date().toISOString(),
        module: 'CONTRA',
        action: 'CONTRA_DRAFT_DELETED' as any,
        recordId: contra.id,
        remarks: `খসড়া কন্ট্রা এন্ট্রি মুছে ফেলা হয়েছে: ${contra.voucherNo}`
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: `খসড়া কন্ট্রা এন্ট্রি ${contra.voucherNo} সফলভাবে মুছে ফেলা হয়েছে`,
      updatedDb: {
        ...db,
        contraTransactions: updatedContra,
        
        auditLogs: updatedAudit
      }
    };
  }

  // Post an existing DRAFT Contra Entry to ledger
  static postDraftContraEntry(
    db: AppDatabaseState,
    params: {
      contraId: string;
      postedBy: string;
      postedByName?: string;
    }
  ): { success: boolean; message: string; voucherNo?: string; contraId?: string; updatedDb?: AppDatabaseState } {
    // 1. Locate the draft by ID or VoucherNo
    const contra = (db.contraTransactions || db.contraEntries || []).find(
      c => c.id === params.contraId || c.voucherNo === params.contraId
    );
    if (!contra) {
      return { success: false, message: 'কন্ট্রা এন্ট্রি রেকর্ড পাওয়া যায়নি।' };
    }

    // 2. Duplicate Protection Check
    const isAlreadyPosted = contra.status === 'POSTED' ||
      (db.journalEntries || []).some(j => j.sourceId === contra.id || (j.sourceType === 'CONTRA' && j.reference === contra.voucherNo)) ||
      (db.cashTransactions || []).some(c => c.sourceId === contra.id || (c.sourceType === 'CONTRA' && c.voucherNo === contra.voucherNo)) ||
      (db.bankTransactions || []).some(b => b.sourceId === contra.id || (b.sourceType === 'CONTRA' && (b.transactionNo === contra.voucherNo || b.reference === contra.voucherNo)));

    if (isAlreadyPosted || contra.status !== 'DRAFT') {
      return { success: false, message: 'এই কন্ট্রা এন্ট্রি ইতিমধ্যে লেজারে পোস্ট করা হয়েছে।' };
    }

    // 3. Amount Validation
    if (!contra.amount || contra.amount <= 0 || isNaN(contra.amount)) {
      return { success: false, message: 'স্থানান্তরের পরিমাণ ০ অপেক্ষা বেশি হতে হবে।' };
    }

    // 4. Financial Year Closed Guard
    const dateStr = contra.date || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(dateStr, db)) {
      return {
        success: false,
        message: 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে খসড়া কন্ট্রা এন্ট্রি পোস্ট করা সম্ভব নয়।'
      };
    }

    const fromAccountId = contra.fromAccountId;
    const toAccountId = contra.toAccountId;

    let fromAccountName = contra.fromAccountName || '';
    let fromAccountNumber = contra.fromAccountNumber || '';
    let toAccountName = contra.toAccountName || '';
    let toAccountNumber = contra.toAccountNumber || '';

    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournals = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];
    let updatedAudit = [...(db.auditLogs || [])];

    let currentCash = this.getCashBalance(db.cashTransactions);
    const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');
    const fyCode = activeYear ? activeYear.yearCode : (db.settings?.currentFinancialYear || '2026-2027');

    const journalEntryId = `JNL-${Date.now()}`;
    const jnlVoucherNo = this.generateVoucherNo(db, 'JNL');
    const voucherNo = contra.voucherNo; // Preserve draft voucher number (e.g. DRF-2026-000054)

    if (contra.type === 'CASH_TO_BANK') {
      if (!toAccountId) {
        return { success: false, message: 'গন্তব্য ব্যাংক হিসাব পাওয়া যায়নি।' };
      }
      const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);
      if (!toBank || toBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত গন্তব্য ব্যাংক হিসাবটি সক্রিয় নয় বা পাওয়া যায়নি।' };
      }

      if (currentCash < contra.amount) {
        return {
          success: false,
          message: `পর্যাপ্ত নগদ ব্যালেন্স নেই। বর্তমান নগদ স্থিতি: ৳${currentCash.toLocaleString()}`
        };
      }

      fromAccountName = 'হাতে নগদ (Cash in Hand)';
      fromAccountNumber = 'CASH';
      toAccountName = `${toBank.bankName} (${toBank.branchName})`;
      toAccountNumber = toBank.accountNumber;

      // Cash Outflow
      currentCash -= contra.amount;
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-CON`,
        date: dateStr,
        voucherNo,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `ব্যাংকে নগদ জমা (${toBank.bankName} - ${toBank.accountNumber})${contra.remarks ? ' - ' + contra.remarks : ''}`,
        accountId: '1000',
        accountName: 'হাতে নগদ',
        cashIn: 0,
        cashOut: contra.amount,
        balance: currentCash,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdBy: params.postedBy,
        createdAt: new Date().toISOString()
      });

      // Bank Inflow
      const currentBankBal = this.getBankAccountBalance(db, toBank.id);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-CON`,
        bankAccountId: toBank.id,
        date: dateStr,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `নগদ জমা${contra.remarks ? ' - ' + contra.remarks : ''}`,
        bankName: toBank.bankName,
        accountNumberMasked: toBank.accountNumber,
        deposit: contra.amount,
        withdrawal: 0,
        balance: currentBankBal + contra.amount,
        transactionNo: voucherNo,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdAt: new Date().toISOString()
      });

      // Journal Entry: Debit Bank, Credit Cash
      updatedJournals.push({
        id: journalEntryId,
        journalNo: jnlVoucherNo,
        date: dateStr,
        reference: voucherNo,
        description: `কন্ট্রা এন্ট্রি: নগদ টাকা ব্যাংকে জমা (${toBank.bankName} - ${toBank.accountNumber})`,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdBy: params.postedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-1`,
          journalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${toBank.bankName})`,
          debit: contra.amount,
          credit: 0,
          description: `ব্যাংকে জমা (ডেবিট)`
        },
        {
          id: `JL-${Date.now()}-2`,
          journalEntryId,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          debit: 0,
          credit: contra.amount,
          description: `হাতে নগদ (ক্রেডিট)`
        }
      );

    } else if (contra.type === 'BANK_TO_CASH') {
      if (!fromAccountId) {
        return { success: false, message: 'উৎস ব্যাংক হিসাব পাওয়া যায়নি।' };
      }
      const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
      if (!fromBank || fromBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত উৎস ব্যাংক হিসাবটি সক্রিয় নয় বা পাওয়া যায়নি।' };
      }

      const fromBankBal = this.getBankAccountBalance(db, fromBank.id);
      if (fromBankBal < contra.amount) {
        return {
          success: false,
          message: `উৎস ব্যাংক (${fromBank.bankName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান স্থিতি: ৳${fromBankBal.toLocaleString()}`
        };
      }

      fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
      fromAccountNumber = fromBank.accountNumber;
      toAccountName = 'হাতে নগদ (Cash in Hand)';
      toAccountNumber = 'CASH';

      // Cash Inflow
      currentCash += contra.amount;
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-CON`,
        date: dateStr,
        voucherNo,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `ব্যাংক থেকে নগদ উত্তোলন (${fromBank.bankName} - ${fromBank.accountNumber})${contra.remarks ? ' - ' + contra.remarks : ''}`,
        accountId: '1000',
        accountName: 'হাতে নগদ',
        cashIn: contra.amount,
        cashOut: 0,
        balance: currentCash,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdBy: params.postedBy,
        createdAt: new Date().toISOString()
      });

      // Bank Outflow
      const currentBankBal = this.getBankAccountBalance(db, fromBank.id);
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-CON`,
        bankAccountId: fromBank.id,
        date: dateStr,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `নগদ উত্তোলন${contra.remarks ? ' - ' + contra.remarks : ''}`,
        bankName: fromBank.bankName,
        accountNumberMasked: fromBank.accountNumber,
        deposit: 0,
        withdrawal: contra.amount,
        balance: currentBankBal - contra.amount,
        transactionNo: voucherNo,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdAt: new Date().toISOString()
      });

      // Journal Entry: Debit Cash, Credit Bank
      updatedJournals.push({
        id: journalEntryId,
        journalNo: jnlVoucherNo,
        date: dateStr,
        reference: voucherNo,
        description: `কন্ট্রা এন্ট্রি: ব্যাংক থেকে নগদ উত্তোলন (${fromBank.bankName} - ${fromBank.accountNumber})`,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdBy: params.postedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-1`,
          journalEntryId,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          debit: contra.amount,
          credit: 0,
          description: `হাতে নগদ বৃদ্ধি (ডেবিট)`
        },
        {
          id: `JL-${Date.now()}-2`,
          journalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${fromBank.bankName})`,
          debit: 0,
          credit: contra.amount,
          description: `ব্যাংক হিসাব হ্রাস (ক্রেডিট)`
        }
      );

    } else if (contra.type === 'BANK_TO_BANK') {
      if (!fromAccountId || !toAccountId) {
        return { success: false, message: 'উৎস এবং গন্তব্য উভয় ব্যাংক হিসাব নির্বাচন করা থাকতে হবে।' };
      }
      if (fromAccountId === toAccountId) {
        return { success: false, message: 'উৎস ও গন্তব্য ব্যাংক হিসাব একই হতে পারে না।' };
      }

      const fromBank = (db.bankAccounts || []).find(b => b.id === fromAccountId || b.accountNumber === fromAccountId);
      const toBank = (db.bankAccounts || []).find(b => b.id === toAccountId || b.accountNumber === toAccountId);

      if (!fromBank || fromBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত উৎস ব্যাংক হিসাবটি সক্রিয় নয় বা পাওয়া যায়নি।' };
      }
      if (!toBank || toBank.status !== 'ACTIVE') {
        return { success: false, message: 'নির্বাচিত গন্তব্য ব্যাংক হিসাবটি সক্রিয় নয় বা পাওয়া যায়নি।' };
      }

      const fromBankBal = this.getBankAccountBalance(db, fromBank.id);
      if (fromBankBal < contra.amount) {
        return {
          success: false,
          message: `উৎস ব্যাংক (${fromBank.bankName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান স্থিতি: ৳${fromBankBal.toLocaleString()}`
        };
      }

      fromAccountName = `${fromBank.bankName} (${fromBank.branchName})`;
      fromAccountNumber = fromBank.accountNumber;
      toAccountName = `${toBank.bankName} (${toBank.branchName})`;
      toAccountNumber = toBank.accountNumber;

      const fromBankBalBefore = this.getBankAccountBalance(db, fromBank.id);
      const toBankBalBefore = this.getBankAccountBalance(db, toBank.id);

      // Bank 1: Withdrawal from source bank
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-CON-SRC`,
        bankAccountId: fromBank.id,
        date: dateStr,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `আন্তঃব্যাংক স্থানান্তর -> ${toBank.bankName} (${toBank.accountNumber})${contra.remarks ? ' - ' + contra.remarks : ''}`,
        bankName: fromBank.bankName,
        accountNumberMasked: fromBank.accountNumber,
        deposit: 0,
        withdrawal: contra.amount,
        balance: fromBankBalBefore - contra.amount,
        transactionNo: voucherNo,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdAt: new Date().toISOString()
      });

      // Bank 2: Deposit into destination bank
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-CON-DST`,
        bankAccountId: toBank.id,
        date: dateStr,
        reference: contra.transactionNo || contra.reference || voucherNo,
        description: `আন্তঃব্যাংক স্থানান্তর <- ${fromBank.bankName} (${fromBank.accountNumber})${contra.remarks ? ' - ' + contra.remarks : ''}`,
        bankName: toBank.bankName,
        accountNumberMasked: toBank.accountNumber,
        deposit: contra.amount,
        withdrawal: 0,
        balance: toBankBalBefore + contra.amount,
        transactionNo: voucherNo,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdAt: new Date().toISOString()
      });

      // Balanced Journal Entry: Debit Destination Bank, Credit Source Bank
      updatedJournals.push({
        id: journalEntryId,
        journalNo: jnlVoucherNo,
        date: dateStr,
        reference: voucherNo,
        description: `কন্ট্রা এন্ট্রি: আন্তঃব্যাংক তহবিল স্থানান্তর (${fromBank.bankName} -> ${toBank.bankName})`,
        sourceType: 'CONTRA',
        sourceId: contra.id,
        createdBy: params.postedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-1`,
          journalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${toBank.bankName})`,
          debit: contra.amount,
          credit: 0,
          description: `গন্তব্য ব্যাংক হিসাব বৃদ্ধি (ডেবিট)`
        },
        {
          id: `JL-${Date.now()}-2`,
          journalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${fromBank.bankName})`,
          debit: 0,
          credit: contra.amount,
          description: `উৎস ব্যাংক হিসাব হ্রাস (ক্রেডিট)`
        }
      );
    }

    // 6. Transition Draft in-place to POSTED
    const updatedContra = (db.contraTransactions || db.contraEntries || []).map(c => {
      if (c.id === contra.id || c.voucherNo === contra.voucherNo) {
        return {
          ...c,
          status: 'POSTED' as any,
          journalEntryId,
          fromAccountName: fromAccountName || c.fromAccountName,
          fromAccountNumber: fromAccountNumber || c.fromAccountNumber,
          toAccountName: toAccountName || c.toAccountName,
          toAccountNumber: toAccountNumber || c.toAccountNumber,
          postedBy: params.postedBy,
          postedByName: params.postedByName || params.postedBy,
          postedAt: new Date().toISOString(),
          updatedBy: params.postedBy,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    // 7. Create Audit Log
    const auditRecord: AuditLog = {
      auditId: `AUD-${Date.now()}`,
      userId: params.postedBy,
      userName: params.postedByName || params.postedBy,
      dateTime: new Date().toISOString(),
      module: 'CONTRA',
      action: 'CONTRA_ENTRY_POSTED',
      recordId: contra.id,
      newValue: JSON.stringify({
        draftId: contra.id,
        voucherNo: contra.voucherNo,
        amount: contra.amount,
        sourceAccount: fromAccountName,
        destinationAccount: toAccountName,
        financialYear: contra.financialYear || fyCode,
        journalEntryId,
        status: 'POSTED' as any
      }),
      remarks: `কন্ট্রা এন্ট্রি সফলভাবে লেজারে পোস্ট হয়েছে: ${voucherNo} - ৳${contra.amount.toLocaleString()} (${contra.type})`
    };
    updatedAudit.unshift(auditRecord);

    return {
      success: true,
      message: 'কন্ট্রা এন্ট্রি সফলভাবে লেজারে পোস্ট হয়েছে।',
      voucherNo,
      contraId: contra.id,
      updatedDb: {
        ...db,
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: updatedJournals,
        journalLines: updatedJournalLines,
        contraTransactions: updatedContra,
        
        auditLogs: updatedAudit
      }
    };
  }

  // Proper Reversal / Correction workflow for Posted Contra Entries
  static reverseContraEntry(
    db: AppDatabaseState,
    params: {
      contraId: string;
      reason: string;
      reversedBy: string;
      userRole?: string;
    }
  ): { success: boolean; message: string; reversalVoucherNo?: string; updatedDb?: AppDatabaseState } {
    // 1. Role / Permissions check: MEMBER cannot reverse. Only ADMIN, ADMIN and ACCOUNTANT.
    const allowedRoles = ['ADMIN', 'ACCOUNTANT'];
    if (params.userRole && !allowedRoles.includes(params.userRole)) {
      return {
        success: false,
        message: 'অনুমতি অস্বীকৃত: শুধুমাত্র অ্যাডমিন এবং ফাইন্যান্স ম্যানেজার কন্ট্রা এন্ট্রি রিভার্স বা সংশোধন করতে পারবেন।'
      };
    }

    // 2. Mandatory correction reason check
    if (!params.reason || !params.reason.trim()) {
      return { success: false, message: 'সংশোধন বা রিভার্সালের কারণ (Reason) উল্লেখ করা বাধ্যতামূলক।' };
    }

    const contra = (db.contraTransactions || []).find(c => c.id === params.contraId);
    if (!contra) {
      return { success: false, message: 'কন্ট্রা এন্ট্রি রেকর্ড পাওয়া যায়নি।' };
    }

    if (contra.status === 'DRAFT') {
      return { success: false, message: 'খসড়া কন্ট্রা এন্ট্রি রিভার্স করার প্রয়োজন নেই, সরাসরি এডিট বা ডিলেট করুন।' };
    }

    if (contra.status === 'REVERSED') {
      return { success: false, message: 'এই কন্ট্রা এন্ট্রিটি ইতিমধ্যে প্রত্যাহার (Reversed) করা হয়েছে।' };
    }

    if (contra.status === 'REVERSAL') {
      return { success: false, message: 'রিভার্সাল এন্ট্রি নিজে রিভার্স করা যাবে না।' };
    }

    // 3. Closed Financial Year Protection
    const today = new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(contra.date, db) || isDateInClosedYear(today, db)) {
      return {
        success: false,
        message: 'এই অর্থবছর বন্ধ রয়েছে। এই লেনদেনের Correction করা যাবে না।'
      };
    }

    // 4. Reconciliation Protection
    if (contra.reconciled || contra.isReconciliationLocked) {
      return {
        success: false,
        message: 'এই লেনদেনটি ইতিমধ্যে সম্পন্নকৃত রিকনসিলিয়েশনে (Reconciliation) অন্তর্ভুক্ত রয়েছে। সরাসরি রিভার্স করা যাবে না।'
      };
    }

    // Also check if any bank reconciliation or cash reconciliation is finalized covering this transaction
    if (contra.fromAccountType === 'BANK' && contra.fromAccountId) {
      const hasFinalizedBankReconciliation = (db.bankReconciliations || []).some(
        r => r.bankAccountId === contra.fromAccountId && (r.status === 'RECONCILED' || r.status === 'MATCHED' || !!r.approvedAt) && r.statementDateTo >= contra.date
      );
      if (hasFinalizedBankReconciliation) {
        return {
          success: false,
          message: 'এই লেনদেনটি ইতিমধ্যে সম্পন্নকৃত রিকনসিলিয়েশনে (Reconciliation) অন্তর্ভুক্ত রয়েছে। সরাসরি রিভার্স করা যাবে না।'
        };
      }
    }

    if (contra.toAccountType === 'BANK' && contra.toAccountId) {
      const hasFinalizedBankReconciliation = (db.bankReconciliations || []).some(
        r => r.bankAccountId === contra.toAccountId && (r.status === 'RECONCILED' || r.status === 'MATCHED' || !!r.approvedAt) && r.statementDateTo >= contra.date
      );
      if (hasFinalizedBankReconciliation) {
        return {
          success: false,
          message: 'এই লেনদেনটি ইতিমধ্যে সম্পন্নকৃত রিকনসিলিয়েশনে (Reconciliation) অন্তর্ভুক্ত রয়েছে। সরাসরি রিভার্স করা যাবে না।'
        };
      }
    }

    if (contra.fromAccountType === 'CASH' || contra.toAccountType === 'CASH') {
      const hasFinalizedCashReconciliation = (db.cashReconciliations || []).some(
        r => (r.status === 'RECONCILED' || r.status === 'MATCHED' || !!r.approvedAt) && r.reconciliationDate >= contra.date
      );
      if (hasFinalizedCashReconciliation) {
        return {
          success: false,
          message: 'এই লেনদেনটি ইতিমধ্যে সম্পন্নকৃত রিকনসিলিয়েশনে (Reconciliation) অন্তর্ভুক্ত রয়েছে। সরাসরি রিভার্স করা যাবে না।'
        };
      }
    }

    // 5. Check if reversal causes negative balances in the reversing source account
    if (contra.type === 'CASH_TO_BANK') {
      // Original: Cash -> Bank (Bank received money)
      // Reversal: Bank -> Cash (Bank must have sufficient money to withdraw)
      if (contra.toAccountId) {
        const destBankBal = this.getBankAccountBalance(db, contra.toAccountId);
        if (destBankBal < contra.amount) {
          return { success: false, message: `রিভার্সাল সম্ভব নয়: গন্তব্য ব্যাংক (${contra.toAccountName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${destBankBal.toLocaleString()}` };
        }
      }
    } else if (contra.type === 'BANK_TO_CASH') {
      // Original: Bank -> Cash (Cash received money)
      // Reversal: Cash -> Bank (Cash must have sufficient balance to return)
      const cashBal = this.getCashBalance(db.cashTransactions);
      if (cashBal < contra.amount) {
        return { success: false, message: `রিভার্সাল সম্ভব নয়: পর্যাপ্ত নগদ টাকা নেই। বর্তমান নগদ স্থিতি: ৳${cashBal.toLocaleString()}` };
      }
    } else if (contra.type === 'BANK_TO_BANK') {
      // Original: Bank A -> Bank B (Bank B received money)
      // Reversal: Bank B -> Bank A (Bank B must have sufficient balance to return to Bank A)
      if (contra.toAccountId) {
        const destBankBal = this.getBankAccountBalance(db, contra.toAccountId);
        if (destBankBal < contra.amount) {
          return { success: false, message: `রিভার্সাল সম্ভব নয়: গন্তব্য ব্যাংক (${contra.toAccountName}) হিসাবে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${destBankBal.toLocaleString()}` };
        }
      }
    }

    // 6. Create Separate Reversal Transaction & Postings
    const activeYear = (db.financialYears || []).find(fy => fy.status === 'ACTIVE');
    const fyCode = activeYear ? activeYear.yearCode : (db.settings?.currentFinancialYear || '2026-2027');

    const reversalTxnId = `CON-REV-${Date.now()}`;
    const revVoucherNo = this.generateVoucherNo(db, 'REV-CON');
    const revJnlVoucherNo = this.generateVoucherNo(db, 'JNL');
    const revJournalEntryId = `JNL-REV-${Date.now()}`;

    let updatedCash = [...(db.cashTransactions || [])];
    let updatedBank = [...(db.bankTransactions || [])];
    let updatedJournals = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];
    let currentCash = this.getCashBalance(db.cashTransactions);
    let currentBankBal = this.getBankBalance(db.bankTransactions);

    let revType: ContraType;
    let revFromAccountType: 'CASH' | 'BANK';
    let revFromAccountId = contra.toAccountId;
    let revFromAccountName = contra.toAccountName;
    let revFromAccountNumber = contra.toAccountNumber;
    let revToAccountType: 'CASH' | 'BANK';
    let revToAccountId = contra.fromAccountId;
    let revToAccountName = contra.fromAccountName;
    let revToAccountNumber = contra.fromAccountNumber;

    if (contra.type === 'CASH_TO_BANK') {
      // Original: Cash -> Bank (Credit Cash, Debit Bank)
      // Reversal: Bank -> Cash (Debit Cash, Credit Bank)
      revType = 'BANK_TO_CASH';
      revFromAccountType = 'BANK';
      revToAccountType = 'CASH';

      // Cash: Deposit (Inflow)
      currentCash += contra.amount;
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-REV`,
        date: today,
        voucherNo: revVoucherNo,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: নগদ পুনঃজমা (মূল ভাউচার: ${contra.voucherNo}) - কারণ: ${params.reason.trim()}`,
        accountId: '1000',
        accountName: 'হাতে নগদ',
        cashIn: contra.amount,
        cashOut: 0,
        balance: currentCash,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdBy: params.reversedBy,
        createdAt: new Date().toISOString()
      });

      // Bank: Withdrawal (Outflow)
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV`,
        bankAccountId: contra.toAccountId,
        date: today,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: ব্যাংক থেকে উত্তোলন (মূল ভাউচার: ${contra.voucherNo}) - কারণ: ${params.reason.trim()}`,
        bankName: contra.toAccountName,
        accountNumberMasked: contra.toAccountNumber || 'XXXX',
        deposit: 0,
        withdrawal: contra.amount,
        balance: currentBankBal - contra.amount,
        transactionNo: revVoucherNo,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdAt: new Date().toISOString()
      });

      // Reversal Journal: Debit Cash, Credit Bank
      updatedJournals.push({
        id: revJournalEntryId,
        journalNo: revJnlVoucherNo,
        date: today,
        reference: revVoucherNo,
        description: `কন্ট্রা রিভার্সাল জার্নাল: মূল ভাউচার ${contra.voucherNo} প্রত্যাহার (কারণ: ${params.reason.trim()})`,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdBy: params.reversedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-R1`,
          journalEntryId: revJournalEntryId,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          debit: contra.amount,
          credit: 0,
          description: `হাতে নগদ ডেবিট (রিভার্সাল)`
        },
        {
          id: `JL-${Date.now()}-R2`,
          journalEntryId: revJournalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${contra.toAccountName})`,
          debit: 0,
          credit: contra.amount,
          description: `ব্যাংক হিসাব ক্রেডিট (রিভার্সাল)`
        }
      );

    } else if (contra.type === 'BANK_TO_CASH') {
      // Original: Bank -> Cash (Credit Bank, Debit Cash)
      // Reversal: Cash -> Bank (Debit Bank, Credit Cash)
      revType = 'CASH_TO_BANK';
      revFromAccountType = 'CASH';
      revToAccountType = 'BANK';

      // Cash: Outflow
      currentCash -= contra.amount;
      updatedCash.push({
        transactionId: `CSH-${Date.now()}-REV`,
        date: today,
        voucherNo: revVoucherNo,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: নগদ প্রত্যাহার (মূল ভাউচার: ${contra.voucherNo}) - কারণ: ${params.reason.trim()}`,
        accountId: '1000',
        accountName: 'হাতে নগদ',
        cashIn: 0,
        cashOut: contra.amount,
        balance: currentCash,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdBy: params.reversedBy,
        createdAt: new Date().toISOString()
      });

      // Bank: Inflow (Deposit)
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV`,
        bankAccountId: contra.fromAccountId,
        date: today,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: ব্যাংক পুনঃজমা (মূল ভাউচার: ${contra.voucherNo}) - কারণ: ${params.reason.trim()}`,
        bankName: contra.fromAccountName,
        accountNumberMasked: contra.fromAccountNumber || 'XXXX',
        deposit: contra.amount,
        withdrawal: 0,
        balance: currentBankBal + contra.amount,
        transactionNo: revVoucherNo,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdAt: new Date().toISOString()
      });

      // Reversal Journal: Debit Bank, Credit Cash
      updatedJournals.push({
        id: revJournalEntryId,
        journalNo: revJnlVoucherNo,
        date: today,
        reference: revVoucherNo,
        description: `কন্ট্রা রিভার্সাল জার্নাল: মূল ভাউচার ${contra.voucherNo} প্রত্যাহার (কারণ: ${params.reason.trim()})`,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdBy: params.reversedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-R1`,
          journalEntryId: revJournalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${contra.fromAccountName})`,
          debit: contra.amount,
          credit: 0,
          description: `ব্যাংক হিসাব ডেবিট (রিভার্সাল)`
        },
        {
          id: `JL-${Date.now()}-R2`,
          journalEntryId: revJournalEntryId,
          accountId: '1000',
          accountName: 'হাতে নগদ',
          debit: 0,
          credit: contra.amount,
          description: `হাতে নগদ ক্রেডিট (রিভার্সাল)`
        }
      );

    } else {
      // Original: Bank A -> Bank B (Credit Bank A, Debit Bank B)
      // Reversal: Bank B -> Bank A (Debit Bank A, Credit Bank B)
      revType = 'BANK_TO_BANK';
      revFromAccountType = 'BANK';
      revToAccountType = 'BANK';

      // Bank B: Withdrawal
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV-DST`,
        bankAccountId: contra.toAccountId,
        date: today,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: ব্যাংক স্থানান্তর প্রত্যাহার -> ${contra.fromAccountName} - কারণ: ${params.reason.trim()}`,
        bankName: contra.toAccountName,
        accountNumberMasked: contra.toAccountNumber || 'XXXX',
        deposit: 0,
        withdrawal: contra.amount,
        balance: currentBankBal - contra.amount,
        transactionNo: revVoucherNo,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdAt: new Date().toISOString()
      });

      // Bank A: Deposit
      updatedBank.push({
        transactionId: `BNK-${Date.now()}-REV-SRC`,
        bankAccountId: contra.fromAccountId,
        date: today,
        reference: `Reversal of ${contra.voucherNo}`,
        description: `কন্ট্রা রিভার্সাল: ব্যাংক স্থানান্তর পুনঃজমা <- ${contra.toAccountName} - কারণ: ${params.reason.trim()}`,
        bankName: contra.fromAccountName,
        accountNumberMasked: contra.fromAccountNumber || 'XXXX',
        deposit: contra.amount,
        withdrawal: 0,
        balance: currentBankBal,
        transactionNo: revVoucherNo,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        createdAt: new Date().toISOString()
      });

      // Reversal Journal: Debit Bank A, Credit Bank B
      updatedJournals.push({
        id: revJournalEntryId,
        journalNo: revJnlVoucherNo,
        date: today,
        reference: revVoucherNo,
        description: `কন্ট্রা রিভার্সাল জার্নাল: মূল ভাউচার ${contra.voucherNo} প্রত্যাহার (${contra.toAccountName} -> ${contra.fromAccountName})`,
        sourceType: 'CONTRA',
        sourceId: reversalTxnId,
        
        createdBy: params.reversedBy,
        createdAt: new Date().toISOString()
      });

      updatedJournalLines.push(
        {
          id: `JL-${Date.now()}-R1`,
          journalEntryId: revJournalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${contra.fromAccountName})`,
          debit: contra.amount,
          credit: 0,
          description: `উৎস ব্যাংক হিসাব ডেবিট (রিভার্সাল)`
        },
        {
          id: `JL-${Date.now()}-R2`,
          journalEntryId: revJournalEntryId,
          accountId: '1010',
          accountName: `ব্যাংক হিসাব (${contra.toAccountName})`,
          debit: 0,
          credit: contra.amount,
          description: `গন্তব্য ব্যাংক হিসাব ক্রেডিট (রিভার্সাল)`
        }
      );
    }

    // 7. Mark original transaction as REVERSED (Do NOT mutate or delete original ledger entries)
    const updatedContra = (db.contraTransactions || []).map(c => {
      if (c.id === params.contraId) {
        return {
          ...c,
          status: 'REVERSED' as any,
          reversedReason: params.reason.trim(),
          reversedAt: new Date().toISOString(),
          reversedBy: params.reversedBy,
          reversalTransactionId: reversalTxnId,
          reversalVoucherNo: revVoucherNo
        };
      }
      return c;
    });

    // 8. Create and append the new separate REVERSAL transaction
    const reversalTxn: ContraTransaction = {
      id: reversalTxnId,
      voucherNo: revVoucherNo,
      date: today,
      type: revType,
      fromAccountType: revFromAccountType,
      fromAccountId: revFromAccountId,
      fromAccountName: revFromAccountName,
      fromAccountNumber: revFromAccountNumber,
      toAccountType: revToAccountType,
      toAccountId: revToAccountId,
      toAccountName: revToAccountName,
      toAccountNumber: revToAccountNumber,
      amount: contra.amount,
      transactionNo: `REV-${contra.transactionNo || contra.voucherNo}`,
      reference: `Reversal of ${contra.voucherNo}`,
      remarks: `সংশোধনী রিভার্সাল (মূল ভাউচার: ${contra.voucherNo}) - কারণ: ${params.reason.trim()}`,
      financialYear: fyCode,
      journalEntryId: revJournalEntryId,
      status: 'REVERSAL',
      originalTransactionId: contra.id,
      reversedTransactionId: contra.id,
      createdBy: params.reversedBy,
      createdAt: new Date().toISOString()
    };

    updatedContra.unshift(reversalTxn);

    // 9. Record Audit Log
    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.reversedBy,
        userName: params.reversedBy,
        dateTime: new Date().toISOString(),
        module: 'CONTRA',
        action: 'CONTRA_REVERSED' as any,
        recordId: contra.id,
        newValue: JSON.stringify({ originalVoucher: contra.voucherNo, reversalVoucher: revVoucherNo, reason: params.reason.trim() }),
        remarks: `কন্ট্রা এন্ট্রি রিভার্সাল সম্পন্ন: মূল ভাউচার ${contra.voucherNo}, রিভার্সাল ভাউচার ${revVoucherNo}, কারণ: ${params.reason.trim()}`
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: `কন্ট্রা ভাউচার ${contra.voucherNo} সফলভাবে প্রত্যাহার করা হয়েছে। রিভার্সাল ভাউচার: ${revVoucherNo}`,
      reversalVoucherNo: revVoucherNo,
      updatedDb: {
        ...db,
        contraTransactions: updatedContra,
        
        cashTransactions: updatedCash,
        bankTransactions: updatedBank,
        journalEntries: updatedJournals,
        journalLines: updatedJournalLines,
        auditLogs: updatedAudit
      }
    };
  }

  // Reverse & Create Correct Contra Entry Workflow
  static reverseAndCorrectContraEntry(
    db: AppDatabaseState,
    params: {
      originalContraId: string;
      reason: string;
      reversedBy: string;
      userRole?: string;
      newEntry: {
        type: ContraType;
        date?: string;
        fromAccountId?: string;
        toAccountId?: string;
        fromBankAccountId?: string;
        toBankAccountId?: string;
        amount: number;
        transactionNo?: string;
        reference?: string;
        remarks?: string;
      };
    }
  ): { success: boolean; message: string; reversalVoucherNo?: string; newVoucherNo?: string; updatedDb?: AppDatabaseState } {
    // 1. First perform reversal of original
    const revResult = this.reverseContraEntry(db, {
      contraId: params.originalContraId,
      reason: params.reason,
      reversedBy: params.reversedBy,
      userRole: params.userRole
    });

    if (!revResult.success || !revResult.updatedDb) {
      return { success: false, message: revResult.message };
    }

    // 2. Post new corrected contra entry on top of updatedDb
    const originalContra = (db.contraTransactions || []).find(c => c.id === params.originalContraId);
    const postResult = this.postContraEntry(revResult.updatedDb, {
      ...params.newEntry,
      createdBy: params.reversedBy,
      reference: `Correction for ${originalContra?.voucherNo || params.originalContraId}`,
      remarks: params.newEntry.remarks ? `${params.newEntry.remarks} (সংশোধিত এন্ট্রি)` : `মূল ভাউচার ${originalContra?.voucherNo} এর সংশোধিত এন্ট্রি`
    });

    if (!postResult.success || !postResult.updatedDb) {
      return { success: false, message: `রিভার্সাল সম্পন্ন হয়েছে কিন্তু নতুন এন্ট্রি করা সম্ভব হয়নি: ${postResult.message}`, reversalVoucherNo: revResult.reversalVoucherNo, updatedDb: revResult.updatedDb };
    }

    // 3. Add CONTRA_CORRECTED audit log
    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.reversedBy,
        userName: params.reversedBy,
        dateTime: new Date().toISOString(),
        module: 'CONTRA',
        action: 'CONTRA_CORRECTED' as any,
        recordId: postResult.contraId || 'CONTRA-CORRECTED',
        newValue: JSON.stringify({ original: originalContra?.voucherNo, reversal: revResult.reversalVoucherNo, newVoucher: postResult.voucherNo }),
        remarks: `কন্ট্রা এন্ট্রি সংশোধন সম্পন্ন: মূল ভাউচার ${originalContra?.voucherNo} -> নতুন ভাউচার ${postResult.voucherNo}`
      },
      ...(postResult.updatedDb.auditLogs || [])
    ];

    return {
      success: true,
      message: `কন্ট্রা এন্ট্রি সংশোধন সফল হয়েছে। রিভার্সাল ভাউচার: ${revResult.reversalVoucherNo}, নতুন ভাউচার: ${postResult.voucherNo}`,
      reversalVoucherNo: revResult.reversalVoucherNo,
      newVoucherNo: postResult.voucherNo,
      updatedDb: {
        ...postResult.updatedDb,
        auditLogs: updatedAudit
      }
    };
  }

  static addBankAccount(
    db: AppDatabaseState,
    params: Partial<BankAccount> & { bankName: string; accountNumber: string },
    createdBy: string
  ): { success: boolean; message: string; bankAccount?: BankAccount; updatedDb?: AppDatabaseState } {
    if (!params.bankName?.trim() || !params.accountNumber?.trim()) {
      return { success: false, message: 'ব্যাংকের নাম এবং হিসাব নম্বর প্রদান করা আবশ্যক।' };
    }

    const cleanAccNo = params.accountNumber.trim();
    const existing = (db.bankAccounts || []).find(b => b.accountNumber.trim() === cleanAccNo);
    if (existing) {
      return { success: false, message: `এই হিসাব নম্বর (${cleanAccNo}) ইতিমধ্যে বিদ্যমান!` };
    }

    const id = `BA-${String((db.bankAccounts || []).length + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
    const newAccount: BankAccount = {
      id,
      bankName: params.bankName.trim(),
      branchName: (params.branchName || '').trim(),
      accountName: (params.accountName || '').trim(),
      accountNumber: cleanAccNo,
      routingNumber: (params.routingNumber || '').trim(),
      accountType: params.accountType || 'CURRENT',
      openingBalance: Number(params.openingBalance || 0),
      openingDate: params.openingDate || new Date().toISOString().split('T')[0],
      financialYearId: params.financialYearId || db.settings.currentFinancialYear,
      status: params.status || 'ACTIVE',
      remarks: params.remarks,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedBankAccounts = [...(db.bankAccounts || []), newAccount];
    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: createdBy,
        userName: createdBy,
        dateTime: new Date().toISOString(),
        module: 'BANK_ACCOUNT',
        action: 'BANK_ACCOUNT_CREATED' as any,
        recordId: id,
        remarks: `নতুন ব্যাংক হিসাব তৈরি: ${newAccount.bankName} (${newAccount.accountNumber})`
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: 'ব্যাংক হিসাব সফলভাবে তৈরি হয়েছে',
      bankAccount: newAccount,
      updatedDb: {
        ...db,
        bankAccounts: updatedBankAccounts,
        auditLogs: updatedAudit
      }
    };
  }

  static updateBankAccount(
    db: AppDatabaseState,
    id: string,
    updates: Partial<BankAccount>,
    updatedBy: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const existing = (db.bankAccounts || []).find(b => b.id === id);
    if (!existing) {
      return { success: false, message: 'ব্যাংক হিসাবটি পাওয়া যায়নি।' };
    }

    // Check for duplicate account number if it's being updated
    if (updates.accountNumber && updates.accountNumber.trim() !== existing.accountNumber) {
      const duplicate = (db.bankAccounts || []).find(b => b.id !== id && b.accountNumber.trim() === updates.accountNumber?.trim());
      if (duplicate) {
        return { success: false, message: `এই হিসাব নম্বর (${updates.accountNumber}) ইতিমধ্যে অন্য হিসাবে বিদ্যমান!` };
      }
    }

    const updatedBankAccounts = (db.bankAccounts || []).map(b => {
      if (b.id === id) {
        return {
          ...b,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });

    let actionType = 'BANK_ACCOUNT_UPDATED';
    if (existing.status === 'ACTIVE' && updates.status === 'INACTIVE') {
      actionType = 'BANK_ACCOUNT_DEACTIVATED';
    } else if (existing.status === 'INACTIVE' && updates.status === 'ACTIVE') {
      actionType = 'BANK_ACCOUNT_ACTIVATED';
    }

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: updatedBy,
        userName: updatedBy,
        dateTime: new Date().toISOString(),
        module: 'BANK_ACCOUNT',
        action: actionType as any,
        recordId: id,
        remarks: `ব্যাংক হিসাব আপডেট: ${existing.bankName} (${updates.accountNumber || existing.accountNumber})`
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: 'ব্যাংক হিসাব সফলভাবে আপডেট হয়েছে',
      updatedDb: {
        ...db,
        bankAccounts: updatedBankAccounts,
        auditLogs: updatedAudit
      }
    };
  }

  static postCashToBankDeposit(
    db: AppDatabaseState,
    params: {
      amount: number;
      bankAccount: string;
      slipNo: string;
      remarks?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    return this.postContraEntry(db, {
      type: 'CASH_TO_BANK',
      date: new Date().toISOString().split('T')[0],
      toAccountId: params.bankAccount,
      amount: params.amount,
      transactionNo: params.slipNo,
      remarks: params.remarks,
      createdBy: 'SYSTEM'
    });
  }

  static getCashBalance(cashTx: CashTransaction[]): number {
    return cashTx.reduce((acc, t) => acc + (t.cashIn || 0) - (t.cashOut || 0), 0);
  }

  static getBankBalance(bankTx: BankTransaction[]): number {
    return bankTx.reduce((acc, t) => acc + (t.deposit || 0) - (t.withdrawal || 0), 0);
  }

  static getMemberRunningBalance(ledgers: MemberLedgerEntry[], memberId: string): number {
    const memberEntries = ledgers.filter(l => l.memberId === memberId);
    return memberEntries.reduce((acc, e) => acc + (e.credit || 0) - (e.debit || 0), 0);
  }

  static getMemberAdmissionFee(db: AppDatabaseState, memberId: string): number {
    if (!db || !memberId) return 0;

    const memberObj = (db.members || []).find(m => m.memberId === memberId || m.membershipNo === memberId);
    const mId = (memberObj?.memberId || memberId).toLowerCase();
    const mNo = (memberObj?.membershipNo || '').toLowerCase();
    const mName = (memberObj?.fullName || '').toLowerCase();

    // 1. Check admissions sub-ledger (canonical primary source)
    const adm = (db.admissions || []).find(
      a => {
        if ((a.status as string) === 'CANCELLED' || (a.status as string) === 'REVERSED') return false;
        const targetMemberId = (a.memberId || '').toLowerCase();
        const isMem = targetMemberId === mId || (mNo && targetMemberId === mNo);
        const aName = ((a as any).memberName || (a as any).applicantName || '').toLowerCase();
        const isName = mName && aName === mName;
        return isMem || isName;
      }
    );
    if (adm && typeof adm.admissionFee === 'number' && adm.admissionFee > 0) {
      return adm.admissionFee;
    }

    // 2. Check incomes (canonical income collection)
    const admIncomes = (db.incomes || []).filter(i => {
      const inc = i as any;
      if (inc.status === 'CANCELLED' || inc.status === 'REVERSED') return false;
      const targetMemberId = (inc.memberId || '').toLowerCase();
      const isMember = targetMemberId === mId || (mNo && targetMemberId === mNo);
      const desc = [inc.description, inc.remarks, inc.incomeHead, inc.reference, inc.memberName].filter(Boolean).join(' ').toLowerCase();
      const isDescMember = desc.includes(mId) || (mNo && desc.includes(mNo)) || (mName && desc.includes(mName));
      const isAdmType = inc.sourceType === 'ADMISSION' || inc.category === 'ADMISSION' || inc.category === 'MEMBERSHIP_FEE';
      const isAdmHead = inc.incomeHead === 'Admission Fee' || inc.incomeHead === 'ভর্তি ফি' || desc.includes('ভর্তি') || desc.includes('admission');
      const isAdmAccount = inc.accountId === '4010' || inc.accountCode === '4010';
      const isRefMatch = adm?.admissionId && (inc.sourceId === adm.admissionId || inc.reference?.includes(adm.admissionId));
      return ((isMember || isDescMember) && (isAdmType || isAdmHead || isAdmAccount)) || isRefMatch;
    });
    if (admIncomes.length > 0) {
      return admIncomes.reduce((sum, i) => sum + (Number((i as any).amount) || 0), 0);
    }

    // 3. Check memberLedgers (if explicitly posted)
    const ledgerAdm = (db.memberLedgers || []).filter(
      l => {
        const targetId = (l.memberId || '').toLowerCase();
        const isMem = targetId === mId || (mNo && targetId === mNo);
        const isAdm = (l.transactionType as string) === 'ADMISSION' || (l.transactionType as string) === 'ADMISSION_FEE' || (l.sourceType as string) === 'ADMISSION';
        return isMem && isAdm;
      }
    );
    if (ledgerAdm.length > 0) {
      return ledgerAdm.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    }

    // 4. Check Cash Transactions / Cash Book with account 4010 (accounting fallback)
    const cashAdm = (db.cashTransactions || []).filter(
      c => {
        if (c.status === 'CANCELLED' || c.status === 'REVERSED') return false;
        const targetId = (c.memberId || '').toLowerCase();
        const isMem = targetId === mId || (mNo && targetId === mNo);
        const desc = [c.description, c.reference].filter(Boolean).join(' ').toLowerCase();
        const isDescMember = desc.includes(mId) || (mNo && desc.includes(mNo)) || (mName && desc.includes(mName));
        const isAdmAccount = c.sourceType === 'ADMISSION' || c.accountId === '4000' || c.accountId === '4010' || (c as any).accountCode === '4000' || (c as any).accountCode === '4010' || desc.includes('ভর্তি') || desc.includes('admission');
        return (isMem || isDescMember) && isAdmAccount;
      }
    );
    if (cashAdm.length > 0) {
      return cashAdm.reduce((sum, c) => sum + (Number(c.cashIn) || 0), 0);
    }

    // 5. Check Journal Entries with Account 4000 or 4010 (Admission Fee Income)
    const matchingJournals = (db.journalEntries || []).filter(j => {
      if ((j.status as string) === 'CANCELLED' || j.status === 'REVERSED') return false;
      const desc = [j.description, j.reference].filter(Boolean).join(' ').toLowerCase();
      const isMemberMatch = desc.includes(mId) || (mNo && desc.includes(mNo)) || (mName && desc.includes(mName));
      const isAdmMatch = j.sourceType === 'ADMISSION' || desc.includes('ভর্তি') || desc.includes('admission');
      return isMemberMatch && isAdmMatch;
    });
    if (matchingJournals.length > 0) {
      const jIds = new Set(matchingJournals.map(j => j.id));
      const jLines = (db.journalLines || []).filter(
        l => jIds.has(l.journalEntryId) && (l.accountId === '4000' || l.accountId === '4010' || (l as any).accountCode === '4000' || (l as any).accountCode === '4010') && (Number(l.credit) || 0) > 0
      );
      if (jLines.length > 0) {
        return jLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
      }
    }

    return 0;
  }

  static getComprehensiveMemberLedger(
    db: AppDatabaseState,
    memberId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      transactionType?: string;
      status?: string;
    }
  ) {
    const member = (db.members || []).find(m => m.memberId === memberId || m.membershipNo === memberId || (m as any).id === memberId);
    if (!member) return null;

    const targetMemberId = member.memberId;
    const targetMembershipNo = member.membershipNo;
    const isMemberMatch = (mId?: string) => {
      if (!mId) return false;
      return mId === targetMemberId || mId === memberId || (!!targetMembershipNo && mId === targetMembershipNo);
    };

    const rawItems: {
      id: string;
      date: string;
      voucherNo: string;
      receiptNo?: string;
      transactionType: string;
      particulars: string;
      debit: number;
      credit: number;
      reference?: string;
      status: string;
      sourceType?: string;
      sourceId?: string;
      accountCode?: string;
      accountName?: string;
      createdAt?: string;
    }[] = [];
    let hasAddedAdmission = false;

    const processedVouchers = new Set<string>();

    // 2. Harmonize Admission from db.admissions & db.incomes if not in member ledger
    (db.admissions || []).filter(a => isMemberMatch(a.memberId) && (a.status as string) !== 'CANCELLED' && (a.status as string) !== 'REVERSED' && (a.admissionFee || 0) > 0).forEach(a => {
      const adm = a as any;
      const matchingJournal = (db.journalEntries || []).find(j => 
        j.sourceId === adm.admissionId || 
        j.sourceId === adm.incomeId ||
        (j.sourceType === 'INCOME' && j.reference && adm.voucherNo && j.reference === adm.voucherNo) ||
        (j.reference?.startsWith('VCH-') && (j.description?.includes(targetMemberId) || (member?.fullName && j.description?.includes(member.fullName))) && j.description?.toLowerCase().includes('ভর্তি'))
      );

      const matchingCash = (db.cashTransactions || []).find(c => 
        c.sourceId === adm.admissionId ||
        c.sourceId === adm.incomeId ||
        (isMemberMatch(c.memberId) && (c.accountId === '4000' || c.accountId === '4010' || (c as any).accountCode === '4000' || (c as any).accountCode === '4010' || c.sourceType === 'ADMISSION')) ||
        (c.voucherNo && adm.voucherNo && c.voucherNo === adm.voucherNo)
      );

      const vNo = adm.voucherNo || matchingJournal?.reference || matchingCash?.voucherNo || adm.transactionNo || 'VCH-2026-000001';
      const rNo = adm.receiptNo || matchingCash?.voucherNo || matchingJournal?.reference || adm.transactionNo || vNo;

      if (!processedVouchers.has(vNo) && !processedVouchers.has(rNo) && !processedVouchers.has(adm.admissionId)) {
        const admDate = adm.date || member?.joiningDate || adm.approvalDate || adm.applicationDate || '2026-06-01';
        rawItems.push({
          id: adm.admissionId || `ADM-${targetMemberId}`,
          date: admDate,
          voucherNo: vNo,
          receiptNo: rNo,
          transactionType: 'ADMISSION_FEE',
          particulars: adm.remarks || 'Member Admission Fee / সদস্য ভর্তি ফি',
          debit: 0,
          credit: Number(adm.admissionFee) || 0,
          reference: vNo,
          status: adm.status || 'APPROVED',
          sourceType: 'ADMISSION',
          sourceId: adm.admissionId,
          accountCode: ACCOUNT_CODES.ADMISSION_FEE,
          accountName: 'ভর্তি ফি আয়',
          createdAt: adm.createdAt
        });
        processedVouchers.add(vNo);
        if (rNo) processedVouchers.add(rNo);
        if (adm.admissionId) processedVouchers.add(adm.admissionId);
      }
    });

    (db.incomes || []).filter(i => {
      const inc = i as any;
      if (!inc) return false;
      const desc = [inc?.description, inc?.incomeHead, inc?.remarks, inc?.reference]
        .filter(val => val !== undefined && val !== null)
        .map(val => String(val))
        .join(' ')
        .toLowerCase();
        
      const isMemMatch = isMemberMatch(inc.memberId);
      const isAdmCategory = inc.category === 'ADMISSION' || inc.category === 'MEMBERSHIP_FEE' || inc.sourceType === 'ADMISSION' || desc.includes('admission') || desc.includes('ভর্তি');
      return isMemMatch && isAdmCategory;
    }).forEach(i => {
      const inc = i as any;
      if (inc.voucherNo && processedVouchers.has(inc.voucherNo)) return;
      if (inc.incomeId && processedVouchers.has(inc.incomeId)) return;
      rawItems.push({
        id: inc.incomeId,
        date: inc.date || member?.joiningDate || '2026-06-01',
        voucherNo: inc.voucherNo,
        receiptNo: inc.receiptNo || inc.reference,
        transactionType: 'ADMISSION_FEE',
        particulars: inc.description || inc.incomeHead || 'Member Admission Fee / সদস্য ভর্তি ফি',
        debit: 0,
        credit: inc.amount,
        reference: inc.voucherNo || inc.reference,
        status: inc.status || 'POSTED',
        sourceType: 'INCOME',
        sourceId: inc.incomeId,
        accountCode: inc.accountId || '4010',
        accountName: 'ভর্তি ফি আয়',
        createdAt: inc.createdAt
      });
      if (inc.voucherNo) processedVouchers.add(inc.voucherNo);
      if (inc.incomeId) processedVouchers.add(inc.incomeId);
    });

    // 3. Harmonize Capital Deposits if not in member ledger
    (db.capitalDeposits || []).filter(c => isMemberMatch(c.memberId) && c.status !== 'REVERSED' && c.status !== 'CANCELLED').forEach(c => {
      const cap = c as any;
      if (cap.depositId && processedVouchers.has(cap.depositId)) return;

      const isInitialAdmissionDeposit = (cap.remarks?.includes('ভর্তিকালীন') || cap.remarks?.includes('প্রাথমিক') || cap.transactionNo?.startsWith('ADM-'));
      const capDate = isInitialAdmissionDeposit && member?.joiningDate
        ? member.joiningDate
        : (cap.date || member?.joiningDate || '2026-06-01');

      rawItems.push({
        id: cap.depositId,
        date: capDate,
        voucherNo: cap.voucherNo,
        receiptNo: cap.receiptNo || cap.transactionNo,
        transactionType: 'CAPITAL_DEPOSIT',
        particulars: cap.remarks || 'Capital Deposit / সদস্য শেয়ার মূলধন',
        debit: 0,
        credit: cap.amount,
        reference: cap.voucherNo,
        status: cap.status || 'ACTIVE',
        sourceType: 'CAPITAL',
        sourceId: cap.depositId,
        accountCode: '3000',
        accountName: 'সদস্যদের মূলধন তহবিল',
        createdAt: cap.createdAt
      });
      if (cap.voucherNo) processedVouchers.add(cap.voucherNo);
      if (cap.depositId) processedVouchers.add(cap.depositId);
    });

    // 4. Harmonize Monthly Collections if not in member ledger
    (db.collections || []).filter(c => isMemberMatch(c.memberId) && c.status !== 'REVERSED' && c.status !== 'CANCELLED').forEach(c => {
      const col = c as any;
      const vNo = col.voucherNo || col.receiptNo;
      if (col.collectionId && processedVouchers.has(col.collectionId)) return;
      
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
          particulars: `${col.collectionMonth ? col.collectionMonth + ' ' : ''}Monthly Subscription / মাসিক চাঁদা`,
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
          particulars: `${col.collectionMonth ? col.collectionMonth + ' ' : ''}Late Fine / বিলম্ব ফি`,
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

      if (col.collectionId) processedVouchers.add(col.collectionId);
    });

    // 5. Harmonize Loans & Repayments
    (db.loans || []).filter(l => isMemberMatch(l.memberId) && (l.status === 'ACTIVE' || l.status === 'COMPLETED')).forEach(l => {
      const loan = l as any;
      const vNo = loan.voucherNo || loan.disbursementVoucherNo || loan.loanId;
      if (!processedVouchers.has(vNo) && !processedVouchers.has(loan.loanId)) {
        rawItems.push({
          id: loan.loanId,
          date: loan.disbursementDate || loan.applicationDate,
          voucherNo: vNo,
          transactionType: 'LOAN_DISBURSED',
          particulars: `Loan Disbursed (${loan.purpose || loan.loanType || 'General'}) / ঋণ বিতরণ`,
          debit: loan.approvedAmount ?? loan.appliedAmount ?? loan.requestedAmount ?? 0,
          credit: 0,
          reference: loan.loanId,
    
          sourceType: 'LOAN',
          sourceId: loan.loanId,
          status: "ACTIVE"
        });
        processedVouchers.add(vNo);
        processedVouchers.add(loan.loanId);
      }
    });

    (db.loanRepayments || []).filter(r => isMemberMatch(r.memberId) && r.status !== 'REVERSED' && r.status !== 'CANCELLED').forEach(r => {
      const rep = r as any;
      const vNo = rep.voucherNo || rep.repaymentId;
      if (!processedVouchers.has(vNo) && !processedVouchers.has(rep.repaymentId)) {
        rawItems.push({
          id: rep.repaymentId,
          date: rep.date || rep.paymentDate,
          voucherNo: vNo,
          receiptNo: rep.receiptNo || rep.voucherNo,
          transactionType: 'LOAN_REPAYMENT',
          particulars: `Loan Installment Repayment / ঋণ কিস্তি আদায়`,
          debit: 0,
          credit: (rep.principalAmount || 0) + (rep.profitOrCharge || rep.interestAmount || 0),
          reference: rep.receiptNo || rep.voucherNo,
    
          sourceType: 'LOAN_REPAYMENT',
          sourceId: rep.repaymentId,
          status: "ACTIVE"
        });
        processedVouchers.add(vNo);
        processedVouchers.add(rep.repaymentId);
      }
    });

    // 6. Harmonize Settlements
    (db.memberExits || []).filter(e => isMemberMatch(e.memberId) && ['APPROVED', 'COMPLETED', 'SETTLED', 'REFUNDED'].includes(e.status)).forEach(e => {
      const ext = e as any;
      const vNo = ext.voucherNo || ext.refundVoucherNo || ext.exitRequestId || ext.exitId;
      const idKey = ext.exitRequestId || ext.exitId;
      if (!processedVouchers.has(vNo) && !processedVouchers.has(idKey)) {
        rawItems.push({
          id: idKey,
          date: ext.refundProcessDate || ext.settlementDate || ext.requestDate,
          voucherNo: vNo,
          transactionType: ext.exitType === 'NORMAL' ? 'NORMAL_EXIT' : ext.exitType === 'EARLY' ? 'EARLY_EXIT' : 'DEATH_SETTLEMENT',
          particulars: `Member Settlement Payout / সদস্য প্রস্থান ও হিসাব নিষ্পত্তি`,
          debit: ext.netSettlementAmount || ext.netRefundAmount || ext.totalRefundAmount || ext.payoutAmount || 0,
          credit: 0,
          reference: idKey,
    
          sourceType: 'SETTLEMENT',
          sourceId: idKey,
          status: "ACTIVE"
        });
        processedVouchers.add(vNo);
        processedVouchers.add(idKey);
      }
    });

    // 7. Harmonize Late Fee Waivers (Informative Line Items in Ledger)
    (db.lateFeeWaivers || []).filter(w => isMemberMatch(w.memberId) && w.status !== 'REVERSED' && w.status !== 'CANCELLED').forEach(w => {
      const vNo = `WVR-${w.receiptNo || w.collectionId || w.waiverId}`;
      if (!processedVouchers.has(vNo) && !processedVouchers.has(w.waiverId)) {
        rawItems.push({
          id: w.waiverId,
          date: w.waiverDate || '2026-08-01',
          voucherNo: w.receiptNo || w.waiverId,
          receiptNo: w.receiptNo,
          transactionType: 'LATE_FEE_WAIVER',
          particulars: `${w.collectionMonth ? w.collectionMonth + ' ' : ''}Late Fee Waived / বিলম্ব ফি মওকুফ (${w.reason || 'অনুমোদিত'})`,
          debit: 0,
          credit: 0, // Non-cash record: 0 monetary impact on cumulative cash balance
          reference: w.receiptNo || w.waiverId,
          status: 'ACTIVE',
          sourceType: 'WAIVER',
          sourceId: w.waiverId,
          accountCode: 'WAIVER',
          accountName: 'বিলম্ব ফি মওকুফ',
          createdAt: w.createdAt
        });
        processedVouchers.add(vNo);
        processedVouchers.add(w.waiverId);
      }
    });

    
    // 8. Explicit member ledger records (Fallback for legacy/manual entries)
    (db.memberLedgers || []).filter(l => isMemberMatch(l.memberId)).forEach(l => {
      // Skip if this ledger entry's source or voucher was already processed from primary tables
      if ((l.voucherNo && processedVouchers.has(l.voucherNo)) || 
          (l.receiptNo && processedVouchers.has(l.receiptNo)) || 
          (l.sourceId && processedVouchers.has(l.sourceId)) || 
          (l.ledgerId && processedVouchers.has(l.ledgerId))) {
          return;
      }

      let tType = l.transactionType as string;
      if (tType === 'ADMISSION') tType = 'ADMISSION_FEE';
      if (tType === 'LATE_FINE') tType = 'LATE_FEE';
      if (tType === 'PROFIT_SHARE') tType = 'PROFIT_DISTRIBUTION';
      if (tType === 'WELFARE_GRANT') tType = 'BENEFIT';
      if (tType === 'MEMBER_EXIT') tType = 'SETTLEMENT_PAYMENT';
      if (tType === 'REVERSAL') tType = 'ADJUSTMENT';

      rawItems.push({
        id: l.ledgerId || `ML-${l.voucherNo || Math.random()}`,
        date: l.date,
        voucherNo: l.voucherNo,
        receiptNo: l.receiptNo,
        transactionType: tType,
        particulars: (l as any).particulars || l.description || '', // Fix for particulars falling back to description
        debit: l.debit || 0,
        credit: l.credit || 0,
        reference: l.reference || l.voucherNo,
  
        sourceType: l.sourceType,
        sourceId: l.sourceId,
        status: (l as any).status || "ACTIVE",
        createdAt: l.createdAt
      });

      if (l.voucherNo) processedVouchers.add(l.voucherNo);
      if (l.receiptNo) processedVouchers.add(l.receiptNo);
      if (l.sourceId) processedVouchers.add(l.sourceId);
      if (l.ledgerId) processedVouchers.add(l.ledgerId);
    });


    // Deduplicate admission fees (a member can only have one admission fee)
    const admissionItems = rawItems.filter(i => i.transactionType === 'ADMISSION_FEE');
    if (admissionItems.length > 1) {
        // Keep the one from db.incomes if it exists, or just the first one
        const incomeAdm = admissionItems.find(i => i.id.startsWith('INC-'));
        const admToKeep = incomeAdm || admissionItems[0];
        
        // Remove all admission fees
        for (let i = rawItems.length - 1; i >= 0; i--) {
            if (rawItems[i].transactionType === 'ADMISSION_FEE' && rawItems[i].id !== admToKeep.id) {
                rawItems.splice(i, 1);
            }
        }
    }
// Sort chronologically
    rawItems.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      const typeOrder = (t: string) => {
        if (t === 'ADMISSION_FEE') return 1;
        if (t === 'CAPITAL_DEPOSIT') return 2;
        return 3;
      };
      if (typeOrder(a.transactionType) !== typeOrder(b.transactionType)) {
        return typeOrder(a.transactionType) - typeOrder(b.transactionType);
      }
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

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
      if (item.transactionType !== 'ADMISSION_FEE' && item.transactionType !== 'LATE_FEE' && item.transactionType !== 'LATE_FINE' && item.transactionType !== 'LATE_FEE_WAIVER') {
        runningBalance += (item.credit - item.debit);
      }
      return {
        ...item,
        balance: runningBalance
      };
    });

    // Apply filtering for UI display
    let filteredItems = itemsWithBalance;
    if (filters?.dateFrom) {
      filteredItems = filteredItems.filter(i => i.date >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      filteredItems = filteredItems.filter(i => i.date <= filters.dateTo!);
    }
    if (filters?.transactionType && filters.transactionType !== 'ALL') {
      filteredItems = filteredItems.filter(i => i.transactionType === filters.transactionType);
    }
    if (filters?.status && filters.status !== 'ALL') {
      filteredItems = filteredItems.filter(i => i.status === filters.status);
    }

    const totalDebit = filteredItems.reduce((sum, i) => sum + i.debit, 0);
    const totalCredit = filteredItems.reduce((sum, i) => sum + i.credit, 0);

    const dueInfo = this.calculateMemberDue(
      member,
      db.collections || [],
      db.settings?.monthlyContribution || 1000,
      db.settings?.lateFine || 0,
      db.settings?.latePaymentDay || 10
    );

    return {
      dueInfo,
      totalDueAmount: dueInfo.totalContributionDue,
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
  }

  // Comprehensive Financial Summary Calculation
  static calculateFinancialSummary(db: AppDatabaseState) {
    const totalMembers = (db.members || []).length;
    const activeMembers = (db.members || []).filter(m => m.status === 'ACTIVE').length;
    const inactiveMembers = totalMembers - activeMembers;

    const totalCollection = (db.collections || []).filter(c => c?.status === 'ACTIVE' || c?.status === 'POSTED' || !c?.status)
      .reduce((sum, c) => sum + (c?.paidAmount || 0), 0);

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCollection = (db.collections || []).filter(c => (c?.status === 'ACTIVE' || c?.status === 'POSTED' || !c?.status) && c?.collectionMonth === currentMonthStr)
      .reduce((sum, c) => sum + (c?.paidAmount || 0), 0);

    const totalCapital = (db.capitalDeposits || []).filter(c => c.status === 'ACTIVE' || c.status === 'POSTED' || !c.status)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalIncome = (db.incomes || []).filter(i => i.status === 'POSTED')
      .reduce((sum, i) => sum + i.amount, 0);

    const totalExpense = (db.expenses || []).filter(e => e.approvalStatus === 'PAID')
      .reduce((sum, e) => sum + e.amount, 0);

    const cashBalance = this.getCashBalance(db.cashTransactions);
    const bankBalance = this.getBankBalance(db.bankTransactions);

    const totalLoanDisbursed = (db.loans || []).filter(l => l.status === 'ACTIVE' || l.status === 'COMPLETED')
      .reduce((sum, l) => sum + (l.approvedAmount ?? l.appliedAmount ?? l.requestedAmount ?? 0), 0);

    const totalLoanRepaid = (db.loanRepayments || []).filter(r => r.status === 'ACTIVE')
      .reduce((sum, r) => sum + r.principalAmount, 0);

    const outstandingLoan = (db.loans || []).filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);

    const totalInvestment = (db.investments || []).filter(i => {
      const status = getInvestmentStatus(i);
      return status === 'ACTIVE' || status === 'PARTIAL_RETURN' || status === 'COMPLETED';
    }).reduce((sum, i) => sum + (i.originalPrincipal ?? i.investmentAmount ?? 0), 0);

    const outstandingInvestment = (db.investments || []).filter(i => {
      const status = getInvestmentStatus(i);
      return status === 'ACTIVE' || status === 'PARTIAL_RETURN';
    }).reduce((sum, i) => sum + calculateInvestmentOutstanding(i), 0);

    const investmentProfit = (db.investments || []).filter(i => i.profit > 0)
      .reduce((sum, i) => sum + i.profit, 0);

    const welfareFundBalance = (db.welfareTransactions || [])
      .filter(w => w.fundType === 'WELFARE' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED')
      .reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);

    const emergencyFundBalance = (db.welfareTransactions || [])
      .filter(w => w.fundType === 'EMERGENCY' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED')
      .reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);

    const reserveFundBalance = (db.welfareTransactions || [])
      .filter(w => w.fundType === 'RESERVE' && w.approvalStatus !== 'REVERSED' && w.status !== 'REVERSED')
      .reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);

    // Calculate members with due & total due
    let outstandingDue = 0;
    let membersWithDueCount = 0;
    let membersWith6PlusDueCount = 0;

    (db.members || []).forEach(m => {
      const dueInfo = this.calculateMemberDue(
        m,
        db.collections,
        db.settings.monthlyContribution,
        db.settings.lateFine,
        db.settings.latePaymentDay
      );
      if (dueInfo.totalDueAmount > 0) {
        outstandingDue += dueInfo.totalDueAmount;
        membersWithDueCount++;
        if (dueInfo.monthsDueCount >= 6) {
          membersWith6PlusDueCount++;
        }
      }
    });

    const netProfit = Math.max(0, totalIncome - totalExpense);
    const existingFinalized = (db.historicalProfits || []).find(hp => hp.financialYear === db.settings.currentFinancialYear);
    const distributableProfit = existingFinalized 
      ? (existingFinalized.memberDistributionAmount !== undefined ? existingFinalized.memberDistributionAmount : (existingFinalized.memberAmount || 0))
      : (netProfit * db.settings.profitMemberPercent) / 100;

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      thisMonthCollection,
      totalCollection,
      totalCapital,
      totalIncome,
      totalExpense,
      cashBalance,
      bankBalance,
      outstandingDue,
      membersWithDueCount,
      membersWith6PlusDueCount,
      outstandingLoan,
      totalInvestment,
      investmentProfit,
      welfareFundBalance,
      emergencyFundBalance,
      reserveFundBalance,
      currentYearProfit: netProfit,
      netProfit,
      cashInHand: cashBalance,
      outstandingLoans: outstandingLoan,
      totalInvestments: totalInvestment,
      totalAssets: cashBalance + bankBalance + outstandingLoan + totalInvestment,
      totalCollections: totalCollection,
      distributableProfit
    };
  }

  // Validate Journal Integrity across all financial modules
  static validateJournalIntegrity(db: AppDatabaseState): JournalIntegrityValidationResult {
    return validateJournalIntegrity(db);
  }

  // Verify whether debits and credits balance to zero for a specific voucher range
  static verifyVoucherRangeBalance(
    dbOrEntries: AppDatabaseState | JournalEntry[],
    linesOrFilter?: JournalEntryLine[] | VoucherRangeFilter,
    explicitFilter?: VoucherRangeFilter
  ): VoucherRangeValidationResult {
    return verifyVoucherRangeBalance(dbOrEntries, linesOrFilter, explicitFilter);
  }

  // Validate Cash Book movements match Sub-ledger transactions for a user-specified date range
  static validateCashMovementsReconciliation(
    db: AppDatabaseState,
    dateRange?: { startDate?: string; endDate?: string; tolerance?: number }
  ): CashMovementReconciliationResult {
    return validateCashMovementsReconciliation(db, dateRange);
  }

  // Run full system diagnostic audit generating comprehensive integrity report
  static runComprehensiveDiagnosticAudit(
    db: AppDatabaseState,
    options?: {
      startDate?: string;
      endDate?: string;
      auditedBy?: string;
      voucherPrefix?: string;
      sourceType?: string;
    }
  ): ComprehensiveIntegrityReport {
    return runComprehensiveDiagnosticAudit(db, options);
  }

  static saveCashTransactionDraft(
    db: AppDatabaseState,
    params: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
      enteredByUserId?: string;
      enteredByUserName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const txId = `CASH-DRAFT-${Date.now()}`;
    const newDraft: CashTransaction = {
      transactionId: txId,
      date: params.date,
      voucherNo: params.voucherNo || `DRAFT-VCH-${Date.now().toString().slice(-6)}`,
      reference: params.reference,
      description: params.description,
      cashIn: params.type === 'IN' ? params.amount : 0,
      cashOut: params.type === 'OUT' ? params.amount : 0,
      status: 'DRAFT' as any,
      enteredByUserId: params.enteredByUserId,
      enteredByUserName: params.enteredByUserName,
      enteredAt: new Date().toISOString(),
      sourceType: 'MANUAL',
      sourceId: txId,
      createdAt: new Date().toISOString()
    };

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.enteredByUserId || 'system',
        userName: params.enteredByUserName || 'System',
        dateTime: new Date().toISOString(),
        module: 'CASH',
        action: 'CASH_TRANSACTION_DRAFT_CREATED' as any,
        recordId: txId,
        newValue: JSON.stringify(newDraft),
        remarks: 'Cash transaction draft created'
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: 'Draft saved successfully.',
      updatedDb: {
        ...db,
        cashTransactions: [newDraft, ...(db.cashTransactions || [])],
        auditLogs: updatedAudit
      }
    };
  }

  static editDraftCashTransaction(
    db: AppDatabaseState,
    transactionId: string,
    params: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
      updatedByUserId?: string;
      updatedByUserName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const draftIndex = (db.cashTransactions || []).findIndex(t => t.transactionId === transactionId && t.status === 'DRAFT');
    if (draftIndex === -1) return { success: false, message: 'Draft not found.' };

    const updatedDraft = {
      ...db.cashTransactions[draftIndex],
      date: params.date,
      description: params.description,
      reference: params.reference,
      voucherNo: params.voucherNo || db.cashTransactions[draftIndex].voucherNo,
      cashIn: params.type === 'IN' ? params.amount : 0,
      cashOut: params.type === 'OUT' ? params.amount : 0,
      enteredByUserId: params.updatedByUserId || db.cashTransactions[draftIndex].enteredByUserId,
      enteredByUserName: params.updatedByUserName || db.cashTransactions[draftIndex].enteredByUserName,
      enteredAt: new Date().toISOString()
    };

    const updatedCash = [...(db.cashTransactions || [])];
    updatedCash[draftIndex] = updatedDraft;

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.updatedByUserId || 'system',
        userName: params.updatedByUserName || 'System',
        dateTime: new Date().toISOString(),
        module: 'CASH',
        action: 'CASH_TRANSACTION_DRAFT_UPDATED' as any,
        recordId: transactionId,
        newValue: JSON.stringify(updatedDraft),
        remarks: 'Cash transaction draft updated'
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: 'Draft updated successfully.',
      updatedDb: {
        ...db,
        cashTransactions: updatedCash,
        auditLogs: updatedAudit
      }
    };
  }

  static deleteDraftCashTransaction(
    db: AppDatabaseState,
    transactionId: string,
    params: {
      deletedByUserId?: string;
      deletedByUserName?: string;
      reason?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const draft = (db.cashTransactions || []).find(t => t.transactionId === transactionId);
    if (!draft || draft.status !== 'DRAFT') {
      return { success: false, message: 'Draft not found or cannot be deleted.' };
    }

    const updatedCash = (db.cashTransactions || []).filter(t => t.transactionId !== transactionId);

    const updatedAudit = [
      {
        auditId: `AUD-${Date.now()}`,
        userId: params.deletedByUserId || 'system',
        userName: params.deletedByUserName || 'System',
        dateTime: new Date().toISOString(),
        module: 'CASH',
        action: 'CASH_TRANSACTION_DRAFT_DELETED' as any,
        recordId: transactionId,
        newValue: JSON.stringify(draft),
        remarks: params.reason || 'Cash transaction draft deleted'
      },
      ...(db.auditLogs || [])
    ];

    return {
      success: true,
      message: 'Draft deleted successfully.',
      updatedDb: {
        ...db,
        cashTransactions: updatedCash,
        auditLogs: updatedAudit
      }
    };
  }

  static postDraftCashTransaction(
    db: AppDatabaseState,
    transactionId: string,
    params?: {
      postedByUserId?: string;
      postedByUserName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const draftIndex = (db.cashTransactions || []).findIndex(t => t.transactionId === transactionId && t.status === 'DRAFT');
    if (draftIndex === -1) return { success: false, message: 'Draft not found.' };
    const draft = db.cashTransactions[draftIndex];

    const postPayload = {
      type: draft.cashIn > 0 ? 'IN' as const : 'OUT' as const,
      amount: draft.cashIn > 0 ? draft.cashIn : draft.cashOut,
      date: draft.date,
      description: draft.description,
      reference: draft.reference,
      voucherNo: draft.voucherNo,
      postedByUserId: params?.postedByUserId || draft.enteredByUserId,
      postedByUserName: params?.postedByUserName || draft.enteredByUserName
    };

    const dbWithoutDraft = {
      ...db,
      cashTransactions: (db.cashTransactions || []).filter(t => t.transactionId !== transactionId)
    };

    return this.postCashTransaction(dbWithoutDraft, postPayload);
  }

  static postCashTransaction(
    db: AppDatabaseState,
    params: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
      sourceType?: string;
      sourceId?: string;
      accountId?: string;
      accountName?: string;
      contraAccountId?: string;
      contraAccountName?: string;
      postedByUserId?: string;
      postedByUserName?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const dateStr = params.date || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(dateStr, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে নগদ লেনদেন পোস্ট করা সম্ভব নয়।' };
    }

    const amount = Number(params.amount);
    const voucherNo = params.voucherNo || `CASH-${Date.now().toString().slice(-6)}`;
    const txId = params.sourceId && params.sourceType !== 'MANUAL' ? `CSH-${Date.now()}` : `CASH-${Date.now()}`;
    const sType = params.sourceType || 'MANUAL';
    const sId = params.sourceId || txId;
    
    const cashAccountId = params.contraAccountId || "1000";
    const cashAccountName = params.contraAccountName || "হাতে নগদ";
    const defaultOffset = params.type === 'IN' ? '4050' : '5000';
    const defaultOffsetName = params.type === 'IN' ? 'অন্যান্য আয়' : 'দাপ্তরিক ও অন্যান্য ব্যয়';
    const offsetAccountId = params.accountId || defaultOffset;
    const offsetAccountName = params.accountName || defaultOffsetName;
    
    const debitAccount = params.type === 'IN' ? { id: cashAccountId, name: cashAccountName } : { id: offsetAccountId, name: offsetAccountName };
    const creditAccount = params.type === 'IN' ? { id: offsetAccountId, name: offsetAccountName } : { id: cashAccountId, name: cashAccountName };

    const journalRes = this.postJournalEntry(db, {
      date: params.date,
      description: params.description,
      reference: voucherNo,
      status: 'ACTIVE',
      journalNo: voucherNo, // using voucher as journal no
      sourceType: sType as any,
      sourceId: sId,
      createdBy: params.postedByUserName || 'System'
    }, [
      { accountId: debitAccount.id, accountName: debitAccount.name, debit: amount, credit: 0, description: params.description },
      { accountId: creditAccount.id, accountName: creditAccount.name, debit: 0, credit: amount, description: params.description }
    ]);

    if (!journalRes.success) {
      return { success: false, message: `Journal entry failed: ${journalRes.message}` };
    }
    
    let updatedJournalEntries = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];
    if (journalRes.entry && journalRes.lines) {
      updatedJournalEntries.push(journalRes.entry);
      updatedJournalLines.push(...journalRes.lines);
    }

    const currentCash = this.getCashBalance(db.cashTransactions);
    const newCashBalance = params.type === 'IN' ? currentCash + amount : currentCash - amount;

    const newTx: CashTransaction = {
      transactionId: txId,
      date: params.date,
      voucherNo: voucherNo,
      reference: params.reference,
      description: params.description,
      accountId: offsetAccountId,
      accountName: offsetAccountName,
      cashIn: params.type === 'IN' ? amount : 0,
      cashOut: params.type === 'OUT' ? amount : 0,
      balance: newCashBalance,
      status: 'POSTED' as any,
      postedByUserId: params.postedByUserId,
      postedByUserName: params.postedByUserName,
      postedAt: new Date().toISOString(),
      sourceType: sType as any,
      sourceId: sId,
      createdBy: params.postedByUserName || 'System',
      createdAt: new Date().toISOString()
    };

    const updatedCash = [...(db.cashTransactions || []), newTx];
    
    const auditRes = {
      auditId: `AUD-${Date.now()}`,
      userId: params.postedByUserId || 'system',
      userName: params.postedByUserName || 'System',
      dateTime: new Date().toISOString(),
      module: 'CASH',
      action: 'CASH_TRANSACTION_POSTED' as any,
      recordId: txId,
      newValue: JSON.stringify(newTx),
      remarks: `Cash transaction posted. Voucher: ${voucherNo}`
    };

    return {
      success: true,
      message: 'Transaction posted successfully.',
      updatedDb: {
        ...db,
        cashTransactions: updatedCash,
        journalEntries: updatedJournalEntries,
        journalLines: updatedJournalLines,
        auditLogs: [auditRes, ...(db.auditLogs || [])]
      }
    };
  }

  static postBankTransaction(
    db: AppDatabaseState,
    params: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
      sourceType?: string;
      sourceId?: string;
      accountId?: string;
      accountName?: string;
      contraAccountId?: string;
      contraAccountName?: string;
      postedByUserId?: string;
      postedByUserName?: string;
      bankAccountId?: string;
    }
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const dateStr = params.date || new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(dateStr, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরে ব্যাংক লেনদেন পোস্ট করা সম্ভব নয়।' };
    }

    const amount = Number(params.amount);
    const voucherNo = params.voucherNo || `BANK-${Date.now().toString().slice(-6)}`;
    const txId = params.sourceId && params.sourceType !== 'MANUAL' ? `BNK-${Date.now()}` : `BANK-${Date.now()}`;
    const sType = params.sourceType || 'MANUAL';
    const sId = params.sourceId || txId;
    
    const bankAccountId = params.contraAccountId || "1010";
    const bankAccountName = params.contraAccountName || "ব্যাংক হিসাব";
    const defaultOffset = params.type === 'IN' ? '4050' : '5000';
    const defaultOffsetName = params.type === 'IN' ? 'অন্যান্য আয়' : 'দাপ্তরিক ও অন্যান্য ব্যয়';
    const offsetAccountId = params.accountId || defaultOffset;
    const offsetAccountName = params.accountName || defaultOffsetName;
    
    const debitAccount = params.type === 'IN' ? { id: bankAccountId, name: bankAccountName } : { id: offsetAccountId, name: offsetAccountName };
    const creditAccount = params.type === 'IN' ? { id: offsetAccountId, name: offsetAccountName } : { id: bankAccountId, name: bankAccountName };

    const journalRes = this.postJournalEntry(db, {
      date: params.date,
      description: params.description,
      reference: voucherNo,
      status: 'ACTIVE',
      journalNo: voucherNo, 
      sourceType: sType as any,
      sourceId: sId,
      createdBy: params.postedByUserName || 'System'
    }, [
      { accountId: debitAccount.id, accountName: debitAccount.name, debit: amount, credit: 0, description: params.description },
      { accountId: creditAccount.id, accountName: creditAccount.name, debit: 0, credit: amount, description: params.description }
    ]);

    if (!journalRes.success) {
      return { success: false, message: `Journal entry failed: ${journalRes.message}` };
    }

    let updatedJournalEntries = [...(db.journalEntries || [])];
    let updatedJournalLines = [...(db.journalLines || [])];
    if (journalRes.entry && journalRes.lines) {
      updatedJournalEntries.push(journalRes.entry);
      updatedJournalLines.push(...journalRes.lines);
    }

    const currentBank = this.getBankBalance(db.bankTransactions);
    const newBankBalance = params.type === 'IN' ? currentBank + amount : currentBank - amount;
    
    const newTx: BankTransaction = {
      transactionNo: voucherNo,
      sourceType: sType as any,
      sourceId: sId,
      createdAt: new Date().toISOString(),
      transactionId: txId,
      date: params.date,
      bankAccountId: params.bankAccountId,
      bankName: "Default Bank",
      accountNumberMasked: "****",
      reference: params.reference || voucherNo,
      description: params.description,
      deposit: params.type === 'IN' ? amount : 0,
      withdrawal: params.type === 'OUT' ? amount : 0,
      balance: newBankBalance,
    };

    const updatedBank = [...(db.bankTransactions || []), newTx];
    
    const auditRes = {
      auditId: `AUD-${Date.now()}`,
      userId: params.postedByUserId || 'system',
      userName: params.postedByUserName || 'System',
      dateTime: new Date().toISOString(),
      module: 'BANK',
      action: 'BANK_TRANSACTION_MATCHED' as any,
      recordId: txId,
      newValue: `Bank tx ${txId} posted`,
      remarks: `Bank ${params.type} posted`
    };

    return {
      success: true,
      message: 'Transaction posted successfully.',
      updatedDb: {
        ...db,
        bankTransactions: updatedBank,
        journalEntries: updatedJournalEntries,
        journalLines: updatedJournalLines,
        auditLogs: [auditRes, ...(db.auditLogs || [])]
      }
    };
  }

  static reverseCashTransaction(
    db: AppDatabaseState,
    params: {
      transactionId: string;
      reason: string;
      reversedByUserId?: string;
      reversedByUserName?: string;
    }
  ): { success: boolean; message: string; reversalVoucherNo?: string; updatedDb?: AppDatabaseState } {
    const txIndex = (db.cashTransactions || []).findIndex(t => t.transactionId === params.transactionId && t.status === 'POSTED');
    if (txIndex === -1) return { success: false, message: 'Posted transaction not found.' };
    
    const tx = db.cashTransactions[txIndex];
    const today = new Date().toISOString().split('T')[0];
    if (isDateInClosedYear(tx.date, db) || isDateInClosedYear(today, db)) {
      return { success: false, message: 'এই অর্থবছর বন্ধ রয়েছে। বন্ধ অর্থবছরের লেনদেন রিভার্স বা সংশোধন করা সম্ভব নয়।' };
    }

    const revVoucherNo = `REV-${tx.voucherNo}`;
    const revTxId = `CASH-REV-${Date.now()}`;

    const isOriginalIn = tx.cashIn > 0;
    const amount = isOriginalIn ? tx.cashIn : tx.cashOut;

    const cashAccountId = "CASH";
    const suspenseAccountId = "MISC_INCOME_EXPENSE"; 
    
    const debitAccount = isOriginalIn ? suspenseAccountId : cashAccountId;
    const creditAccount = isOriginalIn ? cashAccountId : suspenseAccountId;

    const journalRes = this.postJournalEntry(db, {
      date: new Date().toISOString().split('T')[0],
      description: `Reversal of ${tx.voucherNo}: ${params.reason}`,
      reference: revVoucherNo,
      status: 'ACTIVE',
      journalNo: revVoucherNo,
      sourceType: 'MANUAL',
      sourceId: revTxId,
      createdBy: params.reversedByUserName || 'System'
    }, [
      { accountId: debitAccount, accountName: debitAccount, debit: amount, credit: 0, description: `Reversal of ${tx.voucherNo}` },
      { accountId: creditAccount, accountName: creditAccount, debit: 0, credit: amount, description: `Reversal of ${tx.voucherNo}` }
    ]);

    if (!journalRes.success) {
      return { success: false, message: `Reversal journal entry failed: ${journalRes.message}` };
    }
    const currentCash = this.getCashBalance(db.cashTransactions);
    const newCashBalance = isOriginalIn ? currentCash - amount : currentCash + amount;

    const updatedOriginal = {
      ...tx,
      status: 'REVERSED' as any,
      reversalTransactionId: revTxId,
      reversedByUserId: params.reversedByUserId,
      reversedByUserName: params.reversedByUserName,
      reversedAt: new Date().toISOString(),
      reversalReason: params.reason
    };

    const reversalTx: CashTransaction = {
      transactionId: revTxId,
      date: new Date().toISOString().split('T')[0],
      voucherNo: revVoucherNo,
      reference: `REV-${tx.voucherNo}`,
      description: `সংশোধনী রিভার্সাল (মূল ভাউচার: ${tx.voucherNo}) - কারণ: ${params.reason}`,
      cashIn: isOriginalIn ? 0 : amount,
      cashOut: isOriginalIn ? amount : 0,
      balance: newCashBalance,
      status: 'REVERSED' as any,
      originalTransactionId: tx.transactionId,
      reversedByUserId: params.reversedByUserId,
      reversedByUserName: params.reversedByUserName,
      reversedAt: new Date().toISOString(),
      sourceType: 'MANUAL',
      sourceId: revTxId,
      createdBy: params.reversedByUserName || 'System',
      createdAt: new Date().toISOString()
    };

    const updatedCash = [...(db.cashTransactions || [])];
    const origIndex = updatedCash.findIndex(t => t.transactionId === params.transactionId);
    if (origIndex > -1) {
      updatedCash[origIndex] = updatedOriginal;
    }
    updatedCash.push(reversalTx);

    const auditRes = {
      auditId: `AUD-${Date.now()}`,
      userId: params.reversedByUserId || 'system',
      userName: params.reversedByUserName || 'System',
      dateTime: new Date().toISOString(),
      module: 'CASH',
      action: 'CASH_TRANSACTION_REVERSED' as any,
      recordId: tx.transactionId,
      newValue: JSON.stringify({ original: updatedOriginal, reversal: reversalTx }),
      remarks: `Manual cash transaction reversed. Original: ${tx.voucherNo}, Reversal: ${revVoucherNo}`
    };

    return {
      success: true,
      message: `Transaction reversed successfully. Reversal Voucher: ${revVoucherNo}`,
      reversalVoucherNo: revVoucherNo,
      updatedDb: {
        ...db,
        cashTransactions: updatedCash,
        auditLogs: [auditRes, ...(db.auditLogs || [])]
      }
    };
  }

  static reverseAndCorrectCashTransaction(
    db: AppDatabaseState,
    params: {
      originalTransactionId: string;
      reason: string;
      reversedByUserId?: string;
      reversedByUserName?: string;
      newEntry: {
        type: 'IN' | 'OUT';
        amount: number;
        date: string;
        description: string;
        reference?: string;
        voucherNo?: string;
      };
    }
  ): { success: boolean; message: string; reversalVoucherNo?: string; newVoucherNo?: string; updatedDb?: AppDatabaseState } {
    const revResult = this.reverseCashTransaction(db, {
      transactionId: params.originalTransactionId,
      reason: params.reason,
      reversedByUserId: params.reversedByUserId,
      reversedByUserName: params.reversedByUserName
    });

    if (!revResult.success || !revResult.updatedDb) {
      return { success: false, message: revResult.message };
    }

    const postResult = this.postCashTransaction(revResult.updatedDb, {
      ...params.newEntry,
      postedByUserId: params.reversedByUserId,
      postedByUserName: params.reversedByUserName
    });

    if (!postResult.success || !postResult.updatedDb) {
      return { success: false, message: `Reversal completed but new entry failed: ${postResult.message}`, reversalVoucherNo: revResult.reversalVoucherNo, updatedDb: revResult.updatedDb };
    }

    return {
      success: true,
      message: `Correction successful. Reversal Voucher: ${revResult.reversalVoucherNo}, New Voucher: ${params.newEntry.voucherNo}`,
      reversalVoucherNo: revResult.reversalVoucherNo,
      newVoucherNo: params.newEntry.voucherNo,
      updatedDb: postResult.updatedDb
    };
  }



  // ==========================================
  // PHASE 3E: INCOME WORKFLOW
  // ==========================================
  static saveIncomeDraft(
    db: AppDatabaseState,
    income: Partial<Income> & { amount: number, incomeHead: string, date: string, paymentMethod: PaymentMethod }
  ): { success: boolean; message: string; income: Income; updatedDb?: AppDatabaseState } {
    const isNew = !income.incomeId;
    const incomeId = income.incomeId || `INC-${Date.now()}`;
    const voucherNo = income.voucherNo || this.generateVoucherNo(db, 'INC');
    
    const newIncome: Income = {
      incomeId,
      voucherNo,
      date: income.date,
      incomeHead: income.incomeHead,
      memberId: income.memberId,
      memberName: income.memberName,
      reference: income.reference || '',
      amount: income.amount,
      paymentMethod: income.paymentMethod,
      bankAccountId: income.bankAccountId,
      remarks: income.remarks,
      createdBy: income.createdBy || 'SYSTEM',
      status: 'DRAFT' as any,
      createdAt: income.createdAt || new Date().toISOString(),
      
      correctionStatus: income.correctionStatus,
      correctedFromId: income.correctedFromId,
      correctionReason: income.correctionReason
    };

    let updatedIncomes = [...(db.incomes || [])];
    if (isNew) {
      updatedIncomes.push(newIncome);
    } else {
      updatedIncomes = updatedIncomes.map(i => i.incomeId === incomeId ? newIncome : i);
    }

    return {
      success: true,
      message: isNew ? 'আয় খসড়া হিসাবে সংরক্ষিত হয়েছে।' : 'আয়ের খসড়া আপডেট হয়েছে।',
      income: newIncome,
      updatedDb: {
        ...db,
        incomes: updatedIncomes
      }
    };
  }

  static postIncomeDraft(
    db: AppDatabaseState,
    incomeId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const income = (db.incomes || []).find(i => i.incomeId === incomeId);
    if (!income) return { success: false, message: 'আয়ের রেকর্ড পাওয়া যায়নি।' };
    if (income.status !== 'DRAFT') return { success: false, message: 'শুধুমাত্র খসড়া আয় পোস্ট করা যাবে।' };
    
    if (isDateInClosedYear(income.date, db)) {
      return { success: false, message: 'এই তারিখটি একটি বন্ধ অর্থবছরের অন্তর্ভুক্ত।' };
    }

    // Post to Cash/Bank Book
    let updatedDb = { ...db };
    if (income.paymentMethod === 'Cash') {
      const cResult = this.postCashTransaction(updatedDb, {
        date: income.date,
        type: 'IN',
        amount: income.amount,
        
        
        description: `${income.incomeHead} - ${income.memberName || income.reference}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!cResult.success) return cResult;
      updatedDb = cResult.updatedDb!;
    } else if (income.paymentMethod === 'Bank') {
      if (!income.bankAccountId) return { success: false, message: 'ব্যাংক অ্যাকাউন্ট নির্বাচন করা আবশ্যক।' };
      const bResult = this.postBankTransaction(updatedDb, {
        bankAccountId: income.bankAccountId,
        date: income.date,
        type: 'IN',
        amount: income.amount,
        
        
        description: `${income.incomeHead} - ${income.memberName || income.reference}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!bResult.success) return bResult;
      updatedDb = bResult.updatedDb!;
    }
    
    // Post Journal
    const jResult = this.postJournalEntry(updatedDb, {
      date: income.date,
            journalNo: `JV-${Date.now()}`,
          description: `Income Posted: ${income.incomeHead}`,
      sourceType: 'INCOME',
      sourceId: income.voucherNo,
      createdBy: userId,
      
      status: 'ACTIVE'
    }, [
      {
        accountId: income.paymentMethod === 'Cash' ? '1001' : `BANK-${income.bankAccountId}`,
        accountName: income.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Bank Account',
        debit: income.amount,
        credit: 0
      },
      {
        accountId: `INC-${income.incomeHead}`,
        accountName: income.incomeHead,
        debit: 0,
        credit: income.amount
      }
    ]);
    
    if (!jResult.success) return jResult;
    

    // Update status
    const updatedIncomes = updatedDb.incomes.map(i => i.incomeId === incomeId ? { ...i, status: 'POSTED' as any , receivedBy: userName, updatedAt: new Date().toISOString() } : i);
    updatedDb.incomes = updatedIncomes;

    return {
      success: true,
      message: 'আয় সফলভাবে পোস্ট করা হয়েছে।',
      updatedDb
    };
  }

  static deleteIncomeDraft(
    db: AppDatabaseState,
    incomeId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const income = (db.incomes || []).find(i => i.incomeId === incomeId);
    if (!income) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (income.status !== 'DRAFT') return { success: false, message: 'শুধুমাত্র খসড়া রেকর্ড মুছে ফেলা যাবে।' };

    const updatedIncomes = db.incomes.filter(i => i.incomeId !== incomeId);
    
    return {
      success: true,
      message: 'খসড়া আয় সফলভাবে মুছে ফেলা হয়েছে।',
      updatedDb: {
        ...db,
        incomes: updatedIncomes,
        auditLogs: [
          ...db.auditLogs,
          {
            auditId: `AUD-${Date.now()}`,
            userId,
            userName,
            dateTime: new Date().toISOString(),
            module: 'INCOME',
            action: 'DELETE_DRAFT',
            recordId: income.voucherNo,
            newValue: 'DELETED',
            remarks: 'Income Draft Deleted'
          }
        ]
      }
    };
  }

  static reverseIncome(
    db: AppDatabaseState,
    incomeId: string,
    userId: string,
    userName: string,
    reason: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const income = (db.incomes || []).find(i => i.incomeId === incomeId);
    if (!income) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (income.status === 'REVERSED') return { success: false, message: 'এই লেনদেন ইতিমধ্যে বাতিল করা হয়েছে।' };
    if (income.status !== 'POSTED') return { success: false, message: 'শুধুমাত্র পোস্ট করা লেনদেন বাতিল করা যাবে।' };
    
    if (isDateInClosedYear(income.date, db)) {
      return { success: false, message: 'মূল এন্ট্রি বন্ধ অর্থবছরের অন্তর্ভুক্ত।' };
    }

    const revDate = new Date().toISOString().split('T')[0];
    const jeId = `JNL-REV-${Date.now()}`;

    let updatedDb = { ...db };

    // Reverse Journal
    const jResult = this.postJournalEntry(updatedDb, {
      date: revDate,
      description: `Reversal of ${income.voucherNo}: ${reason}`,
      sourceType: 'INCOME_REVERSAL',
      sourceId: income.voucherNo,
      createdBy: userId,
      journalNo: `REV-${Date.now()}`,
      status: 'ACTIVE'
    }, [
      {
        accountId: `INC-${income.incomeHead}`,
        accountName: income.incomeHead,
        debit: income.amount,
        credit: 0
      },
      {
        accountId: income.paymentMethod === 'Cash' ? '1001' : `BANK-${income.bankAccountId}`,
        accountName: income.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Bank Account',
        debit: 0,
        credit: income.amount
      }
    ]);
    if (!jResult.success) return jResult;
    

    // Reverse Cash/Bank
    if (income.paymentMethod === 'Cash') {
      const cResult = this.postCashTransaction(updatedDb, {
        date: revDate,
        type: 'OUT',
        amount: income.amount,
        
        
        description: `Reversal of ${income.voucherNo}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!cResult.success) return cResult;
      updatedDb = cResult.updatedDb!;
    } else {
      const bResult = this.postBankTransaction(updatedDb, {
        bankAccountId: income.bankAccountId!,
        date: revDate,
        type: 'OUT',
        amount: income.amount,
        
        
        description: `Reversal of ${income.voucherNo}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!bResult.success) return bResult;
      updatedDb = bResult.updatedDb!;
    }

    const updatedIncomes = updatedDb.incomes.map(i => i.incomeId === incomeId ? { ...i, status: 'REVERSED' as any , correctionStatus: 'ORIGINAL' as any, correctionReason: reason } : i);
    
    return {
      success: true,
      message: 'আয় সফলভাবে বাতিল করা হয়েছে।',
      updatedDb: {
        ...updatedDb,
        incomes: updatedIncomes,
        auditLogs: [
          ...updatedDb.auditLogs,
          {
            auditId: `AUD-${Date.now()}`,
            userId,
            userName,
            dateTime: new Date().toISOString(),
            module: 'INCOME',
            action: 'REVERSE',
            recordId: income.voucherNo,
            newValue: `Status: REVERSED, Reason: ${reason}`,
            remarks: 'Income Reversed'
          }
        ]
      }
    };
  }

  static correctIncome(
    db: AppDatabaseState,
    originalId: string,
    correctedData: Partial<Income> & { amount: number, incomeHead: string, paymentMethod: PaymentMethod },
    userId: string,
    userName: string,
    reason: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const original = (db.incomes || []).find(i => i.incomeId === originalId);
    if (!original) return { success: false, message: 'লেনদেন পাওয়া যায়নি।' };
    if (original.correctionStatus === 'CORRECTION') return { success: false, message: 'ইতিমধ্যে সংশোধন করা হয়েছে।' };
    if (original.status !== 'POSTED') return { success: false, message: 'শুধুমাত্র পোস্ট করা লেনদেন সংশোধন করা যায়।' };

    // 1. Reverse original
    const revResult = this.reverseIncome(db, originalId, userId, userName, `Correction Reversal: ${reason}`);
    if (!revResult.success || !revResult.updatedDb) return revResult;
    
    let workingDb = revResult.updatedDb;

    // 2. Draft new correction
    const correctedId = `INC-COR-${Date.now()}`;
    const correctedVoucherNo = this.generateVoucherNo(workingDb, 'INC');
    
    const correctedDraft: any = {
      ...original,
      incomeId: correctedId,
      voucherNo: correctedVoucherNo,
      date: new Date().toISOString().split('T')[0],
      amount: correctedData.amount,
      incomeHead: correctedData.incomeHead,
      paymentMethod: correctedData.paymentMethod,
      bankAccountId: correctedData.bankAccountId,
      remarks: `[Correction of ${original.voucherNo}] ${correctedData.remarks || original.remarks || ''}`,
      createdBy: userName,
      status: 'DRAFT' as any,
      createdAt: new Date().toISOString(),
      correctionStatus: 'CORRECTION',
      correctedFromId: originalId,
      correctionReason: reason
    };

    const draftResult = this.saveIncomeDraft(workingDb, correctedDraft);
    if (!draftResult.success || !draftResult.updatedDb) return draftResult;
    workingDb = draftResult.updatedDb;

    // 3. Post correction
    const postResult = this.postIncomeDraft(workingDb, correctedId, userId, userName);
    if (!postResult.success || !postResult.updatedDb) return postResult;
    workingDb = postResult.updatedDb;

    // 4. Update original tag
    const updatedOriginal = { ...original, correctionStatus: 'CORRECTION' as any, status: 'REVERSED' as any };
    workingDb.incomes = workingDb.incomes.map(i => i.incomeId === originalId ? updatedOriginal : i);

    return {
      success: true,
      message: 'সংশোধন সফল হয়েছে।',
      updatedDb: {
        ...workingDb,
        auditLogs: [
          ...workingDb.auditLogs,
          {
            auditId: `AUD-${Date.now()}`,
            userId,
            userName,
            dateTime: new Date().toISOString(),
            module: 'INCOME',
            action: 'CORRECT',
            recordId: original.voucherNo,
            newValue: `Corrected to: ${correctedId}, Amount: ${correctedData.amount}`,
            remarks: 'Income Corrected'
          }
        ]
      }
    };
  }


  // ==========================================
  // PHASE 3E: EXPENSE WORKFLOW
  // ==========================================
  static saveExpenseDraft(
    db: AppDatabaseState,
    expense: Partial<Expense> & { amount: number, expenseHead: string, date: string, paymentMethod: PaymentMethod }
  ): { success: boolean; message: string; expense: Expense; updatedDb?: AppDatabaseState } {
    const isNew = !expense.expenseId;
    const expenseId = expense.expenseId || `EXP-${Date.now()}`;
    const voucherNo = expense.voucherNo || this.generateVoucherNo(db, 'EXP');
    
    const newExpense: Expense = {
      expenseId,
      voucherNo,
      date: expense.date,
      expenseHead: expense.expenseHead,
      payee: expense.payee || '',
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      bankAccountId: expense.bankAccountId,
      billNumber: expense.billNumber,
      approvedBy: expense.approvedBy,
      approvalStatus: 'DRAFT' as any,
      remarks: expense.remarks,
      createdBy: expense.createdBy || 'SYSTEM',
      createdAt: expense.createdAt || new Date().toISOString(),
      
      correctionStatus: expense.correctionStatus,
      correctedFromId: expense.correctedFromId,
      correctionReason: expense.correctionReason
    };

    let updatedExpenses = [...(db.expenses || [])];
    if (isNew) {
      updatedExpenses.push(newExpense);
    } else {
      updatedExpenses = updatedExpenses.map(e => e.expenseId === expenseId ? newExpense : e);
    }

    return {
      success: true,
      message: isNew ? 'ব্যয় খসড়া হিসাবে সংরক্ষিত হয়েছে।' : 'ব্যয়ের খসড়া আপডেট হয়েছে।',
      expense: newExpense,
      updatedDb: { ...db, expenses: updatedExpenses }
    };
  }

  static submitExpenseDraft(
    db: AppDatabaseState,
    expenseId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const expense = (db.expenses || []).find(e => e.expenseId === expenseId);
    if (!expense) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (expense.approvalStatus !== 'DRAFT') return { success: false, message: 'শুধুমাত্র খসড়া সাবমিট করা যায়।' };
    
    const updatedExpenses = db.expenses.map(e => e.expenseId === expenseId ? { ...e, approvalStatus: 'PENDING_APPROVAL' as any, updatedAt: new Date().toISOString() } : e);
    
    return {
      success: true,
      message: 'অনুমোদনের জন্য সাবমিট করা হয়েছে।',
      updatedDb: { ...db, expenses: updatedExpenses }
    };
  }

  static approveExpense(
    db: AppDatabaseState,
    expenseId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const expense = (db.expenses || []).find(e => e.expenseId === expenseId);
    if (!expense) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (expense.approvalStatus !== 'PENDING_APPROVAL') return { success: false, message: 'এটি অনুমোদনের অপেক্ষায় নেই।' };
    
    const updatedExpenses = db.expenses.map(e => e.expenseId === expenseId ? { ...e, approvalStatus: 'APPROVED' as any, approvedBy: userName, updatedAt: new Date().toISOString() } : e);
    
    return {
      success: true,
      message: 'ব্যয় অনুমোদিত হয়েছে।',
      updatedDb: { ...db, expenses: updatedExpenses }
    };
  }

  static postExpenseDraft(
    db: AppDatabaseState,
    expenseId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const expense = (db.expenses || []).find(e => e.expenseId === expenseId);
    if (!expense) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (!['DRAFT', 'APPROVED'].includes(expense.approvalStatus)) return { success: false, message: 'শুধুমাত্র ড্রাফট বা অনুমোদিত ব্যয় পোস্ট করা যায়।' };
    
    if (isDateInClosedYear(expense.date, db)) {
      return { success: false, message: 'এই তারিখটি একটি বন্ধ অর্থবছরের অন্তর্ভুক্ত।' };
    }

    let updatedDb = { ...db };
    if (expense.paymentMethod === 'Cash') {
      const cResult = this.postCashTransaction(updatedDb, {
        date: expense.date,
        type: 'OUT',
        amount: expense.amount,
        sourceType: 'EXPENSE',
        sourceId: expense.expenseId,
        voucherNo: expense.voucherNo,
        accountId: '5000',
        accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
        description: `${expense.expenseHead} - ${expense.payee}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!cResult.success) return cResult;
      updatedDb = cResult.updatedDb!;
    } else {
      if (!expense.bankAccountId && !db.settings?.bankName) return { success: false, message: 'ব্যাংক অ্যাকাউন্ট নির্বাচন করা আবশ্যক।' };
      const bResult = this.postBankTransaction(updatedDb, {
        bankAccountId: expense.bankAccountId,
        date: expense.date,
        type: 'OUT',
        amount: expense.amount,
        sourceType: 'EXPENSE',
        sourceId: expense.expenseId,
        voucherNo: expense.voucherNo,
        accountId: '5000',
        accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
        description: `${expense.expenseHead} - ${expense.payee}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!bResult.success) return bResult;
      updatedDb = bResult.updatedDb!;
    }

    const updatedExpenses = updatedDb.expenses.map(e => e.expenseId === expenseId ? { ...e, approvalStatus: 'POSTED' as ExpenseStatus as any , updatedAt: new Date().toISOString() } : e);
    updatedDb.expenses = updatedExpenses;

    return {
      success: true,
      message: 'ব্যয় সফলভাবে পোস্ট করা হয়েছে।',
      updatedDb
    };
  }

  static deleteExpenseDraft(
    db: AppDatabaseState,
    expenseId: string,
    userId: string,
    userName: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const expense = (db.expenses || []).find(e => e.expenseId === expenseId);
    if (!expense) return { success: false, message: 'রেকর্ড পাওয়া যায়নি।' };
    if (!['DRAFT', 'PENDING_APPROVAL', 'REJECTED'].includes(expense.approvalStatus)) return { success: false, message: 'পোস্ট করা বা অনুমোদিত রেকর্ড মুছে ফেলা যাবে না।' };

    const updatedExpenses = db.expenses.filter(e => e.expenseId !== expenseId);
    return {
      success: true,
      message: 'খসড়া ব্যয় মুছে ফেলা হয়েছে।',
      updatedDb: { ...db, expenses: updatedExpenses }
    };
  }

  static reverseExpense(
    db: AppDatabaseState,
    expenseId: string,
    userId: string,
    userName: string,
    reason: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const expense = (db.expenses || []).find(e => e.expenseId === expenseId);
    if (!expense) return { success: false, message: 'লেনদেনটি পাওয়া যায়নি।' };
    if (expense.approvalStatus === 'REVERSED') return { success: false, message: 'ইতিমধ্যে বাতিল করা হয়েছে।' };
    if (expense.approvalStatus !== 'POSTED') return { success: false, message: 'শুধুমাত্র পোস্ট করা লেনদেন বাতিল করা যায়।' };
    
    if (isDateInClosedYear(expense.date, db)) {
      return { success: false, message: 'মূল এন্ট্রি বন্ধ অর্থবছরের অন্তর্ভুক্ত।' };
    }

    const revDate = new Date().toISOString().split('T')[0];
    let updatedDb = { ...db };

    if (expense.paymentMethod === 'Cash') {
      const cResult = this.postCashTransaction(updatedDb, {
        date: revDate,
        type: 'IN',
        amount: expense.amount,
        sourceType: 'EXPENSE_REVERSAL',
        sourceId: expense.expenseId,
        voucherNo: `REV-${expense.voucherNo}`,
        accountId: '5000',
        accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
        description: `Reversal of ${expense.voucherNo}: ${reason}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!cResult.success) return cResult;
      updatedDb = cResult.updatedDb!;
    } else {
      const bResult = this.postBankTransaction(updatedDb, {
        bankAccountId: expense.bankAccountId,
        date: revDate,
        type: 'IN',
        amount: expense.amount,
        sourceType: 'EXPENSE_REVERSAL',
        sourceId: expense.expenseId,
        voucherNo: `REV-${expense.voucherNo}`,
        accountId: '5000',
        accountName: 'দাপ্তরিক ও অন্যান্য ব্যয়',
        description: `Reversal of ${expense.voucherNo}: ${reason}`,
        postedByUserId: userId,
        postedByUserName: userName
      });
      if (!bResult.success) return bResult;
      updatedDb = bResult.updatedDb!;
    }

    const updatedExpenses = updatedDb.expenses.map(e => e.expenseId === expenseId ? { ...e, approvalStatus: 'REVERSED' as ExpenseStatus as any , correctionStatus: 'ORIGINAL' as any, correctionReason: reason } : e);
    
    return {
      success: true,
      message: 'ব্যয় সফলভাবে বাতিল করা হয়েছে।',
      updatedDb: { ...updatedDb, expenses: updatedExpenses }
    };
  }

  static correctExpense(
    db: AppDatabaseState,
    originalId: string,
    correctedData: Partial<Expense> & { amount: number, expenseHead: string, paymentMethod: PaymentMethod },
    userId: string,
    userName: string,
    reason: string
  ): { success: boolean; message: string; updatedDb?: AppDatabaseState } {
    const original = (db.expenses || []).find(e => e.expenseId === originalId);
    if (!original) return { success: false, message: 'লেনদেন পাওয়া যায়নি।' };
    if (original.correctionStatus === 'CORRECTION') return { success: false, message: 'ইতিমধ্যে সংশোধন করা হয়েছে।' };
    if (original.approvalStatus !== 'POSTED') return { success: false, message: 'শুধুমাত্র পোস্ট করা লেনদেন সংশোধন করা যায়।' };

    const revResult = this.reverseExpense(db, originalId, userId, userName, `Correction Reversal: ${reason}`);
    if (!revResult.success || !revResult.updatedDb) return revResult;
    
    let workingDb = revResult.updatedDb;

    const correctedId = `EXP-COR-${Date.now()}`;
    const correctedVoucherNo = this.generateVoucherNo(workingDb, 'EXP');
    
    const correctedDraft: any = {
      ...original,
      expenseId: correctedId,
      voucherNo: correctedVoucherNo,
      date: new Date().toISOString().split('T')[0],
      amount: correctedData.amount,
      expenseHead: correctedData.expenseHead,
      paymentMethod: correctedData.paymentMethod,
      bankAccountId: correctedData.bankAccountId,
      remarks: `[Correction of ${original.voucherNo}] ${correctedData.remarks || original.remarks || ''}`,
      createdBy: userName,
      approvalStatus: 'DRAFT' as any,
      createdAt: new Date().toISOString(),
      correctionStatus: 'CORRECTION',
      correctedFromId: originalId,
      correctionReason: reason
    };

    const draftResult = this.saveExpenseDraft(workingDb, correctedDraft);
    if (!draftResult.success || !draftResult.updatedDb) return draftResult;
    workingDb = draftResult.updatedDb;

    const postResult = this.postExpenseDraft(workingDb, correctedId, userId, userName);
    if (!postResult.success || !postResult.updatedDb) return postResult;
    workingDb = postResult.updatedDb;

    const updatedOriginal = { ...original, correctionStatus: 'CORRECTION' as any, approvalStatus: 'REVERSED' as ExpenseStatus as any as any };
    workingDb.expenses = workingDb.expenses.map(e => e.expenseId === originalId ? updatedOriginal : e);

    return {
      success: true,
      message: 'ব্যয় সফলভাবে সংশোধন করা হয়েছে।',
      updatedDb: workingDb
    };
  }



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
    const existing = db.memberExits?.find(e => e.memberId === params.memberId && e.status !== "EXITED" && e.status !== "REJECTED" && e.status !== "REFUNDED" && e.status !== "SETTLED");
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
        module: "MEMBER_SETTLEMENT",
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: params.memberId,
        recordId: request.exitRequestId,
        remarks: `${params.exitType} Exit requested: ${params.exitReason}`
      }]
    };

    return { success: true, message: "Exit request created.", updatedDb: newDb };
  }

  static reviewMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
      role?: string;
      auditNote?: string;
    }
  ) {
    // 1. Role validation
    const userRole = params.role || "ADMIN";
    const authorizedRoles = ["ADMIN", "ADMIN", "ACCOUNTANT", "ACCOUNTANT", "ADMIN", "ADMIN", "ACCOUNTANT"];
    if (userRole === "MEMBER" || !authorizedRoles.includes(userRole)) {
      return { success: false, message: "আপনার এই আবেদন পর্যালোচনার অনুমতি নেই।" };
    }

    const request = db.memberExits?.find(e => (e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId));
    if (!request) return { success: false, message: "Request not found." };
    
    // Status check - only allow transition from PENDING to UNDER_REVIEW
    if (request.status === "UNDER_REVIEW") {
      return { success: false, message: "আবেদনটি ইতিমধ্যে পর্যালোচনাধীন রয়েছে।" };
    }

    const allowedStatuses = ["NORMAL_EXIT_REQUESTED", "EARLY_EXIT_REQUESTED", "DEATH_REPORTED", "EXIT_REQUESTED", "PENDING"];
    if (!allowedStatuses.includes(request.status)) {
      return { success: false, message: "Invalid status for review. Request must be in a pending state." };
    }

    const member = db.members?.find(m => m.memberId === request.memberId);
    const memberName = member ? member.fullName : request.memberId;

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => ((e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId) ? { 
        ...e, 
        status: "UNDER_REVIEW" as any,
        reviewedBy: params.userId,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } : e)),
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: "SETTLEMENT_REVIEW_STARTED" as any,
        module: "MEMBER_SETTLEMENT",
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: request.memberId,
        recordId: request.exitRequestId || (request as any).id,
        remarks: `Settlement review started for member ${memberName} (${request.memberId}). ${params.auditNote ? 'Note: ' + params.auditNote : ''}`
      }]
    };

    return { success: true, message: "Settlement আবেদনটি পর্যালোচনার জন্য নেওয়া হয়েছে।", updatedDb: newDb };
  }

  static reviewSettlement = AccountingService.reviewMemberExit;

  static approveMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      userId: string;
      userName: string;
      role?: string;
      auditNote?: string;
    }
  ) {
    // 1. Role validation
    const userRole = params.role || "ADMIN";
    const authorizedRoles = ["ADMIN", "ADMIN", "ACCOUNTANT", "ACCOUNTANT", "ADMIN", "ADMIN", "ACCOUNTANT"];
    if (userRole === "MEMBER" || !authorizedRoles.includes(userRole)) {
      return { success: false, message: "আপনার এই নিষ্পত্তি অনুমোদনের অনুমতি নেই।" };
    }

    // 2. Find request
    const request = db.memberExits?.find(e => (e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId));
    if (!request) return { success: false, message: "Request not found." };

    // 3. Self-approval protection: ADMIN and ADMIN bypass for single-admin / demo / administrative workflows
    const isSuperOrAdmin = userRole === "ADMIN";
    if (!isSuperOrAdmin) {
      if ((request.userId && request.userId === params.userId) || (request.requestedBy && request.requestedBy === params.userId)) {
        return { success: false, message: "নিজের তৈরি আবেদন নিজে অনুমোদন করা যাবে না।" };
      }
    }

    // 4. Status protection: Must strictly be UNDER_REVIEW before approval
    if (request.status !== "UNDER_REVIEW") {
      return { 
        success: false, 
        message: `Settlement must be under review before approval (আবেদনটি অনুমোদনের পূর্বে অবশ্যই পর্যালোচিত/UNDER_REVIEW অবস্থায় থাকতে হবে। বর্তমান স্ট্যাটাস: ${request.status})।` 
      };
    }
    
    // 5. Financial year validation
    if (request.requestDate && isDateInClosedYear(request.requestDate, db)) {
      return { success: false, message: "Cannot approve request in a closed financial year." };
    }

    const member = db.members?.find(m => m.memberId === request.memberId);
    const memberName = member ? member.fullName : request.memberId;
    const nowIso = new Date().toISOString();

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => ((e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId) ? { 
        ...e, 
        status: "APPROVED" as any, 
        approvedBy: params.userId,
        approvedByUserId: params.userId, 
        approvedByUserName: params.userName,
        approvedAt: nowIso,
        updatedAt: nowIso
      } : e)),
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: "SETTLEMENT_APPROVED" as any,
        module: "MEMBER_SETTLEMENT",
        userId: params.userId,
        userName: params.userName,
        dateTime: nowIso,
        memberId: request.memberId,
        recordId: request.exitRequestId || (request as any).id,
        remarks: `Settlement approved for member ${memberName} (${request.memberId}). ${params.auditNote ? 'Note: ' + params.auditNote : ''}`
      }]
    };

    return { success: true, message: "Settlement সফলভাবে অনুমোদিত হয়েছে।", updatedDb: newDb };
  }

  static rejectMemberExit(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      reason: string;
      userId: string;
      userName: string;
      role?: string;
    }
  ) {
    // 1. Role validation
    if (params.role === "MEMBER" || (params.role && !["ADMIN", "ADMIN", "ACCOUNTANT", "ACCOUNTANT"].includes(params.role))) {
      return { success: false, message: "আপনার এই নিষ্পত্তি প্রত্যাখ্যানের অনুমতি নেই।" };
    }

    // 2. Validation: Reason is mandatory
    if (!params.reason || !params.reason.trim()) {
      return { success: false, message: "প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।" };
    }

    // 3. Find request
    const request = db.memberExits?.find(e => (e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId));
    if (!request) return { success: false, message: "Request not found." };

    // 4. Status protection
    const allowedStatuses = ["PENDING", "UNDER_REVIEW", "NORMAL_EXIT_REQUESTED", "EARLY_EXIT_REQUESTED", "DEATH_REPORTED", "EXIT_REQUESTED"];
    if (!allowedStatuses.includes(request.status)) {
      return { success: false, message: `আবেদনটি প্রত্যাখ্যানের উপযোগী অবস্থায় নেই (বর্তমান স্ট্যাটাস: ${request.status})।` };
    }

    const member = db.members?.find(m => m.memberId === request.memberId);
    const memberName = member ? member.fullName : request.memberId;

    const newDb = {
      ...db,
      memberExits: db.memberExits.map(e => ((e.exitRequestId === params.exitRequestId || (e as any).id === params.exitRequestId) ? { 
        ...e, 
        status: "REJECTED" as any, 
        rejectedBy: params.userId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: params.reason.trim(),
        updatedAt: new Date().toISOString()
      } : e)),
      members: db.members.map(m => m.memberId === request.memberId ? { ...m, status: "ACTIVE" as any } : m), // restore active status
      auditLogs: [...db.auditLogs, {
        auditId: "AUD" + Date.now(),
        action: "SETTLEMENT_REJECTED" as any,
        module: "MEMBER_SETTLEMENT",
        userId: params.userId,
        userName: params.userName,
        dateTime: new Date().toISOString(),
        memberId: request.memberId,
        recordId: request.exitRequestId || (request as any).id,
        remarks: `Settlement request rejected for member ${memberName} (${request.memberId}): ${params.reason.trim()}`
      }]
    };

    return { success: true, message: "Settlement আবেদন প্রত্যাখ্যান করা হয়েছে।", updatedDb: newDb };
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
      description: `${isDeath ? 'Death Settlement' : 'Member Exit Refund'} for ${member.fullName} (${member.memberId})`,
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
      const currentCash = this.getCashBalance(currentDb.cashTransactions);
      const ct = {
        transactionId: "CT" + Date.now(),
        date,
        voucherNo,
        description: `${isDeath ? 'Death Settlement' : 'Member Exit Refund'} - ${member.fullName}`,
        accountId: "3000",
        accountName: "সদস্য মূলধন তহবিল",
        cashIn: 0,
        cashOut: netAmount,
        balance: currentCash - netAmount,
        sourceType: "MEMBER_EXIT" as any,
        sourceId: request.exitRequestId,
        reference: request.exitRequestId,
        createdAt: new Date().toISOString()
      };
      currentDb.cashTransactions = [...currentDb.cashTransactions, ct as any];
    } else {
      const bank = currentDb.bankAccounts?.find(b => b.id === params.bankAccountId);
      const currentBank = this.getBankBalance(currentDb.bankTransactions);
      const bt = {
        transactionId: "BT" + Date.now(),
        date,
        voucherNo,
        description: `${isDeath ? 'Death Settlement' : 'Member Exit Refund'} - ${member.fullName}`,
        deposit: 0,
        withdrawal: netAmount,
        balance: currentBank - netAmount,
        accountId: "3000",
        accountName: "সদস্য মূলধন তহবিল",
        bankAccountId: params.bankAccountId!,
        bankName: bank ? bank.bankName : (currentDb.settings?.bankName || "Bank"),
        accountNumberMasked: bank ? bank.accountNumber : (currentDb.settings?.bankAccountMask || ""),
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
      auditId: `AUD-${Date.now()}`,
      userId: params.userId,
      userName: params.userName,
      dateTime: new Date().toISOString(),
      action: auditAction as any, module: "MEMBER_EXIT",
      remarks: `Processed ${params.paymentMethod} refund of ৳${netAmount}. Voucher: ${voucherNo}`,
      recordId: request.exitRequestId
    }];

    return { success: true, message: "Refund processed and member settled.", updatedDb: currentDb, voucherNo };
  }
}

export {
  validateJournalIntegrity,
  verifyVoucherRangeBalance,
  validateCashMovementsReconciliation,
  runComprehensiveDiagnosticAudit
};
export type {
  JournalIntegrityValidationResult,
  UnbalancedJournalDetail,
  VoucherRangeFilter,
  VoucherRangeValidationResult,
  VoucherBalanceDiscrepancy,
  VoucherBalanceSummary,
  VoucherLineDetail,
  CashMovementReconciliationResult,
  CashReconciliationItem,
  ComprehensiveIntegrityReport
};
