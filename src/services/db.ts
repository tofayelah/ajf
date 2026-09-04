import localforage from "localforage";
import { calculateInvestmentOutstanding, getInvestmentStatus } from "./InvestmentService";
import { saveDatabaseToAPI, fetchDatabaseFromAPI } from "./api";
// Local Database & State Persistence for AJ Welfare Society
import {
  MemberExitRequest, Committee, CommitteeMember, CommitteeHistory,
  Member,
  Admission,
  Collection,
  CapitalDeposit,
  LoanApplication,
  LoanRepayment,
  Investment,
  ChartAccount,
  CashTransaction,
  BankTransaction,
  BankAccount,
  ContraTransaction,
  Income,
  Expense,
  MemberLedgerEntry,
  WelfareFundTransaction,
  AnnualProfitAllocation,
  Meeting,
  Resolution,
  AuditLog,
  AppSetting,
  UserAccount,
  Attachment,
  ReserveUtilization,
  HistoricalProfit,
  JournalEntry,
  JournalEntryLine,
  LateFeeWaiver,
  HistoricalMigrationLogEntry,
  CashReconciliation, BankReconciliation, BankStatementTransaction, FinancialYear,
  AppNotification, NotificationAcknowledgement } from "../types";

export const DEFAULT_SETTINGS: AppSetting = {
  orgName: "Atorgao Jagoroni Club Business Fund & Welfare Society",
  orgNameBangla: "আতরগাঁও জাগরণী ক্লাব ব্যবসায়িক তহবিল ও কল্যাণ সমিতি",
  orgShortName: "AJ Welfare Society",
  orgLogoUrl: "/AJF-Official-Logo-Final-2026.png?v=3.0",
  slogan: "উন্নয়নের পথে, মানবতার সাথে",
  sloganEnglish: "Towards Development, With Humanity",
  address: "Atargaon, Bajitpur, Kishoreganj, Bangladesh",
  location: "আতরগাঁও, বাজিতপুর, কিশোরগঞ্জ",
  phone: "+880 1711-000000",
  email: "ajwelfare.society@gmail.com",
  currentFinancialYear: "2026-2027",
  admissionFee: 500,
  capitalDeposit: 5000,
  monthlyContribution: 1000,
  lateFine: 20,
  latePaymentDay: 10,
  profitWelfarePercent: 20,
  profitEmergencyPercent: 10,
  profitReservePercent: 10,
  profitMemberPercent: 60,
  receiptPrefix: "REC",
  voucherPrefix: "VCH",
  memberIdPrefix: "AJM",
  loanPrefix: "LN",
  investmentPrefix: "INV",
  resolutionPrefix: "RES",
  currencySymbol: "৳",
  language: "bn",
  isDemoMode: false,
  requireThreeSignaturesForEmergency: true,
  bankAccountMask: "Sonali Bank A/C: ****5678 (Bajitpur Br.)",
  bankName: "সোনালী ব্যাংক পিএলসি, বাজিতপুর শাখা",
  bankBranch: "বাজিতপুর",
  // Official Organization Banking Information
  organizationBankName: "সোনালী ব্যাংক পিএলসি",
  organizationAccountName: "AJ Welfare Society",
  organizationAccountNumber: "****5678",
  branchName: "বাজিতপুর",
  routingNumber: "",
  swiftCode: "",
  bankAddress: "বাজিতপুর, কিশোরগঞ্জ",
  contactPerson: "",
  contactPhone: "",
  remarks: "",
  companyBkashNumber: "01711-234567",
  companyBkashType: "Merchant",

  loanInterestRate: 10,
  notificationSettings: {
    dueReminder: true,
    loanDueReminder: true,
    pendingApprovalAlert: true,
    pendingReconciliationAlert: true,
    yearClosingAlert: true,
    backupReminder: true,
  },
};


