import { ChartAccount } from '../types';
import { DEFAULT_ACCOUNTS } from '../services/db';

export interface CanonicalAccountMetadata {
  accountCode: string;
  accountName: string;
  banglaName: string;
  category: string;
  group: string;
  normalBalance: 'DEBIT' | 'CREDIT';
}

/**
 * Centralized Canonical Account Codes
 * Single source of truth for General Ledger account mapping across all services.
 */
export const ACCOUNT_CODES = {
  CASH: '1000',
  BANK_SONALI: '1010',
  MOBILE_BANKING: '1020',
  MEMBER_RECEIVABLE: '1100',
  LOAN_RECEIVABLE: '1200',
  OTHER_ADVANCES: '1210',
  INVESTMENT_ASSET: '1500',
  FIXED_ASSETS: '1600',
  MEMBER_SAVINGS_LIABILITY: '2000',
  MEMBER_DPS_LIABILITY: '2010',
  MEMBER_FDR_LIABILITY: '2020',
  ACCOUNTS_PAYABLE: '2100',
  SHORT_TERM_BORROWINGS: '2200',
  MEMBER_CAPITAL: '3000',
  WELFARE_FUND: '3001',
  EMERGENCY_FUND: '3002',
  RESERVE_FUND: '3003',
  ADMISSION_FEE: '4000',
  FORM_FEE: '4010',
  MONTHLY_SUBSCRIPTION: '4020',
  INVESTMENT_PROFIT: '4100',
  SERVICE_CHARGE: '4110',
  DONATION_GRANTS: '4200',
  LATE_FINE: '4300',
  OFFICE_EXPENSE: '5000',
  SALARY_EXPENSE: '5010',
  MEETING_EXPENSE: '5020',
  STATIONERY_EXPENSE: '5030',
  ELECTRICITY_EXPENSE: '5040',
  INTERNET_EXPENSE: '5050',
  WELFARE_EXPENSE: '5100',
  SOCIAL_WORK_EXPENSE: '5110',
  BANK_CHARGES: '5200',
  MISC_EXPENSE: '5300',
} as const;

/**
 * Standard Chart of Accounts Mapping Dictionary
 * Maps canonical codes to their master configuration.
 */
