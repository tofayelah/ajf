// AJ Welfare Society - Complete Domain Models & Types

export type MemberStatus =
  | "PENDING"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "RESIGNED"
  | "DECEASED"
  | "TERMINATED"
  | "EXIT_REQUESTED"
  | "EXIT_UNDER_REVIEW"
  | "EXIT_APPROVED"
  | "EXITED"
  | "EXIT_REJECTED";

export type PaymentMethod = "Cash" | "Bank" | "Mobile Banking" | "Other";

export type LoanStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "ACTIVE"
  | "PARTIALLY_PAID"
  | "COMPLETED"
  | "DEFAULT"
  | "CANCELLED";

export type InvestmentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PROPOSED"
  | "APPROVED"
  | "ACTIVE"
  | "PARTIAL_RETURN"
  | "COMPLETED"
  | "MATURED"
  | "RETURNED"
  | "LOSS"
  | "REJECTED"
  | "CANCELLED";

export type ExpenseStatus = "DRAFT" | "SUBMITTED" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "REJECTED" | "PAID" | "REVERSED" | "CANCELLED";

export type FundType = "WELFARE" | "EMERGENCY" | "RESERVE";

export type MeetingType =
  "GENERAL" | "EXECUTIVE_COMMITTEE" | "ANNUAL_GENERAL" | "SPECIAL_EMERGENCY" | "EXECUTIVE_MONTHLY";

export type MeetingStatus = "PLANNED" | "HELD" | "CANCELLED" | "POSTPONED";

export type ResolutionStatus =
  "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type FinancialYearStatus = "OPEN" | "CLOSING" | "CLOSED";

export type SyncStatus = "LOCAL" | "SYNCED" | "PENDING" | "FAILED";

export type UserRole =
  | "ADMIN"
  | "ACCOUNTANT"
  | "COLLECTION_OFFICER"
  | "AUDITOR"
  | "MEMBER";

