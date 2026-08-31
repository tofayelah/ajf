import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  Scale,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  FileCheck2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  verifyVoucherRangeBalance,
  VoucherRangeFilter,
  VoucherRangeValidationResult,
  VoucherBalanceDiscrepancy
} from '../../utils/accountingIntegrity';

export interface AuditException {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'JOURNAL' | 'CASH_BANK' | 'MEMBER' | 'LOAN' | 'RECONCILIATION';
  title: string;
  description: string;
  referenceId: string;
  voucherNo?: string;
  date?: string;
  amount?: number;
  enteredBy?: string;
  suggestedAction: string;
}

export function scanAuditExceptions(db: AppDatabaseState): AuditException[] {
  const exceptions: AuditException[] = [];

  // 1. Unbalanced Journal Entries & Empty Headers
  const journals = db.journalEntries || [];
  const lines = db.journalLines || [];

  // Robust multi-key indexing for journal lines
  const linesByEntryId = new Map<string, typeof lines>();
  for (const line of lines) {
    if (!line) continue;
    const candidateKeys = [
      line.journalEntryId,
      (line as any).entryId,
      (line as any).journalId,
      (line as any).voucherNo
    ].filter(Boolean) as string[];

    for (const key of candidateKeys) {
      const existing = linesByEntryId.get(key) || [];
      if (!existing.includes(line)) {
        existing.push(line);
      }
      linesByEntryId.set(key, existing);
    }
  }

  journals.forEach(je => {
    const entryId = je.id || (je as any).entryId || '';
    const jNo = je.journalNo || (je as any).voucherNo || entryId;
    const ref = je.reference;
    const vNo = (je as any).voucherNo;

    const entryLines = linesByEntryId.get(entryId) ||
      (linesByEntryId.has(jNo) ? linesByEntryId.get(jNo) : undefined) ||
      (vNo && linesByEntryId.has(vNo) ? linesByEntryId.get(vNo) : undefined) ||
      ((je as any).entryId && linesByEntryId.has((je as any).entryId) ? linesByEntryId.get((je as any).entryId) : undefined) ||
      (ref && linesByEntryId.has(ref) ? linesByEntryId.get(ref) : undefined) ||
      [];

    const totalDebit = entryLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = entryLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);

    if (entryLines.length === 0) {
      exceptions.push({
        id: `EXC-JNL-NOLINE-${entryId || jNo}`,
        severity: 'WARNING',
        category: 'JOURNAL',
        title: 'Empty Journal Header / Missing Lines (লাইনবিহীন জাবেদা হেডার)',
        description: `Journal voucher ${jNo} exists in database but has 0 associated debit/credit line items.`,
        referenceId: entryId || jNo,
        voucherNo: jNo,
        date: je.date,
        amount: 0,
        enteredBy: je.createdBy || (je as any).postedBy || (je as any).enteredBy || 'System',
        suggestedAction: 'Re-post transaction lines from source record or safely remove orphaned empty journal header.'
      });
    } else if (diff > 0.01) {
      exceptions.push({
        id: `EXC-JNL-UNBAL-${entryId || jNo}`,
        severity: 'CRITICAL',
        category: 'JOURNAL',
        title: 'Unbalanced Journal Voucher (ডেবিট-ক্রেডিট অমিল)',
        description: `Journal ${jNo} has Debit: ৳${totalDebit.toLocaleString()} and Credit: ৳${totalCredit.toLocaleString()} (Imbalance Diff: ৳${diff.toLocaleString()})`,
        referenceId: entryId || jNo,
        voucherNo: jNo,
        date: je.date,
        amount: diff,
        enteredBy: je.createdBy || (je as any).postedBy || (je as any).enteredBy || 'System',
        suggestedAction: 'Edit journal entry lines to balance total debits with total credits.'
      });
    }
  });

  // 2. Duplicate Voucher Numbers across primary financial transaction records
  const voucherSources = new Map<string, string[]>();
  const checkVoucher = (vNo?: string, moduleName?: string) => {
    if (!vNo) return;
    const modules = voucherSources.get(vNo) || [];
    modules.push(moduleName || 'Transaction');
    voucherSources.set(vNo, modules);
    if (modules.length === 2) {
      exceptions.push({
        id: `EXC-DUP-VOUCHER-${vNo}`,
        severity: 'CRITICAL',
        category: 'CASH_BANK',
        title: 'Duplicate Voucher Number Detected (দ্বৈত ভাউচার নম্বর)',
        description: `Voucher No "${vNo}" is duplicated across: ${modules.join(', ')}.`,
        referenceId: vNo,
        voucherNo: vNo,
        suggestedAction: 'Inspect records using this voucher and re-assign unique serial identifiers.'
      });
    }
  };

  (db.incomes || []).forEach(i => checkVoucher(i.voucherNo, 'Income'));
  (db.expenses || []).forEach(e => checkVoucher(e.voucherNo, 'Expense'));
  (db.capitalDeposits || []).forEach(c => checkVoucher(c.voucherNo, 'Capital Deposit'));
  (db.contraTransactions || []).forEach(c => checkVoucher(c.voucherNo, 'Contra'));
  (db.loanRepayments || []).forEach(r => checkVoucher(r.voucherNo, 'Loan Repayment'));
  (db.loans || []).forEach(l => checkVoucher(l.loanId, 'Loan'));
  (db.welfareTransactions || []).forEach(w => checkVoucher(w.voucherNo, 'Welfare Transaction'));

  // 3. Duplicate Collections for Same Member in Same Month
  const memberMonthCollections = new Map<string, any[]>();
  (db.collections || []).forEach(c => {
    if (c.status !== 'REVERSED' && c.status !== 'CANCELLED') {
      const key = `${c.memberId}-${c.collectionMonth}`;
      if (!memberMonthCollections.has(key)) {
        memberMonthCollections.set(key, []);
      }
      memberMonthCollections.get(key)!.push(c);
    }
  });

  memberMonthCollections.forEach((colls, key) => {
    if (colls.length > 1) {
      const maxMonthlyAmount = Math.max(...colls.map(c => c.monthlyAmount || 0), db.settings?.monthlyContribution || 1000);
      const totalPaid = colls.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      const totalDiscount = colls.reduce((sum, c) => sum + (c.discount || 0), 0);
      const maxLateFine = Math.max(...colls.map(c => c.lateFine || 0));
      
      const netContributionExpected = Math.max(0, maxMonthlyAmount - totalDiscount);
      const totalExpected = netContributionExpected + maxLateFine;
      
      const vouchers = colls.map(c => c.receiptNo).filter(Boolean);
      const hasDuplicateVouchers = new Set(vouchers).size !== vouchers.length;
      
      if (totalPaid > totalExpected || hasDuplicateVouchers) {
        const lastCol = colls[colls.length - 1];
        exceptions.push({
          id: `EXC-DUP-COL-${lastCol.collectionId}`,
          severity: 'WARNING',
          category: 'MEMBER',
          title: 'Duplicate Collection for Same Month (একই মাসের দ্বৈত চাঁদা)',
          description: `Member ${lastCol.memberId} (${lastCol.memberName}) has an overpaid balance or duplicate entry for month ${lastCol.collectionMonth}. Total Paid: ৳${totalPaid}, Expected: ৳${totalExpected}.`,
          referenceId: lastCol.collectionId,
          voucherNo: lastCol.receiptNo,
          date: lastCol.collectionDate,
          amount: totalPaid,
          enteredBy: lastCol.receivedBy,
          suggestedAction: 'Verify if this is an accidental double entry and reverse if necessary.'
        });
      }
    }
  });

  // 4. Negative Cash In Hand Balance Check
  let runningCash = 0;
  const sortedCash = (db.cashTransactions || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  sortedCash.forEach(t => {
    const cashIn = t.cashIn || 0;
    const cashOut = t.cashOut || 0;
    runningCash += cashIn - cashOut;
    if (runningCash < -0.01) {
      exceptions.push({
        id: `EXC-NEG-CASH-${t.transactionId}`,
        severity: 'CRITICAL',
        category: 'CASH_BANK',
        title: 'Negative Cash in Hand Balance (নেগেটিভ ক্যাশ ব্যালেন্স)',
        description: `On date ${t.date}, cash out exceeded available cash resulting in running balance of ৳${runningCash.toLocaleString()}.`,
        referenceId: t.transactionId,
        voucherNo: t.voucherNo,
        date: t.date,
        amount: Math.abs(runningCash),
        enteredBy: t.enteredByUserName || t.postedByUserName || 'System',
        suggestedAction: 'Verify missing cash inflows, advance deposits, or correct posting dates.'
      });
    }
  });

  // 5. Unreconciled Bank Balances (Difference in closed/submitted reconciliations)
  (db.bankReconciliations || []).forEach(br => {
    if (Math.abs(br.difference || 0) > 0.01 && (br.status === 'SUBMITTED' || br.status === 'UNDER_REVIEW')) {
      exceptions.push({
        id: `EXC-BANK-DIFF-${br.id}`,
        severity: 'WARNING',
        category: 'RECONCILIATION',
        title: 'Unresolved Bank Reconciliation Variance (ব্যাংক হিসাব অমিল)',
        description: `Bank Reconciliation ${br.id} has an unexplained variance of ৳${(br.difference || 0).toLocaleString()} between Book and Statement.`,
        referenceId: br.id,
        date: br.statementDateTo,
        amount: Math.abs(br.difference || 0),
        suggestedAction: 'Match outstanding cheques and bank deposits in the Bank Reconciliation module.'
      });
    }
  });

  return exceptions;
}

