import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AccountingService } from '../../services/accounting';
import { PdfService } from '../../services/pdfService';
import { ExcelService } from '../../services/excelService';

// Report Sub-components
import { CollectionReport } from './CollectionReport';
import { LateFeeWaiverReport } from './LateFeeWaiverReport';
import { InvestmentReport } from './InvestmentReport';
import { WelfareReport } from './WelfareReport';
import { ProfitReport } from './ProfitReport';
import { DueReport } from './DueReport';
import { ReserveFundReport } from './ReserveFundReport';
import { IncomeExpenseReport } from './IncomeExpenseReports';
import { CashReconciliationReport } from './CashReconciliationReport';
import { BankReconciliationReport } from './BankReconciliationReport';
import { YearClosingReport } from './YearClosingReport';
import { ContraReport } from './ContraReport';
import { MemberExitReport } from './MemberExitReport';
import { TrialBalanceReport } from './TrialBalanceReport';
import { GeneralLedgerReport } from './GeneralLedgerReport';
import { MemberFinancialStatementReport } from './MemberFinancialStatementReport';
import { LoanReportView } from './LoanReportView';
import { SettlementReportsContainer } from './SettlementReportsContainer';
import { AJFLogo } from '../common/AJFLogo';
import { AuditTrailView } from './AuditTrailView';
import { AuditExceptionsView, scanAuditExceptions } from './AuditExceptionsView';
import { AccountingDiagnosticView } from './AccountingDiagnosticView';
import { TransactionDetailModal } from './TransactionDetailModal';

// Accounts Views
import { CashBookView } from '../accounts/CashBookView';
import { BankBookView } from '../accounts/BankBookView';
import { ChartOfAccountsView } from '../accounts/ChartOfAccountsView';
import { MeetingsView } from '../meetings/MeetingsView';

// Icons
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Building,
  TrendingUp,
  Landmark,
  HeartHandshake,
  ShieldCheck,
  Search,
  RefreshCw,
  Scale,
  BookOpen,
  DollarSign,
  AlertTriangle,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  Eye,
  Star,
  Clock,
  RotateCcw,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export interface ReportDefinition {
  id: string;
  category: 'FINANCIAL' | 'CASH_BANK' | 'MEMBER' | 'LOAN_INVEST' | 'WELFARE_FUND' | 'SETTLEMENT' | 'AUDIT_CONTROL';
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  icon: any;
  isQuickAccess?: boolean;
}