export const DEFAULT_USERS: import('../types').UserAccount[] = [
  {
    userId: "USR-0001", username: "admin", pinHash: "1234",
    fullName: "System Admin",
    mobile: "01700000000",
    role: "ADMIN",
    passwordHash: "123456", // Simplified for demo
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
];

export const DEFAULT_ACCOUNTS: ChartAccount[] = [
  { accountCode: "1000", accountName: "Cash in Hand", banglaName: "হাতে নগদ", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1010", accountName: "Bank Account (Sonali Bank)", banglaName: "ব্যাংক হিসাব (সোনালী ব্যাংক)", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1020", accountName: "Mobile Banking (bKash/Nagad)", banglaName: "মোবাইল ব্যাংকিং (বিকাশ/নগদ)", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1100", accountName: "Member Receivable (Due)", banglaName: "সদস্যদের বকেয়া চাঁদা", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1200", accountName: "Loan Receivable", banglaName: "প্রদত্ত ঋণ হিসাব", category: "Asset", group: "Loan Receivables", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1210", accountName: "Other Advances", banglaName: "অন্যান্য অগ্রীম", category: "Asset", group: "Current Assets", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "1500", accountName: "Investment Asset", banglaName: "প্রকল্প বিনিয়োগ হিসাব", category: "Asset", group: "Investments", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "2000", accountName: "Savings Deposit (General)", banglaName: "সাধারণ সঞ্চয় আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2010", accountName: "DPS Deposit", banglaName: "ডিপিএস আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2020", accountName: "FDR Deposit", banglaName: "এফডিআর আমানত", category: "Liability", group: "Current Liabilities", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "2100", accountName: "Accounts Payable", banglaName: "প্রদেয় হিসাব", category: "Liability", group: "Payables", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3000", accountName: "Member Capital (Share)", banglaName: "সদস্য শেয়ার মূলধন", category: "Member Capital", group: "Member Capital", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3001", accountName: "Welfare Fund", banglaName: "কল্যাণ তহবিল", category: "Member Capital", group: "Welfare Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3002", accountName: "Emergency Fund", banglaName: "জরুরী তহবিল", category: "Member Capital", group: "Emergency Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "3003", accountName: "Reserve Fund", banglaName: "সংরক্ষিত তহবিল", category: "Member Capital", group: "Reserve Fund", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4000", accountName: "Admission Fee", banglaName: "ভর্তি ফি", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4010", accountName: "Form Fee", banglaName: "ফরম ফি", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4020", accountName: "Monthly Subscription", banglaName: "মাসিক চাঁদা", category: "Income", group: "Membership Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4100", accountName: "Investment Profit/Interest", banglaName: "বিনিয়োগ হতে মুনাফা", category: "Income", group: "Investment Profit", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4110", accountName: "Service Charge Income", banglaName: "সার্ভিস চার্জ আয়", category: "Income", group: "Service Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4200", accountName: "Donation/Grants", banglaName: "অনুদান প্রাপ্তি", category: "Income", group: "Other Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "4300", accountName: "Other Income", banglaName: "অন্যান্য আয়", category: "Income", group: "Other Income", normalBalance: "CREDIT", isActive: true, isSystem: true },
  { accountCode: "5000", accountName: "Office Rent", banglaName: "অফিস ভাড়া", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5010", accountName: "Salary & Allowance", banglaName: "বেতন ও ভাতা", category: "Expense", group: "Administrative Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5020", accountName: "Entertainment", banglaName: "আপ্যায়ন খরচ", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5030", accountName: "Stationery & Printing", banglaName: "মনিহারি ও ছাপানো", category: "Expense", group: "Administrative Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5040", accountName: "Electricity Bill", banglaName: "বিদ্যুৎ বিল", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5050", accountName: "Mobile & Internet Bill", banglaName: "মোবাইল ও ইন্টারনেট বিল", category: "Expense", group: "Operating Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5100", accountName: "Welfare Expense (Members)", banglaName: "সদস্য কল্যাণ ব্যয়", category: "Expense", group: "Welfare Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5110", accountName: "Social Work/Donation", banglaName: "সামাজিক কাজ ও অনুদান", category: "Expense", group: "Welfare Expense", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5200", accountName: "Bank Charges & Excise Duty", banglaName: "ব্যাংক চার্জ ও আবগারি শুল্ক", category: "Expense", group: "Bank Charges", normalBalance: "DEBIT", isActive: true, isSystem: true },
  { accountCode: "5300", accountName: "Miscellaneous Expense", banglaName: "বিবিধ খরচ", category: "Expense", group: "Other Expense", normalBalance: "DEBIT", isActive: true, isSystem: true }
];

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "BA-001",
    bankName: "সোনালী ব্যাংক পিএলসি",
    branchName: "বাজিতপুর শাখা",
    accountName: "আতরগাঁও আদর্শ যুব সমবায় সমিতি",
    accountNumber: "SB-0192837465678",
    routingNumber: "200260481",
    accountType: "CURRENT",
    financialYearId: "FY-2026-2027",
    openingDate: "2026-07-01",
    status: "ACTIVE",
    openingBalance: 0,
    remarks: "মূল পরিচালন চলতি হিসাব",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "BA-002",
    bankName: "ইসলামী ব্যাংক বাংলাদেশ পিএলসি",
    branchName: "কিশোরগঞ্জ শাখা",
    accountName: "আতরগাঁও আদর্শ যুব সমবায় সমিতি - কল্যাণ তহবিল",
    accountNumber: "IB-2050182736450",
    routingNumber: "125260192",
    accountType: "SAVINGS",
    financialYearId: "FY-2026-2027",
    openingDate: "2026-07-01",
    status: "ACTIVE",
    openingBalance: 0,
    remarks: "কল্যাণ ও জরুরী তহবিল সঞ্চয়ী হিসাব",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "BA-003",
    bankName: "ডাচ-বাংলা ব্যাংক পিএলসি",
    branchName: "ভৈরব বাজার শাখা",
    accountName: "আতরগাঁও আদর্শ যুব সমবায় সমিতি",
    accountNumber: "DB-1181203948571",
    routingNumber: "090260334",
    accountType: "CURRENT",
    financialYearId: "FY-2026-2027",
    openingDate: "2026-07-01",
    status: "ACTIVE",
    openingBalance: 0,
    remarks: "অনলাইন ও কালেকশন হিসাব",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

export const DEFAULT_FINANCIAL_YEARS: FinancialYear[] = [
  {
    id: "FY-2026-2027",
    yearCode: "2026-2027",
    startDate: "2026-07-01",
    endDate: "2027-06-30",
    status: "ACTIVE",
    openingBalances: {
      cash: 0,
      bank: 0,
      memberCapital: 0,
      loanReceivable: 0,
      investment: 0,
      welfareFund: 0,
      emergencyFund: 0,
      reserveFund: 0,
      retainedProfit: 0,
    },
    openedAt: "2026-07-01T00:00:00.000Z",
    openedBy: "USR-0001",
    createdAt: "2026-07-01T00:00:00.000Z",
    createdBy: "USR-0001",
    remarks: "Approved Initial Production Financial Year 2026-2027"
  }
];

export interface AppDatabaseState {
  settings: AppSetting;
  users: UserAccount[];
  accounts: ChartAccount[];
  members: Member[];
  admissions: Admission[];
  collections: Collection[];
  capitalDeposits: CapitalDeposit[];
  loans: LoanApplication[];
  loanRepayments: LoanRepayment[];
  investments: Investment[];
  cashTransactions: CashTransaction[];
  bankTransactions: BankTransaction[];
  bankAccounts: BankAccount[];
  contraTransactions: ContraTransaction[];
  contraEntries?: ContraTransaction[];
  incomes: Income[];
  expenses: Expense[];
  memberLedgers: MemberLedgerEntry[];
  welfareTransactions: WelfareFundTransaction[];
  profitAllocations: AnnualProfitAllocation[];
  meetings: Meeting[];
  resolutions: Resolution[];
  auditLogs: AuditLog[];
  attachments: Attachment[];
  reserveUtilizations: ReserveUtilization[];
  historicalProfits: HistoricalProfit[];
  journalEntries: JournalEntry[];
  journalLines: JournalEntryLine[];
  cashReconciliations: CashReconciliation[];
  bankReconciliations: BankReconciliation[];
  bankStatementTransactions: BankStatementTransaction[];
  financialYears: FinancialYear[];
  committees: Committee[];
  memberPaymentRequests?: any[];
  committeeMembers: CommitteeMember[];
  committeeHistory: CommitteeHistory[];
  memberExits: MemberExitRequest[];
  lateFeeWaivers: LateFeeWaiver[];
  historicalMigrationLog?: HistoricalMigrationLogEntry[];
  notifications?: AppNotification[];
  notificationAcknowledgements?: NotificationAcknowledgement[];
  activeUserId: string | null;
}

const STORAGE_KEY = "AJ_WELFARE_SOCIETY_DB_V1";


function repairAccounts(accounts: any[]) {
  if (!accounts || !Array.isArray(accounts)) return;
  accounts.forEach(acc => {
    const code = String(acc.accountCode || acc.code || "");
    const cat = acc.category || acc.accountType || "Asset";
    
    if (!acc.normalBalance) {
      if (cat === "Asset" || cat === "Expense") {
        acc.normalBalance = "DEBIT";
      } else {
        acc.normalBalance = "CREDIT";
      }
    }
    
    if (!acc.group && !acc.accountGroup) {
       switch (code) {
         case "1000": acc.group = "Current Assets"; break;
         case "1010": acc.group = "Current Assets"; break;
         case "1020": acc.group = "Current Assets"; break;
         case "1100": acc.group = "Current Assets"; break;
         case "1200": acc.group = "Loan Receivables"; break;
         case "1210": acc.group = "Current Assets"; break;
         case "2000": acc.group = "Current Liabilities"; break;
         case "2010": acc.group = "Current Liabilities"; break;
         case "2020": acc.group = "Current Liabilities"; break;
         case "2100": acc.group = "Payables"; break;
         case "3000": acc.group = "Member Capital"; break;
         case "3001": acc.group = "Welfare Fund"; break;
         case "3002": acc.group = "Emergency Fund"; break;
         case "3003": acc.group = "Reserve Fund"; break;
         case "4000": acc.group = "Membership Income"; break;
         case "4010": acc.group = "Membership Income"; break;
         case "4020": acc.group = "Membership Income"; break;
         case "4100": acc.group = "Investment Profit"; break;
         case "4110": acc.group = "Service Income"; break;
         case "4200": acc.group = "Other Income"; break;
         case "4300": acc.group = "Other Income"; break;
         case "5000": acc.group = "Operating Expense"; break;
         case "5010": acc.group = "Administrative Expense"; break;
         case "5020": acc.group = "Operating Expense"; break;
         case "5030": acc.group = "Administrative Expense"; break;
         case "5040": acc.group = "Operating Expense"; break;
         case "5050": acc.group = "Operating Expense"; break;
         case "5100": acc.group = "Welfare Expense"; break;
         case "5110": acc.group = "Welfare Expense"; break;
         case "5200": acc.group = "Bank Charges"; break;
         case "5300": acc.group = "Other Expense"; break;
         default:
           if (cat === "Asset") acc.group = "Current Assets";
           else if (cat === "Liability") acc.group = "Current Liabilities";
           else if (cat === "Member Capital" || cat === "Equity") acc.group = "Member Capital";
           else if (cat === "Income" || cat === "Revenue") acc.group = "Other Income";
           else if (cat === "Expense") acc.group = "Other Expense";
       }
    }
  });
}

function repairJournalEntriesAndLines(db: AppDatabaseState) {
  if (!db || !Array.isArray(db.journalEntries)) return;
  const seenIds = new Set<string>();

  db.journalEntries.forEach((je, idx) => {
    if (!je) return;
    const oldId = je.id;
    if (!oldId || seenIds.has(oldId)) {
      const suffix = je.sourceType ? `-${je.sourceType}` : `-${idx}`;
      je.id = `${oldId || 'JNL'}${suffix}-${idx}`;
    }
    seenIds.add(je.id);
  });

  if (Array.isArray(db.journalLines)) {
    const seenLineIds = new Set<string>();
    const seenLineSigs = new Set<string>();
    const uniqueLines: typeof db.journalLines = [];

    db.journalLines.forEach((jl, idx) => {
      if (!jl) return;
      if (!jl.id || seenLineIds.has(jl.id)) {
        jl.id = `JNL-LINE-${jl.journalEntryId || 'LINE'}-${idx}`;
      }
      seenLineIds.add(jl.id);

      const sig = `${jl.journalEntryId}_${jl.accountId}_${jl.debit}_${jl.credit}`;
      if (seenLineSigs.has(sig)) {
        return;
      }
      seenLineSigs.add(sig);
      uniqueLines.push(jl);
    });

    db.journalLines = uniqueLines;
  }
}

export function repairUsers(db: AppDatabaseState): void {
  if (!Array.isArray(db.users)) {
    db.users = [...DEFAULT_USERS];
    return;
  }
  const seenIds = new Set<string>();
  db.users.forEach((user, idx) => {
    if (!user.userId || seenIds.has(user.userId)) {
      user.userId = `USR-${String(idx + 1).padStart(4, '0')}`;
    }
    seenIds.add(user.userId);
  });
}

export function repairLateFeeWaivers(db: AppDatabaseState): void {
  if (!db) return;
  if (!Array.isArray(db.lateFeeWaivers)) {
    db.lateFeeWaivers = [];
  }

  const existingWaiverIds = new Set(db.lateFeeWaivers.map(w => w.waiverId || `${w.memberId}_${w.collectionId}_${w.collectionMonth}`));
  const existingWaiverRecMonths = new Set(db.lateFeeWaivers.map(w => `${w.memberId}_${w.receiptNo}_${w.collectionMonth}`));

  // Backfill for existing collections where lateFeeWaived is true
  (db.collections || []).forEach((c, idx) => {
    if (c && (c.lateFeeWaived || c.late_fee_waived) && c.memberId) {
      const recMonthKey = `${c.memberId}_${c.receiptNo}_${c.collectionMonth}`;
      const uniqueKey = `${c.memberId}_${c.collectionId}_${c.collectionMonth}`;
      if (!existingWaiverIds.has(uniqueKey) && !existingWaiverRecMonths.has(recMonthKey)) {
        const calculatedFee = (c.lateFine && c.lateFine > 0) ? c.lateFine : (db.settings?.lateFine || 20);
        const wvrId = `WVR-${c.receiptNo || 'REC'}-${c.collectionMonth || idx}`;
        db.lateFeeWaivers.push({
          waiverId: wvrId,
          memberId: c.memberId,
          memberName: c.memberName || '',
          collectionId: c.collectionId || c.receiptNo,
          receiptNo: c.receiptNo,
          collectionMonth: c.collectionMonth,
          calculatedLateFee: calculatedFee,
          waivedAmount: calculatedFee,
          collectedLateFee: 0,
          waiverDate: c.collectionDate || (c.createdAt ? c.createdAt.split('T')[0] : '2026-08-01'),
          reason: 'বকেয়া আদায়ের সময় বিলম্ব ফি মওকুফ',
          approvedBy: c.receivedBy || 'System Admin',
          approvedByUserId: db.activeUserId || 'USR-0001',
          remarks: c.remarks || 'বিলম্ব ফি মওকুফকৃত',
          status: (c.status === 'REVERSED' || c.status === 'CANCELLED') ? 'REVERSED' : 'ACTIVE',
          financialYearId: db.settings?.currentFinancialYear || '2026-2027',
          createdAt: c.createdAt || new Date().toISOString(),
          sourceType: 'COLLECTION',
          sourceId: c.collectionId || c.receiptNo,
        });
        existingWaiverIds.add(uniqueKey);
        existingWaiverRecMonths.add(recMonthKey);
      }
    }
  });
}

export function repairDuplicateCollections(db: AppDatabaseState): void {
  if (!db || !Array.isArray(db.collections)) return;

  const activeColMap = new Map<string, Collection>();
  const cancelledColIds = new Set<string>();

  // Sort: primary collections with monthly fee first, older creation first
  const sortedCollections = [...db.collections].sort((a, b) => {
    const timeA = new Date(a.collectionDate || a.createdAt || '').getTime() || 0;
    const timeB = new Date(b.collectionDate || b.createdAt || '').getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return (b.monthlyAmount || 0) - (a.monthlyAmount || 0);
  });

  sortedCollections.forEach(c => {
    if (!c || c.status === 'CANCELLED' || c.status === 'REVERSED') return;
    const key = `${c.memberId}-${c.collectionMonth}`;
    if (activeColMap.has(key)) {
      const original = activeColMap.get(key)!;
      c.status = 'CANCELLED' as any;
      (c as any).cancellationReason = `Accidental duplicate collection for month ${c.collectionMonth}; original active receipt is ${original.receiptNo} (${original.collectionId})`;
      cancelledColIds.add(c.collectionId);
      if (c.receiptNo) cancelledColIds.add(c.receiptNo);
    } else {
      activeColMap.set(key, c);
    }
  });

  // Synchronize linked journal entries
  if (cancelledColIds.size > 0 && Array.isArray(db.journalEntries)) {
    db.journalEntries.forEach(je => {
      if (
        (je.sourceType === 'COLLECTION' && (cancelledColIds.has(je.sourceId) || (je.reference && cancelledColIds.has(je.reference)))) ||
        (je.journalNo && (je.journalNo === 'JNL-REC-2026-000004' || je.journalNo === 'JNL-REC-2026-000005'))
      ) {
        je.status = 'CANCELLED' as any;
      }
    });
  }
}

export async function loadDatabaseFromStorage(): Promise<AppDatabaseState> {
  try {
    // 1. API backend is the authoritative production source of truth
    let prodDb = await fetchDatabaseFromAPI();
    if (!prodDb) {
      console.warn("No prod DB found, falling back to fresh database");
      prodDb = createFreshDatabase(false);
    }
    
    // 2. Discard stale offline local storage for financial records
    // Always trust the server authoritative database
    
    // Ensure prodDb arrays exist
    prodDb.members = prodDb.members || [];
    prodDb.admissions = prodDb.admissions || [];
    prodDb.collections = prodDb.collections || [];
    prodDb.capitalDeposits = prodDb.capitalDeposits || [];
    prodDb.journalEntries = prodDb.journalEntries || [];
    prodDb.journalLines = prodDb.journalLines || [];
    prodDb.cashTransactions = prodDb.cashTransactions || [];
    prodDb.expenses = prodDb.expenses || [];
    prodDb.incomes = prodDb.incomes || [];
    prodDb.welfareTransactions = prodDb.welfareTransactions || [];
    prodDb.contraTransactions = prodDb.contraTransactions || [];
    prodDb.memberExits = prodDb.memberExits || [];
    prodDb.loans = prodDb.loans || [];

    // Repair/ensure integrity
    repairAccounts(prodDb.accounts);
    repairJournalEntriesAndLines(prodDb);
    repairUsers(prodDb);
    repairLateFeeWaivers(prodDb);
    repairDuplicateCollections(prodDb);

    
    // Overwrite localforage with the single source of truth from the server
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(prodDb));
    } catch (err) {
      console.warn("Could not write offline cache to localforage", err);
    }
    
    return prodDb;
  } catch (e) {
    console.error("Failed to load production DB, falling back to clean initial state", e);
    return createFreshDatabase(false);
  }
}

