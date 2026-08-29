import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import { Scale, CheckCircle2, AlertTriangle, Search, Download, Eye, EyeOff } from 'lucide-react';
import { resolveCanonicalAccount } from '../../utils/accountMapping';
import { exportToExcel } from '../../services/excelService';

interface TrialBalanceReportProps {
  db: AppDatabaseState;
  dateFrom?: string;
  dateTo?: string;
  onDrillDown?: (item: any) => void;
}

export interface TrialBalanceRowItem {
  code: string;
  nameBn: string;
  nameEn: string;
  category: string;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
  normalBalance: 'DEBIT' | 'CREDIT';
  lineCount: number;
}

export const TrialBalanceReport: React.FC<TrialBalanceReportProps> = ({
  db,
  dateFrom,
  dateTo,
  onDrillDown
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  const trialBalanceData = useMemo(() => {
    const accounts = Array.isArray(db.accounts) ? db.accounts : [];
    const journalEntries = db.journalEntries || [];
    const journalLines = db.journalLines || [];

    // Filter active journal entries (Exclude CANCELLED and REVERSED)
    const activeEntriesMap = new Map<string, { id: string; journalNo: string; date: string }>();
    journalEntries.forEach(entry => {
      if (!entry) return;
      const status = (entry.status as string) || 'ACTIVE';
      if (status === 'CANCELLED' || status === 'REVERSED') return;

      const entryId = entry.id || entry.journalNo || '';
      if (entryId) {
        activeEntriesMap.set(entryId, {
          id: entryId,
          journalNo: entry.journalNo || entryId,
          date: entry.date || ''
        });
      }
      if (entry.journalNo && entry.journalNo !== entryId) {
        activeEntriesMap.set(entry.journalNo, {
          id: entryId,
          journalNo: entry.journalNo,
          date: entry.date || ''
        });
      }
    });

    // Map all accounts in Chart of Accounts into a lookup map
    const accountMap = new Map<string, TrialBalanceRowItem>();

    accounts.forEach(acc => {
      const canonical = resolveCanonicalAccount(acc.accountCode, acc.accountName, accounts);
      const code = canonical.accountCode;
      if (!accountMap.has(code)) {
        accountMap.set(code, {
          code,
          nameBn: canonical.banglaName || acc.banglaName || canonical.accountName,
          nameEn: canonical.accountName || acc.accountName,
          category: canonical.category || acc.category || 'Asset',
          totalDebit: 0,
          totalCredit: 0,
          netDebit: 0,
          netCredit: 0,
          normalBalance: canonical.normalBalance,
          lineCount: 0
        });
      }
    });

    // Strictly aggregate from active journal lines ONLY (No independent sub-ledger totals added)
    journalLines.forEach(line => {
      if (!line) return;
      
      const parentEntry = activeEntriesMap.get(line.journalEntryId);
      // If parent entry is not active or outside date range, skip
      if (!parentEntry) return;

      const entryDate = parentEntry.date;
      if (dateFrom && entryDate && entryDate < dateFrom) return;
      if (dateTo && entryDate && entryDate > dateTo) return;

      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit === 0 && credit === 0) return;

      const canonical = resolveCanonicalAccount(line.accountId, line.accountName, accounts);
      const code = canonical.accountCode;

      if (!accountMap.has(code)) {
        accountMap.set(code, {
          code,
          nameBn: canonical.banglaName,
          nameEn: canonical.accountName,
          category: canonical.category,
          totalDebit: 0,
          totalCredit: 0,
          netDebit: 0,
          netCredit: 0,
          normalBalance: canonical.normalBalance,
          lineCount: 0
        });
      }

      const item = accountMap.get(code)!;
      item.totalDebit += debit;
      item.totalCredit += credit;
      item.lineCount += 1;
    });

    // Calculate Net Debit and Net Credit for each account
    const rows: TrialBalanceRowItem[] = [];
    accountMap.forEach(item => {
      const diff = item.totalDebit - item.totalCredit;
      if (diff > 0) {
        item.netDebit = Math.round(diff * 100) / 100;
        item.netCredit = 0;
      } else if (diff < 0) {
        item.netDebit = 0;
        item.netCredit = Math.round(Math.abs(diff) * 100) / 100;
      } else {
        item.netDebit = 0;
        item.netCredit = 0;
      }
      rows.push(item);
    });

    // Sort rows by Account Code
    rows.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    // Grand Totals: Sum of Net Debits and Net Credits
    const totalDebit = Math.round(rows.reduce((s, r) => s + r.netDebit, 0) * 100) / 100;
    const totalCredit = Math.round(rows.reduce((s, r) => s + r.netCredit, 0) * 100) / 100;
    const difference = Math.round(Math.abs(totalDebit - totalCredit) * 100) / 100;
    const isBalanced = difference < 0.01;
    const status: 'BALANCED' | 'DISCREPANCY' = isBalanced ? 'BALANCED' : 'DISCREPANCY';

    return {
      rows,
      totalDebit,
      totalCredit,
      difference,
      isBalanced,
      status,
      activeAccountsCount: rows.filter(r => r.netDebit > 0 || r.netCredit > 0).length
    };
  }, [db, dateFrom, dateTo]);

  const filteredRows = useMemo(() => {
    return trialBalanceData.rows.filter(row => {
      if (hideZeroBalances && row.netDebit === 0 && row.netCredit === 0) {
        return false;
      }
      const matchesSearch =
        row.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.nameBn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || row.category.toUpperCase() === categoryFilter.toUpperCase();
      return matchesSearch && matchesCategory;
    });
  }, [trialBalanceData.rows, searchTerm, categoryFilter, hideZeroBalances]);

  const handleExport = () => {
    const exportData = filteredRows.map(r => ({
      'Account Code': r.code,
      'Account Title (Bangla)': r.nameBn,
      'Account Title (English)': r.nameEn,
      'Category': r.category,
      'Total Debit (৳)': r.totalDebit,
      'Total Credit (৳)': r.totalCredit,
      'Net Debit Balance (৳)': r.netDebit,
      'Net Credit Balance (৳)': r.netCredit
    }));

    exportData.push({
      'Account Code': 'TOTAL',
      'Account Title (Bangla)': 'সর্বমোট',
      'Account Title (English)': 'Grand Total',
      'Category': trialBalanceData.status,
      'Total Debit (৳)': 0,
      'Total Credit (৳)': 0,
      'Net Debit Balance (৳)': trialBalanceData.totalDebit,
      'Net Credit Balance (৳)': trialBalanceData.totalCredit
    });

    exportToExcel(exportData, `Trial_Balance_${dateFrom || 'all'}_to_${dateTo || 'all'}`);
  };

  return (
    <div className="space-y-6" id="trial-balance-report-container">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <Scale className="w-5 h-5 text-emerald-800" />
          <span>{isBangla ? 'রেওয়ামিল / ট্রায়াল ব্যালেন্স (Trial Balance)' : 'Trial Balance'}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'শুধুমাত্র জার্নাল এন্ট্রি ভিত্তিক ডেবিট ও ক্রেডিট জেরের স্বয়ংক্রিয় ভারসাম্য প্রতিবেদন (General Ledger Double-Entry)'
            : 'Journal-Entry-Derived General Ledger Equilibrium Report'}
        </p>
      </div>

      {/* Equilibrium Status & Metric Cards (Requirement 12) */}
      <div
        id="trial-balance-status-card"
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 text-xs transition-all ${
          trialBalanceData.isBalanced
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/90 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-3 w-full md:w-auto">
          {trialBalanceData.isBalanced ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-rose-600 flex-shrink-0 animate-pulse" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                {trialBalanceData.isBalanced
                  ? (isBangla ? 'ট্রায়াল ব্যালেন্স সম্পূর্ণ ভারসাম্যপূর্ণ (Equilibrium Verified)' : 'Trial Balance is Balanced')
                  : (isBangla ? 'ট্রায়াল ব্যালেন্সে পার্থক্য সনাক্ত হয়েছে' : 'Trial Balance Discrepancy Detected')}
              </span>
              <span
                id="trial-balance-status-badge"
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                  trialBalanceData.isBalanced
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-rose-200 text-rose-900'
                }`}
              >
                {trialBalanceData.status === 'BALANCED' ? 'STATUS: BALANCED' : 'STATUS: DISCREPANCY'}
              </span>
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {trialBalanceData.isBalanced
                ? (isBangla ? 'মোট ডেবিট এবং মোট ক্রেডিট নিখুঁতভাবে সমান (DR = CR)।' : 'Total Debits strictly equal Total Credits (DR = CR).')
                : (isBangla
                    ? `পার্থক্য সনাক্ত: ৳${trialBalanceData.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : `Discrepancy: ৳${trialBalanceData.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto font-mono text-center md:text-right">
          <div className="bg-white/80 px-3 py-2 rounded-lg border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">
              {isBangla ? 'মোট ডেবিট' : 'Total Debit'}
            </span>
            <span id="trial-balance-total-debit" className="text-sm font-bold text-emerald-950">
              ৳{trialBalanceData.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white/80 px-3 py-2 rounded-lg border border-slate-200">
            <span className="block text-[10px] font-bold text-slate-500 uppercase">
              {isBangla ? 'মোট ক্রেডিট' : 'Total Credit'}
            </span>
            <span id="trial-balance-total-credit" className="text-sm font-bold text-emerald-950">
              ৳{trialBalanceData.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className={`px-3 py-2 rounded-lg border ${trialBalanceData.isBalanced ? 'bg-white/80 border-slate-200' : 'bg-rose-100 border-rose-300'}`}>
            <span className="block text-[10px] font-bold text-slate-500 uppercase">
              {isBangla ? 'পার্থক্য (Diff)' : 'Difference'}
            </span>
            <span id="trial-balance-difference" className={`text-sm font-bold ${trialBalanceData.isBalanced ? 'text-emerald-800' : 'text-rose-700'}`}>
              ৳{trialBalanceData.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs hide-print">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="trial-balance-search-input"
              type="text"
              placeholder={isBangla ? 'হিসাব কোড বা নাম দিয়ে খুঁজুন...' : 'Search by account code or title...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            id="trial-balance-category-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="ALL">{isBangla ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
            <option value="ASSET">{isBangla ? 'সম্পদ (Asset)' : 'Asset'}</option>
            <option value="LIABILITY">{isBangla ? 'দায় (Liability)' : 'Liability'}</option>
            <option value="MEMBER CAPITAL">{isBangla ? 'সদস্য মূলধন ও তহবিল (Capital)' : 'Member Capital'}</option>
            <option value="INCOME">{isBangla ? 'আয় (Income)' : 'Income'}</option>
            <option value="EXPENSE">{isBangla ? 'ব্যয় (Expense)' : 'Expense'}</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="trial-balance-toggle-zero-btn"
            type="button"
            onClick={() => setHideZeroBalances(!hideZeroBalances)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              hideZeroBalances
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {hideZeroBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isBangla ? (hideZeroBalances ? 'শুধুমাত্র সক্রিয় হিসাব' : 'সকল হিসাব') : (hideZeroBalances ? 'Active Only' : 'Show All')}</span>
          </button>

          <button
            id="trial-balance-export-excel-btn"
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-medium shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBangla ? 'এক্সেল এক্সপোর্ট' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" id="trial-balance-table">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-20 text-center">{isBangla ? 'হিসাব কোড' : 'Code'}</th>
                <th className="p-3">{isBangla ? 'হিসাবের বিবরণ / নাম (Account Title)' : 'Account Title'}</th>
                <th className="p-3 w-28 text-center">{isBangla ? 'শ্রেণী (Category)' : 'Category'}</th>
                <th className="p-3 text-right w-36">{isBangla ? 'ডেবিট জের (৳ Debit)' : 'Debit Balance (৳)'}</th>
                <th className="p-3 text-right w-36">{isBangla ? 'ক্রেডিট জের (৳ Credit)' : 'Credit Balance (৳)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row, idx) => (
                <tr
                  key={idx}
                  id={`tb-row-${row.code}`}
                  onClick={() => onDrillDown && onDrillDown(row)}
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                    row.netDebit > 0 || row.netCredit > 0 ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-center text-emerald-850">{row.code}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <span>{row.nameBn}</span>
                      {row.lineCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-normal">
                          {row.lineCount} entries
                        </span>
                      )}
                    </div>
                    {row.nameEn && row.nameEn !== row.nameBn && (
                      <div className="text-[10px] text-slate-400 font-mono">{row.nameEn}</div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {row.category}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-900">
                    {row.netDebit > 0 ? `৳${row.netDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold text-slate-900">
                    {row.netCredit > 0 ? `৳${row.netCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {isBangla ? 'কোনো হিসাব রেকর্ড পাওয়া যায়নি।' : 'No accounts found matching the criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-slate-900 text-xs">
              <tr id="trial-balance-footer-row">
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider">
                  {isBangla ? 'সর্বমোট (Grand Total):' : 'Grand Total:'}
                </td>
                <td id="tb-grand-total-debit" className="p-3 text-right font-mono text-emerald-950 text-sm">
                  ৳{trialBalanceData.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td id="tb-grand-total-credit" className="p-3 text-right font-mono text-emerald-950 text-sm">
                  ৳{trialBalanceData.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