export const ALL_REPORTS: ReportDefinition[] = [
  // CATEGORY 1: FINANCIAL REPORTS
  {
    id: 'TRIAL_BALANCE',
    category: 'FINANCIAL',
    nameEn: 'Trial Balance',
    nameBn: 'রেওয়ামিল / ট্রায়াল ব্যালেন্স',
    descriptionEn: 'Equilibrium check of debit and credit balances for all accounts.',
    descriptionBn: 'সকল হিসাব খাতের ডেবিট ও ক্রেডিট ব্যালেন্সের ভারসাম্য যাচাই।',
    icon: Scale,
    isQuickAccess: true
  },
  {
    id: 'PROFIT_LOSS',
    category: 'FINANCIAL',
    nameEn: 'Profit & Loss Statement',
    nameBn: 'আয়-ব্যয় ও লাভ-ক্ষতি বিবরণী (P&L)',
    descriptionEn: 'Operating revenues, expenditures, and net surplus calculation.',
    descriptionBn: 'অর্জিত আয়, পরিচালন ব্যয় এবং নিট উদ্বৃত্তের পূর্ণাঙ্গ বিবরণী।',
    icon: TrendingUp,
    isQuickAccess: true
  },
  {
    id: 'BALANCE_SHEET',
    category: 'FINANCIAL',
    nameEn: 'Balance Sheet',
    nameBn: 'উদ্বৃত্তপত্র / আর্থিক অবস্থার বিবরণী',
    descriptionEn: 'Statement of financial position: assets, liabilities, and equity.',
    descriptionBn: 'সমিতির মোট সম্পদ, দায় ও নিজস্ব তহবিলের প্রকৃত অবস্থান।',
    icon: Building,
    isQuickAccess: true
  },
  {
    id: 'GENERAL_LEDGER',
    category: 'FINANCIAL',
    nameEn: 'General Ledger',
    nameBn: 'সাধারণ খতিয়ান ও হিসাব খাতা',
    descriptionEn: 'Account-wise journal entry postings with running balances.',
    descriptionBn: 'হিসাবভিত্তিক সকল জাবেদা ভুক্তি ও রানিং ব্যালেন্স বিবরণী।',
    icon: BookOpen,
    isQuickAccess: true
  },
  {
    id: 'JOURNAL_REGISTER',
    category: 'FINANCIAL',
    nameEn: 'Journal Register',
    nameBn: 'জাবেদা রেজিস্টার ও দৈনিক ভুক্তিসমূহ',
    descriptionEn: 'Chronological double-entry journal logs with vouchers and approvals.',
    descriptionBn: 'সকল আর্থিক লেনদেনের ধারাবাহিক দ্বৈত দাখিলা ও ভাউচার রেজিস্টার।',
    icon: Layers
  },
  {
    id: 'CHART_OF_ACCOUNTS',
    category: 'FINANCIAL',
    nameEn: 'Chart of Accounts',
    nameBn: 'হিসাব তালিকা ও কোডিং কাঠামো',
    descriptionEn: 'Categorized hierarchy of assets, liabilities, equity, revenues & expenses.',
    descriptionBn: 'সকল অনুমোদিত হিসাব খাতের কোড, শ্রেণী ও স্বাভাবিক জেরের তালিকা।',
    icon: Landmark
  },
  {
    id: 'CASH_FLOW',
    category: 'FINANCIAL',
    nameEn: 'Cash Flow & Liquidity',
    nameBn: 'নগদ প্রবাহ ও তারল্য বিবরণী',
    descriptionEn: 'Cash inflows, outflows, and liquid reserves breakdown.',
    descriptionBn: 'নগদ আগমন, বহির্গমন এবং নগদ তারল্যের সার্বিক বিবরণী।',
    icon: DollarSign
  },
  {
    id: 'INCOME_EXPENSE_REPORT',
    category: 'FINANCIAL',
    nameEn: 'Income & Expense Analysis',
    nameBn: 'আয়-ব্যয় বিশ্লেষণ প্রতিবেদন',
    descriptionEn: 'Head-wise breakdown of revenues and operating expenses.',
    descriptionBn: 'খাতভিত্তিক আয় ও ব্যয়ের বিশদ তালিকা এবং পেমেন্ট মাধ্যম।',
    icon: TrendingUp
  },

  // CATEGORY 2: CASH & BANK
  {
    id: 'CASH_BOOK',
    category: 'CASH_BANK',
    nameEn: 'Cash Book',
    nameBn: 'ক্যাশ বুক / নগদ প্রাপ্তি-প্রদান খাতা',
    descriptionEn: 'Real-time cash in hand receipts and disbursement journal.',
    descriptionBn: 'হাতে নগদ তহবিলের সকল প্রকার জমা ও খরচের দৈনন্দিন হিসাব।',
    icon: DollarSign,
    isQuickAccess: true
  },
  {
    id: 'BANK_BOOK',
    category: 'CASH_BANK',
    nameEn: 'Bank Book',
    nameBn: 'ব্যাংক বুক / ব্যাংক হিসাব বিবরণী',
    descriptionEn: 'Bank account deposits, withdrawals, cheques, and transfers.',
    descriptionBn: 'সমিতির সকল ব্যাংক হিসাবের জমা, উত্তোলন ও চেক ট্রানজাকশন।',
    icon: Landmark,
    isQuickAccess: true
  },
  {
    id: 'CASH_RECON_REPORT',
    category: 'CASH_BANK',
    nameEn: 'Cash Reconciliation',
    nameBn: 'নগদ হিসাব সমন্বয় প্রতিবেদন',
    descriptionEn: 'Physical cash count verification and reconciliation audits.',
    descriptionBn: 'ভৌত নগদ গণনা এবং ক্যাশ বইয়ের জেরের নিরীক্ষা সমন্বয়।',
    icon: CheckCircle2
  },
  {
    id: 'BANK_RECON_REPORT',
    category: 'CASH_BANK',
    nameEn: 'Bank Reconciliation',
    nameBn: 'ব্যাংক হিসাব সমন্বয় বিবরণী',
    descriptionEn: 'Bank statement matching, uncleared items, and discrepancy audits.',
    descriptionBn: 'ব্যাংক স্টেটমেন্ট ও জেনারেল লেজারের পার্থক্য সমন্বয় প্রতিবেদন।',
    icon: Scale
  },
  {
    id: 'CONTRA_REPORT',
    category: 'CASH_BANK',
    nameEn: 'Contra Entry Register',
    nameBn: 'কন্ট্রা এন্ট্রি রেজিস্টার (নগদ ⮂ ব্যাংক)',
    descriptionEn: 'Transfers between cash in hand and bank accounts.',
    descriptionBn: 'নগদ তহবিল ও ব্যাংক একাউন্টের মধ্যকার স্থানান্তর রেকর্ড।',
    icon: Layers
  },
  {
    id: 'BANK_TRANSFER_REPORT',
    category: 'CASH_BANK',
    nameEn: 'Bank Transfer Report',
    nameBn: 'ব্যাংক স্থানান্তর ও ডিপোজিট প্রতিবেদন',
    descriptionEn: 'Inter-account deposits and fund transfers.',
    descriptionBn: 'ব্যাংক জমা ও অভ্যন্তরীণ ব্যাংক ফান্ড ট্রান্সফার লগ।',
    icon: Landmark
  },

  // CATEGORY 3: MEMBER REPORTS
  {
    id: 'MEMBER_REGISTER',
    category: 'MEMBER',
    nameEn: 'Member Register',
    nameBn: 'সদস্য রেজিস্টার ও প্রোফাইল মাস্টার',
    descriptionEn: 'Comprehensive master list of active, inactive, and settled members.',
    descriptionBn: 'সমিতির সকল সাধারণ ও বিশেষ সদস্যের পূর্ণাঙ্গ পরিচিতি তালিকা।',
    icon: Users
  },
  {
    id: 'MEMBER_LEDGER',
    category: 'MEMBER',
    nameEn: 'Member Ledger',
    nameBn: 'সদস্য খতিয়ান ও ব্যক্তিগত হিসাব',
    descriptionEn: 'Individual member equity, monthly collections, loans, and statements.',
    descriptionBn: 'সদস্যভিত্তিক মূলধন জমা, মাসিক কিস্তি ও ব্যক্তিগত লেনদেনের খতিয়ান।',
    icon: BookOpen,
    isQuickAccess: true
  },
  {
    id: 'COLLECTION_REPORT',
    category: 'MEMBER',
    nameEn: 'Monthly Collection Statement',
    nameBn: 'মাসিক চাঁদা আদায় বিবরণী',
    descriptionEn: 'Subscription fee collection records and payment vouchers.',
    descriptionBn: 'মাসভিত্তিক চাঁদা ও ফি আদায়ের রশিদ এবং সদস্য জমা বিশ্লেষণ।',
    icon: DollarSign
  },
  {
    id: 'DUE_REPORT',
    category: 'MEMBER',
    nameEn: 'Due & Aging Report',
    nameBn: 'বকেয়া ও ডিউ এজিং প্রতিবেদন',
    descriptionEn: 'Overdue monthly contributions and aging classification.',
    descriptionBn: 'সদস্যদের বকেয়া চাঁদা এবং সময়ভিত্তিক ডিউ এজিং নিরীক্ষা।',
    icon: AlertTriangle,
    isQuickAccess: true
  },
  {
    id: 'LATE_FEE_WAIVER_REPORT',
    category: 'MEMBER',
    nameEn: 'Late Fee Waiver Report',
    nameBn: 'বিলম্ব ফি মওকুফ রেজিস্টার ও রিপোর্ট',
    descriptionEn: 'Audit register of approved late fee waivers during bulk/due collections.',
    descriptionBn: 'বকেয়া আদায়কালীন অনুমোদিত বিলম্ব ফি মওকুফ ও অডিট খতিয়ান।',
    icon: ShieldCheck,
    isQuickAccess: true
  },
  {
    id: 'CAPITAL_REPORT',
    category: 'MEMBER',
    nameEn: 'Capital Register',
    nameBn: 'সদস্য মূলধন রেজিস্টার ও স্থিতি',
    descriptionEn: 'Member share capital deposits and equity balances.',
    descriptionBn: 'সদস্যদের জমা রাখা স্থায়ী শেয়ার মূলধনের পুঞ্জীভূত ব্যালেন্স।',
    icon: Building
  },
  {
    id: 'MEMBER_STATEMENT',
    category: 'MEMBER',
    nameEn: 'Member Financial Statement',
    nameBn: 'সদস্য আর্থিক সনদ ও সারসংক্ষেপ',
    descriptionEn: 'Official signed summary statement of member balances.',
    descriptionBn: 'সদস্যের সকল জমার দাপ্তরিক প্রত্যয়ন ও সারসংক্ষেপ প্রতিবেদন।',
    icon: FileSpreadsheet
  },
  {
    id: 'PROFIT_REPORT',
    category: 'MEMBER',
    nameEn: 'Profit Distribution Report',
    nameBn: 'লভ্যাংশ বণ্টন ও বোনাস বিবরণী',
    descriptionEn: 'Historical profit distribution breakdown by member shares.',
    descriptionBn: 'অর্থবছরের অর্জিত মুনাফা হতে সদস্যভিত্তিক লভ্যাংশ বণ্টন বিবরণী।',
    icon: TrendingUp
  },

  // CATEGORY 4: LOAN & INVESTMENT
  {
    id: 'LOAN_REGISTER',
    category: 'LOAN_INVEST',
    nameEn: 'Loan Register',
    nameBn: 'ঋণ বিতরণ রেজিস্টার',
    descriptionEn: 'List of all sanctioned and disbursed loans.',
    descriptionBn: 'অনুমোদিত ও বিতরণকৃত সকল ঋণের মাস্টার তালিকা।',
    icon: Briefcase
  },
  {
    id: 'LOAN_OUTSTANDING',
    category: 'LOAN_INVEST',
    nameEn: 'Loan Outstanding Report',
    nameBn: 'ঋণ স্থিতি ও অনাদায়ী আসল বিবরণী',
    descriptionEn: 'Active loans, principal balances, and default risks.',
    descriptionBn: 'চলতি ঋণের বকেয়া আসল, অবশিষ্ট মেয়াদের স্থিতি বিশ্লেষণ।',
    icon: Scale
  },
  {
    id: 'LOAN_REPAYMENT',
    category: 'LOAN_INVEST',
    nameEn: 'Loan Repayments & Installments',
    nameBn: 'ঋণ আদায় ও কিস্তি পরিশোধ খাতা',
    descriptionEn: 'Loan installment collection history and profit earned.',
    descriptionBn: 'ঋণের কিস্তি বাবদ আদায়কৃত আসল ও সেবামাশুলের হিসাব।',
    icon: CheckCircle2
  },
  {
    id: 'INVESTMENT_REPORT',
    category: 'LOAN_INVEST',
    nameEn: 'Investment Portfolio Register',
    nameBn: 'বিনিয়োগ ও বাণিজ্যিক প্রকল্প রেজিস্টার',
    descriptionEn: 'Commercial venture investments, assets, and partner stakes.',
    descriptionBn: 'সমিতির বাণিজ্যিক বিনিয়োগ প্রকল্প ও অংশীদারি মূলধন ট্র্যাকিং।',
    icon: Landmark
  },
  {
    id: 'INVESTMENT_PROFIT',
    category: 'LOAN_INVEST',
    nameEn: 'Investment Profit & Returns',
    nameBn: 'বিনিয়োগ মুনাফা ও আয় বিবরণী',
    descriptionEn: 'Periodic returns and dividends generated from investments.',
    descriptionBn: 'প্রকল্প হতে অর্জিত ব্যবসায়িক লভ্যাংশ ও ক্যাশ রিটার্ন বিবরণী।',
    icon: TrendingUp
  },
  {
    id: 'INVESTMENT_SETTLEMENT',
    category: 'LOAN_INVEST',
    nameEn: 'Investment Settlement Report',
    nameBn: 'বিনিয়োগ সমাপনী ও নিষ্পত্তি খতিয়ান',
    descriptionEn: 'Completed and closed investment accounts with capital return.',
    descriptionBn: 'সমাপ্ত বিনিয়োগ প্রকল্পের মূলধন প্রত্যাহার ও নিষ্পত্তি হিসেব।',
    icon: CheckCircle2
  },

  // CATEGORY 5: WELFARE & FUND
  {
    id: 'WELFARE_REPORT',
    category: 'WELFARE_FUND',
    nameEn: 'Welfare Fund Statement',
    nameBn: 'কল্যাণ তহবিল আয়-ব্যয় ও অনুদান',
    descriptionEn: 'Welfare fund contributions, healthcare assistance, and balance.',
    descriptionBn: 'কল্যাণ তহবিলের মাসিক জমা, অসুস্থতা ও চিকিৎসা অনুদানের হিসাব।',
    icon: HeartHandshake
  },
  {
    id: 'EMERGENCY_FUND',
    category: 'WELFARE_FUND',
    nameEn: 'Emergency Fund Statement',
    nameBn: 'জরুরি সহায়তা তহবিল বিবরণী',
    descriptionEn: 'Emergency relief disbursements and emergency fund reserve.',
    descriptionBn: 'দুর্ঘটনা ও দুর্যোগে সদস্যদের প্রদত্ত জরুরি সহায়তার হিসাব।',
    icon: HeartHandshake
  },
  {
    id: 'RESERVE_REPORT',
    category: 'WELFARE_FUND',
    nameEn: 'Reserve Fund Report',
    nameBn: 'সংরক্ষিত তহবিল ও ব্যবহার খতিয়ান',
    descriptionEn: 'Statutory reserve fund accumulation and executive utilizations.',
    descriptionBn: 'সমিতির সংবিধিবদ্ধ রিজার্ভ ফান্ড ও বিশেষ উন্নয়ন ব্যয়ের হিসাব।',
    icon: Building
  },
  {
    id: 'DONATION_REGISTER',
    category: 'WELFARE_FUND',
    nameEn: 'Donation & Grants Register',
    nameBn: 'অনুদান ও সামাজিক সাহায্য রেজিস্টার',
    descriptionEn: 'Philanthropic activities, grants, and community assistance.',
    descriptionBn: 'শিক্ষা, সামাজিক উন্নয়ন ও দুস্থ সহায়তা অনুদানের রেজিস্টার।',
    icon: HeartHandshake
  },
  {
    id: 'FUND_TRANSFER',
    category: 'WELFARE_FUND',
    nameEn: 'Fund Transfer Register',
    nameBn: 'তহবিল স্থানান্তর ও সমন্বয় প্রতিবেদন',
    descriptionEn: 'Inter-fund allocations, reserves, and general adjustments.',
    descriptionBn: 'এক তহবিল হতে অন্য তহবিলে অর্থ বরাদ্দ ও স্থানান্তর খাতা।',
    icon: Layers
  },

  // CATEGORY 6: SETTLEMENT
  {
    id: 'NORMAL_EXIT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Normal Member Exit Report',
    nameBn: 'স্বাভাবিক সদস্য প্রস্থান নিষ্পত্তি',
    descriptionEn: 'Standard member exit settlements with full capital refunds.',
    descriptionBn: 'নিয়মিত সদস্য প্রস্থান, জমার শতভাগ ফেরত ও নিষ্পত্তি হিসাব।',
    icon: CheckCircle2
  },
  {
    id: 'EARLY_EXIT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Early Member Exit Report',
    nameBn: 'আগাম প্রস্থান ও সার্ভিস চার্জ কর্তন',
    descriptionEn: 'Premature exit requests with 15% service charge deductions.',
    descriptionBn: 'সময়পূর্ব প্রস্থান এবং ১৫% সার্ভিস চার্জ কর্তনপূর্বক নিট পরিশোধ।',
    icon: Scale
  },
  {
    id: 'DEATH_SETTLEMENT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Death Settlement Report',
    nameBn: 'মৃত্যুজনিত সদস্য নিষ্পত্তি ও অনুদান',
    descriptionEn: 'Deceased member capital clearance and ৳20,000 welfare grant.',
    descriptionBn: 'মৃত সদস্যের মূলধন ফেরত এবং ২০,০০০ টাকা জরুরি কল্যাণ অনুদান।',
    icon: HeartHandshake
  },
  {
    id: 'PENDING_SETTLEMENT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Pending Settlement Approvals',
    nameBn: 'অনুমোদন অপেক্ষমাণ নিষ্পত্তি তালিকা',
    descriptionEn: 'Exit requests under review awaiting committee approval.',
    descriptionBn: 'কার্যনির্বাহী কমিটির চূড়ান্ত অনুমোদনের অপেক্ষায় থাকা নিষ্পত্তি।',
    icon: Clock
  },
  {
    id: 'APPROVED_SETTLEMENT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Approved Settlement Register',
    nameBn: 'অনুমোদিত নিষ্পত্তি ও অর্থছাড় আদেশ',
    descriptionEn: 'Approved exits ready for refund processing.',
    descriptionBn: 'কমিটি কর্তৃক অনুমোদিত এবং চেক/নগদ অর্থ প্রদানের জন্য প্রস্তুত তালিকা।',
    icon: ShieldCheck
  },
  {
    id: 'COMPLETED_SETTLEMENT_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Completed Settlements Archive',
    nameBn: 'চূড়ান্ত নিষ্পন্ন সদস্য হিসাব রেজিস্টার',
    descriptionEn: 'Archive of fully settled, refunded, and closed accounts.',
    descriptionBn: 'অর্থ পরিশোধ সম্পন্ন হওয়া সাবেক সদস্যদের সম্পূর্ণ আর্কাইভ।',
    icon: CheckCircle2
  },
  {
    id: 'SETTLEMENT_FINANCIAL_REPORT',
    category: 'SETTLEMENT',
    nameEn: 'Settlement Financial Summary',
    nameBn: 'নিষ্পত্তি আর্থিক বিশ্লেষণ ও সারসংক্ষেপ',
    descriptionEn: 'Total capital settled, service charges earned, and net payouts.',
    descriptionBn: 'মোট নিষ্পত্তি মূলধন, সমিতির অর্জিত সার্ভিস চার্জ ও পরিশোধিত অর্থ।',
    icon: FileSpreadsheet,
    isQuickAccess: true
  },

  // CATEGORY 7: AUDIT & CONTROL
  {
    id: 'AUDIT_TRAIL',
    category: 'AUDIT_CONTROL',
    nameEn: 'Audit Trail Logs',
    nameBn: 'অডিট ট্রেইল ও নিরাপত্তা লগ',
    descriptionEn: 'Immutable chronological audit logs for every system action.',
    descriptionBn: 'সিস্টেমের প্রতিটি এন্ট্রি, আপডেট ও অনুমোদন ট্র্যাককারী অডিট লগ।',
    icon: ShieldCheck,
    isQuickAccess: true
  },
  {
    id: 'USER_ACTIVITY',
    category: 'AUDIT_CONTROL',
    nameEn: 'User Activity & Accountability',
    nameBn: 'ব্যবহারকারী কার্যকলাপ ও জবাবদিহিতা',
    descriptionEn: 'Audit logs aggregated by user, role, action, and timestamp.',
    descriptionBn: 'কোন ব্যবহারকারী কখন কোন লেনদেন অনুমোদন বা সম্পাদন করেছেন তার হিসাব।',
    icon: Users
  },
  {
    id: 'ACCOUNTING_DIAGNOSTIC',
    category: 'AUDIT_CONTROL',
    nameEn: 'Accounting Diagnostic & Mapping Audit',
    nameBn: 'অ্যাকাউন্টিং ডায়াগনস্টিক ও ব্যালেন্স ম্যাপিং অডিট',
    descriptionEn: 'Three-way reconciliation: Journal-derived vs Cash Book vs Subledgers with duplicate detection.',
    descriptionBn: 'জার্নাল ব্যালেন্স, ক্যাশ বুক ব্যালেন্স এবং সাব-লেজার ব্যালেন্সের ত্রিমুখী সমন্বয় ও ডুপ্লিকেট নিরীক্ষা।',
    icon: Scale,
    isQuickAccess: true
  },
  {
    id: 'JOURNAL_AUDIT',
    category: 'AUDIT_CONTROL',
    nameEn: 'Journal Balancing Audit',
    nameBn: 'জাবেদা নিরীক্ষা ও ভারসাম্য যাচাই',
    descriptionEn: 'Audit inspection of debit-credit equality in every journal voucher.',
    descriptionBn: 'প্রতিটি জাবেদায় ডেবিট ও ক্রেডিট সমান থাকার অডিট পরীক্ষণ।',
    icon: Scale
  },
  {
    id: 'CASH_AUDIT',
    category: 'AUDIT_CONTROL',
    nameEn: 'Cash Audit & Verification',
    nameBn: 'ক্যাশ অডিট ও শারীরিক স্থিতি পরীক্ষণ',
    descriptionEn: 'Audit logs of cash transactions, voids, and cash reconciliations.',
    descriptionBn: 'নগদ জমা-খরচ, বাতিল ভাউচার ও ক্যাশ গণনার নিরীক্ষা রিপোর্ট।',
    icon: DollarSign
  },
  {
    id: 'BANK_AUDIT',
    category: 'AUDIT_CONTROL',
    nameEn: 'Bank Audit & Reconciliation',
    nameBn: 'ব্যাংক হিসাব ও লেনদেন নিরীক্ষা',
    descriptionEn: 'Bank book vs bank statement discrepancy audit trace.',
    descriptionBn: 'ব্যাংক পাসবুক ও সফটওয়্যার লেজারের অসঙ্গতি নিরীক্ষা লগ।',
    icon: Landmark
  },
  {
    id: 'DATA_CHANGE_HISTORY',
    category: 'AUDIT_CONTROL',
    nameEn: 'Data Change History',
    nameBn: 'তথ্য সংশোধন ও পরিবর্তনের ইতিহাস',
    descriptionEn: 'Tracking of edited, updated, or corrected master records.',
    descriptionBn: 'সদস্য বা লেনদেনের তথ্য সম্পাদনা এবং পূর্বাবস্থার হিস্ট্রি লগ।',
    icon: RotateCcw
  },
  {
    id: 'REVERSED_TRANSACTIONS',
    category: 'AUDIT_CONTROL',
    nameEn: 'Deleted & Reversed Transactions',
    nameBn: 'মুছে ফেলা ও রিভার্সড লেনদেনের খাতা',
    descriptionEn: 'Complete log of rolled back collections, cash, and contra entries.',
    descriptionBn: 'ভুল সংশোধনের উদ্দেশ্যে রিভার্স বা বাতিলকৃত সকল লেনদেনের তালিকা।',
    icon: AlertTriangle
  },
  {
    id: 'FY_AUDIT',
    category: 'AUDIT_CONTROL',
    nameEn: 'Financial Year Closing Audit',
    nameBn: 'অর্থবছর সমাপনী ও ক্লোজিং অডিট',
    descriptionEn: 'Audit history of closed financial years and carried-forward balances.',
    descriptionBn: 'সমাপ্ত অর্থবছরের জের স্থানান্তর এবং সংরক্ষিত অডিট প্রতিবেদন।',
    icon: Calendar
  },
  {
    id: 'SYSTEM_EXCEPTIONS',
    category: 'AUDIT_CONTROL',
    nameEn: 'Audit Exceptions & Controls',
    nameBn: 'সিস্টেম অডিট ত্রুটি ও অভ্যন্তরীণ নিয়ন্ত্রণ',
    descriptionEn: 'Automated scanner for duplicate vouchers, missing tags & anomalies.',
    descriptionBn: 'স্বয়ংক্রিয়ভাবে সনাক্তকৃত অডিট ব্যতিক্রম, দ্বৈত এন্ট্রি ও অসঙ্গতি প্যানেল।',
    icon: ShieldAlert
  }
];

