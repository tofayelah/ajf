import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import { BookOpen, Search, Filter, Calendar, User, Eye, ShieldCheck, ArrowRight, Layers } from 'lucide-react';
import { getAccountCategory, getAccountBanglaName, getAccountEnglishName, getAccountCode } from '../accounts/ChartOfAccountsView';
import { resolveCanonicalAccount } from '../../utils/accountMapping';

interface GeneralLedgerReportProps {
  db: AppDatabaseState;
  dateFrom?: string;
  dateTo?: string;
  onDrillDown?: (item: any) => void;
  mode?: 'LEDGER' | 'JOURNAL';
}

export const GeneralLedgerReport: React.FC<GeneralLedgerReportProps> = ({
  db,
  dateFrom,
  dateTo,
  onDrillDown,
  mode = 'LEDGER'
}) => {
  const { language } = useApp();
  const isBangla = language === 'bn';

  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceModuleFilter, setSourceModuleFilter] = useState('ALL');

  const accounts = Array.isArray(db.accounts) ? db.accounts : [];
  const journalEntries = db.journalEntries || [];
  const journalLines = db.journalLines || [];

  // Group lines by journalEntryId and journalNo
  const linesByJournalId = useMemo(() => {
    const map = new Map<string, typeof journalLines>();
    journalLines.forEach(line => {
      if (!line || !line.journalEntryId) return;
      const existing = map.get(line.journalEntryId) || [];
      existing.push(line);
      map.set(line.journalEntryId, existing);
    });
    return map;
  }, [journalLines]);

  // Combined journal entries with lines (Active only)
  const enrichedEntries = useMemo(() => {
    return journalEntries
      .filter(entry => {
        if (!entry) return false;
        const status = (entry.status as string) || 'ACTIVE';
        if (status === 'CANCELLED' || status === 'REVERSED') return false;
        if (dateFrom && entry.date < dateFrom) return false;
        if (dateTo && entry.date > dateTo) return false;
        if (sourceModuleFilter !== 'ALL' && (entry.sourceType || '').toUpperCase() !== sourceModuleFilter.toUpperCase()) {
          return false;
        }
        return true;
      })
      .map(entry => {
        const lines = linesByJournalId.get(entry.id) || linesByJournalId.get(entry.journalNo) || [];
        const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

        return {
          ...entry,
          lines,
          totalDebit,
          totalCredit
        };
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [journalEntries, linesByJournalId, dateFrom, dateTo, sourceModuleFilter]);

  // If in Ledger mode for a specific account, compute running balances
  const ledgerTransactions = useMemo(() => {
    if (selectedAccountId === 'ALL') return [];

    const canonicalTarget = resolveCanonicalAccount(selectedAccountId, undefined, accounts);
    const targetCode = canonicalTarget.accountCode;

    const matchedLines: Array<{
      date: string;
      journalNo: string;
      sourceType: string;
      reference: string;
      description: string;
      debit: number;
      credit: number;
      enteredBy: string;
      rawEntry: any;
      rawLine: any;
    }> = [];

    enrichedEntries.forEach(entry => {
      entry.lines.forEach(line => {
        const canonicalLine = resolveCanonicalAccount(line.accountId, line.accountName, accounts);
        if (
          canonicalLine.accountCode === targetCode ||
          line.accountId === selectedAccountId ||
          line.accountId === targetCode
        ) {
          matchedLines.push({
            date: entry.date,
            journalNo: entry.journalNo || entry.id,
            sourceType: entry.sourceType || 'GENERAL',
            reference: entry.reference || 'N/A',
            description: line.description || entry.description || 'Transaction',
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            enteredBy: entry.createdBy || 'System',
            rawEntry: entry,
            rawLine: line
          });
        }
      });
    });

    // Sort chronologically for running balance
    matchedLines.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let balance = 0;
    const isAssetOrExpense =
      canonicalTarget.category === 'Asset' ||
      canonicalTarget.category === 'Expense' ||
      canonicalTarget.normalBalance === 'DEBIT';

    return matchedLines.map(row => {
      if (isAssetOrExpense) {
        balance += row.debit - row.credit;
      } else {
        balance += row.credit - row.debit;
      }
      return {
        ...row,
        runningBalance: balance
      };
    });
  }, [enrichedEntries, selectedAccountId, accounts]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return enrichedEntries;
    const term = searchTerm.toLowerCase();
    return enrichedEntries.filter(e => {
      const matchHeader =
        (e.journalNo || '').toLowerCase().includes(term) ||
        (e.reference || '').toLowerCase().includes(term) ||
        (e.description || '').toLowerCase().includes(term) ||
        (e.sourceType || '').toLowerCase().includes(term) ||
        (e.createdBy || '').toLowerCase().includes(term);

      const matchLine = e.lines.some(
        l =>
          (l.accountName || '').toLowerCase().includes(term) ||
          (l.accountId || '').toLowerCase().includes(term) ||
          (l.description || '').toLowerCase().includes(term)
      );

      return matchHeader || matchLine;
    });
  }, [enrichedEntries, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-700" />
          <span>
            {mode === 'JOURNAL'
              ? (isBangla ? 'জাবেদা রেজিস্টার (Journal Register)' : 'Journal Register')
              : (isBangla ? 'সাধারণ খতিয়ান ও হিসাব খাতা (General Ledger)' : 'General Ledger')}
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'হিসাবের প্রতিটি লেনদেনের ডেবিট, ক্রেডিট, বিবরণ, অনুমোদন ও ব্যালেন্স ট্র্যাকিং'
            : 'Detailed audit trail of double-entry ledger postings with running balances'}
        </p>
      </div>

      {/* Control / Filter Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs hide-print">
        {mode === 'LEDGER' && (
          <div>
            <label className="block text-slate-500 font-bold mb-1">
              {isBangla ? 'হিসাব খাত নির্বাচন করুন' : 'Select Account Head'}
            </label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full bg-white border-slate-300 rounded-lg p-2 font-medium"
            >
              <option value="ALL">{isBangla ? 'সকল হিসাব খাত (All Accounts)' : 'All Accounts'}</option>
              {accounts.map(acc => {
                const accId = (acc as any).id || getAccountCode(acc);
                return (
                  <option key={accId} value={accId}>
                    {getAccountCode(acc)} - {getAccountBanglaName(acc)} ({getAccountEnglishName(acc)})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div>
          <label className="block text-slate-500 font-bold mb-1">
            {isBangla ? 'মডিউল / লেনদেনের উৎস' : 'Source Module'}
          </label>
          <select
            value={sourceModuleFilter}
            onChange={e => setSourceModuleFilter(e.target.value)}
            className="w-full bg-white border-slate-300 rounded-lg p-2 font-medium"
          >
            <option value="ALL">{isBangla ? 'সকল মডিউল' : 'All Modules'}</option>
            <option value="COLLECTION">Collection</option>
            <option value="CAPITAL">Capital</option>
            <option value="LOAN">Loan</option>
            <option value="INVESTMENT">Investment</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="WELFARE">Welfare</option>
            <option value="CONTRA">Contra</option>
            <option value="MANUAL">Manual Journal</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-slate-500 font-bold mb-1">
            {isBangla ? 'অনুসন্ধান' : 'Search'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isBangla ? 'ভাউচার, রেফারেন্স, হিসাবের নাম বা ব্যবহারকারী...' : 'Search voucher, reference, account, user...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Specific Account Ledger View */}
      {mode === 'LEDGER' && selectedAccountId !== 'ALL' ? (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-500 block">
                {isBangla ? 'খতিয়ান হিসাব খাত' : 'Ledger Account'}
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {accounts.find(a => (a as any).id === selectedAccountId || getAccountCode(a) === selectedAccountId)?.banglaName || selectedAccountId}
              </h3>
            </div>
            <div className="flex gap-4 font-mono text-xs">
              <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                <span className="text-[10px] text-slate-400 block">{isBangla ? 'মোট ডেবিট' : 'Total Debit'}</span>
                <span className="font-bold text-slate-900">
                  ৳{ledgerTransactions.reduce((s, r) => s + r.debit, 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                <span className="text-[10px] text-slate-400 block">{isBangla ? 'মোট ক্রেডিট' : 'Total Credit'}</span>
                <span className="font-bold text-slate-900">
                  ৳{ledgerTransactions.reduce((s, r) => s + r.credit, 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200">
                <span className="text-[10px] text-slate-400 block">{isBangla ? 'বর্তমান ব্যালেন্স' : 'Current Balance'}</span>
                <span className="font-black text-indigo-700">
                  ৳{(ledgerTransactions[ledgerTransactions.length - 1]?.runningBalance || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-24">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3 w-32">{isBangla ? 'জাবেদা / ভাউচার নং' : 'Voucher No'}</th>
                  <th className="p-3">{isBangla ? 'বিবরণ ও রেফারেন্স' : 'Description & Ref'}</th>
                  <th className="p-3 w-24 text-right">{isBangla ? 'ডেবিট (৳)' : 'Debit (৳)'}</th>
                  <th className="p-3 w-24 text-right">{isBangla ? 'ক্রেডিট (৳)' : 'Credit (৳)'}</th>
                  <th className="p-3 w-28 text-right">{isBangla ? 'ব্যালেন্স (৳)' : 'Balance (৳)'}</th>
                  <th className="p-3 w-20 text-center">{isBangla ? 'পদক্ষেপ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ledgerTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-600">{tx.date}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{tx.journalNo}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{tx.description}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Ref: {tx.reference}</span>
                        <span>•</span>
                        <span>User: {tx.enteredBy}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800">
                      {tx.debit > 0 ? `৳${tx.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800">
                      {tx.credit > 0 ? `৳${tx.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-900">
                      ৳{tx.runningBalance.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() =>
                          onDrillDown &&
                          onDrillDown({
                            voucherNo: tx.journalNo,
                            reference: tx.reference,
                            date: tx.date,
                            module: tx.sourceType,
                            amount: Math.max(tx.debit, tx.credit),
                            enteredBy: tx.enteredBy,
                            description: tx.description,
                            lines: tx.rawEntry?.lines
                          })
                        }
                        className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg transition-colors inline-flex items-center"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {ledgerTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isBangla ? 'এই হিসাব খাতের জন্য কোনো লেনদেন পাওয়া যায়নি।' : 'No transactions recorded for this account.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* All Journal Entries Register */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              {isBangla ? 'মোট জাবেদা এন্ট্রি:' : 'Total Journal Entries:'} <strong>{filteredEntries.length}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {filteredEntries.map((entry, idx) => (
              <div
                key={`${entry.id || 'entry'}-${entry.journalNo || ''}-${entry.sourceType || ''}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-indigo-300 transition-colors"
              >
                {/* Journal Header */}
                <div className="bg-slate-50/80 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {entry.journalNo || entry.id}
                    </span>
                    <span className="font-medium text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {entry.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                      {entry.sourceType || 'GENERAL'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{entry.createdBy || 'System'}</span>
                    </div>
                    <button
                      onClick={() =>
                        onDrillDown &&
                        onDrillDown({
                          voucherNo: entry.journalNo || entry.id,
                          reference: entry.reference,
                          date: entry.date,
                          module: entry.sourceType,
                          amount: entry.totalDebit,
                          enteredBy: entry.createdBy,
                          description: entry.description,
                          lines: entry.lines
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isBangla ? 'বিস্তারিত' : 'Details'}</span>
                    </button>
                  </div>
                </div>

                {/* Journal Lines Table */}
                <div className="p-3">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-[10px] uppercase font-bold border-b border-slate-100">
                        <th className="pb-1.5">{isBangla ? 'হিসাব খাত ও কোড' : 'Account & Code'}</th>
                        <th className="pb-1.5">{isBangla ? 'বিবরণ' : 'Description'}</th>
                        <th className="pb-1.5 text-right w-28">{isBangla ? 'ডেবিট (৳)' : 'Debit (৳)'}</th>
                        <th className="pb-1.5 text-right w-28">{isBangla ? 'ক্রেডিট (৳)' : 'Credit (৳)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {entry.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2">
                            <span className="font-semibold text-slate-800">{line.accountName}</span>
                            {line.accountId && (
                              <span className="font-mono text-[10px] text-slate-400 block">
                                {line.accountId}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-slate-600 text-[11px]">
                            {line.description || entry.description || '-'}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-slate-800">
                            {Number(line.debit) > 0 ? `৳${Number(line.debit).toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-slate-800">
                            {Number(line.credit) > 0 ? `৳${Number(line.credit).toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 font-bold text-slate-700 bg-slate-50/50">
                      <tr>
                        <td colSpan={2} className="py-1.5 text-right text-[11px]">
                          {isBangla ? 'মোট:' : 'Total:'}
                        </td>
                        <td className="py-1.5 text-right font-mono text-emerald-800">
                          ৳{entry.totalDebit.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right font-mono text-emerald-800">
                          ৳{entry.totalCredit.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}

            {filteredEntries.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                {isBangla ? 'কোনো জাবেদা এন্ট্রি রেকর্ড পাওয়া যায়নি।' : 'No journal entries match the filter criteria.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
