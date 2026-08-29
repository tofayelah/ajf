import React, { useState, useMemo } from 'react';
import { AppDatabaseState } from '../../services/db';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Search,
  Filter,
  Activity,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
import { AuditLog } from '../../types';

interface AuditTrailViewProps {
  db: AppDatabaseState;
  onDrillDown?: (item: any) => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  db,
  onDrillDown
}) => {
  const { language, activeUser } = useApp();
  const isBangla = language === 'bn';

  const [activeTab, setActiveTab] = useState<'TRAIL' | 'USER_ACTIVITY' | 'REVERSALS' | 'SUMMARY'>('TRAIL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const auditLogs = useMemo(() => {
    return (db.auditLogs || []).slice().sort((a, b) => {
      const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
      return dateB - dateA;
    });
  }, [db.auditLogs]);

  // Comprehensive System Audit Stats
  const auditStats = useMemo(() => {
    const totalJournals = (db.journalEntries || []).length;
    const totalCash = (db.cashTransactions || []).length;
    const totalBank = (db.bankTransactions || []).length;
    const totalCollections = (db.collections || []).length;
    const totalContra = (db.contraEntries || []).length;
    const totalIncome = (db.incomes || []).length;
    const totalExpense = (db.expenses || []).length;
    const totalWelfare = (db.welfareTransactions || []).length;
    const totalLoans = (db.loans || []).length;
    const totalExits = (db.memberExits || []).length;

    const totalTransactions =
      totalJournals + totalCash + totalBank + totalCollections + totalContra + totalIncome + totalExpense + totalWelfare + totalLoans + totalExits;

    const reversals = auditLogs.filter(
      l =>
        l.action?.toUpperCase().includes('REVERS') ||
        l.action?.toUpperCase().includes('CORRECT') ||
        l.action?.toUpperCase().includes('VOID') ||
        l.remarks?.toLowerCase().includes('reversed')
    ).length;

    const deleted = auditLogs.filter(
      l =>
        l.action?.toUpperCase().includes('DELETE') ||
        l.action?.toUpperCase().includes('CANCEL') ||
        l.remarks?.toLowerCase().includes('deleted')
    ).length;

    const lastLog = auditLogs[0];
    const lastTransactionDate =
      (db.cashTransactions || [])[0]?.date || (db.collections || [])[0]?.collectionDate || 'Today';

    return {
      totalTransactions,
      totalJournals,
      totalCash,
      totalBank,
      totalContra,
      reversals,
      deleted,
      totalLogs: auditLogs.length,
      lastAuditActivity: lastLog ? (lastLog.dateTime ? format(new Date(lastLog.dateTime), 'dd MMM yyyy, hh:mm a') : 'N/A') : 'N/A',
      lastUser: lastLog?.userName || 'System',
      currentUser: activeUser?.fullName || activeUser?.username || 'Current User'
    };
  }, [db, auditLogs, activeUser]);

  // Unique list of users and modules
  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(auditLogs.map(l => l.userName).filter(Boolean)));
  }, [auditLogs]);

  const uniqueModules = useMemo(() => {
    return Array.from(new Set(auditLogs.map(l => l.module || (l as any).moduleName).filter(Boolean)));
  }, [auditLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const mod = log.module || (log as any).moduleName || '';
      const act = log.action || '';
      const usr = log.userName || '';
      const rem = log.remarks || '';
      const rec = log.recordId || '';

      if (actionFilter !== 'ALL' && act !== actionFilter) return false;
      if (moduleFilter !== 'ALL' && mod !== moduleFilter) return false;
      if (userFilter !== 'ALL' && usr !== userFilter) return false;

      if (dateFrom && log.dateTime) {
        const d = log.dateTime.split('T')[0];
        if (d < dateFrom) return false;
      }
      if (dateTo && log.dateTime) {
        const d = log.dateTime.split('T')[0];
        if (d > dateTo) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          mod.toLowerCase().includes(term) ||
          act.toLowerCase().includes(term) ||
          usr.toLowerCase().includes(term) ||
          rem.toLowerCase().includes(term) ||
          rec.toLowerCase().includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [auditLogs, actionFilter, moduleFilter, userFilter, dateFrom, dateTo, searchTerm]);

  // User Activity Aggregation
  const userActivityStats = useMemo(() => {
    const stats: Record<string, { total: number; actions: Record<string, number>; lastActive: string }> = {};

    auditLogs.forEach(log => {
      const user = log.userName || 'System';
      if (!stats[user]) {
        stats[user] = { total: 0, actions: {}, lastActive: log.dateTime || '' };
      }
      stats[user].total++;
      const act = log.action || 'OTHER';
      stats[user].actions[act] = (stats[user].actions[act] || 0) + 1;
      if (log.dateTime && (!stats[user].lastActive || log.dateTime > stats[user].lastActive)) {
        stats[user].lastActive = log.dateTime;
      }
    });

    return Object.entries(stats).map(([userName, data]) => ({
      userName,
      ...data
    }));
  }, [auditLogs]);

  // Reversals & Modifications List
  const reversalLogs = useMemo(() => {
    return auditLogs.filter(
      l =>
        l.action?.toUpperCase().includes('REVERS') ||
        l.action?.toUpperCase().includes('CORRECT') ||
        l.action?.toUpperCase().includes('DELETE') ||
        l.action?.toUpperCase().includes('VOID') ||
        l.remarks?.toLowerCase().includes('reversed') ||
        l.remarks?.toLowerCase().includes('corrected')
    );
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-700" />
          <span>{isBangla ? 'অডিট ও অভ্যন্তরীণ নিয়ন্ত্রণ কেন্দ্র (Audit & Control Center)' : 'Audit & Control Center'}</span>
        </h2>
        <p className="text-xs text-slate-500">
          {isBangla
            ? 'সকল লেনদেনের অপরিবর্তনীয় অডিট ট্রেইল, ব্যবহারকারীর কার্যকলাপ, রিভার্সাল ও নিয়ন্ত্রণ লগ'
            : 'Immutable system audit logs, user activity traces, modifications, and reversal histories'}
        </p>
      </div>

      {/* Audit Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'মোট লেনদেন' : 'Total Transactions'}
          </span>
          <span className="text-base font-black text-slate-900 font-mono">
            {auditStats.totalTransactions.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'জাবেদা এন্ট্রি' : 'Journal Entries'}
          </span>
          <span className="text-base font-black text-indigo-700 font-mono">
            {auditStats.totalJournals.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'রিভার্সড / সংশোধিত' : 'Reversals'}
          </span>
          <span className="text-base font-black text-amber-700 font-mono">
            {auditStats.reversals.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'মুছে ফেলা রেকর্ড' : 'Deletions'}
          </span>
          <span className="text-base font-black text-rose-700 font-mono">
            {auditStats.deleted.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">
            {isBangla ? 'মোট অডিট লগ' : 'Total Logs'}
          </span>
          <span className="text-base font-black text-emerald-800 font-mono">
            {auditStats.totalLogs.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto hide-print text-xs">
        <button
          onClick={() => setActiveTab('TRAIL')}
          className={`pb-2.5 px-3 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'TRAIL'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{isBangla ? 'অডিট ট্রেইল তালিকা' : 'Audit Trail Logs'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px]">
            {filteredLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('USER_ACTIVITY')}
          className={`pb-2.5 px-3 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'USER_ACTIVITY'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{isBangla ? 'ব্যবহারকারী কার্যকলাপ' : 'User Activity'}</span>
        </button>

        <button
          onClick={() => setActiveTab('REVERSALS')}
          className={`pb-2.5 px-3 font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'REVERSALS'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>{isBangla ? 'রিভার্সাল ও ডেটা পরিবর্তন' : 'Reversals & Modifications'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
            {reversalLogs.length}
          </span>
        </button>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'TRAIL' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs hide-print">
            <div className="md:col-span-2">
              <label className="block text-slate-500 font-bold mb-1">
                {isBangla ? 'অনুসন্ধান' : 'Search'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isBangla ? 'মডিউল, অ্যাকশন, মন্তব্য বা আইডি...' : 'Search module, action, remarks...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">
                {isBangla ? 'অ্যাকশন' : 'Action'}
              </label>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg py-1.5 px-2"
              >
                <option value="ALL">{isBangla ? 'সকল অ্যাকশন' : 'All Actions'}</option>
                <option value="LOGIN">LOGIN</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="APPROVE">APPROVE</option>
                <option value="REJECT">REJECT</option>
                <option value="POST">POST</option>
                <option value="REVERSE">REVERSE</option>
                <option value="EXPORT">EXPORT</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">
                {isBangla ? 'মডিউল' : 'Module'}
              </label>
              <select
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg py-1.5 px-2"
              >
                <option value="ALL">{isBangla ? 'সকল মডিউল' : 'All Modules'}</option>
                {uniqueModules.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">
                {isBangla ? 'ব্যবহারকারী' : 'User'}
              </label>
              <select
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="w-full bg-white border-slate-300 rounded-lg py-1.5 px-2"
              >
                <option value="ALL">{isBangla ? 'সকল ব্যবহারকারী' : 'All Users'}</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-36">{isBangla ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                  <th className="p-3 w-28">{isBangla ? 'ব্যবহারকারী' : 'User'}</th>
                  <th className="p-3 w-28">{isBangla ? 'মডিউল' : 'Module'}</th>
                  <th className="p-3 w-24">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                  <th className="p-3 w-32">{isBangla ? 'রেফারেন্স আইডি' : 'Reference ID'}</th>
                  <th className="p-3">{isBangla ? 'বিবরণ ও মন্তব্য' : 'Description / Remarks'}</th>
                  <th className="p-3 w-16 text-center">{isBangla ? 'দেখুন' : 'View'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const isCritical =
                    log.action?.includes('DELETE') ||
                    log.action?.includes('REVERSE') ||
                    log.action?.includes('REJECT');
                  const isPositive =
                    log.action?.includes('CREATE') ||
                    log.action?.includes('APPROVE') ||
                    log.action?.includes('POST');

                  return (
                    <tr key={log.auditId || Math.random().toString()} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                        {log.dateTime ? format(new Date(log.dateTime), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {log.userName || 'System'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {log.module || (log as any).moduleName || 'System'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800'
                              : isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {log.recordId || '-'}
                      </td>
                      <td className="p-3 text-slate-700">
                        {log.remarks}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            onDrillDown &&
                            onDrillDown({
                              voucherNo: log.recordId,
                              module: log.module || (log as any).moduleName,
                              enteredBy: log.userName,
                              date: log.dateTime?.split('T')[0],
                              description: log.remarks,
                              status: log.action
                            })
                          }
                          className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg transition-colors inline-flex items-center"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isBangla ? 'কোনো অডিট লগ পাওয়া যায়নি।' : 'No audit records match the selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Activity Tab */}
      {activeTab === 'USER_ACTIVITY' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {userActivityStats.map(u => (
            <div key={u.userName} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{u.userName}</h4>
                    <span className="text-[10px] text-slate-400">
                      {isBangla ? 'সর্বশেষ সক্রিয়:' : 'Last Active:'}{' '}
                      {u.lastActive ? format(new Date(u.lastActive), 'dd MMM yyyy') : 'N/A'}
                    </span>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {u.total} {isBangla ? 'কার্যক্রম' : 'actions'}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isBangla ? 'অ্যাকশন বিভাজন' : 'Action Breakdown'}
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(u.actions).map(([act, count]) => (
                    <span
                      key={act}
                      className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-700"
                    >
                      {act}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reversals & Modifications Tab */}
      {activeTab === 'REVERSALS' && (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">
                {isBangla ? 'রিভার্সড এবং সংশোধিত লেনদেনের তালিকা' : 'Reversed & Modified Transaction Logs'}
              </h4>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isBangla
                  ? 'সিস্টেমে সংরক্ষিত সকল ভুল এন্ট্রি সংশোধন, বাতিলকরণ ও রিভার্সাল অডিট ট্র্যাকিং'
                  : 'Complete history of rollbacks, corrections, cancellations, and voided vouchers.'}
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-36">{isBangla ? 'তারিখ' : 'Date'}</th>
                  <th className="p-3 w-28">{isBangla ? 'ব্যবহারকারী' : 'User'}</th>
                  <th className="p-3 w-24">{isBangla ? 'মডিউল' : 'Module'}</th>
                  <th className="p-3 w-32">{isBangla ? 'রেকর্ড আইডি' : 'Record ID'}</th>
                  <th className="p-3">{isBangla ? 'সংশোধনের বিবরণ' : 'Modification Reason'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reversalLogs.map(log => (
                  <tr key={log.auditId || Math.random().toString()} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-600">
                      {log.dateTime ? format(new Date(log.dateTime), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                    </td>
                    <td className="p-3 font-medium text-slate-900">{log.userName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {log.module || (log as any).moduleName || 'System'}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{log.recordId}</td>
                    <td className="p-3 text-slate-700">{log.remarks}</td>
                  </tr>
                ))}
                {reversalLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      {isBangla ? 'কোনো রিভার্সাল বা বাতিল লেনদেন পাওয়া যায়নি।' : 'No reversal or modification logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