export type AuditAction = 
  | "FACTORY_RESET_EXECUTED"
  | "NORMAL_EXIT_REQUESTED"
  | "NORMAL_EXIT_REVIEWED"
  | "NORMAL_EXIT_APPROVED"
  | "NORMAL_EXIT_REJECTED"
  | "NORMAL_EXIT_REFUNDED"
  | "EARLY_EXIT_REQUESTED"
  | "EARLY_EXIT_REVIEWED"
  | "EARLY_EXIT_APPROVED"
  | "EARLY_EXIT_REJECTED"
  | "EARLY_EXIT_REFUNDED"
  | "DEATH_REPORTED"
  | "DEATH_SETTLEMENT_REVIEWED"
  | "DEATH_SETTLEMENT_APPROVED"
  | "DEATH_SETTLEMENT_REJECTED"
  | "DEATH_SETTLEMENT_COMPLETED" 
  | "SETTLEMENT_REVIEW_STARTED"
  | "SETTLEMENT_REVIEWED"
  | "SETTLEMENT_APPROVED"
  | "SETTLEMENT_REJECTED"
  | "SETTLEMENT_COMPLETED"
  | "DELETE_DRAFT"
  | "CORRECT"
  | "REVERSE"
  | "POST"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ROLE_CHANGED"
  | "USER_DISABLED"
  | "USER_ENABLED"
  | "USER_LOCKED"
  | "USER_UNLOCKED"
  | "USER_PASSWORD_RESET"
  | "USER_PIN_RESET"
  | "RECEIPT_PREFIX_UPDATED"
  | "VOUCHER_PREFIX_UPDATED"
  | "MEMBER_ID_PREFIX_UPDATED"
  | "NOTIFICATION_SETTINGS_UPDATED" 
  | "FINANCIAL_YEAR_CLOSING_STARTED"
  | "FINANCIAL_YEAR_CLOSED"
  | "MEMBER_EXIT_REQUESTED"
  | "MEMBER_EXIT_REVIEW_STARTED"
  | "MEMBER_EXIT_APPROVED"
  | "MEMBER_EXIT_REJECTED"
  | "MEMBER_EXIT_COMPLETED"
  | "OPENING_BALANCE_CARRIED_FORWARD" 
  | "FINANCIAL_YEAR_CREATED"
  | "FINANCIAL_YEAR_ACTIVATED"
  | "FINANCIAL_YEAR_UPDATED" 
  | "CASH_RECONCILIATION_CREATED"
  | "CASH_RECONCILIATION_SUBMITTED"
  | "CASH_RECONCILIATION_APPROVED"
  | "CASH_RECONCILIATION_CANCELLED"
  | "BANK_RECONCILIATION_CREATED"
  | "BANK_RECONCILIATION_SUBMITTED"
  | "BANK_RECONCILIATION_APPROVED"
  | "BANK_RECONCILIATION_CANCELLED"
  | "BANK_TRANSACTION_MATCHED"
  | "BANK_TRANSACTION_UNMATCHED"
  | "CONTRA_CREATED"
  | "CONTRA_UPDATED"
  | "CONTRA_DELETED"
  | "CONTRA_POSTED"
  | "CONTRA_ENTRY_POSTED"
  | "CONTRA_REVERSED"
  | "CONTRA_CORRECTED"
  | "CONTRA_DRAFT_CREATED"
  | "CONTRA_DRAFT_UPDATED"
  | "CONTRA_DRAFT_DELETED"
  | "CONTRA_DRAFT_POSTED"
  | "CASH_TRANSACTION_DRAFT_CREATED"
  | "CASH_TRANSACTION_DRAFT_UPDATED"
  | "CASH_TRANSACTION_DRAFT_DELETED"
  | "CASH_TRANSACTION_POSTED"
  | "CASH_TRANSACTION_REVERSED"
  | "BANK_ACCOUNT_CREATED"
  | "BANK_ACCOUNT_UPDATED"
  | "BANK_ACCOUNT_ACTIVATED"
  | "BANK_ACCOUNT_DEACTIVATED"
  | "CASH_RECONCILIATION_CREATED"
  | "CASH_RECONCILIATION_SUBMITTED"
  | "CASH_RECONCILIATION_REVIEW_STARTED"
  | "CASH_RECONCILIATION_APPROVED"
  | "CASH_RECONCILIATION_REJECTED"
  | "CASH_RECONCILIATION_RECONCILED"
  | "CASH_RECONCILIATION_DRAFT_DELETED"
  | "BANK_RECONCILIATION_CREATED"
  | "BANK_RECONCILIATION_SUBMITTED"
  | "BANK_RECONCILIATION_REVIEW_STARTED"
  | "BANK_RECONCILIATION_APPROVED"
  | "BANK_RECONCILIATION_REJECTED"
  | "BANK_RECONCILIATION_RECONCILED"
  | "BANK_RECONCILIATION_DRAFT_DELETED"
  | "CREATE"
  | "UPDATE"
  | "DELETE_REQUEST"
  | "APPROVE"
  | "REJECT"
  | "POST"
  | "CANCEL"
  | "REVERSE"
  | "ATTACHMENT_ADDED"
  | "ATTACHMENT_ARCHIVED"
  | "ATTENDANCE_UPDATED"
  | "RESERVE_REQUESTED"
  | "RESERVE_REVIEW_STARTED"
  | "RESERVE_APPROVED"
  | "RESERVE_REJECTED"
  | "RESERVE_PAID"
  | "RESERVE_PAYMENT_COMPLETED"
  | "RESERVE_CANCELLED"
  | "PROFIT_FINALIZATION_STARTED"
  | "PROFIT_FINALIZATION_REJECTED"
  | "PROFIT_FINALIZED"
  | "MEMBER_DELETED"
  | "MEMBER_DEACTIVATED"
  | "MEMBER_REACTIVATED"
  | "MEMBER_ACCOUNT_DISABLED"
  | "MEMBER_PHOTO_ADDED"
  | "MEMBER_PHOTO_CHANGED"
  | "MEMBER_PHOTO_REMOVED"
  | "ORGANIZATION_LOGO_ADDED"
  | "ORGANIZATION_LOGO_CHANGED"
  | "ORGANIZATION_LOGO_REMOVED"
  | "INVESTMENT_CREATED"
  | "INVESTMENT_UPDATED"
  | "INVESTMENT_APPROVED"
  | "INVESTMENT_REJECTED"
  | "INVESTMENT_EXECUTED"
  | "INVESTMENT_RETURNED"
  | "INVESTMENT_PROFIT_RECEIVED"
  | "INVESTMENT_CANCELLED"
  | "INVESTMENT_DELETED"
  | "INVESTMENT_COMPLETED"
  | "WELFARE_TRANSACTION_CREATED"
  | "WELFARE_TRANSACTION_UPDATED"
  | "WELFARE_TRANSACTION_DELETED"
  | "WELFARE_TRANSACTION_REVERSED"

  | "LOGIN"
  | "LOGOUT"
  | "BACKUP"
  | "RESTORE";

export type AccountCategory =
  "Asset" | "Liability" | "Member Capital" | "Income" | "Expense";

export interface Nominee {
  nomineeId: string;
  memberId: string;
  name: string;
  relation: string;
  mobile: string;
  nid: string;
  address: string;
  percentage: number;
  remarks?: string;
}