// Keep a synchronous version that returns a fresh empty instance to avoid context setup breaking
export function getInitialDatabase(): AppDatabaseState {
  return createFreshDatabase(false);
}

export async function clearAllStorage(): Promise<void> {
  try {
    localStorage.clear();
    await localforage.clear();
  } catch (e) {
    console.warn("Storage clear warning:", e);
  }
}

export function createFreshDatabase(withDemoData = false): AppDatabaseState {
  const baseDb: AppDatabaseState = {
    settings: { ...DEFAULT_SETTINGS, isDemoMode: withDemoData },
    users: [...DEFAULT_USERS],
    accounts: [...DEFAULT_ACCOUNTS],
    members: [],
    admissions: [],
    collections: [],
    capitalDeposits: [],
    loans: [],
    loanRepayments: [],
    investments: [],
    cashTransactions: [],
    bankTransactions: [],
    bankAccounts: [...DEFAULT_BANK_ACCOUNTS],
    contraTransactions: [],
    contraEntries: [],
    incomes: [],
    expenses: [],
    memberLedgers: [],
    welfareTransactions: [],
    profitAllocations: [],
    meetings: [],
    resolutions: [],
    auditLogs: [],
    journalEntries: [],
    journalLines: [],
    cashReconciliations: [],
    bankReconciliations: [],
    bankStatementTransactions: [],
    financialYears: [...DEFAULT_FINANCIAL_YEARS],
    attachments: [],
    reserveUtilizations: [],
    historicalProfits: [],
    
committees: [
      {
        committeeId: "COM-001",
        committeeName: "কার্যনির্বাহী পর্ষদ (২০২৬-২০২৮)",
        startDate: "2026-06-26",
        endDate: "2028-06-25",
        status: "ACTIVE",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z"
      }
    ],
    committeeMembers: [
      {
        committeeMemberId: "CM-001",
        committeeId: "COM-001",
        memberId: "AJ-0001",
        position: "PRESIDENT",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-002",
        committeeId: "COM-001",
        memberId: "AJ-0002",
        position: "GENERAL_SECRETARY",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-003",
        committeeId: "COM-001",
        memberId: "AJ-0003",
        position: "TREASURER",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      }
    ],
    committeeHistory: [],


    memberExits: [],
    lateFeeWaivers: [],
    historicalMigrationLog: [],
    notifications: [],
    notificationAcknowledgements: [],
    activeUserId: "USR-0001",
  };

  if (withDemoData) {
    return populateDemoData(baseDb);
  }

  return baseDb;
}