export const CANONICAL_COA: Record<string, CanonicalAccountMetadata> = {
  '1000': {
    accountCode: '1000',
    accountName: 'Cash in Hand',
    banglaName: 'হাতে নগদ',
    category: 'Asset',
    group: 'Current Assets',
    normalBalance: 'DEBIT'
  },
  '1010': {
    accountCode: '1010',
    accountName: 'Bank Account (Sonali Bank)',
    banglaName: 'ব্যাংক হিসাব (সোনালী ব্যাংক)',
    category: 'Asset',
    group: 'Current Assets',
    normalBalance: 'DEBIT'
  },
  '1020': {
    accountCode: '1020',
    accountName: 'Mobile Banking (bKash/Nagad)',
    banglaName: 'মোবাইল ব্যাংকিং (বিকাশ/নগদ)',
    category: 'Asset',
    group: 'Current Assets',
    normalBalance: 'DEBIT'
  },
  '1100': {
    accountCode: '1100',
    accountName: 'Member Receivable (Due)',
    banglaName: 'সদস্যদের বকেয়া চাঁদা',
    category: 'Asset',
    group: 'Current Assets',
    normalBalance: 'DEBIT'
  },
  '1200': {
    accountCode: '1200',
    accountName: 'Loan Receivable',
    banglaName: 'প্রদত্ত ঋণ হিসাব',
    category: 'Asset',
    group: 'Loan Receivables',
    normalBalance: 'DEBIT'
  },
  '1210': {
    accountCode: '1210',
    accountName: 'Other Advances',
    banglaName: 'অন্যান্য অগ্রীম',
    category: 'Asset',
    group: 'Current Assets',
    normalBalance: 'DEBIT'
  },
  '1500': {
    accountCode: '1500',
    accountName: 'Investment Asset',
    banglaName: 'প্রকল্প বিনিয়োগ হিসাব',
    category: 'Asset',
    group: 'Investments',
    normalBalance: 'DEBIT'
  },
  '2000': {
    accountCode: '2000',
    accountName: 'Savings Deposit (General)',
    banglaName: 'সাধারণ সঞ্চয় আমানত',
    category: 'Liability',
    group: 'Current Liabilities',
    normalBalance: 'CREDIT'
  },
  '2010': {
    accountCode: '2010',
    accountName: 'DPS Deposit',
    banglaName: 'ডিপিএস আমানত',
    category: 'Liability',
    group: 'Current Liabilities',
    normalBalance: 'CREDIT'
  },
  '2020': {
    accountCode: '2020',
    accountName: 'FDR Deposit',
    banglaName: 'এফডিআর আমানত',
    category: 'Liability',
    group: 'Current Liabilities',
    normalBalance: 'CREDIT'
  },
  '2100': {
    accountCode: '2100',
    accountName: 'Accounts Payable',
    banglaName: 'প্রদেয় হিসাব',
    category: 'Liability',
    group: 'Payables',
    normalBalance: 'CREDIT'
  },
  '3000': {
    accountCode: '3000',
    accountName: 'Member Capital (Share)',
    banglaName: 'সদস্য শেয়ার মূলধন',
    category: 'Member Capital',
    group: 'Member Capital',
    normalBalance: 'CREDIT'
  },
  '3001': {
    accountCode: '3001',
    accountName: 'Welfare Fund',
    banglaName: 'কল্যাণ তহবিল',
    category: 'Member Capital',
    group: 'Welfare Fund',
    normalBalance: 'CREDIT'
  },
  '3002': {
    accountCode: '3002',
    accountName: 'Emergency Fund',
    banglaName: 'জরুরী তহবিল',
    category: 'Member Capital',
    group: 'Emergency Fund',
    normalBalance: 'CREDIT'
  },
  '3003': {
    accountCode: '3003',
    accountName: 'Reserve Fund',
    banglaName: 'সংরক্ষিত তহবিল',
    category: 'Member Capital',
    group: 'Reserve Fund',
    normalBalance: 'CREDIT'
  },
  '4000': {
    accountCode: '4000',
    accountName: 'Admission Fee',
    banglaName: 'ভর্তি ফি',
    category: 'Income',
    group: 'Membership Income',
    normalBalance: 'CREDIT'
  },
  '4010': {
    accountCode: '4010',
    accountName: 'Form Fee',
    banglaName: 'ফরম ফি',
    category: 'Income',
    group: 'Membership Income',
    normalBalance: 'CREDIT'
  },
  '4020': {
    accountCode: '4020',
    accountName: 'Monthly Subscription',
    banglaName: 'মাসিক চাঁদা',
    category: 'Income',
    group: 'Membership Income',
    normalBalance: 'CREDIT'
  },
  '4100': {
    accountCode: '4100',
    accountName: 'Investment Profit/Interest',
    banglaName: 'বিনিয়োগ হতে মুনাফা',
    category: 'Income',
    group: 'Investment Profit',
    normalBalance: 'CREDIT'
  },
  '4110': {
    accountCode: '4110',
    accountName: 'Service Charge Income',
    banglaName: 'সার্ভিস চার্জ আয়',
    category: 'Income',
    group: 'Service Income',
    normalBalance: 'CREDIT'
  },
  '4200': {
    accountCode: '4200',
    accountName: 'Donation/Grants',
    banglaName: 'অনুদান প্রাপ্তি',
    category: 'Income',
    group: 'Other Income',
    normalBalance: 'CREDIT'
  },
  '4300': {
    accountCode: '4300',
    accountName: 'Other Income / Late Fine',
    banglaName: 'অন্যান্য আয় / বিলম্ব ফি',
    category: 'Income',
    group: 'Other Income',
    normalBalance: 'CREDIT'
  },
  '5000': {
    accountCode: '5000',
    accountName: 'Office Rent & Admin Expense',
    banglaName: 'অফিস ও প্রশাসনিক ব্যয়',
    category: 'Expense',
    group: 'Operating Expense',
    normalBalance: 'DEBIT'
  },
  '5010': {
    accountCode: '5010',
    accountName: 'Salary & Allowance',
    banglaName: 'বেতন ও ভাতা',
    category: 'Expense',
    group: 'Administrative Expense',
    normalBalance: 'DEBIT'
  },
  '5020': {
    accountCode: '5020',
    accountName: 'Entertainment & Meetings',
    banglaName: 'আপ্যায়ন ও সভা খরচ',
    category: 'Expense',
    group: 'Operating Expense',
    normalBalance: 'DEBIT'
  },
  '5030': {
    accountCode: '5030',
    accountName: 'Stationery & Printing',
    banglaName: 'মনিহারি ও ছাপানো',
    category: 'Expense',
    group: 'Administrative Expense',
    normalBalance: 'DEBIT'
  },
  '5040': {
    accountCode: '5040',
    accountName: 'Electricity Bill',
    banglaName: 'বিদ্যুৎ বিল',
    category: 'Expense',
    group: 'Operating Expense',
    normalBalance: 'DEBIT'
  },
  '5050': {
    accountCode: '5050',
    accountName: 'Mobile & Internet Bill',
    banglaName: 'মোবাইল ও ইন্টারনেট বিল',
    category: 'Expense',
    group: 'Operating Expense',
    normalBalance: 'DEBIT'
  },
  '5100': {
    accountCode: '5100',
    accountName: 'Welfare Expense (Members)',
    banglaName: 'সদস্য কল্যাণ ব্যয়',
    category: 'Expense',
    group: 'Welfare Expense',
    normalBalance: 'DEBIT'
  },
  '5110': {
    accountCode: '5110',
    accountName: 'Social Work/Donation',
    banglaName: 'সামাজিক কাজ ও অনুদান',
    category: 'Expense',
    group: 'Welfare Expense',
    normalBalance: 'DEBIT'
  },
  '5200': {
    accountCode: '5200',
    accountName: 'Bank Charges & Excise Duty',
    banglaName: 'ব্যাংক চার্জ ও আবগারি শুল্ক',
    category: 'Expense',
    group: 'Bank Charges',
    normalBalance: 'DEBIT'
  },
  '5300': {
    accountCode: '5300',
    accountName: 'Miscellaneous Expense',
    banglaName: 'বিবিধ খরচ',
    category: 'Expense',
    group: 'Other Expense',
    normalBalance: 'DEBIT'
  }
};

