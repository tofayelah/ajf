import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { History, Search, Filter, ShieldCheck, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { enUS, bn } from 'date-fns/locale';
import { IntegrityCheckView } from './IntegrityCheckView';

export const AuditLogView: React.FC = () => {
  const { db, language, navigateTo } = useApp();
  const isBangla = language === 'bn';
  const [currentView, setCurrentView] = useState<'LOGS' | 'DIAGNOSTIC'>('DIAGNOSTIC');
  const [searchTerm, setSearchTerm] = useState('');

  const logs = db.auditLogs || [];
  
  const filteredLogs = logs.filter(log => 
    (log.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (log.module || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.remarks || "").toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-700 bg-emerald-100';
      case 'UPDATE': return 'text-blue-700 bg-blue-100';
      case 'DELETE_REQUEST': return 'text-orange-700 bg-orange-100';
      case 'REJECT':
      case 'CANCEL': return 'text-red-700 bg-red-100';
      case 'APPROVE':
      case 'POST': return 'text-indigo-700 bg-indigo-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {currentView === 'DIAGNOSTIC' ? (
              <Activity className="w-6 h-6 text-indigo-600" />
            ) : (
              <History className="w-6 h-6 text-slate-600" />
            )}
            {currentView === 'DIAGNOSTIC'
              ? (isBangla ? 'অ্যাডমিন ডায়াগনস্টিক ও অডিট ইন্টিগ্রিটি টুল' : 'Admin Diagnostic & Integrity Auditor')
              : (isBangla ? 'অডিট লগ ও পরিবর্তন ইতিহাস' : 'Audit Log Trail')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentView === 'DIAGNOSTIC'
              ? (isBangla ? 'সকল মডিউলে জাবেদা ভাউচার সমতা (DR=CR) এবং ক্যাশ বুকের সাথে সাব-লেজার মিল যাচাই করুন' : 'Comprehensive double-entry balance check and cash sub-ledger reconciliation')
              : (isBangla ? 'সিস্টেমের সমস্ত কার্যকলাপ ট্র্যাক করুন' : 'Track all system activities and modifications')}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setCurrentView('DIAGNOSTIC')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentView === 'DIAGNOSTIC'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            {isBangla ? 'ডায়াগনস্টিক টুল (Integrity Audit)' : 'Diagnostic Tool'}
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('LOGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentView === 'LOGS'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-slate-600" />
            {isBangla ? 'লগ ইতিহাস (Audit Logs)' : 'Audit Logs'}
          </button>
        </div>
      </div>

      {/* Main View Content */}
      {currentView === 'DIAGNOSTIC' ? (
        <IntegrityCheckView />
      ) : (
        <div className="space-y-4">
          {/* Quick Integrity Check Action Card */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  {isBangla ? 'অ্যাকাউন্টিং ইন্টিগ্রিটি ও ৩-ওয়ে ভ্যালিডেশন টুল' : 'Accounting Integrity & 3-Way Validation Tool'}
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Live Auditor
                  </span>
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {isBangla 
                    ? 'জাবেদা ভাউচার ড্র/সিআর সমতা (DR=CR) এবং ক্যাশ বুক বনাম সাব-লেজার মিল পরীক্ষা করুন।'
                    : 'Check journal debit/credit balance symmetry (DR=CR) and reconcile Cash Book with sub-ledger totals.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('DIAGNOSTIC')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isBangla ? 'ইন্টিগ্রিটি চেক চালান' : 'Launch Integrity Auditor'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBangla ? "ব্যবহারকারী, মডিউল বা মন্তব্য দিয়ে খুঁজুন..." : "Search by user, module, or remarks..."}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" />
              {isBangla ? 'ফিল্টার' : 'Filter Logs'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">{isBangla ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">{isBangla ? 'ব্যবহারকারী' : 'User'}</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">{isBangla ? 'মডিউল' : 'Module'}</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                  <th className="p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">{isBangla ? 'মন্তব্য/বিস্তারিত' : 'Remarks / Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <tr key={log.auditId ? `${log.auditId}-${index}` : `audit-log-${index}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-sm text-slate-700 whitespace-nowrap">
                        {format(new Date((log as any).dateTime || (log as any).date || new Date().toISOString()), 'dd MMM yyyy, hh:mm a')}
                      </td>
                      <td className="p-4 font-medium text-slate-800 text-sm">{log.userName}</td>
                      <td className="p-4 text-slate-600 text-sm font-medium">{log.module}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        <div className="line-clamp-2" title={log.remarks}>{log.remarks}</div>
                        {log.recordId && <div className="text-xs text-slate-400 mt-1 font-mono">{log.recordId}</div>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {isBangla ? 'কোনো লগ পাওয়া যায়নি' : 'No logs found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