export const ReportsCenterView: React.FC = () => {
  const { db, language, activeUser, navigateTo } = useApp();
  const isBangla = language === 'bn';

  // Navigation / Filter State
  const [selectedReport, setSelectedReport] = useState<string>('BALANCE_SHEET');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFy, setSelectedFy] = useState<string>(db.settings.currentFinancialYear || '2026-2027');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');
  const [userFilter, setUserFilter] = useState<string>('ALL');

  // Recently Viewed Tracking (Session level)
  const [recentReportIds, setRecentReportIds] = useState<string[]>([
    'BALANCE_SHEET',
    'PROFIT_LOSS',
    'TRIAL_BALANCE',
    'AUDIT_TRAIL'
  ]);

  // Transaction Drill-Down Modal State
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  // Financial Summary from Accounting Engine
  const summary = useMemo(() => {
    return AccountingService.calculateFinancialSummary(db);
  }, [db]);

  // Real-time Audit Exceptions Scan
  const auditExceptions = useMemo(() => {
    return scanAuditExceptions(db);
  }, [db]);

  const auditExceptionsCount = auditExceptions.length;

  const handleSelectReport = (reportId: string) => {
    setSelectedReport(reportId);
    setRecentReportIds(prev => {
      const filtered = prev.filter(id => id !== reportId);
      return [reportId, ...filtered].slice(0, 8);
    });
  };

  const handleDrillDown = (item: any) => {
    setSelectedTransaction(item);
    setDrillDownModalOpen(true);
  };

  const handlePrint = () => {
    PdfService.printElement('official-printable-report', `AJ_Society_${selectedReport}`);
  };

  const handleDownloadPdf = () => {
    PdfService.exportToPdf('official-printable-report', `AJ_Society_${selectedReport}.pdf`);
  };

  const handleExportExcel = () => {
    const isMember = activeUser?.role === 'MEMBER';
    const currentMemberId = activeUser?.linkedMemberId;

    switch (selectedReport) {
      case 'BALANCE_SHEET':
      case 'PROFIT_LOSS':
      case 'CASH_FLOW':
      case 'TRIAL_BALANCE':
        if (isMember) {
          alert(isBangla ? 'আপনার এই রিপোর্ট ডাউনলোড করার অনুমতি নেই।' : 'You are not authorized to download this report.');
          return;
        }
        ExcelService.exportFinancialSummary(db, summary);
        break;
      case 'MEMBER_REGISTER':
      case 'MEMBER_SUMMARY':
      case 'MEMBER_STATEMENT':
        if (isMember) {
          ExcelService.exportMembers(db, (db.members || []).filter(m => m.memberId === currentMemberId));
        } else {
          ExcelService.exportMembers(db, db.members || []);
        }
        break;
      case 'COLLECTION_REPORT':
        if (isMember) {
          ExcelService.exportCollections(db, (db.collections || []).filter(c => c.memberId === currentMemberId));
        } else {
          ExcelService.exportCollections(db, db.collections || []);
        }
        break;
      case 'DUE_REPORT':
        if (isMember) {
          const ageing = (db.members || [])
            .filter(m => m.memberId === currentMemberId)
            .map(m => {
              const d = AccountingService.calculateMemberDue(
                m,
                db.collections || [],
                db.settings.monthlyContribution || 1000,
                db.settings.lateFine || 20,
                db.settings.latePaymentDay || 10
              );
              return {
                category: d.totalDueAmount > 0 ? (d.monthsDueCount > 6 ? '6+ MONTHS' : `${d.monthsDueCount} MONTHS`) : 'CURRENT',
                memberId: m.memberId,
                memberName: m.fullName,
                mobile: m.mobile,
                oldestDueMonth: d.unpaidMonths[0] || '',
                monthsOverdue: d.monthsDueCount,
                totalDue: d.totalDueAmount
              };
            })
            .filter(x => x.totalDue > 0);
          ExcelService.exportDueAging(db, ageing);
        } else {
          const ageing = (db.members || []).map(m => {
            const d = AccountingService.calculateMemberDue(
              m,
              db.collections || [],
              db.settings.monthlyContribution || 1000,
              db.settings.lateFine || 20,
              db.settings.latePaymentDay || 10
            );
            return {
              category: d.totalDueAmount > 0 ? (d.monthsDueCount > 6 ? '6+ MONTHS' : `${d.monthsDueCount} MONTHS`) : 'CURRENT',
              memberId: m.memberId,
              memberName: m.fullName,
              mobile: m.mobile,
              oldestDueMonth: d.unpaidMonths[0] || '',
              monthsOverdue: d.monthsDueCount,
              totalDue: d.totalDueAmount
            };
          }).filter(x => x.totalDue > 0);
          ExcelService.exportDueAging(db, ageing);
        }
        break;
      case 'CAPITAL_REPORT':
        if (isMember) {
          ExcelService.exportCapital(db, (db.capitalDeposits || []).filter(c => c.memberId === currentMemberId));
        } else {
          ExcelService.exportCapital(db, db.capitalDeposits || []);
        }
        break;
      case 'LOAN_REGISTER':
      case 'LOAN_OUTSTANDING':
      case 'LOAN_REPAYMENT':
      case 'LOAN_AUDIT':
        if (isMember) {
          ExcelService.exportLoans(db, (db.loans || []).filter(l => l.memberId === currentMemberId));
          ExcelService.exportLoanRepayments(db, (db.loanRepayments || []).filter(r => r.memberId === currentMemberId));
        } else {
          ExcelService.exportLoans(db, db.loans || []);
          ExcelService.exportLoanRepayments(db, db.loanRepayments || []);
        }
        break;
      case 'INVESTMENT_REPORT':
      case 'INVESTMENT_PROFIT':
      case 'INVESTMENT_SETTLEMENT':
        if (isMember) {
          alert(isBangla ? 'আপনার এই রিপোর্ট ডাউনলোড করার অনুমতি নেই।' : 'You are not authorized to download this report.');
          return;
        }
        ExcelService.exportInvestments(db, db.investments || []);
        break;
      case 'INCOME_EXPENSE_REPORT':
        if (isMember) {
          ExcelService.exportIncome(db, (db.incomes || []).filter(i => i.memberId === currentMemberId));
        } else {
          ExcelService.exportIncome(db, db.incomes || []);
          ExcelService.exportExpenses(db, db.expenses || []);
        }
        break;
      case 'CASH_BOOK':
      case 'CASH_AUDIT':
        ExcelService.exportCashBook(db, db.cashTransactions || []);
        break;
      case 'BANK_BOOK':
      case 'BANK_AUDIT':
        ExcelService.exportBankBook(db, db.bankTransactions || []);
        break;
      case 'WELFARE_REPORT':
      case 'EMERGENCY_FUND':
      case 'DONATION_REGISTER':
        ExcelService.exportWelfare(db, db.welfareTransactions || []);
        break;
      case 'PROFIT_REPORT':
        ExcelService.exportProfit(db, db.historicalProfits || []);
        break;
      case 'CASH_RECON_REPORT':
        ExcelService.exportCashReconciliation(db, db.cashReconciliations || []);
        break;
      case 'BANK_RECON_REPORT':
        ExcelService.exportBankReconciliation(db, db.bankReconciliations || []);
        break;
      case 'FY_AUDIT':
      case 'YEAR_CLOSING':
        ExcelService.exportYearClosing(db, db.financialYears || []);
        break;
      case 'JOURNAL_REGISTER':
      case 'GENERAL_LEDGER':
      case 'JOURNAL_AUDIT':
        ExcelService.exportJournal(db, db.journalEntries || [], db.journalLines || []);
        break;
      default:
        ExcelService.exportFinancialSummary(db, summary);
        break;
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setDateFrom('');
    setDateTo('');
    setAccountFilter('ALL');
    setMemberFilter('ALL');
    setUserFilter('ALL');
  };

  // Filtered list of reports based on search & category
  const filteredReportList = useMemo(() => {
    return ALL_REPORTS.filter(r => {
      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          r.nameEn.toLowerCase().includes(term) ||
          r.nameBn.toLowerCase().includes(term) ||
          r.descriptionEn.toLowerCase().includes(term) ||
          r.descriptionBn.toLowerCase().includes(term) ||
          r.category.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [selectedCategory, searchTerm]);

  // Current active report object
  const currentReportDef = ALL_REPORTS.find(r => r.id === selectedReport) || ALL_REPORTS[0];

  return (
    <div className="space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
      {/* 1. PAGE HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-black shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {isBangla ? 'রিপোর্ট ও অডিট সেন্টার' : 'Reports & Audit Center'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isBangla ? 'অর্থবছর:' : 'FY:'} {selectedFy}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isBangla
                  ? 'সমিতির আর্থিক হিসাব, সদস্য হিসাব, তহবিল, Settlement এবং Audit Trail-এর পূর্ণাঙ্গ রিপোর্ট কেন্দ্র।'
                  : 'Comprehensive financial statements, member accounts, welfare funds, settlements, and immutable audit trail.'}
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Print Official View"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{isBangla ? 'প্রিন্ট' : 'Print'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download PDF"
          >
            <Download className="w-4 h-4 text-rose-600" />
            <span>{isBangla ? 'PDF' : 'PDF'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isBangla ? 'এক্সেল' : 'Excel'}</span>
          </button>

          <button
            onClick={() => handleResetFilters()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Refresh / Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TOP KPI SUMMARY (6 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Income */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isBangla ? 'মোট অর্জিত আয়' : 'Total Income'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg text-emerald-950">
            ৳{(summary.totalIncome || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            {isBangla ? 'ভর্তি ফি, লভ্যাংশ ও মুনাফা' : 'Admission, Profit & Returns'}
          </span>
        </div>

        {/* Total Expense */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isBangla ? 'মোট ব্যয়' : 'Total Expense'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 rotate-180" />
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg text-rose-950">
            ৳{(summary.totalExpense || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-rose-700 font-medium">
            {isBangla ? 'পরিচালন ও সেবা ব্যয়' : 'Operating & Service Costs'}
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isBangla ? 'নিট উদ্বৃত্ত / লাভ' : 'Net Surplus'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg text-indigo-950">
            ৳{(summary.netProfit || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-indigo-700 font-medium">
            {isBangla ? 'বণ্টনযোগ্য নিট মুনাফা' : 'Distributable Profit'}
          </span>
        </div>

        {/* Cash Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isBangla ? 'হাতে নগদ স্থিতি' : 'Cash in Hand'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg text-amber-950">
            ৳{(summary.cashInHand || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">
            {isBangla ? 'ক্যাশ ইন হ্যান্ড স্থিতি' : 'Physical Liquid Cash'}
          </span>
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isBangla ? 'ব্যাংক আমানত' : 'Bank Balance'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg text-teal-950">
            ৳{(summary.bankBalance || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-teal-700 font-medium">
            {isBangla ? 'ব্যাংক অ্যাকাউন্ট স্থিতি' : 'Verified Bank Balance'}
          </span>
        </div>

        {/* Audit Exceptions */}
        <div
          onClick={() => handleSelectReport('SYSTEM_EXCEPTIONS')}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-2 cursor-pointer transition-all hover:scale-[1.02] ${
            auditExceptionsCount > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase opacity-80">
              {isBangla ? 'অডিট ব্যতিক্রম' : 'Audit Exceptions'}
            </span>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                auditExceptionsCount > 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
              }`}
            >
              {auditExceptionsCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div className="font-mono font-black text-base sm:text-lg">
            {auditExceptionsCount} {isBangla ? 'টি বিচ্যুতি' : 'Exceptions'}
          </div>
          <span className="text-[10px] font-semibold flex items-center gap-1">
            {auditExceptionsCount === 0
              ? (isBangla ? '✓ সম্পূর্ণ সঠিক ও সুরক্ষিত' : '✓ Fully balanced & clean')
              : (isBangla ? '⚠ দেখতে ক্লিক করুন' : '⚠ Click to inspect')}
          </span>
        </div>
      </div>

      {/* 3. QUICK ACCESS / FAVORITES & RECENT REPORTS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-xs font-bold text-slate-800">
              {isBangla ? 'দ্রুত প্রবেশ ও প্রিয় রিপোর্ট (Quick Access)' : 'Quick Access Reports'}
            </span>
          </div>

          {recentReportIds.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px]">{isBangla ? 'সম্প্রতি দেখা:' : 'Recent:'}</span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {recentReportIds.slice(0, 4).map(id => {
                  const rep = ALL_REPORTS.find(r => r.id === id);
                  if (!rep) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelectReport(id)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                        selectedReport === id
                          ? 'bg-emerald-800 text-white font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isBangla ? rep.nameBn.split(' ')[0] : rep.nameEn}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Access Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {ALL_REPORTS.filter(r => r.isQuickAccess).map(r => {
            const Icon = r.icon;
            const isSelected = selectedReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => handleSelectReport(r.id)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`} />
                <div>
                  <span className="text-[11px] font-bold block leading-tight">
                    {isBangla ? r.nameBn.split('(')[0].trim() : r.nameEn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SEARCH & GLOBAL REPORT FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-2">
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'রিপোর্ট ও খতিয়ান অনুসন্ধান' : 'Search Reports'}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isBangla ? 'রিপোর্টের নাম, খাত বা বিবরণ দিয়ে খুঁজুন...' : 'Search report title, head or keyword...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Financial Year Selector */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'অর্থবছর (Financial Year)' : 'Financial Year'}
            </label>
            <select
              value={selectedFy}
              onChange={e => setSelectedFy(e.target.value)}
              className="w-full bg-slate-50 border-slate-300 rounded-xl p-2 font-medium"
            >
              {(db.financialYears || []).map(fy => (
                <option key={fy.id} value={fy.yearCode}>
                  {fy.yearCode} {fy.status === 'CLOSED' ? '(Closed)' : '(Active)'}
                </option>
              ))}
              {(!db.financialYears || db.financialYears.length === 0) && (
                <option value="2026-2027">2026-2027 (Active)</option>
              )}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'শুরুর তারিখ' : 'Date From'}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border-slate-300 rounded-xl p-1.5"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'শেষ তারিখ' : 'Date To'}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border-slate-300 rounded-xl p-1.5"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isBangla ? 'রিসেট' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. CATEGORY TABS SELECTOR */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs hide-print">
        {[
          { id: 'ALL', labelBn: 'সকল রিপোর্ট', labelEn: 'All Reports (48)', icon: Layers },
          { id: 'FINANCIAL', labelBn: '১. আর্থিক প্রতিবেদন', labelEn: 'Financial Reports', icon: Building },
          { id: 'CASH_BANK', labelBn: '২. নগদ ও ব্যাংক', labelEn: 'Cash & Bank', icon: Landmark },
          { id: 'MEMBER', labelBn: '৩. সদস্য ও চাঁদা', labelEn: 'Member Reports', icon: Users },
          { id: 'LOAN_INVEST', labelBn: '৪. ঋণ ও বিনিয়োগ', labelEn: 'Loan & Investment', icon: Briefcase },
          { id: 'WELFARE_FUND', labelBn: '৫. কল্যাণ ও তহবিল', labelEn: 'Welfare & Fund', icon: HeartHandshake },
          { id: 'SETTLEMENT', labelBn: '৬. সদস্য নিষ্পত্তি', labelEn: 'Settlement Reports', icon: FileSpreadsheet },
          { id: 'AUDIT_CONTROL', labelBn: '৭. অডিট ও নিয়ন্ত্রণ', labelEn: 'Audit & Control', icon: ShieldCheck }
        ].map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`pb-2.5 px-3.5 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                isSelected
                  ? 'border-emerald-800 text-emerald-900 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isBangla ? cat.labelBn : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* 6. REPORT CARDS EXPLORER GRID (If searching or switching categories) */}
      {(selectedCategory !== 'ALL' || searchTerm) && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {isBangla ? 'পাওয়া গেছে:' : 'Found:'} <strong>{filteredReportList.length}</strong> {isBangla ? 'টি রিপোর্ট' : 'reports'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReportList.map(r => {
              const Icon = r.icon;
              const isSelected = selectedReport === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectReport(r.id)}
                  className={`p-3.5 rounded-xl border bg-white shadow-xs cursor-pointer transition-all hover:border-emerald-500 space-y-2.5 flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {isBangla ? r.nameBn : r.nameEn}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.nameEn}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {isBangla ? r.descriptionBn : r.descriptionEn}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                      {r.category.replace('_', ' ')}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleSelectReport(r.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-800 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isBangla ? 'দেখুন' : 'Open'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. OFFICIAL PRINTABLE REPORT VIEWER CONTAINER */}
      <div
        id="official-printable-report"
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-5xl mx-auto"
      >
        {/* Official Society Header */}
        <div className="text-center border-b-2 border-emerald-900 pb-4 space-y-1 relative">
          <div className="absolute left-0 top-0">
            <AJFLogo 
              variant="print" 
              alt={db.settings.orgNameBangla || 'আতরগাঁও জাগরণী ক্লাব লোগো'} 
              className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" 
            />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded">
            {db.settings.slogan || 'সামাজিক উন্নয়ন ও কল্যাণ'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {db.settings.orgNameBangla || db.settings.orgName}
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            {db.settings.address || 'Address Not Provided'} | {isBangla ? 'ফোন:' : 'Phone:'} {db.settings.phone}
          </p>
          <div className="pt-2 flex flex-wrap justify-center items-center gap-4 text-xs font-mono font-bold text-emerald-950">
            <span>{isBangla ? 'অর্থবছর:' : 'Financial Year:'} {selectedFy}</span>
            <span>•</span>
            <span>{isBangla ? 'প্রতিবেদন তৈরির তারিখ:' : 'Generated Date:'} {new Date().toLocaleDateString(isBangla ? 'bn-BD' : 'en-US')}</span>
            <span>•</span>
            <span>{isBangla ? 'প্রস্তুতকারী:' : 'Generated By:'} {activeUser?.fullName || 'Authorized Auditor'}</span>
          </div>
        </div>

        {/* DYNAMIC REPORT CONTENT SWITCHER */}
        <div className="min-h-[400px]">
          {/* Trial Balance */}
          {selectedReport === 'TRIAL_BALANCE' && (
            <TrialBalanceReport db={db} dateFrom={dateFrom} dateTo={dateTo} onDrillDown={handleDrillDown} />
          )}

          {/* Balance Sheet */}
          {selectedReport === 'BALANCE_SHEET' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  উদ্বৃত্তপত্র / আর্থিক অবস্থার বিবরণী (Statement of Financial Position)
                </h2>
                <p className="text-xs text-slate-500">
                  হিসাব সমাপ্তি তারিখ পর্যন্ত সমিতির সম্পদ, দায় ও নিজস্ব তহবিলের প্রকৃত অবস্থান
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Assets Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between border-b border-slate-200">
                    <span>সম্পদসমূহ (ASSETS)</span>
                    <span>টাকা (৳)</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">হাতে নগদ স্থিতি (Cash in Hand)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.cashInHand?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">ব্যাংক আমানত স্থিতি (Sonali Bank Bajitpur)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.bankBalance?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">সদস্যদের নিকট বিতরণকৃত অবশিষ্ট ঋণ স্থিতি</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.outstandingLoans?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">বাণিজ্যিক বিনিয়োগ মূলধন (Active Projects)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.totalInvestments?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-2.5 font-bold text-emerald-950 flex justify-between border-t border-emerald-200">
                    <span>মোট সম্পদ (Total Assets)</span>
                    <span className="font-mono text-sm font-black">৳{summary.totalAssets?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between border-b border-slate-200">
                    <span>দায় ও তহবিল (LIABILITIES & EQUITY)</span>
                    <span>টাকা (৳)</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">সদস্যদের স্থায়ী মূলধন আমানত (Capital)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.totalCapital?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">সদস্যদের জমা চাঁদা স্থিতি (Monthly Fund)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.totalCollections?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">কল্যাণ তহবিল ব্যালেন্স (Welfare Fund)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.welfareFundBalance?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">জরুরী তহবিল ব্যালেন্স (Emergency Fund)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.emergencyFundBalance?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">সংরক্ষিত তহবিল (Statutory Reserve)</span>
                      <span className="font-mono font-bold text-slate-900">
                        ৳{summary.reserveFundBalance?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-2.5 font-bold text-indigo-950 flex justify-between border-t border-indigo-200">
                    <span>মোট দায় ও তহবিল (Total Equity)</span>
                    <span className="font-mono text-sm font-black">৳{summary.totalAssets?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profit & Loss */}
          {selectedReport === 'PROFIT_LOSS' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  আয়-ব্যয় ও লাভ-ক্ষতি বিবরণী (Income & Expenditure Statement)
                </h2>
                <p className="text-xs text-slate-500">অর্থবছর: {selectedFy}</p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-900 flex justify-between">
                  <span>বিবরণ (Particulars)</span>
                  <span>টাকা (৳)</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Income */}
                  <div>
                    <h4 className="font-bold text-emerald-900 uppercase text-[11px] mb-2">
                      ক) অর্জিত আয়সমূহ (Revenues):
                    </h4>
                    <div className="space-y-2 pl-2">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>সদস্য ভর্তি ফি বাবদ আয়</span>
                        <span className="font-mono font-semibold">
                          ৳{(db.incomes || []).filter(i => i.incomeHead === 'Admission Fee').reduce((s, i) => s + i.amount, 0)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>ঋণের সার্ভিস চার্জ / লাভ বাবদ আয়</span>
                        <span className="font-mono font-semibold">
                          ৳{(db.incomes || []).filter(i => i.incomeHead.includes('Interest') || i.incomeHead.includes('Service Charge')).reduce((s, i) => s + i.amount, 0)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span>বাণিজ্যিক বিনিয়োগ হতে অর্জিত নিট মুনাফা</span>
                        <span className="font-mono font-semibold">
                          ৳{(db.incomes || []).filter(i => i.incomeHead === 'Investment Return').reduce((s, i) => s + i.amount, 0)?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-900 pt-1 border-t border-slate-200">
                        <span>সর্বমোট অর্জিত আয় (A)</span>
                        <span className="font-mono text-sm">৳{summary.totalIncome?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expense */}
                  <div>
                    <h4 className="font-bold text-rose-900 uppercase text-[11px] mb-2">
                      খ) পরিচালন ব্যয়সমূহ (Expenditures):
                    </h4>
                    <div className="space-y-2 pl-2">
                      {(db.expenses || []).map(e => (
                        <div key={e.expenseId} className="flex justify-between border-b border-slate-100 pb-1">
                          <span>{e.expenseHead} ({e.payee})</span>
                          <span className="font-mono">৳{e.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-rose-900 pt-1 border-t border-slate-200">
                        <span>সর্বমোট পরিচালন ব্যয় (B)</span>
                        <span className="font-mono text-sm">৳{summary.totalExpense?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between font-bold text-sm text-emerald-950">
                    <span>নিট পরিচালন লাভ / উদ্বৃত্ত (Net Surplus = A - B)</span>
                    <span className="font-mono font-black">৳{summary.netProfit?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* General Ledger */}
          {selectedReport === 'GENERAL_LEDGER' && (
            <GeneralLedgerReport db={db} dateFrom={dateFrom} dateTo={dateTo} onDrillDown={handleDrillDown} mode="LEDGER" />
          )}

          {/* Journal Register */}
          {(selectedReport === 'JOURNAL_REGISTER' || selectedReport === 'JOURNAL_AUDIT') && (
            <GeneralLedgerReport db={db} dateFrom={dateFrom} dateTo={dateTo} onDrillDown={handleDrillDown} mode="JOURNAL" />
          )}

          {/* Chart of Accounts */}
          {selectedReport === 'CHART_OF_ACCOUNTS' && (
            <ChartOfAccountsView />
          )}

          {/* Cash Flow */}
          {selectedReport === 'CASH_FLOW' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
                  নগদ তহবিল ও তারল্য বিবরণী (Liquidity & Cash Flow Statement)
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">হাতে নগদ তহবিল:</span>
                  <span className="text-2xl font-bold font-mono text-emerald-900">
                    ৳{summary.cashInHand?.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-bold block uppercase text-[10px]">ব্যাংক আমানত স্থিতি:</span>
                  <span className="text-2xl font-bold font-mono text-teal-900">
                    ৳{summary.bankBalance?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cash Book */}
          {(selectedReport === 'CASH_BOOK' || selectedReport === 'CASH_AUDIT') && (
            <CashBookView />
          )}

          {/* Bank Book */}
          {(selectedReport === 'BANK_BOOK' || selectedReport === 'BANK_AUDIT') && (
            <BankBookView />
          )}

          {/* Member Reports */}
          {(selectedReport === 'MEMBER_REGISTER' ||
            selectedReport === 'MEMBER_SUMMARY' ||
            selectedReport === 'MEMBER_STATEMENT' ||
            selectedReport === 'CAPITAL_REPORT') && (
            <MemberFinancialStatementReport
              db={db}
              reportType={selectedReport === 'CAPITAL_REPORT' ? 'CAPITAL' : 'STATEMENT'}
              onDrillDown={handleDrillDown}
            />
          )}

          {/* Due Report */}
          {selectedReport === 'DUE_REPORT' && <DueReport db={db} />}

          {/* Late Fee Waiver Report */}
          {selectedReport === 'LATE_FEE_WAIVER_REPORT' && <LateFeeWaiverReport db={db} />}

          {/* Collection Report */}
          {selectedReport === 'COLLECTION_REPORT' && <CollectionReport db={db} />}

          {/* Loan Reports */}
          {(selectedReport === 'LOAN_REGISTER' ||
            selectedReport === 'LOAN_OUTSTANDING' ||
            selectedReport === 'LOAN_REPAYMENT' ||
            selectedReport === 'LOAN_AUDIT') && (
            <LoanReportView db={db} reportType="LOANS" onDrillDown={handleDrillDown} />
          )}

          {/* Investment Reports */}
          {(selectedReport === 'INVESTMENT_REPORT' ||
            selectedReport === 'INVESTMENT_PROFIT' ||
            selectedReport === 'INVESTMENT_SETTLEMENT') && (
            <LoanReportView db={db} reportType="INVESTMENTS" onDrillDown={handleDrillDown} />
          )}

          {/* Income & Expense */}
          {selectedReport === 'INCOME_EXPENSE_REPORT' && <IncomeExpenseReport db={db} />}

          {/* Welfare & Fund Reports */}
          {(selectedReport === 'WELFARE_REPORT' ||
            selectedReport === 'EMERGENCY_FUND' ||
            selectedReport === 'DONATION_REGISTER') && <WelfareReport db={db} />}

          {selectedReport === 'RESERVE_REPORT' && <ReserveFundReport db={db} />}
          {selectedReport === 'PROFIT_REPORT' && <ProfitReport db={db} />}
          {selectedReport === 'MEETING_ATTENDANCE' && <MeetingsView />}

          {/* Reconciliations */}
          {selectedReport === 'CASH_RECON_REPORT' && <CashReconciliationReport db={db} />}
          {selectedReport === 'BANK_RECON_REPORT' && <BankReconciliationReport db={db} />}
          {selectedReport === 'CONTRA_REPORT' && <ContraReport />}
          {selectedReport === 'BANK_TRANSFER_REPORT' && <ContraReport />}
          {selectedReport === 'FUND_TRANSFER' && <ContraReport />}
          {(selectedReport === 'YEAR_CLOSING' || selectedReport === 'FY_AUDIT') && <YearClosingReport db={db} />}

          {/* Settlement Reports Suite */}
          {(selectedReport === 'NORMAL_EXIT_REPORT' ||
            selectedReport === 'EARLY_EXIT_REPORT' ||
            selectedReport === 'DEATH_SETTLEMENT_REPORT' ||
            selectedReport === 'PENDING_SETTLEMENT_REPORT' ||
            selectedReport === 'APPROVED_SETTLEMENT_REPORT' ||
            selectedReport === 'COMPLETED_SETTLEMENT_REPORT' ||
            selectedReport === 'SETTLEMENT_FINANCIAL_REPORT' ||
            selectedReport === 'MEMBER_EXIT_REPORT') && (
            <SettlementReportsContainer
              db={db}
              reportType={
                selectedReport === 'NORMAL_EXIT_REPORT'
                  ? 'NORMAL'
                  : selectedReport === 'EARLY_EXIT_REPORT'
                  ? 'EARLY'
                  : selectedReport === 'DEATH_SETTLEMENT_REPORT'
                  ? 'DEATH'
                  : selectedReport === 'PENDING_SETTLEMENT_REPORT'
                  ? 'PENDING'
                  : selectedReport === 'APPROVED_SETTLEMENT_REPORT'
                  ? 'APPROVED'
                  : selectedReport === 'COMPLETED_SETTLEMENT_REPORT'
                  ? 'COMPLETED'
                  : 'FINANCIAL'
              }
              onDrillDown={handleDrillDown}
            />
          )}

          {/* Audit & Control Suite */}
          {(selectedReport === 'AUDIT_TRAIL' ||
            selectedReport === 'USER_ACTIVITY' ||
            selectedReport === 'DATA_CHANGE_HISTORY' ||
            selectedReport === 'REVERSED_TRANSACTIONS') && (
            <AuditTrailView db={db} onDrillDown={handleDrillDown} />
          )}

          {/* System Exceptions Scanner */}
          {selectedReport === 'SYSTEM_EXCEPTIONS' && (
            <AuditExceptionsView db={db} onDrillDown={handleDrillDown} />
          )}

          {/* Accounting Diagnostic & Mapping Audit */}
          {(selectedReport === 'ACCOUNTING_DIAGNOSTIC' || selectedReport === 'JOURNAL_AUDIT') && (
            <AccountingDiagnosticView db={db} onDrillDown={handleDrillDown} />
          )}
        </div>

        {/* Official Governance Signatures */}
        <div className="pt-12 border-t-2 border-slate-300 grid grid-cols-4 gap-4 text-center text-xs text-slate-700">
          <div className="space-y-1">
            <div className="h-10 border-b border-dashed border-slate-400"></div>
            <span className="font-bold block">প্রস্তুতকারী হিসাবরক্ষক</span>
            <span className="text-[10px] text-slate-400">আতরগাঁও সমিতি</span>
          </div>

          <div className="space-y-1">
            <div className="h-10 border-b border-dashed border-slate-400"></div>
            <span className="font-bold block">অর্থ সম্পাদক</span>
            <span className="text-[10px] text-slate-400">কার্যনির্বাহী পরিষদ</span>
          </div>

          <div className="space-y-1">
            <div className="h-10 border-b border-dashed border-slate-400"></div>
            <span className="font-bold block">সাধারণ সম্পাদক</span>
            <span className="text-[10px] text-slate-400">কার্যনির্বাহী পরিষদ</span>
          </div>

          <div className="space-y-1">
            <div className="h-10 border-b border-dashed border-slate-400"></div>
            <span className="font-bold block">সভাপতি</span>
            <span className="text-[10px] text-slate-400">কার্যনির্বাহী পরিষদ</span>
          </div>
        </div>
      </div>

      {/* Transaction Drill-Down Modal */}
      <TransactionDetailModal
        isOpen={drillDownModalOpen}
        onClose={() => setDrillDownModalOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
};
