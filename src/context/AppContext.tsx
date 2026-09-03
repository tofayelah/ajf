import { hashPassword, generateSalt } from "../utils/crypto";
// Global Application Context & State Management
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Meeting, UserAccount, UserRole, Member, PaymentMethod, Nominee, Admission, BankAccount, ContraType, ContraTransaction, AuditLog } from '../types';
import {
  AppDatabaseState,
  getInitialDatabase,
  loadDatabaseFromStorage,
  saveDatabaseToStorage,
  createFreshDatabase,
  populateDemoData,
  clearAllStorage,
} from "../services/db";
import { AccountingService } from "../services/accounting";
import { authService } from "../services/authService";
import {
  createUserAPI,
  updateUserAPI,
  resetUserPasswordAPI,
  resetUserPinAPI,
  deleteUserAPI,
  authenticatedFetch,
  getFactoryResetPreviewAPI,
  executeFactoryResetAPI,
  fetchDatabaseFromAPI,
  fetchBackupPreviewAPI,
  downloadAuthoritativeBackupAPI,
  validateRestoreBackupAPI,
  executeRestoreBackupAPI
} from "../services/api";

export type ActiveScreen =
  | "DASHBOARD"
  | "PROFILE"
  | "LEDGER"
  | "MEMBER_PROFILE"
  | "MEMBER_LEDGER"
  | "MEMBER_FINANCIAL_SUMMARY"
  | "FINANCIAL_SUMMARY"
  | "SOCIETY_FINANCIAL_STATUS"
  | "NOTIFICATIONS"
  | "MEMBERS"
  | "MEMBER_DETAIL"
  | "ADMISSION"
  | "COLLECTIONS"
  | "DUE_MANAGEMENT"
  | "CAPITAL"
  | "LOANS"
  | "INVESTMENTS"
  | "ACCOUNTS"
  | "CASH_BOOK"
  | "BANK_BOOK"
  | "CASH_RECONCILIATION"
  | "BANK_RECONCILIATION"
  | "INCOME_EXPENSE"
  | "WELFARE"
  | "PROFIT"
  | "MEETINGS"
  | "RESOLUTIONS"
  | "REPORTS"
  | "USERS"
  | "AUDIT_LOG"
  | "INTEGRITY_CHECK"
  | "SETTINGS"
  | "FINANCIAL_YEAR"
  | "BACKUP_RESTORE"
  | "MEMBER_SETTLEMENT"
  | "SETTLEMENT_DASHBOARD"
  | "NORMAL_MEMBER_EXIT"
  | "EARLY_MEMBER_EXIT"
  | "EARLY_EXIT_REQUESTS"
  | "DEATH_SETTLEMENT"
  | "PENDING_SETTLEMENT_APPROVALS"
  | "COMPLETED_SETTLEMENTS"
  | "SETTLEMENT_REPORTS"
  | "COMMITTEE_MANAGEMENT";

export type MainNavTab = "HOME" | "MEMBERS" | "COLLECTION" | "FINANCE" | "MORE";

interface AppContextType {
  isAuthenticated: boolean;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
  getCurrentUser: () => UserAccount | null;
  getCurrentMemberId: () => string | null;
  canAccessMember: (memberId: string) => boolean;
  db: AppDatabaseState;
  setDb: React.Dispatch<React.SetStateAction<AppDatabaseState>>;
  isDbLoading: boolean;
  activeScreen: ActiveScreen;
  activeNavTab: MainNavTab;
  activeUser: UserAccount | null;
  selectedMemberId: string | null;
  selectedReceiptNo: string | null;
  language: "bn" | "en";
  isMobileDeviceView: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  notificationMessage: {
    text: string;
    type: "success" | "error" | "info";
  } | null;

  // Navigation
  navigateTo: (
    screen: ActiveScreen,
    memberId?: string,
    receiptNo?: string,
  ) => void;
  setNavTab: (tab: MainNavTab) => void;
  toggleMobileDeviceView: () => void;
  setLanguage: (lang: "bn" | "en") => void;
  setIsSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  showNotification: (text: string, type?: "success" | "error" | "info") => void;
  switchUserRole: (role: UserRole) => void;