/**
 * Returns canonical payment account ID and title strictly based on payment mode/account.
 * - Cash -> 1000 (Cash in Hand)
 * - Bank -> 1010 (Bank Account)
 * - Mobile Banking -> 1020 (Mobile Banking)
 */
export function getPaymentAccountIdAndName(paymentMethod?: string, bankAccountId?: string): { accountId: string; accountName: string } {
  const pm = (paymentMethod || 'Cash').toString().toLowerCase().trim();
  
  if (pm.includes('mobile') || pm.includes('bkash') || pm.includes('nagad') || pm.includes('rocket') || pm.includes('বিকাশ') || pm.includes('নগদ') || pm.includes('রকেট')) {
    return { accountId: '1020', accountName: 'Mobile Banking (bKash/Nagad)' };
  }
  
  if (pm.includes('bank') || pm.includes('cheque') || pm.includes('check') || pm.includes('online') || pm.includes('card') || pm.includes('ব্যাংক') || pm.includes('চেক') || bankAccountId) {
    return { accountId: '1010', accountName: 'Bank Account (Sonali Bank)' };
  }
  
  return { accountId: '1000', accountName: 'Cash in Hand' };
}

/**
 * Compatibility Mapping Layer:
 * Resolves any account identifier (code, legacy code, alias, bank ID, name) to a canonical Chart of Accounts metadata.
 * Does NOT alter historical journal data, but ensures Trial Balance and GL calculate against the correct standard code.
 */