interface AuditExceptionsViewProps {
  db: AppDatabaseState;
  onDrillDown?: (item: any) => void;
}

export const AuditExceptionsView: React.FC<AuditExceptionsViewProps> = ({
  db,
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Voucher Range Auditor State
  const [showVoucherAuditor, setShowVoucherAuditor] = useState(false);
  const [startVoucherNo, setStartVoucherNo] = useState('');
  const [endVoucherNo, setEndVoucherNo] = useState('');
  const [voucherPrefix, setVoucherPrefix] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedDiscrepancyId, setExpandedDiscrepancyId] = useState<string | null>(null);

  const voucherAuditResult: VoucherRangeValidationResult = useMemo(() => {
    const filter: VoucherRangeFilter = {
      startVoucherNo: startVoucherNo.trim() || undefined,
      endVoucherNo: endVoucherNo.trim() || undefined,
      voucherPrefix: voucherPrefix.trim() || undefined,
      sourceType: sourceTypeFilter !== 'ALL' ? sourceTypeFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      tolerance: 0.005
    };
    return verifyVoucherRangeBalance(db, filter);
  }, [db, startVoucherNo, endVoucherNo, voucherPrefix, sourceTypeFilter, startDate, endDate]);

  const exceptions = useMemo(() => {
    return scanAuditExceptions(db);
  }, [db]);

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          e.title.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.referenceId.toLowerCase().includes(term) ||
          (e.voucherNo && e.voucherNo.toLowerCase().includes(term)) ||
          e.suggestedAction.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [exceptions, severityFilter, categoryFilter, searchTerm]);

  const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL').length;
  const warningCount = exceptions.filter(e => e.severity === 'WARNING').length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-700" />
          <span>{isBangla ? 'স্বয়ংক্রিয় অডিট ও নিয়ন্ত্রণ ব্যতিক্রম প্যানেল' : 'Audit Exceptions & Controls Scanner'}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'দ্বৈত এন্ট্রি, ভারসাম্যহীন জাবেদা, নেগেটিভ ক্যাশ ও অডিট অসঙ্গতি পর্যবেক্ষণ'
            : 'Automated scan for unbalanced journals, duplicate vouchers, negative cash, and variances'}
        </p>
      </div>

      {/* Exception Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            criticalCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              {isBangla ? 'জরুরী সংশোধনীয় বিচ্যুতি' : 'Critical Exceptions'}
            </span>
            <span className="text-2xl font-black font-mono">{criticalCount}</span>
          </div>
          <AlertTriangle className={`w-8 h-8 ${criticalCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
        </div>

        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            warningCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              {isBangla ? 'সতর্কতামূলক অডিট পর্যবেক্ষণ' : 'Audit Warnings'}
            </span>
            <span className="text-2xl font-black font-mono">{warningCount}</span>
          </div>
          <AlertCircle className={`w-8 h-8 ${warningCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
        </div>

        <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-950 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              {isBangla ? 'সামগ্রিক অডিট স্থিতি' : 'System Control Health'}
            </span>
            <span className="text-sm font-black">
              {exceptions.length === 0
                ? (isBangla ? '১০০% নিখুঁত ও সমান্তরাল' : '100% Clean & Balanced')
                : (isBangla ? `${exceptions.length} টি পর্যবেক্ষণ পর্যালোচনাধীন` : `${exceptions.length} Items Flagged`)}
            </span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
      </div>

      {/* Voucher Range Balance Auditor Tool */}
      <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-xs">
        <div 
          onClick={() => setShowVoucherAuditor(!showVoucherAuditor)}
          className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/40 border-b border-indigo-100 flex items-center justify-between cursor-pointer hover:bg-indigo-50/70 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isBangla ? 'ভাউচার রেঞ্জ ব্যালেন্স অডিটর (Debit = Credit Zero-Balance Verification)' : 'Voucher Range Journal Balance Auditor'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  voucherAuditResult.isBalanced 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {voucherAuditResult.isBalanced 
                    ? (isBangla ? 'ভারসাম্যপূর্ণ (৳0.00)' : 'Balanced (৳0.00)') 
                    : (isBangla ? `${voucherAuditResult.discrepanciesCount} টি অমিল পাওয়া গেছে` : `${voucherAuditResult.discrepanciesCount} Discrepancies`)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {isBangla 
                  ? 'নির্দিষ্ট ভাউচার রেঞ্জ বা তারিখের মধ্যে সকল জাবেদা লাইনের ডেবিট ও ক্রেডিট যোগ করে শূন্য ব্যালেন্স ও লেজার অখণ্ডতা যাচাই করুন।'
                  : 'Traverse journal lines across voucher ranges and verify debits equal credits to guarantee double-entry ledger integrity.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {showVoucherAuditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showVoucherAuditor && (
          <div className="p-4 space-y-4 bg-slate-50/50">
            {/* Filter Inputs for Voucher Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'শুরুর ভাউচার (Start Voucher No)' : 'Start Voucher No'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. VCH-2026-000001 or 1"
                  value={startVoucherNo}
                  onChange={(e) => setStartVoucherNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'শেষের ভাউচার (End Voucher No)' : 'End Voucher No'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. VCH-2026-000010 or 10"
                  value={endVoucherNo}
                  onChange={(e) => setEndVoucherNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'ভাউচার প্রিফিক্স (Prefix Filter)' : 'Voucher Prefix'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. VCH-, JNL-, REC-"
                  value={voucherPrefix}
                  onChange={(e) => setVoucherPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'লেনদেনের খাত (Source Module)' : 'Source Module'}
                </label>
                <select
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium"
                >
                  <option value="ALL">{isBangla ? 'সকল খাত (All Modules)' : 'All Modules'}</option>
                  <option value="COLLECTION">{isBangla ? 'মাসিক চাঁদা (Collection)' : 'Monthly Collection'}</option>
                  <option value="CAPITAL">{isBangla ? 'মূলধন জমা (Capital)' : 'Capital Deposit'}</option>
                  <option value="ADMISSION">{isBangla ? 'ভর্তি ফি (Admission)' : 'Admission'}</option>
                  <option value="EXPENSE">{isBangla ? 'খরচ (Expense)' : 'Expense'}</option>
                  <option value="INCOME">{isBangla ? 'আয় (Income)' : 'Income'}</option>
                  <option value="LOAN_DISBURSEMENT">{isBangla ? 'ঋণ প্রদান (Loan Disbursement)' : 'Loan Disbursement'}</option>
                  <option value="LOAN_REPAYMENT">{isBangla ? 'ঋণ কিস্তি (Loan Repayment)' : 'Loan Repayment'}</option>
                  <option value="WELFARE_DONATION">{isBangla ? 'কল্যাণ তহবিল (Welfare)' : 'Welfare'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'শুরুর তারিখ (From Date)' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {isBangla ? 'শেষ তারিখ (To Date)' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartVoucherNo('');
                    setEndVoucherNo('');
                    setVoucherPrefix('');
                    setSourceTypeFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-all"
                >
                  {isBangla ? 'রিসেট ফিল্টার' : 'Reset Range'}
                </button>
                <span className="text-[11px] text-slate-500 pb-1">
                  {isBangla 
                    ? `মোট ${voucherAuditResult.totalVouchersTraversed} টি ভাউচার ও ${voucherAuditResult.totalLinesTraversed} টি লাইন স্ক্যান করা হয়েছে`
                    : `Traversed ${voucherAuditResult.totalVouchersTraversed} vouchers & ${voucherAuditResult.totalLinesTraversed} lines`}
                </span>
              </div>
            </div>

            {/* Audit Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {isBangla ? 'যাচাইকৃত ভাউচার' : 'Vouchers Verified'}
                </span>
                <span className="text-lg font-black font-mono text-slate-800">
                  {voucherAuditResult.totalVouchersTraversed}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {isBangla ? 'মোট ডেবিট যোগফল' : 'Total Debits (DR)'}
                </span>
                <span className="text-lg font-black font-mono text-indigo-700">
                  ৳{voucherAuditResult.totalDebitSum.toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  {isBangla ? 'মোট ক্রেডিট যোগফল' : 'Total Credits (CR)'}
                </span>
                <span className="text-lg font-black font-mono text-indigo-700">
                  ৳{voucherAuditResult.totalCreditSum.toLocaleString()}
                </span>
              </div>

              <div className={`p-3 rounded-lg border ${
                voucherAuditResult.isBalanced 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <span className="text-[10px] font-bold uppercase block opacity-80">
                  {isBangla ? 'নেট ভারসাম্য (DR - CR)' : 'Net Ledger Imbalance'}
                </span>
                <span className="text-lg font-black font-mono">
                  ৳{Math.abs(voucherAuditResult.netLedgerImbalance).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Discrepancies Table (if non-zero results found) */}
            {voucherAuditResult.discrepanciesCount > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>
                      {isBangla
                        ? `সতর্কতা: ${voucherAuditResult.discrepanciesCount} টি ভাউচারে ডেবিট-ক্রেডিট ভারসাম্যহীনতা বা অসঙ্গতি পাওয়া গেছে!`
                        : `Ledger Integrity Warning: ${voucherAuditResult.discrepanciesCount} voucher(s) do not balance to zero!`}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-rose-200 rounded-lg bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-rose-100/70 text-rose-950 font-bold border-b border-rose-200">
                      <tr>
                        <th className="p-2.5">{isBangla ? 'ভাউচার / জাবেদা নং' : 'Voucher / Journal No'}</th>
                        <th className="p-2.5">{isBangla ? 'তারিখ' : 'Date'}</th>
                        <th className="p-2.5">{isBangla ? 'খাত' : 'Source'}</th>
                        <th className="p-2.5 text-right">{isBangla ? 'ডেবিট' : 'Debit'}</th>
                        <th className="p-2.5 text-right">{isBangla ? 'ক্রেডিট' : 'Credit'}</th>
                        <th className="p-2.5 text-right">{isBangla ? 'পার্থক্য (অমিল)' : 'Difference'}</th>
                        <th className="p-2.5">{isBangla ? 'সমস্যার ধরণ' : 'Issue Type'}</th>
                        <th className="p-2.5 text-center">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100">
                      {voucherAuditResult.discrepancies.map((disc, idx) => {
                        const discKey = `${disc.journalEntryId || 'je'}-${disc.voucherNo || disc.journalNo || ''}-${disc.sourceType || ''}-${idx}`;
                        const isExpanded = expandedDiscrepancyId === discKey;

                        return (
                          <React.Fragment key={discKey}>
                            <tr className="hover:bg-rose-50/50">
                              <td className="p-2.5 font-mono font-bold text-slate-800">
                                {disc.voucherNo || disc.journalNo}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600">{disc.date}</td>
                              <td className="p-2.5 font-bold text-slate-700">{disc.sourceType}</td>
                              <td className="p-2.5 text-right font-mono text-slate-900">৳{disc.totalDebit.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-mono text-slate-900">৳{disc.totalCredit.toLocaleString()}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                                ৳{disc.absoluteDifference.toLocaleString()}
                              </td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">
                                  {disc.issueType}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDiscrepancyId(isExpanded ? null : discKey)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold"
                                >
                                  {isExpanded ? (isBangla ? 'লুকান' : 'Hide') : (isBangla ? 'লাইন দেখুন' : 'Lines')}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50">
                                <td colSpan={8} className="p-3 border-b border-slate-200">
                                  <div className="space-y-2">
                                    <div className="text-[11px] text-slate-700">
                                      <strong>{isBangla ? 'বিবরণ:' : 'Description:'}</strong> {disc.issueDescription}
                                    </div>
                                    <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                                      <strong>{isBangla ? 'প্রস্তাবিত সমাধান:' : 'Suggested Fix:'}</strong> {disc.suggestedAction}
                                    </div>
                                    <div className="overflow-x-auto border border-slate-200 rounded bg-white">
                                      <table className="w-full text-[11px]">
                                        <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                          <tr>
                                            <th className="p-1.5">Account ID</th>
                                            <th className="p-1.5">Account Name</th>
                                            <th className="p-1.5 text-right">Debit (৳)</th>
                                            <th className="p-1.5 text-right">Credit (৳)</th>
                                            <th className="p-1.5">Line Description</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {disc.lines.map((ln, lnIdx) => (
                                            <tr key={ln.id ? `${ln.id}-${lnIdx}` : `ln-${lnIdx}`}>
                                              <td className="p-1.5 font-mono">{ln.accountId}</td>
                                              <td className="p-1.5 font-bold">{ln.accountName || '-'}</td>
                                              <td className="p-1.5 text-right font-mono text-indigo-700">{ln.debit ? `৳${ln.debit.toLocaleString()}` : '-'}</td>
                                              <td className="p-1.5 text-right font-mono text-indigo-700">{ln.credit ? `৳${ln.credit.toLocaleString()}` : '-'}</td>
                                              <td className="p-1.5 text-slate-500">{ln.description || '-'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-bold text-emerald-900">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {isBangla
                    ? `যাচাই সফল: নির্বাচিত রেঞ্জের সকল ${voucherAuditResult.totalVouchersTraversed} টি ভাউচারে ডেবিট ও ক্রেডিট নিখুঁতভাবে ভারসাম্যপূর্ণ (DR = CR = ৳${voucherAuditResult.totalDebitSum.toLocaleString()})।`
                    : `Verification Successful: All ${voucherAuditResult.totalVouchersTraversed} vouchers in the selected range balance to zero (Total Debits = Total Credits = ৳${voucherAuditResult.totalDebitSum.toLocaleString()}).`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Filter Bar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 text-xs hide-print">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isBangla ? 'বিবরণ, ভাউচার বা সুপারিশ খুঁজুন...' : 'Search description, voucher or action...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-medium"
        >
          <option value="ALL">{isBangla ? 'সকল মাত্রা' : 'All Severities'}</option>
          <option value="CRITICAL">CRITICAL (জরুরী)</option>
          <option value="WARNING">WARNING (সতর্কতা)</option>
          <option value="INFO">INFO (তথ্যগত)</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-medium"
        >
          <option value="ALL">{isBangla ? 'সকল খাত' : 'All Categories'}</option>
          <option value="JOURNAL">JOURNAL (জাবেদা)</option>
          <option value="CASH_BANK">CASH & BANK (নগদ/ব্যাংক)</option>
          <option value="MEMBER">MEMBER (সদস্য/চাঁদা)</option>
          <option value="RECONCILIATION">RECONCILIATION (সমন্বয়)</option>
        </select>
      </div>

      {/* Exceptions List */}
      <div className="space-y-3">
        {filteredExceptions.map(exc => {
          const isCrit = exc.severity === 'CRITICAL';
          return (
            <div
              key={exc.id}
              className={`p-4 rounded-xl border bg-white shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isCrit ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCrit ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {exc.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {exc.category}
                  </span>
                  {exc.voucherNo && (
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      Voucher: {exc.voucherNo}
                    </span>
                  )}
                  {exc.date && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Date: {exc.date}
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900">{exc.title}</h4>
                <p className="text-xs text-slate-600">{exc.description}</p>

                <div className="text-[11px] text-emerald-900 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5 mt-1">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>{isBangla ? 'পরামর্শ / সমাধান:' : 'Suggested Action:'}</strong> {exc.suggestedAction}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                {exc.amount && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {isBangla ? 'পরিমাণ' : 'Amount'}
                    </span>
                    <span className="font-mono font-bold text-xs text-rose-800">
                      ৳{exc.amount.toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  onClick={() =>
                    onDrillDown &&
                    onDrillDown({
                      voucherNo: exc.voucherNo || exc.referenceId,
                      module: exc.category,
                      date: exc.date || 'Today',
                      description: exc.description,
                      enteredBy: exc.enteredBy || 'System Auditor',
                      status: exc.severity
                    })
                  }
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'বিস্তারিত' : 'Inspect'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredExceptions.length === 0 && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              {isBangla ? 'কোনো অডিট ব্যতিক্রম বা অসঙ্গতি পাওয়া যায়নি!' : 'No Audit Exceptions Found!'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isBangla
                ? 'সকল জাবেদা ভাউচারের ডেবিট-ক্রেডিট ভারসাম্য সঠিক, কোনো দ্বৈত ভাউচার নেই এবং ক্যাশ স্থিতি নিখুঁত রয়েছে।'
                : 'All journal entries balance cleanly, voucher numbers are unique, and financial rules are fully respected.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