// Standard column schema for public.members table in PostgreSQL
export const PUBLIC_MEMBERS_SCHEMA_COLUMNS = [
  'member_id',
  'membership_no',
  'full_name',
  'father_name',
  'mother_name',
  'date_of_birth',
  'nid',
  'occupation',
  'marital_status',
  'mobile',
  'email',
  'present_address',
  'permanent_address',
  'blood_group',
  'joining_date',
  'admission_date',
  'photo_path',
  'photo_url',
  'photo',
  'status',
  'remarks',
  'nominees',
  'total_collection_paid',
  'sync_status',
  'created_at',
  'updated_at',
] as const;

/**
 * Directly upsert a member entity to Supabase PostgreSQL with explicit logging and error re-throwing.
 */
export async function upsertMemberToSupabase(member: Member) {
  // Deprecated: Supabase sync removed.
  console.log('[upsertMember] Sync handled by global saveDatabaseToStorage now.');
  return null;
}

export async function saveDatabaseToStorage(db: AppDatabaseState): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // 1. Sync to backend API (Authoritative Server Source of Truth)
    const syncResult = await saveDatabaseToAPI(db);

    // 2. Persist state to LocalForage (Offline cache)
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (localErr) {
      console.warn('[saveDatabaseToStorage] LocalForage save failed:', localErr);
    }

    return {
      success: syncResult.success,
      error: !syncResult.success ? (syncResult.error || 'Server save failed') : undefined,
    };
  } catch (e: any) {
    // Preserve local copy
    try {
      await localforage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (localErr) {
      console.warn('[saveDatabaseToStorage] Local storage fallback error:', localErr);
    }
    
    return {
      success: false,
      error: e?.message || 'Sync failed',
      details: e,
    };
  }
}