export function resolveCanonicalAccount(
  identifier?: string,
  accountName?: string,
  accountsList?: ChartAccount[]
): CanonicalAccountMetadata {
  const rawId = (identifier || '').toString().trim();
  const rawName = (accountName || '').toString().trim();
  const cleanId = rawId.toUpperCase();
  const cleanName = rawName.toLowerCase();

  // 1. Direct match on canonical COA code
  if (CANONICAL_COA[rawId]) {
    return CANONICAL_COA[rawId];
  }

  // 2. Direct match in provided Chart of Accounts list
  if (Array.isArray(accountsList)) {
    const directMatch = accountsList.find(a => 
      a.accountCode === rawId || 
      (a as any).id === rawId || 
      a.accountName === rawId || 
      a.banglaName === rawId
    );
    if (directMatch && CANONICAL_COA[directMatch.accountCode]) {
      return CANONICAL_COA[directMatch.accountCode];
    }
  }

  // 3. Cash in Hand (1000) aliases
  if (
    cleanId === '1000' ||
    cleanId === '1001' ||
    cleanId === 'CASH' ||
    cleanId === 'CASH_IN_HAND' ||
    cleanName.includes('cash in hand') ||
    cleanName.includes('হাতে নগদ') ||
    cleanName === 'cash' ||
    cleanName === 'নগদ'
  ) {
    return CANONICAL_COA['1000'];
  }

  // 4. Bank Account (1010) aliases
  if (
    cleanId === '1010' ||
    cleanId === '1002' ||
    cleanId === '1110' ||
    cleanId === 'BANK' ||
    cleanId.startsWith('BANK-') ||
    cleanId.startsWith('BA-') ||
    cleanName.includes('bank') ||
    cleanName.includes('ব্যাংক') ||
    cleanName.includes('sonali') ||
    cleanName.includes('সোনালী') ||
    cleanName.includes('islami') ||
    cleanName.includes('dutch-bangla')
  ) {
    return CANONICAL_COA['1010'];
  }

  // 5. Mobile Banking (1020) aliases
  if (
    cleanId === '1020' ||
    cleanId === 'MFS' ||
    cleanId === 'BKASH' ||
    cleanId === 'NAGAD' ||
    cleanName.includes('mobile banking') ||
    cleanName.includes('মোবাইল ব্যাংকিং') ||
    cleanName.includes('bkash') ||
    cleanName.includes('nagad') ||
    cleanName.includes('rocket') ||
    cleanName.includes('বিকাশ') ||
    cleanName.includes('নগদ')
  ) {
    return CANONICAL_COA['1020'];
  }

  // 6. Member Receivable (1100)
  if (
    cleanId === '1100' ||
    cleanName.includes('member receivable') ||
    cleanName.includes('বকেয়া চাঁদা') ||
    cleanName.includes('বকেয়া')
  ) {
    return CANONICAL_COA['1100'];
  }

  // 7. Loan Receivable (1200)
  if (
    cleanId === '1200' ||
    cleanName.includes('loan receivable') ||
    cleanName.includes('প্রদত্ত ঋণ') ||
    cleanName.includes('ঋণ হিসাব')
  ) {
    return CANONICAL_COA['1200'];
  }

  // 8. Investment Asset (1500)
  if (
    cleanId === '1500' ||
    cleanName.includes('investment asset') ||
    cleanName.includes('বিনিয়োগ হিসাব') ||
    cleanName.includes('প্রকল্প বিনিয়োগ')
  ) {
    return CANONICAL_COA['1500'];
  }

  // 9. Member Capital (3000)
  if (
    cleanId === '3000' ||
    cleanName.includes('member capital') ||
    cleanName.includes('মূলধন তহবিল') ||
    cleanName.includes('শেয়ার মূলধন') ||
    cleanName.includes('সদস্য মূলধন')
  ) {
    return CANONICAL_COA['3000'];
  }

  // 10. Welfare / Emergency / Reserve Funds (3001, 3002, 3003)
  if (cleanId === '3001' || cleanName.includes('welfare fund') || cleanName.includes('কল্যাণ তহবিল')) {
    return CANONICAL_COA['3001'];
  }
  if (cleanId === '3002' || cleanName.includes('emergency fund') || cleanName.includes('জরুরী তহবিল')) {
    return CANONICAL_COA['3002'];
  }
  if (cleanId === '3003' || cleanName.includes('reserve fund') || cleanName.includes('সংরক্ষিত তহবিল')) {
    return CANONICAL_COA['3003'];
  }

  // 11. Incomes (4000, 4010, 4020, 4100, 4110, 4200, 4300)
  if (cleanId === '4000' || cleanName.includes('admission') || cleanName.includes('ভর্তি ফি') || cleanId.startsWith('INC-ADMISSION')) {
    return CANONICAL_COA['4000'];
  }
  if (cleanId === '4010' || cleanName.includes('form fee') || cleanName.includes('ফরম ফি') || cleanId.startsWith('INC-FORM')) {
    return CANONICAL_COA['4010'];
  }
  if (cleanId === '4020' || cleanName.includes('monthly subscription') || cleanName.includes('monthly fee') || cleanName.includes('মাসিক চাঁদা') || cleanName.includes('collection income') || cleanId.startsWith('INC-COLLECTION')) {
    return CANONICAL_COA['4020'];
  }
  if (cleanId === '4100' || cleanName.includes('investment profit') || cleanName.includes('মুনাফা') || cleanId.startsWith('INC-INVESTMENT')) {
    return CANONICAL_COA['4100'];
  }
  if (cleanId === '4110' || cleanName.includes('service charge') || cleanName.includes('সার্ভিস চার্জ')) {
    return CANONICAL_COA['4110'];
  }
  if (cleanId === '4200' || cleanName.includes('donation') || cleanName.includes('অনুদান')) {
    return CANONICAL_COA['4200'];
  }
  if (cleanId === '4300' || cleanName.includes('late fine') || cleanName.includes('বিলম্ব ফি') || cleanName.includes('other income') || cleanName.includes('অন্যান্য আয়') || cleanId.startsWith('INC-LATE')) {
    return CANONICAL_COA['4300'];
  }

  // 12. Expenses (5000, 5010, 5020, 5030, 5040, 5050, 5100, 5110, 5200, 5300)
  if (cleanId === '5000' || cleanId.startsWith('EXP-OFFICE') || cleanName.includes('office') || cleanName.includes('দাপ্তরিক')) {
    return CANONICAL_COA['5000'];
  }
  if (cleanId === '5010' || cleanId.startsWith('EXP-SALARY') || cleanName.includes('salary') || cleanName.includes('বেতন')) {
    return CANONICAL_COA['5010'];
  }
  if (cleanId === '5020' || cleanId.startsWith('EXP-MEETING') || cleanName.includes('meeting') || cleanName.includes('আপ্যায়ন') || cleanName.includes('entertainment')) {
    return CANONICAL_COA['5020'];
  }
  if (cleanId === '5030' || cleanId.startsWith('EXP-STATIONERY') || cleanName.includes('stationery') || cleanName.includes('মনিহারি')) {
    return CANONICAL_COA['5030'];
  }
  if (cleanId === '5040' || cleanId.startsWith('EXP-ELECTRICITY') || cleanName.includes('electricity') || cleanName.includes('বিদ্যুৎ')) {
    return CANONICAL_COA['5040'];
  }
  if (cleanId === '5050' || cleanId.startsWith('EXP-INTERNET') || cleanName.includes('internet') || cleanName.includes('মোবাইল ও ইন্টারনেট')) {
    return CANONICAL_COA['5050'];
  }
  if (cleanId === '5100' || cleanName.includes('welfare expense') || cleanName.includes('সদস্য কল্যাণ')) {
    return CANONICAL_COA['5100'];
  }
  if (cleanId === '5110' || cleanName.includes('social work') || cleanName.includes('সামাজিক')) {
    return CANONICAL_COA['5110'];
  }
  if (cleanId === '5200' || cleanName.includes('bank charge') || cleanName.includes('ব্যাংক চার্জ')) {
    return CANONICAL_COA['5200'];
  }
  if (cleanId === '5300' || cleanId === 'MISC_INCOME_EXPENSE' || cleanId.startsWith('EXP-') || cleanName.includes('misc') || cleanName.includes('বিবিধ')) {
    return CANONICAL_COA['5300'];
  }

  // 13. Default fallback preserving original code if provided, otherwise Unknown
  const isNumericCode = /^\d+$/.test(rawId);
  const guessedCategory = rawId.startsWith('1') ? 'Asset' :
    rawId.startsWith('2') ? 'Liability' :
    rawId.startsWith('3') ? 'Member Capital' :
    rawId.startsWith('4') ? 'Income' :
    rawId.startsWith('5') ? 'Expense' : 'Other';
  const guessedNormal = (guessedCategory === 'Asset' || guessedCategory === 'Expense') ? 'DEBIT' : 'CREDIT';

  return {
    accountCode: isNumericCode ? rawId : (rawId || 'UNKNOWN'),
    accountName: rawName || rawId || 'Unknown Account',
    banglaName: rawName || rawId || 'অজ্ঞাত হিসাব',
    category: guessedCategory,
    group: 'General Ledger',
    normalBalance: guessedNormal
  };
}
