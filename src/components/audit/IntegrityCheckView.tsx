import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  runComprehensiveDiagnosticAudit,
  verifyVoucherRangeBalance,
  validateCashMovementsReconciliation,
  ComprehensiveIntegrityReport,
  VoucherRangeValidationResult,
  CashMovementReconciliationResult,
  CashReconciliationItem,
} from '../../utils/accountingIntegrity';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  Download,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  BookOpen,
  DollarSign,
  Scale,
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';

export interface IntegrityCheckViewProps {
  onClose?: () => void;
}

export const IntegrityCheckView: React.FC<IntegrityCheckViewProps> = ({ onClose }) => {
  const { db, language, activeUser } = useApp();
  const isBangla = language === 'bn';
  const printRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOUBLE_ENTRY' | 'CASH_RECON' | 'VIOLATIONS'>('OVERVIEW');
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | 'THIS_YEAR' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [voucherPrefix, setVoucherPrefix] = useState<string>('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [expandedVoucherKey, setExpandedVoucherKey] = useState<string | null>(null);
  const [lastAuditTimestamp, setLastAuditTimestamp] = useState<string>(new Date().toISOString());

  // Date range presets handler
  const handlePresetChange = (preset: 'ALL' | 'THIS_YEAR' | 'THIS_MONTH' | 'CUSTOM') => {
    setDateRangePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_YEAR') {
      // Fiscal year: usually July 1 to June 30 or Jan 1 to Dec 31
      const isPostJuly = now.getMonth() >= 6;
      const startYear = isPostJuly ? currentYear : currentYear - 1;
      const endYear = startYear + 1;
      setStartDate(`${startYear}-07-01`);
      setEndDate(`${endYear}-06-30`);
    } else if (preset === 'THIS_MONTH') {
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${currentYear}-${month}-01`;
      const lastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();
      const end = `${currentYear}-${month}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Perform 3-Way Comprehensive Integrity Audit
  const auditReport: ComprehensiveIntegrityReport = useMemo(() => {
    return runComprehensiveDiagnosticAudit(db, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      voucherPrefix: voucherPrefix.trim() || undefined,
      sourceType: sourceTypeFilter !== 'ALL' ? sourceTypeFilter : undefined,
      auditedBy: activeUser?.fullName || 'System Admin',
    });
  }, [db, startDate, endDate, voucherPrefix, sourceTypeFilter, activeUser, lastAuditTimestamp]);

  const handleRerunAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      setLastAuditTimestamp(new Date().toISOString());
      setIsScanning(false);
    }, 400);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = [
      ['INTEGRITY CHECK & 3-WAY VALIDATION REPORT'],
      ['Report ID', auditReport.reportId],
      ['Generated At', auditReport.generatedAt],
      ['Audited By', auditReport.auditedBy],
      ['Date Range', `${startDate || 'ALL'} to ${endDate || 'ALL'}`],
      ['System Health Score', `${auditReport.healthScore}%`],
      ['Overall Status', auditReport.overallStatus],
      ['Total Vouchers Checked', auditReport.totalVouchersAudited.toString()],
      ['Unbalanced Vouchers', auditReport.unbalancedVouchersCount.toString()],
      ['Cash Reconciled?', auditReport.cashMovementAudit.isReconciled ? 'YES' : 'NO'],
      ['Net Cash Variance (BDT)', auditReport.cashMovementAudit.totalVariance.toString()],
      ['Total Violations Detected', auditReport.totalViolationsCount.toString()],
      [],
      ['--- VIOLATIONS & DISCREPANCIES REGISTRY ---'],
      ['Violation ID', 'Category', 'Severity', 'Voucher / Ref', 'Module', 'Date', 'Description', 'Impact Amount (BDT)', 'Remediation'],
      ...auditReport.violationsList.map((v) => [
        v.violationId,
        v.category,
        v.severity,
        v.voucherId || v.transactionId || '-',
        v.module,
        v.date || '-',
        `"${(v.description || '').replace(/"/g, '""')}"`,
        v.impactAmount.toString(),
        `"${(v.remediation || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Integrity_Check_Report_${auditReport.reportId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Vouchers List for Double-Entry Tab
  const allVouchers = useMemo(() => {
    const list = [
      ...auditReport.doubleEntryAudit.discrepancies,
      ...auditReport.doubleEntryAudit.balancedVouchers,
    ];

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (v) =>
        (v.voucherNo || '').toLowerCase().includes(term) ||
        (v.journalNo || '').toLowerCase().includes(term) ||
        (v.sourceType || '').toLowerCase().includes(term) ||
        ((v as any).sourceId || '').toLowerCase().includes(term)
    );
  }, [auditReport, searchTerm]);

  // Overall Status Theme
  const isPassed = auditReport.overallStatus === 'PASSED';
  const isWarning = auditReport.overallStatus === 'WARNING';
  const isFailed = auditReport.overallStatus === 'FAILED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" ref={printRef}>
      {/* 1. Header with Title, Status Badge, and Primary Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPassed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : isWarning ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {isBangla ? '৩-মুখী ইন্টিগ্রিটি ও ব্যালেন্স অডিট' : '3-Way Integrity & Diagnostic Audit'}
                </h1>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isPassed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isWarning
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                }`}>
                  {auditReport.overallStatus}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                {isBangla
                  ? '১) জাবেদা ভাউচার সমতা (DR = CR), ২) ক্যাশ বুক ও সাব-লেজার মিল, এবং ৩) পূর্ণাঙ্গ ইন্টিগ্রিটি রিপোর্ট'
                  : '1) Voucher DR = CR balance, 2) Cash Book vs sub-ledger reconciliation, and 3) Integrity Report'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRerunAudit}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-all border border-indigo-200/80 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isBangla ? 'পুনরায় স্ক্যান' : 'Re-Run Audit'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            {isBangla ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isBangla ? 'CSV এক্সপোর্ট' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* 2. Visual Alert Banners for Discrepancies */}
      {!isPassed && (
        <div className={`p-4 md:p-5 rounded-2xl border ${isFailed ? 'bg-rose-50/90 border-rose-200 text-rose-900' : 'bg-amber-50/90 border-amber-200 text-amber-900'} shadow-xs`}>
          <div className="flex items-start gap-3.5">
            <AlertTriangle className={`w-6 h-6 shrink-0 mt-0.5 ${isFailed ? 'text-rose-600' : 'text-amber-600'}`} />
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm md:text-base font-bold">
                  {isBangla
                    ? `সতর্কতা: ${auditReport.totalViolationsCount} টি অডিট অসঙ্গতি পাওয়া গেছে!`
                    : `Attention Required: ${auditReport.totalViolationsCount} Audit Discrepancies Detected!`}
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white/80 border border-current">
                  {isBangla ? `স্বাস্থ্য স্কোর: ${auditReport.healthScore}%` : `Health Score: ${auditReport.healthScore}%`}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {isBangla
                  ? `মোট ${auditReport.unbalancedVouchersCount} টি জাবেদা ভাউচারে ডেবিট-ক্রেডিট অসমতা এবং ৳${Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()} টাকার ক্যাশ বুক ও সাব-লেজার অমিল চিহ্নিত হয়েছে। নিচে বিস্তারিত দেখুন।`
                  : `Found ${auditReport.unbalancedVouchersCount} unbalanced journal voucher(s) and ৳${Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()} variance between Cash Book & sub-ledgers.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {isPassed && (
        <div className="p-4 md:p-5 rounded-2xl border bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3.5">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
            <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm md:text-base font-bold">
                  {isBangla ? 'সকল ৩-মুখী অডিট সন্তোষজনকভাবে পাস করেছে (১০০% ইন্টিগ্রিটি)' : '3-Way Integrity Check Passed (100% Balanced)'}
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {isBangla
                    ? 'সকল জাবেদা ভাউচারের ডেবিট = ক্রেডিট এবং ক্যাশ বুকের সাথে সকল সাব-লেজারের লেনদেনের পূর্ণ মিল রয়েছে।'
                    : 'All journal vouchers equal zero and Cash Book movements match all sub-ledger transaction lines.'}
                </p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 bg-emerald-600 text-white rounded-lg shadow-xs">
                SCORE: {auditReport.healthScore}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Diagnostic High-Level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Card 1: System Health */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isBangla ? 'সিস্টেম হেলথ' : 'Health Score'}</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${auditReport.healthScore >= 90 ? 'text-emerald-600' : auditReport.healthScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
              {auditReport.healthScore}%
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {auditReport.healthScore === 100 ? (isBangla ? 'নিখুঁত' : 'Perfect') : (isBangla ? 'মনোযোগ আবশ্যক' : 'Review needed')}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${auditReport.healthScore >= 90 ? 'bg-emerald-500' : auditReport.healthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${auditReport.healthScore}%` }}
            />
          </div>
        </div>

        {/* Card 2: Double-Entry Voucher Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isBangla ? '১) ভাউচার ব্যালেন্স' : '1) Voucher Balance'}</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {auditReport.totalVouchersAudited - auditReport.unbalancedVouchersCount} / {auditReport.totalVouchersAudited}
            </span>
            <span className="text-[11px] font-bold text-slate-500">{isBangla ? 'সমান' : 'balanced'}</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            {auditReport.unbalancedVouchersCount === 0 ? (
              <span className="text-emerald-600">✓ {isBangla ? 'কোনো অসঙ্গতি নেই (DR=CR)' : 'All vouchers DR = CR'}</span>
            ) : (
              <span className="text-rose-600 font-black">⚠ {auditReport.unbalancedVouchersCount} {isBangla ? 'টি অসম ভাউচার' : 'unbalanced'}</span>
            )}
          </p>
        </div>

        {/* Card 3: Cash Book Reconciliation */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isBangla ? '২) ক্যাশ বুক মিল' : '2) Cash Book Recon'}</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              ৳{Math.abs(auditReport.cashMovementAudit.totalVariance).toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-slate-500">{isBangla ? 'পার্থক্য' : 'variance'}</span>
          </div>
          <p className="text-[11px] font-bold mt-1">
            {auditReport.cashMovementAudit.isReconciled ? (
              <span className="text-emerald-600">✓ {isBangla ? '১০০% ক্যাশ রিকনসাইল্ড' : '100% Reconciled'}</span>
            ) : (
              <span className="text-amber-600 font-black">⚠ {auditReport.cashMovementAudit.allUnreconciledItems.length} {isBangla ? 'টি অমিল আইটেম' : 'unmatched item(s)'}</span>
            )}
          </p>
        </div>

        {/* Card 4: Total Violations */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{isBangla ? '৩) মোট অসঙ্গতি' : '3) Violations List'}</span>
            <FileSpreadsheet className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${auditReport.totalViolationsCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {auditReport.totalViolationsCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500">{isBangla ? 'টি ইস্যু' : 'issues'}</span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            {auditReport.totalViolationsCount === 0 ? (
              <span className="text-emerald-600">✓ {isBangla ? 'কোনো অ্যাকশন দরকার নেই' : 'No action required'}</span>
            ) : (
              <span className="text-rose-600">⚠ {isBangla ? 'সমাধানের সুপারিশ দেখুন' : 'View remediation plan'}</span>
            )}
          </p>
        </div>
      </div>

      {/* 4. Controls & Date/Module Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">{isBangla ? 'সময়কাল ফিল্টার:' : 'Date Preset:'}</span>
            {(['ALL', 'THIS_YEAR', 'THIS_MONTH', 'CUSTOM'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetChange(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dateRangePreset === preset
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset === 'ALL' && (isBangla ? 'সর্বকালীন (All)' : 'All Time')}
                {preset === 'THIS_YEAR' && (isBangla ? 'চলতি অর্থবছর' : 'Current FY')}
                {preset === 'THIS_MONTH' && (isBangla ? 'চলতি মাস' : 'This Month')}
                {preset === 'CUSTOM' && (isBangla ? 'কাস্টম' : 'Custom')}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {isBangla ? 'সর্বশেষ যাচাই:' : 'Last Scanned:'} {format(new Date(lastAuditTimestamp), 'hh:mm:ss a, dd MMM yyyy')}
          </div>
        </div>

        {dateRangePreset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">{isBangla ? 'শুরুর তারিখ:' : 'Start Date:'}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">{isBangla ? 'শেষ তারিখ:' : 'End Date:'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Navigation Tabs for the 3 Validation Layers */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {isBangla ? '১) সার্বিক ইন্টিগ্রিটি রিপোর্ট' : '1) Integrity Overview'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DOUBLE_ENTRY')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'DOUBLE_ENTRY'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4" />
          {isBangla ? '২) জাবেদা সমতা অডিট (DR = CR)' : '2) Journal Double-Entry (DR=CR)'}
          {auditReport.unbalancedVouchersCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black">
              {auditReport.unbalancedVouchersCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASH_RECON')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'CASH_RECON'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          {isBangla ? '৩) ক্যাশ বুক ও সাব-লেজার মিল' : '3) Cash Book Reconciliation'}
          {!auditReport.cashMovementAudit.isReconciled && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
              {auditReport.cashMovementAudit.allUnreconciledItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('VIOLATIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'VIOLATIONS'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          {isBangla ? 'অসঙ্গতি ও সুপারিশ তালিকা' : 'Violations & Action Plan'}
          {auditReport.totalViolationsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-black">
              {auditReport.totalViolationsCount}
            </span>
          )}
        </button>
      </div>

      {/* 6. TAB CONTENT 1: OVERVIEW & SYSTEM REPORT */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900">
                  {isBangla ? 'নির্বাহী অডিট সারাংশ ও আনুষ্ঠানিক সনদ' : 'Executive Audit Summary & Verification'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBangla ? `রিপোর্ট নং: ${auditReport.reportId}` : `Report Reference: ${auditReport.reportId}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono">
                  {format(new Date(auditReport.generatedAt), 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  {isBangla ? '১) জাবেদা ভাউচার ডেবিট-ক্রেডিট সমতা' : '1) Double-Entry Journal Symmetry'}
                </h4>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>{isBangla ? 'মোট যাচাইকৃত ভাউচার:' : 'Total Vouchers Verified:'}</span>
                    <strong className="text-slate-900">{auditReport.totalVouchersAudited}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'মোট ডেবিট যোগফল:' : 'Total System Debits:'}</span>
                    <strong className="text-slate-900 font-mono">৳{auditReport.doubleEntryAudit.totalDebitSum.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'মোট ক্রেডিট যোগফল:' : 'Total System Credits:'}</span>
                    <strong className="text-slate-900 font-mono">৳{auditReport.doubleEntryAudit.totalCreditSum.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'অসম ভাউচার সংখ্যা:' : 'Unbalanced Vouchers:'}</span>
                    <strong className={auditReport.unbalancedVouchersCount === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {auditReport.unbalancedVouchersCount}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {isBangla ? '২) ক্যাশ বুক বনাম সাব-লেজার মিল' : '2) Cash Book vs. Sub-Ledger Reconciliation'}
                </h4>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>{isBangla ? 'ক্যাশ বুক মোট নিট মুভমেন্ট:' : 'Cash Book Net Movement:'}</span>
                    <strong className="text-slate-900 font-mono">৳{auditReport.cashMovementAudit.netCashBookMovement.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'সাব-লেজার মোট নিট মুভমেন্ট:' : 'Sub-Ledger Net Movement:'}</span>
                    <strong className="text-slate-900 font-mono">৳{auditReport.cashMovementAudit.netSubledgerMovement.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'মোট ক্যাশ পার্থক্য:' : 'Total Cash Variance:'}</span>
                    <strong className={auditReport.cashMovementAudit.isReconciled ? 'text-emerald-700 font-mono' : 'text-rose-700 font-mono'}>
                      ৳{auditReport.cashMovementAudit.totalVariance.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isBangla ? 'রিকনসিলিয়েশন স্থিতি:' : 'Reconciliation Status:'}</span>
                    <strong className={auditReport.cashMovementAudit.isReconciled ? 'text-emerald-700' : 'text-amber-700'}>
                      {auditReport.cashMovementAudit.isReconciled ? 'RECONCILED' : 'VARIANCE DETECTED'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations & Action Directives */}
            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-2">
              <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                {isBangla ? 'অডিট সুপারিশ ও সংশোধন নির্দেশনা:' : 'Audit Recommendations & Guidance:'}
              </h4>
              <ul className="space-y-1.5 text-xs text-indigo-950">
                {auditReport.recommendations.map((rec, i) => (
                  <li key={`rec-item-${i}`} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 2: DOUBLE-ENTRY JOURNAL VOUCHER AUDIT (DR = CR) */}
      {activeTab === 'DOUBLE_ENTRY' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBangla ? 'ভাউচার নং বা মডিউল দিয়ে খুঁজুন...' : 'Search by voucher or module...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              {isBangla ? `মোট প্রদর্শিত: ${allVouchers.length} টি ভাউচার` : `Displaying: ${allVouchers.length} vouchers`}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-mono">{isBangla ? 'ভাউচার নং' : 'Voucher No'}</th>
                    <th className="p-3">{isBangla ? 'তারিখ' : 'Date'}</th>
                    <th className="p-3">{isBangla ? 'উৎস / মডিউল' : 'Source / Module'}</th>
                    <th className="p-3 text-right">{isBangla ? 'ডেবিট (৳)' : 'Debit (৳)'}</th>
                    <th className="p-3 text-right">{isBangla ? 'ক্রেডিট (৳)' : 'Credit (৳)'}</th>
                    <th className="p-3 text-right">{isBangla ? 'পার্থক্য (৳)' : 'Diff (৳)'}</th>
                    <th className="p-3 text-center">{isBangla ? 'স্থিতি' : 'Status'}</th>
                    <th className="p-3 text-center">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allVouchers.length > 0 ? (
                    allVouchers.map((v, idx) => {
                      const isBalanced = (v as any).isBalanced === true;
                      const vKey = `${v.journalEntryId || 'je'}-${v.voucherNo || (v as any).journalNo || ''}-${(v as any).sourceType || ''}-${idx}`;
                      const isExpanded = expandedVoucherKey === vKey;

                      return (
                        <React.Fragment key={vKey}>
                          <tr className={`hover:bg-slate-50/80 transition-colors ${!isBalanced ? 'bg-rose-50/50' : ''}`}>
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {v.voucherNo || (v as any).journalNo}
                            </td>
                            <td className="p-3 font-mono text-slate-600">{v.date}</td>
                            <td className="p-3 font-bold text-slate-700">{(v as any).sourceType || 'GENERAL'}</td>
                            <td className="p-3 text-right font-mono text-slate-900">৳{v.totalDebit.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-slate-900">৳{v.totalCredit.toLocaleString()}</td>
                            <td className={`p-3 text-right font-mono font-bold ${!isBalanced ? 'text-rose-600' : 'text-slate-400'}`}>
                              ৳{(v as any).absoluteDifference !== undefined ? (v as any).absoluteDifference.toLocaleString() : (v as any).imbalance !== undefined ? Math.abs((v as any).imbalance).toLocaleString() : '0'}
                            </td>
                            <td className="p-3 text-center">
                              {isBalanced ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  BALANCED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 animate-pulse">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  IMBALANCED
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedVoucherKey(isExpanded ? null : vKey)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all"
                              >
                                {isExpanded ? (isBangla ? 'লুকান' : 'Hide') : (isBangla ? 'লাইন দেখুন' : 'Lines')}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Line Details */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={8} className="p-3.5 border-b border-slate-200">
                                <div className="space-y-2 max-w-4xl mx-auto">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700">
                                      {isBangla ? 'ভাউচার হিসাব লাইনসমূহ (Journal Lines):' : 'Journal Lines Breakdown:'}
                                    </span>
                                    <span className="font-mono text-slate-500">ID: {v.journalEntryId}</span>
                                  </div>
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                    <table className="w-full text-xs">
                                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                        <tr>
                                          <th className="p-2 font-mono">Account ID</th>
                                          <th className="p-2">Account Name</th>
                                          <th className="p-2 text-right">Debit (৳)</th>
                                          <th className="p-2 text-right">Credit (৳)</th>
                                          <th className="p-2">Line Description</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(v as any).lines && (v as any).lines.map((ln: any, lnIdx: number) => (
                                          <tr key={ln.id ? `${ln.id}-${lnIdx}` : `ln-${lnIdx}`}>
                                            <td className="p-2 font-mono text-slate-600">{ln.accountId}</td>
                                            <td className="p-2 font-bold text-slate-800">{ln.accountName || '-'}</td>
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {isBangla ? 'কোনো ভাউচার পাওয়া যায়নি' : 'No vouchers found matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB CONTENT 3: CASH BOOK VS. SUB-LEDGER RECONCILIATION */}
      {activeTab === 'CASH_RECON' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              {isBangla ? 'ক্যাশ বুক বনাম সাব-লেজার মডিউলভিত্তিক তুলনা' : 'Cash Book vs. Sub-Ledger Module Comparison'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBangla
                ? 'ক্যাশ বুকে রেকর্ডকৃত মোট নগদ জমা ও খরচের সাথে প্রতিটি সাব-লেজারের (ভর্তি, মূলধন, মাসিক চাঁদা ইত্যাদি) লেনদেন লাইনের পুঙ্খানুপুঙ্খ মিল যাচাই।'
                : 'Detailed reconciliation between Cash Book cash movements and respective sub-ledger transaction registers.'}
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">{isBangla ? 'মডিউল নাম' : 'Module Name'}</th>
                    <th className="p-3 text-right">{isBangla ? 'ক্যাশ বুক মোট (৳)' : 'Cash Book Total (৳)'}</th>
                    <th className="p-3 text-right">{isBangla ? 'সাব-লেজার মোট (৳)' : 'Sub-Ledger Total (৳)'}</th>
                    <th className="p-3 text-right">{isBangla ? 'পার্থক্য (৳)' : 'Variance (৳)'}</th>
                    <th className="p-3 text-center">{isBangla ? 'লেনদেন সংখ্যা (CB / SL)' : 'Tx Count (CB / SL)'}</th>
                    <th className="p-3 text-center">{isBangla ? 'রেকর্ড মিল' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(auditReport.cashMovementAudit.modules).map((mod, modIdx) => (
                    <tr key={`mod-row-${mod.module}-${modIdx}`} className={`hover:bg-slate-50/60 ${!mod.isMatched ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        {mod.label || mod.module}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-800">৳{mod.cashBookAmount.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-slate-800">৳{mod.subledgerAmount.toLocaleString()}</td>
                      <td className={`p-3 text-right font-mono font-bold ${mod.variance !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{Math.abs(mod.variance).toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {mod.cashBookTransactionCount} / {mod.subledgerTransactionCount}
                      </td>
                      <td className="p-3 text-center">
                        {mod.isMatched ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            RECONCILED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                            VARIANCE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB CONTENT 4: VIOLATIONS & ACTION PLAN */}
      {activeTab === 'VIOLATIONS' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              {isBangla ? 'অসঙ্গতি রেজিস্ট্রি ও সংশোধন পরিকল্পনা' : 'Violations Registry & Remediation Directives'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBangla
                ? 'সিস্টেমে চিহ্নিত সকল অসম ভাউচার ও অমিল ক্যাশ লেনদেনের তালিকা এবং সেগুলি সমাধানের নির্দিষ্ট নির্দেশনা।'
                : 'Complete registry of flagged journal imbalances and cash variances with specific action items.'}
            </p>

            {auditReport.violationsList.length > 0 ? (
              <div className="space-y-3">
                {auditReport.violationsList.map((vio, vIdx) => (
                  <div
                    key={`vio-${vio.violationId}-${vIdx}`}
                    className={`p-4 rounded-xl border ${vio.severity === 'HIGH' ? 'bg-rose-50/60 border-rose-200' : 'bg-amber-50/60 border-amber-200'} space-y-2`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${vio.severity === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                          {vio.severity} SEVERITY
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {vio.voucherId || vio.transactionId || vio.violationId}
                        </span>
                        <span className="text-xs font-bold text-slate-600">[{vio.module}]</span>
                      </div>
                      <span className="font-mono font-black text-xs text-rose-700">
                        {isBangla ? 'প্রভাব:' : 'Impact:'} ৳{vio.impactAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {vio.description}
                    </p>
                    {vio.remediation && (
                      <div className="text-xs text-indigo-900 bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                        <strong>{isBangla ? 'সুপারিশকৃত সমাধান:' : 'Recommended Fix:'}</strong> {vio.remediation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-1" />
                <h4 className="font-bold text-sm">{isBangla ? 'কোনো অসঙ্গতি পাওয়া যায়নি' : 'No Violations Detected'}</h4>
                <p className="text-xs text-emerald-600">
                  {isBangla
                    ? 'আপনার আর্থিক ডেটাবেজে কোনো ডেবিট-ক্রেডিট অসমতা বা ক্যাশ অমিল নেই।'
                    : 'Your accounting database is 100% compliant with double-entry rules.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