// Generate Realistic Seed/Demo Data
export function populateDemoData(db: AppDatabaseState): AppDatabaseState {
  
  const isProduction = (typeof process !== 'undefined' && process.env && process.env.VITE_APP_MODE === "production") || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_MODE === "production");
  if (isProduction) {
    console.warn("BLOCKED: Cannot populate demo data in production.");
    return db;
  }
  db.committees = [
      {
        committeeId: "COM-001",
        committeeName: "কার্যনির্বাহী পর্ষদ (২০২৬-২০২৮)",
        startDate: "2026-06-26",
        endDate: "2028-06-25",
        status: "ACTIVE",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z"
      }
    ];
  db.committeeMembers = [
      {
        committeeMemberId: "CM-001",
        committeeId: "COM-001",
        memberId: "AJ-0001",
        position: "PRESIDENT",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-002",
        committeeId: "COM-001",
        memberId: "AJ-0002",
        position: "GENERAL_SECRETARY",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-003",
        committeeId: "COM-001",
        memberId: "AJ-0003",
        position: "TREASURER",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      }
    ];
  db.committeeHistory = [];

  const members: Member[] = [
    {
      memberId: "AJ-0001",
      membershipNo: "M-001",
      fullName: "মো: রফিকুল ইসলাম",
      fatherName: "মরহুম হাজী আব্দুল করিম",
      motherName: "মোসা: রাবেয়া খাতুন",
      dateOfBirth: "1982-05-14",
      nid: "19824810612000001",
      occupation: "ব্যবসা (মুদি ও পাইকারী)",
      maritalStatus: "বিবাহিত",
      mobile: "01711223344",
      email: "rafiqul.aj@gmail.com",
      presentAddress:
        "গ্রাম: আতরগাঁও, পো: সরারচর, থানা: বাজিতপুর, জেলা: কিশোরগঞ্জ",
      permanentAddress:
        "গ্রাম: আতরগাঁও, পো: সরারচর, থানা: বাজিতপুর, জেলা: কিশোরগঞ্জ",
      bloodGroup: "B+",
      joiningDate: "2023-01-01",
      status: "ACTIVE",
      remarks: "প্রতিষ্ঠাতা সভাপতি",
      nominees: [
        {
          nomineeId: "NOM-001",
          memberId: "AJ-0001",
          name: "মোসা: নাজমিন আক্তার",
          relation: "স্ত্রী",
          mobile: "01711223345",
          nid: "19884810612000002",
          address: "আতরগাঁও, বাজিতপুর",
          percentage: 100,
        },
      ],
      createdAt: "2023-01-01T10:00:00.000Z",
      updatedAt: "2023-01-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0002",
      membershipNo: "M-002",
      fullName: "মাহবুব আলম",
      fatherName: "মো: শামসুল হক",
      motherName: "মাজেদা বেগম",
      dateOfBirth: "1985-09-20",
      nid: "19854810612000003",
      occupation: "কৃষি ও মৎস্য চাষ",
      maritalStatus: "বিবাহিত",
      mobile: "01811334455",
      email: "mahbub.aj@gmail.com",
      presentAddress: "গ্রাম: আতরগাঁও পশ্চিমপাড়া, বাজিতপুর, কিশোরগঞ্জ",
      permanentAddress: "গ্রাম: আতরগাঁও পশ্চিমপাড়া, বাজিতপুর, কিশোরগঞ্জ",
      bloodGroup: "O+",
      joiningDate: "2023-01-01",
      status: "ACTIVE",
      remarks: "সাধারণ সম্পাদক",
      nominees: [
        {
          nomineeId: "NOM-002",
          memberId: "AJ-0002",
          name: "মোসা: ফারহানা আক্তার",
          relation: "স্ত্রী",
          mobile: "01811334456",
          nid: "19904810612000004",
          address: "আতরগাঁও পশ্চিমপাড়া, বাজিতপুর",
          percentage: 100,
        },
      ],
      createdAt: "2023-01-01T10:00:00.000Z",
      updatedAt: "2023-01-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0003",
      membershipNo: "M-003",
      fullName: "আব্দুল কাদের",
      fatherName: "মরহুম খলিলুর রহমান",
      motherName: "নুরজাহান বেগম",
      dateOfBirth: "1980-03-12",
      nid: "19804810612000005",
      occupation: "ফার্মেসি ব্যবসা",
      maritalStatus: "বিবাহিত",
      mobile: "01911445566",
      email: "kader.aj@gmail.com",
      presentAddress: "আতরগাঁও বাজার, বাজিতপুর",
      permanentAddress: "আতরগাঁও বাজার, বাজিতপুর",
      bloodGroup: "A+",
      joiningDate: "2023-01-01",
      status: "ACTIVE",
      remarks: "কোষাধ্যক্ষ",
      nominees: [
        {
          nomineeId: "NOM-003",
          memberId: "AJ-0003",
          name: "মো: তানভীর কাদের",
          relation: "ছেলে",
          mobile: "01911445567",
          nid: "20044810612000006",
          address: "আতরগাঁও বাজার",
          percentage: 100,
        },
      ],
      createdAt: "2023-01-01T10:00:00.000Z",
      updatedAt: "2023-01-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0004",
      membershipNo: "M-004",
      fullName: "শফিকুল ইসলাম",
      fatherName: "মো: আব্দুল মালেক",
      motherName: "সুফিয়া বেগম",
      dateOfBirth: "1990-11-05",
      nid: "19904810612000007",
      occupation: "শিক্ষকতা",
      maritalStatus: "বিবাহিত",
      mobile: "01511556677",
      presentAddress: "আতরগাঁও দক্ষিণপাড়া, বাজিতপুর",
      permanentAddress: "আতরগাঁও দক্ষিণপাড়া, বাজিতপুর",
      bloodGroup: "AB+",
      joiningDate: "2023-02-01",
      status: "ACTIVE",
      remarks: "নিয়মিত সদস্য",
      nominees: [
        {
          nomineeId: "NOM-004",
          memberId: "AJ-0004",
          name: "রোকেয়া বেগম",
          relation: "মা",
          mobile: "01511556678",
          nid: "19654810612000008",
          address: "আতরগাঁও দক্ষিণপাড়া",
          percentage: 100,
        },
      ],
      createdAt: "2023-02-01T10:00:00.000Z",
      updatedAt: "2023-02-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0005",
      membershipNo: "M-005",
      fullName: "কামাল হোসেন",
      fatherName: "মো: সিরাজুল হক",
      motherName: "জাহানারা বেগম",
      dateOfBirth: "1992-07-18",
      nid: "19924810612000009",
      occupation: "হার্ডওয়্যার ব্যবসায়ী",
      maritalStatus: "বিবাহিত",
      mobile: "01611667788",
      presentAddress: "আতরগাঁও মধ্যপাড়া, বাজিতপুর",
      permanentAddress: "আতরগাঁও মধ্যপাড়া, বাজিতপুর",
      bloodGroup: "B+",
      joiningDate: "2023-03-01",
      status: "ACTIVE",
      remarks: "নিয়মিত সদস্য",
      nominees: [
        {
          nomineeId: "NOM-005",
          memberId: "AJ-0005",
          name: "মোসা: কুলসুম আক্তার",
          relation: "স্ত্রী",
          mobile: "01611667789",
          nid: "19964810612000010",
          address: "আতরগাঁও মধ্যপাড়া",
          percentage: 100,
        },
      ],
      createdAt: "2023-03-01T10:00:00.000Z",
      updatedAt: "2023-03-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0006",
      membershipNo: "M-006",
      fullName: "আনোয়ার হোসেন",
      fatherName: "মো: জালাল উদ্দিন",
      motherName: "আমেনা বেগম",
      dateOfBirth: "1987-04-25",
      nid: "19874810612000011",
      occupation: "প্রবাসী (প্রাক্তন)",
      maritalStatus: "বিবাহিত",
      mobile: "01711778899",
      presentAddress: "আতরগাঁও উত্তরপাড়া, বাজিতপুর",
      permanentAddress: "আতরগাঁও উত্তরপাড়া, বাজিতপুর",
      bloodGroup: "O+",
      joiningDate: "2023-04-01",
      status: "ACTIVE",
      remarks: "বকেয়া সদস্য (২ মাস বকেয়া)",
      nominees: [
        {
          nomineeId: "NOM-006",
          memberId: "AJ-0006",
          name: "মোসা: মরিয়ম বেগম",
          relation: "স্ত্রী",
          mobile: "01711778890",
          nid: "19914810612000012",
          address: "আতরগাঁও উত্তরপাড়া",
          percentage: 100,
        },
      ],
      createdAt: "2023-04-01T10:00:00.000Z",
      updatedAt: "2023-04-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      memberId: "AJ-0007",
      membershipNo: "M-007",
      fullName: "মো: জসীম উদ্দিন",
      fatherName: "মো: খোরশেদ আলম",
      motherName: "সালেহা বেগম",
      dateOfBirth: "1984-12-30",
      nid: "19844810612000013",
      occupation: "কৃষি পণ্য সরবরাহকারী",
      maritalStatus: "বিবাহিত",
      mobile: "01811889900",
      presentAddress: "আতরগাঁও পূর্বপাড়া, বাজিতপুর",
      permanentAddress: "আতরগাঁও পূর্বপাড়া, বাজিতপুর",
      bloodGroup: "A+",
      joiningDate: "2023-05-01",
      status: "ACTIVE",
      remarks: "৬+ মাস গুরুতর বকেয়া সদস্য",
      nominees: [],
      createdAt: "2023-05-01T10:00:00.000Z",
      updatedAt: "2023-05-01T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
  ];

  const capitalDeposits: CapitalDeposit[] = members.map((m, idx) => ({
    depositId: `CAP-DEP-00${idx + 1}`,
    voucherNo: `CAP-2026-00000${idx + 1}`,
    date: "2026-01-05",
    memberId: m.memberId,
    memberName: m.fullName,
    amount: 5000,
    paymentMethod: idx % 2 === 0 ? "Cash" : "Bank",
    transactionNo: idx % 2 === 0 ? "CSH-001" : "TXN-SB-8921",
    remarks: "প্রাথমিক বাধ্যতামূলক সদস্য মূলধন জমা",
    createdBy: "তোফায়েল আহমেদ (সুপার এডমিন)",
    status: "ACTIVE",
    createdAt: "2026-01-05T11:00:00.000Z",
    syncStatus: "LOCAL",
  }));

  const collections: Collection[] = [
    {
      collectionId: "COL-001",
      receiptNo: "RC-2026-000001",
      memberId: "AJ-0001",
      memberName: "মো: রফিকুল ইসলাম",
      collectionMonth: "2026-07",
      monthlyAmount: 1000,
      previousDue: 0,
      lateFine: 0,
      discount: 0,
      totalPayable: 1000,
      paidAmount: 1000,
      currentDue: 0,
      paymentMethod: "Cash",
      transactionNo: "CSH-REC-01",
      collectionDate: "2026-07-08",
      receivedBy: "কামাল হোসেন (আদায়কারী)",
      remarks: "জুলাই মাসের নিয়মিত চাঁদা পরিশোধ",
      status: "ACTIVE",
      createdAt: "2026-07-08T09:30:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      collectionId: "COL-002",
      receiptNo: "RC-2026-000002",
      memberId: "AJ-0002",
      memberName: "মাহবুব আলম",
      collectionMonth: "2026-07",
      monthlyAmount: 1000,
      previousDue: 0,
      lateFine: 20,
      discount: 0,
      totalPayable: 1020,
      paidAmount: 1020,
      currentDue: 0,
      paymentMethod: "Mobile Banking",
      transactionNo: "BKASH-9X1245",
      collectionDate: "2026-07-15",
      receivedBy: "কামাল হোসেন (আদায়কারী)",
      remarks: "বিলম্ব ফি সহ জুলাই মাসের চাঁদা গ্রহণ",
      status: "ACTIVE",
      createdAt: "2026-07-15T14:10:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      collectionId: "COL-003",
      receiptNo: "RC-2026-000003",
      memberId: "AJ-0003",
      memberName: "আব্দুল কাদের",
      collectionMonth: "2026-07",
      monthlyAmount: 1000,
      previousDue: 0,
      lateFine: 0,
      discount: 0,
      totalPayable: 1000,
      paidAmount: 1000,
      currentDue: 0,
      paymentMethod: "Cash",
      transactionNo: "CSH-REC-03",
      collectionDate: "2026-07-05",
      receivedBy: "কামাল হোসেন (আদায়কারী)",
      remarks: "জুলাই মাসের চাঁদা",
      status: "ACTIVE",
      createdAt: "2026-07-05T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      collectionId: "COL-004",
      receiptNo: "RC-2026-000004",
      memberId: "AJ-0004",
      memberName: "শফিকুল ইসলাম",
      collectionMonth: "2026-07",
      monthlyAmount: 1000,
      previousDue: 0,
      lateFine: 0,
      discount: 0,
      totalPayable: 1000,
      paidAmount: 1000,
      currentDue: 0,
      paymentMethod: "Cash",
      transactionNo: "CSH-REC-04",
      collectionDate: "2026-07-06",
      receivedBy: "কামাল হোসেন (আদায়কারী)",
      remarks: "জুলাই মাসের চাঁদা",
      status: "ACTIVE",
      createdAt: "2026-07-06T11:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      collectionId: "COL-005",
      receiptNo: "RC-2026-000005",
      memberId: "AJ-0005",
      memberName: "কামাল হোসেন",
      collectionMonth: "2026-07",
      monthlyAmount: 1000,
      previousDue: 0,
      lateFine: 0,
      discount: 0,
      totalPayable: 1000,
      paidAmount: 1000,
      currentDue: 0,
      paymentMethod: "Cash",
      transactionNo: "CSH-REC-05",
      collectionDate: "2026-07-09",
      receivedBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      remarks: "জুলাই মাসের চাঁদা",
      status: "ACTIVE",
      createdAt: "2026-07-09T16:00:00.000Z",
      syncStatus: "LOCAL",
    },
  ];

  const loans: LoanApplication[] = [
    {
      loanId: "LN-2026-000001",
      memberId: "AJ-0005",
      memberName: "কামাল হোসেন",
      applicationDate: "2026-05-10",
      requestedAmount: 30000,
      approvedAmount: 30000,
      purpose: "হার্ডওয়্যার দোকানের মালামাল বৃদ্ধি",
      termMonths: 10,
      interestRatePercentage: 0,
      securityDetails: "দোকানের ট্রেড লাইসেন্স ও ব্যক্তিগত নিশ্চয়তা",
      guarantorMemberId: "AJ-0001",
      guarantorName: "মো: রফিকুল ইসলাম",
      resolutionNo: "RES-2026-000002",
      approvedBy: "মো: রফিকুল ইসলাম (সভাপতি)",
      approvalDate: "2026-05-15",
      disbursementDate: "2026-05-16",
      disbursementVoucherNo: "LN-DISB-01",
      paymentMethod: "Bank",
      repaidPrincipal: 6000,
      repaidProfitOrCharge: 0,
      totalOutstanding: 24000,
      status: "ACTIVE",
      remarks: "১০টি কিস্তিতে পরিশোধযোগ্য কল্যাণ ব্যবসায়িক তহবিল ঋণ",
      createdAt: "2026-05-10T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
    {
      loanId: "LN-2026-000002",
      memberId: "AJ-0004",
      memberName: "শফিকুল ইসলাম",
      applicationDate: "2026-07-20",
      requestedAmount: 20000,
      approvedAmount: 20000,
      purpose: "পারিবারিক গৃহ সংস্কার",
      termMonths: 5,
      interestRatePercentage: 0,
      securityDetails: "সমিতির সদস্যপদ ও জামিনদার",
      guarantorMemberId: "AJ-0003",
      guarantorName: "আব্দুল কাদের",
      resolutionNo: "RES-2026-000004",
      approvedBy: "মো: রফিকুল ইসলাম (সভাপতি)",
      approvalDate: "2026-07-25",
      disbursementDate: "2026-07-26",
      disbursementVoucherNo: "LN-DISB-02",
      paymentMethod: "Cash",
      repaidPrincipal: 0,
      repaidProfitOrCharge: 0,
      totalOutstanding: 20000,
      status: "ACTIVE",
      remarks: "নতুন বিতরণকৃত ঋণ",
      createdAt: "2026-07-20T10:00:00.000Z",
      syncStatus: "LOCAL",
    },
  ];

  const loanRepayments: LoanRepayment[] = [
    {
      repaymentId: "LNR-001",
      loanId: "LN-2026-000001",
      memberId: "AJ-0005",
      memberName: "কামাল হোসেন",
      date: "2026-06-15",
      installmentNo: 1,
      principalAmount: 3000,
      profitOrCharge: 0,
      totalPaid: 3000,
      remainingBalance: 27000,
      paymentMethod: "Cash",
      voucherNo: "LNR-2026-000001",
      remarks: "১ম কিস্তি পরিশোধ",
      receivedBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      createdAt: "2026-06-15T11:00:00.000Z",
      status: "ACTIVE",
    },
    {
      repaymentId: "LNR-002",
      loanId: "LN-2026-000001",
      memberId: "AJ-0005",
      memberName: "কামাল হোসেন",
      date: "2026-07-15",
      installmentNo: 2,
      principalAmount: 3000,
      profitOrCharge: 0,
      totalPaid: 3000,
      remainingBalance: 24000,
      paymentMethod: "Cash",
      voucherNo: "LNR-2026-000002",
      remarks: "২য় কিস্তি পরিশোধ",
      receivedBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      createdAt: "2026-07-15T11:00:00.000Z",
      status: "ACTIVE",
    },
  ];

  const investments: Investment[] = [
    {
      investmentId: "INV-2026-000001",
      investmentDate: "2026-02-01",
      investmentType: "মৌসুমী ধান ক্রয় ও মজুদ প্রকল্প",
      partner: "আতরগাঁও সমন্বিত কৃষি সমবায়",
      description:
        "বোরো মৌসুমের ধান ক্রয় করে গুদামজাতকরণ ও বিক্রয় মুনাফা শেয়ারিং",
      investmentAmount: 50000,
      expectedReturn: 60000,
      actualReturn: 58000,
      profit: 8000,
      loss: 0,
      roiPercentage: 16,
      maturityDate: "2026-06-30",
      status: "RETURNED",
      remarks: "মুনাফা সহ সফলভাবে মূলধন ও লভ্যাংশ ফেরত এসেছে",
      createdAt: "2026-02-01T10:00:00.000Z",
    },
    {
      investmentId: "INV-2026-000002",
      investmentDate: "2026-07-01",
      investmentType: "সমন্বিত মৎস্য চাষ প্রকল্প",
      partner: "সরারচর ফিশারিজ",
      description: "বাণিজ্যিক রুই ও কাতল মাছ চাষে অংশীদারিত্ব",
      investmentAmount: 40000,
      expectedReturn: 48000,
      actualReturn: 0,
      profit: 0,
      loss: 0,
      roiPercentage: 20,
      maturityDate: "2026-12-31",
      status: "ACTIVE",
      remarks: "চলমান ৬ মাস মেয়াদী লাভজনক প্রকল্প",
      createdAt: "2026-07-01T10:00:00.000Z",
    },
  ];

  const cashTransactions: CashTransaction[] = [
    {
      transactionId: "CSH-TX-001",
      date: "2026-01-05",
      voucherNo: "CAP-2026-000001",
      reference: "সদস্য মূলধন",
      description: "সদস্যদের প্রাথমিক মূলধন জমা (নগদ অংশ)",
      accountId: "3000",
      accountName: "সদস্যদের মূলধন তহবিল",
      cashIn: 20000,
      cashOut: 0,
      balance: 20000,
      sourceType: "CAPITAL",
      sourceId: "CAP-INIT",
      createdBy: "তোফায়েল আহমেদ",
      createdAt: "2026-01-05T12:00:00.000Z",
    },
    {
      transactionId: "CSH-TX-002",
      date: "2026-07-05",
      voucherNo: "RC-2026-000001",
      reference: "মাসিক চাঁদা",
      description: "সদস্যদের জুলাই মাসের চাঁদা আদায়",
      accountId: "4000",
      accountName: "মাসিক চাঁদা আয়",
      cashIn: 4000,
      cashOut: 0,
      balance: 24000,
      sourceType: "COLLECTION",
      sourceId: "COL-001",
      createdBy: "কামাল হোসেন",
      createdAt: "2026-07-05T12:00:00.000Z",
    },
    {
      transactionId: "CSH-TX-003",
      date: "2026-07-15",
      voucherNo: "LNR-2026-000002",
      reference: "ঋণ কিস্তি",
      description: "কামাল হোসেনের ঋণের কিস্তি আদায়",
      accountId: "1200",
      accountName: "প্রদত্ত ঋণ হিসাব",
      cashIn: 3000,
      cashOut: 0,
      balance: 27000,
      sourceType: "LOAN_REPAYMENT",
      sourceId: "LNR-002",
      createdBy: "আব্দুল কাদের",
      createdAt: "2026-07-15T12:00:00.000Z",
    },
    {
      transactionId: "CSH-TX-004",
      date: "2026-07-18",
      voucherNo: "EXP-2026-000001",
      reference: "অফিস খরচ",
      description: "সমিতির খাতা, স্ট্যাম্প ও স্টেশনারি ক্রয়",
      accountId: "5000",
      accountName: "দাপ্তরিক ও প্রশাসনিক ব্যয়",
      cashIn: 0,
      cashOut: 1250,
      balance: 25750,
      sourceType: "EXPENSE",
      sourceId: "EXP-001",
      createdBy: "মাহবুব আলম",
      createdAt: "2026-07-18T15:00:00.000Z",
    },
    {
      transactionId: "CSH-TX-005",
      date: "2026-07-26",
      voucherNo: "LN-2026-000002",
      reference: "ঋণ বিতরণ",
      description: "শফিকুল ইসলামকে অনুমোদিত ঋণ প্রদান",
      accountId: "1200",
      accountName: "প্রদত্ত ঋণ হিসাব",
      cashIn: 0,
      cashOut: 20000,
      balance: 5750,
      sourceType: "LOAN_DISBURSEMENT",
      sourceId: "LN-002",
      createdBy: "আব্দুল কাদের",
      createdAt: "2026-07-26T16:00:00.000Z",
    },
  ];

  const bankTransactions: BankTransaction[] = [
    {
      transactionId: "BNK-TX-001",
      date: "2026-01-05",
      reference: "CAP-2026-000002",
      description: "সদস্যদের প্রাথমিক মূলধন জমা (ব্যাংক ডিপোজিট)",
      bankName: "সোনালী ব্যাংক পিএলসি, বাজিতপুর শাখা",
      accountNumberMasked: "****5678",
      deposit: 15000,
      withdrawal: 0,
      balance: 15000,
      transactionNo: "DEP-SB-001",
      sourceType: "CAPITAL",
      sourceId: "CAP-INIT-BNK",
      createdAt: "2026-01-05T12:00:00.000Z",
    },
    {
      transactionId: "BNK-TX-002",
      date: "2026-06-30",
      reference: "INV-2026-000001",
      description:
        "মৌসুমী ধান প্রকল্প থেকে মূলধন ও লভ্যাংশ ব্যাংক একাউন্টে জমা",
      bankName: "সোনালী ব্যাংক পিএলসি, বাজিতপুর শাখা",
      accountNumberMasked: "****5678",
      deposit: 58000,
      withdrawal: 0,
      balance: 73000,
      transactionNo: "EFT-88901",
      sourceType: "INCOME",
      sourceId: "INV-001",
      createdAt: "2026-06-30T14:00:00.000Z",
    },
    {
      transactionId: "BNK-TX-003",
      date: "2026-07-01",
      reference: "INV-2026-000002",
      description: "মৎস্য চাষ প্রকল্পে বিনিয়োগ বাবদ চেক প্রদান",
      bankName: "সোনালী ব্যাংক পিএলসি, বাজিতপুর শাখা",
      accountNumberMasked: "****5678",
      deposit: 0,
      withdrawal: 40000,
      balance: 33000,
      transactionNo: "CHQ-456012",
      sourceType: "EXPENSE",
      sourceId: "INV-002",
      createdAt: "2026-07-01T11:00:00.000Z",
    },
  ];

  const incomes: Income[] = [
    {
      incomeId: "INC-001",
      voucherNo: "INC-2026-000001",
      date: "2026-06-30",
      incomeHead: "Investment Profit",
      amount: 8000,
      paymentMethod: "Bank",
      reference: "INV-2026-000001",
      remarks: "মৌসুমী ধান ব্যবসা প্রকল্পের নিট মুনাফা",
      createdBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      status: "POSTED",
      createdAt: "2026-06-30T14:00:00.000Z",
    },
    {
      incomeId: "INC-002",
      voucherNo: "INC-2026-000002",
      date: "2026-07-15",
      incomeHead: "Late Fine",
      memberId: "AJ-0002",
      memberName: "মাহবুব আলম",
      amount: 20,
      paymentMethod: "Mobile Banking",
      reference: "RC-2026-000002",
      remarks: "জুলাই মাসের বিলম্ব ফি",
      createdBy: "কামাল হোসেন (আদায়কারী)",
      status: "POSTED",
      createdAt: "2026-07-15T14:10:00.000Z",
    },
  ];

  const expenses: Expense[] = [
    {
      expenseId: "EXP-001",
      voucherNo: "EXP-2026-000001",
      date: "2026-07-18",
      expenseHead: "Office",
      payee: "ভাই ভাই স্টেশনারি, বাজিতপুর বাজার",
      amount: 1250,
      paymentMethod: "Cash",
      billNumber: "BILL-8902",
      approvedBy: "মো: রফিকুল ইসলাম (সভাপতি)",
      approvalStatus: "PAID",
      remarks: "লেজার খাতা ও ভাউচার প্যাড প্রিন্ট বাবদ বিল পরিশোধ",
      createdBy: "মাহবুব আলম (সাধারণ সম্পাদক)",
      createdAt: "2026-07-18T15:00:00.000Z",
    },
    {
      expenseId: "EXP-002",
      voucherNo: "EXP-2026-000002",
      date: "2026-07-22",
      expenseHead: "Meeting",
      payee: "জনপ্রিয় হোটেল ও সুইটস",
      amount: 850,
      paymentMethod: "Cash",
      billNumber: "HOTEL-332",
      approvedBy: "মো: রফিকুল ইসলাম (সভাপতি)",
      approvalStatus: "APPROVED",
      remarks: "মাসিক সাধারণ সভার আপ্যায়ন খরচ",
      createdBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      createdAt: "2026-07-22T18:00:00.000Z",
    },
  ];

  const memberLedgers: MemberLedgerEntry[] = [
    {
      ledgerId: "LED-001",
      memberId: "AJ-0001",
      date: "2026-01-05",
      voucherNo: "CAP-2026-000001",
      description: "সদস্য প্রাথমিক মূলধন জমা",
      transactionType: "CAPITAL_DEPOSIT",
      debit: 0,
      credit: 5000,
      balance: 5000,
      sourceType: "CAPITAL",
      sourceId: "CAP-DEP-001",
      createdAt: "2026-01-05T12:00:00.000Z",
    },
    {
      ledgerId: "LED-002",
      memberId: "AJ-0001",
      date: "2026-07-08",
      voucherNo: "RC-2026-000001",
      receiptNo: "RC-2026-000001",
      description: "জুলাই-২০২৬ মাসিক চাঁদা পরিশোধ",
      transactionType: "MONTHLY_COLLECTION",
      debit: 0,
      credit: 1000,
      balance: 6000,
      sourceType: "COLLECTION",
      sourceId: "COL-001",
      createdAt: "2026-07-08T09:30:00.000Z",
    },
    {
      ledgerId: "LED-003",
      memberId: "AJ-0005",
      date: "2026-05-16",
      voucherNo: "LN-DISB-01",
      description: "ব্যবসা সম্প্রসারণ ঋণ বিতরণ",
      transactionType: "LOAN_DISBURSED",
      debit: 30000,
      credit: 0,
      balance: -25000,
      sourceType: "LOAN",
      sourceId: "LN-2026-000001",
      createdAt: "2026-05-16T10:00:00.000Z",
    },
    {
      ledgerId: "LED-004",
      memberId: "AJ-0005",
      date: "2026-06-15",
      voucherNo: "LNR-2026-000001",
      description: "ঋণ কিস্তি নং-১ পরিশোধ",
      transactionType: "LOAN_REPAYMENT",
      debit: 0,
      credit: 3000,
      balance: -22000,
      sourceType: "LOAN_REPAYMENT",
      sourceId: "LNR-001",
      createdAt: "2026-06-15T11:00:00.000Z",
    },
    {
      ledgerId: "LED-005",
      memberId: "AJ-0005",
      date: "2026-07-15",
      voucherNo: "LNR-2026-000002",
      description: "ঋণ কিস্তি নং-২ পরিশোধ",
      transactionType: "LOAN_REPAYMENT",
      debit: 0,
      credit: 3000,
      balance: -19000,
      sourceType: "LOAN_REPAYMENT",
      sourceId: "LNR-002",
      createdAt: "2026-07-15T11:00:00.000Z",
    },
  ];

  const welfareTransactions: WelfareFundTransaction[] = [
    {
      fundId: "WLF-001",
      date: "2026-04-10",
      fundType: "WELFARE",
      income: 5000,
      expense: 0,
      beneficiary: "কল্যাণ তহবিল রিজার্ভেশন",
      reason: "সমিতির বার্ষিক মুনাফা হতে কল্যাণ তহবিলে বরাদ্দ",
      amount: 5000,
      approvedByPresident: true,
      approvedBySecretary: true,
      approvedByTreasurer: true,
      approvalStatus: "APPROVED",
      resolutionNo: "RES-2026-000001",
      voucherNo: "WLF-INC-01",
      remarks: "২৫% নির্ধারিত মুনাফা স্থানান্তর",
      createdAt: "2026-04-10T10:00:00.000Z",
    },
    {
      fundId: "WLF-002",
      date: "2026-06-12",
      fundType: "EMERGENCY",
      income: 0,
      expense: 3000,
      beneficiary: "আতরগাঁও গ্রামের একজন অসুস্থ দুস্থ সদস্যের চিকিৎসা সহায়তা",
      memberId: "AJ-0006",
      memberName: "আনোয়ার হোসেন",
      reason: "হৃদরোগের জরুরি অপারেশন সহায়তা অনুদান",
      amount: 3000,
      approvedByPresident: true,
      approvedBySecretary: true,
      approvedByTreasurer: true,
      approvalStatus: "APPROVED",
      resolutionNo: "RES-2026-000003",
      voucherNo: "EMG-EXP-01",
      remarks: "৩ জনের আনুষ্ঠানিক স্বাক্ষরে অনুমোদিত জরুরি অনুদান",
      createdAt: "2026-06-12T14:30:00.000Z",
    },
  ];

  const meetings: Meeting[] = [
    {
      meetingId: "MTG-001",
      meetingNo: "M-2026/01",
      date: "2026-01-02",
      time: "04:30 PM",
      location: "আতরগাঁও জাগরণী ক্লাব কার্যনির্বাহী কার্যালয়",
      meetingType: "EXECUTIVE_COMMITTEE",
      agenda:
        "১. নতুন বছরের বাজেট ও চাঁদা আদায় নীতি নির্ধারণ২. ব্যবসায়িক তহবিল বিনিয়োগ পরিকল্পনা",
      chairperson: "মো: রফিকুল ইসলাম (সভাপতি)",
      secretary: "মাহবুব আলম (সাধারণ সম্পাদক)",
      minutes:
        "সর্বসম্মতিক্রমে মাসিক চাঁদা ১,০০০ টাকা এবং ১০ তারিখের মধ্যে পরিশোধের সিদ্ধান্ত গৃহীত হয়।",
      status: "HELD",
      attendees: [
        {
          memberId: "AJ-0001",
          memberName: "মো: রফিকুল ইসলাম",
          status: "PRESENT",
        },
        { memberId: "AJ-0002", memberName: "মাহবুব আলম", status: "PRESENT" },
        { memberId: "AJ-0003", memberName: "আব্দুল কাদের", status: "PRESENT" },
        { memberId: "AJ-0004", memberName: "শফিকুল ইসলাম", status: "PRESENT" },
        { memberId: "AJ-0005", memberName: "কামাল হোসেন", status: "PRESENT" },
        {
          memberId: "AJ-0006",
          memberName: "আনোয়ার হোসেন",
          status: "LATE",
          remarks: "১৫ মিনিট বিলম্বে উপস্থিত",
        },
        {
          memberId: "AJ-0007",
          memberName: "মো: জসীম উদ্দিন",
          status: "ABSENT",
          remarks: "অসুস্থতার কারণে অনুপস্থিত",
        },
      ],
      createdAt: "2026-01-02T16:30:00.000Z",
    },
    {
      meetingId: "MTG-002",
      meetingNo: "M-2026/02",
      date: "2026-07-20",
      time: "05:00 PM",
      location: "আতরগাঁও প্রাথমিক বিদ্যালয় মাঠ সংলগ্ন ক্লাব ভবন",
      meetingType: "GENERAL",
      agenda: "১. অর্ধবার্ষিকী আয়-ব্যয় পর্যালোচনা২. সদস্য ঋণ আবেদন অনুমোদন",
      chairperson: "মো: রফিকুল ইসলাম (সভাপতি)",
      secretary: "মাহবুব আলম (সাধারণ সম্পাদক)",
      minutes:
        "শফিকুল ইসলামের ২০,০০০ টাকা ঋণ আবেদন সর্বসম্মতিক্রমে অনুমোদিত হয়।",
      status: "HELD",
      attendees: [
        {
          memberId: "AJ-0001",
          memberName: "মো: রফিকুল ইসলাম",
          status: "PRESENT",
        },
        { memberId: "AJ-0002", memberName: "মাহবুব আলম", status: "PRESENT" },
        { memberId: "AJ-0003", memberName: "আব্দুল কাদের", status: "PRESENT" },
        { memberId: "AJ-0004", memberName: "শফিকুল ইসলাম", status: "PRESENT" },
        { memberId: "AJ-0005", memberName: "কামাল হোসেন", status: "PRESENT" },
      ],
      createdAt: "2026-07-20T17:00:00.000Z",
    },
  ];

  const resolutions: Resolution[] = [
    {
      resolutionId: "RES-001",
      resolutionNo: "RES-2026-000001",
      meetingId: "MTG-001",
      meetingNo: "M-2026/01",
      date: "2026-01-02",
      subject: "কল্যাণ ও জরুরি তহবিলে অর্থ বরাদ্দ অনুমোদন",
      decision:
        "সমিতির সংরক্ষিত তহবিল হতে প্রাথমিক কল্যাণ তহবিলে ৫,০০০ টাকা স্থানান্তরের অনুমোদন দেওয়া হলো।",
      proposedBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      secondedBy: "মাহবুব আলম (সাধারণ সম্পাদক)",
      voteResult: "সর্বসম্মত (৭/৭)",
      approved: true,
      implementationStatus: "COMPLETED",
      responsiblePerson: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      remarks: "বাস্তবায়ন সম্পন্ন হয়েছে",
      createdAt: "2026-01-02T18:00:00.000Z",
    },
    {
      resolutionId: "RES-002",
      resolutionNo: "RES-2026-000002",
      meetingId: "MTG-001",
      meetingNo: "M-2026/01",
      date: "2026-05-15",
      subject: "কামাল হোসেনের ৩০,০০০ টাকা ব্যবসায়িক ঋণ অনুমোদন",
      decision:
        "সদস্য কামাল হোসেনকে হার্ডওয়্যার সামগ্রী ক্রয়ের জন্য ১০ মাস মেয়াদী ৩০,০০০ টাকা ঋণ অনুমোদন করা হলো।",
      proposedBy: "মো: রফিকুল ইসলাম (সভাপতি)",
      secondedBy: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      voteResult: "সর্বসম্মত",
      approved: true,
      implementationStatus: "COMPLETED",
      deadline: "2026-05-20",
      responsiblePerson: "আব্দুল কাদের (কোষাধ্যক্ষ)",
      remarks: "টাকা ব্যাংক একাউন্টে ট্রান্সফার করা হয়েছে",
      createdAt: "2026-05-15T18:00:00.000Z",
    },
    {
      resolutionId: "RES-003",
      resolutionNo: "RES-2026-000003",
      meetingId: "MTG-002",
      meetingNo: "M-2026/02",
      date: "2026-07-20",
      subject: "বকেয়া সদস্য জসীম উদ্দিনের চাঁদা আদায় নোটিশ প্রেরণ",
      decision:
        "৬ মাসের অধিক বকেয়া থাকা সদস্য মো: জসীম উদ্দিনকে ৭ দিনের মধ্যে বকেয়া পরিশোধের নোটিশ দেওয়ার সিদ্ধান্ত।",
      proposedBy: "কামাল হোসেন (আদায়কারী)",
      secondedBy: "মাহবুব আলম (সাধারণ সম্পাদক)",
      voteResult: "পাস",
      approved: true,
      implementationStatus: "IN_PROGRESS",
      deadline: "2026-08-30",
      responsiblePerson: "মাহবুব আলম (সাধারণ সম্পাদক)",
      remarks: "নোটিশ প্রস্তুত হচ্ছে",
      createdAt: "2026-07-20T19:00:00.000Z",
    },
  ];

  return {
    ...db,
    settings: { ...db.settings, isDemoMode: true },
    members,
    capitalDeposits,
    collections,
    loans,
    loanRepayments,
    investments,
    cashTransactions,
    bankTransactions,
    incomes,
    expenses,
    memberLedgers,
    welfareTransactions,
    meetings,
    resolutions,
    memberExits: [
      {
        exitRequestId: "ER-2026-001",
        memberId: "AJ-0003",
        requestDate: "2026-08-10",
        exitType: "NORMAL",
        exitReason: "ব্যবসায়িক কারণে অন্য এলাকায় স্থানান্তর",
        membershipTenureYears: 3,
        membershipTenureMonths: 7,
        memberCapital: 36000,
        totalDeposits: 36000,
        outstandingDue: 0,
        outstandingLoan: 0,
        eligibleRefundAmount: 36000,
        serviceChargePercentage: 15,
        serviceChargeAmount: 5400,
        netRefundAmount: 30600,
        status: "UNDER_REVIEW",
        requestedBy: "USR-02",
        userId: "USR-02",
        userName: "মাহবুব আলম (ম্যানেজার)",
        createdAt: "2026-08-10T10:00:00.000Z",
        updatedAt: "2026-08-11T11:30:00.000Z"
      },
      {
        exitRequestId: "ER-2026-002",
        memberId: "AJ-0004",
        requestDate: "2026-08-12",
        exitType: "EARLY",
        exitReason: "জরুরি পারিবারিক প্রয়োজনে সদস্যপদ প্রত্যাহার",
        membershipTenureYears: 2,
        membershipTenureMonths: 3,
        memberCapital: 24000,
        totalDeposits: 24000,
        outstandingDue: 0,
        outstandingLoan: 0,
        eligibleRefundAmount: 24000,
        serviceChargePercentage: 15,
        serviceChargeAmount: 3600,
        netRefundAmount: 20400,
        status: "UNDER_REVIEW",
        requestedBy: "USR-02",
        userId: "USR-02",
        userName: "মাহবুব আলম (ম্যানেজার)",
        createdAt: "2026-08-12T09:15:00.000Z",
        updatedAt: "2026-08-13T14:00:00.000Z"
      },
      {
        exitRequestId: "ER-2026-003",
        memberId: "AJ-0005",
        requestDate: "2026-08-14",
        exitType: "DEATH_SETTLEMENT",
        exitReason: "সদস্যের অকাল প্রয়াণ জনিত মৃত্যু নিষ্পত্তি দাবি",
        dateOfDeath: "2026-08-05",
        nomineeName: "মোসা: ফারহানা আক্তার",
        nomineeRelation: "স্ত্রী",
        nomineeNid: "19904810612000004",
        nomineeMobile: "01811334456",
        nomineeAddress: "আতরগাঁও পশ্চিমপাড়া, বাজিতপুর",
        eligibleBenefitAmount: 10000,
        membershipTenureYears: 3,
        membershipTenureMonths: 7,
        memberCapital: 30000,
        totalDeposits: 30000,
        outstandingDue: 0,
        outstandingLoan: 0,
        eligibleRefundAmount: 40000,
        serviceChargePercentage: 0,
        serviceChargeAmount: 0,
        netRefundAmount: 40000,
        netSettlementAmount: 40000,
        status: "UNDER_REVIEW",
        requestedBy: "USR-02",
        userId: "USR-02",
        userName: "মাহবুব আলম (ম্যানেজার)",
        createdAt: "2026-08-14T11:00:00.000Z",
        updatedAt: "2026-08-15T16:20:00.000Z"
      }
    ],
    auditLogs: [
      ...db.auditLogs,
      {
        auditId: `AUD-${Date.now()}`,
        userId: "USR-01",
        userName: "তোফায়েল আহমেদ (সুপার এডমিন)",
        dateTime: new Date().toISOString(),
        module: "DEMO",
        action: "CREATE",
        recordId: "DEMO_DATA",
        remarks: "সিস্টেমে পরীক্ষামূলক ডেমো ডেটা লোড করা হয়েছে",
      },
    ],
  };
}