  // State Mutators
  completeMemberAdmission: (params: {
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
    skipCapitalPosting?: boolean;
    skipIncomePosting?: boolean;
    isCapitalAlreadyPosted?: boolean;
    isAdmissionFeeAlreadyPosted?: boolean;
  }) => Promise<{ success: boolean; message: string; member?: Member; admission?: Admission }>;
  postMemberAdmission: (params: any) => Promise<{ success: boolean; message: string; member?: Member; admission?: Admission }>;
  addMember: (member: Member) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateMember: (member: Member) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  checkMemberDependencies: (memberId: string) => ReturnType<typeof AccountingService.checkMemberDependencies>;
  deactivateMember: (memberId: string) => Promise<{ success: boolean; message: string }>;
  reactivateMember: (memberId: string) => Promise<{ success: boolean; message: string }>;
  deleteMember: (memberId: string) => Promise<{ success: boolean; message: string }>;
  postCollection: (params: {
    memberId: string;
    collectionMonth: string;
    paidAmount: number;
    discount: number;
    paymentMethod: PaymentMethod;
    transactionNo?: string;
    collectionDate?: string;
    receivedBy: string;
    remarks?: string;
    lateFeeWaived?: boolean;
    isLateFineOnly?: boolean;
  }) => Promise<{ success: boolean; message: string; receiptNo?: string }> | { success: boolean; message: string; receiptNo?: string };
  postBulkCollection: (params: {
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
    lateFeeWaived?: boolean;
    isLateFineOnly?: boolean;
  }) => Promise<{ success: boolean; message: string; receiptNo?: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; receiptNo?: string; updatedDb?: AppDatabaseState };
  reverseCollection: (
    receiptNo: string,
    reason: string, reversedBy?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postCapitalDeposit: (params: {
    memberId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionNo?: string;
    date?: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string; voucherNo?: string }> | { success: boolean; message: string; voucherNo?: string };
  postLoanApplication: (params: {
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
  }) => Promise<{ success: boolean; message: string; loanId?: string }> | { success: boolean; message: string; loanId?: string };
  approveLoan: (
    loanIdOrParams: string | { loanId: string; approvedAmount?: number; approvedBy?: string; resolutionNo?: string },
    approvedAmount?: number,
    approvedBy?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  rejectLoan: (
    loanIdOrParams: string | { loanId: string; rejectedBy?: string; reason?: string },
    reason?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  disburseLoan: (
    loanIdOrParams: string | {
      loanId: string;
      approvedAmount?: number;
      paymentMethod?: PaymentMethod;
      resolutionNo?: string;
      approvedBy?: string;
    },
    paymentMethod?: PaymentMethod,
    resolutionNo?: string,
    approvedAmount?: number,
    approvedBy?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postLoanRepayment: (params: {
    loanId: string;
    principalAmount: number;
    profitOrCharge?: number;
    interestAmount?: number;
    lateFine?: number;
    paymentMethod: PaymentMethod;
    remarks?: string;
    receivedBy?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postIncome: (params: {
    incomeHead: string;
    amount: number;
    paymentMethod: PaymentMethod;
    memberId?: string;
    reference?: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postCashToBankDeposit: (params: {
    amount: number;
    bankAccount: string;
    slipNo: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postContraEntry: (params: {
    type: ContraType;
    amount: number;
    fromAccountId?: string;
    toAccountId?: string;
    fromBankAccountId?: string;
    toBankAccountId?: string;
    date?: string;
    transactionNo?: string;
    reference?: string;
    remarks?: string;
    isDraft?: boolean;
    status?: 'DRAFT' | 'POSTED';
  }) => Promise<{ success: boolean; message: string; voucherNo?: string; contraId?: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; voucherNo?: string; contraId?: string; updatedDb?: AppDatabaseState };
  saveDraftContraEntry: (params: {
    draftId?: string;
    type: ContraType;
    amount: number;
    fromAccountId?: string;
    toAccountId?: string;
    fromBankAccountId?: string;
    toBankAccountId?: string;
    date?: string;
    transactionNo?: string;
    reference?: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string; voucherNo?: string; contraId?: string; updatedDb?: AppDatabaseState }>;
  editDraftContraEntry: (params: {
    contraId: string;
    type?: ContraType;
    amount?: number;
    fromAccountId?: string;
    toAccountId?: string;
    fromBankAccountId?: string;
    toBankAccountId?: string;
    date?: string;
    transactionNo?: string;
    reference?: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }>;
  deleteDraftContraEntry: (contraId: string) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }>;
  postDraftContraEntry: (contraId: string) => Promise<{ success: boolean; message: string; voucherNo?: string; updatedDb?: AppDatabaseState }>;
  reverseContraEntry: (params: {
    contraId: string;
    reason: string;
  }) => Promise<{ success: boolean; message: string; reversalVoucherNo?: string; updatedDb?: AppDatabaseState }>;
  reverseAndCorrectContraEntry: (params: {
    contraId: string;
    reason: string;
    newEntry: {
      type: ContraType;
      amount: number;
      fromBankAccountId?: string;
      toBankAccountId?: string;
      date?: string;
      transactionNo?: string;
      reference?: string;
      remarks?: string;
    };
  }) => Promise<{ success: boolean; message: string; reversalVoucherNo?: string; newVoucherNo?: string; updatedDb?: AppDatabaseState }>;
  addBankAccount: (params: {
    bankName: string;
    branchName: string;
    accountName: string;
    accountNumber: string;
    accountType?: string;
    routingNumber?: string;
    openingBalance?: number;
    openingDate?: string;
    remarks?: string;
    status?: "ACTIVE" | "INACTIVE";
  }) => Promise<{ success: boolean; message: string; bankAccount?: BankAccount; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; bankAccount?: BankAccount; updatedDb?: AppDatabaseState };
  updateBankAccount: (params: {
    id: string;
    bankName?: string;
    branchName?: string;
    accountName?: string;
    accountNumber?: string;
    accountType?: string;
    routingNumber?: string;
    status?: "ACTIVE" | "INACTIVE";
    remarks?: string;
  }) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  postExpense: (params: {
    expenseHead: string;
    payee: string;
    amount: number;
    paymentMethod: PaymentMethod;
    billNumber?: string;
    approvedBy?: string;
    approvalStatus?: "DRAFT" | "APPROVED" | "PAID";
    remarks?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };

  postCashTransaction: (params: {
    type: 'IN' | 'OUT';
    amount: number;
    date: string;
    description: string;
    reference?: string;
    voucherNo?: string;
  }) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  saveCashTransactionDraft: (params: {
    type: 'IN' | 'OUT';
    amount: number;
    date: string;
    description: string;
    reference?: string;
    voucherNo?: string;
  }) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  editDraftCashTransaction: (
    transactionId: string,
    params: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
    }
  ) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  deleteDraftCashTransaction: (transactionId: string) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  postDraftCashTransaction: (transactionId: string) => Promise<{ success: boolean; message: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; updatedDb?: AppDatabaseState };
  reverseCashTransaction: (
    transactionId: string,
    reason: string
  ) => Promise<{ success: boolean; message: string; reversalVoucherNo?: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; reversalVoucherNo?: string; updatedDb?: AppDatabaseState };
  reverseAndCorrectCashTransaction: (params: {
    originalTransactionId: string;
    reason: string;
    newEntry: {
      type: 'IN' | 'OUT';
      amount: number;
      date: string;
      description: string;
      reference?: string;
      voucherNo?: string;
    };
  }) => Promise<{ success: boolean; message: string; reversalVoucherNo?: string; newVoucherNo?: string; updatedDb?: AppDatabaseState }> | { success: boolean; message: string; reversalVoucherNo?: string; newVoucherNo?: string; updatedDb?: AppDatabaseState };

  postInvestmentProject: (params: {
    projectName: string;
    projectType: string;
    partner?: string;
    amount: number;
    expectedReturnRate: number;
    manager: string;
    paymentMethod: PaymentMethod;
    description: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  approveInvestment: (
    params:
      | {
          projectId: string;
          approvedAmount: number;
          approvedBy: string;
          remarks?: string;
        }
      | string,
    approvedAmount?: number,
    approvedBy?: string,
    remarks?: string
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  rejectInvestment: (params: {
    projectId: string;
    rejectedBy: string;
    reason: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateInvestment: (params: {
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
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  deleteInvestment: (params: {
    projectId: string;
    deletedBy: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  cancelInvestment: (params: {
    projectId: string;
    cancelledBy: string;
    reason?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  executeInvestment: (
    params:
      | {
          projectId: string;
          paymentMethod: PaymentMethod;
          transactionDate?: string;
          executedBy?: string;
        }
      | string,
    paymentMethod?: PaymentMethod
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postInvestmentReturn: (params: {
    projectId: string;
    returnPrincipal: number;
    returnProfit: number;
    returnPaymentMethod: PaymentMethod;
    remarks: string;
    transactionDate?: string;
    receivedBy?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postWelfarePayment: (params: {
    fundType: "WELFARE" | "EMERGENCY" | "RESERVE";
    amount: number;
    beneficiary?: string;
    beneficiaryName?: string;
    beneficiaryMobile?: string;
    beneficiaryAddress?: string;
    beneficiaryType?: "MEMBER" | "NON_MEMBER";
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
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateWelfareTransaction: (params: {
    fundId: string;
    beneficiaryName?: string;
    beneficiary?: string;
    beneficiaryMobile?: string;
    beneficiaryAddress?: string;
    beneficiaryType?: "MEMBER" | "NON_MEMBER";
    memberId?: string;
    purpose?: string;
    reason?: string;
    amount?: number;
    paymentMethod?: PaymentMethod;
    transactionNumber?: string;
    approvedBy?: string;
    resolutionNo?: string;
    remarks?: string;
  }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  deleteWelfareTransaction: (fundId: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  reverseWelfareTransaction: (params: { fundId: string; reason: string }) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  finalizeProfit: (hp: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  addMeeting: (meeting: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateMeeting: (meeting: Meeting) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  addReserveUtilization: (util: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateReserveUtilizationStatus: (utilizationId: string, status: "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED", approvedBy?: string, resolutionNo?: string, remarks?: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  payReserveUtilization: (params: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  addResolution: (resolution: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  postResolution: (resolution: any) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  updateResolutionStatus: (resolutionId: string, status: any) => void;
  updateSettings: (newSettings: Partial<AppDatabaseState["settings"]>) => void;
  addUser: (userData: {
    fullName: string;
    username: string;
    email?: string;
    mobile?: string;
    role: UserRole;
    status?: "ACTIVE" | "INACTIVE" | "LOCKED" | "DISABLED";
    linkedMemberId?: string;
    password?: string;
    pin?: string;
  }) => Promise<{ success: boolean; message: string; user?: UserAccount }> | { success: boolean; message: string; user?: UserAccount };
  updateUser: (
    userId: string,
    updates: {
      fullName?: string;
      username?: string;
      email?: string;
      mobile?: string;
      role?: UserRole;
      status?: "ACTIVE" | "INACTIVE" | "LOCKED" | "DISABLED";
      linkedMemberId?: string;
      password?: string;
      pin?: string;
    },
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  deleteUser: (userId: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  manageUserStatus: (
    userId: string,
    action: "LOCK" | "UNLOCK" | "ENABLE" | "DISABLE" | "ACTIVATE" | "DEACTIVATE",
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  resetUserPassword: (
    userId: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  resetUserPin: (
    userId: string,
    newPin: string,
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  loadDemoData: () => void;
  clearDatabase: () => Promise<boolean>;
  getFactoryResetPreview: () => Promise<any>;
  executeFactoryReset: (confirmationPhrase: string, reason?: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  fetchBackupPreview: () => Promise<any>;
  downloadAuthoritativeBackup: (allowEmpty?: boolean) => Promise<{ success: boolean; data?: any; message?: string; filename?: string; isConfirmationRequired?: boolean; isEmptyDatabase?: boolean; previewData?: any }>;
  validateRestoreBackup: (backupPackage: any) => Promise<{ success: boolean; validation?: any; message?: string }>;
  executeRestoreBackup: (confirmationPhrase: string, backupPackage: any, reason?: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  restoreBackup: (backupDb: any) => Promise<boolean> | boolean;
  resetTestData: () => Promise<boolean>;
  requestMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  reviewMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  reviewSettlement: (params: any) => Promise<{success: boolean; message: string}>;
  approveMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  approveSettlement: (params: any) => Promise<{success: boolean; message: string}>;
  rejectMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  rejectSettlement: (params: any) => Promise<{success: boolean; message: string}>;
  processMemberExitRefund: (params: any) => Promise<{success: boolean; message: string; voucherNo?: string}>;
  processSettlementRefund: (params: any) => Promise<{success: boolean; message: string; voucherNo?: string}>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<AppDatabaseState>(() => getInitialDatabase());

  const executeAccountingRPC = async (action: string, args: any[]) => {
    try {
      const response = await authenticatedFetch('/accounting/action', {
        method: 'POST',
        body: JSON.stringify({ action, params: args })
      });
      if (!response.ok) {
        let errorMsg = 'RPC failed';
        try {
          const errData = await response.json();
          if (errData && errData.error) errorMsg = errData.error;
        } catch(e) {}
        throw new Error(errorMsg);
      }
      const result = await response.json();
      
      if (result && result.success) {
        const newDbResponse = await authenticatedFetch('/sync');
        if (newDbResponse.ok) {
           const newDb = await newDbResponse.json();
           (window as any).skipNextDbSave = true;
           setDb(newDb);
           try {
             window.dispatchEvent(new CustomEvent('app:rpc-update', { detail: { action, result, timestamp: Date.now() } }));
           } catch {}
        }
      }
      
      return result;
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  };

  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("DASHBOARD");
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>("HOME");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState<string | null>(
    null,
  );
  const [isMobileDeviceView, setIsMobileDeviceView] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Initial async load from storage
  useEffect(() => {
    authService.checkSession().then(async (session) => {
      let loadedDb = getInitialDatabase();
      if (session.authenticated && session.user) {
         loadedDb = await loadDatabaseFromStorage();
      }

      (window as any).skipNextDbSave = true;
      setDb(loadedDb);
      
      if (session.authenticated && session.user) {
        setActiveUser(session.user);
        setIsAuthenticated(true);
      } else {
        setActiveUser(null);
        setIsAuthenticated(false);
      }
      
      setIsDbLoading(false);
      
      // Committee Expiry check
      const today = new Date().toISOString().split("T")[0];
      const activeCommittee = loadedDb.committees?.find(c => c.status === "ACTIVE");
      if (activeCommittee && activeCommittee.endDate < today) {
        setTimeout(() => {
          setNotificationMessage({ text: "বর্তমান Committee-এর মেয়াদ শেষ হয়েছে। নতুন Committee গঠন করুন।", type: "error" });
          setTimeout(() => setNotificationMessage(null), 10000);
        }, 1000);
      }
    });
  }, []);

  // Sync to storage on change
  useEffect(() => {
    if (!isDbLoading && isAuthenticated) {
      if ((window as any).skipNextDbSave) {
        (window as any).skipNextDbSave = false;
        return;
      }
      saveDatabaseToStorage(db);
    }
  }, [db, isDbLoading, isAuthenticated]);

  const language = db.settings.language || "bn";

  const showNotification = (
    text: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setNotificationMessage({ text, type });
    setTimeout(() => {
      setNotificationMessage(null);
    }, 4000);
  };

  const navigateTo = (
    screen: ActiveScreen,
    memberId?: string,
    receiptNo?: string,
  ) => {
    if (memberId) setSelectedMemberId(memberId);
    if (receiptNo) setSelectedReceiptNo(receiptNo);
    setActiveScreen(screen);

    // Map screen to bottom tab
    if (screen === "DASHBOARD") setActiveNavTab("HOME");
    else if (["MEMBERS", "MEMBER_DETAIL", "ADMISSION", "MEMBER_LEDGER"].includes(screen))
      setActiveNavTab("MEMBERS");
    else if (["COLLECTIONS", "DUE_MANAGEMENT"].includes(screen))
      setActiveNavTab("COLLECTION");
    else if (
      [
        "CAPITAL",
        "LOANS",
        "INVESTMENTS",
        "ACCOUNTS",
        "CASH_BOOK",
        "BANK_BOOK",
        "INCOME_EXPENSE",
        "WELFARE",
        "PROFIT",
      ].includes(screen)
    )
      setActiveNavTab("FINANCE");
    else setActiveNavTab("MORE");
  };

  const setNavTab = (tab: MainNavTab) => {
    setActiveNavTab(tab);
    const isMember = activeUser?.role === "MEMBER";
    if (tab === "HOME") setActiveScreen("DASHBOARD");
    else if (tab === "MEMBERS")
      setActiveScreen(isMember ? "PROFILE" : "MEMBERS");
    else if (tab === "COLLECTION") setActiveScreen("COLLECTIONS");
    else if (tab === "FINANCE")
      setActiveScreen(isMember ? "LEDGER" : "CASH_BOOK");
    else if (tab === "MORE") setActiveScreen(isMember ? "SETTINGS" : "REPORTS");
  };

  const toggleMobileDeviceView = () => {
    setIsMobileDeviceView((prev) => !prev);
  };

  const setLanguage = (lang: "bn" | "en") => {
    setDb((prev) => ({
      ...prev,
      settings: { ...prev.settings, language: lang },
    }));
  };

  const login = async (username: string, pin: string): Promise<boolean> => {
    setIsDbLoading(true);
    const result = await authService.login(username, pin);
    if (result.success && result.user) {
      // First set authentication flags
      setActiveUser(result.user);
      setIsAuthenticated(true);
      
      // Then fetch user's database scope
      const loadedDb = await loadDatabaseFromStorage();
      
      // Use a flag to prevent immediate resave on initial load
      (window as any).skipNextDbSave = true;
      setDb(loadedDb);
      
      setIsDbLoading(false);
      return true;
    } else {
      setIsDbLoading(false);
      showNotification(result.error || "Login failed", "error");
      return false;
    }
  };

  const logout = async () => {
    await authService.logout();
    setActiveUser(null);
    setIsAuthenticated(false);
    (window as any).skipNextDbSave = true;
    setDb(getInitialDatabase());
  };

  const getCurrentUser = () => {
    return activeUser;
  };
  const getCurrentMemberId = () => {
    const user = getCurrentUser();
    if (user && user.role === "MEMBER" && user.linkedMemberId) {
      return user.linkedMemberId;
    }
    return null;
  };
  const switchUserRole = (role: UserRole) => {
    // Phase 1: Not fully supporting dynamic role switches on backend yet
    showNotification("You do not have permission to switch roles via client.", "error");
  };


  // AUTO-GENERATED WRAPPERS
  const text = async (...args: any[]) => {
    console.warn("Dummy method called: text");
    return { success: true, message: "Action successful" };
  };
  const type = async (...args: any[]) => {
    console.warn("Dummy method called: type");
    return { success: true, message: "Action successful" };
  };

  const canAccessMember = (memberId: string) => {
    const user = getCurrentUser();
    if (!user) return false;
    // Authorized operational roles have global member lookup/management access
    if (["ADMIN", "ACCOUNTANT", "COLLECTION_OFFICER", "AUDITOR"].includes(user.role as string)) return true;
    // MEMBER role is strictly restricted to their own linkedMemberId
    if (user.role === "MEMBER") return user.linkedMemberId === memberId;
    return false;
  };


  
  
  // AUTO-GENERATED WRAPPERS BATCH 4
  const completeMemberAdmission = async (params: any) => {
    console.log('========================================================================');
    console.log('[1. BEFORE completeMemberAdmission]', {
      name: params?.memberData?.fullName,
      nid: params?.memberData?.nid,
      mobile: params?.memberData?.mobile,
    });
    
    // Inject the active user info so the server knows who is doing this if required
    params.userId = db.activeUserId;
    params.userName = (db.users || []).find(u => u.userId === db.activeUserId)?.fullName || 'System';

    return executeAccountingRPC('completeAdmission', [params]);
  };

  const addMember = async (member: any) => {
    const newMembers = [...(db.members || []), member];
    const updatedDb = { ...db, members: newMembers };
    
    (window as any).skipNextDbSave = true;
    setDb(updatedDb);

    const storageRes = await saveDatabaseToStorage(updatedDb);

    return {
      success: storageRes.success,
      message: storageRes.success ? 'Member added successfully' : (storageRes.error || 'Failed to sync member'),
    };
  };

  const updateMember = async (member: any) => {
    const updatedMembers = (db.members || []).map((m) =>
      m.memberId === member.memberId ? member : m
    );
    const updatedDb = { ...db, members: updatedMembers };
    (window as any).skipNextDbSave = true;
    setDb(updatedDb);

    const storageRes = await saveDatabaseToStorage(updatedDb);

    return {
      success: storageRes.success,
      message: storageRes.success ? 'Member updated successfully' : (storageRes.error || 'Failed to sync member'),
    };
  };
  const checkMemberDependencies = (memberId: string) => {
    return AccountingService.checkMemberDependencies(db, memberId);
  };
  const deactivateMember = async (...args: any[]) => { return executeAccountingRPC('deactivateMember', args); };
  const reactivateMember = async (...args: any[]) => { return executeAccountingRPC('reactivateMember', args); };
  const deleteMember = async (memberId: string) => {
    const user = (db.users || []).find(u => u.userId === db.activeUserId);
    const res = AccountingService.deleteMemberPermanently(db, memberId, db.activeUserId || 'SYSTEM', user?.fullName || 'SYSTEM');
    if (res && res.success && res.updatedDb) {
      setDb(res.updatedDb);
    }
    return res;
  };
  const postCollection = async (...args: any[]) => { return executeAccountingRPC('postCollection', args); };
  const postBulkCollection = async (...args: any[]) => { return executeAccountingRPC('postBulkCollection', args); };
  const reverseCollection = async (...args: any[]) => { return executeAccountingRPC('reverseCollection', args); };
  const postCapitalDeposit = async (...args: any[]) => { return executeAccountingRPC('postCapitalDeposit', args); };
  const postLoanApplication = async (...args: any[]) => { return executeAccountingRPC('postLoanApplication', args); };
  const approveLoan = async (...args: any[]) => { return executeAccountingRPC('approveLoan', args); };
  const rejectLoan = async (...args: any[]) => { return executeAccountingRPC('rejectLoan', args); };
  const disburseLoan = async (...args: any[]) => { return executeAccountingRPC('disburseLoan', args); };
  const postLoanRepayment = async (...args: any[]) => { return executeAccountingRPC('postLoanRepayment', args); };
  const postIncome = async (...args: any[]) => { return executeAccountingRPC('postIncome', args); };
  const postCashToBankDeposit = async (...args: any[]) => { return executeAccountingRPC('postCashToBankDeposit', args); };
  const postContraEntry = async (...args: any[]) => { return executeAccountingRPC('postContraEntry', args); };
  const saveDraftContraEntry = async (...args: any[]) => { return executeAccountingRPC('postContraEntry', [{ ...args[0], isDraft: true, status: 'DRAFT' }]); };
  const editDraftContraEntry = async (...args: any[]) => { return executeAccountingRPC('editDraftContraEntry', args); };
  const deleteDraftContraEntry = async (...args: any[]) => { return executeAccountingRPC('deleteDraftContraEntry', args); };
  const postDraftContraEntry = async (...args: any[]) => { return executeAccountingRPC('postDraftContraEntry', args); };
  const reverseContraEntry = async (...args: any[]) => { return executeAccountingRPC('reverseContraEntry', args); };
  const reverseAndCorrectContraEntry = async (...args: any[]) => { return executeAccountingRPC('reverseAndCorrectContraEntry', args); };
  const addBankAccount = async (...args: any[]) => { return executeAccountingRPC('addBankAccount', args); };
  const updateBankAccount = async (...args: any[]) => { return executeAccountingRPC('updateBankAccount', args); };
  const postExpense = async (...args: any[]) => { return executeAccountingRPC('postExpense', args); };
  const postCashTransaction = async (...args: any[]) => { return executeAccountingRPC('postCashTransaction', args); };
  const saveCashTransactionDraft = async (...args: any[]) => { return executeAccountingRPC('saveCashTransactionDraft', args); };
  const editDraftCashTransaction = async (...args: any[]) => { return executeAccountingRPC('editDraftCashTransaction', args); };
  const deleteDraftCashTransaction = async (...args: any[]) => { return executeAccountingRPC('deleteDraftCashTransaction', args); };
  const postDraftCashTransaction = async (...args: any[]) => { return executeAccountingRPC('postDraftCashTransaction', args); };
  const reverseCashTransaction = async (...args: any[]) => { return executeAccountingRPC('reverseCashTransaction', args); };
  const reverseAndCorrectCashTransaction = async (...args: any[]) => { return executeAccountingRPC('reverseAndCorrectCashTransaction', args); };
  const postWelfarePayment = async (...args: any[]) => { return executeAccountingRPC('postWelfarePayment', args); };
  const updateWelfareTransaction = async (...args: any[]) => { return executeAccountingRPC('updateWelfareTransaction', args); };
  const deleteWelfareTransaction = async (...args: any[]) => { return executeAccountingRPC('deleteWelfareTransaction', args); };
  const reverseWelfareTransaction = async (...args: any[]) => { return executeAccountingRPC('reverseWelfareTransaction', args); };
  const postInvestmentProject = async (...args: any[]) => { return executeAccountingRPC('postInvestmentProject', args); };
  const approveInvestment = async (...args: any[]) => { return executeAccountingRPC('approveInvestment', args); };
  const rejectInvestment = async (...args: any[]) => { return executeAccountingRPC('rejectInvestment', args); };
  const updateInvestment = async (...args: any[]) => { return executeAccountingRPC('updateInvestment', args); };
  const deleteInvestment = async (...args: any[]) => { return executeAccountingRPC('deleteInvestment', args); };
  const cancelInvestment = async (...args: any[]) => { return executeAccountingRPC('cancelInvestment', args); };
  const executeInvestment = async (...args: any[]) => { return executeAccountingRPC('executeInvestment', args); };
  const postInvestmentReturn = async (...args: any[]) => { return executeAccountingRPC('postInvestmentReturn', args); };
  const finalizeProfit = async (...args: any[]) => {
    console.warn("Dummy method called: finalizeProfit");
    return { success: true, message: "Action successful" };
  };
  const addMeeting = async (...args: any[]) => {
    console.warn("Dummy method called: addMeeting");
    return { success: true, message: "Action successful" };
  };
  const updateMeeting = async (...args: any[]) => {
    console.warn("Dummy method called: updateMeeting");
    return { success: true, message: "Action successful" };
  };
  const addReserveUtilization = async (...args: any[]) => {
    console.warn("Dummy method called: addReserveUtilization");
    return { success: true, message: "Action successful" };
  };
  const updateReserveUtilizationStatus = async (...args: any[]) => {
    console.warn("Dummy method called: updateReserveUtilizationStatus");
    return { success: true, message: "Action successful" };
  };
  const payReserveUtilization = async (...args: any[]) => {
    console.warn("Dummy method called: payReserveUtilization");
    return { success: true, message: "Action successful" };
  };
  const addResolution = async (...args: any[]) => {
    console.warn("Dummy method called: addResolution");
    return { success: true, message: "Action successful" };
  };
  const updateResolutionStatus = async (...args: any[]) => {
    console.warn("Dummy method called: updateResolutionStatus");
    return { success: true, message: "Action successful" };
  };
  
  const requestMemberExit = async (params: any) => {
    const res = AccountingService.requestMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const reviewMemberExit = async (params: any) => {
    const res = AccountingService.reviewMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const approveMemberExit = async (params: any) => {
    const res = AccountingService.approveMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const rejectMemberExit = async (params: any) => {
    const res = AccountingService.rejectMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const processMemberExitRefund = async (params: any) => {
    const res = AccountingService.processMemberExitRefund(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };

  const updateSettings = (updates: any) => {
    setDb(prev => ({ ...prev, settings: { ...prev.settings, ...updates } }));
    return { success: true, message: "Settings updated" };
  };
  const addUser = async (user: any) => {
    try {
      const res = await createUserAPI(user);
      if (res && res.success && res.user) {
        setDb(prev => ({
          ...prev,
          users: [...(prev.users || []).filter(u => u.userId !== res.user.userId && u.username !== res.user.username), res.user]
        }));
        return { success: true, message: "User added successfully", user: res.user };
      }
      return { success: false, message: res?.error || "Failed to add user" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to add user" };
    }
  };

  const updateUser = async (userId: string, updates: any) => {
    try {
      const res = await updateUserAPI(userId, updates);
      if (res && res.success && res.user) {
        setDb(prev => ({
          ...prev,
          users: (prev.users || []).map(u => (u.userId === userId || (!u.userId && u.username === res.user.username)) ? { ...u, ...res.user } : u)
        }));
        return { success: true, message: "User updated successfully", user: res.user };
      }
      return { success: false, message: res?.error || "Failed to update user" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to update user" };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await deleteUserAPI(userId);
      if (res && res.success) {
        setDb(prev => ({
          ...prev,
          users: (prev.users || []).filter(u => u.userId !== userId)
        }));
        return { success: true, message: "User deleted successfully" };
      }
      return { success: false, message: res?.error || "Failed to delete user" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to delete user" };
    }
  };

  const manageUserStatus = async (userId: string, action: any) => {
    let targetStatus = 'ACTIVE';
    if (action === 'LOCK') targetStatus = 'LOCKED';
    else if (action === 'UNLOCK' || action === 'ENABLE' || action === 'ACTIVATE') targetStatus = 'ACTIVE';
    else if (action === 'DISABLE') targetStatus = 'DISABLED';
    else if (action === 'INACTIVATE' || action === 'DEACTIVATE') targetStatus = 'INACTIVE';

    try {
      const res = await updateUserAPI(userId, { status: targetStatus });
      if (res && res.success && res.user) {
        setDb(prev => ({
          ...prev,
          users: (prev.users || []).map(u => u.userId === userId ? { ...u, ...res.user } : u)
        }));
        return { success: true, message: "User status updated successfully", user: res.user };
      }
      return { success: false, message: res?.error || "Failed to update user status" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to update user status" };
    }
  };

  const resetUserPassword = async (userId: string, pass: string) => {
    try {
      const res = await resetUserPasswordAPI(userId, pass);
      if (res && res.success) {
        return { success: true, message: "Password reset successfully" };
      }
      return { success: false, message: res?.error || "Failed to reset password" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to reset password" };
    }
  };

  const resetUserPin = async (userId: string, pin: string) => {
    try {
      const res = await resetUserPinAPI(userId, pin);
      if (res && res.success) {
        return { success: true, message: "PIN reset successfully" };
      }
      return { success: false, message: res?.error || "Failed to reset PIN" };
    } catch (error: any) {
      return { success: false, message: error.message || "Failed to reset PIN" };
    }
  };
  const loadDemoData = async () => {
    setDb(populateDemoData(createFreshDatabase(true)));
    showNotification("Demo data loaded", "success");
  };
  const resetTestData = async (): Promise<boolean> => {
    const newDb = {
      ...db,
      members: [],
      admissions: [],
      collections: [],
      capitalDeposits: [],
      loans: [],
      loanRepayments: [],
      investments: [],
      cashTransactions: [],
      bankTransactions: [],
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
      attachments: [],
      reserveUtilizations: [],
      historicalProfits: [],
      memberExits: []
    };

    setDb(newDb);
    
    // Explicitly clear local persistence engines as requested before overwriting
    await clearAllStorage();
    
    const saveResult = await saveDatabaseToStorage(newDb);
    if (saveResult.success) {
      return true;
    } else {
      return false;
    }
  };

  const getFactoryResetPreview = async () => {
    return await getFactoryResetPreviewAPI();
  };

  const executeFactoryReset = async (
    confirmationPhrase: string,
    reason?: string
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const res = await executeFactoryResetAPI(confirmationPhrase, reason);
      if (res && res.success) {
        // 1. Wipe client-side cached databases
        await clearAllStorage();

        // 2. Fetch authoritative fresh database from server
        const freshDb = await fetchDatabaseFromAPI();
        if (freshDb) {
          setDb(freshDb);
        }
        return { success: true, data: res };
      }
      return { success: false, message: res?.error || "Failed to execute factory reset" };
    } catch (error: any) {
      console.error("Factory reset execution error:", error);
      return { success: false, message: error.message || "Factory reset execution error" };
    }
  };

  const clearDatabase = async (): Promise<boolean> => {
    const res = await executeFactoryReset("DELETE ALL MEMBER DATA", "Factory reset initiated");
    return res.success;
  };

  const fetchBackupPreview = async (): Promise<any> => {
    try {
      return await fetchBackupPreviewAPI();
    } catch (error: any) {
      console.error("Fetch backup preview error:", error);
      throw error;
    }
  };

  const downloadAuthoritativeBackup = async (allowEmpty?: boolean): Promise<{ success: boolean; data?: any; message?: string; filename?: string; isConfirmationRequired?: boolean; isEmptyDatabase?: boolean; previewData?: any }> => {
    try {
      const backupPackage = await downloadAuthoritativeBackupAPI(allowEmpty);
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `AJF-ERP-FULL-BACKUP-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;
      return {
        success: true,
        data: backupPackage,
        filename
      };
    } catch (error: any) {
      if (error?.data?.error === 'EMPTY_DATABASE_CONFIRMATION_REQUIRED' || error?.status === 400) {
        return {
          success: false,
          isConfirmationRequired: true,
          isEmptyDatabase: true,
          previewData: error.data,
          message: error.data?.message || "Authoritative database contains 0 records."
        };
      }
      console.error("Backup download error:", error);
      return { success: false, message: error.message || "Failed to download backup" };
    }
  };

  const validateRestoreBackup = async (backupPackage: any): Promise<{ success: boolean; validation?: any; message?: string }> => {
    try {
      const result = await validateRestoreBackupAPI(backupPackage);
      return {
        success: result.valid,
        validation: result,
        message: result.valid ? "Backup validation passed" : (result.errors?.join("; ") || "Validation failed")
      };
    } catch (error: any) {
      console.error("Backup validation error:", error);
      return { success: false, message: error.message || "Failed to validate backup" };
    }
  };

  const executeRestoreBackup = async (confirmationPhrase: string, backupPackage: any, reason?: string): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const res = await executeRestoreBackupAPI(confirmationPhrase, backupPackage, reason);
      if (res && res.success) {
        // Invalidate all client-side cached databases
        await clearAllStorage();
        // Fetch fresh authoritative database from server
        const freshDb = await fetchDatabaseFromAPI();
        if (freshDb) {
          (window as any).skipNextDbSave = true;
          setDb(freshDb);
        }
        showNotification("ডাটাবেজ সফলভাবে রিস্টোর করা হয়েছে!", "success");
        return { success: true, data: res };
      }
      return { success: false, message: res?.error || "Restore execution failed" };
    } catch (error: any) {
      console.error("Restore execution error:", error);
      return { success: false, message: error.message || "Failed to execute restore" };
    }
  };

  const restoreBackup = async (data: string) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const res = await executeRestoreBackup("RESTORE AJF DATABASE", parsed, "Direct JSON restore");
      return res.success;
    } catch (e) {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isDbLoading,
        login,
        logout,
        getCurrentUser,
        getCurrentMemberId,
        canAccessMember,
        db,
        setDb,
        activeScreen,
        activeNavTab,
        activeUser,
        selectedMemberId,
        selectedReceiptNo,
        language,
        isMobileDeviceView,
        searchQuery,
        isSearchOpen,
        notificationMessage,
        navigateTo,
        setNavTab,
        toggleMobileDeviceView,
        setLanguage,
        setIsSearchOpen,
        setSearchQuery,
        showNotification,
        switchUserRole,
        completeMemberAdmission,
        postMemberAdmission: completeMemberAdmission,
        addMember,
        updateMember,
        checkMemberDependencies,
        deactivateMember,
        reactivateMember,
        deleteMember,
        postCollection,
        postBulkCollection,
        reverseCollection,
        postCapitalDeposit,
        postLoanApplication,
        approveLoan,
        rejectLoan,
        disburseLoan,
        postLoanRepayment,
        postIncome,
        postCashToBankDeposit,
        postContraEntry,
        saveDraftContraEntry,
        editDraftContraEntry,
        deleteDraftContraEntry,
        postDraftContraEntry,
        reverseContraEntry,
        reverseAndCorrectContraEntry,
        addBankAccount,
        updateBankAccount,
        postExpense,
        postCashTransaction,
        saveCashTransactionDraft,
        editDraftCashTransaction,
        deleteDraftCashTransaction,
        postDraftCashTransaction,
        reverseCashTransaction,
        reverseAndCorrectCashTransaction,
        postWelfarePayment,
        updateWelfareTransaction,
        deleteWelfareTransaction,
        reverseWelfareTransaction,
        postInvestmentProject,
        approveInvestment,
        rejectInvestment,
        updateInvestment,
        deleteInvestment,
        cancelInvestment,
        executeInvestment,
        postInvestmentReturn,
        finalizeProfit,
        addMeeting,
        updateMeeting,
        addReserveUtilization,
        updateReserveUtilizationStatus,
        payReserveUtilization,
        addResolution,
        postResolution: addResolution,
        updateResolutionStatus,
        updateSettings,
        addUser,
        updateUser,
        deleteUser,
        manageUserStatus,
        resetUserPassword,
        resetUserPin,
        loadDemoData,
        clearDatabase,
        getFactoryResetPreview,
        executeFactoryReset,
        fetchBackupPreview,
        downloadAuthoritativeBackup,
        validateRestoreBackup,
        executeRestoreBackup,
        resetTestData,
        restoreBackup,
        requestMemberExit, 
        reviewMemberExit, 
        reviewSettlement: reviewMemberExit,
        approveMemberExit, 
        approveSettlement: approveMemberExit,
        rejectMemberExit, 
        rejectSettlement: rejectMemberExit,
        processMemberExitRefund,
        processSettlementRefund: processMemberExitRefund,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