export interface Member {
  id?: string; // Compatibility alias
  memberId: string; // e.g. AJ-0001
  membershipNo: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  nid: string;
  occupation: string;
  maritalStatus: string;
  gender?: string;
  spouseName?: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  presentAddress: string;
  permanentAddress: string;
  nationality?: string;
  education?: string;
  educationalQualification?: string;
  bloodGroup: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  joiningDate: string;
  admissionDate?: string;
  photoPath?: string;
  photoUrl?: string;
  photo?: string;
  status: MemberStatus;
  remarks?: string;
  nominees: Nominee[];
  totalCollectionPaid?: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Admission {
  admissionId: string;
  memberId: string;
  applicationDate: string;
  approvalDate?: string;
  admissionFee: number;
  capitalDeposit: number;
  paymentMethod: PaymentMethod;
  transactionNo: string;
  approvedBy?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  remarks?: string;
  createdAt: string;
}

export interface Collection {
  collectionId: string;
  receiptNo: string; // RC-2026-000001
  memberId: string;
  memberName: string;
  collectionMonth: string; // YYYY-MM
  monthlyAmount: number;
  previousDue: number;
  lateFine: number;
  lateFeeWaived?: boolean;
  isLateFineOnly?: boolean;
  late_fee_waived?: boolean;
  discount: number;
  totalPayable: number;
  paidAmount: number;
  currentDue: number;
  paymentMethod: PaymentMethod;
  transactionNo: string;
  collectionDate: string;
  receivedBy: string;
  remarks?: string;
  status?: "ACTIVE" | "POSTED" | "CANCELLED" | "REVERSED";
  reversedReason?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface LateFeeWaiver {
  waiverId: string; // e.g. WVR-REC-2026-000006-2026-06
  memberId: string;
  memberName: string;
  collectionId: string;
  receiptNo: string;
  collectionMonth: string; // YYYY-MM
  calculatedLateFee: number;
  waivedAmount: number;
  collectedLateFee: number;
  waiverDate: string; // YYYY-MM-DD
  reason: string;
  approvedBy: string;
  approvedByUserId?: string;
  remarks?: string;
  status: "ACTIVE" | "CANCELLED" | "REVERSED";
  financialYearId?: string;
  createdAt: string;
  sourceType: string; // 'COLLECTION' | 'BULK_COLLECTION'
  sourceId: string;
}

export interface CapitalDeposit {
  depositId: string;
  voucherNo: string; // CAP-2026-000001
  date: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionNo: string;
  remarks?: string;
  createdBy: string;
  status?: "ACTIVE" | "POSTED" | "CANCELLED" | "REVERSED";
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface LoanApplication {
  loanId: string; // LN-2026-000001
  memberId: string;
  memberName: string;
  applicationDate: string;
  requestedAmount: number;
  appliedAmount?: number;
  approvedAmount?: number;
  purpose: string;
  termMonths: number;
  durationMonths?: number;
  interestRatePercentage: number;
  interestRate?: number;
  monthlyInstallment?: number;
  securityDetails?: string;
  guarantorMemberId?: string;
  guarantorName?: string;
  guarantor1Name?: string;
  guarantor2Name?: string;
  resolutionNo?: string;
  approvedBy?: string;
  approvalDate?: string;
  disbursementDate?: string;
  disbursementVoucherNo?: string;
  paymentMethod?: PaymentMethod;
  repaidPrincipal: number;
  repaidProfitOrCharge: number;
  totalOutstanding: number;
  status: LoanStatus;
  remarks?: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export interface LoanRepayment {
  repaymentId: string;
  loanId: string;
  memberId: string;
  memberName: string;
  date: string;
  installmentNo: number;
  principalAmount: number;
  profitOrCharge: number;
  totalPaid: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  voucherNo: string;
  remarks?: string;
  receivedBy: string;
  createdAt: string;
  status?: "ACTIVE" | "POSTED" | "CANCELLED" | "REVERSED";
}

export interface Investment {
  id?: string; // Compatibility alias
  investmentId: string; // INV-2026-000001
  projectName?: string;
  projectType?: string;
  investmentDate: string;
  investmentType: string;
  partner: string;
  description: string;
  investmentAmount: number; // For backward compat, maps to originalPrincipal
  originalPrincipal?: number;
  returnedPrincipal?: number;
  outstandingPrincipal?: number;
  approvedAmount?: number;
  approvedBy?: string;
  approvalDate?: string;
  approvedAt?: string;
  approvalRemarks?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  expectedReturn: number;
  actualReturn: number; // For backward compat, might map to profit or total
  profit: number;
  loss: number;
  roiPercentage: number;
  maturityDate: string;
  status: InvestmentStatus;
  documentPath?: string;
  remarks?: string;
  createdAt: string;
}

export interface ChartAccount {
  accountCode: string; // e.g. 1000
  accountName: string;
  banglaName: string;
  category: AccountCategory;
  group?: string;
  normalBalance?: "DEBIT" | "CREDIT";
  description?: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface CashTransaction {
  transactionId: string;
  date: string;
  voucherNo: string;
  reference?: string;
  description: string;
  accountId?: string;
  accountName?: string;
  cashIn: number;
  cashOut: number;
  balance?: number;
  status?: 'DRAFT' | 'POSTED' | 'ACTIVE' | 'CANCELLED' | 'REVERSED';
  enteredByUserId?: string;
  enteredByUserName?: string;
  enteredAt?: string;
  postedByUserId?: string;
  postedByUserName?: string;
  postedAt?: string;
  originalTransactionId?: string;
  reversalTransactionId?: string;
  reversedByUserId?: string;
  reversedByUserName?: string;
  reversedAt?: string;
  reversalReason?: string;
  reconciled?: boolean;
  isReconciliationLocked?: boolean;
  sourceType?:
    | "ADMISSION"
    | "COLLECTION"
    | "CAPITAL"
    | "LOAN_DISBURSEMENT"
    | "LOAN_REPAYMENT"
    | "INCOME"
    | "EXPENSE"
    | "WELFARE"
    | "RESERVE_UTILIZATION"
    | "CONTRA"
    | "MANUAL"
    | "MEMBER_EXIT";
  sourceId?: string;
  memberId?: string;
  accountCode?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface BankAccount {
  id: string; // e.g. "BA-001" or unique ID
  accountId?: string; // Compatibility alias
  accountNo?: string; // Compatibility alias
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string;
  accountType?: string; // "CURRENT" | "SAVINGS" | "STD" | "FDR" | "ISLAMIC" | "OTHER"
  openingBalance: number;
  openingDate?: string;
  financialYearId?: string;
  status: "ACTIVE" | "INACTIVE";
  remarks?: string;
  routingNumber?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  currentBalance?: number;
}

export type ContraType = "CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_TO_BANK";

export type ContraStatus = "DRAFT" | "POSTED" | "REVERSED" | "REVERSAL" | "ACTIVE";

export interface ContraTransaction {
  id: string; // e.g. "CON-TX-001" or "CON-REV-001"
  idempotencyKey?: string; // Used to prevent double submissions
  voucherNo: string; // e.g. "CON-2026-000001" or "REV-CON-2026-000001"
  date: string;
  type: ContraType;
  fromAccountType: "CASH" | "BANK";
  fromAccountId?: string; // BankAccount.id or "CASH"
  fromAccountName: string;
  fromAccountNumber?: string;
  toAccountType: "CASH" | "BANK";
  toAccountId?: string; // BankAccount.id or "CASH"
  toAccountName: string;
  toAccountNumber?: string;
  amount: number;
  transactionNo?: string; // Deposit Slip / Cheque No / Ref No
  reference?: string;
  particulars?: string;
  remarks?: string;
  financialYear: string;
  journalEntryId?: string;
  status: ContraStatus;
  originalTransactionId?: string; // If this is a reversal entry, points to original
  reversedTransactionId?: string; // If this is a reversal entry, points to original
  reversalTransactionId?: string; // If this was reversed, points to the reversal transaction
  reversalVoucherNo?: string; // Voucher number of reversal
  reversedReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  reconciled?: boolean;
  isReconciliationLocked?: boolean;
  enteredBy?: string;
  enteredByName?: string;
  enteredAt?: string;
  postedBy?: string;
  postedByName?: string;
  postedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ContraEntry = ContraTransaction;

export interface BankTransaction {
  transactionId: string;
  bankAccountId?: string;
  date: string;
  reference: string;
  description: string;
  bankName: string;
  accountNumberMasked: string;
  deposit: number;
  withdrawal: number;
  balance: number;
  transactionNo: string;
  sourceType:
    | "COLLECTION"
    | "CAPITAL"
    | "LOAN_DISBURSEMENT"
    | "LOAN_REPAYMENT"
    | "INCOME"
    | "EXPENSE"
    | "WELFARE"
    | "RESERVE_UTILIZATION"
    | "CONTRA"
    | "MANUAL";
  sourceId: string;
  createdAt: string;
}

export type IncomeStatus = "DRAFT" | "POSTED" | "REVERSED" | "CANCELLED";

export interface Income {
  incomeId: string;
  voucherNo: string; // INC-2026-000001
  date: string;
  incomeHead: string;
  memberId?: string;
  memberName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  reference: string;
  remarks?: string;
  createdBy: string;
  status: IncomeStatus;
  createdAt: string;

  // Correction/Reversal Tracking
  correctionStatus?: "ORIGINAL" | "CORRECTION" | "REVERSED";
  correctedFromId?: string;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
  reversalJournalEntryId?: string;
  correctionJournalEntryId?: string;
}

export interface Expense {
  expenseId: string;
  idempotencyKey?: string;
  voucherNo: string; // EXP-2026-000001
  date: string;
  expenseHead: string;
  payee: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankAccountId?: string;
  billNumber?: string;
  attachmentPath?: string;
  approvedBy?: string;
  approvalStatus: ExpenseStatus;
  remarks?: string;
  createdBy: string;
  createdAt: string;

  // Correction/Reversal Tracking
  correctionStatus?: "ORIGINAL" | "CORRECTION" | "REVERSED";
  correctedFromId?: string;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
  reversalJournalEntryId?: string;
  correctionJournalEntryId?: string;
}

export interface MemberLedgerEntry {
  ledgerId: string;
  memberId: string;
  date: string;
  voucherNo: string;
  receiptNo?: string;
  description: string;
  transactionType:
    | "ADMISSION"
    | "CAPITAL_DEPOSIT"
    | "MONTHLY_COLLECTION"
    | "LATE_FINE"
    | "LOAN_DISBURSED"
    | "LOAN_REPAYMENT"
    | "PROFIT_SHARE"
    | "WELFARE_GRANT"
    | "REVERSAL"
    | "OTHER"
    | "MEMBER_EXIT";
  debit: number; // Member dues / outflows
  credit: number; // Member payments / deposits
  balance: number; // Net position
  reference?: string;
  status?: "ACTIVE" | "POSTED" | "CANCELLED" | "REVERSED";
  sourceType: string;
  sourceId: string;
  createdAt: string;
}

export interface WelfareFundTransaction {
  fundId: string;
  id?: string;
  date: string;
  fundType: FundType;
  income: number;
  expense: number;
  beneficiary: string;
  beneficiaryName?: string;
  beneficiaryMobile?: string;
  beneficiaryAddress?: string;
  beneficiaryType?: "MEMBER" | "NON_MEMBER";
  memberId?: string;
  memberName?: string;
  reason: string;
  purpose?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  transactionNumber?: string;
  approvedBy?: string;
  approvedByPresident?: boolean;
  approvedBySecretary?: boolean;
  approvedByTreasurer?: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";
  status?: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REVERSED" | "PAID" | "PENDING";
  resolutionNo?: string;
  voucherNo: string;
  remarks?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AnnualProfitAllocation {
  yearId: string;
  financialYear: string;
  netProfit: number;
  welfarePercentage: number;
  welfareAmount: number;
  emergencyPercentage: number;
  emergencyAmount: number;
  reservePercentage: number;
  reserveAmount: number;
  memberPercentage: number;
  memberDistributionAmount: number;
  totalEligibleCapital: number;
  status: "DRAFT" | "APPROVED" | "DISTRIBUTED";
  approvedDate?: string;
  distributionList: {
    memberId: string;
    memberName: string;
    memberCapital: number;
    sharePercentage: number;
    allocatedProfit: number;
    paidStatus: "PENDING" | "PAID";
    paymentDate?: string;
  }[];
  createdAt: string;
}

export interface Meeting {
  meetingId: string;
  meetingNo: string;
  title?: string;
  date: string;
  time: string;
  location: string;
  venue?: string;
  meetingType: MeetingType;
  agenda: string;
  agendas?: string | string[];
  chairperson: string;
  presidedBy?: string;
  secretary: string;
  minutes?: string;
  status: MeetingStatus;
  attendees: {
    memberId: string;
    memberName: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];
  attendances?: {
    memberId: string;
    memberName?: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    remarks?: string;
  }[];
  createdAt: string;
}

export interface Resolution {
  resolutionId: string;
  resolutionNo: string; // RES-2026-000001
  meetingId: string;
  meetingNo: string;
  title?: string;
  date: string;
  subject: string;
  decision: string;
  proposedBy: string;
  proposer?: string;
  secondedBy: string;
  seconder?: string;
  voteResult: string;
  approved: boolean;
  implementationStatus: ResolutionStatus;
  status?: any;
  deadline?: string;
  targetDate?: string;
  responsiblePerson: string;
  assignedTo?: string;
  attachments?: string[];
  remarks?: string;
  createdAt: string;
}

export interface AuditLog {
  auditId: string;
  userId: string;
  userName: string;
  dateTime: string;
  module: string;
  action: AuditAction;
  recordId: string;
  oldValue?: string;
  newValue?: string;
  remarks: string;
}

export interface AppSetting {
  orgName: string;
  orgLogoUrl?: string;
  orgNameBangla: string;
  orgShortName: string;
  slogan: string;
  sloganEnglish: string;
  address: string;
  location: string;
  phone: string;
  email: string;
  lastBackupDate?: string;
  currentFinancialYear: string;
  admissionFee: number;
  capitalDeposit: number;
  monthlyContribution: number;
  lateFine: number;
  latePaymentDay: number;
  profitWelfarePercent: number;
  profitEmergencyPercent: number;
  profitReservePercent: number;
  profitMemberPercent: number;
  receiptPrefix: string;
  voucherPrefix: string;
  memberIdPrefix: string;
  loanPrefix: string;
  investmentPrefix: string;
  resolutionPrefix: string;
  currencySymbol: string;
  language: "bn" | "en";
  isDemoMode: boolean;
  requireThreeSignaturesForEmergency: boolean;
  bankAccountMask: string;
  bankName: string;
  bankBranch: string;
  loanInterestRate: number;
  notificationSettings?: {
    dueReminder: boolean;
    loanDueReminder: boolean;
    pendingApprovalAlert: boolean;
    pendingReconciliationAlert: boolean;
    yearClosingAlert: boolean;
    backupReminder: boolean;
  };
  // Official Organization Banking Information (for receipts, PDF reports & official documents)
  organizationBankName?: string;
  organizationAccountName?: string;
  organizationAccountNumber?: string;
  branchName?: string;
  routingNumber?: string;
  swiftCode?: string;
  bankAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  remarks?: string;
  // Official bKash account details for member payments
  companyBkashNumber?: string;
  companyBkashType?: string;
}

export interface UserAccount {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  mobile: string;
  email?: string;
  pinHash: string;
  passwordHash?: string;
  linkedMemberId?: string;
  permissions?: string[];
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "SUSPENDED" | "DISABLED";
  lastLoginAt?: string;
  salt?: string;
  isMigrated?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface JournalEntry {
  id: string;
  journalNo: string;
  date: string;
  reference?: string;
  description: string;
  sourceType: string;
  sourceId: string;
  status?: "ACTIVE" | "POSTED" | "REVERSED" | "CANCELLED";
  createdBy: string;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface Attachment {
  id: string;
  uuid: string;
  entityType:
    "MEMBER" | "EXPENSE" | "INVESTMENT" | "RESOLUTION" | "WELFARE"
    | "RESERVE_UTILIZATION" | "LOAN";
  entityId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uri: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
}


export interface HistoricalProfit {
  id: string;
  financialYear: string;
  netProfit: number;
  welfarePercent: number;
  welfareAmount: number;
  emergencyPercent: number;
  emergencyAmount: number;
  reservePercent: number;
  reserveAmount: number;
  memberDistributionPercent: number;
  memberDistributionAmount: number;
  distributedAmount?: number;
  retainedAmount?: number;
  memberPercent?: number; // Legacy
  memberAmount?: number; // Legacy
  createdDate?: string; // Legacy
  approvedBy?: string; // Legacy
  finalized?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  resolutionNo?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReserveUtilization {
  utilizationId: string;
  date: string;
  amount: number;
  purpose: string;
  description: string;
  requestedBy: string;
  approvedBy?: string;
  resolutionNo?: string;
  paymentMethod: PaymentMethod;
  voucherNo?: string;
  status: "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAID" | "CANCELLED";
  remarks?: string;
  createdAt: string;
}
export type IncomeHead = any;
export type ExpenseHead = any;
export type ExpenseApprovalStatus = any;
export type InvestmentProject = any;
export type Loan = any;
export type MeetingAttendance = any;

export interface CashReconciliation {
  id: string;
  financialYearId: string;
  reconciliationDate: string;
  bookBalance: number;
  physicalCash: number;
  difference: number;
  status: "OPEN" | "SUBMITTED" | "UNDER_REVIEW" | "MATCHED" | "DIFFERENCE" | "APPROVED" | "REJECTED" | "RECONCILED";
  denominationBreakdown?: {
    denomination: number;
    quantity: number;
    amount: number;
  }[];
  explanation?: string;
  preparedBy: string;
  preparedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  rejectionReason?: string;
  remarks?: string;
}

export interface BankReconciliation {
  id: string;
  financialYearId: string;
  bankAccountId: string;
  statementDateFrom: string;
  statementDateTo: string;
  bookOpeningBalance: number;
  bookClosingBalance: number;
  statementOpeningBalance?: number;
  statementClosingBalance?: number;
  matchedAmount: number;
  bookOnlyAmount: number;
  bankOnlyAmount: number;
  difference: number;
  status: "OPEN" | "SUBMITTED" | "UNDER_REVIEW" | "MATCHED" | "DIFFERENCE" | "APPROVED" | "REJECTED" | "RECONCILED";
  explanation?: string;
  preparedBy: string;
  preparedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  rejectionReason?: string;
  remarks?: string;
}

export interface BankStatementTransaction {
  id: string;
  bankReconciliationId: string;
  transactionDate: string;
  transactionNumber?: string;
  description: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  balance?: number;
  reference?: string;
  matchedBookTransactionId?: string;
  matchStatus: "UNMATCHED" | "MATCHED" | "BOOK_ONLY" | "BANK_ONLY";
  remarks?: string;
}

export interface FinancialYear {
  id: string; // e.g. FY-2026-2027
  yearCode: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "ACTIVE" | "CLOSING" | "CLOSED";
  openingBalances?: {
    cash: number;
    bank: number;
    memberCapital: number;
    loanReceivable: number;
    investment: number;
    welfareFund: number;
    emergencyFund: number;
    reserveFund: number;
    retainedProfit: number;
  };
  openedAt?: string;
  openedBy?: string;
  closingStartedAt?: string;
  closingStartedBy?: string;
  openingSourceYear?: string;
  closedAt?: string;
  closedBy?: string;
  remarks?: string;
  createdAt: string;
  createdBy: string;
}


export type ExitType = "NORMAL" | "EARLY" | "DEATH_SETTLEMENT";

export interface MemberExitRequest {
  exitRequestId: string;
  memberId: string;
  requestDate: string;
  exitType: ExitType;
  exitReason: string;
  
  // Financials
  membershipTenureYears: number;
  membershipTenureMonths: number;
  memberCapital: number;
  totalDeposits: number;
  outstandingDue: number;
  outstandingLoan: number;
  eligibleRefundAmount: number;
  serviceChargePercentage: number;
  serviceChargeAmount: number;
  netRefundAmount: number;
  
  // Status
  status: "EXIT_REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REFUNDED" | "EXITED" | "REJECTED" | "NORMAL_EXIT_REQUESTED" | "EARLY_EXIT_REQUESTED" | "DEATH_REPORTED" | "SETTLED";
  
  // Death specific
  dateOfDeath?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeNid?: string;
  nomineeMobile?: string;
  nomineeAddress?: string;
  eligibleBenefitAmount?: number;
  netSettlementAmount?: number;
  
  userId?: string;
  userName?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  refundPaymentMethod?: string;
  refundBankAccountId?: string;
  refundPaymentReference?: string;
  refundProcessDate?: string;
  
  // Payment
  paymentMethod?: PaymentMethod;
  bankAccountId?: string;
  paymentReference?: string;
  refundVoucherNo?: string;
  
  // Workflow
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}


export type CommitteeStatus = "ACTIVE" | "EXPIRED";
export type CommitteePosition = "PRESIDENT" | "VICE_PRESIDENT" | "GENERAL_SECRETARY" | "JOINT_SECRETARY" | "TREASURER" | "ORGANIZING_SECRETARY" | "EXECUTIVE_MEMBER" | "MEMBER";
export type CommitteeAction = "APPOINTED" | "REPLACED" | "REMOVED" | "TERM_EXPIRED" | "TRANSFERRED";

export interface Committee {
  committeeId: string;
  committeeName: string;
  startDate: string;
  endDate: string;
  status: CommitteeStatus;
  resolutionNo?: string;
  resolutionDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeMember {
  committeeMemberId: string;
  committeeId: string;
  memberId: string;
  position: CommitteePosition;
  appointmentDate?: string;
  remarks?: string;
  createdAt: string;
}

export interface CommitteeHistory {
  historyId: string;
  committeeId: string;
  memberId: string;
  position: CommitteePosition;
  action: CommitteeAction;
  actionDate: string;
  remarks?: string;
  createdAt: string;
}

// ==========================================================
// Phase 2: Historical Journal Line Migration / Reclassification
// ==========================================================

export type MigrationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type MigrationCandidateStatus =
  | "READY"
  | "REVIEW"
  | "ALREADY_CORRECT"
  | "UNRESOLVED";

export type MigrationStatus =
  | "READY_FOR_MIGRATION"
  | "ALREADY_CORRECT"
  | "SKIPPED_LOW_CONFIDENCE"
  | "MIGRATED"
  | "ERROR";

export interface HistoricalMigrationCandidate {
  journalId: string;
  journalLineId: string;
  journalNo?: string;
  voucherNo?: string;
  sourceType?: string;
  sourceId?: string;
  memberId?: string;
  date?: string;
  oldAccountCode?: string;
  oldAccountTitle?: string;
  proposedAccountCode?: string;
  proposedAccountTitle?: string;
  newAccountCode?: string;
  newAccountTitle?: string;
  debit: number;
  credit: number;
  debitAmount?: number;
  creditAmount?: number;
  amount: number;
  reason: string;
  confidence: MigrationConfidence;
  status: MigrationCandidateStatus;
  migrationStatus?: MigrationStatus;
  fieldsUsed: string[];
  sourceReference?: string;
  sourceDescription?: string;
}

export interface HistoricalMigrationDiagnosticResult {
  scannedJournals: number;
  scannedLines: number;
  candidateLines: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  alreadyCorrect: number;
  unresolved: number;
  projectedDebit: number;
  projectedCredit: number;
  projectedDifference: number;
  candidates: HistoricalMigrationCandidate[];
  warnings: string[];
  criticalErrors: string[];
  beforeAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number; before: number; after: number; change: number }>;
  afterAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number; before: number; after: number; change: number }>;
  trialBalance: {
    totalDebitBefore: number;
    totalCreditBefore: number;
    differenceBefore: number;
    totalDebitAfter: number;
    totalCreditAfter: number;
    differenceAfter: number;
    balancedBefore: boolean;
    balancedAfter: boolean;
  };
  reconciliationPreview: {
    admission: { subLedgerTotal: number; currentGLTotal: number; projectedGLTotal: number; variance: number };
    capital: { subLedgerTotal: number; currentGLTotal: number; projectedGLTotal: number; variance: number };
    monthlySubscription: { subLedgerTotal: number; currentGLTotal: number; projectedGLTotal: number; variance: number };
    lateFee: { actualCollectedLateFee: number; currentGLTotal: number; projectedGLTotal: number; variance: number };
    cash: { cashBookTotal: number; currentCashGLTotal: number; projectedCashGLTotal: number; variance: number };
  };
}

export interface HistoricalMigrationLogEntry {
  migrationId: string;
  migrationBatchId: string;
  journalId: string;
  journalLineId: string;
  voucherNo: string;
  sourceType?: string;
  sourceId?: string;
  memberId?: string;
  oldAccountId?: string;
  oldAccountCode: string;
  oldAccountTitle: string;
  previousAccountId?: string;
  previousAccountCode?: string;
  newAccountId?: string;
  newAccountCode: string;
  newAccountTitle: string;
  amount: number;
  debit: number;
  credit: number;
  reason: string;
  confidence: MigrationConfidence;
  timestamp: string;
  migratedAt: string;
  migratedBy: string;
  operatorName?: string;
  migrationTimestamp?: string;
  migrationVersion: string;
  isRolledBack?: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string;
  rollbackBatchId?: string;
}

export interface MigrationDiagnosticReport {
  totalJournalsScanned: number;
  totalLinesScanned: number;
  linesEligibleForMigration: number;
  linesAlreadyCorrect: number;
  lowConfidenceCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  candidates: HistoricalMigrationCandidate[];
  oldAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number }>;
  projectedAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number }>;
  duplicatesFound: {
    duplicateJournals: Array<{ id: string; journalNo: string; count: number; reason: string }>;
    duplicateLines: Array<{ id: string; journalEntryId: string; accountId: string; amount: number; reason: string }>;
    duplicateCollections: Array<{ memberId: string; month: string; count: number; status: string }>;
  };
  unbalancedJournalsFound: Array<{ journalId: string; journalNo: string; totalDebit: number; totalCredit: number; diff: number }>;
  orphanLinesFound: Array<{ lineId: string; journalEntryId: string; accountId: string; amount: number }>;
  variancesBefore: {
    trialBalanceDiff: number;
    admissionVariance: number;
    capitalVariance: number;
    collectionVariance: number;
    lateFeeVariance: number;
    cashVariance: number;
  };
  projectedVariances: {
    trialBalanceDiff: number;
    admissionVariance: number;
    capitalVariance: number;
    collectionVariance: number;
    lateFeeVariance: number;
    cashVariance: number;
  };
  isReadyForMigration: boolean;
  blockers: string[];
}

export interface MigrationExecutionResult {
  migrationVersion: string;
  migrationBatchId: string;
  executedAt: string;
  executedBy: string;
  scannedJournals: number;
  scannedLines: number;
  linesScanned: number;
  linesMigrated: number;
  linesSkipped: number;
  requiringReviewCount: number;
  unresolvedCount: number;
  alreadyCorrectCount: number;
  backupKey: string;
  logs: HistoricalMigrationLogEntry[];
  oldAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number }>;
  newAccountTotals: Record<string, { code: string; title: string; count: number; totalDebit: number; totalCredit: number; balance: number }>;
  preValidation: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  postValidation: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  trialBalanceBefore: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  trialBalanceAfter: {
    totalDebit: number;
    totalCredit: number;
    difference: number;
    isBalanced: boolean;
  };
  unbalancedJournals: number;
  duplicateJournals: number;
  orphanJournalLines: number;
  cashBookVariance: number;
  subledgerVariance: number;
  accountingHealthScore: number;
  accountSummaries: {
    admissionFee: number;
    memberCapital: number;
    monthlySubscription: number;
    lateFee: number;
    cash: number;
    bank: number;
  };
  isRollback?: boolean;
}


export interface MemberPaymentRequest {
  id: string;
  memberId: string;
  memberNameSnapshot: string;
  month: string;
  year: number;
  financialYearId: string;
  dueAmount: number;
  requestedAmount: number;
  paymentMethod: string;
  companyPaymentAccountId?: string;
  senderMobile: string;
  transactionId: string;
  paymentDate: string;
  paymentTime?: string;
  note?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  approvedReceiptNo?: string;
  approvedCollectionId?: string;
}
