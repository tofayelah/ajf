import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import {
  getAccountingDiagnosticReport,
  AccountingDiagnosticReport,
  AccountingDiagnosticAccountItem
} from '../../utils/accountingIntegrity';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Eye,
  EyeOff,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { exportToExcel } from '../../services/excelService';
import { AccountingMigrationView } from '../settings/AccountingMigrationView';

interface AccountingDiagnosticViewProps {
  db: AppDatabaseState;
  onDrillDown?: (item: any) => void;
}

export const AccountingDiagnosticView: React.FC<AccountingDiagnosticViewProps> = ({
  db,
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'UNBALANCED' | 'ORPHAN' | 'DUPLICATES' | 'MIGRATION'>('ACCOUNTS');

  const report: AccountingDiagnosticReport = useMemo(() => {
    return getAccountingDiagnosticReport(db);
  }, [db]);

  const filteredAccounts = useMemo(() => {
    return report.accounts.filter(item => {
      const matchesSearch =
        item.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.banglaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'VARIANCE' && item.variance > 0.01) ||
        (filterStatus === 'RECONCILED' && item.variance <= 0.01) ||
        item.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [report.accounts, searchTerm, filterStatus]);

  const handleExport = () => {
    const exportData = filteredAccounts.map(item => ({
      'Account Code': item.accountCode,
      'Account Title (Bangla)': item.banglaName,
      'Account Title (English)': item.accountName,
      'Category': item.category,
      'Normal Balance': item.normalBalance,
      'Journal Debit (৳)': item.journalDebit,
      'Journal Credit (৳)': item.journalCredit,
      'Journal-Derived Balance (৳)': item.journalDerivedBalance,
      'Cash Book Balance (৳)': item.cashBookBalance,
      'Bank Book Balance (৳)': item.bankBookBalance,
      'Sub-Ledger Balance (৳)': item.subLedgerBalance,
      'Mapped Aliases': item.mappedAliases.join(', '),
      'Duplicate Contribution (৳)': item.duplicateContribution,
      'Variance (৳)': item.variance,
      'Status': item.status
    }));

    exportData.push({
      'Account Code': 'GRAND TOTAL / STATUS',
      'Account Title (Bangla)': isBangla ? 'সর্বমোট' : 'Grand Total',
      'Account Title (English)': report.isBalanced ? 'BALANCED' : 'DISCREPANCY',
      'Category': 'AUDIT SUMMARY',
      'Normal Balance': 'DEBIT',
      'Journal Debit (৳)': report.totalJournalDebits,
      'Journal Credit (৳)': report.totalJournalCredits,
      'Journal-Derived Balance (৳)': report.trialBalanceVariance,
      'Cash Book Balance (৳)': 0,
      'Bank Book Balance (৳)': 0,
      'Sub-Ledger Balance (৳)': 0,
      'Mapped Aliases': `Unbalanced: ${report.unbalancedJournalsCount}, Orphan: ${report.orphanJournalLinesCount}`,
      'Duplicate Contribution (৳)': report.duplicateJournalsCount,
      'Variance (৳)': report.trialBalanceVariance,
      'Status': report.isBalanced ? 'RECONCILED' : 'VARIANCE_DETECTED'
    });

    exportToExcel(exportData, `Accounting_Diagnostic_Audit_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6" id="accounting-diagnostic-view">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <Scale className="w-5 h-5 text-indigo-700" />
          <span>{isBangla ? 'অ্যাকাউন্টিং ও জিএল ডায়াগনস্টিক অডিট (Accounting Diagnostic Report)' : 'Accounting Diagnostic Report'}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'জার্নাল-ডেরাইভড ব্যালেন্স, ক্যাশ বুক, সাব-লেজার, অ্যাকাউন্ট ম্যাপিং ও ভ্যারিয়েন্স অডিট'
            : 'Multi-Way Balance Audit: Journal vs Cash Book vs Subledger with Duplicate Detection'}
        </p>
      </div>

      {/* Primary KPI Status Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Card 1: Trial Balance Equilibrium */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            report.isBalanced ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/90 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase">
              {isBangla ? 'ট্রায়াল ব্যালেন্স জের' : 'Trial Balance DR = CR'}
            </span>
            {report.isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold font-mono text-slate-900">
              ৳{report.totalJournalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.isBalanced ? (
                <span className="text-emerald-700 font-bold">DR ৳{report.totalJournalDebits.toLocaleString()} = CR ৳{report.totalJournalCredits.toLocaleString()}</span>
              ) : (
                <span className="text-rose-700 font-bold">Diff: ৳{report.trialBalanceVariance.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Unbalanced Journals */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            report.unbalancedJournalsCount === 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-rose-50/90 border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase">
              {isBangla ? 'অভারসাম্যহীন জার্নাল' : 'Unbalanced Journals'}
            </span>
            {report.unbalancedJournalsCount === 0 ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold font-mono text-slate-900">
              {report.unbalancedJournalsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.unbalancedJournalsCount === 0
                ? (isBangla ? 'সকল জার্নাল ভারসাম্যপূর্ণ (0 Error)' : 'All entries balanced (0 Error)')
                : (isBangla ? `${report.unbalancedJournalsCount} টি জার্নালে ডেবিট ≠ ক্রেডিট` : `${report.unbalancedJournalsCount} journals have DR != CR`)}
            </div>
          </div>
        </div>

        {/* Card 3: Orphan Lines */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            report.orphanJournalLinesCount === 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-amber-50/90 border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase">
              {isBangla ? 'পিতাহীন/অরফ্যান লাইন' : 'Orphan Journal Lines'}
            </span>
            {report.orphanJournalLinesCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold font-mono text-slate-900">
              {report.orphanJournalLinesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.orphanJournalLinesCount === 0
                ? (isBangla ? 'কোনো বিচ্ছিন্ন লাইন নেই' : 'No disconnected lines')
                : (isBangla ? `${report.orphanJournalLinesCount} টি লাইন অভিভাবকহীন` : `${report.orphanJournalLinesCount} lines without valid header`)}
            </div>
          </div>
        </div>

        {/* Card 4: Duplicate Journals */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            report.duplicateJournalsCount === 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-amber-50/90 border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase">
              {isBangla ? 'ডুপ্লিকেট জার্নাল উৎস' : 'Duplicate Source Journals'}
            </span>
            {report.duplicateJournalsCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold font-mono text-slate-900">
              {report.duplicateJournalsCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {report.duplicateJournalsCount === 0
                ? (isBangla ? 'কোনো ডুপ্লিকেট এন্ট্রি নেই' : 'Zero duplicate source entries')
                : (isBangla ? `${report.duplicateJournalsCount} টি সোর্সে ডুপ্লিকেট ভুক্তি` : `${report.duplicateJournalsCount} duplicate sources detected`)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'ACCOUNTS'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>{isBangla ? 'হিসাব ভিত্তিক ম্যাপিং ও ব্যালেন্স অডিট' : 'Account Balance & Mapping Audit'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
            {report.accounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNBALANCED')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'UNBALANCED'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isBangla ? 'অভারসাম্যহীন জার্নাল' : 'Unbalanced Journals'}</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              report.unbalancedJournalsCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {report.unbalancedJournalsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORPHAN')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'ORPHAN'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isBangla ? 'অরফ্যান লাইন' : 'Orphan Lines'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
            {report.orphanJournalLinesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DUPLICATES')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'DUPLICATES'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{isBangla ? 'ডুপ্লিকেট সোর্স' : 'Duplicate Sources'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
            {report.duplicateJournalsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MIGRATION')}
          className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'MIGRATION'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-purple-600 hover:text-purple-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="font-bold">{isBangla ? 'জার্নাল রিক্লাসিফিকেশন (Phase 2)' : 'Phase 2 Reclassification'}</span>
        </button>
      </div>

      {/* Tab 1: Account Balance & Mapping Audit */}
      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs hide-print">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isBangla ? 'হিসাব কোড বা নাম খুঁজুন...' : 'Search by account code, title or category...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">{isBangla ? 'সকল অবস্থা (All)' : 'All Statuses'}</option>
                <option value="RECONCILED">{isBangla ? 'সম্পূর্ণ সমন্বিত (Reconciled)' : 'Reconciled Only'}</option>
                <option value="VARIANCE">{isBangla ? 'পার্থক্য সনাক্ত (Variance)' : 'Variance Detected'}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isBangla ? 'অডিট এক্সপোর্ট (Excel)' : 'Export Audit'}</span>
            </button>
          </div>

          {/* Diagnostic Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-16 text-center">{isBangla ? 'কোড' : 'Code'}</th>
                    <th className="p-3">{isBangla ? 'হিসাবের বিবরণ / ম্যাপিং' : 'Account Title & Mapping'}</th>
                    <th className="p-3 w-24 text-center">{isBangla ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="p-3 text-right w-28">{isBangla ? 'জার্নাল জের' : 'Journal Bal.'}</th>
                    <th className="p-3 text-right w-28">{isBangla ? 'ক্যাশ/ব্যাংক বুক' : 'Cash/Bank'}</th>
                    <th className="p-3 text-right w-28">{isBangla ? 'সাব-লেজার জের' : 'Sub-Ledger'}</th>
                    <th className="p-3 text-right w-24">{isBangla ? 'পার্থক্য' : 'Variance'}</th>
                    <th className="p-3 w-28 text-center">{isBangla ? 'স্ট্যাটাস' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onDrillDown && onDrillDown(item)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        item.variance > 0.01 ? 'bg-rose-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-center text-indigo-700">{item.accountCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{item.banglaName}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{item.accountName}</span>
                          {item.mappedAliases.length > 0 && (
                            <span className="text-amber-600 bg-amber-50 px-1 rounded">
                              Aliases: {item.mappedAliases.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900">
                        ৳{item.journalDerivedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {item.accountCode === '1000'
                          ? `৳${item.cashBookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : item.accountCode === '1010'
                          ? `৳${item.bankBookBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {item.subLedgerBalance > 0
                          ? `৳${item.subLedgerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        <span className={item.variance > 0.01 ? 'text-rose-600' : 'text-emerald-700'}>
                          ৳{item.variance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'RECONCILED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'DUPLICATES_DETECTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.status === 'RECONCILED'
                            ? (isBangla ? 'সমন্বিত' : 'RECONCILED')
                            : (isBangla ? 'পার্থক্য' : 'VARIANCE')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {isBangla ? 'কোনো হিসাব রেকর্ড পাওয়া যায়নি।' : 'No accounts found matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Unbalanced Journals Detail */}
      {activeTab === 'UNBALANCED' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>{isBangla ? 'অভারসাম্যহীন জার্নাল তালিকা (Unbalanced Journal Vouchers)' : 'Unbalanced Journal Entries'}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBangla ? 'জার্নাল নং / ভাউচার' : 'Journal / Voucher No'}</th>
                  <th className="p-3 text-right">{isBangla ? 'ডেবিট মোট (৳)' : 'Debit Total (৳)'}</th>
                  <th className="p-3 text-right">{isBangla ? 'ক্রেডিট মোট (৳)' : 'Credit Total (৳)'}</th>
                  <th className="p-3 text-right">{isBangla ? 'পার্থক্য (৳)' : 'Difference (৳)'}</th>
                  <th className="p-3">{isBangla ? 'সমস্যা বিবরণী' : 'Issue Description'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.unbalancedJournals.map((j, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{j.journalNo}</td>
                    <td className="p-3 text-right font-mono text-emerald-800">৳{j.debit.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-emerald-800">৳{j.credit.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">৳{j.diff.toLocaleString()}</td>
                    <td className="p-3 text-slate-600">{j.issue}</td>
                  </tr>
                ))}
                {report.unbalancedJournals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-emerald-700 font-medium">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      {isBangla
                        ? 'অভিনন্দন! কোনো অভারসাম্যহীন জার্নাল পাওয়া যায়নি (Unbalanced Journals = 0)।'
                        : 'All journal vouchers are perfectly balanced (Unbalanced Journals = 0).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Orphan Lines */}
      {activeTab === 'ORPHAN' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>{isBangla ? 'পিতাহীন বা বিচ্ছিন্ন জার্নাল লাইন' : 'Orphan Journal Lines'}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBangla ? 'লাইন আইডি' : 'Line ID'}</th>
                  <th className="p-3">{isBangla ? 'রেফারেন্সড জার্নাল আইডি' : 'Referenced Journal ID'}</th>
                  <th className="p-3">{isBangla ? 'হিসাব কোড' : 'Account Code'}</th>
                  <th className="p-3 text-right">{isBangla ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.orphanJournalLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono">{line.lineId}</td>
                    <td className="p-3 font-mono text-rose-600">{line.journalEntryId}</td>
                    <td className="p-3 font-mono">{line.accountId}</td>
                    <td className="p-3 text-right font-mono font-bold">৳{line.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {report.orphanJournalLines.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-emerald-700 font-medium">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      {isBangla
                        ? 'কোনো অরফ্যান লাইন পাওয়া যায়নি (Orphan Lines = 0)।'
                        : 'No orphan journal lines found (Orphan Lines = 0).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Duplicate Sources */}
      {activeTab === 'DUPLICATES' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>{isBangla ? 'ডুপ্লিকেট জার্নাল সোর্স তালিকা' : 'Duplicate Source Journals'}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">{isBangla ? 'উৎস টাইপ (Source Type)' : 'Source Type'}</th>
                  <th className="p-3">{isBangla ? 'উৎস আইডি (Source ID)' : 'Source ID'}</th>
                  <th className="p-3 text-center">{isBangla ? 'সংখ্যা (Count)' : 'Duplicate Count'}</th>
                  <th className="p-3">{isBangla ? 'সম্পৃক্ত জার্নাল নং' : 'Associated Journal Nos'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.duplicateJournals.map((dup, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{dup.sourceType}</td>
                    <td className="p-3 font-mono text-indigo-700">{dup.sourceId}</td>
                    <td className="p-3 text-center font-bold text-rose-600">{dup.count}</td>
                    <td className="p-3 font-mono text-slate-600">{dup.journalNos.join(', ')}</td>
                  </tr>
                ))}
                {report.duplicateJournals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-emerald-700 font-medium">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      {isBangla
                        ? 'কোনো ডুপ্লিকেট জার্নাল পাওয়া যায়নি (Duplicate Journals = 0)।'
                        : 'No duplicate source journals found (Duplicate Journals = 0).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Phase 2 Historical Migration */}
      {activeTab === 'MIGRATION' && (
        <AccountingMigrationView />
      )}
    </div>
  );
};
