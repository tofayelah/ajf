import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  Download,
  Calendar,
  Filter,
  Scale,
  DollarSign,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  FileCheck,
  AlertCircle,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import {
  runComprehensiveDiagnosticAudit,
  ComprehensiveIntegrityReport,
  VoucherBalanceDiscrepancy,
  VoucherBalanceSummary,
  CashReconciliationItem
} from '../../utils/accountingIntegrity';

interface AdminDiagnosticToolProps {
  onClose?: () => void;
}

export const AdminDiagnosticTool: React.FC<AdminDiagnosticToolProps> = ({ onClose }) => {
  const { db, language, activeUser } = useApp();
  const isBangla = language === 'bn';
  const printRef = useRef<HTMLDivElement>(null);

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return format(firstDay, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [voucherPrefix, setVoucherPrefix] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('ALL');
  
  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOUBLE_ENTRY' | 'CASH_RECONCILIATION' | 'INTEGRITY_REPORT'>('OVERVIEW');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherFilterStatus, setVoucherFilterStatus] = useState<'ALL' | 'BALANCED' | 'UNBALANCED'>('ALL');
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>(() => new Date().toISOString());

  // Run the comprehensive diagnostic audit
  const auditReport: ComprehensiveIntegrityReport = useMemo(() => {
    return runComprehensiveDiagnosticAudit(db, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      voucherPrefix: voucherPrefix.trim() || undefined,
      sourceType: sourceTypeFilter !== 'ALL' ? sourceTypeFilter : undefined,
      auditedBy: activeUser?.fullName || 'System Admin'
    });
  }, [db, startDate, endDate, voucherPrefix, sourceTypeFilter, activeUser, lastAuditTimestamp]);

  const handleRerunAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      setLastAuditTimestamp(new Date().toISOString());
      setIsScanning(false);
    }, 400);
  };

  const handleSetPreset = (preset: 'TODAY' | 'THIS_MONTH' | 'CURRENT_FY' | 'ALL_TIME') => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (preset === 'CURRENT_FY') {
      // AJ Welfare Society fiscal year begins July 1
      const currentYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
      setStartDate(`${currentYear}-07-01`);
      setEndDate(todayStr);
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ['AJ WELFARE SOCIETY - SYSTEM INTEGRITY AUDIT REPORT'],
      ['Report ID', auditReport.reportId],
      ['Date Range', `${auditReport.dateRange.startDate} to ${auditReport.dateRange.endDate}`],
      ['Audited By', auditReport.auditedBy || 'System Auditor'],
      ['Generated At', auditReport.generatedAt],
      ['Overall Status', auditReport.overallStatus],
      ['Health Score', `${auditReport.healthScore}%`],
      [''],
      ['SECTION 1: DOUBLE-ENTRY JOURNAL BALANCE VERIFICATION'],
      ['Total Vouchers Audited', auditReport.totalVouchersAudited.toString()],
      ['Unbalanced Vouchers Count', auditReport.unbalancedVouchersCount.toString()],
      ['Total Debits (৳)', auditReport.doubleEntryAudit.totalDebitSum.toString()],
      ['Total Credits (৳)', auditReport.doubleEntryAudit.totalCreditSum.toString()],
      ['Net Ledger Imbalance (৳)', auditReport.doubleEntryAudit.netLedgerImbalance.toString()],
      [''],
      ['SECTION 2: CASH MOVEMENTS VS SUB-LEDGER RECONCILIATION'],
      ['Total Cash Book Receipts (৳)', auditReport.cashMovementAudit.totalCashBookIn.toString()],
      ['Total Cash Book Payments (৳)', auditReport.cashMovementAudit.totalCashBookOut.toString()],
      ['Total Subledger Cash Receipts (৳)', auditReport.cashMovementAudit.totalSubledgerIn.toString()],
      ['Total Subledger Cash Payments (৳)', auditReport.cashMovementAudit.totalSubledgerOut.toString()],
      ['Total Net Variance (৳)', auditReport.cashMovementAudit.totalVariance.toString()],
      ['Reconciled Status', auditReport.cashMovementAudit.isReconciled ? 'RECONCILED' : 'VARIANCE_DETECTED'],
      [''],
      ['Module','Sub-ledger Amount (৳)','Cash Book Amount (৳)','Variance (৳)','Status'],
      ...Object.values(auditReport.cashMovementAudit.modules).map((mod) => [
        mod.label,
        mod.subledgerAmount.toString(),
        mod.cashBookAmount.toString(),
        mod.variance.toString(),
        mod.isMatched ? 'MATCHED' : 'UNMATCHED'
      ]),
      [''],
      ['SECTION 3: SYSTEM VIOLATIONS LIST'],
      ['Violation ID','Category','Severity','Voucher / Transaction ID','Module','Impact Amount (৳)','Description','Remediation Action'],
      ...auditReport.violationsList.map((v) => [
        v.violationId,
        v.category,
        v.severity,
        v.voucherId || v.transactionId || '-',
        v.module,
        v.impactAmount.toString(),
        `"${v.description.replace(/"/g, '""')}"`,
        `"${v.remediation.replace(/"/g, '""')}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Integrity_Audit_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered vouchers for Double-Entry tab
  const allVouchers = useMemo(() => {
    const list: (VoucherBalanceSummary | VoucherBalanceDiscrepancy)[] = [
      ...auditReport.doubleEntryAudit.discrepancies,
      ...auditReport.doubleEntryAudit.balancedVouchers
    ];

    return list.filter((v) => {
      const q = voucherSearch.toLowerCase();
      const vNo = (v.voucherNo || (v as any).journalNo || '').toLowerCase();
      const ref = ((v as any).reference || '').toLowerCase();
      const src = (v.sourceType || '').toLowerCase();
      const matchSearch = !q || vNo.includes(q) || ref.includes(q) || src.includes(q);

      if (voucherFilterStatus === 'BALANCED') return matchSearch && (v as any).isBalanced === true;
      if (voucherFilterStatus === 'UNBALANCED') return matchSearch && (v as any).isBalanced !== true;
      return matchSearch;
    });
  }, [auditReport, voucherSearch, voucherFilterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                    {isBangla ? 'অ্যাডমিন সিস্টেম ইন্টিগ্রিটি ও ডায়াগনস্টিক অডিট' : 'Admin System Integrity & Diagnostic Auditor'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                    auditReport.overallStatus === 'PASSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : auditReport.overallStatus === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {auditReport.overallStatus === 'PASSED' ? (isBangla ? 'উত্তীর্ণ (স্বাস্থ্যকর)' : 'PASSED (100% HEALTHY)') : (isBangla ? 'ত্রুটি শনাক্ত হয়েছে' : 'VIOLATIONS DETECTED')}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  {isBangla
                    ? '১) প্রতি ভাউচারে ডেবিট = ক্রেডিট সমতা, ২) ক্যাশ বুকের সাথে ভর্তি, মূলধন ও চাঁদার সাব-লেজার মিলন, ৩) স্বয়ংক্রিয় ইন্টিগ্রিটি রিপোর্ট।'
                    : '1) Verify voucher debits equal credits, 2) Validate Cash Book matches Admissions, Capital & Collections, 3) Generate Integrity Report.'}
                </p>
              </div>
            </div>

            {/* Quick Action Tools */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRerunAudit}
                disabled={isScanning}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isBangla ? 'পুনরায় অডিট স্ক্যান' : 'Run Audit Scan'}
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                {isBangla ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-xl border border-slate-700 transition-all"
              >
                <Download className="w-4 h-4" />
                {isBangla ? 'CSV এক্সপোর্ট' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* Date Range & Audit Filter Bar */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isBangla ? 'শুরুর তারিখ (From Date)' : 'From Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isBangla ? 'শেষ তারিখ (To Date)' : 'To Date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isBangla ? 'ভাউচার প্রিফিক্স (Prefix)' : 'Voucher Prefix'}
              </label>
              <input
                type="text"
                placeholder="e.g. VCH-, REC-, JNL-"
                value={voucherPrefix}
                onChange={(e) => setVoucherPrefix(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono uppercase focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isBangla ? 'লেনদেনের খাত (Module)' : 'Module Filter'}
              </label>
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">{isBangla ? 'সকল মডিউল (All Modules)' : 'All Modules'}</option>
                <option value="COLLECTION">{isBangla ? 'মাসিক চাঁদা (Collection)' : 'Collection'}</option>
                <option value="CAPITAL">{isBangla ? 'সদস্য মূলধন (Capital)' : 'Capital'}</option>
                <option value="ADMISSION">{isBangla ? 'ভর্তি ফি (Admission)' : 'Admission'}</option>
                <option value="EXPENSE">{isBangla ? 'খরচ (Expense)' : 'Expense'}</option>
                <option value="INCOME">{isBangla ? 'আয় (Income)' : 'Income'}</option>
                <option value="LOAN">{isBangla ? 'ঋণ (Loans)' : 'Loans'}</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {isBangla ? 'কুইক ফিল্টার রেঞ্জ' : 'Quick Presets'}
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetPreset('TODAY')}
                  className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold transition-all text-center"
                >
                  {isBangla ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('THIS_MONTH')}
                  className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold transition-all text-center"
                >
                  {isBangla ? 'চলতি মাস' : 'Month'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('CURRENT_FY')}
                  className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold transition-all text-center"
                >
                  {isBangla ? 'অর্থবছর' : 'FY'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('ALL_TIME')}
                  className="flex-1 py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold transition-all text-center"
                >
                  {isBangla ? 'সব' : 'All'}
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Metrics Bento Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* System Health Score */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isBangla ? 'লেজার স্বাস্থ্য স্কোর' : 'Health Score'}
                </span>
                <span className={`text-2xl font-black font-mono ${
                  auditReport.healthScore >= 90 ? 'text-emerald-400' : auditReport.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {auditReport.healthScore}%
                </span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                auditReport.healthScore >= 90 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Double-Entry Voucher Balance */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isBangla ? 'ভাউচার সমতা (DR = CR)' : 'Vouchers (DR = CR)'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {auditReport.totalVouchersAudited}
                  </span>
                  <span className={`text-xs font-bold ${auditReport.unbalancedVouchersCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({auditReport.unbalancedVouchersCount === 0 ? (isBangla ? '১০০% ভারসাম্যপূর্ণ' : '100% Balanced') : `${auditReport.unbalancedVouchersCount} Imbalanced`})
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Scale className="w-5 h-5" />
              </div>
            </div>

            {/* Cash Movements Reconciliation */}
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isBangla ? 'ক্যাশ বুক বনাম সাব-লেজার' : 'Cash Book vs Sub-ledger'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-black font-mono ${auditReport.cashMovementAudit.isReconciled ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {auditReport.cashMovementAudit.isReconciled ? (isBangla ? 'মিল রয়েছে' : 'Reconciled') : (isBangla ? 'অমিল শনাক্ত' : 'Mismatch')}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Total System Violations */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              auditReport.totalViolationsCount === 0
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : 'bg-rose-950/30 border-rose-800/60'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {isBangla ? 'মোট অমিল / ত্রুটি' : 'Total Violations'}
                </span>
                <span className={`text-2xl font-black font-mono ${
                  auditReport.totalViolationsCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {auditReport.totalViolationsCount}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                auditReport.totalViolationsCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {auditReport.totalViolationsCount === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all ${
            activeTab === 'OVERVIEW'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          {isBangla ? 'ডায়াগনস্টিক সারসংক্ষেপ' : 'Diagnostic Overview'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DOUBLE_ENTRY')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all ${
            activeTab === 'DOUBLE_ENTRY'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{isBangla ? '১) ভাউচার ডেবিট-ক্রেডিট সমতা' : '1) Double-Entry Balance Check'}</span>
          {auditReport.unbalancedVouchersCount > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {auditReport.unbalancedVouchersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASH_RECONCILIATION')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all ${
            activeTab === 'CASH_RECONCILIATION'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isBangla ? '২) ক্যাশ বুক বনাম সাব-লেজার লেনদেন' : '2) Cash Movements vs Sub-Ledger'}</span>
          {!auditReport.cashMovementAudit.isReconciled && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {auditReport.cashMovementAudit.allUnreconciledItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INTEGRITY_REPORT')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold rounded-t-xl transition-all ${
            activeTab === 'INTEGRITY_REPORT'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>{isBangla ? '৩) অফিসিয়াল ইন্টিগ্রিটি রিপোর্ট' : '3) Official Integrity Report'}</span>
        </button>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {isBangla ? 'নির্বাহী অডিট মূল্যায়ন ও ফলাফল' : 'Executive Audit Evaluation & Findings'}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {isBangla ? 'রিপোর্ট আইডি: ' : 'Report ID: '}{auditReport.reportId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Double-Entry Check Box */}
              <div className={`p-4 rounded-xl border ${
                auditReport.doubleEntryAudit.isBalanced ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {isBangla ? '১) জাবেদা ভাউচার সমতা পরীক্ষণ' : '1) Journal Double-Entry Rule'}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {auditReport.doubleEntryAudit.isBalanced ? (isBangla ? 'সকল ভাউচারে ডেবিট = ক্রেডিট সমান' : 'All Vouchers Balance to Zero') : (isBangla ? `${auditReport.unbalancedVouchersCount} টি ভাউচারে ভারসাম্যহীনতা` : `${auditReport.unbalancedVouchersCount} Unbalanced Vouchers Found`)}
                    </h4>
                  </div>
                  {auditReport.doubleEntryAudit.isBalanced ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {auditReport.doubleEntryAudit.summaryMessage}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                  <span>Total DR: ৳{auditReport.doubleEntryAudit.totalDebitSum.toLocaleString()}</span>
                  <span>Total CR: ৳{auditReport.doubleEntryAudit.totalCreditSum.toLocaleString()}</span>
                  <span className="font-bold">Net Imbalance: ৳{Math.abs(auditReport.doubleEntryAudit.netLedgerImbalance).toLocaleString()}</span>
                </div>
              </div>

              {/* Cash Reconciliation Check Box */}
              <div className={`p-4 rounded-xl border ${
                auditReport.cashMovementAudit.isReconciled ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {isBangla ? '২) ক্যাশ বুক বনাম সাব-লেজার লেনদেন পরীক্ষণ' : '2) Cash Movement Reconciliation'}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {auditReport.cashMovementAudit.isReconciled ? (isBangla ? 'ক্যাশ বুক ও সাব-লেজার সম্পূর্ণ মিল রয়েছে' : 'Cash Book Matches Sub-Ledger Receipts') : (isBangla ? `৳${Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()} পার্থক্য শনাক্ত` : `৳${Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()} Variance Detected`)}
                    </h4>
                  </div>
                  {auditReport.cashMovementAudit.isReconciled ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {auditReport.cashMovementAudit.summaryMessage}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                  <span>Cash In: ৳{auditReport.cashMovementAudit.totalCashBookIn.toLocaleString()}</span>
                  <span>Subledger In: ৳{auditReport.cashMovementAudit.totalSubledgerIn.toLocaleString()}</span>
                  <span className="font-bold">Variance: ৳{Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Recommendations & Action Plan */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {isBangla ? 'অডিটর সুপারিশমালা ও পরবর্তী করণীয়:' : 'Auditor Recommendations & Action Plan:'}
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                {auditReport.recommendations.map((rec, i) => (
                  <li key={`rec-${i}`} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Module-by-Module Cash Reconciliation Status Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              {isBangla ? 'মডিউল ভিত্তিক সাব-লেজার ও ক্যাশ বুক তুলনা' : 'Module-Level Cash vs Sub-Ledger Comparison'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.values(auditReport.cashMovementAudit.modules).map((mod) => (
                <div key={mod.module} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      {mod.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      mod.isMatched
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {mod.isMatched ? 'MATCHED' : 'UNMATCHED'}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-slate-500">
                      <span>Sub-ledger ({mod.subledgerTransactionCount}):</span>
                      <span>৳{mod.subledgerAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Cash Book ({mod.cashBookTransactionCount}):</span>
                      <span>৳{mod.cashBookAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t pt-1">
                      <span>Variance:</span>
                      <span className={mod.variance !== 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        ৳{Math.abs(mod.variance).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. DOUBLE-ENTRY BALANCE CHECK */}
      {activeTab === 'DOUBLE_ENTRY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                {isBangla ? 'ভাউচার ভিত্তিক ডেবিট-ক্রেডিট সমতা যাচাইকরণ' : 'Voucher Double-Entry Balance Verification'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBangla
                  ? 'প্রতিটি ভাউচারের সকল জাবেদা লাইনের ডেবিট ও ক্রেডিট যোগ করে শূন্য ভারসাম্য যাচাই করা হয়।'
                  : 'Validates that for every individual voucher ID, total debit lines equal credit lines.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isBangla ? 'ভাউচার বা জাবেদা নং খুঁজুন...' : 'Search voucher no...'}
                  value={voucherSearch}
                  onChange={(e) => setVoucherSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <select
                value={voucherFilterStatus}
                onChange={(e) => setVoucherFilterStatus(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium"
              >
                <option value="ALL">{isBangla ? 'সকল ভাউচার' : 'All Vouchers'}</option>
                <option value="BALANCED">{isBangla ? 'ভারসাম্যপূর্ণ (DR=CR)' : 'Balanced Only'}</option>
                <option value="UNBALANCED">{isBangla ? 'অমিল / ত্রুটিযুক্ত' : 'Imbalanced Only'}</option>
              </select>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBangla ? 'ভাউচার / রেফারেন্স নং' : 'Voucher / Reference No'}</th>
                  <th className="p-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3">{isBangla ? 'খাত (Module)' : 'Module'}</th>
                  <th className="p-3 text-right">{isBangla ? 'মোট ডেবিট (DR)' : 'Total Debit (৳)'}</th>
                  <th className="p-3 text-right">{isBangla ? 'মোট ক্রেডিট (CR)' : 'Total Credit (৳)'}</th>
                  <th className="p-3 text-right">{isBangla ? 'ভারসাম্য (DR - CR)' : 'Net Imbalance (৳)'}</th>
                  <th className="p-3 text-center">{isBangla ? 'স্থিতি' : 'Status'}</th>
                  <th className="p-3 text-center">{isBangla ? 'অ্যাকশন' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allVouchers.length > 0 ? (
                  allVouchers.map((v, idx) => {
                    const isBalanced = (v as any).isBalanced === true;
                    const lineCount = (v as any).lineCount ?? (v as any).linesCount ?? ((v as any).lines ? (v as any).lines.length : 0);
                    const isNoLines = lineCount === 0 || (v as any).issueType === 'NO_LINES';
                    const vKey = `${v.journalEntryId || 'je'}-${v.voucherNo || (v as any).journalNo || ''}-${(v as any).sourceType || ''}-${idx}`;
                    const isExpanded = expandedVoucherId === vKey;

                    return (
                      <React.Fragment key={vKey}>
                        <tr className={`hover:bg-slate-50/80 transition-colors ${!isBalanced ? (isNoLines ? 'bg-amber-50/30' : 'bg-rose-50/40') : ''}`}>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {v.voucherNo || (v as any).journalNo}
                            {(v as any).reference && (v as any).reference !== v.voucherNo && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Ref: {(v as any).reference}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{v.date}</td>
                          <td className="p-3 font-bold text-slate-700">{v.sourceType}</td>
                          <td className="p-3 text-right font-mono font-medium text-slate-900">
                            {isNoLines ? <span className="text-slate-400 font-normal italic text-[11px]">0 lines</span> : `৳${v.totalDebit.toLocaleString()}`}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-slate-900">
                            {isNoLines ? <span className="text-slate-400 font-normal italic text-[11px]">0 lines</span> : `৳${v.totalCredit.toLocaleString()}`}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {isNoLines ? (
                              <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {isBangla ? 'লাইন নেই (০)' : 'Empty (0 Lines)'}
                              </span>
                            ) : (
                              <span className={v.imbalance !== 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                ৳{Math.abs(v.imbalance).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isBalanced ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                                BALANCED (৳0)
                              </span>
                            ) : isNoLines ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-100 text-amber-900 border-amber-300">
                                {isBangla ? 'খালি হেডার (০ লাইন)' : 'EMPTY HEADER (0 LINES)'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-100 text-rose-800 border-rose-300">
                                {isBangla ? 'ডেবিট ≠ ক্রেডিট অমিল' : 'DEBIT ≠ CREDIT MISMATCH'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedVoucherId(isExpanded ? null : vKey)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold transition-all text-[11px]"
                            >
                              {isExpanded ? (isBangla ? 'লুকান' : 'Hide') : (isBangla ? 'লাইন দেখুন' : 'Lines')}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="p-4 border-b border-slate-200">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-700">
                                    Journal Entry ID: <code className="font-mono text-indigo-700">{v.journalEntryId}</code>
                                  </span>
                                  <span className="text-slate-500">
                                    Lines Count: {lineCount}
                                  </span>
                                </div>

                                {!isBalanced && (
                                  <div className={`p-2.5 rounded text-xs space-y-1 border ${isNoLines ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                    <p><strong>Issue:</strong> {(v as any).issueDescription || (isNoLines ? 'Empty journal header with 0 attached journal lines' : 'Debits do not equal credits')}</p>
                                    <p className="text-emerald-800"><strong>Remediation:</strong> {(v as any).suggestedAction || (isNoLines ? 'Re-post transaction lines or delete empty header' : 'Adjust debit/credit lines')}</p>
                                  </div>
                                )}

                                {/* Lines Breakdown */}
                                {(v as any).lines && (v as any).lines.length > 0 ? (
                                  <div className="overflow-x-auto border border-slate-200 rounded bg-white">
                                    <table className="w-full text-[11px]">
                                      <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                                        <tr>
                                          <th className="p-2">Account Code</th>
                                          <th className="p-2">Account Name</th>
                                          <th className="p-2 text-right">Debit (৳)</th>
                                          <th className="p-2 text-right">Credit (৳)</th>
                                          <th className="p-2">Narration</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y">
                                        {(v as any).lines.map((ln: any, lnIdx: number) => (
                                          <tr key={ln.id ? `${ln.id}-${lnIdx}` : `ln-${lnIdx}`}>
                                            <td className="p-2 font-mono">{ln.accountId}</td>
                                            <td className="p-2 font-bold">{ln.accountName || '-'}</td>
                                            <td className="p-2 text-right font-mono text-indigo-700">
                                              {ln.debit ? `৳${ln.debit.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-2 text-right font-mono text-indigo-700">
                                              {ln.credit ? `৳${ln.credit.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-2 text-slate-500">{ln.description || '-'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">
                                    {isBangla ? 'এই ভাউচারের সাথে সংযুক্ত কোনো জাবেদা লাইন পাওয়া যায়নি।' : 'No journal entry lines linked to this voucher.'}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      {isBangla ? 'কোনো ভাউচার পাওয়া যায়নি' : 'No vouchers match the filter criteria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. CASH RECONCILIATION */}
      {activeTab === 'CASH_RECONCILIATION' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              {isBangla ? 'ক্যাশ বুক বনাম সাব-লেজার লেনদেন পরীক্ষণ (Admission, Capital, Collection)' : 'Cash Movements vs Sub-Ledger Transaction Audit'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBangla
                ? `নির্বাচিত তারিখ রেঞ্জ (${auditReport.dateRange.startDate} হতে ${auditReport.dateRange.endDate}) এর মধ্যে ক্যাশ বুকের প্রাপ্তি/প্রদান এর সাথে প্রতিটি সাব-লেজারের লেনদেনের নিখুঁত মিল যাচাই করা হচ্ছে।`
                : `Audits individual Admission, Capital Deposit, and Collection sub-ledger transactions against Cash Book movements for ${auditReport.dateRange.startDate} to ${auditReport.dateRange.endDate}.`}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBangla ? 'মডিউল / লেনদেনের খাত' : 'Financial Module'}</th>
                  <th className="p-3 text-center">{isBangla ? 'সাব-লেজার গণনা' : 'Sub-ledger Txns'}</th>
                  <th className="p-3 text-right">{isBangla ? 'সাব-লেজার মোট (৳)' : 'Sub-ledger Sum (৳)'}</th>
                  <th className="p-3 text-center">{isBangla ? 'ক্যাশ বুক গণনা' : 'Cash Book Txns'}</th>
                  <th className="p-3 text-right">{isBangla ? 'ক্যাশ বুক মোট (৳)' : 'Cash Book Sum (৳)'}</th>
                  <th className="p-3 text-right">{isBangla ? 'পার্থক্য / অমিল (৳)' : 'Variance (৳)'}</th>
                  <th className="p-3 text-center">{isBangla ? 'মিল স্থিতি' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.values(auditReport.cashMovementAudit.modules).map((mod) => (
                  <tr key={mod.module} className={!mod.isMatched ? 'bg-rose-50/40' : 'hover:bg-slate-50/80'}>
                    <td className="p-3 font-bold text-slate-800">{mod.label}</td>
                    <td className="p-3 text-center font-mono text-slate-600">{mod.subledgerTransactionCount}</td>
                    <td className="p-3 text-right font-mono text-slate-900">৳{mod.subledgerAmount.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono text-slate-600">{mod.cashBookTransactionCount}</td>
                    <td className="p-3 text-right font-mono text-slate-900">৳{mod.cashBookAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span className={mod.variance !== 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        ৳{Math.abs(mod.variance).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        mod.isMatched
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {mod.isMatched ? 'RECONCILED' : 'VARIANCE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                <tr>
                  <td className="p-3 uppercase">{isBangla ? 'সর্বমোট নেট ক্যাশ মুভমেন্ট' : 'Total Net Cash Movements'}</td>
                  <td className="p-3 text-center font-mono">-</td>
                  <td className="p-3 text-right font-mono text-indigo-900">৳{auditReport.cashMovementAudit.netSubledgerMovement.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">-</td>
                  <td className="p-3 text-right font-mono text-indigo-900">৳{auditReport.cashMovementAudit.netCashBookMovement.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={auditReport.cashMovementAudit.totalVariance !== 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      ৳{Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      auditReport.cashMovementAudit.isReconciled
                        ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                        : 'bg-rose-200 text-rose-900 border-rose-400'
                    }`}>
                      {auditReport.cashMovementAudit.isReconciled ? 'BALANCED' : 'IMBALANCE'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. OFFICIAL INTEGRITY REPORT */}
      {activeTab === 'INTEGRITY_REPORT' && (
        <div ref={printRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 print:m-0 print:p-0 print:border-none">
          {/* Report Letterhead Header */}
          <div className="text-center border-b-2 border-slate-800 pb-5 space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
              {isBangla ? 'আতরগাঁও জাগরণী ক্লাব ব্যবসায়িক তহবিল ও কল্যাণ সমিতি' : 'Atorgao Jagoroni Club Business Fund & Welfare Society'}
            </h1>
            <p className="text-xs text-slate-500">
              {isBangla ? 'আতরগাঁও, বাজিতপুর, কিশোরগঞ্জ, বাংলাদেশ' : 'Atargaon, Bajitpur, Kishoreganj, Bangladesh'}
            </p>
            <div className="inline-block bg-indigo-50 border border-indigo-200 px-4 py-1 rounded-full text-xs font-bold text-indigo-900 mt-2">
              {isBangla ? 'বার্ষিক / পর্যায়ক্রমিক আর্থিক অখণ্ডতা ও লেজার নিরীক্ষা প্রতিবেদন' : 'Comprehensive Financial System Integrity & Double-Entry Audit Report'}
            </div>
          </div>

          {/* Audit Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Report ID</span>
              <span className="font-bold text-slate-800">{auditReport.reportId}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Audited Date Range</span>
              <span className="font-bold text-slate-800">{auditReport.dateRange.startDate} to {auditReport.dateRange.endDate}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Audited By</span>
              <span className="font-bold text-slate-800">{auditReport.auditedBy || 'System Auditor'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Overall Status</span>
              <span className={`font-bold ${auditReport.overallStatus === 'PASSED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {auditReport.overallStatus} ({auditReport.healthScore}%)
              </span>
            </div>
          </div>

          {/* Violations & Discrepancies Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              {isBangla ? 'শনাক্তকৃত নিয়ম লঙ্ঘন ও ভারসাম্যহীনতা তালিকা (Violations List)' : 'Audit Violations & Discrepancy Registry'}
            </h3>

            {auditReport.violationsList.length > 0 ? (
              <div className="overflow-x-auto border border-rose-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-50 text-rose-950 font-bold border-b border-rose-200">
                    <tr>
                      <th className="p-2.5">Violation ID</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Voucher / Ref</th>
                      <th className="p-2.5">Module</th>
                      <th className="p-2.5 text-right">Impact (৳)</th>
                      <th className="p-2.5">Description & Remediation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100">
                    {auditReport.violationsList.map((vio) => (
                      <tr key={vio.violationId} className="hover:bg-rose-50/30">
                        <td className="p-2.5 font-mono font-bold text-slate-800">{vio.violationId}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            vio.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {vio.severity}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{vio.voucherId || vio.transactionId || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-700">{vio.module}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-700">৳{vio.impactAmount.toLocaleString()}</td>
                        <td className="p-2.5 space-y-1">
                          <div className="text-slate-800">{vio.description}</div>
                          <div className="text-emerald-700 font-medium"><strong>Fix:</strong> {vio.remediation}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <strong>{isBangla ? 'কোনো নিয়ম লঙ্ঘন পাওয়া যায়নি:' : 'Zero Violations Detected:'}</strong>{' '}
                  {isBangla
                    ? 'সকল ভাউচারে ডেবিট ও ক্রেডিট পূর্ণ ভারসাম্যপূর্ণ এবং ক্যাশ বুক লেনদেন সাব-লেজারের সাথে শতভাগ নির্ভুলভাবে মিলেছে।'
                    : 'All journal voucher entries balance to zero, and all cash book movements match sub-ledger transaction receipts.'}
                </div>
              </div>
            )}
          </div>

          {/* Audit Committee Sign-Off Block */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400" />
              <span className="font-bold text-slate-700 block">{isBangla ? 'সভাপতি' : 'President'}</span>
            </div>
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400" />
              <span className="font-bold text-slate-700 block">{isBangla ? 'সাধারণ সম্পাদক' : 'General Secretary'}</span>
            </div>
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400" />
              <span className="font-bold text-slate-700 block">{isBangla ? 'কোষাধ্যক্ষ' : 'Cashier / Treasurer'}</span>
            </div>
            <div className="space-y-8">
              <div className="h-10 border-b border-dashed border-slate-400" />
              <span className="font-bold text-slate-700 block">{isBangla ? 'নিরীক্ষক / অডিটর' : 'Internal Auditor'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
